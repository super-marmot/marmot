import { parseChatExport, mergeChats } from '../importParse'
import { Chat } from '../../types'

function chat(id: string, messageCount: number, updatedAt: number): Chat {
  return {
    id,
    title: `Chat ${id}`,
    modelId: null,
    createdAt: 1,
    updatedAt,
    messages: Array.from({ length: messageCount }, (_, i) => ({
      id: `${id}-m${i}`,
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message ${i}`,
      createdAt: i,
    })),
  }
}

function payload(chats: unknown[], version = 1, app = 'marmot'): string {
  return JSON.stringify({ app, version, exportedAt: 'x', chats })
}

describe('parseChatExport', () => {
  it('parses a valid export round-trip', () => {
    const chats = parseChatExport(payload([chat('a', 2, 100)]))
    expect(chats).toHaveLength(1)
    expect(chats[0].messages).toHaveLength(2)
    expect(chats[0].title).toBe('Chat a')
  })

  it('rejects non-JSON, foreign files, and future versions with friendly errors', () => {
    expect(() => parseChatExport('not json {')).toThrow('not valid JSON')
    expect(() => parseChatExport(payload([chat('a', 1, 1)], 1, 'other-app'))).toThrow('not a Marmot export')
    expect(() => parseChatExport(payload([chat('a', 1, 1)], 99))).toThrow('Unsupported export version')
    expect(() => parseChatExport(JSON.stringify({ app: 'marmot', version: 1 }))).toThrow('No chats found')
  })

  it('drops malformed chats and messages but keeps valid ones', () => {
    const good = chat('good', 1, 1)
    const raw = JSON.stringify({
      app: 'marmot',
      version: 1,
      chats: [
        good,
        { id: 42, messages: [] }, // bad id type
        { id: 'no-messages' }, // missing messages
        {
          id: 'partial',
          title: '',
          messages: [
            { role: 'user', content: 'keep me' },
            { role: 'alien', content: 'drop me' },
            { role: 'assistant', content: 123 },
          ],
        },
      ],
    })
    const chats = parseChatExport(raw)
    expect(chats.map((c) => c.id)).toEqual(['good', 'partial'])
    const partial = chats[1]
    expect(partial.title).toBe('Imported chat') // empty title defaulted
    expect(partial.messages).toHaveLength(1)
    expect(partial.messages[0].content).toBe('keep me')
    expect(partial.messages[0].id).toBeTruthy() // missing id generated
  })

  it('rejects a file with zero valid chats', () => {
    expect(() => parseChatExport(payload([{ id: 1 }]))).toThrow('No valid chats')
  })
})

describe('mergeChats', () => {
  it('adds new, updates richer, skips stale', () => {
    const existing = [chat('keep', 5, 100), chat('shared', 3, 100)]
    const imported = [
      chat('new', 2, 50), // unknown id → added
      chat('shared', 6, 40), // more messages → updated even though older
    ]
    const result = mergeChats(existing, imported)
    expect(result.added).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.chats.find((c) => c.id === 'shared')!.messages).toHaveLength(6)
    expect(result.chats).toHaveLength(3)
  })

  it('a stale backup never clobbers newer local history', () => {
    const existing = [chat('a', 5, 200)]
    const stale = [chat('a', 3, 100)] // fewer messages
    const sameCountOlder = mergeChats(existing, [chat('a', 5, 100)]) // same count, older
    expect(mergeChats(existing, stale).skipped).toBe(1)
    expect(sameCountOlder.skipped).toBe(1)
    expect(sameCountOlder.chats[0].updatedAt).toBe(200)
  })

  it('sorts merged chats by recency', () => {
    const result = mergeChats([chat('old', 1, 10)], [chat('recent', 1, 999)])
    expect(result.chats[0].id).toBe('recent')
  })
})
