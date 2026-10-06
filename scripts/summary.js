#!/usr/bin/env node
/**
 * Turns a crawlcove JSON report into the Markdown posted to the job summary and
 * the PR comment, and writes the count outputs to $GITHUB_OUTPUT when set.
 *
 * Usage: node summary.js <report.json> [stderr.txt]
 * Env:   CRAWL_EXIT_CODE, INPUT_URL, INPUT_FAIL_ON, INPUT_THRESHOLD, GITHUB_OUTPUT
 *
 * No dependencies: this runs inside the consumer's workflow, so it must not
 * need an npm install of its own.
 */
const fs = require('node:fs')

const MAX_LISTED = 25
const CRAWLCOVE_URL = 'https://crawlcove.com/?utm_source=github&utm_medium=seo-audit-action'
const CLI_URL = 'https://github.com/CrawlCove/seo-crawler-cli'

/** Build the Markdown for a report. Pure — exported for tests. */
function renderSummary({ report, exitCode, url, failOn, threshold, stderr }) {
  const gating = new Set(
    failOn === 'none' ? [] : String(failOn).split(',').map((s) => s.trim()).filter(Boolean)
  )
  const lines = []

  if (!report) {
    lines.push('## CrawlCove SEO crawl: ⚠️ could not run')
    lines.push('')
    lines.push(`The crawl of ${url ? `\`${url}\`` : 'the start URL'} produced no report (exit code ${exitCode}).`)
    if (stderr && stderr.trim()) {
      lines.push('')
      lines.push('```')
      lines.push(stderr.trim())
      lines.push('```')
    }
    lines.push('')
    lines.push(footer())
    return lines.join('\n')
  }

  const s = report.summary
  const status = exitCode === 0 ? '✅ passed' : exitCode === 1 ? '❌ failed' : '⚠️ could not run'
  lines.push(`## CrawlCove SEO crawl: ${status}`)
  lines.push('')
  lines.push(
    `Crawled **${report.pageCount}** page${report.pageCount === 1 ? '' : 's'} from \`${report.seedUrl}\`` +
      (report.truncated ? ` (stopped at max-pages ${report.maxPages})` : '') +
      '.' +
      (exitCode === 1
        ? ` The gated checks total **${gatedTotal(s, gating)}**, threshold ${threshold}.`
        : '')
  )
  lines.push('')
  lines.push('| Check | Count | Fails the build |')
  lines.push('|---|---:|:---:|')
  lines.push(row('Broken links', s.brokenLinks, gating.has('broken-links')))
  lines.push(row('Missing titles', s.missingTitles, gating.has('missing-titles')))
  lines.push(row('Noindex pages', s.noindex, gating.has('noindex')))
  lines.push(row('Redirect chains (2+ hops)', s.redirectChains, gating.has('redirect-chains')))

  const brokenLinks = []
  for (const p of report.pages) {
    for (const target of p.brokenInternalLinks) brokenLinks.push(`\`${p.url}\` → \`${target}\``)
  }
  const brokenPages = report.pages
    .filter((p) => p.fetchError !== null || (p.statusCode !== null && p.statusCode >= 400))
    .map((p) => `\`${p.url}\` — ${p.fetchError ?? `HTTP ${p.statusCode}`}`)
  const missingTitles = report.pages.filter((p) => !p.title || p.title.trim() === '').map((p) => `\`${p.url}\``)
  const noindex = report.pages
    .filter((p) => p.robotsMeta !== null && /noindex/.test(p.robotsMeta))
    .map((p) => `\`${p.url}\` — \`${p.robotsMeta}\``)
  const chains = report.pages
    .filter((p) => p.redirectHops >= 2)
    .map((p) => `\`${p.url}\` → \`${p.finalUrl}\` (${p.redirectHops} hops)`)

  lines.push(...details('Broken links', [...brokenLinks, ...brokenPages]))
  lines.push(...details('Missing titles', missingTitles))
  lines.push(...details('Noindex pages', noindex))
  lines.push(...details('Redirect chains', chains))

  if (report.robotsIgnored) {
    lines.push('')
    lines.push('_robots.txt was ignored for this crawl (`ignore-robots: true`)._')
  } else if (report.robotsBlocked && report.robotsBlocked.length > 0) {
    lines.push(
      ...details(
        `Skipped — robots.txt disallows (${report.robotsBlocked.length})`,
        report.robotsBlocked.map((u) => `\`${u}\``),
        true
      )
    )
  }

  lines.push('')
  lines.push(footer())
  return lines.join('\n')
}

function gatedTotal(summary, gating) {
  const key = { 'broken-links': 'brokenLinks', 'missing-titles': 'missingTitles', noindex: 'noindex', 'redirect-chains': 'redirectChains' }
  let total = 0
  for (const g of gating) if (key[g]) total += summary[key[g]]
  return total
}

function row(label, count, gates) {
  return `| ${label} | ${count} | ${gates ? 'yes' : 'no'} |`
}

function details(title, items, skipCountInTitle = false) {
  if (items.length === 0) return []
  const shown = items.slice(0, MAX_LISTED)
  const out = ['', `<details><summary>${skipCountInTitle ? title : `${title} (${items.length})`}</summary>`, '']
  for (const item of shown) out.push(`- ${item}`)
  if (items.length > shown.length) out.push(`- …and ${items.length - shown.length} more in the JSON report`)
  out.push('', '</details>')
  return out
}

function footer() {
  return `Open the full report — every page, every finding, fixes ranked — in [CrawlCove](${CRAWLCOVE_URL}). Crawled by [crawlcove-cli](${CLI_URL}).`
}

function writeOutputs(report) {
  const file = process.env.GITHUB_OUTPUT
  if (!file) return
  const s = report ? report.summary : null
  const kv = {
    pages: report ? report.pageCount : 0,
    'broken-links': s ? s.brokenLinks : 0,
    'missing-titles': s ? s.missingTitles : 0,
    noindex: s ? s.noindex : 0,
    'redirect-chains': s ? s.redirectChains : 0
  }
  fs.appendFileSync(file, Object.entries(kv).map(([k, v]) => `${k}=${v}\n`).join(''))
}

function main() {
  const [reportPath, stderrPath] = process.argv.slice(2)
  let report = null
  if (reportPath && fs.existsSync(reportPath)) {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  }
  const stderr = stderrPath && fs.existsSync(stderrPath) ? fs.readFileSync(stderrPath, 'utf8') : ''
  const exitCode = Number(process.env.CRAWL_EXIT_CODE ?? (report ? 0 : 2))
  process.stdout.write(
    renderSummary({
      report,
      exitCode,
      url: process.env.INPUT_URL,
      failOn: process.env.INPUT_FAIL_ON ?? 'broken-links,missing-titles,noindex,redirect-chains',
      threshold: process.env.INPUT_THRESHOLD ?? '1',
      stderr
    }) + '\n'
  )
  writeOutputs(report)
}

module.exports = { renderSummary }
if (require.main === module) main()
