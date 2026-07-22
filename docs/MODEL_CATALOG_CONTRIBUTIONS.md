# Model catalog and device benchmark contributions

The catalog is a product surface, not a leaderboard. A catalog entry tells a
Marmot user what will be downloaded, which license applies, whether a phone
has enough memory, and what the model is useful for. A benchmark report tells
other contributors what happened on one named device. Neither should promise
that every phone will get the same speed or quality.

The source of truth for entries is src/models/catalog.ts. The model shape lives
in src/types.ts. Download lifecycle and paired-projector handling live in
src/lib/downloads.ts; RAM-fit recommendations live in src/lib/deviceMemory.ts.

## Contribution bar

A proposed entry must have:

- A stable direct GGUF URL and a clearly identified source repository.
- The exact model-file byte count, not a rounded display size.
- The exact byte count for every paired projector or other required asset.
- A license that is visible in the source project and permits the documented
  download and use path. Marmot links to source-hosted files; do not relabel
  or rehost a file when its license does not allow that.
- A description of the task the model is good at without fabricated benchmark
  claims or universal performance promises.
- At least one reproducible phone or emulator run when the entry is intended
  for the main catalog. A metadata-only suggestion can start as a Discussion,
  but it is not ready for the catalog.

The existing download manager writes active assets to .gguf.part files and
moves them to their final names only after completion. A paired vision model
must provide both the model and projector metadata. Do not add an entry that
cannot be downloaded and initialized as the shape describes.

## What belongs in the catalog?

The current ModelSpec fields are:

- id: stable lowercase identifier used in local storage and chat state.
- name, family, and params: user-facing identity and parameter count.
- quant: the exact quantization label of the hosted file.
- sizeBytes and url: exact model file size and direct download URL.
- description: short, honest purpose statement.
- license: the actual license label.
- thinking: optional indicator for models that emit reasoning blocks.
- projector: optional URL, exact sizeBytes, and supported modalities such as
  vision.

Keep IDs stable after merge. Changing an ID makes an existing local download
look like a different model. If a hosted file changes, open a discussion
first and explain whether the ID should remain stable or be replaced.

## Workflow for a new or changed entry

### 1. Inspect the current implementation

Read the catalog, ModelSpec, download tests, and RAM-fit tests before editing:

- src/models/catalog.ts
- src/types.ts
- src/lib/downloads.ts
- src/lib/deviceMemory.ts
- src/lib/__tests__/downloads.test.ts
- src/lib/__tests__/multimodalGrounding.test.ts

Confirm whether the model is single-file or needs a projector. Check that the
model's intended memory footprint is compatible with the device evidence you
plan to submit. A model can be technically loadable and still be a poor
default for a low-RAM phone.

### 2. Verify asset metadata

Use the hosting provider's file metadata or a final response header. On
Windows PowerShell, start with:

~~~powershell
$modelUrl = 'https://example.invalid/path/model.gguf'
$head = Invoke-WebRequest -Uri $modelUrl -Method Head
$head.StatusCode
$head.Headers['Content-Length']
~~~

If a redirect or CDN hides the length, inspect every response header:

~~~powershell
curl.exe -sSIL $modelUrl | Select-String 'HTTP/|location:|content-length:'
~~~

Record the final URL and the exact decimal byte count returned for the final
file. If the provider does not return a trustworthy content length, use its
file API or release metadata and explain the method in the contribution. Do
not calculate a byte count from a rounded GB or MB label. For a paired model,
repeat the check for the projector and set total download bytes to the sum of
the two exact values.

Also check:

- The URL is stable and points to the intended GGUF, not an HTML landing page.
- The quantization in the filename matches the quant field.
- A future redirect does not require credentials.
- The model and projector licenses are recorded separately when they differ.
- The source page identifies the model family and parameter count.

### 3. Run a bounded device check

Use the smallest useful test first. The canonical local baseline is the
marmot AVD: Pixel 7 profile, Android 35, x86_64, and WHPX acceleration. A
physical phone is better evidence for production performance; an emulator is
still useful if its exact configuration is recorded.

Start the AVD and build the app as described in CONTRIBUTING.md. Download only
the proposed model and its required projector. Record:

- device model or AVD name and profile;
- Android version/API level, total RAM, architecture, and acceleration;
- Marmot commit SHA and app version;
- model ID, quantization, file sizes, context length, and GPU setting;
- cold versus warm load, load duration, first-token latency if visible, and
  tokens per second;
- exact prompt and a short output observation;
- whether Stop worked, whether navigation left a chat busy, and any crash or
  swap pressure;
- whether the run was in airplane mode or Marmot Flight Mode;
- free disk before and after download.

The current local demo prompt is defined in src/lib/localDemo.ts:

~~~text
What is the capital of France? Answer in one word.
~~~

This is a useful smoke prompt, not a quality benchmark. Add a task-specific
prompt when the model is intended for vision, extraction, translation, or
another capability. For image models, record the image type and dimensions
without attaching a private image.

### 4. Add tests and evidence

For a source change, add or update a focused Jest test. Useful boundaries
already exist in:

- src/lib/__tests__/downloads.test.ts for atomic files, cancellation, resume,
  backgrounding, and paired assets;
- src/lib/__tests__/multimodalGrounding.test.ts for projector size and vision
  initialization;
- src/lib/__tests__/deviceMemory.test.ts for deterministic RAM-fit behavior.

Run the repository gates:

~~~powershell
git diff --check
npm test -- --runInBand
npx tsc --noEmit
$exportDir = Join-Path $env:TEMP ('marmot-android-export-' + [guid]::NewGuid().ToString('N'))
npx expo export --platform android --output-dir $exportDir
~~~

Attach a sanitized report or link to the benchmark issue. Screenshots should
show only the app state needed to support the claim. Log excerpts must be
filtered and reviewed before upload.

### 5. Open a reviewable PR

Keep the catalog edit, focused test, and benchmark evidence together. Explain
any missing physical-device run as a limitation instead of presenting an
emulator result as a phone-wide promise. Do not change the catalog only to
make a display label or marketing statement look better.

## Copy-paste contribution format

Copy this template into a Discussion, model-catalog issue, or PR description.
Replace every example value and write N/A when a field truly does not apply.

~~~markdown
## Model catalog contribution

### Catalog entry

- Name:
- Family / source repository:
- Stable id:
- Parameters:
- Quantization:
- Model URL:
- Projector URL: N/A
- Modalities: text / vision
- Thinking blocks: yes / no / unknown
- Description of intended use:
- License name:
- License URL or source:

### Exact asset verification

- Model content-length (bytes):
- Projector content-length (bytes): N/A
- Combined download bytes:
- Verification method: provider API / final HTTP headers / other
- Verification date:
- Final resolved URL(s):
- SHA256, if the host publishes one:

### Device benchmark

- Marmot commit:
- App version:
- Device or AVD:
- Physical or emulated:
- Android/iOS version and API level:
- Total RAM:
- CPU architecture / acceleration:
- Model file and projector state:
- Context length:
- GPU setting:
- Cold or warm load:
- Load duration:
- First-token latency:
- Tokens per second:
- Prompt:
- Short observed output:
- Stop path tested:
- Navigation-away path tested:
- Free disk before / after:
- Airplane mode or Flight Mode:
- Crashes, swap pressure, or other limitations:

### Evidence and privacy

- Sanitized screenshot paths or links:
- Sanitized log excerpt:
- Personal-data review complete: yes
- Known limitations:
~~~

## Review checklist

Reviewers should be able to answer yes to these questions:

- Does the entry match the current ModelSpec shape?
- Are IDs unique and stable?
- Are all model and projector sizes exact and positive?
- Do the URLs resolve to the intended public files?
- Is the license clear and accurately named?
- Does the description avoid unsupported leaderboard or speed claims?
- Is a paired projector included when the runtime requires one?
- Is the benchmark reproducible and tied to a commit and device?
- Are screenshots and logs scrubbed?
- Does the change preserve explicit approval and local-only behavior?

If any answer is no, keep the proposal in Discussion or request more evidence
before changing the main catalog.
