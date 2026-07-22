# Verifier adequacy audit

The verifier is frozen before implementation and checks the typed event model,
native permission/write/delete calls, app configuration, and a focused pure
behavior test.

Lazy artifacts that must fail:

1. A calendar-looking card can still write immediately from the chip; the
   verifier requires the explicit approval label and native call boundary.
2. A successful event can be created without recovery; both `createEventAsync`
   and `deleteEventAsync` are required.
3. An untyped date string can look structured while hiding an invalid range; the
   pure test checks the normalized start/end ordering and deterministic title.

Final acceptance requires Android observation of preview, permission, event
creation, and Undo. If the emulator has no writable calendar account, record
that external limitation rather than pretending the action succeeded.
