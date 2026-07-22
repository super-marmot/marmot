# Changelog

## 0.2.0 preparation - 2026-07-22

- Added production Android APK/AAB signing with fail-closed GitHub secrets.
- Added EAS production configuration for Android app bundles and iOS builds,
  with internal and production submission profiles.
- Added a store-release workflow and documented the Google Play, TestFlight,
  App Store Connect, and EAS credential gates.
- The public release remains sideload-only until a credentialed store build is
  installed and verified.
