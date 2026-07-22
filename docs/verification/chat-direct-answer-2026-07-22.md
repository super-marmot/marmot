# Direct-answer Chat runtime verification — 2026-07-22

## Purpose

This run checks the reliability boundary exposed by the canonical Android
emulator: ordinary Chat must produce a useful answer without spending the
default response budget on visible reasoning text. It does not claim a
cross-device performance result.

## Build and device

| Field | Observation |
| --- | --- |
| Source commit | `66bd408` (`Make default chat answers direct and safe`) |
| App | `app.marmot.chat`, version `0.2.0`, versionCode `2` |
| Build | Android debug APK from `npx expo run:android`; Metro session already listening on port 8081 |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk`, 89,034,552 bytes |
| AVD | `marmot`, Pixel 7 profile, Android 35, Google APIs, `x86_64` |
| Configured RAM | 1,536 MiB |
| GPU | CPU-only (`n_gpu_layers: 0`) |
| Model | `qwen3.5-0.8b`, Q4_K_M, 532,517,120 catalog bytes |
| APK SHA-256 | `5163d83c7ebe17718296ba345ba902d96a22ff2ea3c71b3e7d680714bb522d62` |

## Before the fix

On the same AVD and model, the ordinary Chat path left Qwen3.5 in a long
reasoning phase. After more than 50 seconds of UI polling, no useful answer
had appeared. Pressing Stop returned the composer to idle in an observed
3,875 ms, but the persisted message exposed the model's reasoning transcript
and reported `8.5 tok/s · 613 tok`.

Evidence: [pre-fix stopped output](benchmark-emulator-after-stop-2026-07-22.png)

This was the motivating failure, not a passing benchmark.

## After the fix

Commit `66bd408` makes ordinary Chat pass `enable_thinking: false` to
`llama.rn` and uses `safeChatAnswer` when a stop or token cap leaves only
reasoning. The native forwarding is covered by an engine test; the persistence
behavior is covered by pure thinking tests.

Run details:

- UTC start: `2026-07-22T16:07:44.574Z`
- Prompt as entered: `What is the capital of France`
- First visible answer observed: `Paris`
- First visible observation: `18,368 ms` from Send tap, using 400 ms polling
  and Android UI hierarchy dumps; this includes cold model preparation and is
  intentionally labeled coarse `ui_poll` timing.
- The one-token answer did not expose a `tok/s` statistic in this run, so no
  speed number, median, p95, or steady-generation claim is published here.
- No hidden reasoning text appeared in the direct-answer result.

Evidence:

- [before Send](benchmark-direct-before-send-2026-07-22.png)
- [first visible answer](benchmark-direct-first-visible-2026-07-22.png)
- [completed answer](benchmark-direct-complete-2026-07-22.png)

## Device snapshot after the direct run

These are point-in-time emulator observations, not a battery benchmark:

| Metric | Observation |
| --- | ---: |
| App TOTAL PSS | 1,124,552 KiB |
| App TOTAL RSS | 1,034,068 KiB |
| App TOTAL SwapPss | 182,770 KiB |
| Battery | 100% |
| Emulator temperature | 250 (Android battery units) |
| `/data/user/0` available | 1,098,168 KiB |

## Interpretation and remaining gate

The patch removes the observed reasoning leak and makes a first useful answer
appear on the AVD. It does not establish the required low/mid/high Android or
iPhone matrix, five-run latency distribution, steady tok/s, download timing,
15-minute battery delta, physical-device fit, or iPhone behavior. Those remain
`pending` in [BENCHMARKS.md](../BENCHMARKS.md) until real-device runs capture
the protocol's required fields.
