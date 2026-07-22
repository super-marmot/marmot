## Summary

<!-- What changed, and why is it useful to Marmot users or contributors? -->

## Contribution lane

- [ ] Share-to-action
- [ ] Model catalog
- [ ] Benchmark report
- [ ] Docs or website
- [ ] Safe Labs
- [ ] Other: <!-- name it -->

## Scope and safety

- [ ] This PR contains only the intended files and does not include generated
      artifacts, screenshots, logs, secrets, or unrelated worktree changes.
- [ ] I preserved Marmot's local-first behavior: no account, backend,
      telemetry, or hidden data collection.
- [ ] Any save, send, calendar, reminder, file, or external-service write is
      previewed and requires explicit user approval before the deterministic
      write path.
- [ ] Any network or Labs behavior is opt-in and fails safely when unavailable.
- [ ] I scrubbed personal data from screenshots, logs, examples, and fixtures.

## Validation

Commands run:

~~~text
# replace or remove lines that do not apply
git diff --check
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform android --output-dir <temporary-output-directory>
~~~

- [ ] Tests passed, or I explained why they were not applicable.
- [ ] Typecheck passed, or I explained why it was not applicable.
- [ ] Android export passed, or I explained why it was not applicable.
- [ ] I ran an Android or iOS runtime check when this change affects native
      modules, navigation, downloads, inference, sharing, voice, or layout.
- [ ] I recorded device, OS/API, RAM, model, and relevant scenario for any
      runtime or benchmark evidence.

## Evidence and review notes

<!-- Add sanitized screenshots, log excerpts, benchmark data, linked design
     Discussion, or known limitations. Do not paste private data. -->

<!-- If this closes an existing issue, use GitHub's closing syntax here. Do
     not invent a ticket number for a candidate task. -->
