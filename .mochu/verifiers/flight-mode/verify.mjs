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

const navigation = read('src/navigation.ts')
const app = read('App.tsx')
const drawer = read('src/components/ChatHistoryDrawer.tsx')
const chatList = read('src/screens/ChatListScreen.tsx')
const screen = read('src/screens/FlightModeScreen.tsx')
const lib = read('src/lib/flightMode.ts')
const icon = read('src/components/Icon.tsx')
const tests = read('src/lib/__tests__/flightMode.test.ts')

expect(navigation.includes('Flight: undefined'), 'navigation must expose a Flight screen')
expect(app.includes("import FlightModeScreen from './src/screens/FlightModeScreen'"), 'App must register the Flight Mode screen')
expect(app.includes('name="Flight" component={FlightModeScreen}'), 'App must mount FlightModeScreen in the stack')
expect(drawer.includes('onFlightMode: () => void'), 'the navigation drawer needs a Flight Mode callback')
expect(drawer.includes('label="Flight mode"'), 'the drawer needs a clear Flight mode entry')
expect(chatList.includes("navigation.navigate('Flight')"), 'the chat list must route the drawer entry to Flight mode')
expect(icon.includes("| 'flight'"), 'Flight mode needs a semantic icon name')
expect(icon.includes("flight: { ios: 'airplane"), 'Flight mode must use a professional airplane symbol')
expect(lib.includes('export const FLIGHT_ACTIVITIES'), 'Flight mode must expose a bounded activity catalog')
expect((lib.match(/id: '/g) ?? []).length >= 5, 'Flight mode needs at least five useful activities')
expect(screen.includes('Nothing runs in the background'), 'the screen must state the no-background contract')
expect(screen.includes('allowWeb: false'), 'Flight mode must force web access off')
expect(screen.includes('maxTokens: Math.min(settings.maxTokens, 128)'), 'Flight mode generation must be token bounded')
expect(screen.includes('contextLength: Math.min(settings.contextLength, 2048)'), 'Flight mode context must be bounded for battery and memory')
expect(screen.includes('enableThinking: false'), 'Flight mode must disable long reasoning for low latency')
expect(screen.includes('engine.stop()'), 'Flight mode must expose a stop path')
expect(tests.includes('FLIGHT_ACTIVITIES'), 'focused tests must cover the activity catalog')

const jest = spawnSync('npx.cmd', ['jest', '--runInBand', '--silent', 'src/lib/__tests__/flightMode.test.ts'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
})
expect(jest.status === 0, `focused Flight mode tests must pass\n${jest.stdout}\n${jest.stderr}`)

if (failures.length) {
  console.error(`Flight mode verifier failed (${failures.length} checks):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Flight mode verifier passed: bounded offline activities, professional navigation, and focused tests are present.')
