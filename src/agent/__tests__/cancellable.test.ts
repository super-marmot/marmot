import { makeCancellableLLM, AgentCancelled } from '../cancellable'
import { AgentLLM } from '../types'

const base: AgentLLM = { async complete() { return 'ok' } }

describe('makeCancellableLLM', () => {
  it('passes through when not cancelled', async () => {
    const llm = makeCancellableLLM(base, () => false)
    expect(await llm.complete([])).toBe('ok')
  })

  it('throws before dispatch when already cancelled', async () => {
    let baseCalled = false
    const spy: AgentLLM = { async complete() { baseCalled = true; return 'ok' } }
    const llm = makeCancellableLLM(spy, () => true)
    await expect(llm.complete([])).rejects.toThrow(AgentCancelled)
    expect(baseCalled).toBe(false)
  })

  it('discards a reply that lands after cancellation', async () => {
    let cancelled = false
    const slow: AgentLLM = {
      async complete() {
        cancelled = true // cancellation happens mid-flight
        return 'late reply'
      },
    }
    const llm = makeCancellableLLM(slow, () => cancelled)
    await expect(llm.complete([])).rejects.toThrow(AgentCancelled)
  })
})
