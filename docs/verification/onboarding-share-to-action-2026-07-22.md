# First-run share-to-action verification

Date: 2026-07-22

## Scope

This pass verifies that the new model-library demo teaches the flagship loop:

`shared message -> local understanding -> proposed phone action -> approval -> undo`

## Device and build

- AVD: `marmot` / Pixel 7 profile / Android 35 / x86_64 / WHPX
- Device: `emulator-5554`
- Device RAM shown in the app: 2.6 GB total, 1.12 GB free
- Model: Qwen3.5 0.8B downloaded; the deterministic calendar transform was used locally
- Runtime: Android debug build installed by `npx expo run:android --no-bundler`, with the current source bundle served by Metro

## Observed path

1. Model Library displayed `Try share-to-action demo` for the ready starter model.
2. The button opened Quick actions with `Team sync tomorrow at 10 AM` prefilled.
3. `Action items` produced `Preview generated locally` and preserved the input text.
4. `Add to calendar` produced a preview for `Team sync`, 7/23/2026, 10:00 AM-11:00 AM, marked `Preview only - Not added`.
5. The approval button produced `Added to calendar`.
6. Undo produced `Removed from calendar`; no test event was left behind.

Evidence:

- [Model Library demo entry](model-library-share-to-action-2026-07-22.png)
- [Local action result and phone actions](share-to-action-phone-actions-2026-07-22.png)
- [Calendar preview before approval](share-to-action-demo-calendar-2026-07-22.png)
- [Approved calendar action](share-to-action-demo-calendar-approved-2-2026-07-22.png)
- [Undo confirmation](share-to-action-demo-calendar-undone-2026-07-22.png)

## Validation

- `npm.cmd test -- --runInBand`: 32 suites, 197 tests passed
- `npx tsc --noEmit`: passed
- `npx expo export --platform android`: passed; Android bundle exported
- `git diff --check`: passed

This verifies the first-run message-to-calendar demo on the canonical emulator. It does not replace physical Android/iPhone benchmark rows or store-release credentials.
