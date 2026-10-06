const test = require('node:test')
const assert = require('node:assert/strict')
const { renderSummary } = require('./summary.js')

function page(overrides) {
  return {
    url: 'https://acme.test/',
    finalUrl: 'https://acme.test/',
    statusCode: 200,
    redirectHops: 0,
    fetchError: null,
    title: 'Title',
    titleLength: 5,
    metaDescription: null,
    metaLength: null,
    h1Count: 1,
    canonical: null,
    robotsMeta: null,
    indexable: true,
    brokenInternalLinks: [],
    ...overrides
  }
}

function report(pages, extra = {}) {
  return {
    seedUrl: 'https://acme.test/',
    crawledAt: '2026-09-29T00:00:00.000Z',
    maxPages: 100,
    pageCount: pages.length,
    truncated: false,
    robotsIgnored: false,
    robotsBlocked: [],
    summary: { brokenLinks: 0, missingTitles: 0, noindex: 0, redirectChains: 0 },
    pages,
    ...extra
  }
}

const ALL = 'broken-links,missing-titles,noindex,redirect-chains'

test('a clean crawl renders as passed with every count zero and no details blocks', () => {
  const md = renderSummary({ report: report([page({})]), exitCode: 0, url: 'https://acme.test/', failOn: ALL, threshold: '1', stderr: '' })
  assert.match(md, /^## CrawlCove SEO crawl: ✅ passed/)
  assert.match(md, /Crawled \*\*1\*\* page from `https:\/\/acme.test\/`\./)
  assert.match(md, /\| Broken links \| 0 \| yes \|/)
  assert.doesNotMatch(md, /<details>/)
  assert.match(md, /utm_source=github&utm_medium=seo-audit-action/)
})

test('a failed crawl lists the broken links, the broken page, and the gated total', () => {
  const r = report(
    [
      page({ brokenInternalLinks: ['https://acme.test/missing'] }),
      page({ url: 'https://acme.test/missing', finalUrl: 'https://acme.test/missing', statusCode: 404, title: null, titleLength: null, indexable: false })
    ],
    { summary: { brokenLinks: 2, missingTitles: 1, noindex: 0, redirectChains: 0 } }
  )
  const md = renderSummary({ report: r, exitCode: 1, url: 'https://acme.test/', failOn: 'broken-links', threshold: '1', stderr: '' })
  assert.match(md, /^## CrawlCove SEO crawl: ❌ failed/)
  assert.match(md, /The gated checks total \*\*2\*\*, threshold 1\./)
  assert.match(md, /\| Broken links \| 2 \| yes \|/)
  assert.match(md, /\| Missing titles \| 1 \| no \|/)
  assert.match(md, /<details><summary>Broken links \(2\)<\/summary>/)
  assert.match(md, /- `https:\/\/acme.test\/` → `https:\/\/acme.test\/missing`/)
  assert.match(md, /- `https:\/\/acme.test\/missing` — HTTP 404/)
  assert.match(md, /<details><summary>Missing titles \(1\)<\/summary>/)
})

test('fail-on none gates nothing', () => {
  const md = renderSummary({ report: report([page({})]), exitCode: 0, url: 'x', failOn: 'none', threshold: '1', stderr: '' })
  assert.match(md, /\| Broken links \| 0 \| no \|/)
  assert.match(md, /\| Redirect chains \(2\+ hops\) \| 0 \| no \|/)
})

test('robots-blocked URLs are listed and an ignored robots.txt is disclosed', () => {
  const blocked = renderSummary({ report: report([page({})], { robotsBlocked: ['https://acme.test/private'] }), exitCode: 0, url: 'x', failOn: ALL, threshold: '1', stderr: '' })
  assert.match(blocked, /Skipped — robots.txt disallows \(1\)/)
  assert.match(blocked, /- `https:\/\/acme.test\/private`/)
  const ignored = renderSummary({ report: report([page({})], { robotsIgnored: true }), exitCode: 0, url: 'x', failOn: ALL, threshold: '1', stderr: '' })
  assert.match(ignored, /robots.txt was ignored for this crawl/)
})

test('long lists are capped at 25 with a pointer to the JSON report', () => {
  const pages = Array.from({ length: 30 }, (_, i) => page({ url: `https://acme.test/p${i}`, title: null }))
  const md = renderSummary({ report: report(pages, { summary: { brokenLinks: 0, missingTitles: 30, noindex: 0, redirectChains: 0 } }), exitCode: 1, url: 'x', failOn: ALL, threshold: '1', stderr: '' })
  assert.match(md, /Missing titles \(30\)/)
  assert.match(md, /…and 5 more in the JSON report/)
})

test('a missing report renders the could-not-run state with the CLI stderr', () => {
  const md = renderSummary({ report: null, exitCode: 2, url: 'https://acme.test/', failOn: ALL, threshold: '1', stderr: 'crawlcove: robots.txt disallows https://acme.test/ for this crawler.' })
  assert.match(md, /^## CrawlCove SEO crawl: ⚠️ could not run/)
  assert.match(md, /exit code 2/)
  assert.match(md, /robots.txt disallows/)
})
