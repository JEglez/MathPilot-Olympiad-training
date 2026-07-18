// PostgreSQL problem repository — single transaction per problem insert
// Per 03-dataset-import-search.md §5.4
// search_tsv auto-populates (GENERATED ALWAYS column — no explicit insert needed)

import { Pool } from "pg";
import type { CanonicalProblem, StorageError, ImportOutcome } from "../../domain/ingestion/types";
import type { Result } from "../../domain/shared/result";
import { ok, err } from "../../domain/shared/result";

export class PostgresProblemRepository {
  constructor(private readonly pool: Pool) {}

  /** Factory — creates a repository with its own connection pool from a connection string */
  static create(dbUrl: string): PostgresProblemRepository {
    return new PostgresProblemRepository(new Pool({ connectionString: dbUrl }));
  }

  /** Close the underlying pool (call when the process is done) */
  async end(): Promise<void> {
    await this.pool.end();
  }

  /** Check if a problem already exists by dedup hash */
  async existsByDedupHash(dedupHash: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      "SELECT count(*) FROM import_records WHERE dedup_hash = $1",
      [dedupHash],
    );
    return parseInt(result.rows[0]?.count ?? "0", 10) > 0;
  }

  /** Insert a classified problem in a single transaction */
  async insertProblem(
    problem: CanonicalProblem,
    embedding: number[],
    importRunId: string,
  ): Promise<Result<string, StorageError>> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Upsert competition (if resolved)
      let competitionId: string | null = null;
      if (problem.sourceCompetition) {
        const compResult = await client.query<{ id: string }>(
          `INSERT INTO competitions (abbreviation, name, level, is_active)
           VALUES ($1, $1, $2, false)
           ON CONFLICT (abbreviation) DO UPDATE SET abbreviation = EXCLUDED.abbreviation
           RETURNING id`,
          [problem.sourceCompetition, problem.competitionLevel ?? "national"],
        );
        competitionId = compResult.rows[0]?.id ?? null;
      }

      // 2. Insert problem
      const problemResult = await client.query<{ id: string }>(
        `INSERT INTO problems (
           title, statement, statement_plain, answer,
           source_competition_id, source_year, source_round, language,
           competition_level, position_in_paper, technique_depth,
           creativity_demand, proof_style, entry_barrier,
           estimated_solve_time_minutes,
           status, needs_review, statement_vector
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
           'draft',
           $16,
           $17::vector
         ) RETURNING id`,
        [
          problem.title,
          problem.statement,
          problem.statementPlain,
          problem.answer,
          competitionId,
          problem.sourceYear,
          problem.sourceRound,
          problem.language,
          problem.competitionLevel,
          problem.positionInPaper,
          problem.techniqueDepth,
          problem.creativityDemand,
          problem.proofStyle,
          problem.entryBarrier,
          problem.estimatedSolveTimeMinutes,
          problem.techniques.length === 0 || !problem.competitionLevel, // needs_review if not classified
          `[${embedding.join(",")}]`,
        ],
      );

      const problemId = problemResult.rows[0]?.id;
      if (!problemId) throw new Error("Insert returned no id");

      // 3. Join table: problem_topics
      if (problem.topics.length > 0) {
        await client.query(
          `INSERT INTO problem_topics (problem_id, topic_id)
           SELECT $1, id FROM topics WHERE code = ANY($2)`,
          [problemId, problem.topics],
        );
      }

      // 4. Join table: problem_subtopics
      if (problem.subtopics.length > 0) {
        await client.query(
          `INSERT INTO problem_subtopics (problem_id, subtopic_id)
           SELECT $1, id FROM subtopics WHERE code = ANY($2)`,
          [problemId, problem.subtopics],
        );
      }

      // 5. Join table: problem_techniques
      if (problem.techniques.length > 0) {
        for (const t of problem.techniques) {
          await client.query(
            `INSERT INTO problem_techniques (problem_id, technique_id, is_primary)
             SELECT $1, id, $2 FROM techniques WHERE code = $3
             ON CONFLICT (problem_id, technique_id) DO NOTHING`,
            [problemId, t.isPrimary, t.code],
          );
        }
      }

      // 6. Solutions
      for (let i = 0; i < problem.solutions.length; i++) {
        const sol = problem.solutions[i]!;
        await client.query(
          `INSERT INTO solutions (problem_id, approach_name, body, is_canonical)
           VALUES ($1, $2, $3, $4)`,
          [problemId, sol.approachName, sol.body, sol.isCanonical],
        );
      }

      // 7. Import record (dedup tracking)
      await client.query(
        `INSERT INTO import_records (
           problem_id, source_dataset, external_id, dedup_hash,
           source_subject, source_difficulty
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          problemId,
          problem.sourceDataset,
          problem.externalId,
          problem.dedupHash,
          problem.sourceSubject,
          problem.sourceDifficulty,
        ],
      );

      await client.query("COMMIT");
      return ok(problemId);

    } catch (e) {
      await client.query("ROLLBACK");
      const message = e instanceof Error ? e.message : String(e);
      return err({ kind: "transaction_failed", pgError: message });
    } finally {
      client.release();
    }
  }

  /** Update import_run progress counters */
  async updateImportRun(
    runId: string,
    delta: Partial<{
      imported: number;
      duplicatesSkipped: number;
      classificationFailures: number;
      parseErrors: number;
      flaggedForReview: number;
    }>,
  ): Promise<void> {
    const sets = Object.entries(delta)
      .filter(([, v]) => v !== undefined)
      .map(([k, v], i) => {
        const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
        return `${col} = ${col} + $${i + 2}`;
      });
    if (sets.length === 0) return;

    const values = Object.values(delta).filter(v => v !== undefined);
    await this.pool.query(
      `UPDATE import_runs SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`,
      [runId, ...values],
    );
  }

  async createImportRun(sourceDataset: string): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO import_runs (source_dataset, status) VALUES ($1, 'running') RETURNING id`,
      [sourceDataset],
    );
    return result.rows[0]!.id;
  }

  async completeImportRun(runId: string, status: "completed" | "failed"): Promise<void> {
    await this.pool.query(
      `UPDATE import_runs SET status = $1, completed_at = now(), updated_at = now() WHERE id = $2`,
      [status, runId],
    );
  }
}
