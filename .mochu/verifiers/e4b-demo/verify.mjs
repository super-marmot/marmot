import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  demo: path.join(root, 'src', 'lib', 'localDemo.ts'),
  nav: path.join(root, 'src', 'navigation.ts'),
  models: path.join(root, 'src', 'screens', 'ModelsScreen.tsx'),
  chat: path.join(root, 'src', 'screens', 'ChatScreen.tsx'),
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

requirePattern('demo', /LOCAL_DEMO_PROMPT\s*=\s*['"][^'"]+capital of France/i, 'real-content demo prompt')
requirePattern('demo', /LOCAL_DEMO_PROOF\s*=\s*['"][^'"]*(?:phone|local-only|cloud)/i, 'explicit local-only proof copy')
requirePattern('nav', /Chat:\s*\{[^}]*demo\?:\s*boolean/s, 'demo navigation parameter')
requirePattern('models', /useNavigation/, 'navigation access from the model library')
requirePattern('models', /onDemo/, 'demo callback from the model recommendation')
requirePattern('models', /Try offline demo/, 'offline demo action label')
requirePattern('models', /navigate\(['"]Chat['"],\s*\{\s*demo:\s*true\s*\}\)/, 'demo route navigation')
requirePattern('chat', /LOCAL_DEMO_PROMPT/, 'shared demo prompt usage')
requirePattern('chat', /route\.params\?\.demo\s*===\s*true/, 'demo route state')
requirePattern('chat', /promptOverride\?:\s*string/, 'explicit demo send path')
requirePattern('chat', /LocalDemoCard/, 'first-run demo card')
requirePattern('chat', /onRun=\{\(\)\s*=>\s*send\(LOCAL_DEMO_PROMPT\)\}/, 'real model invocation from demo card')
requirePattern('chat', /LOCAL_DEMO_PROOF/, 'visible local-only proof in chat')

const testArgs = ['jest', 'src/lib/__tests__/localDemo.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync('npx', testArgs, { cwd: root, encoding: 'utf8' })
if (test.status !== 0) failures.push('localDemo behavior test failed')

if (failures.length) {
  console.error('FAIL e4b-demo-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS e4b-demo-verifier')
