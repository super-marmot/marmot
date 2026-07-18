import { DocumentStore, chunkText, MAX_DOC_CHARS } from '../documents'
import { searchDocumentsTool } from '../tools'
import { Embedder } from '../semantic'
import { KVStore } from '../types'

function memoryKV(): KVStore {
  const map = new Map<string, string>()
  return {
    async getItem(k) {
      return map.get(k) ?? null
    },
    async setItem(k, v) {
      map.set(k, v)
    },
  }
}

describe('chunkText', () => {
  it('keeps a short document as a single chunk', () => {
    expect(chunkText('one small paragraph')).toEqual(['one small paragraph'])
  })

  it('packs paragraphs up to the size limit and splits at boundaries', () => {
    const para = 'word '.repeat(60).trim() // ~300 chars
    const chunks = chunkText([para, para, para, para].join('\n\n'), 800, 100)
    expect(chunks.length).toBe(2) // 2 paragraphs fit per 800-char chunk
    expect(chunks[0]).toContain('\n\n') // paragraph structure preserved inside a chunk
  })

  it('hard-splits an oversized paragraph with character overlap', () => {
    const long = 'x'.repeat(2000)
    const chunks = chunkText(long, 800, 120)
    expect(chunks.length).toBe(3)
    expect(chunks[0].length).toBe(800)
    // consecutive chunks overlap by 120 chars: step is 680
    expect(chunks[1]).toBe(long.slice(680, 1480))
  })

  it('drops blank paragraphs and normalizes CRLF', () => {
    expect(chunkText('a\r\n\r\n\r\n\r\nb')).toEqual(['a\n\nb'])
  })
})

function tableEmbedder(table: Record<string, number[]>): Embedder {
  return {
    async embed(text) {
      const v = table[text]
      if (!v) throw new Error(`no vector for: ${text.slice(0, 40)}`)
      return v
    },
  }
}

describe('DocumentStore', () => {
  it('adds, lists, and removes documents with their chunks', async () => {
    let id = 0
    const store = new DocumentStore(memoryKV(), () => `d${id++}`)
    const doc = await store.addDocument('notes.md', 'hello world of documents')
    expect(doc.chunkCount).toBe(1)
    expect((await store.documents()).map((d) => d.name)).toEqual(['notes.md'])

    await store.removeDocument(doc.id)
    expect(await store.documents()).toEqual([])
    expect(await store.retrieve('hello')).toEqual([]) // chunks gone too
  })

  it('rejects empty and oversized documents', async () => {
    const store = new DocumentStore(memoryKV())
    await expect(store.addDocument('empty.txt', '   ')).rejects.toThrow('no readable text')
    await expect(store.addDocument('big.txt', 'x'.repeat(MAX_DOC_CHARS + 1))).rejects.toThrow('too large')
  })

  it('retrieves passages by meaning with zero keyword overlap', async () => {
    const FACT = 'the quarterly revenue target is eight million'
    const NOISE = 'x'.repeat(900) // oversized → forced into its own chunks
    const QUERY = 'how much money will the company earn'
    const table: Record<string, number[]> = { [FACT]: [1, 0], [QUERY]: [0.9, 0.1] }
    // the noise paragraph hard-splits into 900-char pieces — map them all to noise-space
    for (let start = 0; ; start += 800 - 120) {
      table['x'.repeat(Math.min(800, 900 - start))] = [0, 1]
      if (start + 800 >= 900) break
    }
    const store = new DocumentStore(memoryKV(), undefined, tableEmbedder(table))
    await store.addDocument('plan.md', `${FACT}\n\n${NOISE}`)
    const hits = await store.retrieve(QUERY)
    expect(hits).toHaveLength(1)
    expect(hits[0].text).toBe(FACT)
    expect(hits[0].docName).toBe('plan.md')
  })

  it('falls back to keyword matching when no embedder exists', async () => {
    const store = new DocumentStore(memoryKV())
    await store.addDocument('guide.txt', 'llama.cpp powers the inference engine')
    const hits = await store.retrieve('which inference engine is used')
    expect(hits).toHaveLength(1)
    expect(hits[0].text).toContain('llama.cpp')
  })
})

describe('searchDocumentsTool', () => {
  it('formats hits with document names and handles empty results', async () => {
    const tool = searchDocumentsTool(async (q) =>
      q === 'found'
        ? [{ docName: 'a.md', text: 'passage  with   spaces', score: 0.9 }]
        : []
    )
    expect(String(await tool.run({ query: 'found' }))).toBe('[a.md] passage with spaces')
    expect(String(await tool.run({ query: 'nothing' }))).toContain('No relevant passages')
    expect(String(await tool.run({}))).toContain('Error: empty query')
  })
})
