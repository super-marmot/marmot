# Verifier adequacy

This suite is intended to catch release preparation that looks complete in
source control but cannot produce a store-safe artifact or submit it safely.

1. A green result could come from checking only that `eas.json` exists while it
   still asks for a debug-signed APK instead of a production AAB.
2. A green result could come from documenting signing secrets without wiring
   them into the release workflow or failing when they are absent.
3. A green result could come from a build workflow that produces an artifact
   but never invokes EAS submission for both Android and iOS.

The verifier parses the app and EAS configuration, checks the release and
submission workflows for fail-closed commands and artifact types, and runs
Node's syntax checker against the signing configurator.
