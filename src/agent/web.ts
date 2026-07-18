import { ToolDef } from './types'

/**
 * Web research tools — pure parsers, injected fetchers (tested with
 * fixtures). Registered only when the user enables the "Allow web access"
 * policy switch; with it off the app is provably offline.
 */

export type Fetcher = (url: string) => Promise<string>

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
}

export function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/h[1-6]|\/li|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  for (const [entity, ch] of Object.entries(ENTITIES)) text = text.split(entity).join(ch)
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/** parse DuckDuckGo's HTML endpoint (html.duckduckgo.com/html) */
export function parseDuckDuckGo(html: string, max = 5): SearchResult[] {
  const results: SearchResult[] = []
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRe = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/g
  const snippets: string[] = []
  let m: RegExpExecArray | null
  while ((m = snippetRe.exec(html)) !== null) snippets.push(stripHtml(m[1]))
  let i = 0
  while ((m = linkRe.exec(html)) !== null && results.length < max) {
    let url = m[1]
    // ddg wraps targets in a redirect: //duckduckgo.com/l/?uddg=<encoded>
    const uddg = url.match(/[?&]uddg=([^&]+)/)
    if (uddg) url = decodeURIComponent(uddg[1])
    if (url.startsWith('//')) url = `https:${url}`
    results.push({ title: stripHtml(m[2]), url, snippet: snippets[i] ?? '' })
    i++
  }
  return results
}

export function webSearchTool(fetcher: Fetcher): ToolDef {
  return {
    name: 'web_search',
    description: 'Search the web; returns titles, URLs, and snippets of the top results.',
    args: { query: 'string — the search query' },
    async run(args) {
      const query = String(args.query ?? '').trim()
      if (!query) return 'Error: empty query'
      try {
        const html = await fetcher(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
        )
        const results = parseDuckDuckGo(html)
        if (results.length === 0) return 'No results found.'
        return results
          .map((r, idx) => `${idx + 1}. ${r.title}\n${r.url}\n${r.snippet}`)
          .join('\n\n')
      } catch (e: any) {
        return `Error: search failed (${e?.message ?? 'network'})`
      }
    },
  }
}

export function fetchPageTool(fetcher: Fetcher, maxChars = 3500): ToolDef {
  return {
    name: 'fetch_page',
    description: 'Fetch a web page and return its readable text.',
    args: { url: 'string — an https:// URL, usually from web_search' },
    async run(args) {
      const url = String(args.url ?? '').trim()
      if (!/^https:\/\//i.test(url)) return 'Error: only https:// URLs are allowed'
      try {
        const html = await fetcher(url)
        const text = stripHtml(html)
        if (!text) return 'The page had no readable text.'
        return text.length > maxChars ? `${text.slice(0, maxChars)}…[truncated]` : text
      } catch (e: any) {
        return `Error: fetch failed (${e?.message ?? 'network'})`
      }
    },
  }
}
