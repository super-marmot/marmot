import { KVStore } from './types'
import { Embedder, cosineSimilarity, keywordScore01, roundVector } from './semantic'

/**
 * Local-document RAG: chunk → embed (lazily) → retrieve by meaning →
 * inject via the search_documents tool. Same degradation contract as
 * memory: no embedder → keyword fallback, chunks embedded over time.
 */

export const MAX_DOC_CHARS = 200_000
export const MAX_CHUNKS_PER_DOC = 300
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 120
const MIN_SCORE = 0.25
const MAX_BACKFILL_PER_RETRIEVE = 8

export interface StoredDocument {
  id: string
  name: string
  addedAt: number
  chunkCount: number
}

interface DocChunk {
  docId: string
  idx: number
  text: string
  embedding?: number[]
}

export interface DocHit {
  docName: string
  text: string
  score: number
}

/**
 * Paragraph-aware chunking: pack whole paragraphs up to the size limit;
 * hard-split oversized paragraphs with a character overlap so no sentence
 * is stranded on a boundary.
 */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const chunks: string[] = []
  let current = ''
  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      flush()
      // hard-split with overlap
      for (let start = 0; start < paragraph.length; start += chunkSize - overlap) {
        chunks.push(paragraph.slice(start, start + chunkSize))
        if (start + chunkSize >= paragraph.length) break
      }
      continue
    }
    if (current.length + paragraph.length + 2 > chunkSize) flush()
    current = current ? `${current}\n\n${paragraph}` : paragraph
  }
  flush()
  return chunks
}

const DOCS_KEY = 'marmot.agent.docs.v1'
const CHUNKS_KEY = 'marmot.agent.docchunks.v1'

export class DocumentStore {
  constructor(
    private kv: KVStore,
    private newId: () => string = defaultId,
    private embedder?: Embedder
  ) {}

  private async loadDocs(): Promise<StoredDocument[]> {
    try {
      const raw = await this.kv.getItem(DOCS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private async loadChunks(): Promise<DocChunk[]> {
    try {
      const raw = await this.kv.getItem(CHUNKS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private async saveDocs(docs: StoredDocument[]): Promise<void> {
    await this.kv.setItem(DOCS_KEY, JSON.stringify(docs))
  }

  private async saveChunks(chunks: DocChunk[]): Promise<void> {
    await this.kv.setItem(CHUNKS_KEY, JSON.stringify(chunks))
  }

  async addDocument(name: string, text: string): Promise<StoredDocument> {
    const clean = text.trim()
    if (!clean) throw new Error('That file has no readable text.')
    if (clean.length > MAX_DOC_CHARS) {
      throw new Error(`Document too large (max ${Math.round(MAX_DOC_CHARS / 1000)}k characters).`)
    }
    const pieces = chunkText(clean).slice(0, MAX_CHUNKS_PER_DOC)
    const doc: StoredDocument = {
      id: this.newId(),
      name: name.trim() || 'Untitled',
      addedAt: Date.now(),
      chunkCount: pieces.length,
    }
    const chunks: DocChunk[] = []
    for (let i = 0; i < pieces.length; i++) {
      const chunk: DocChunk = { docId: doc.id, idx: i, text: pieces[i] }
      if (this.embedder) {
        try {
          chunk.embedding = roundVector(await this.embedder.embed(chunk.text))
        } catch {
          // model not loaded — backfilled during retrieval
        }
      }
      chunks.push(chunk)
    }
    await this.saveDocs([...(await this.loadDocs()), doc])
    await this.saveChunks([...(await this.loadChunks()), ...chunks])
    return doc
  }

  async documents(): Promise<StoredDocument[]> {
    return (await this.loadDocs()).sort((a, b) => b.addedAt - a.addedAt)
  }

  async removeDocument(id: string): Promise<void> {
    await this.saveDocs((await this.loadDocs()).filter((d) => d.id !== id))
    await this.saveChunks((await this.loadChunks()).filter((c) => c.docId !== id))
  }

  async retrieve(query: string, k = 3): Promise<DocHit[]> {
    const docs = await this.loadDocs()
    if (docs.length === 0) return []
    const names = new Map(docs.map((d) => [d.id, d.name]))
    const chunks = await this.loadChunks()

    let queryVector: number[] | null = null
    if (this.embedder) {
      try {
        queryVector = await this.embedder.embed(query)
        let backfilled = 0
        for (const c of chunks) {
          if (!c.embedding && backfilled < MAX_BACKFILL_PER_RETRIEVE) {
            try {
              c.embedding = roundVector(await this.embedder.embed(c.text))
              backfilled++
            } catch {
              break
            }
          }
        }
        if (backfilled > 0) await this.saveChunks(chunks)
      } catch {
        queryVector = null
      }
    }

    return chunks
      .map((c) => ({
        docName: names.get(c.docId) ?? 'Unknown',
        text: c.text,
        score:
          queryVector && c.embedding
            ? cosineSimilarity(queryVector, c.embedding)
            : keywordScore01(query, c.text),
      }))
      .filter((h) => h.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
  }
}

function defaultId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
