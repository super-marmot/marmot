# Frozen UI review rubric

This rubric is fixed before implementation. A runtime reviewer must score each
state from 0 to 2:

- Primary action is obvious without reading instructions; send and stop are
  visually distinct and secondary tools do not compete with them.
- Icons are platform-native, semantically recognizable, consistently weighted,
  and never rendered as emoji; every control exposes an accessible label.
- Controls have a minimum 44pt target, continuous geometry, comfortable spacing,
  and a single restrained palette.
- Empty, loading, streaming, attachment, and agent states transition smoothly
  without a jump, flicker, or permanently visible spinner.
- At normal phone width, the composer remains usable with the keyboard open and
  the attachment filename truncates without pushing send/stop off-screen.

Pass requires 8/10 or better and no criterion scored 0.
