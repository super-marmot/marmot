import { LOCAL_DEMO_PROMPT, LOCAL_DEMO_PROOF } from '../localDemo'

describe('first-run local demo', () => {
  it('uses a real, short share-to-action message', () => {
    expect(LOCAL_DEMO_PROMPT).toMatch(/Team sync tomorrow at 10 AM/i)
    expect(LOCAL_DEMO_PROMPT.length).toBeLessThan(100)
  })

  it('states the local and approval boundaries plainly', () => {
    expect(LOCAL_DEMO_PROOF).toMatch(/phone|local-only/i)
    expect(LOCAL_DEMO_PROOF).toMatch(/approve|approval/i)
    expect(LOCAL_DEMO_PROOF).not.toMatch(/guaranteed|always/i)
  })
})
