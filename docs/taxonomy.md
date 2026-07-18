# MathPilot — Problem Taxonomy & Classification System

> A rich, multi-dimensional taxonomy for olympiad problem classification,
> designed to power search, recommendations, training plans, and gap analysis.

---

## Why the Big Four Are Not Enough

The traditional split — Geometry, Algebra, Number Theory, Combinatorics — is a
**filing cabinet**, not a **learning map**. It tells you *what shelf* the problem
goes on, but not:

- What **skills** you need to solve it
- What you should **learn first**
- Whether you're **ready** for it
- What it **teaches** you that you didn't know
- How it **connects** to other problems you've solved

MathPilot replaces the filing cabinet with a multi-layered taxonomy that models
how an experienced olympiad coach actually thinks about problems.

---

## Layer 1 — Primary Domains (8 Domains)

We split the Big Four into **8 domains** that reflect how olympiad problems
actually cluster in practice. Cross-domain problems get multiple tags.

| Code | Domain | Why It's Separate |
|------|--------|-------------------|
| `ALG` | **Algebraic Structures & Manipulations** | Equations, inequalities, polynomials, functional equations — the "push symbols around" domain |
| `NT` | **Number Theory & Arithmetic** | Divisibility, primes, modular arithmetic, p-adic valuations — the "integers only" domain |
| `GEO-S` | **Synthetic & Projective Geometry** | Angle chasing, collinearity, concurrence, projective methods — the "no coordinates" domain |
| `GEO-A` | **Analytic & Transformational Geometry** | Coordinates, complex numbers, inversions, spiral similarities — the "computation in geometry" domain |
| `COMB-E` | **Enumerative & Algebraic Combinatorics** | Counting, generating functions, recurrences, bijections — the "how many" domain |
| `COMB-S` | **Structural & Extremal Combinatorics** | Graph theory, Ramsey, extremal problems, combinatorial geometry — the "structure and existence" domain |
| `GAME` | **Strategies, Algorithms & Games** | Game theory, invariants, monovariants, greedy strategies, process analysis — the "what happens over time" domain |
| `MISC` | **Cross-Domain & Unconventional** | Problems that defy classification or blend 3+ domains. Includes competition-specific styles (e.g., estimation problems in HMMT February) |

### Why This Split?

**Geometry becomes two domains** because the techniques are almost entirely
different. A student who excels at angle chasing may be lost with complex number
methods. Coaching them requires knowing *which* geometry they know.

**Combinatorics becomes two domains** because counting (COMB-E) and structure
(COMB-S) use different mental models. A student strong in generating functions
may struggle with graph colouring arguments.

**Games/Strategies get their own domain** because invariant/monovariant reasoning
is a distinct skill that cuts across algebra, combinatorics, and number theory.
Coaches often treat these as a separate training track.

---

## Layer 2 — Subtopics (50+ Subtopics)

Each domain has 5–10 subtopics. Below is the full taxonomy.

### ALG — Algebraic Structures & Manipulations

| Code | Subtopic | Scope |
|------|----------|-------|
| `ALG-POL` | Polynomials & Roots | Vieta's, root-finding, irreducibility, minimal polynomials |
| `ALG-INQ` | Inequalities | AM-GM, Cauchy-Schwarz, Schur, SOS, Jensen, smoothing/convexity |
| `ALG-FEQ` | Functional Equations | Cauchy-type, injectivity/surjectivity, substitution strategies |
| `ALG-SEQ` | Sequences & Recurrences | Linear recurrences, characteristic roots, bounding, periodicity |
| `ALG-SYS` | Systems of Equations | Symmetric systems, substitution, resultants |
| `ALG-SET` | Algebraic Structures | Groups, rings, fields (as they appear in olympiads, not abstract algebra courses) |

### NT — Number Theory & Arithmetic

| Code | Subtopic | Scope |
|------|----------|-------|
| `NT-DIV` | Divisibility & GCD | Euclidean algorithm, Bézout, divisibility tricks |
| `NT-MOD` | Modular Arithmetic | Congruences, Fermat/Euler, quadratic residues, order |
| `NT-PRM` | Primes & Factorisation | FTA, prime distribution heuristics, Legendre's formula |
| `NT-DIO` | Diophantine Equations | Pell, Vieta jumping, descent, parametric families |
| `NT-VAL` | Valuations & Local Methods | p-adic valuations, LTE lemma, local-global ideas |
| `NT-MUL` | Multiplicative Functions | Euler's totient, Möbius, convolution |
| `NT-CON` | Constructions in NT | Explicit constructions meeting number-theoretic constraints |

### GEO-S — Synthetic & Projective Geometry

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-S-TRI` | Triangle Geometry | Cevians, pedal triangles, notable points and circles |
| `GEO-S-CIR` | Circles & Cyclic Quads | Power of a point, radical axes, Ptolemy, cyclic quadrilateral properties |
| `GEO-S-ANG` | Angle Chasing & Trigonometric Cevians | Directed angles, trig-cevian relations |
| `GEO-S-COL` | Collinearity & Concurrence | Menelaus, Ceva, radical axis concurrence, Desargues |
| `GEO-S-PRJ` | Projective Methods | Cross-ratio, harmonic division, poles and polars, projective transformations |
| `GEO-S-3D` | Solid Geometry | 3D constructions, cross-sections, dihedral angles |

### GEO-A — Analytic & Transformational Geometry

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-A-CRD` | Coordinate Geometry | Cartesian methods, parametric curves, area via shoelace |
| `GEO-A-CPX` | Complex Numbers in Geometry | Unit circle, rotation, spiral similarity via multiplication |
| `GEO-A-INV` | Inversion | Circle inversion, coaxial circles, inversion distance formulas |
| `GEO-A-TRN` | Geometric Transformations | Reflections, rotations, homotheties, spiral similarities, isogonal conjugates |
| `GEO-A-VEC` | Vector Methods | Dot/cross product proofs, barycentric coordinates |

### COMB-E — Enumerative & Algebraic Combinatorics

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-E-CNT` | Counting Principles | Addition/multiplication, PIE, stars-and-bars, Burnside |
| `COMB-E-GEN` | Generating Functions | OGFs, EGFs, coefficient extraction, convolution |
| `COMB-E-BIJ` | Bijections & Combinatorial Identities | Bijective proofs, Vandermonde, hockey stick, Catalan |
| `COMB-E-REC` | Combinatorial Recurrences | Setting up and solving counting recurrences |
| `COMB-E-PRB` | Probabilistic & Expected Value Arguments | Probabilistic method, linearity of expectation, random colouring |

### COMB-S — Structural & Extremal Combinatorics

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-S-GRP` | Graph Theory | Eulerian/Hamiltonian, planarity, colouring, matching, Turán |
| `COMB-S-EXT` | Extremal Problems | Turán-type, forbidden configurations, Kruskal-Katona |
| `COMB-S-RAM` | Ramsey Theory | Ramsey numbers, Hales-Jewett, Schur's theorem |
| `COMB-S-CGE` | Combinatorial Geometry | Convex hulls, point configurations, Helly, Erdős–Szekeres |
| `COMB-S-SET` | Set Systems & Designs | Sunflower, VC dimension, Latin squares, block designs |
| `COMB-S-ORD` | Partially Ordered Sets | Dilworth, antichains, lattice theory in contest settings |

### GAME — Strategies, Algorithms & Games

| Code | Subtopic | Scope |
|------|----------|-------|
| `GAME-INV` | Invariants | Quantities preserved under operations — parity, colouring, modular invariants |
| `GAME-MON` | Monovariants | Quantities that strictly increase/decrease — energy arguments, potential functions |
| `GAME-STR` | Game Strategy | Nim-values, Sprague-Grundy, pairing strategies, strategy-stealing |
| `GAME-ALG` | Algorithmic Processes | Greedy, swaps, scheduling, extremal processes |
| `GAME-CON` | Constructions & Examples | Building explicit objects satisfying constraints |

---

## Layer 3 — Techniques (120+ Techniques)

Techniques are the **atomic skills** a student learns. Each technique belongs to
a primary subtopic but may appear across many. Below is a representative sample
(not exhaustive).

### Inequality Techniques (ALG-INQ)

| Code | Technique | Cognitive Load |
|------|-----------|----------------|
| `T-AMGM` | AM-GM and weighted AM-GM | foundational |
| `T-CS` | Cauchy-Schwarz (direct & Engel/Titu form) | foundational |
| `T-SCHUR` | Schur's Inequality | intermediate |
| `T-SOS` | Sum of Squares decomposition | advanced |
| `T-JENSEN` | Jensen's Inequality & convexity | intermediate |
| `T-SMOOTH` | Smoothing / mixing variables | advanced |
| `T-TANGENT` | Tangent line trick | intermediate |
| `T-MUIRHEAD` | Muirhead's Inequality & majorisation | advanced |
| `T-UVWXYZ` | uvw / pqr substitution method | elite |

### Number Theory Techniques (NT-*)

| Code | Technique | Cognitive Load |
|------|-----------|----------------|
| `T-EUCLID` | Euclidean Algorithm & Bézout's Identity | foundational |
| `T-FLT` | Fermat's Little Theorem | foundational |
| `T-EULER` | Euler's Theorem & totient function | intermediate |
| `T-CRT` | Chinese Remainder Theorem | intermediate |
| `T-LTE` | Lifting the Exponent Lemma | advanced |
| `T-ZSIG` | Zsygmondy's Theorem | elite |
| `T-HENSEL` | Hensel's Lemma (lifting solutions mod p^k) | advanced |
| `T-VIETA-JUMP` | Vieta Jumping (root flipping) | advanced |
| `T-DESCENT` | Infinite Descent | intermediate |
| `T-LEGENDRE` | Legendre's Formula (p-adic valuation of n!) | intermediate |
| `T-ORD` | Order of an element mod n | intermediate |
| `T-QR` | Quadratic Residues & Legendre Symbol | advanced |

### Geometry Techniques (GEO-*)

| Code | Technique | Cognitive Load |
|------|-----------|----------------|
| `T-ANGCHASE` | Directed Angle Chasing | foundational |
| `T-POP` | Power of a Point | foundational |
| `T-RADAXIS` | Radical Axis & Radical Centre | intermediate |
| `T-PTOLEMY` | Ptolemy's Inequality / Equality | intermediate |
| `T-INV` | Circle Inversion | advanced |
| `T-SPIRAL` | Spiral Similarity | advanced |
| `T-BARY` | Barycentric Coordinates | advanced |
| `T-CPXGEO` | Complex Number Geometry | advanced |
| `T-PROJECTIVE` | Projective methods (cross-ratio, poles/polars) | elite |
| `T-SIMSON` | Simson Line & Pedal Triangles | intermediate |
| `T-HOMOTHETY` | Homothety & Dilation | foundational |

### Combinatorics Techniques (COMB-*)

| Code | Technique | Cognitive Load |
|------|-----------|----------------|
| `T-PHP` | Pigeonhole Principle (basic & generalised) | foundational |
| `T-PIE` | Principle of Inclusion-Exclusion | foundational |
| `T-DBLCNT` | Double Counting | foundational |
| `T-EXTREMAL` | Extremal Principle (pick the max/min) | intermediate |
| `T-PROBMETHOD` | Probabilistic Method | advanced |
| `T-LINALG` | Linear Algebra in Combinatorics | elite |
| `T-OGF` | Ordinary Generating Functions | advanced |
| `T-BURNSIDE` | Burnside's Lemma | intermediate |
| `T-RAMSEY` | Ramsey-type arguments | advanced |

### Strategy & Process Techniques (GAME-*)

| Code | Technique | Cognitive Load |
|------|-----------|----------------|
| `T-PARITY` | Parity Invariant | foundational |
| `T-COLOURING` | Colouring Arguments | foundational |
| `T-MODINV` | Modular Invariant | intermediate |
| `T-ENERGY` | Energy / Potential Function (monovariant) | intermediate |
| `T-NIMVAL` | Nim-values & Sprague-Grundy | advanced |
| `T-PAIRING` | Pairing Strategy | foundational |
| `T-STEALSTRAT` | Strategy Stealing | intermediate |
| `T-GREEDY` | Greedy Construction | intermediate |

---

## Layer 4 — Prerequisite Graph

Techniques form a **directed acyclic graph** (DAG) of prerequisites. This graph
is the engine behind training-path generation.

### Example: Path to Circle Inversion

```
T-ANGCHASE (Directed Angles)
    │
    ├──▶ T-POP (Power of a Point)
    │        │
    │        ├──▶ T-RADAXIS (Radical Axis)
    │        │        │
    │        │        └──▶ T-INV (Circle Inversion)  ◀── TARGET
    │        │                    │
    │        │                    └──▶ T-PROJECTIVE (Projective Methods)
    │        │
    │        └──▶ T-PTOLEMY (Ptolemy)
    │
    └──▶ T-HOMOTHETY (Homothety)
              │
              └──▶ T-SPIRAL (Spiral Similarity)
                        │
                        └──▶ T-INV (Circle Inversion)  ◀── TARGET (second path)
```

### Example: Path to Lifting the Exponent

```
T-EUCLID (Euclidean Algorithm)
    │
    └──▶ T-FLT (Fermat's Little Theorem)
              │
              ├──▶ T-EULER (Euler's Theorem)
              │
              └──▶ T-LEGENDRE (Legendre's Formula)
                        │
                        └──▶ T-LTE (Lifting the Exponent)  ◀── TARGET
```

### Example: Cross-Domain Path (Combinatorics → Algebra)

```
T-PIE (Inclusion-Exclusion)
    │
    └──▶ T-OGF (Generating Functions)  [COMB-E-GEN]
              │
              └──▶ uses polynomial manipulation from
                   T-AMGM, T-CS  [ALG-INQ]
```

**Key property:** When the AI identifies a gap at technique T, it walks the
prerequisite graph *backwards* to find the **root cause**. If a student fails
at `T-INV`, the system checks whether they've mastered `T-POP` and `T-RADAXIS`
first — the gap might not be inversion itself, but a missing prerequisite.

---

## Layer 5 — Learning Objectives

Each technique decomposes into **2–6 learning objectives** that follow a
progression from recognition to creative application.

### Example: Pigeonhole Principle (`T-PHP`)

| Code | Objective | Bloom Level |
|------|-----------|-------------|
| `LO-PHP-01` | State the Pigeonhole Principle and its generalised form | remember |
| `LO-PHP-02` | Identify the "pigeons" and "holes" in a problem | understand |
| `LO-PHP-03` | Apply PHP to prove existence in finite-set problems | apply |
| `LO-PHP-04` | Combine PHP with modular arithmetic or divisibility | analyse |
| `LO-PHP-05` | Use PHP in multi-step proofs requiring a chain of existence claims | create |

### Example: Cauchy-Schwarz (`T-CS`)

| Code | Objective | Bloom Level |
|------|-----------|-------------|
| `LO-CS-01` | State Cauchy-Schwarz in sum and integral forms | remember |
| `LO-CS-02` | Recognise when a problem has a "sum of fractions" structure suited to Engel/Titu form | understand |
| `LO-CS-03` | Apply Cauchy-Schwarz to prove a given inequality | apply |
| `LO-CS-04` | Choose between Cauchy-Schwarz, AM-GM, and Jensen for a given inequality | evaluate |
| `LO-CS-05` | Construct auxiliary expressions to make Cauchy-Schwarz applicable in non-obvious settings | create |

### Example: Circle Inversion (`T-INV`)

| Code | Objective | Bloom Level |
|------|-----------|-------------|
| `LO-INV-01` | Define inversion and compute the image of basic objects (lines, circles) | remember |
| `LO-INV-02` | Identify when a configuration simplifies under inversion (tangent circles, clusters) | understand |
| `LO-INV-03` | Choose an inversion centre and radius that simplifies a given problem | apply |
| `LO-INV-04` | Combine inversion with other transformations (homothety, radical axes) | analyse |
| `LO-INV-05` | Invent an inversion-based approach for a problem with no obvious geometric structure | create |

**Assessment rule:** A student is "proficient" at a technique when they've
demonstrated `apply`-level mastery on at least 3 distinct problems. They've
"mastered" it when they demonstrate `create`-level work.

---

## Layer 6 — Problem Complexity Dimensions

Instead of a single 1–10 rating, every problem is classified along **6 orthogonal
dimensions**. Each dimension is low-cardinality (3–5 values) and independently
meaningful.

### Dimension 1: Competition Position

Where the problem typically appears in an olympiad.

| Value | Meaning | Example Slot |
|-------|---------|--------------|
| `opener` | Accessible with standard techniques | IMO P1/P4, USAMO P1 |
| `middle` | Requires insight or technique combination | IMO P2/P5, USAMO P2 |
| `closer` | Deep, multi-step, requires invention | IMO P3/P6, USAMO P3 |

### Dimension 2: Technique Depth

How many distinct techniques must be combined.

| Value | Count | Example |
|-------|-------|---------|
| `single` | 1 technique | "Apply AM-GM to prove this inequality" |
| `compound` | 2 techniques | "Use PHP + modular arithmetic" |
| `synthesis` | 3+ techniques | "Inversion + radical axis + Ptolemy in one proof" |

### Dimension 3: Creativity Demand

How much the solver must *invent* vs. *apply*.

| Value | Meaning |
|-------|---------|
| `routine` | Recognise the technique, execute standard steps |
| `insightful` | Requires a non-obvious reformulation or clever setup |
| `inventive` | Requires constructing a novel argument or combining ideas in a new way |
| `breakthrough` | No known standard approach; true creation required |

### Dimension 4: Proof Style

What kind of argument the solution requires.

| Value | Meaning |
|-------|---------|
| `computation` | Calculate a specific value or formula |
| `existence` | Prove something exists (often via PHP, probabilistic method) |
| `construction` | Build an explicit example meeting conditions |
| `bound` | Prove an upper/lower bound; find extremal values |
| `characterisation` | Determine all objects satisfying conditions |
| `impossibility` | Prove something cannot exist |

### Dimension 5: Entry Barrier

How hard it is to even *start* the problem, regardless of finishing it.

| Value | Meaning |
|-------|---------|
| `transparent` | The approach is clear; difficulty is in execution |
| `camouflaged` | The right technique is not obvious from the statement |
| `deceptive` | The problem looks like one type but requires a completely different approach |

### Dimension 6: Estimated Solve Time

For a student who knows the required techniques.

| Value | Range |
|-------|-------|
| `quick` | < 15 minutes |
| `standard` | 15–45 minutes |
| `extended` | 45–90 minutes |
| `marathon` | > 90 minutes |

### Worked Example: Full Classification

**Problem:** *IMO 2019 Problem 2 (Geometry)*

> "Find all points P in the plane of triangle ABC such that the areas of triangles
> APB, BPC, CPA can form a triangle."

| Dimension | Value | Reasoning |
|-----------|-------|-----------|
| **Domains** | `GEO-S`, `ALG-INQ` | Synthetic geometry + inequality reasoning |
| **Subtopics** | `GEO-S-TRI`, `ALG-INQ` | Triangle geometry, area inequalities |
| **Techniques** | `T-ANGCHASE`, `T-AMGM` | Angle chasing for setup, AM-GM for the inequality |
| **Competition Position** | `middle` | P2 slot |
| **Technique Depth** | `compound` | 2 techniques |
| **Creativity Demand** | `insightful` | Non-obvious connection between areas and angles |
| **Proof Style** | `characterisation` | "Find all points such that…" |
| **Entry Barrier** | `camouflaged` | Looks purely geometric but needs algebraic reasoning |
| **Solve Time** | `standard` | ~30 minutes for a prepared student |

---

## Layer 7 — Recommendation Engine Design

### 7.1 Personalised Difficulty Function

```
personalised_difficulty(problem P, student S) → float [0, 1]

    technique_gap = average over P.required_techniques T:
        1.0 - S.mastery(T.learning_objectives)

    depth_penalty = {
        single: 0.0,
        compound: 0.15,
        synthesis: 0.35
    }[P.technique_depth]

    creativity_penalty = {
        routine: 0.0,
        insightful: 0.10,
        inventive: 0.25,
        breakthrough: 0.45
    }[P.creativity_demand]

    entry_penalty = {
        transparent: 0.0,
        camouflaged: 0.10,
        deceptive: 0.20
    }[P.entry_barrier]

    return clamp(technique_gap + depth_penalty + creativity_penalty + entry_penalty, 0, 1)
```

### 7.2 Recommendation Modes

| Mode | Goal | Selection Strategy |
|------|------|--------------------|
| **Practice** | Reinforce known techniques | Pick problems where `personalised_difficulty ∈ [0.2, 0.4]` — challenging enough to be useful, not so hard as to be frustrating |
| **Stretch** | Push into the zone of proximal development | `personalised_difficulty ∈ [0.4, 0.65]` — requires effort but is achievable |
| **Challenge** | Prepare for competition conditions | `personalised_difficulty ∈ [0.6, 0.85]` — may require hints; builds resilience |
| **Diagnostic** | Identify gaps | Select problems that isolate individual techniques; prefer `single` technique depth |
| **Review** | Spaced repetition of mastered material | Re-surface problems from solved collections where `days_since_last_attempt > decay_threshold` |
| **Gap-targeted** | Close a specific KnowledgeGap | Select problems requiring the gap's technique at the appropriate Bloom level |

### 7.3 Training Plan Generation Algorithm

```
generate_training_plan(student S, weeks N, target_competition C):

    1. ASSESS current mastery
       - Run diagnostic on under-assessed techniques
       - Identify all KnowledgeGaps

    2. PRIORITISE gaps
       - Score each gap: severity × competition_relevance(C) × downstream_impact
       - Sort by priority_score descending

    3. BUILD technique sequence
       - For each priority gap:
           Walk the prerequisite DAG backwards
           If any prerequisite is also a gap → schedule prerequisite first
       - Result: a topologically sorted list of techniques to learn/reinforce

    4. DISTRIBUTE across weeks
       - Week 1–2: Foundational prerequisites + diagnostic checks
       - Week 3–(N-2): Main technique progression
           Each week: 1 new technique + 2 review techniques
           Each technique: 3 practice → 2 stretch → 1 challenge
       - Week (N-1)–N: Competition simulation
           Full mock papers matching target competition format
           Mixed-topic review based on weakest areas

    5. ADAPT continuously
       - After each TrainingSession:
           Update mastery levels
           Re-evaluate gaps
           Re-prioritise remaining plan
           Inject remediation if new gaps detected
```

### 7.4 Example Training Plan

**Student:** Maria — preparing for USAMO, 12 weeks, 8 hours/week

**Assessed gaps (sorted by priority):**

| Priority | Gap | Severity | Root Cause |
|----------|-----|----------|------------|
| 1 | `T-LTE` (Lifting the Exponent) | critical | Missing prerequisite: `T-LEGENDRE` |
| 2 | `T-INV` (Inversion) | major | Weak: `T-POP` at apply level only |
| 3 | `T-EXTREMAL` (Extremal Principle) | moderate | Never seen |
| 4 | `T-CS` at create level | minor | Proficient but can't construct auxiliary expressions |

**Generated Plan:**

| Week | Focus | Problems |
|------|-------|----------|
| 1 | `T-LEGENDRE` (prerequisite repair) + diagnostic | 6 problems, single technique, routine → insightful |
| 2 | `T-LTE` introduction + `T-POP` reinforcement | 5 NT problems + 3 GEO-S problems |
| 3 | `T-LTE` application + `T-POP` stretch | 4 compound problems mixing LTE with other NT |
| 4 | `T-RADAXIS` → `T-INV` introduction | 6 geometry problems, building from radical axis to inversion |
| 5 | `T-INV` practice + `T-LTE` review | 4 inversion + 2 LTE review |
| 6 | `T-EXTREMAL` introduction + mixed review | 4 extremal + 2 mixed previous techniques |
| 7 | `T-CS` at analyse/create level | 4 hard inequalities requiring clever auxiliary constructions |
| 8 | Compound technique week: `T-INV` + `T-RADAXIS`, `T-LTE` + `T-CRT` | 5 synthesis problems |
| 9 | Mock USAMO Day 1 (3 problems, 4.5 hours) | Scored and analysed |
| 10 | Remediation based on mock + technique review | Adaptive |
| 11 | Mock USAMO Day 2 | Scored and analysed |
| 12 | Final remediation + confidence-building practice problems | Adaptive |

---

## How the Taxonomy Supports Core Features

### Searching

| User Query | Taxonomy Mapping | SQL-like Filter |
|------------|------------------|-----------------|
| "Pigeonhole problems in number theory" | technique = `T-PHP` AND domain = `NT` | `WHERE 'T-PHP' IN techniques AND 'NT' IN domains` |
| "Easy geometry for beginners" | domain = `GEO-S` AND cognitive_load = foundational | `WHERE domain = 'GEO-S' AND all_techniques.cognitive_load = 'foundational'` |
| "Hard IMO shortlist combinatorics" | competition = ISL AND domain = `COMB-*` AND position = `closer` | `WHERE competition = 'ISL' AND domain LIKE 'COMB%' AND position = 'closer'` |
| "Problems that use both generating functions and AM-GM" | techniques ⊇ {`T-OGF`, `T-AMGM`} | `WHERE techniques @> ARRAY['T-OGF','T-AMGM']` |
| "Existence proofs requiring creativity" | proof_style = `existence` AND creativity = `inventive+` | `WHERE proof_style = 'existence' AND creativity >= 'inventive'` |
| "Problems I'm ready for right now" | personalised_difficulty(P, me) ∈ [0.2, 0.5] | Computed at query time from student mastery |

### Personalised Recommendations

```
Maria asks: "Give me something to work on tonight (1 hour)"

System:
  1. Check Maria's active KnowledgeGaps → #1 is T-LTE (critical)
  2. Check prerequisite: T-LEGENDRE → mastery = "proficient" ✓
  3. Select problems:
     - 2 × T-LTE, single technique, routine (warm up)          ~15 min
     - 1 × T-LTE, compound with T-CRT, insightful (stretch)   ~25 min
     - 1 × T-INV, single technique, routine (secondary gap)    ~15 min
  4. Package as a PersonalTrainingCollection
     title: "Thursday Evening NT + Geometry"
     estimated_time: 55 min
```

### Gap Analysis

```
After Maria's training session:

  Attempt on ISL-2018-N4 (requires T-LTE + T-ORD):
    result: stuck after 30 minutes
    hint_log: [
      hint_1: "Consider the p-adic valuation" → still stuck
      hint_2: "What is the order of a mod p?" → partial progress
      hint_3: "Apply LTE after reducing via order" → solved with guidance
    ]

  AI analysis:
    - T-LTE at "apply" level: ✓ (used it once prompted)
    - T-ORD at "understand" level: ✗ (couldn't recognise when to use it)
    → NEW GAP: LO-ORD-02 "Recognise when order arguments simplify
      exponent problems" (severity: moderate)
    → UPDATE: T-LTE mastery stays at "developing" (needed too many hints)
    → PLAN ADJUSTMENT: Insert T-ORD reinforcement before next T-LTE session
```

### Training Plan Adaptation

```
Week 4 check-in:

  Original plan: Start T-INV introduction
  Reality check:
    - T-LTE: mastery moved from "developing" to "proficient" ✓
    - T-POP: mastery still at "apply" (expected "analyse") ✗
    - New gap detected: T-ORD (from session analysis)

  Adapted plan:
    Week 4 (revised): T-POP stretch problems (close the remaining gap)
                      + T-ORD introduction (new gap, prerequisite for LTE mastery)
    Week 5: T-INV introduction (pushed back 1 week)
    Week 12: Added extra mock day if time permits
```

---

## Full Taxonomy Tree (Summary)

```
MathPilot Taxonomy
│
├── ALG — Algebraic Structures & Manipulations
│   ├── ALG-POL  Polynomials & Roots (7 techniques)
│   ├── ALG-INQ  Inequalities (9 techniques)
│   ├── ALG-FEQ  Functional Equations (6 techniques)
│   ├── ALG-SEQ  Sequences & Recurrences (5 techniques)
│   ├── ALG-SYS  Systems of Equations (4 techniques)
│   └── ALG-SET  Algebraic Structures (3 techniques)
│
├── NT — Number Theory & Arithmetic
│   ├── NT-DIV   Divisibility & GCD (4 techniques)
│   ├── NT-MOD   Modular Arithmetic (5 techniques)
│   ├── NT-PRM   Primes & Factorisation (4 techniques)
│   ├── NT-DIO   Diophantine Equations (5 techniques)
│   ├── NT-VAL   Valuations & Local Methods (3 techniques)
│   ├── NT-MUL   Multiplicative Functions (3 techniques)
│   └── NT-CON   Constructions in NT (2 techniques)
│
├── GEO-S — Synthetic & Projective Geometry
│   ├── GEO-S-TRI  Triangle Geometry (5 techniques)
│   ├── GEO-S-CIR  Circles & Cyclic Quads (4 techniques)
│   ├── GEO-S-ANG  Angle Chasing (3 techniques)
│   ├── GEO-S-COL  Collinearity & Concurrence (4 techniques)
│   ├── GEO-S-PRJ  Projective Methods (3 techniques)
│   └── GEO-S-3D   Solid Geometry (2 techniques)
│
├── GEO-A — Analytic & Transformational Geometry
│   ├── GEO-A-CRD  Coordinate Geometry (3 techniques)
│   ├── GEO-A-CPX  Complex Numbers (3 techniques)
│   ├── GEO-A-INV  Inversion (2 techniques)
│   ├── GEO-A-TRN  Transformations (4 techniques)
│   └── GEO-A-VEC  Vector Methods (3 techniques)
│
├── COMB-E — Enumerative & Algebraic Combinatorics
│   ├── COMB-E-CNT  Counting Principles (5 techniques)
│   ├── COMB-E-GEN  Generating Functions (3 techniques)
│   ├── COMB-E-BIJ  Bijections & Identities (4 techniques)
│   ├── COMB-E-REC  Combinatorial Recurrences (3 techniques)
│   └── COMB-E-PRB  Probabilistic Arguments (3 techniques)
│
├── COMB-S — Structural & Extremal Combinatorics
│   ├── COMB-S-GRP  Graph Theory (6 techniques)
│   ├── COMB-S-EXT  Extremal Problems (3 techniques)
│   ├── COMB-S-RAM  Ramsey Theory (2 techniques)
│   ├── COMB-S-CGE  Combinatorial Geometry (3 techniques)
│   ├── COMB-S-SET  Set Systems & Designs (3 techniques)
│   └── COMB-S-ORD  Posets (2 techniques)
│
└── GAME — Strategies, Algorithms & Games
    ├── GAME-INV  Invariants (4 techniques)
    ├── GAME-MON  Monovariants (3 techniques)
    ├── GAME-STR  Game Strategy (4 techniques)
    ├── GAME-ALG  Algorithmic Processes (3 techniques)
    └── GAME-CON  Constructions & Examples (2 techniques)

Total: 8 domains, 50+ subtopics, 120+ techniques, 400+ learning objectives
```
