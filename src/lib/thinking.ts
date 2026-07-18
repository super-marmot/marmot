/**
 * Some models (Qwen3.5, SmolLM3) emit <think>...</think> reasoning before the
 * answer — occasionally more than one block. Split streamed text into the
 * hidden reasoning and the visible answer, tolerating multiple blocks and a
 * still-open trailing block while streaming.
 */
export function splitThinking(text: string): {
  thinking: string
  answer: string
  isThinking: boolean
} {
  let thinking = ''
  let answer = ''
  let rest = text
  let isThinking = false

  for (;;) {
    const open = rest.indexOf('<think>')
    if (open === -1) {
      answer += rest
      break
    }
    answer += rest.slice(0, open)
    const afterOpen = rest.slice(open + 7)
    const close = afterOpen.indexOf('</think>')
    if (close === -1) {
      thinking += afterOpen
      isThinking = true
      break
    }
    thinking += afterOpen.slice(0, close)
    rest = afterOpen.slice(close + 8)
  }

  return { thinking, answer: answer.trim(), isThinking }
}
