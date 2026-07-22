/**
 * Engine load-configuration tests: verifies the exact n_gpu_layers each
 * platform/setting combination sends to llama.rn, and the reload semantics
 * when the GPU setting changes.
 */

const platform = { OS: 'android' as 'android' | 'ios' }

jest.mock('react-native', () => ({ Platform: platform }))

const initCalls: any[] = []
jest.mock('llama.rn', () => ({
  initLlama: jest.fn(async (params: any) => {
    initCalls.push(params)
    return {
      completion: jest.fn(),
      stopCompletion: jest.fn(async () => {}),
      release: jest.fn(async () => {}),
      embedding: jest.fn(async () => ({ embedding: [] })),
    }
  }),
}))

jest.mock('../downloads', () => ({
  modelPath: (id: string) => `file:///models/${id}.gguf`,
}))

function fresh() {
  jest.resetModules()
  initCalls.length = 0
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { engine } = require('../engine')
  return engine
}

describe('LlamaEngine load configuration', () => {
  it('Android without the toggle stays on CPU (n_gpu_layers 0)', async () => {
    platform.OS = 'android'
    const engine = fresh()
    await engine.ensureLoaded('m1', 4096)
    expect(initCalls[0].n_gpu_layers).toBe(0)
    expect(initCalls[0].model).toBe('file:///models/m1.gguf')
    expect(initCalls[0].n_ctx).toBe(4096)
  })

  it('Android with the experimental toggle offloads (n_gpu_layers 99)', async () => {
    platform.OS = 'android'
    const engine = fresh()
    await engine.ensureLoaded('m1', 4096, { gpuAndroid: true })
    expect(initCalls[0].n_gpu_layers).toBe(99)
  })

  it('iOS always uses Metal regardless of the Android toggle', async () => {
    platform.OS = 'ios'
    const engine = fresh()
    await engine.ensureLoaded('m1', 4096, { gpuAndroid: false })
    expect(initCalls[0].n_gpu_layers).toBe(99)
  })

  it('flipping the GPU setting reloads the model; same config does not', async () => {
    platform.OS = 'android'
    const engine = fresh()
    await engine.ensureLoaded('m1', 4096)
    await engine.ensureLoaded('m1', 4096) // identical — no reload
    expect(initCalls).toHaveLength(1)
    await engine.ensureLoaded('m1', 4096, { gpuAndroid: true }) // changed — reload
    expect(initCalls).toHaveLength(2)
    expect(initCalls[1].n_gpu_layers).toBe(99)
  })

  it('context-length changes also trigger a reload', async () => {
    platform.OS = 'android'
    const engine = fresh()
    await engine.ensureLoaded('m1', 2048)
    await engine.ensureLoaded('m1', 8192)
    expect(initCalls).toHaveLength(2)
    expect(initCalls[1].n_ctx).toBe(8192)
  })

  it('forwards direct-answer mode to llama.rn', async () => {
    platform.OS = 'android'
    jest.resetModules()
    initCalls.length = 0
    const completionCalls: any[] = []
    jest.doMock('llama.rn', () => ({
      initLlama: jest.fn(async (params: any) => {
        initCalls.push(params)
        return {
          completion: jest.fn(async (request: any) => {
            completionCalls.push(request)
            return { text: 'Paris.', timings: {} }
          }),
          stopCompletion: jest.fn(async () => {}),
          release: jest.fn(async () => {}),
          embedding: jest.fn(async () => ({ embedding: [] })),
        }
      }),
    }))
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { engine } = require('../engine')
    await engine.ensureLoaded('m1', 4096)
    await engine.complete(
      [{ role: 'user', content: 'What is the capital of France?' }],
      settings,
      () => {},
      { enableThinking: false }
    )
    expect(completionCalls[0].enable_thinking).toBe(false)
  })
})

const settings: any = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 128,
  contextLength: 4096,
  systemPrompt: '',
  verifyAnswers: false,
  gpuAndroid: false,
  allowWeb: false,
}

describe('LlamaEngine busy preemption', () => {
  it('a new complete() call kills a stale in-flight generation instead of throwing busy', async () => {
    // reproduces: a screen navigates away mid-reply (or a new chat starts)
    // while the previous generation is still running on the shared engine —
    // the new call must proceed, not surface "Model is busy"
    platform.OS = 'android'
    jest.resetModules()
    initCalls.length = 0
    let resolveStale: (v: any) => void = () => {}
    let completionCalls = 0
    jest.doMock('llama.rn', () => ({
      initLlama: jest.fn(async (params: any) => {
        initCalls.push(params)
        return {
          completion: jest.fn(() => {
            completionCalls += 1
            if (completionCalls === 1) {
              return new Promise((resolve) => {
                resolveStale = resolve
              })
            }
            return Promise.resolve({ text: 'fresh answer', timings: {} })
          }),
          stopCompletion: jest.fn(async () => {
            resolveStale({ text: 'stale partial', timings: {} })
          }),
          release: jest.fn(async () => {}),
          embedding: jest.fn(async () => ({ embedding: [] })),
        }
      }),
    }))
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { engine } = require('../engine')
    await engine.ensureLoaded('m1', 4096)

    const stalePromise = engine.complete([{ role: 'user', content: 'hi' }], settings, () => {})
    await Promise.resolve() // let the stale call's ctx.completion() register

    const fresh = await engine.complete(
      [{ role: 'user', content: 'hi again' }],
      settings,
      () => {}
    )
    expect(fresh.text).toBe('fresh answer')
    expect(engine.getStatus()).toBe('ready')

    await stalePromise // the preempted call still settles cleanly
  })

  it('still throws busy if preemption cannot clear the engine in time', async () => {
    platform.OS = 'android'
    jest.resetModules()
    initCalls.length = 0
    jest.doMock('llama.rn', () => ({
      initLlama: jest.fn(async (params: any) => {
        initCalls.push(params)
        return {
          completion: jest.fn(() => new Promise(() => {})), // never resolves
          stopCompletion: jest.fn(async () => {}), // "stops" but never actually unblocks
          release: jest.fn(async () => {}),
          embedding: jest.fn(async () => ({ embedding: [] })),
        }
      }),
    }))
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { engine } = require('../engine')
    await engine.ensureLoaded('m1', 4096)
    engine.complete([{ role: 'user', content: 'hi' }], settings, () => {}) // fire and forget

    await new Promise((resolve) => setTimeout(resolve, 0))
    await expect(
      engine.complete([{ role: 'user', content: 'hi again' }], settings, () => {})
    ).rejects.toThrow('Model is busy')
  }, 10000)
})
