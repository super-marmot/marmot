import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const files = {
  chat: path.join(root, 'src', 'screens', 'ChatScreen.tsx'),
  icon: path.join(root, 'src', 'components', 'Icon.tsx'),
  iconButton: path.join(root, 'src', 'components', 'IconButton.tsx'),
  attachButton: path.join(root, 'src', 'components', 'AttachmentButton.tsx'),
  attachChip: path.join(root, 'src', 'components', 'AttachmentChip.tsx'),
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
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

for (const key of ['chat', 'icon', 'iconButton', 'attachButton', 'attachChip']) {
  if (source[key] && emoji.test(source[key])) failures.push(`${key}: emoji remains in a chat control surface`)
}

const requirePattern = (key, pattern, label) => {
  if (source[key] && !pattern.test(source[key])) failures.push(`${key}: missing ${label}`)
}

requirePattern('icon', /SymbolView/, 'platform-native SymbolView rendering')
requirePattern('icon', /ios\s*:/, 'iOS symbol mapping')
requirePattern('icon', /android\s*:/, 'Android symbol mapping')
requirePattern('iconButton', /accessibilityLabel/, 'accessible action label')
requirePattern('iconButton', /width:\s*4[4-9]|minWidth:\s*4[4-9]/, '44pt minimum touch target')
requirePattern('iconButton', /withSpring/, 'spring press feedback')
requirePattern('iconButton', /borderCurve:\s*['"]continuous['"]/, 'continuous corner geometry')
requirePattern('chat', /entering\s*=|layout\s*=|FadeIn|LinearTransition/, 'state transition animation')
requirePattern('chat', /IconButton/, 'shared icon button usage')
requirePattern('attachButton', /IconButton/, 'attachment button using shared primitive')
requirePattern('attachChip', /IconButton|Icon/, 'attachment chip using shared icon primitive')

if (source.chat && /<Text[^>]*>\s*(Send|Stop)\s*<\/Text>/.test(source.chat)) {
  failures.push('chat: send/stop controls still use text-only action buttons')
}

if (failures.length) {
  console.error('FAIL chat-uiux-verifier')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('PASS chat-uiux-verifier')
