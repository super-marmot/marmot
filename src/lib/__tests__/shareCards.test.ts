import { actionCardFor } from '../actionCards'
import {
  createApprovedResultShareCard,
  PRIVATE_ATTRIBUTION,
  renderApprovedResultShareCard,
} from '../shareCards'

function approvedCard(content: string) {
  return { ...actionCardFor('summarize', content), status: 'approved' as const }
}

describe('approved result share cards', () => {
  it('gates card generation on an approved action result', () => {
    const preview = actionCardFor('summarize', 'A preview')
    const discarded = { ...preview, status: 'discarded' as const }

    expect(createApprovedResultShareCard(preview, { sourceSummary: 'Pasted notes' })).toBeNull()
    expect(createApprovedResultShareCard(discarded, { sourceSummary: 'Pasted notes' })).toBeNull()

    const card = createApprovedResultShareCard(approvedCard('A final result'), {
      sourceSummary: 'Pasted notes',
    })
    expect(card).toMatchObject({
      version: 1,
      kind: 'approved-result',
      status: 'approved',
      title: 'Summary',
      action: { id: 'summarize', kind: 'summary' },
      sourceSummary: 'Pasted notes',
      result: 'A final result',
    })
  })

  it('adds attribution and only the explicitly supplied public links', () => {
    const card = createApprovedResultShareCard(approvedCard('A final result'), {
      sourceSummary: 'Pasted notes',
      includeAttribution: true,
      installUrl: 'https://marmot.example/install',
      githubUrl: 'https://github.com/stancsz/marmot',
    })

    expect(card?.attribution).toBe(PRIVATE_ATTRIBUTION)
    expect(card?.links).toEqual([
      { label: 'Install Marmot', url: 'https://marmot.example/install' },
      { label: 'Marmot on GitHub', url: 'https://github.com/stancsz/marmot' },
    ])

    const rendered = renderApprovedResultShareCard(card!)
    expect(rendered).toContain(`_${PRIVATE_ATTRIBUTION}_`)
    expect(rendered).toContain('[Install Marmot](https://marmot.example/install)')
    expect(rendered).toContain('[Marmot on GitHub](https://github.com/stancsz/marmot)')

    const privateCard = createApprovedResultShareCard(approvedCard('A final result'), {
      sourceSummary: 'Pasted notes',
      private: true,
      includeAttribution: true,
    })
    expect(privateCard?.attribution).toBeUndefined()
    expect(renderApprovedResultShareCard(privateCard!)).not.toContain(PRIVATE_ATTRIBUTION)
  })

  it('redacts private material and caps the source summary', () => {
    const card = createApprovedResultShareCard(
      approvedCard(
        '<think>Do not share this reasoning or model prompt.</think><system>Private system prompt</system>### Thinking Process\n1. Do not share this implicit reasoning\n### Answer\nParis.\napi_key=sk-test-secret-token'
      ),
      {
        sourceSummary:
          'A very long source summary that should be clipped before forwarding file:///private/photo.png api_key=do-not-share-this-value',
        maxSourceLength: 48,
      }
    )

    expect(card).not.toBeNull()
    expect(card!.sourceSummary.length).toBeLessThanOrEqual(48)
    expect(card!.sourceSummary.endsWith('…')).toBe(true)
    const rendered = renderApprovedResultShareCard(card!)
    expect(rendered).toContain('Paris.')
    expect(rendered).not.toContain('Do not share this reasoning')
    expect(rendered).not.toContain('Private system prompt')
    expect(rendered).not.toContain('Do not share this implicit reasoning')
    expect(rendered).not.toContain('file:///private/photo.png')
    expect(rendered).not.toContain('do-not-share-this-value')
    expect(rendered).toContain('[redacted]')

    const attachmentOnly = createApprovedResultShareCard(approvedCard('Safe result'), {
      sourceSummary: 'file:///private/photo.png',
    })
    expect(attachmentOnly?.sourceSummary).toBe('[private attachment redacted]')
  })

  it('returns stable output without timestamps or source payloads', () => {
    const action = {
      ...approvedCard('Paris.'),
      phoneAction: {
        title: 'Private event',
        notes: 'Private notes',
        startDate: new Date(2026, 6, 22, 12, 0),
        endDate: new Date(2026, 6, 22, 13, 0),
      },
    }
    const options = {
      sourceSummary: 'Question from a shared note',
      includeAttribution: true,
      installUrl: 'https://marmot.example/install',
    }

    const first = createApprovedResultShareCard(action, options)
    const second = createApprovedResultShareCard(action, options)

    expect(first).toEqual(second)
    expect(renderApprovedResultShareCard(first!)).toBe(renderApprovedResultShareCard(second!))
    expect(first?.calendar).toMatchObject({
      title: 'Private event',
      date: '2026-07-22',
      startTime: '12:00 PM',
      endTime: '1:00 PM',
      notes: 'Private notes',
    })
    expect(renderApprovedResultShareCard(first!)).toContain('Event: Private event')
    expect(renderApprovedResultShareCard(first!)).toContain('2026-07-22')
    expect(JSON.stringify(first)).not.toContain('eventId')
  })
})
