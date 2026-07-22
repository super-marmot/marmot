# Multimodal grounding verifier

This iteration closes the highest-ROI open roadmap gap: a user can share a
screenshot or receipt and receive a locally grounded answer when a compatible
vision model is installed.

Acceptance requires:

- the catalog identifies a small, license-visible vision model and its matching
  projector as separate assets with verified sizes;
- both assets download resumably, complete atomically, and are removed together;
- the engine disables context shifting, initializes the projector, exposes the
  loaded vision capability, and releases it with the context;
- image attachments become structured local `image_url` content only when the
  loaded model has vision support;
- text attachments continue to use the existing bounded, untrusted-reference
  path, while an unsupported image remains an honest fallback;
- focused tests exercise the dual-asset contract and the structured image
  message path.

Android evidence is required before calling the milestone shipped: download
the small model and projector, pick a real local image from DocumentsUI, and
verify a correct image-grounded answer without a network provider.
