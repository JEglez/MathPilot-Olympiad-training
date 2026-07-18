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

> **Design note:** The subtopics below are ordered from foundational to advanced,
> informed by the Mexican Math Olympiad (OMM) state/regional curriculum. A student
> entering from a state-level competition should find their starting point in the
> first 3–4 subtopics. The old taxonomy jumped straight to Vieta's and functional
> equations — that's a cliff, not a ramp.

#### Tier 1 — Foundational (OMM State / Regional Level)

These subtopics cover what a student learns in their first 1–2 years of olympiad
training. They are **not** trivial — olympiad problems at this level already
require creative thinking, but the algebraic tools are elementary.

| Code | Subtopic | Scope |
|------|----------|-------|
| `ALG-MAN` | Algebraic Manipulation & Simplification | Expanding, factoring, simplifying expressions; productos notables (special products); difference of squares/cubes; Sophie Germain identity; rationalisation; algebraic fractions |
| `ALG-EQN` | Equations & Linear Systems | Solving linear and quadratic equations; quadratic formula and discriminant; systems of 2–3 linear equations; equations with parameters; word-problem formulation (age, rate, mixture problems) |
| `ALG-BAS-INQ` | Elementary Inequalities & Ordering | Solving linear/quadratic inequalities; sign analysis; absolute value inequalities; comparison by subtraction; trivial bounds; "when does equality hold?" reasoning |
| `ALG-PAT` | Patterns, Telescoping & Clever Arithmetic | Recognising and exploiting algebraic patterns; telescoping sums and products; grouping tricks; digit-sum arguments; arithmetic short-cuts used in competition |
| `ALG-PROG` | Arithmetic & Geometric Progressions | Explicit and recursive formulas; finite sums; problems involving AP/GP properties; sum of squares/cubes formulas; sigma notation |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

The student has solid manipulation skills and begins learning the classic
olympiad inequality and polynomial toolkit.

| Code | Subtopic | Scope |
|------|----------|-------|
| `ALG-POL` | Polynomials & Roots | Factor/remainder theorem; Vieta's formulas; root bounding; irreducibility tests; minimal polynomials; symmetric polynomials; Newton's identities |
| `ALG-INQ` | Classical Inequalities | AM-GM, Cauchy-Schwarz / Engel form, rearrangement, Chebyshev sum, power-mean; choosing the right inequality; equality conditions |
| `ALG-SYS` | Nonlinear & Symmetric Systems | Symmetric substitution (s, p); cyclic systems; substitution strategies; resultants for eliminating variables |
| `ALG-SEQ` | Sequences & Recurrences | Linear recurrences and characteristic equations; bounding sequences; periodicity detection; nested radicals; convergence arguments |
| `ALG-IND` | Mathematical Induction (Algebraic) | Weak and strong induction applied to algebraic identities, inequalities, and divisibility; inductive constructions |
| `ALG-SUM` | Summation & Manipulation of Sums | Sigma notation; sum splitting, reindexing, double sums; Abel summation; bounding sums; competition-style sum evaluation |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `ALG-FEQ` | Functional Equations | Cauchy-type equations; injectivity/surjectivity deductions; substitution strategies; fixed points; regularity conditions |
| `ALG-ADV-INQ` | Advanced Inequalities | Schur, SOS decomposition, Jensen & convexity, smoothing/mixing variables, tangent-line trick, Muirhead, uvw/pqr method |
| `ALG-SET` | Algebraic Structures | Groups, rings, fields as they appear in olympiads; order of elements; algebraic number theory basics; polynomial rings mod p |

### NT — Number Theory & Arithmetic

> **Design note:** OMM state-level number theory is surprisingly accessible —
> divisibility, parity, basic modular arithmetic, and simple Diophantine equations.
> The jump to Fermat/Euler, CRT, and valuations happens at the national-prep level.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `NT-BAS` | Integer Properties & Parity | Even/odd arguments; properties of sums and products; digit-sum tricks; last-digit analysis; basic divisibility rules (2, 3, 4, 5, 9, 11) |
| `NT-DIV` | Divisibility & GCD | Division algorithm; GCD and LCM via factorisation; Euclidean algorithm (basic); Bézout's identity (statement); divisibility in competition problems |
| `NT-PRM-BAS` | Prime Numbers & Factorisation | Fundamental Theorem of Arithmetic; trial division; counting divisors; recognising prime structure in a problem |
| `NT-MOD-BAS` | Introduction to Modular Arithmetic | Congruence notation; residue classes; arithmetic with remainders; simple linear congruences; "clock arithmetic" intuition |
| `NT-DIO-BAS` | Elementary Diophantine Equations | Linear Diophantine equations (ax + by = c); existence of solutions via GCD; parametric families; simple quadratic Diophantines (x² + y² = n for small n) |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `NT-MOD` | Modular Arithmetic (Full) | Fermat's Little Theorem; Euler's theorem; Wilson's theorem; order of an element; solving polynomial congruences; systems of congruences and CRT |
| `NT-PRM` | Advanced Prime Theory | Legendre's formula (v_p(n!)); Bertrand's postulate (applications); prime gaps in competition; sieve ideas |
| `NT-DIO` | Diophantine Equations (Full) | Pell equations; Vieta jumping; infinite descent; parametric solutions; bounding arguments for Diophantine problems |
| `NT-MUL` | Multiplicative Functions | Euler's totient; number-of-divisors function τ; sum-of-divisors function σ; multiplicativity proofs; Möbius function (introduction) |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `NT-VAL` | Valuations & Local Methods | p-adic valuations; Lifting the Exponent Lemma; Hensel's lemma; local-global reasoning |
| `NT-QR` | Quadratic Residues & Reciprocity | Legendre symbol; Euler's criterion; quadratic reciprocity; Jacobi symbol |
| `NT-CON` | Constructions in Number Theory | Explicit constructions satisfying number-theoretic constraints; Zsygmondy's theorem; algebraic number theory in contests |

### GEO-S — Synthetic & Projective Geometry

> **Design note:** OMM state geometry is Euclidean fundamentals — triangle properties,
> congruence/similarity criteria, basic circle theorems. No trigonometry, no directed
> angles, no projective methods. The split into GEO-S and GEO-A happens naturally
> because students at the state level only use synthetic methods.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-S-FUN` | Euclidean Fundamentals | Points, lines, angles (types and measurement); parallel and perpendicular lines; angle relationships at transversals; basic constructions with ruler and compass |
| `GEO-S-TRI-BAS` | Triangle Basics | Triangle inequality; angle-sum property; congruence criteria (SSS, SAS, ASA, AAS); similarity criteria (AA, SAS, SSS); notable points — centroid, incentre, circumcentre, orthocentre (definitions and basic properties) |
| `GEO-S-QUAD` | Quadrilaterals & Polygons | Properties of parallelograms, rectangles, rhombi, trapezoids; interior angle sums; diagonals; inscribed and circumscribed polygons (basic) |
| `GEO-S-CIR-BAS` | Circle Basics | Central and inscribed angle theorem; tangent-radius perpendicularity; chords and arcs; inscribed and circumscribed polygons; basic tangent-line problems |
| `GEO-S-AREA` | Areas & Geometric Measurement | Area formulas for triangles, quadrilaterals, circles; area decomposition and addition/subtraction; area ratios from similarity; perimeter and area optimization (basic) |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-S-TRI` | Triangle Geometry (Advanced) | Cevians (Ceva's theorem); medial and pedal triangles; Stewart's theorem; angle bisector theorem; notable circles (nine-point circle introduction); trigonometric identities in triangle context |
| `GEO-S-CIR` | Circles & Cyclic Quadrilaterals | Power of a point; radical axis and radical centre; Ptolemy's theorem and inequality; cyclic quadrilateral properties; tangent-line constructions; Simson line |
| `GEO-S-ANG` | Angle Chasing (Directed Angles) | Directed angle formulation; systematic angle chasing; inscribed angle corollaries; angles in tangent-chord configurations |
| `GEO-S-COL` | Collinearity & Concurrence | Menelaus' theorem; Ceva's theorem (trigonometric form); radical axis concurrence; Desargues' theorem; proving collinearity via area ratios |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-S-PRJ` | Projective Methods | Cross-ratio; harmonic division and harmonic conjugates; poles and polars; projective transformations; La Hire's theorem |
| `GEO-S-3D` | Solid Geometry | 3D constructions; cross-sections of solids; dihedral angles; spatial angle chasing |

### GEO-A — Analytic & Transformational Geometry

> **Design note:** At OMM state level, coordinate geometry is limited to distance,
> midpoint, and line equations. Complex numbers and inversion are national/ISL-level
> tools. We add a foundational tier for basic analytic methods.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-A-BAS` | Basic Coordinate Geometry | Cartesian plane; distance formula; midpoint formula; slope and equation of a line; perpendicularity and parallelism via slopes; basic locus problems |
| `GEO-A-TRN-BAS` | Elementary Transformations | Reflections (over axes and lines); rotations (90°, 180°); translations; basic symmetry arguments; identifying transformation in a problem |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-A-CRD` | Coordinate Methods (Full) | Shoelace formula for area; parametric representations; circle equations; conic sections in contest problems; coordinate bashing strategies |
| `GEO-A-TRN` | Geometric Transformations (Full) | Homotheties and dilation; spiral similarities; isogonal conjugates; composition of transformations; choosing the right transformation |
| `GEO-A-VEC` | Vector Methods | Dot product and cross product proofs; position vectors; centroid and barycentric coordinates (introduction) |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GEO-A-CPX` | Complex Numbers in Geometry | Unit circle representation; rotation and scaling via multiplication; triangle centres in complex coordinates; spiral similarity via complex division |
| `GEO-A-INV` | Inversion | Circle inversion; image of lines and circles; coaxial circles; inversion distance formulas; choosing inversion centre and radius |
| `GEO-A-BARY` | Barycentric Coordinates | Full barycentric framework; displacement vectors; distance and area in barycentric; intersection formulas |

### COMB-E — Enumerative & Algebraic Combinatorics

> **Design note:** OMM state-level combinatorics focuses on direct counting —
> addition/multiplication principles, basic permutations/combinations, and the
> binomial theorem. PIE and generating functions are intermediate/advanced tools.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-E-BAS` | Counting Principles | Addition and multiplication principles; systematic listing and tree diagrams; counting with restrictions; complementary counting ("count the opposite") |
| `COMB-E-PC` | Permutations & Combinations | Permutations without/with repetition; combinations; choosing subsets; arrangements with identical objects; multinomial coefficient (basic) |
| `COMB-E-BIN` | Binomial Theorem & Pascal's Triangle | Binomial expansion; Pascal's triangle properties; basic binomial identities (Pascal's rule, sum of row); simple coefficient extraction |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-E-CNT` | Advanced Counting | Principle of Inclusion-Exclusion (PIE); stars-and-bars; derangements; Burnside's lemma; counting with symmetry |
| `COMB-E-BIJ` | Bijections & Combinatorial Identities | Bijective proofs; Vandermonde identity; hockey stick identity; Catalan numbers; ballot problem |
| `COMB-E-REC` | Combinatorial Recurrences | Setting up counting recurrences; solving linear recurrences; Fibonacci-type problems; transfer matrix method (introduction) |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-E-GEN` | Generating Functions | OGFs and EGFs; coefficient extraction; convolution; snake oil method; composition of generating functions |
| `COMB-E-PRB` | Probabilistic & Expected Value Arguments | Probabilistic method (Erdős); linearity of expectation; Lovász Local Lemma; random colouring and existence proofs |
| `COMB-E-ALG` | Algebraic Combinatorics | Linear algebra in counting; transfer matrices (full); Stanley's reciprocity; polynomial method |

### COMB-S — Structural & Extremal Combinatorics

> **Design note:** The Pigeonhole Principle and small-case Ramsey arguments (e.g.,
> "among 6 people…") appear at the OMM state level. Graph theory and extremal
> methods are intermediate/advanced.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-S-PHP` | Pigeonhole Principle | Basic PHP statement; generalised PHP; choosing "pigeons" and "holes" in word problems; existence proofs via PHP on finite sets |
| `COMB-S-GRP-BAS` | Introduction to Graph Theory | Vertices, edges, degree; handshaking lemma; paths and cycles; trees (basic properties); graph colouring (chromatic number for small graphs); bipartite graphs |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-S-GRP` | Graph Theory (Full) | Eulerian and Hamiltonian paths/cycles; planarity and Euler's formula; matchings (Hall's theorem); connectivity; Turán's theorem; tournament graphs |
| `COMB-S-EXT` | Extremal Combinatorics | Extremal principle ("pick the max/min"); Turán-type problems; forbidden subgraph results; Kruskal-Katona theorem |
| `COMB-S-CGE` | Combinatorial Geometry | Convex hulls; point configurations in the plane; Helly's theorem; Erdős–Szekeres theorem; lattice point arguments |
| `COMB-S-RAM-BAS` | Ramsey Theory (Introduction) | Small Ramsey numbers; R(3,3) = 6 and related arguments; Schur's theorem; party-problem style proofs |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `COMB-S-RAM` | Ramsey Theory (Full) | General Ramsey bounds; Hales-Jewett theorem; Rado's theorem; infinite Ramsey theory; applications to number theory |
| `COMB-S-SET` | Set Systems & Designs | Sunflower lemma; VC dimension; Latin squares and orthogonal arrays; block designs; Bollobás set-pairs inequality |
| `COMB-S-ORD` | Partially Ordered Sets | Dilworth's theorem; antichains and chain decomposition; Sperner's theorem; lattice theory in contest settings |

### GAME — Strategies, Algorithms & Games

> **Design note:** Games, invariants, and parity arguments are a **staple of OMM
> state-level problems**. The Mexican olympiad tradition introduces these early —
> Nim-like games, parity invariants, and colouring arguments appear from the very
> first competitions a student encounters. This makes GAME unusual: its Tier 1 is
> among the first things any OMM student learns.

#### Tier 1 — Foundational (OMM State / Regional Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GAME-PAR` | Parity & Simple Invariants | Even/odd arguments; checkerboard colouring; simple modular invariants; "what doesn't change?" reasoning; tiling problems via colouring |
| `GAME-NIMBASIC` | Simple Game Analysis | Take-away games (Nim-like); analysing small cases; finding winning/losing positions; backward induction from endgame; "make it a multiple of k" strategies |
| `GAME-CON-BAS` | Elementary Constructions | Building explicit examples satisfying constraints; proof by construction; showing existence by building the object |

#### Tier 2 — Intermediate (OMM National Prep / Pre-ISL Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GAME-INV` | Invariants (Full) | Modular invariants; sum invariants; colouring invariants in complex settings; identifying hidden conserved quantities; impossibility proofs via invariants |
| `GAME-MON` | Monovariants & Potential Functions | Quantities that strictly increase/decrease; energy arguments; convergence proofs; "eventually terminates" arguments; potential functions for processes |
| `GAME-ALG` | Algorithmic Processes | Greedy algorithms; swapping arguments; scheduling and optimization; extremal element processes; iterative improvement |

#### Tier 3 — Advanced (OMM National / ISL / IMO Level)

| Code | Subtopic | Scope |
|------|----------|-------|
| `GAME-STR` | Game Strategy (Full) | Sprague-Grundy theory; Nim-values for compound games; strategy-stealing arguments; combinatorial game theory; surreal numbers (introduction) |
| `GAME-CON` | Advanced Constructions | Complex constructions meeting multiple constraints; probabilistic existence arguments turned constructive; extremal constructions |

---

## Layer 3 — Techniques (120+ Techniques)

Techniques are the **atomic skills** a student learns. Each technique belongs to
a primary subtopic but may appear across many. Below is a representative sample
(not exhaustive).

### Algebraic Techniques — Foundational Tier (ALG-MAN, ALG-EQN, ALG-BAS-INQ, ALG-PAT, ALG-PROG)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-SPECPROD` | Special Products & Factorisation Patterns | foundational | ALG-MAN |
| `T-DIFFSQ` | Difference of Squares / Cubes / Sophie Germain | foundational | ALG-MAN |
| `T-ALGFRAC` | Algebraic Fractions & Rationalisation | foundational | ALG-MAN |
| `T-SUBST` | Strategic Substitution (let u = …) | foundational | ALG-MAN |
| `T-QUADFORM` | Quadratic Formula, Discriminant & Sign Analysis | foundational | ALG-EQN |
| `T-PARAMSOLVE` | Equations with Parameters | foundational | ALG-EQN |
| `T-WORDMODEL` | Algebraic Modelling of Word Problems | foundational | ALG-EQN |
| `T-SIGNINEQ` | Sign Analysis & Comparison by Subtraction | foundational | ALG-BAS-INQ |
| `T-ABSVAL` | Absolute Value Reasoning | foundational | ALG-BAS-INQ |
| `T-TRIVBOUND` | Trivial Bounds (squares ≥ 0, |x| ≥ 0) | foundational | ALG-BAS-INQ |
| `T-TELESCOPE` | Telescoping Sums & Products | foundational | ALG-PAT |
| `T-GROUP` | Grouping & Pairing Tricks | foundational | ALG-PAT |
| `T-APGP` | AP / GP Formulas & Properties | foundational | ALG-PROG |
| `T-SIGMA` | Sigma Notation & Finite Sum Formulas | foundational | ALG-PROG |

### Algebraic Techniques — Intermediate Tier (ALG-POL, ALG-INQ, ALG-SYS, ALG-SEQ, ALG-IND, ALG-SUM)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-VIETA` | Vieta's Formulas | intermediate | ALG-POL |
| `T-FACREM` | Factor & Remainder Theorem | intermediate | ALG-POL |
| `T-SYMPOLY` | Symmetric Polynomials & Newton's Identities | intermediate | ALG-POL |
| `T-ROOTBOUND` | Root Bounding & Irreducibility | intermediate | ALG-POL |
| `T-AMGM` | AM-GM and Weighted AM-GM | intermediate | ALG-INQ |
| `T-CS` | Cauchy-Schwarz (direct & Engel/Titu form) | intermediate | ALG-INQ |
| `T-REARRANGE` | Rearrangement Inequality | intermediate | ALG-INQ |
| `T-CHEBY` | Chebyshev Sum Inequality | intermediate | ALG-INQ |
| `T-POWERMEAN` | Power Mean Inequality | intermediate | ALG-INQ |
| `T-SYMSUB` | Symmetric Substitution (s, p, q) | intermediate | ALG-SYS |
| `T-CHARACT` | Characteristic Equation for Recurrences | intermediate | ALG-SEQ |
| `T-INDUCTION` | Mathematical Induction (weak & strong) | intermediate | ALG-IND |
| `T-ABEL` | Abel Summation & Summation by Parts | intermediate | ALG-SUM |

### Algebraic Techniques — Advanced Tier (ALG-FEQ, ALG-ADV-INQ, ALG-SET)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-CAUCHY-FEQ` | Cauchy-type Functional Equations | advanced | ALG-FEQ |
| `T-INJSURJ` | Injectivity / Surjectivity Deduction | advanced | ALG-FEQ |
| `T-FIXEDPT` | Fixed-Point & Periodicity in FEs | advanced | ALG-FEQ |
| `T-SCHUR` | Schur's Inequality | advanced | ALG-ADV-INQ |
| `T-SOS` | Sum of Squares Decomposition | advanced | ALG-ADV-INQ |
| `T-JENSEN` | Jensen's Inequality & Convexity | advanced | ALG-ADV-INQ |
| `T-SMOOTH` | Smoothing / Mixing Variables | advanced | ALG-ADV-INQ |
| `T-TANGENT` | Tangent Line Trick | advanced | ALG-ADV-INQ |
| `T-MUIRHEAD` | Muirhead's Inequality & Majorisation | advanced | ALG-ADV-INQ |
| `T-UVWXYZ` | uvw / pqr Substitution Method | elite | ALG-ADV-INQ |

### Number Theory Techniques — Foundational Tier (NT-BAS, NT-DIV, NT-PRM-BAS, NT-MOD-BAS, NT-DIO-BAS)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-PARITY-NT` | Parity Arguments in Number Theory | foundational | NT-BAS |
| `T-LASTDIGIT` | Last-Digit & Digit-Sum Analysis | foundational | NT-BAS |
| `T-DIVRULES` | Divisibility Rules (2, 3, 4, 5, 9, 11) | foundational | NT-BAS |
| `T-DIVALGO` | Division Algorithm & Remainders | foundational | NT-DIV |
| `T-EUCLID` | Euclidean Algorithm (basic GCD computation) | foundational | NT-DIV |
| `T-GCDLCM` | GCD/LCM via Prime Factorisation | foundational | NT-DIV |
| `T-FTA` | Fundamental Theorem of Arithmetic | foundational | NT-PRM-BAS |
| `T-DIVCOUNT` | Counting Divisors from Factorisation | foundational | NT-PRM-BAS |
| `T-CONGBASIC` | Congruence Notation & Residue Arithmetic | foundational | NT-MOD-BAS |
| `T-LINCONG` | Solving Simple Linear Congruences | foundational | NT-MOD-BAS |
| `T-LINDIO` | Linear Diophantine Equations (ax + by = c) | foundational | NT-DIO-BAS |
| `T-SMALLDIO` | Small Quadratic Diophantines (x² ± y² = n) | foundational | NT-DIO-BAS |

### Number Theory Techniques — Intermediate Tier (NT-MOD, NT-PRM, NT-DIO, NT-MUL)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-FLT` | Fermat's Little Theorem | intermediate | NT-MOD |
| `T-EULER` | Euler's Theorem & Totient Function | intermediate | NT-MOD |
| `T-WILSON` | Wilson's Theorem | intermediate | NT-MOD |
| `T-ORD` | Order of an Element mod n | intermediate | NT-MOD |
| `T-CRT` | Chinese Remainder Theorem | intermediate | NT-MOD |
| `T-LEGENDRE` | Legendre's Formula (v_p(n!)) | intermediate | NT-PRM |
| `T-DESCENT` | Infinite Descent | intermediate | NT-DIO |
| `T-VIETA-JUMP` | Vieta Jumping (root flipping) | intermediate | NT-DIO |
| `T-PELLBASIC` | Pell Equations (basic) | intermediate | NT-DIO |
| `T-TOTIENT` | Euler's Totient Properties & Computation | intermediate | NT-MUL |
| `T-DIVSUMFN` | Divisor Sum Functions (τ, σ) | intermediate | NT-MUL |

### Number Theory Techniques — Advanced Tier (NT-VAL, NT-QR, NT-CON)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-PADIC` | p-adic Valuations | advanced | NT-VAL |
| `T-LTE` | Lifting the Exponent Lemma | advanced | NT-VAL |
| `T-HENSEL` | Hensel's Lemma (lifting mod p^k) | advanced | NT-VAL |
| `T-QR` | Quadratic Residues & Legendre Symbol | advanced | NT-QR |
| `T-QRECIP` | Quadratic Reciprocity | elite | NT-QR |
| `T-ZSIG` | Zsygmondy's Theorem | elite | NT-CON |

### Geometry Techniques — Foundational Tier (GEO-S-FUN, GEO-S-TRI-BAS, GEO-S-QUAD, GEO-S-CIR-BAS, GEO-S-AREA, GEO-A-BAS, GEO-A-TRN-BAS)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-ANGREL` | Angle Relationships at Parallels | foundational | GEO-S-FUN |
| `T-CONGCRIT` | Triangle Congruence Criteria (SSS, SAS, ASA) | foundational | GEO-S-TRI-BAS |
| `T-SIMCRIT` | Triangle Similarity Criteria (AA, SAS, SSS) | foundational | GEO-S-TRI-BAS |
| `T-PYTHAG` | Pythagorean Theorem & Converse | foundational | GEO-S-TRI-BAS |
| `T-NOTABLEPTS` | Notable Points (centroid, incentre, circumcentre, orthocentre) | foundational | GEO-S-TRI-BAS |
| `T-INSCANG` | Inscribed Angle Theorem & Corollaries | foundational | GEO-S-CIR-BAS |
| `T-TANGPERP` | Tangent-Radius Perpendicularity | foundational | GEO-S-CIR-BAS |
| `T-AREADECOMP` | Area Decomposition & Ratios | foundational | GEO-S-AREA |
| `T-DISTMID` | Distance & Midpoint Formulas | foundational | GEO-A-BAS |
| `T-SLOPEQ` | Slope & Line Equations | foundational | GEO-A-BAS |
| `T-BASICSYM` | Basic Symmetry (reflection, rotation 90°/180°) | foundational | GEO-A-TRN-BAS |

### Geometry Techniques — Intermediate Tier (GEO-S-TRI, GEO-S-CIR, GEO-S-ANG, GEO-S-COL, GEO-A-CRD, GEO-A-TRN, GEO-A-VEC)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-CEVA` | Ceva's Theorem (ratio & trig forms) | intermediate | GEO-S-TRI |
| `T-STEWART` | Stewart's Theorem | intermediate | GEO-S-TRI |
| `T-ANGBISECT` | Angle Bisector Theorem | intermediate | GEO-S-TRI |
| `T-POP` | Power of a Point | intermediate | GEO-S-CIR |
| `T-RADAXIS` | Radical Axis & Radical Centre | intermediate | GEO-S-CIR |
| `T-PTOLEMY` | Ptolemy's Inequality / Equality | intermediate | GEO-S-CIR |
| `T-SIMSON` | Simson Line & Pedal Triangles | intermediate | GEO-S-CIR |
| `T-ANGCHASE` | Directed Angle Chasing | intermediate | GEO-S-ANG |
| `T-MENELAUS` | Menelaus' Theorem | intermediate | GEO-S-COL |
| `T-SHOELACE` | Shoelace Formula for Area | intermediate | GEO-A-CRD |
| `T-HOMOTHETY` | Homothety & Dilation | intermediate | GEO-A-TRN |
| `T-SPIRAL` | Spiral Similarity | intermediate | GEO-A-TRN |
| `T-DOTCROSS` | Dot & Cross Product Proofs | intermediate | GEO-A-VEC |

### Geometry Techniques — Advanced Tier (GEO-S-PRJ, GEO-A-CPX, GEO-A-INV, GEO-A-BARY)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-PROJECTIVE` | Projective Methods (cross-ratio, poles/polars) | elite | GEO-S-PRJ |
| `T-HARMONIC` | Harmonic Division & Conjugates | advanced | GEO-S-PRJ |
| `T-CPXGEO` | Complex Number Geometry | advanced | GEO-A-CPX |
| `T-INV` | Circle Inversion | advanced | GEO-A-INV |
| `T-BARY` | Barycentric Coordinates (full framework) | advanced | GEO-A-BARY |

### Combinatorics Techniques — Foundational Tier (COMB-E-BAS, COMB-E-PC, COMB-E-BIN, COMB-S-PHP, COMB-S-GRP-BAS)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-ADDMULT` | Addition & Multiplication Principles | foundational | COMB-E-BAS |
| `T-COMPCOUNT` | Complementary Counting | foundational | COMB-E-BAS |
| `T-PERMCOMB` | Permutations & Combinations Formulas | foundational | COMB-E-PC |
| `T-MULTINOMIAL` | Arrangements with Identical Objects | foundational | COMB-E-PC |
| `T-BINOMEXP` | Binomial Expansion & Pascal's Triangle | foundational | COMB-E-BIN |
| `T-PHP` | Pigeonhole Principle (basic & generalised) | foundational | COMB-S-PHP |
| `T-HANDSHAKE` | Handshaking Lemma & Degree Arguments | foundational | COMB-S-GRP-BAS |
| `T-GRAPHCOLOR` | Graph Colouring (small cases, bipartite) | foundational | COMB-S-GRP-BAS |

### Combinatorics Techniques — Intermediate Tier (COMB-E-CNT, COMB-E-BIJ, COMB-E-REC, COMB-S-GRP, COMB-S-EXT, COMB-S-CGE, COMB-S-RAM-BAS)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-PIE` | Principle of Inclusion-Exclusion | intermediate | COMB-E-CNT |
| `T-STARSBAR` | Stars and Bars | intermediate | COMB-E-CNT |
| `T-DERANGE` | Derangements | intermediate | COMB-E-CNT |
| `T-BURNSIDE` | Burnside's Lemma | intermediate | COMB-E-CNT |
| `T-BIJECTION` | Bijective Proofs | intermediate | COMB-E-BIJ |
| `T-CATALAN` | Catalan Numbers & Ballot Problem | intermediate | COMB-E-BIJ |
| `T-COUNTREC` | Setting Up Counting Recurrences | intermediate | COMB-E-REC |
| `T-DBLCNT` | Double Counting | intermediate | COMB-S-GRP |
| `T-HALL` | Hall's Marriage Theorem | intermediate | COMB-S-GRP |
| `T-TURAN` | Turán's Theorem | intermediate | COMB-S-GRP |
| `T-EXTREMAL` | Extremal Principle (pick the max/min) | intermediate | COMB-S-EXT |
| `T-CONVHULL` | Convex Hull & Erdős–Szekeres | intermediate | COMB-S-CGE |
| `T-RAMSEY` | Small Ramsey Arguments (R(3,3)=6 style) | intermediate | COMB-S-RAM-BAS |

### Combinatorics Techniques — Advanced Tier (COMB-E-GEN, COMB-E-PRB, COMB-E-ALG, COMB-S-RAM, COMB-S-SET, COMB-S-ORD)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-OGF` | Ordinary Generating Functions | advanced | COMB-E-GEN |
| `T-EGF` | Exponential Generating Functions | advanced | COMB-E-GEN |
| `T-PROBMETHOD` | Probabilistic Method (Erdős) | advanced | COMB-E-PRB |
| `T-LINEXP` | Linearity of Expectation | advanced | COMB-E-PRB |
| `T-LINALG` | Linear Algebra in Combinatorics | elite | COMB-E-ALG |
| `T-GENRAMSEY` | General Ramsey Bounds & Hales-Jewett | advanced | COMB-S-RAM |
| `T-SUNFLOWER` | Sunflower Lemma | advanced | COMB-S-SET |
| `T-DILWORTH` | Dilworth's Theorem & Chain Decomposition | advanced | COMB-S-ORD |
| `T-SPERNER` | Sperner's Theorem | advanced | COMB-S-ORD |

### Strategy & Game Techniques — Foundational Tier (GAME-PAR, GAME-NIMBASIC, GAME-CON-BAS)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-PARITY` | Parity Invariant | foundational | GAME-PAR |
| `T-COLOURING` | Checkerboard & Colouring Arguments | foundational | GAME-PAR |
| `T-TILING` | Tiling Impossibility via Colouring | foundational | GAME-PAR |
| `T-NIMBASIC` | Take-away Game Analysis (small cases, backward induction) | foundational | GAME-NIMBASIC |
| `T-PAIRING` | Pairing Strategy | foundational | GAME-NIMBASIC |
| `T-CONSTRUCT` | Proof by Explicit Construction | foundational | GAME-CON-BAS |

### Strategy & Game Techniques — Intermediate Tier (GAME-INV, GAME-MON, GAME-ALG)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-MODINV` | Modular Invariant | intermediate | GAME-INV |
| `T-SUMINV` | Sum / Product Invariant | intermediate | GAME-INV |
| `T-ENERGY` | Energy / Potential Function (monovariant) | intermediate | GAME-MON |
| `T-TERMINATE` | Termination Proofs via Monovariant | intermediate | GAME-MON |
| `T-GREEDY` | Greedy Construction | intermediate | GAME-ALG |
| `T-SWAP` | Swapping / Exchange Argument | intermediate | GAME-ALG |
| `T-STEALSTRAT` | Strategy Stealing | intermediate | GAME-ALG |

### Strategy & Game Techniques — Advanced Tier (GAME-STR, GAME-CON)

| Code | Technique | Cognitive Load | Subtopic |
|------|-----------|----------------|----------|
| `T-NIMVAL` | Nim-values & Sprague-Grundy Theory | advanced | GAME-STR |
| `T-COMPGAME` | Compound Game Decomposition | advanced | GAME-STR |
| `T-ADVCON` | Advanced Constructions (multi-constraint, extremal) | advanced | GAME-CON |

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
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── ALG-MAN      Manipulation & Simplification (4 techniques)
│   │   ├── ALG-EQN      Equations & Linear Systems (3 techniques)
│   │   ├── ALG-BAS-INQ  Elementary Inequalities (3 techniques)
│   │   ├── ALG-PAT      Patterns & Telescoping (2 techniques)
│   │   └── ALG-PROG     Progressions (2 techniques)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── ALG-POL  Polynomials & Roots (4 techniques)
│   │   ├── ALG-INQ  Classical Inequalities (5 techniques)
│   │   ├── ALG-SYS  Nonlinear & Symmetric Systems (1 technique)
│   │   ├── ALG-SEQ  Sequences & Recurrences (1 technique)
│   │   ├── ALG-IND  Mathematical Induction (1 technique)
│   │   └── ALG-SUM  Summation Techniques (1 technique)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── ALG-FEQ      Functional Equations (3 techniques)
│       ├── ALG-ADV-INQ  Advanced Inequalities (7 techniques)
│       └── ALG-SET      Algebraic Structures (—)
│
├── NT — Number Theory & Arithmetic
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── NT-BAS      Integer Properties & Parity (3 techniques)
│   │   ├── NT-DIV      Divisibility & GCD (3 techniques)
│   │   ├── NT-PRM-BAS  Prime Numbers & Factorisation (2 techniques)
│   │   ├── NT-MOD-BAS  Intro Modular Arithmetic (2 techniques)
│   │   └── NT-DIO-BAS  Elementary Diophantine Equations (2 techniques)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── NT-MOD  Modular Arithmetic — Full (5 techniques)
│   │   ├── NT-PRM  Advanced Prime Theory (1 technique)
│   │   ├── NT-DIO  Diophantine Equations — Full (3 techniques)
│   │   └── NT-MUL  Multiplicative Functions (2 techniques)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── NT-VAL  Valuations & Local Methods (3 techniques)
│       ├── NT-QR   Quadratic Residues & Reciprocity (2 techniques)
│       └── NT-CON  Constructions in NT (1 technique)
│
├── GEO-S — Synthetic & Projective Geometry
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── GEO-S-FUN      Euclidean Fundamentals (1 technique)
│   │   ├── GEO-S-TRI-BAS  Triangle Basics (4 techniques)
│   │   ├── GEO-S-QUAD     Quadrilaterals & Polygons (—)
│   │   ├── GEO-S-CIR-BAS  Circle Basics (2 techniques)
│   │   └── GEO-S-AREA     Areas & Measurement (1 technique)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── GEO-S-TRI  Triangle Geometry — Advanced (3 techniques)
│   │   ├── GEO-S-CIR  Circles & Cyclic Quads (4 techniques)
│   │   ├── GEO-S-ANG  Directed Angle Chasing (1 technique)
│   │   └── GEO-S-COL  Collinearity & Concurrence (1 technique)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── GEO-S-PRJ  Projective Methods (2 techniques)
│       └── GEO-S-3D   Solid Geometry (—)
│
├── GEO-A — Analytic & Transformational Geometry
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── GEO-A-BAS      Basic Coordinate Geometry (2 techniques)
│   │   └── GEO-A-TRN-BAS  Elementary Transformations (1 technique)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── GEO-A-CRD  Coordinate Methods — Full (1 technique)
│   │   ├── GEO-A-TRN  Transformations — Full (2 techniques)
│   │   └── GEO-A-VEC  Vector Methods (1 technique)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── GEO-A-CPX   Complex Number Geometry (1 technique)
│       ├── GEO-A-INV   Inversion (1 technique)
│       └── GEO-A-BARY  Barycentric Coordinates (1 technique)
│
├── COMB-E — Enumerative & Algebraic Combinatorics
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── COMB-E-BAS  Counting Principles (2 techniques)
│   │   ├── COMB-E-PC   Permutations & Combinations (2 techniques)
│   │   └── COMB-E-BIN  Binomial Theorem & Pascal (1 technique)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── COMB-E-CNT  Advanced Counting / PIE (4 techniques)
│   │   ├── COMB-E-BIJ  Bijections & Identities (2 techniques)
│   │   └── COMB-E-REC  Combinatorial Recurrences (1 technique)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── COMB-E-GEN  Generating Functions (2 techniques)
│       ├── COMB-E-PRB  Probabilistic Arguments (2 techniques)
│       └── COMB-E-ALG  Algebraic Combinatorics (1 technique)
│
├── COMB-S — Structural & Extremal Combinatorics
│   │
│   ├── Tier 1 — Foundational (OMM State / Regional)
│   │   ├── COMB-S-PHP      Pigeonhole Principle (1 technique)
│   │   └── COMB-S-GRP-BAS  Intro Graph Theory (2 techniques)
│   │
│   ├── Tier 2 — Intermediate (OMM National Prep)
│   │   ├── COMB-S-GRP      Graph Theory — Full (3 techniques)
│   │   ├── COMB-S-EXT      Extremal Combinatorics (1 technique)
│   │   ├── COMB-S-CGE      Combinatorial Geometry (1 technique)
│   │   └── COMB-S-RAM-BAS  Ramsey Theory — Intro (1 technique)
│   │
│   └── Tier 3 — Advanced (OMM National / ISL / IMO)
│       ├── COMB-S-RAM  Ramsey Theory — Full (1 technique)
│       ├── COMB-S-SET  Set Systems & Designs (1 technique)
│       └── COMB-S-ORD  Posets (2 techniques)
│
└── GAME — Strategies, Algorithms & Games
    │
    ├── Tier 1 — Foundational (OMM State / Regional)
    │   ├── GAME-PAR      Parity & Simple Invariants (3 techniques)
    │   ├── GAME-NIMBASIC  Simple Game Analysis (2 techniques)
    │   └── GAME-CON-BAS   Elementary Constructions (1 technique)
    │
    ├── Tier 2 — Intermediate (OMM National Prep)
    │   ├── GAME-INV  Invariants — Full (2 techniques)
    │   ├── GAME-MON  Monovariants (2 techniques)
    │   └── GAME-ALG  Algorithmic Processes (3 techniques)
    │
    └── Tier 3 — Advanced (OMM National / ISL / IMO)
        ├── GAME-STR  Game Strategy — Full (2 techniques)
        └── GAME-CON  Advanced Constructions (1 technique)

Total: 8 domains, 58 subtopics across 3 tiers, 160+ techniques, 500+ learning objectives
```
