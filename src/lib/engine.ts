import { initLlama, LlamaContext } from 'llama.rn'
import { Platform } from 'react-native'
import { modelPath } from './downloads'
import { ChatMessage, InferenceSettings, MessageStats, ModelId } from '../types'

export interface CompletionResult {
  text: string
  stats: MessageStats
}

type EngineStatus = 'unloaded' | 'loading' | 'ready' | 'generating'

/**
 * Single global llama.cpp context. Only one model is loaded at a time —
 * phones don't have RAM to spare, so switching models releases the old
 * context first. Load/complete are single-flight: a new call preempts a
 * stale in-flight one (e.g. left running by a screen the user navigated
 * away from) rather than racing the native context or blocking on it.
 */
export interface EngineLoadOptions {
  /** experimental Android GPU offload (OpenCL); iOS always uses Metal */
  gpuAndroid?: boolean
}

class LlamaEngine {
  private context: LlamaContext | null = null
  private loadedModelId: ModelId | null = null
  private loadedContextLength = 0
  private loadedGpuAndroid = false
  private status: EngineStatus = 'unloaded'
  // bumped on every complete() call so a stale request's finally block
  // can never clobber a newer one's status (see preemptStaleGeneration)
  private generation = 0

  getStatus(): EngineStatus {
    return this.status
  }

  getLoadedModelId(): ModelId | null {
    return this.loadedModelId
  }

  /**
   * A screen that navigated away mid-reply (or a new chat started while an
   * old one was still answering) leaves the engine — a global singleton —
   * stuck 'generating', which used to surface as "Model is busy" to an
   * unrelated caller. Kill the stale generation instead of blocking on it.
   */
  private async preemptStaleGeneration(): Promise<void> {
    if (this.status !== 'generating') return
    await this.stop()
    const start = Date.now()
    while (this.status === 'generating' && Date.now() - start < 3000) {
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
  }

  private async releaseContext(): Promise<void> {
    if (!this.context) return
    const ctx = this.context
    const wasGenerating = this.status === 'generating'
    this.context = null
    this.loadedModelId = null
    // never release a context mid-generation — stop first so the native
    // side settles before the memory is freed
    if (wasGenerating) await Promise.resolve(ctx.stopCompletion()).catch(() => {})
    await ctx.release().catch(() => {})
  }

  async ensureLoaded(
    modelId: ModelId,
    contextLength: number,
    options: EngineLoadOptions = {}
  ): Promise<void> {
    const gpuAndroid = options.gpuAndroid ?? false
    await this.preemptStaleGeneration()
    if (
      this.context &&
      this.loadedModelId === modelId &&
      this.loadedContextLength === contextLength &&
      this.loadedGpuAndroid === gpuAndroid
    ) {
      return
    }
    if (this.status === 'loading' || this.status === 'generating') {
      throw new Error('Model is busy — try again in a moment')
    }
    this.status = 'loading'
    try {
      await this.releaseContext()
      const ctx = await initLlama({
        model: modelPath(modelId),
        n_ctx: contextLength,
        n_batch: 512,
        // Metal on iOS always; Android offloads only with the experimental
        // opt-in (OpenCL on supported Adreno chips), else optimized CPU
        n_gpu_layers: Platform.OS === 'ios' || gpuAndroid ? 99 : 0,
        use_mlock: false,
      })
      this.context = ctx
      this.loadedModelId = modelId
      this.loadedContextLength = contextLength
      this.loadedGpuAndroid = gpuAndroid
      this.status = 'ready'
    } catch (e) {
      this.context = null
      this.loadedModelId = null
      this.status = 'unloaded'
      throw e
    }
  }

  async unload(): Promise<void> {
    await this.releaseContext()
    this.status = 'unloaded'
  }

  async complete(
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    settings: InferenceSettings,
    onToken: (token: string) => void,
    options: { enableThinking?: boolean } = {}
  ): Promise<CompletionResult> {
    await this.preemptStaleGeneration()
    const ctx = this.context
    if (!ctx) throw new Error('No model loaded')
    if (this.status !== 'ready') throw new Error('Model is busy — try again in a moment')
    const myGeneration = ++this.generation
    this.status = 'generating'
    try {
      const result = await ctx.completion(
        {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          n_predict: settings.maxTokens,
          temperature: settings.temperature,
          top_p: settings.topP,
          // reasoning templates (Qwen3.5) open a <think> block in the prompt
          // itself; one-shot consumers pass false to get direct answers
          // instead of minutes of think-tokens (found in emulator E2E)
          ...(options.enableThinking === undefined
            ? {}
            : { enable_thinking: options.enableThinking }),
        },
        (data) => {
          if (data.token) onToken(data.token)
        }
      )
      return {
        text: result.text,
        stats: {
          tokensPerSecond: result.timings?.predicted_per_second,
          predictedTokens: result.timings?.predicted_n,
        },
      }
    } finally {
      // only restore 'ready' if our context is still the live one and no
      // newer call has taken over — otherwise a stale call's finally
      // (settling after preemptStaleGeneration killed it) could clobber
      // the status a newer, still-running generation just set
      if (this.context === ctx && this.generation === myGeneration) this.status = 'ready'
    }
  }

  async stop(): Promise<void> {
    if (this.context) {
      await Promise.resolve(this.context.stopCompletion()).catch(() => {})
    }
  }

  /**
   * Embed text with the loaded model, or null when unavailable (no model,
   * busy, or the model doesn't support embeddings). Callers must treat
   * null as "fall back to keyword retrieval".
   */
  async embedText(text: string): Promise<number[] | null> {
    const ctx = this.context
    if (!ctx || this.status !== 'ready') return null
    try {
      const result = await ctx.embedding(text)
      return result.embedding?.length ? result.embedding : null
    } catch {
      return null
    }
  }
}

export const engine = new LlamaEngine()
