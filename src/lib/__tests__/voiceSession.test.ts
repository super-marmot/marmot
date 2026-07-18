import { VoiceSession, VoicePhase, detectAddress } from '../voiceSession'

function harness(reply = 'hello there', llmDelay = 0) {
  const phases: VoicePhase[] = []
  const spoken: string[] = []
  let resolveSpeak: (() => void) | null = null
  const session = new VoiceSession(
    async (text) => {
      if (llmDelay) await new Promise((r) => setTimeout(r, llmDelay))
      if (reply === '__throw__') throw new Error('llm died')
      return reply
    },
    (text) =>
      new Promise<void>((res) => {
        spoken.push(text)
        resolveSpeak = res
      }),
    { onPhase: (p) => phases.push(p) }
  )
  return { session, phases, spoken, finishSpeaking: () => resolveSpeak?.() }
}

describe('VoiceSession', () => {
  it('runs the full listen → think → speak → listen loop', async () => {
    const h = harness()
    h.session.start()
    const turn = h.session.handleFinalTranscript('  hi marmot  ')
    await Promise.resolve()
    h.finishSpeaking()
    await turn
    expect(h.phases).toEqual(['listening', 'thinking', 'speaking', 'listening'])
    expect(h.spoken).toEqual(['hello there'])
  })

  it('ignores empty transcripts and input outside the listening phase', async () => {
    const h = harness()
    h.session.start()
    await h.session.handleFinalTranscript('   ')
    expect(h.phases).toEqual(['listening'])
    expect(h.spoken).toEqual([])
  })

  it('stop() during generation discards the reply and never speaks', async () => {
    const h = harness('late reply', 20)
    h.session.start()
    const turn = h.session.handleFinalTranscript('question')
    h.session.stop()
    await turn
    expect(h.spoken).toEqual([])
    expect(h.session.getPhase()).toBe('idle')
  })

  it('speaks a graceful fallback when the LLM throws', async () => {
    const h = harness('__throw__')
    h.session.start()
    const turn = h.session.handleFinalTranscript('question')
    await Promise.resolve()
    await Promise.resolve()
    h.finishSpeaking()
    await turn
    expect(h.spoken[0]).toContain('something went wrong')
    expect(h.session.getPhase()).toBe('listening')
  })

  it('interrupt() during speaking returns to listening (barge-in)', async () => {
    const h = harness()
    h.session.start()
    const turn = h.session.handleFinalTranscript('question')
    await Promise.resolve()
    await Promise.resolve()
    expect(h.session.getPhase()).toBe('speaking')
    h.session.interrupt()
    expect(h.session.getPhase()).toBe('listening')
    h.finishSpeaking()
    await turn
    // loop does not double-set listening after an interrupt
    expect(h.phases.filter((p) => p === 'listening')).toHaveLength(2)
  })
})

describe('detectAddress', () => {
  it('detects the wake word with punctuation and captures the request', () => {
    expect(detectAddress('Marmot, what did we decide about pricing?')).toEqual({
      addressed: true,
      request: 'what did we decide about pricing?',
    })
    expect(detectAddress('ok marmot summarize this')).toEqual({
      addressed: true,
      request: 'summarize this',
    })
  })
  it('tolerates common ASR mishearings and rejects non-addresses', () => {
    expect(detectAddress('hey marmott help').addressed).toBe(true)
    expect(detectAddress('the marmot is a rodent').addressed).toBe(true) // known v1 limitation
    expect(detectAddress('completely unrelated sentence').addressed).toBe(false)
  })
})
