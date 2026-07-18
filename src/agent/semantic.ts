/** Anything that can turn text into a vector (llama.rn's embedding() in the app). */
export interface Embedder {
  embed(text: string): Promise<number[]>
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** shrink stored vectors — 4 decimals is plenty for ranking */
export function roundVector(v: number[]): number[] {
  return v.map((x) => Math.round(x * 10000) / 10000)
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
}

/** 0..1 keyword-overlap score — the fallback when no embedding exists */
export function keywordScore01(query: string, text: string): number {
  const words = tokenize(query)
  if (words.length === 0) return 0
  const textWords = new Set(tokenize(text))
  const overlap = words.reduce((acc, w) => acc + (textWords.has(w) ? 1 : 0), 0)
  return overlap / words.length
}
