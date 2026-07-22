# Iteration 8 — multimodal grounding

## Selected gap

`multimodal`: screenshots and receipts are the most shareable remaining local
assistant wedge, but the current catalog is text-only.

## Status

Complete: the paired image model/projector path shipped in iter-8. The
runtime evidence and remaining PDF/audio boundary are recorded in the ledger
and release finish line; this WIP file is retained as the design record.

## Frozen milestone

Package one honest, device-sized vision path end to end:

1. Curate SmolVLM 256M Q8 plus its matching `mmproj` as a paired model asset.
2. Download, resume, atomically finalize, and delete both files as one model.
3. Initialize and release the projector through `llama.rn`.
4. Send image attachments as local structured media only when the loaded model
   reports vision support; retain the existing text and unsupported fallbacks.
5. Verify with focused tests and an Android DocumentsUI image-grounding run.

## Explicit non-goals

- no cloud/provider fallback;
- no claim that every imported `.gguf` understands images;
- no PDF OCR promise until a real PDF-to-image path is tested;
- no large 4B vision model on the 1.5 GB canonical emulator.

## Runtime gate

The Android runtime gate passed in iter-8: the paired model and projector were
downloaded, a real local image was selected, and llama.rn returned a grounded
answer in chat. PDF/audio decoding and typed vision-to-action extraction are
separate open milestones.
