/**
 * Pure state machine for live voice conversation:
 * idle → listening → thinking → speaking → listening ↺
 * ASR/TTS/LLM are injected, so the loop logic is fully unit-tested; the
 * Voice screen wires the platform pieces.
 */

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface VoiceSessionCallbacks {
  onPhase: (phase: VoicePhase) => void
  onUserText?: (text: string) => void
  onReply?: (text: string) => void
}

export class VoiceSession {
  private phase: VoicePhase = 'idle'
  private stopped = true

  constructor(
    private llmReply: (text: string) => Promise<string>,
    private speak: (text: string) => Promise<void>,
    private callbacks: VoiceSessionCallbacks
  ) {}

  getPhase(): VoicePhase {
    return this.phase
  }

  private setPhase(next: VoicePhase) {
    this.phase = next
    this.callbacks.onPhase(next)
  }

  start(): void {
    this.stopped = false
    this.setPhase('listening')
  }

  stop(): void {
    this.stopped = true
    this.setPhase('idle')
  }

  /** barge-in: caller stops TTS, we return to listening */
  interrupt(): void {
    if (this.phase === 'speaking' && !this.stopped) this.setPhase('listening')
  }

  async handleFinalTranscript(text: string): Promise<void> {
    const clean = text.trim()
    if (this.stopped || this.phase !== 'listening' || !clean) return
    this.callbacks.onUserText?.(clean)
    this.setPhase('thinking')
    let reply: string
    try {
      reply = (await this.llmReply(clean)).trim() || 'Sorry, I came up empty.'
    } catch {
      reply = 'Sorry, something went wrong generating a reply.'
    }
    if (this.stopped) return
    this.callbacks.onReply?.(reply)
    this.setPhase('speaking')
    await this.speak(reply)
    // phase can change concurrently via interrupt()/stop() while we await
    if (!this.stopped && this.getPhase() === 'speaking') this.setPhase('listening')
  }
}

/**
 * Meeting-mode address detection: "marmot, what did we decide about X?"
 * v1 is a fuzzy wake-word match on final transcript segments.
 */
export function detectAddress(segment: string): { addressed: boolean; request: string } {
  const match = segment.match(/\bmarm[oa]tt?\b[,.!:]?\s*(.*)/i)
  if (!match) return { addressed: false, request: '' }
  return { addressed: true, request: match[1].trim() }
}
