// OpenAI Embedder — implements EmbeddingGenerator domain interface
// Generates text-embedding-3-small (1536 dimensions) for pgvector storage
// Per ai-guidelines.md §4.2 and 03-dataset-import-search.md §5.4

export interface EmbeddingGeneratorConfig {
  /** From env: MATHPILOT_EMBEDDING_MODEL (e.g. text-embedding-3-small) */
  readonly modelId: string;
  readonly endpoint: string;
  readonly apiKey: string;
}

export class OpenAIEmbedder {
  private readonly config: EmbeddingGeneratorConfig;
  // Conservative batch: ~100 inputs keeps each request well under 300K TPM
  private static readonly BATCH_SIZE = 100;
  private static readonly DIMENSIONS = 1536;
  private static readonly MAX_RETRIES = 5;

  // Circuit breaker
  private consecutiveFailures = 0;
  private circuitOpenUntil: Date | null = null;
  private static readonly MAX_FAILURES = 3;
  private static readonly CIRCUIT_OPEN_MS = 60_000;

  constructor(config: EmbeddingGeneratorConfig) {
    this.config = config;
  }

  /** Embed a single text string. Returns a 1536-dimensional vector. */
  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    if (!embedding) throw new Error("Embedding returned empty result");
    return embedding;
  }

  /** Embed multiple texts in batches of 2,048 (Azure OpenAI limit). */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += OpenAIEmbedder.BATCH_SIZE) {
      const chunk = texts.slice(i, i + OpenAIEmbedder.BATCH_SIZE);
      const chunkEmbeddings = await this.callEmbeddingAPI(chunk);
      results.push(...chunkEmbeddings);
    }

    return results;
  }

  private async callEmbeddingAPI(inputs: string[]): Promise<number[][]> {
    if (this.isCircuitOpen()) {
      throw new Error("Embedding circuit breaker is open");
    }

    let delayMs = 5_000;
    for (let attempt = 0; attempt <= OpenAIEmbedder.MAX_RETRIES; attempt++) {
      const response = await fetch(
        `${this.config.endpoint}/openai/deployments/${this.config.modelId}/embeddings?api-version=2024-02-01`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": this.config.apiKey,
          },
          body: JSON.stringify({
            input: inputs,
            model: this.config.modelId,
            dimensions: OpenAIEmbedder.DIMENSIONS,
          }),
        },
      );

      // Retry on 429 (rate limit) and 5xx (transient errors) with exponential backoff
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt === OpenAIEmbedder.MAX_RETRIES) {
          this.recordFailure();
          throw new Error(`Embedding API error: ${response.status}`);
        }
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
        await new Promise(r => setTimeout(r, waitMs));
        delayMs = Math.min(delayMs * 2, 60_000);
        continue;
      }

      if (!response.ok) {
        this.recordFailure();
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json() as {
        data: { embedding: number[]; index: number }[];
      };

      this.recordSuccess();

      // Sort by index to preserve input order
      return data.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);
    }

    throw new Error("callEmbeddingAPI: unreachable");
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenUntil) return false;
    if (new Date() > this.circuitOpenUntil) {
      this.circuitOpenUntil = null;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  private recordSuccess(): void { this.consecutiveFailures = 0; }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= OpenAIEmbedder.MAX_FAILURES) {
      this.circuitOpenUntil = new Date(Date.now() + OpenAIEmbedder.CIRCUIT_OPEN_MS);
    }
  }
}
