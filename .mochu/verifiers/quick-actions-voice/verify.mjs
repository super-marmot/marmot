import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const read = (file) => {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8')
  } catch {
    return ''
  }
}
const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const screen = read('src/screens/IngestScreen.tsx')
const actions = read('src/lib/textActions.ts')
const actionTests = read('src/lib/__tests__/textActions.test.ts')
const voiceInput = read('src/lib/voiceInput.ts')
const voiceTests = read('src/lib/__tests__/voiceInput.test.ts')
const icon = read('src/components/Icon.tsx')

expect(screen.includes('ExpoSpeechRecognitionModule'), 'Quick actions must use the native speech recognition module')
expect(screen.includes('useSpeechRecognitionEvent'), 'Quick actions must subscribe to speech results')
expect(screen.includes('requestPermissionsAsync'), 'the mic action must request permission before listening')
expect(screen.includes("accessibilityLabel={listening ? 'Stop voice input' : 'Use voice input'}"), 'the voice button needs clear accessible labels')
expect(screen.includes('appendVoiceTranscript'), 'final speech text must be appended into the existing command input')
expect(screen.includes('voicePreview'), 'interim speech should be visible before finalizing')
expect(actions.includes('export const TEXT_ACTION_GROUPS'), 'quick actions must be organized into intent groups')
expect((actions.match(/id: '/g) ?? []).length >= 14, 'quick actions should cover the common understand, write, plan, and protect moments')
expect(actions.includes("label: 'Key facts'"), 'common extraction action is missing')
expect(actions.includes("label: 'Checklist'"), 'common planning action is missing')
expect(actions.includes("label: 'Shorten'"), 'common writing action is missing')
expect(voiceInput.includes('export function appendVoiceTranscript'), 'voice transcript merging needs a pure helper')
expect(actionTests.includes('TEXT_ACTION_GROUPS'), 'focused action tests must cover grouping')
expect(voiceTests.includes('appendVoiceTranscript'), 'focused voice-input tests must cover transcript merging')
expect(icon.includes("mic: { ios: 'mic.fill'"), 'voice input must use the shared professional microphone icon')

const jest = spawnSync('npx.cmd', ['jest', '--runInBand', '--silent', 'src/lib/__tests__/textActions.test.ts', 'src/lib/__tests__/voiceInput.test.ts'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
})
expect(jest.status === 0, `focused quick-action tests must pass\n${jest.stdout}\n${jest.stderr}`)

if (failures.length) {
  console.error(`Quick actions voice verifier failed (${failures.length} checks):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Quick actions voice verifier passed: native mic input, grouped common actions, transcript tests, and professional icon are present.')
