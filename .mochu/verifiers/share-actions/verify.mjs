import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  cards: path.join(root, 'src', 'lib', 'actionCards.ts'),
  ingest: path.join(root, 'src', 'screens', 'IngestScreen.tsx'),
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

requirePattern('cards', /export interface ActionCard/, 'typed action-card contract')
requirePattern('cards', /requiresApproval:\s*boolean/, 'approval requirement field')
requirePattern('cards', /status:\s*['"]preview['"]\s*\|\s*['"]approved['"]\s*\|\s*['"]discarded['"]/, 'card lifecycle')
requirePattern('cards', /actionCardFor/, 'transform-to-card mapping')
requirePattern('ingest', /ActionCard/, 'typed card state in the share screen')
requirePattern('ingest', /actionCardFor/, 'generated result converted to a card')
requirePattern('ingest', /Save to documents/, 'explicit save approval action')
requirePattern('ingest', /Not sent/, 'draft safety copy')
requirePattern('ingest', /agentDocuments\.addDocument/, 'local save implementation')
requirePattern('ingest', /actionCard\.kind\s*===\s*['"]save_document['"]/, 'save approval branch')
requirePattern('ingest', /setActionCard\(\{[\s\S]*status:\s*['"]approved['"]/s, 'approved state transition')

const testArgs = ['jest', 'src/lib/__tests__/actionCards.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync('npx', testArgs, { cwd: root, encoding: 'utf8' })
if (test.status !== 0) failures.push('actionCards behavior test failed')

if (failures.length) {
  console.error('FAIL share-actions-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS share-actions-verifier')
