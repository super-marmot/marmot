# Frozen first-run demo rubric

Score the model-library-to-chat flow from 0 to 2:

- A user who has just downloaded the recommended model can find one obvious,
  low-risk action that launches a real local demo.
- The demo uses a real content prompt and the normal model engine; it is not a
  canned answer or a fake success state.
- The chat state visibly explains that the response runs on the phone and does
  not require a cloud request or web tool.
- The flow is explicit and reversible: no generation starts just because a
  model finished downloading, and the user can still use the normal composer.
- The experience remains legible while the model loads, streams, errors, or
  has already produced a message.

Pass requires 8/10 or better and no criterion scored 0.
