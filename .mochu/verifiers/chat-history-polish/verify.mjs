import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  preview: path.join(root, 'src', 'lib', 'chatPreview.ts'),
  list: path.join(root, 'src', 'screens', 'ChatListScreen.tsx'),
  drawer: path.join(root, 'src', 'components', 'ChatHistoryDrawer.tsx'),
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

requirePattern('preview', /if\s*\(!flattened\)\s*return\s+['"]['"]/, 'empty preview for answer-less messages')
requirePattern('list', /const preview\s*=\s*last\s*\?\s*chatPreview[\s\S]*?\s*:\s*['"]['"]/, 'derived preview value')
requirePattern('list', /\{preview\s*\?\s*\(/, 'conditional preview rendering')
requirePattern('drawer', /const preview\s*=\s*last\s*\?\s*chatPreview[\s\S]*?\s*:\s*['"]No messages yet['"]/, 'derived drawer preview value')
requirePattern('drawer', /\{preview\s*\?\s*\(/, 'conditional drawer preview rendering')
requirePattern('drawer', /backdrop:\s*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.18\)/s, 'lighter navigation scrim')
requirePattern('drawer', /boxShadow:\s*['"]2px 0 12px rgba\(0,\s*0,\s*0,\s*0\.08\)['"]/, 'subtle drawer shadow')
requirePattern('drawer', /newChat:\s*\{[\s\S]*?minHeight:\s*44[\s\S]*?borderWidth:\s*1[\s\S]*?backgroundColor:\s*colors\.surface/s, 'quiet outlined new-chat action')
requirePattern('drawer', /searchBox:[\s\S]*?backgroundColor:\s*colors\.surface/s, 'search field surface')
requirePattern('drawer', /placeholderTextColor=\{colors\.textDim\}/, 'search placeholder contrast')
requirePattern('drawer', /historyPreview:\s*\{\s*color:\s*colors\.textDim/, 'history preview contrast')

if (source.preview && /No visible answer yet/.test(source.preview)) {
  // Keep this absence check separate so an accidental reintroduction of
  // internal model language fails with a specific message.
  failures.push('preview: internal reasoning placeholder is still exposed')
}

if (source.list && /No visible answer yet/.test(source.list)) {
  failures.push('list: internal reasoning placeholder is still exposed')
}

if (source.drawer && /No visible answer yet/.test(source.drawer)) {
  failures.push('drawer: internal reasoning placeholder is still exposed')
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const testArgs = ['jest', 'src/lib/__tests__/chatPreview.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${command} ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync(command, testArgs, {
      cwd: root,
      encoding: 'utf8',
    })
if (test.status !== 0) {
  failures.push(`chatPreview behavior test failed${test.stderr ? `: ${test.stderr.trim()}` : ''}`)
}

if (failures.length) {
  console.error('FAIL chat-history-polish-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS chat-history-polish-verifier')
