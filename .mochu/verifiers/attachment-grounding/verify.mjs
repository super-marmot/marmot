import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  context: path.join(root, 'src', 'lib', 'attachmentContext.ts'),
  chat: path.join(root, 'src', 'screens', 'ChatScreen.tsx'),
  chip: path.join(root, 'src', 'components', 'AttachmentChip.tsx'),
  test: path.join(root, 'src', 'lib', '__tests__', 'attachmentContext.test.ts'),
}

const failures = []
const read = (key) => {
  if (!fs.existsSync(files[key])) {
    failures.push(`${key}: file is missing`)
    return ''
  }
  return fs.readFileSync(files[key], 'utf8')
}

const source = Object.fromEntries(Object.keys(files).map((key) => [key, read(key)]))
const requirePattern = (key, pattern, label) => {
  if (source[key] && !pattern.test(source[key])) failures.push(`${key}: missing ${label}`)
}

requirePattern('context', /MAX_ATTACHMENT_CONTEXT_CHARS/, 'bounded attachment context')
requirePattern('context', /new File\(/, 'sandbox file reader')
requirePattern('context', /\.text\(\)/, 'plain-text decoding')
requirePattern('context', /untrusted|not as instructions/i, 'prompt-injection boundary')
requirePattern('context', /application\/pdf|image\//, 'unsupported media capability boundary')
requirePattern('chat', /buildCompletionMessages/, 'attachment-aware completion history')
requirePattern('chat', /await buildCompletionMessages/, 'awaited local attachment grounding')
requirePattern('chat', /onPress=\{\(\) => send\(\)\}/, 'event-safe composer send binding')
requirePattern('chip', /attachmentCapabilityLabel/, 'honest attachment capability label')
requirePattern('test', /truncat|unsupported|untrusted/i, 'focused grounding behavior coverage')

const testArgs = ['jest', 'src/lib/__tests__/attachmentContext.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync('npx', testArgs, { cwd: root, encoding: 'utf8' })
if (test.status !== 0) failures.push('attachmentContext behavior test failed')

if (failures.length) {
  console.error('FAIL attachment-grounding-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS attachment-grounding-verifier')
