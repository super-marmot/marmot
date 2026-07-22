# Store release runbook

Marmot's canonical application identity is:

- GitHub: <https://github.com/stancsz/marmot>
- Android package: `app.marmot.chat`
- iOS bundle identifier: `app.marmot.chat`
- First store-targeted version after the sideload baseline: `0.2.0`

The repository now contains a production release pipeline, but the store
release is **not shipped** until the external accounts and credentials below
are configured and a real internal-track/TestFlight install is verified.

## EAS and store prerequisites

1. Create or select the Expo/EAS project for `stancsz/marmot`. From a local
   checkout with an authenticated Expo account, run `npx eas-cli@21.0.2 init`
   and commit the generated `extra.eas.projectId` in `app.json`.
2. Create the `app.marmot.chat` application record in Google Play Console and
   App Store Connect. The package and bundle identifiers must match the values
   above.
3. Configure EAS-managed Android and iOS credentials with
   `npx eas-cli@21.0.2 credentials`. Use the internal Play track and TestFlight
   first; only promote after installing and testing the signed builds.
4. Create an Expo access token and add it to GitHub as the repository secret
   `EXPO_TOKEN`. The `store-release.yml` workflow intentionally fails closed
   when it is absent.

The workflow can then be started manually or by pushing a `store-v*` tag:

```powershell
npx eas-cli@21.0.2 build --platform all --profile production --auto-submit --non-interactive --wait
```

The Android production profile produces an AAB and uses remote version
auto-increment. Its submit profile targets Google Play production; the iOS
submit profile targets the App Store/TestFlight flow through EAS credentials.

## GitHub APK/AAB release signing

The public GitHub release workflow is separate from EAS submission and creates
both a production-signed APK for the stable sideload URL and a production-
signed AAB. Add these repository secrets before pushing a `v*` tag:

- `MARMOT_ANDROID_KEYSTORE_BASE64`
- `MARMOT_ANDROID_KEYSTORE_PASSWORD`
- `MARMOT_ANDROID_KEY_ALIAS`
- `MARMOT_ANDROID_KEY_PASSWORD`

The workflow validates the keystore alias, injects its properties only into the
ephemeral runner, and fails before Gradle if any value is missing. Never commit
the keystore, passwords, or a decoded signing file. The stable public APK URL
remains <https://github.com/stancsz/marmot/releases/latest/download/marmot.apk>.
The existing `v0.1.0` APK is debug-signed, so a production-signed `0.2.0` APK
cannot update that install in place; uninstall the development build before
installing the production-signed artifact.

## Current gate

The source-controlled configuration is ready for credentialed execution. A
local `eas whoami` check currently reports that no account is authenticated,
and the repository has no `EXPO_TOKEN` or Android signing secrets configured.
Therefore no claim of a shipped Google Play, TestFlight, or App Store build is
made yet. Record the first real internal-track/TestFlight install and the
store URLs in `docs/verification/` when the account gate is cleared.
