# Verifier adequacy audit

Lazy artifacts that must fail:

1. A vision badge with no usable model: the verifier requires a catalog model,
   projector metadata, and a focused structured-message test.
2. A base-only download: the verifier requires projector `.part` handling,
   atomic completion, and paired cleanup in the download manager.
3. A filename-only image claim: the verifier requires a local URI in structured
   `image_url` content and an engine projector initialization call.
4. A silent fallback: the verifier requires an explicit unavailable-vision path
   and keeps the attachment chip capability label in the UI.
