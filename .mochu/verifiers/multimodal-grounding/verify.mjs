import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  types: path.join(root, 'src', 'types.ts'),
  catalog: path.join(root, 'src', 'models', 'catalog.ts'),
  downloads: path.join(root, 'src', 'lib', 'downloads.ts'),
  engine: path.join(root, 'src', 'lib', 'engine.ts'),
  context: path.join(root, 'src', 'lib', 'attachmentContext.ts'),
  chat: path.join(root, 'src', 'screens', 'ChatScreen.tsx'),
  chip: path.join(root, 'src', 'components', 'AttachmentChip.tsx'),
  tests: path.join(root, 'src', 'lib', '__tests__', 'multimodalGrounding.test.ts'),
}

const failures = []
const source = {}
for (const [key, filename] of Object.entries(files)) {
  if (!fs.existsSync(filename)) {
    failures.push(`${key}: file is missing`)
    source[key] = ''
  } else {
    source[key] = fs.readFileSync(filename, 'utf8')
  }
}

const requirePattern = (key, pattern, label) => {
  if (source[key] && !pattern.test(source[key])) failures.push(`${key}: missing ${label}`)
}

requirePattern('types', /projector|mmproj/i, 'projector asset metadata')
requirePattern('catalog', /SmolVLM-256M|smollm.*vision|mmproj-SmolVLM/i, 'curated small vision model')
requirePattern('catalog', /175[_ ]?\.?MB|190[_ ]?\.?MB|sizeBytes.*projector|projector.*sizeBytes/i, 'model and projector sizes')
requirePattern('downloads', /projectorPath|mmproj|projector/i, 'projector path')
requirePattern('downloads', /\.part/, 'atomic partial-download handling')
requirePattern('downloads', /projector.*(done|move|delete)|(?:move|delete).*projector/is, 'projector completion and cleanup')
requirePattern('engine', /initMultimodal/, 'llama.rn projector initialization')
requirePattern('engine', /ctx_shift.*false|false.*ctx_shift/s, 'context-shift guard for multimodal contexts')
requirePattern('engine', /releaseMultimodal/, 'projector release')
requirePattern('context', /image_url|media_paths/, 'structured image completion content')
requirePattern('context', /attachment\.uri/, 'local image URI passed to the model')
requirePattern('context', /Needs a multimodal model|unsupported/i, 'honest fallback when vision is unavailable')
requirePattern('chat', /buildCompletionMessages/, 'attachment-aware completion history')
requirePattern('chat', /await buildCompletionMessages/, 'awaited structured multimodal history')
requirePattern('chip', /attachmentCapabilityLabel/, 'visible attachment capability state')
requirePattern('tests', /image_url|projector|mmproj/i, 'focused multimodal behavior coverage')

const testArgs = ['jest', 'src/lib/__tests__/multimodalGrounding.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync('npx', testArgs, { cwd: root, encoding: 'utf8' })
if (test.status !== 0) failures.push('multimodal grounding behavior test failed')

if (failures.length) {
  console.error('FAIL multimodal-grounding-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS multimodal-grounding-verifier')
