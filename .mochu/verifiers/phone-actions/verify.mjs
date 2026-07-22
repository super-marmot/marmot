import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const files = {
  phone: path.join(root, 'src', 'lib', 'phoneActions.ts'),
  cards: path.join(root, 'src', 'lib', 'actionCards.ts'),
  ingest: path.join(root, 'src', 'screens', 'IngestScreen.tsx'),
  config: path.join(root, 'app.json'),
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

requirePattern('phone', /export interface CalendarEventDraft/, 'typed calendar event draft')
requirePattern('phone', /calendarEventCard/, 'calendar preview constructor')
requirePattern('phone', /startDate|endDate/, 'explicit event time range')
requirePattern('cards', /calendar_event/, 'calendar action-card kind')
requirePattern('cards', /phoneAction/, 'phone action payload on the card')
requirePattern('ingest', /from ['"]expo-calendar['"]/, 'native calendar module')
requirePattern('ingest', /calendarEventCard/, 'calendar preview flow')
requirePattern('ingest', /requestCalendarPermissionsAsync/, 'permission request at approval')
requirePattern('ingest', /createEventAsync/, 'calendar write at approval')
requirePattern('ingest', /deleteEventAsync/, 'undo implementation')
requirePattern('ingest', /Add to calendar/, 'explicit calendar approval action')
requirePattern('ingest', /Undo event/, 'calendar undo action')
requirePattern('config', /"expo-calendar"/, 'calendar native plugin configuration')

const testArgs = ['jest', 'src/lib/__tests__/phoneActions.test.ts', '--runInBand', '--silent']
const test = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd ${testArgs.join(' ')}`], {
      cwd: root,
      encoding: 'utf8',
    })
  : spawnSync('npx', testArgs, { cwd: root, encoding: 'utf8' })
if (test.status !== 0) failures.push('phoneActions behavior test failed')

if (failures.length) {
  console.error('FAIL phone-actions-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS phone-actions-verifier')
