import { AgentLLM } from './types'

export class AgentCancelled extends Error {
  constructor() {
    super('Stopped by user')
    this.name = 'AgentCancelled'
  }
}

/**
 * Wrap an LLM so a user-initiated stop aborts the agent loop cleanly:
 * checked before dispatch (don't start a new turn) and after completion
 * (don't act on a reply that arrived after the stop).
 */
export function makeCancellableLLM(base: AgentLLM, isCancelled: () => boolean): AgentLLM {
  return {
    async complete(messages) {
      if (isCancelled()) throw new AgentCancelled()
      const text = await base.complete(messages)
      if (isCancelled()) throw new AgentCancelled()
      return text
    },
  }
}
