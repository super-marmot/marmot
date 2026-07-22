# Attachment grounding verifier

The next local-first share wedge must turn a plain-text attachment into useful
model context without pretending that the current catalog is vision-capable.

Acceptance requires:

- plain-text/Markdown content is read from Marmot's copied app-local file;
- the injected context is bounded and marks the file as untrusted reference
  text, so file contents are not silently promoted to app instructions;
- image/PDF/audio metadata has an honest capability boundary until a compatible
  model projector is shipped;
- ChatScreen awaits the attachment-aware history builder before completion;
- the composer invokes `send()` without passing the native press event as a
  prompt override;
- focused tests cover truncation, unsupported media, and the trust boundary.

This verifier is structural and behavioral. Android evidence is still required
before calling the milestone shipped.
