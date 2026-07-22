# Store-distribution readiness - 2026-07-22

Repository: `stancsz/marmot`
Target app version: `0.2.0`
Android package / iOS bundle: `app.marmot.chat`

## Source-controlled readiness

- `app.json` carries version `0.2.0`, Android version code `2`, iOS build
  number `2`, and `usesNonExemptEncryption: false`.
- `eas.json` pins the CLI floor at `21.0.2`, uses remote versioning, builds an
  Android AAB for `production`, and defines internal/production submit tracks.
- `.github/workflows/release.yml` decodes a protected Android keystore,
  validates its alias, fails closed when any signing secret is absent, and
  builds both a production APK and AAB.
- `.github/workflows/store-release.yml` pins `eas-cli@21.0.2`, requires
  `EXPO_TOKEN`, and invokes the production Android/iOS build with auto-submit.
- `docs/STORE_RELEASE.md` records EAS project linking, Play Console,
  App Store Connect, TestFlight, and signing-secret setup.

## Local validation

| Check | Result |
| --- | --- |
| Store-distribution verifier | PASS |
| Verifier adequacy audit | PASS |
| Verifier corpus | 11/11 green |
| Jest | 30 suites / 179 tests passed |
| TypeScript | `npx tsc --noEmit` passed |
| Android Expo export | passed; Metro bundle exported to `dist` |
| GitHub workflow YAML parse | both workflows parsed; expected jobs present |
| Android signing configurator | clean Expo prebuild accepted it; second run was idempotent |
| Ship gate | PASS; corpus 11/11 green |

The signing configurator was also inspected against the generated Gradle file:
the release build points to `signingConfigs.release`, while the debug variant
retains `signingConfigs.debug`. A local Gradle signing/build invocation could
not run because this workstation currently has no `JAVA_HOME` or `java` on
`PATH`; the GitHub workflow installs Temurin JDK 17 before Gradle.

## External distribution gate

- `npx eas-cli@21.0.2 --version`: `eas-cli/21.0.2`.
- `npx eas-cli@21.0.2 whoami`: `Not logged in`.
- `npx eas-cli@21.0.2 config -p android -e production --json`: blocked by the
  required Expo account authentication, as expected for an unlinked project.
- GitHub repository secret inventory: empty; no `EXPO_TOKEN` or Android
  signing secrets are configured.
- GitHub releases: only `v0.1.0`, the existing development-signed sideload
  release, is live.

No Google Play, TestFlight, or App Store build is claimed or submitted in this
iteration. The remaining gate is external account setup, credentials, EAS
project linking, and a real internal-track/TestFlight install.
