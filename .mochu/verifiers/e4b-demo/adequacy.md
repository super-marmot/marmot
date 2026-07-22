# Verifier adequacy audit

The verifier is frozen before implementation and checks the route, shared
demo content, visible local-only copy, explicit action, and a focused behavior
test.

Lazy artifacts that must fail:

1. A model card can display an attractive button that navigates to a generic
   chat without invoking the demo content; the route, prompt, and `send`
   checks require the full chain.
2. A canned "Paris" success message can look like inference; the contract
   requires the normal `send` path and does not permit a prefilled assistant
   result.
3. An automatic side effect can surprise the user after a download; the
   verifier requires a visible action callback and the runtime rubric checks
   that the user initiates it.

Final acceptance requires Android observation after a model is ready: tap
Try offline demo, observe the local-only card, observe loading/streaming, and
verify the resulting assistant message is stored in the chat history.
