# Frozen phone-action rubric

Score the calendar action from 0 to 2:

- Shared text becomes a typed event preview with a visible title and time
  range before any permission prompt or write.
- Permission is requested only after the user taps the explicit calendar
  approval action.
- The created event uses the approved preview payload and remains local to the
  phone's calendar; no message, email, or network send is implied.
- After creation, the card exposes Undo and deletes only the event it created.
- Denied permission, no writable calendar, cancellation, and repeated taps
  leave the app in a truthful, recoverable state.

Pass requires 8/10 or better and no criterion scored 0.
