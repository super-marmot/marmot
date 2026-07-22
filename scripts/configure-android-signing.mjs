import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.env.MARMOT_PROJECT_ROOT || process.cwd()
const gradlePath = process.argv[2] || path.join(projectRoot, 'android', 'app', 'build.gradle')

if (!fs.existsSync(gradlePath)) {
  throw new Error(`Generated Android project not found: ${gradlePath}`)
}

const original = fs.readFileSync(gradlePath, 'utf8')
const newline = original.includes('\r\n') ? '\r\n' : '\n'
let gradle = original.replace(/\r\n/g, '\n')

const releaseSigningBlock = [
  '    release {',
  '      def releaseStoreFile = project.findProperty("marmotReleaseStoreFile")',
  '      def releaseStorePassword = project.findProperty("marmotReleaseStorePassword")',
  '      def releaseKeyAlias = project.findProperty("marmotReleaseKeyAlias")',
  '      def releaseKeyPassword = project.findProperty("marmotReleaseKeyPassword")',
  '      if (!releaseStoreFile || !releaseStorePassword || !releaseKeyAlias || !releaseKeyPassword) {',
  '        throw new GradleException("Marmot production signing properties are required for release builds")',
  '      }',
  '      storeFile file(releaseStoreFile)',
  '      storePassword releaseStorePassword',
  '      keyAlias releaseKeyAlias',
  '      keyPassword releaseKeyPassword',
  '    }',
].join('\n')

if (!gradle.includes('marmotReleaseStoreFile')) {
  const marker = '\n    }\n    buildTypes {'
  const markerIndex = gradle.indexOf(marker)
  if (markerIndex < 0) throw new Error('Could not locate the generated signingConfigs block')
  gradle = `${gradle.slice(0, markerIndex)}\n${releaseSigningBlock}${gradle.slice(markerIndex)}`
}

const buildTypesIndex = gradle.indexOf('buildTypes {')
if (buildTypesIndex < 0) throw new Error('Could not locate the generated buildTypes block')

const buildTypes = gradle.slice(buildTypesIndex)
const releaseIndex = buildTypes.indexOf('release {')
if (releaseIndex < 0) throw new Error('Could not locate the generated release build type')

const releaseBody = buildTypes.slice(releaseIndex)
if (releaseBody.includes('signingConfig signingConfigs.debug')) {
  const signingIndex = releaseBody.indexOf('signingConfig signingConfigs.debug')
  const before = releaseBody.slice(0, signingIndex)
  const after = releaseBody.slice(signingIndex + 'signingConfig signingConfigs.debug'.length)
  gradle = `${gradle.slice(0, buildTypesIndex + releaseIndex)}${before}signingConfig signingConfigs.release${after}`
} else if (!releaseBody.includes('signingConfig signingConfigs.release')) {
  throw new Error('Release build type is not wired to Marmot production signing')
}

const output = gradle.replace(/\n/g, newline)
if (output !== original) {
  fs.writeFileSync(gradlePath, output)
  console.log(`Configured production Android signing in ${gradlePath}`)
} else {
  console.log(`Production Android signing already configured in ${gradlePath}`)
}
