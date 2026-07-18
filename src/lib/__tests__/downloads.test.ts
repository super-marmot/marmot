/**
 * DownloadManager state-machine tests with mocked expo-file-system and
 * AsyncStorage — covers the crash/cancel/race handling that only lived in
 * code review until now.
 */

jest.mock('expo-file-system/legacy', () => {
  const state: any = { files: new Map<string, number>(), resumables: [] as any[] }
  class MockResumable {
    url: string
    fileUri: string
    options: any
    callback: any
    resumeData: any
    _resolve?: (v: any) => void
    _reject?: (e: any) => void
    constructor(url: string, fileUri: string, options: any, callback: any, resumeData?: any) {
      this.url = url
      this.fileUri = fileUri
      this.options = options
      this.callback = callback
      this.resumeData = resumeData
      state.resumables.push(this)
    }
    downloadAsync() {
      return new Promise((res, rej) => {
        this._resolve = res
        this._reject = rej
      })
    }
    resumeAsync() {
      return this.downloadAsync()
    }
    async pauseAsync() {
      // matches expo's real behavior: a paused downloadAsync resolves undefined
      this._resolve?.(undefined)
    }
    async cancelAsync() {
      this._reject?.(new Error('cancelled'))
    }
    savable() {
      return { url: this.url, fileUri: this.fileUri, options: this.options, resumeData: 'rd' }
    }
    // test helpers
    finish(status = 200, size = 999) {
      state.files.set(this.fileUri, size)
      this._resolve?.({ status, uri: this.fileUri })
    }
    fail(message = 'network error') {
      this._reject?.(new Error(message))
    }
  }
  return {
    __state: state,
    documentDirectory: 'file:///doc/',
    FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
    makeDirectoryAsync: async () => {},
    getInfoAsync: async (uri: string) =>
      state.files.has(uri) ? { exists: true, size: state.files.get(uri) } : { exists: false },
    deleteAsync: async (uri: string) => {
      state.files.delete(uri)
    },
    moveAsync: async ({ from, to }: { from: string; to: string }) => {
      const size = state.files.get(from)
      state.files.delete(from)
      if (size != null) state.files.set(to, size)
    },
    getFreeDiskStorageAsync: async () => 1e12,
    createDownloadResumable: (url: string, fileUri: string, options: any, callback: any) =>
      new MockResumable(url, fileUri, options, callback),
    DownloadResumable: MockResumable,
  }
})

jest.mock('@react-native-async-storage/async-storage', () => {
  const map = new Map<string, string>()
  return {
    __esModule: true,
    __map: map,
    default: {
      getItem: async (k: string) => map.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        map.set(k, v)
      },
    },
  }
})

const flush = () => new Promise((r) => setTimeout(r, 0))

function fresh() {
  jest.resetModules()
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require('expo-file-system/legacy')
  const storage = require('@react-native-async-storage/async-storage')
  const { downloads, modelPath } = require('../downloads')
  const { CATALOG } = require('../../models/catalog')
  return { fs, storage, downloads, modelPath, id: CATALOG[0].id as string }
}

describe('DownloadManager', () => {
  it('init marks an existing .gguf as done', async () => {
    const { fs, downloads, modelPath, id } = fresh()
    fs.__state.files.set(modelPath(id), 12345)
    await downloads.init()
    expect(downloads.isDownloaded(id)).toBe(true)
    expect(downloads.getStates()[id].progress).toBe(1)
  })

  it('init deletes an orphaned .part that has no resume snapshot', async () => {
    const { fs, downloads, modelPath, id } = fresh()
    const part = `${modelPath(id)}.part`
    fs.__state.files.set(part, 5000)
    await downloads.init()
    expect(fs.__state.files.has(part)).toBe(false)
    expect(downloads.getStates()[id]).toBeUndefined() // honest idle, not fake "paused"
  })

  it('a completed download is moved atomically and marked done', async () => {
    const { fs, downloads, modelPath, id } = fresh()
    await downloads.init()
    const done = downloads.start(id)
    await flush()
    fs.__state.resumables[0].finish(200)
    await done
    expect(downloads.isDownloaded(id)).toBe(true)
    expect(fs.__state.files.has(modelPath(id))).toBe(true)
    expect(fs.__state.files.has(`${modelPath(id)}.part`)).toBe(false)
  })

  it('a network failure surfaces as an error state', async () => {
    const { fs, downloads, id } = fresh()
    await downloads.init()
    const done = downloads.start(id)
    await flush()
    fs.__state.resumables[0].fail('connection lost')
    await done
    expect(downloads.getStates()[id].status).toBe('error')
    expect(downloads.getStates()[id].error).toContain('connection lost')
  })

  it('cancel ends idle, not error, despite the rejected download promise', async () => {
    const { downloads, id } = fresh()
    await downloads.init()
    const done = downloads.start(id)
    await flush()
    await downloads.cancel(id)
    await done
    expect(downloads.getStates()[id].status).toBe('idle')
    expect(downloads.getStates()[id].error).toBeUndefined()
  })

  it('pause persists a resume snapshot and is a no-op without an active task', async () => {
    const { storage, downloads, id } = fresh()
    await downloads.init()
    await downloads.pause(id) // no task yet — must not throw or corrupt state
    expect(downloads.getStates()[id]).toBeUndefined()

    const run = downloads.start(id)
    await flush()
    await downloads.pause(id)
    await run // start() exits via the paused path (downloadAsync resolved undefined)
    expect(downloads.getStates()[id].status).toBe('paused')
    expect(storage.__map.get('marmot.downloads.resume.v1')).toContain('"rd"')
  })

  it('remove during an active download cancels the task and clears everything', async () => {
    const { fs, downloads, modelPath, id } = fresh()
    await downloads.init()
    const done = downloads.start(id)
    await flush()
    await downloads.remove(id)
    await done
    expect(downloads.getStates()[id].status).toBe('idle')
    expect(fs.__state.files.has(modelPath(id))).toBe(false)
    expect(fs.__state.files.has(`${modelPath(id)}.part`)).toBe(false)
  })
})
