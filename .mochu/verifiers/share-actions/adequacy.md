# Verifier adequacy audit

The verifier is frozen before implementation and checks both the typed card
contract and the screen's approval boundary, plus a focused behavior test.

Lazy artifacts that must fail:

1. A result can look like a card while remaining an untyped string; the
   `ActionCard` lifecycle and mapping checks block that shortcut.
2. A save label can be added while the old chip still writes immediately; the
   verifier requires a save-specific approval branch and approved transition.
3. A draft reply can be generated without a safety boundary; the screen must
   visibly say it was not sent and the runtime rubric checks that no send API is
   invoked.

Final acceptance requires Android observation of a shared-text transform, a
draft reply preview, and the save flow before and after the approval tap.
