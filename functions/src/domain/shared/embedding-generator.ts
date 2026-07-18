// Domain interface for generating text embeddings
// AI services must be wrapped behind domain interfaces — architecture-principles.md §2
// Concrete implementations live in infrastructure/ai/

export interface EmbeddingGenerator {
  /**
   * Embed a single text string.
   * Returns a 1536-dimensional vector, or null when the service is unavailable
   * (circuit open, rate-limited, etc.). Callers must handle the null case
   * and degrade gracefully (e.g. text-only search).
   */
  embed(text: string): Promise<number[] | null>;
}
