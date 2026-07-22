# Candidate good-first-issue tasks

This page is a menu of small, real tasks for new contributors. These are
candidate tasks, not pre-created GitHub tickets. Do not write "I am fixing
issue #N" for one of these unless that issue actually exists. Open a
Discussion or a narrowly scoped issue first, then confirm the current files
and acceptance criteria before starting.

## What makes a good first contribution?

A good first PR changes one behavior or one piece of documentation, names the
files it touches, and includes a focused test or reproducible evidence. It
should be possible to review it without understanding the whole app.

Every task below should also follow the local-first and explicit-approval
rules in CONTRIBUTING.md:

- No accounts, backend calls, telemetry, or hidden network behavior.
- No silent send, save, calendar, reminder, file, or external-service write.
- No secrets or personal data in fixtures, screenshots, logs, or examples.
- Keep model output bounded and keep deterministic parsing and writes in code.

## Candidate tasks

### 1. Add one small Share-to-action transform

Start with:

- src/lib/textActions.ts
- src/lib/__tests__/textActions.test.ts
- optionally src/screens/IngestScreen.tsx if the action needs a new result label

Add one focused transform that fits an existing group such as Understand,
Write, Plan, or Protect. The transform should have a stable ID, a bounded
prompt, and a unit test covering normal and empty or oversized input. If it
creates a phone action, it must return a preview card and wait for explicit
approval.

Acceptance:

- The action appears in the correct group.
- Its prompt includes clipped input and does not invent missing details.
- The full Jest suite passes.
- No network or side effect is introduced.

### 2. Expand action-card approval coverage

Start with:

- src/lib/actionCards.ts
- src/lib/__tests__/actionCards.test.ts
- src/screens/IngestScreen.tsx

Add tests for a current action-card path that is only lightly covered, such
as a calendar preview, a local document-save preview, discard behavior, or an
option-specific result. Keep the test at the pure helper boundary when
possible; do not make a Jest test depend on a real calendar or file system.

Acceptance:

- The test proves preview state, approval requirement, and the final status
  transition that the current UI owns.
- The test makes clear that draft replies are not sent automatically.
- No permission prompt or phone write runs in the unit test.

### 3. Cover a calendar extraction edge case

Start with:

- src/lib/phoneActions.ts
- src/lib/__tests__/phoneActions.test.ts

Add one deterministic case around an already-supported relative date or
explicit time, for example an end-of-day boundary, a one-hour duration, or
input with a notes suffix. Use a fixed timestamp in the test. Do not expand
this task into natural-language date parsing without an agreed design.

Acceptance:

- The title, start time, end time, and notes remain deterministic.
- Ambiguous input does not become an unapproved calendar event.
- The focused test and full Jest suite pass.

### 4. Add model-catalog invariant tests

Start with:

- src/models/catalog.ts
- src/types.ts
- src/lib/__tests__/multimodalGrounding.test.ts
- src/lib/deviceMemory.ts

Add a small test that checks catalog invariants such as unique IDs, positive
model sizes, HTTPS download URLs, valid license text, and a positive projector
size whenever a projector is present. Include the paired SmolVLM total-size
relationship without hard-coding a new model claim.

Acceptance:

- A malformed future catalog entry fails clearly.
- The test remains independent of a live Hugging Face download.
- Existing catalog and multimodal tests continue to pass.

### 5. Submit one reproducible device benchmark

Start with:

- docs/MODEL_CATALOG_CONTRIBUTIONS.md
- .github/ISSUE_TEMPLATE/benchmark_report.yml

Run one catalog model on one physical Android phone or the canonical marmot
AVD. Report the exact app commit, model ID and quantization, device/API/RAM,
cold or warm state, prompt, first-token latency when available, tok/s, stop
behavior, and whether the run was offline. Attach only sanitized evidence.

Acceptance:

- Another contributor could repeat the run from the report.
- Claims are labeled as observations from that device, not universal model
  promises.
- No source change is required unless the report exposes a reproducible bug.

### 6. Add or improve a catalog entry with evidence

Start with:

- src/models/catalog.ts
- src/screens/ModelsScreen.tsx
- docs/MODEL_CATALOG_CONTRIBUTIONS.md

Use the model contribution format to propose a real GGUF entry or a paired
projector. Verify direct URLs, exact byte sizes, license terms, and phone
behavior before changing the catalog. Avoid leaderboard-only claims and do
not copy a size rounded to MB or GB.

Acceptance:

- The entry satisfies the current ModelSpec shape.
- The download size is exact for every asset and the combined size is correct.
- The license is linked or otherwise verifiable.
- A focused test or benchmark report supports the change.

### 7. Add a pure Labs parser regression test

Start with:

- src/agent/loop.ts
- src/agent/__tests__/loop.test.ts

Choose one existing action or malformed-response case in the agent loop and
add a regression test for it. Keep the test pure: no live web request, MCP
server, repository download, or phone write. If the behavior is ambiguous,
start a Discussion before changing the parser.

Acceptance:

- The test describes the input shape and expected bounded result.
- Malformed or untrusted model text cannot silently become an external write.
- The relevant agent tests and full suite pass.

### 8. Fix one docs or website path/accessibility issue

Start with:

- docs/index.html
- docs/CAPABILITIES.md
- docs/STORE_RELEASE.md
- CONTRIBUTING.md

Fix one broken local link, inaccurate path, missing alt text, or unclear
user-facing instruction. Do not change product claims without checking the
current source behavior. Do not include generated screenshots or build output.

Acceptance:

- The changed local target exists in the checkout.
- The rendered link or accessibility text is easy to verify by inspection.
- git diff --check passes.

## How to propose one

In a new issue or Discussion, name the candidate number, the files you
inspected, the smallest acceptance criteria, and the checks you plan to run.
If the task has become larger than one focused PR, split it before coding.

For a code task, the usual local gate is:

~~~powershell
npm test -- --runInBand
npx tsc --noEmit
$exportDir = Join-Path $env:TEMP ('marmot-android-export-' + [guid]::NewGuid().ToString('N'))
npx expo export --platform android --output-dir $exportDir
~~~

For a docs-only task, run git diff --check and verify every changed relative
link. Use an Android runtime only when the task changes app behavior or when
the contribution is a benchmark report.
