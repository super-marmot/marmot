import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const actions = read('src/lib/textActions.ts')
const icons = read('src/components/Icon.tsx')
const ingest = read('src/screens/IngestScreen.tsx')
const cards = read('src/lib/actionCards.ts')
const tests = read('src/lib/__tests__/textActions.test.ts')

expect(actions.includes("id: 'pii_eraser'"), 'text actions must expose a PII eraser action')
expect(actions.includes("label: 'PII eraser'"), 'PII eraser needs a clear action-chip label')
expect(/runLocally\s*:\s*\(text:\s*string\)/.test(actions), 'PII eraser must have a deterministic local execution hook')
expect(/redactPii/.test(actions), 'text actions must export or use a redactPii helper')
expect(actions.includes('[email redacted]'), 'email redaction marker is missing')
expect(actions.includes('[phone redacted]'), 'phone redaction marker is missing')
expect(actions.includes('[URL redacted]'), 'URL redaction marker is missing')
expect(icons.includes("| 'privacy'"), 'the privacy action needs a semantic icon name')
expect(icons.includes("privacy: { ios: 'checkmark.shield'"), 'privacy icon must use a native shield symbol')
expect(ingest.includes("privacy: 'privacy'"), 'IngestScreen must map the privacy action to its semantic icon')
expect(ingest.includes('action.runLocally'), 'IngestScreen must execute local actions without loading a model')
expect(cards.includes("pii_eraser:"), 'PII results need a typed action-card title')
expect(tests.includes("pii_eraser"), 'focused tests must cover the PII action')

const jest = spawnSync('npx.cmd', ['jest', '--runInBand', '--silent', 'src/lib/__tests__/textActions.test.ts'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
})
expect(jest.status === 0, `focused text-action tests must pass\n${jest.stdout}\n${jest.stderr}`)

if (failures.length) {
  console.error(`PII action verifier failed (${failures.length} checks):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PII action verifier passed: local redaction, professional icon, typed card, and focused test are present.')
