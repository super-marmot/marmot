import type { ActionCard } from './actionCards'

export const SHARE_CARD_VERSION = 1 as const
export const SHARE_CARD_KIND = 'approved-result' as const
export const PRIVATE_ATTRIBUTION = 'Processed privately by Marmot' as const

const DEFAULT_SOURCE_SUMMARY = 'Source summary unavailable'
const DEFAULT_MAX_SOURCE_LENGTH = 280
const DEFAULT_MAX_RESULT_LENGTH = 4_000
const MAX_SOURCE_LENGTH = 600
const MAX_RESULT_LENGTH = 8_000

const PRIVATE_TAGS = ['think', 'thinking', 'analysis', 'reasoning', 'hidden', 'system', 'developer', 'prompt']
const PRIVATE_TAG_PATTERN = PRIVATE_TAGS.join('|')
const HIDDEN_HEADER = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?(?:thinking(?:\s+process)?|analysis|reasoning|chain[- ]of[- ]thought|hidden reasoning|(?:system|developer|model)\s+prompt|prompt|instructions?)(?:\*\*|__)?(?:\s*:)?(?:\s+.*)?$/i
const ANSWER_HEADER = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?(?:answer|result|final|output)(?:\*\*|__)?\s*:?\s*/i

export interface ShareCardOptions {
  /** A short, user-visible description of what the approved result came from. */
  sourceSummary?: string
  /** Suppresses the optional attribution when true, even if it is requested. */
  private?: boolean
  /** Adds “Processed privately by Marmot” when true and the card is not private. */
  includeAttribution?: boolean
  /** An HTTPS install URL to include in the forwardable card. */
  installUrl?: string
  /** An HTTPS GitHub URL to include in the forwardable card. */
  githubUrl?: string
  /** Caps the source summary after sanitization. */
  maxSourceLength?: number
  /** Caps the result after sanitization to keep forwarding compact. */
  maxResultLength?: number
}

export interface ShareCardLink {
  label: 'Install Marmot' | 'Marmot on GitHub'
  url: string
}

/**
 * Safe, serializable representation of an approved result.
 *
 * This intentionally contains only sanitized text, the resolved details of an
 * approved calendar event, and approved public links. It does not retain the
 * original ActionCard, prompts, attachments, or phone-action event id.
 */
export interface ApprovedResultShareCard {
  version: typeof SHARE_CARD_VERSION
  kind: typeof SHARE_CARD_KIND
  status: 'approved'
  title: string
  action: {
    id: string
    kind: string
  }
  sourceSummary: string
  result: string
  calendar?: {
    title: string
    date: string
    startTime: string
    endTime: string
    notes?: string
  }
  attribution?: typeof PRIVATE_ATTRIBUTION
  links: ShareCardLink[]
}

/**
 * Builds a forwardable card only after an ActionCard has crossed the approval
 * boundary. A null result means the card is still a preview/discarded result,
 * or its approved content contained no shareable text after sanitization.
 */
export function createApprovedResultShareCard(
  actionCard: ActionCard,
  options: ShareCardOptions = {}
): ApprovedResultShareCard | null {
  if (actionCard.status !== 'approved') return null

  const title = sanitizeInlineText(actionCard.title) || 'Marmot result'
  const actionId = sanitizeInlineText(actionCard.sourceAction) || 'approved action'
  const actionKind = sanitizeInlineText(actionCard.kind) || 'result'
  const calendar = actionCard.phoneAction ? calendarShareDetails(actionCard.phoneAction) : undefined
  const result = truncateShareText(
    sanitizeShareText(calendar ? renderCalendarShareResult(calendar) : actionCard.content),
    boundedLength(options.maxResultLength, DEFAULT_MAX_RESULT_LENGTH, MAX_RESULT_LENGTH)
  )
  if (!result) return null
  const sourceSummary = truncateShareText(
    sanitizeInlineText(options.sourceSummary ?? '') || DEFAULT_SOURCE_SUMMARY,
    boundedLength(options.maxSourceLength, DEFAULT_MAX_SOURCE_LENGTH, MAX_SOURCE_LENGTH)
  )

  const links: ShareCardLink[] = []
  const installUrl = safeHttpsUrl(options.installUrl)
  const githubUrl = safeHttpsUrl(options.githubUrl)
  if (installUrl) links.push({ label: 'Install Marmot', url: installUrl })
  if (githubUrl) links.push({ label: 'Marmot on GitHub', url: githubUrl })

  return {
    version: SHARE_CARD_VERSION,
    kind: SHARE_CARD_KIND,
    status: 'approved',
    title,
    action: { id: actionId, kind: actionKind },
    sourceSummary,
    result,
    ...(calendar ? { calendar } : {}),
    ...(options.includeAttribution && !options.private ? { attribution: PRIVATE_ATTRIBUTION } : {}),
    links,
  }
}

/**
 * Renders a share card as deterministic Markdown that also reads well as
 * plain text in the React Native share sheet.
 */
export function renderApprovedResultShareCard(card: ApprovedResultShareCard): string {
  const lines = [
    `# ${escapeMarkdownLabel(card.title)}`,
    '',
    `**Action:** ${escapeMarkdownLabel(card.action.id)} (${escapeMarkdownLabel(card.action.kind)})`,
    `**Source:** ${escapeMarkdownLabel(card.sourceSummary)}`,
    '',
    '## Result',
    '',
    card.result,
  ]

  if (card.attribution) {
    lines.push('', `_${PRIVATE_ATTRIBUTION}_`)
  }

  if (card.links.length > 0) {
    lines.push('', '## Marmot', ...card.links.map((link) => `[${link.label}](${link.url})`))
  }

  return lines.join('\n')
}

/** Alias for callers that want to emphasize the output format. */
export const renderShareCardMarkdown = renderApprovedResultShareCard

/** Alias for share-sheet callers that treat Markdown as text. */
export const renderShareCardText = renderApprovedResultShareCard

function sanitizeInlineText(value: string): string {
  return sanitizeShareText(value).replace(/\s+/g, ' ').trim()
}

function calendarShareDetails(phoneAction: NonNullable<ActionCard['phoneAction']>): NonNullable<ApprovedResultShareCard['calendar']> {
  const notes = sanitizeInlineText(phoneAction.notes)
  return {
    title: sanitizeInlineText(phoneAction.title) || 'Marmot event',
    date: formatShareDate(phoneAction.startDate),
    startTime: formatShareTime(phoneAction.startDate),
    endTime: formatShareTime(phoneAction.endDate),
    ...(notes ? { notes } : {}),
  }
}

function renderCalendarShareResult(calendar: NonNullable<ApprovedResultShareCard['calendar']>): string {
  return [
    `Event: ${calendar.title}`,
    `When: ${calendar.date} ${calendar.startTime}-${calendar.endTime}`,
    ...(calendar.notes ? [`Notes: ${calendar.notes}`] : []),
  ].join('\n')
}

function formatShareDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function formatShareTime(value: Date): string {
  const hour = value.getHours()
  const meridiem = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${String(value.getMinutes()).padStart(2, '0')} ${meridiem}`
}

function sanitizeShareText(value: string): string {
  let sanitized = normalizeText(value)
  sanitized = stripPrivateTaggedSections(sanitized)
  sanitized = stripPrivateReasoningLines(sanitized)
  sanitized = sanitized
    .replace(/\[(?:attachment|image|file)(?:\s*:[^\]]*)?\]/gi, '[private attachment redacted]')
    .replace(/(?:data:[^\s,;]+(?:;[^\s,;]+)*,|(?:file|content|ph):\/\/)[^\s)\]]+/gi, '[private attachment redacted]')
    .replace(/(?:^|[\s(])(?:[A-Za-z]:[\\/]|\\\\)[^\s)\]]+/g, '$1[private path redacted]')
    .replace(/(?:^|[\s(])\/(?:private|storage|var\/mobile|data\/user)\/[^\s)\]]+/gi, '$1[private path redacted]')

  sanitized = sanitized
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/gi, '[redacted]')
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{8,}\b/g, '[redacted]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{8,}\b/gi, '[redacted]')
    .replace(/\bglpat-[A-Za-z0-9_-]{8,}\b/gi, '[redacted]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/=\-]{8,}/gi, 'Bearer [redacted]')
    .replace(
      /(\b(?:api[_ -]?key|access[_ -]?token|authentication|auth|password|secret|token)\b\s*(?::|=|\bis\b)\s*)(["'`]?)[A-Za-z0-9._~+\/=\-]{6,}\2/gi,
      '$1$2[redacted]$2'
    )
    .replace(/([?&](?:api[_-]?key|access[_-]?token|token|secret|password|key)=)[^&#\s)\]]+/gi, '$1[redacted]')
    .replace(
      /((?:["']?(?:system|developer|model)?prompt["']?)\s*[:=]\s*)(["'][^"']*["']|[^\s,}]+)/gi,
      '$1[redacted]'
    )

  return sanitized
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[\u2028\u2029]/g, '\n')
}

function stripPrivateTaggedSections(value: string): string {
  let sanitized = value

  const closingTag = sanitized.match(new RegExp(`</(?:${PRIVATE_TAG_PATTERN})\\s*>`, 'i'))
  const openingTag = sanitized.match(new RegExp(`<(?:${PRIVATE_TAG_PATTERN})(?:\\s[^>]*)?>`, 'i'))
  if (
    closingTag &&
    closingTag.index !== undefined &&
    (!openingTag || openingTag.index === undefined || closingTag.index < openingTag.index)
  ) {
    sanitized = sanitized.slice(closingTag.index + closingTag[0].length)
  }

  for (const tag of PRIVATE_TAGS) {
    sanitized = sanitized
      .replace(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}\\s*>`, 'gi'), '')
      .replace(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*$`, 'gi'), '')
  }

  return sanitized.replace(new RegExp(`</?(?:${PRIVATE_TAG_PATTERN})(?:\\s[^>]*)?>`, 'gi'), '')
}

function stripPrivateReasoningLines(value: string): string {
  const lines = value.split('\n')
  const kept: string[] = []
  let hiding = false

  for (const line of lines) {
    if (HIDDEN_HEADER.test(line)) {
      hiding = true
      continue
    }
    if (hiding && ANSWER_HEADER.test(line)) {
      hiding = false
      kept.push(line.replace(ANSWER_HEADER, '').trim())
      continue
    }
    if (!hiding) kept.push(line)
  }

  return kept.join('\n')
}

function truncateShareText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  if (maxLength <= 1) return '…'

  const candidate = value.slice(0, maxLength - 1).trimEnd()
  const boundary = candidate.lastIndexOf(' ')
  const prefix = boundary > Math.floor(candidate.length * 0.55) ? candidate.slice(0, boundary) : candidate
  return `${prefix.trimEnd()}…`
}

function boundedLength(value: number | undefined, fallback: number, ceiling: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.floor(value), ceiling))
}

function safeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const url = value.trim()
  if (!/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(url)) return undefined
  if (url.includes('@') || /[<>"'`]/.test(url)) return undefined
  if (/[?&](?:api[_-]?key|access[_-]?token|token|secret|password|key)=/i.test(url)) return undefined
  return url
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&')
}
