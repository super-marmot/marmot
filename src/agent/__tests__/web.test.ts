import { fetchPageTool, parseDuckDuckGo, stripHtml, webSearchTool } from '../web'

describe('stripHtml', () => {
  it('removes scripts/styles/tags, decodes entities, keeps line structure', () => {
    const html =
      '<html><script>evil()</script><style>.x{}</style>' +
      '<h1>Title &amp; More</h1><p>Line one&nbsp;&#8212;ish</p><p>Line &quot;two&quot;</p></html>'
    expect(stripHtml(html)).toBe('Title & More\nLine one —ish\nLine "two"')
  })
})

const DDG_FIXTURE = `
<div class="result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fllama&amp;rut=x">Llama.cpp <b>guide</b></a>
  <a class="result__snippet" href="#">Run LLMs locally on any device.</a>
</div>
<div class="result">
  <a rel="nofollow" class="result__a" href="https://direct.example.org/page">Direct result</a>
  <a class="result__snippet" href="#">A second snippet here.</a>
</div>`

describe('parseDuckDuckGo', () => {
  it('extracts titles, resolves uddg redirects, pairs snippets', () => {
    const results = parseDuckDuckGo(DDG_FIXTURE)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      title: 'Llama.cpp guide',
      url: 'https://example.com/llama',
      snippet: 'Run LLMs locally on any device.',
    })
    expect(results[1].url).toBe('https://direct.example.org/page')
  })
  it('returns empty on unrecognized html', () => {
    expect(parseDuckDuckGo('<html>nothing here</html>')).toEqual([])
  })
})

describe('web tools', () => {
  it('web_search formats numbered results and encodes the query', async () => {
    let requested = ''
    const tool = webSearchTool(async (url) => {
      requested = url
      return DDG_FIXTURE
    })
    const out = String(await tool.run({ query: 'local llms & phones' }))
    expect(requested).toContain('q=local%20llms%20%26%20phones')
    expect(out).toContain('1. Llama.cpp guide')
    expect(out).toContain('https://example.com/llama')
  })

  it('web_search surfaces network failure as an observation, not a crash', async () => {
    const tool = webSearchTool(async () => {
      throw new Error('offline')
    })
    expect(String(await tool.run({ query: 'x' }))).toContain('search failed (offline)')
  })

  it('fetch_page enforces https, extracts text, and truncates', async () => {
    const tool = fetchPageTool(async () => `<p>${'word '.repeat(40)}</p>`, 100)
    expect(String(await tool.run({ url: 'http://insecure.com' }))).toContain('only https://')
    const out = String(await tool.run({ url: 'https://ok.com' }))
    expect(out.length).toBeLessThanOrEqual(100 + '…[truncated]'.length)
    expect(out).toContain('…[truncated]')
  })
})
