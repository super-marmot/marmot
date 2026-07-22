# Contributing to Marmot

Marmot is an open-source, on-device phone assistant. The product promise is:

> Share something -> understand it locally -> propose the next action -> get
> explicit approval -> execute it on the phone.

The canonical repository is `stancsz/marmot`; the older `super-marmot/marmot`
parent is not a publishing target. Marmot has no account system,
backend, telemetry, or hidden cloud write path. Contributions should preserve
that local-first contract and make user approval visible whenever an action
would save, send, create, or change something on the phone.

This guide is the short path from a fresh Windows checkout to a useful,
reviewable contribution.

## The first five minutes on Windows

The commands below use PowerShell. The repository currently targets Expo
SDK 57, React Native 0.86, Node 20 or newer, and TypeScript 6. CI runs on
Node 22 with npm 11. Use Node 22 when you want to match CI exactly.

### 1. Clone and enter the repository

~~~powershell
git clone https://github.com/stancsz/marmot.git
Set-Location .\marmot
git switch -c your-name/short-change
~~~

If you already have a checkout, use its absolute path instead:

~~~powershell
Set-Location C:\path\to\marmot
git status --short --branch
~~~

Do not delete or reset files that you did not create. Check the worktree
before editing so unrelated local screenshots, logs, or experiments stay
untouched.

### 2. Check the toolchain

~~~powershell
node --version
npm --version
java -version
$env:JAVA_HOME
$env:ANDROID_SDK_ROOT
~~~

Node must be 20 or newer. Android development uses JDK 17. If more than one
JDK is installed, set JAVA_HOME to the root of the JDK 17 installation for
the current PowerShell session, then put its bin directory first:

~~~powershell
$env:JAVA_HOME = 'C:\path\to\jdk-17'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
~~~

For checks that do not build native Android code, install dependencies without
running llama.rn's native-artifact download:

~~~powershell
npm install --ignore-scripts --no-audit --no-fund
~~~

For a device build, run npm install normally so llama.rn can install its
native artifacts:

~~~powershell
npm install
~~~

### 3. Run the fast repository checks

These are the same checks that matter for a normal TypeScript/test change:

~~~powershell
npm test -- --runInBand
npx tsc --noEmit
npm run test:benchmark
~~~

The test script is Jest. The runInBand flag makes failures easier to read and
avoids worker overhead on a small development machine.

### 4. Check the Android export

The export verifies that Expo can produce the Android JavaScript bundle. It
does not create an installable APK and does not replace an Android runtime
smoke test. Keep the generated output outside the checkout:

~~~powershell
$exportDir = Join-Path $env:TEMP ('marmot-android-export-' + [guid]::NewGuid().ToString('N'))
npx expo export --platform android --output-dir $exportDir
Get-ChildItem -LiteralPath $exportDir
~~~

The CI equivalent is npx expo export --platform android --output-dir
/tmp/export-test on Ubuntu. A contributor may use a repository-local
dist/android-export-check path if they deliberately want to inspect the
bundle, but do not commit generated output.

### 5. Choose an Android runtime

You have three reasonable options:

1. Use the canonical local AVD named marmot: Pixel 7 profile, Android 35,
   x86_64, with WHPX acceleration.
2. Use another Android 35 emulator or a physical Android device with USB
   debugging. Record the exact device, API level, RAM, and acceleration.
3. Run the test, typecheck, and export checks only for a docs, pure-TypeScript,
   or non-runtime contribution. State that no device run was performed.

Check the SDK tools and the canonical AVD without guessing their paths:

~~~powershell
$adbPath = Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe'
$emulatorPath = Join-Path $env:ANDROID_SDK_ROOT 'emulator\emulator.exe'
& $adbPath version
& $emulatorPath -list-avds
Get-Content "$env:USERPROFILE\.android\avd\marmot.avd\config.ini" |
  Select-String 'hw.device.name|hw.cpu.arch|hw.ramSize|image.sysdir.1'
~~~

Start the canonical AVD, wait for Android to finish booting, and build the
development app:

~~~powershell
& $emulatorPath -avd marmot -no-snapshot -gpu host
& $adbPath wait-for-device
do {
  $boot = (& $adbPath shell getprop sys.boot_completed).Trim()
  if ($boot -ne '1') { Start-Sleep -Seconds 2 }
} until ($boot -eq '1')
npx expo run:android
~~~

For a physical device or an already-running emulator:

~~~powershell
& $adbPath devices
npx expo run:android
& $adbPath shell monkey -p app.marmot.chat 1
~~~

The Android application package is app.marmot.chat. If the app is already
installed and you only need to relaunch it, the final monkey command is
enough. Use ADB for lifecycle, installation, logs, and screenshots; use
user-like interaction for visual assertions.

## Contribution lanes

Start with one lane and keep the first pull request narrow. The paths below
are current code paths, not placeholders:

| Lane | Start here | Good first contribution |
| --- | --- | --- |
| Share-to-action | src/screens/IngestScreen.tsx, src/lib/textActions.ts, src/lib/actionCards.ts, src/lib/phoneActions.ts, src/lib/sharedMedia.ts | Add one bounded action or an edge-case test. Preserve preview -> approval -> write behavior. |
| Model catalog | src/models/catalog.ts, src/types.ts, src/lib/deviceMemory.ts, src/lib/downloads.ts, src/screens/ModelsScreen.tsx | Add a verified entry, improve catalog validation, or improve RAM-fit explanation. Use docs/MODEL_CATALOG_CONTRIBUTIONS.md. |
| Benchmark reports | docs/MODEL_CATALOG_CONTRIBUTIONS.md and the benchmark issue form | Reproduce one model on one device and report enough data for another contributor to compare it. |
| Docs and website | CONTRIBUTING.md, docs/GOOD_FIRST_ISSUES.md, docs/index.html, docs/CAPABILITIES.md, docs/STORE_RELEASE.md | Fix a broken path, clarify a user-facing claim, or improve accessibility without changing product behavior. |
| Safe Labs | src/agent/, src/lib/mcpServers.ts, docs/AGENT.md | Add a bounded local experiment or pure test. Keep network access opt-in and every external or phone write explicit. |

The share-to-action loop is the product center. Broad autonomous behavior,
MCP integrations, web research, repository coding, and live-meeting features
belong in Labs until they have a clear safety boundary and evidence that the
core loop benefits.

## Before you code

1. Read the nearest source and test files before changing them.
2. Search the existing issues and Discussions for duplicate work.
3. For a non-trivial change, open a short issue or design Discussion first.
4. Agree on the smallest acceptance criteria and the validation you will run.
5. Keep deterministic parsing, dates, permissions, and phone writes in code.
   Do not ask a small on-device model to decide whether to silently perform a
   side effect.

### Discussions or issues?

Use GitHub Discussions for questions, setup help, model comparisons, early
ideas, product direction, and designs that still need community feedback:

https://github.com/stancsz/marmot/discussions

Use an issue when there is a reproducible bug, a tightly scoped feature with
acceptance criteria, a model catalog proposal, or a reproducible device
benchmark. A Discussion can become an issue after the shape of the work is
clear. Do not use either channel to paste private conversations, API keys,
unredacted logcat, or a user's personal documents.

## Issue evidence and privacy

A useful bug report lets another contributor reproduce the behavior without
guessing. Include:

- App version or commit SHA.
- Device model, Android/iOS version, API level, total RAM, and whether the
  device is physical or emulated.
- Model ID, quantization, model/projector download state, context length, and
  whether Flight Mode or airplane mode was enabled.
- Exact steps, expected behavior, actual behavior, frequency, and whether it
  is a regression.
- For inference: prompt shape, cold or warm run, first-token latency when
  available, tokens per second, stop behavior, and any memory pressure.
- Sanitized screenshots or a short screen recording when layout or state is
  part of the bug.
- Relevant logs, with the failing action and timestamp called out.

Capture an Android screenshot to a temporary file rather than committing
personal data into the repository:

~~~powershell
$shotPath = Join-Path $env:TEMP 'marmot-report-screen.png'
& $adbPath exec-out screencap -p > $shotPath
~~~

For a focused log excerpt, reproduce once and then save only relevant lines:

~~~powershell
$logPath = Join-Path $env:TEMP 'marmot-report-log.txt'
& $adbPath logcat -d -v threadtime |
  Select-String 'Marmot|ReactNative|AndroidRuntime|llama|Expo' |
  Out-File -LiteralPath $logPath -Encoding utf8
~~~

Manually scrub names, email addresses, phone numbers, notification text,
calendar details, document contents, URLs with private query strings, local
file paths, tokens, and API keys. Review screenshots pixel by pixel. Marmot's
PII eraser is useful for shared text, but it is not a guarantee that every
personal detail has been removed from an issue attachment.

## Pull request gates

Every PR should say which lane it serves, what changed, and what was not
tested. The PR template records the minimum checklist.

For code or configuration changes, run:

~~~powershell
git diff --check
npm test -- --runInBand
npx tsc --noEmit
$exportDir = Join-Path $env:TEMP ('marmot-android-export-' + [guid]::NewGuid().ToString('N'))
npx expo export --platform android --output-dir $exportDir
~~~

Run an Android development build for changes that affect native modules,
navigation, downloads, inference, keyboard/layout behavior, sharing, voice,
or phone actions. Follow the runtime path above and record the device and
scenario. A screenshot is evidence for a visual change, not a substitute for
the relevant test.

For docs-only changes, run git diff --check and the path/link check described
below. Running the full test suite is welcome but not required if no source
or configuration is involved; say so in the PR.

The CI workflow currently runs Node 22, npm 11, npm install with
ignore-scripts/no-audit/no-fund, npx tsc --noEmit, npx jest --ci, and the
Android Expo export. CI does not prove behavior on a physical phone.

### Safety gates

- No backend, account, telemetry, or hidden data collection.
- No secret values in source, commits, issues, screenshots, or logs.
- No automatic send, save, calendar, reminder, file, or external-service
  write. New phone actions must show a preview and require an explicit user
  approval before the deterministic write path.
- Network and Labs capabilities remain opt-in and must fail safely when
  unavailable.
- Do not broaden a contribution into an unrelated refactor.

## Local path and link sanity check

From the repository root, these paths should exist:

~~~powershell
$requiredPaths = @(
  'package.json',
  'package-lock.json',
  'app.json',
  'src\models\catalog.ts',
  'src\lib\textActions.ts',
  'src\screens\IngestScreen.tsx',
  'docs\GOOD_FIRST_ISSUES.md',
  'docs\MODEL_CATALOG_CONTRIBUTIONS.md'
)
$requiredPaths | ForEach-Object {
  [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ }
}
~~~

For Markdown links, check relative targets manually or use a repository link
checker in your editor. Links to GitHub Discussions, Hugging Face, and other
external services are intentionally not treated as local paths. Never hide a
broken local link behind a generated website artifact.

## Commit and review hygiene

Keep commits small enough to review. Use a subject that names the behavior,
for example: docs: add model benchmark contribution workflow. Include test
commands and runtime evidence in the PR description. If a change is blocked
by a missing device, model download, permission, or external service, record
the exact blocker and the checks that did pass.

Do not claim an existing ticket for a task listed in
docs/GOOD_FIRST_ISSUES.md. Those are candidate tasks until a contributor
opens and scopes one.

## Where to continue

- Candidate small tasks: docs/GOOD_FIRST_ISSUES.md
- Model and benchmark workflow: docs/MODEL_CATALOG_CONTRIBUTIONS.md
- Bug evidence: .github/ISSUE_TEMPLATE/bug_report.yml
- Model proposals: .github/ISSUE_TEMPLATE/model_catalog.yml
- Device benchmarks: .github/ISSUE_TEMPLATE/benchmark_report.yml
- Pull request checklist: .github/PULL_REQUEST_TEMPLATE.md

Thank you for helping Marmot stay useful, private, reproducible, and safe.
