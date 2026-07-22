# Verifier adequacy audit

The suite is intentionally red before implementation because the shared icon
and button primitives do not exist yet.

Lazy artifacts that must fail:

1. A control row that merely imports an icon component but keeps emoji in the
   actual rendered labels. The no-emoji scan blocks this.
2. A visual-only replacement that uses 24pt icons without a usable touch
   target, or omits accessibility labels. The target and label checks block
   this.
3. A static restyle that has professional icons but no animated state change,
   or leaves Send/Stop as text-only buttons. The Reanimated and transition
   checks block this.

The final acceptance bar is completed by the Android emulator smoke pass: the
composer, empty state, attachment chip, loading/streaming/stop state, and
agent state must be observed after each interaction. This script is a cheap
Tier-0 contract; runtime screenshots are the Tier-1 evidence.
