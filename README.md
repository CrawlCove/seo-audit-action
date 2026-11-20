<a href="https://crawlcove.com/download?utm_source=github&utm_medium=readme&utm_campaign=seo-audit-action"><img src="https://raw.githubusercontent.com/CrawlCove/.github/main/banners/seo-audit-action.svg" width="1200" alt="seo-audit-action: Crawl a staging or preview URL on every pull request. Fails the check on broken links, missing titles, noindex and redirect chains, with the details as a PR comment." /></a>

# seo-audit-action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-CrawlCove%20SEO%20Crawl-2ea44f?logo=github)](https://github.com/marketplace/actions/crawlcove-seo-crawl)

An **SEO audit GitHub Action**: it crawls your staging or preview URL on every pull request and fails the check on SEO regressions (broken internal links, missing titles, an accidental `noindex`, redirect chains), with the details posted as a PR comment.

**See it run:** [seo-test-site's own workflow](https://github.com/CrawlCove/seo-test-site/actions/workflows/seo-audit.yml) audits a public site full of planted SEO problems on every push. Open any run for the job summary.

## Usage

```yaml
- uses: CrawlCove/seo-audit-action@v1
  with:
    url: https://preview-123.example.com/
```

That crawls up to 100 pages, fails the check on the first broken link, missing title, noindex page or 2+-hop redirect chain, and posts (then keeps updating) one comment on the PR. This is the real comment for the [SEO test site](https://github.com/CrawlCove/seo-test-site):

> ## CrawlCove SEO crawl: ❌ failed
>
> Crawled **80** pages from `https://crawlcove.github.io/seo-test-site/`. The gated checks total **4**, threshold 1.
>
> | Check | Count | Fails the build |
> |---|---:|:---:|
> | Broken links | 2 | yes |
> | Missing titles | 1 | yes |
> | Noindex pages | 1 | yes |
> | Redirect chains (2+ hops) | 0 | yes |
>
> <details><summary>Broken links (2)</summary>
>
> - `https://crawlcove.github.io/seo-test-site/blog/broken-links.html` → `https://crawlcove.github.io/seo-test-site/products/discontinued-tins.html` (HTTP 404)
> - `https://crawlcove.github.io/seo-test-site/blog/link-problems.html` → `https://crawlcove.github.io/seo-test-site/blog/htps//www.gov.uk/fire-safety` (HTTP 404)
>
> </details>
>
> <details><summary>Missing titles (1)</summary>
>
> - `https://crawlcove.github.io/seo-test-site/products/salt-marsh.html`
>
> </details>
>
> <details><summary>Noindex pages (1)</summary>
>
> - `https://crawlcove.github.io/seo-test-site/products/archive-sale.html`: `noindex, follow`
>
> </details>
>
> <details><summary>Skipped because robots.txt disallows them (1)</summary>
>
> - `https://crawlcove.github.io/seo-test-site/wholesale/price-list.html`
>
> </details>
>
> See every page, every finding and the fixes ranked in [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=seo-audit-action). Crawled by [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli).

The PR comment needs `permissions: pull-requests: write` on the job; everything else works with the default token. See [`examples/`](examples/) for a Vercel/Netlify preview trigger, a Next.js build crawled inside the job, and a scheduled WordPress staging crawl.

## Inputs

| Input | Default | What it does |
|---|---|---|
| `url` | *(required)* | Where to start crawling. Same-origin links are followed breadth-first. |
| `max-pages` | `100` | Stop after this many pages. |
| `fail-on` | all four | Comma-separated checks that count towards failure: `broken-links`, `missing-titles`, `noindex`, `redirect-chains`. `none` reports without ever failing. |
| `threshold` | `1` | Fail once the selected checks total this many issues. |
| `ignore-robots` | `false` | Crawl URLs robots.txt disallows. For hosts you own, such as a staging site behind `Disallow: /` or a local build. |
| `concurrency` | `4` | Simultaneous requests. Lower it for shared hosting. |
| `timeout` | `15000` | Per-request timeout, ms. |
| `comment` | `true` | Post and update the PR comment (pull_request events only). |
| `github-token` | `${{ github.token }}` | Token for the comment. |
| `cli-version` | `v1.2.0` | Git ref of [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli) to install. |

## Outputs

| Output | Meaning |
|---|---|
| `exit-code` | `0` clean, `1` the gated checks reached the threshold, `2` the crawl could not run (usage error, or robots.txt disallows the start URL; set `ignore-robots` if you own it). |
| `pages` | Pages crawled. |
| `broken-links` | Broken internal links, each counted once: a link to a 4xx/5xx/unreachable page, or a failed page that nothing links to. |
| `missing-titles` | Pages that answered 2xx with no `<title>`. |
| `noindex` | Pages that answered 2xx with a robots `noindex` meta tag. |
| `redirect-chains` | URLs that went through 2 or more redirects (a single redirect is normal and not flagged). |
| `report-path` | Path to the full JSON report, one object per page, with field names shared with [crawlcove-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec). Upload it with `actions/upload-artifact` to keep it. |

Read outputs from a later step with `${{ steps.<id>.outputs.broken-links }}`.

## How it decides

The action installs [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli) and runs `crawlcove crawl <url>`. robots.txt is respected by default (a `User-agent: crawlcove-cli` group is honoured over `*`), so a preview host that blocks all crawlers yields exit code 2 and a "could not run" summary rather than a false pass; use `ignore-robots: 'true'` there. Previews are often deliberately `noindex`; drop `noindex` from `fail-on` in that case rather than turning the check off everywhere.

## Works with CrawlCove

This action is the CI half of [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=seo-audit-action), the desktop SEO crawler. The action catches regressions before they merge; the desktop app gives you the full site audit: every page, every finding, fixes ranked by impact, history over time and Search Console data alongside. Open the same URL there when a check fails and you want the whole picture.

This repo has its own page on crawlcove.com: [Crawl Cove Action](https://crawlcove.com/open-source/crawlcove-action?utm_source=github&utm_medium=seo-audit-action), with the guide to SEO checks in GitHub Actions at [https://crawlcove.com/blog/seo-github-action](https://crawlcove.com/blog/seo-github-action?utm_source=github&utm_medium=seo-audit-action).

## Related tools

<!-- related:start, kept in step by CrawlCove/.github scripts/related.mjs -->
| Repo | What it does |
|---|---|
| [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli) | Crawl a site from a script or CI. Checks status codes, redirect chains, titles, meta descriptions, H1s, canonicals, noindex and broken links, and fails the build on regressions. |
| [seo-mcp-server](https://github.com/CrawlCove/seo-mcp-server) | Crawl a site, list SEO issues, inspect pages and find broken links from inside Claude, Cursor and other AI assistants. |
| [claude-seo-plugin](https://github.com/CrawlCove/claude-seo-plugin) | Seven SEO skills for Claude Code backed by a real site crawl: audits, broken links, redirects, titles and fixes, from a chat. |
| [seo-chrome-extension](https://github.com/CrawlCove/seo-chrome-extension) | On-page SEO checker with an AI visibility report: which AI crawlers can read the page, snippet blocks, llms.txt and extractability. Nothing leaves the browser. |
| [xml-sitemap-validator](https://github.com/CrawlCove/xml-sitemap-validator) | Check a sitemap or sitemap index against the sitemaps.org protocol and search engine limits. Flags bad URLs, lastmod dates and cross-host entries. |
| [robots-txt-tester](https://github.com/CrawlCove/robots-txt-tester) | Fetch and lint a robots.txt, test which URLs each crawler may fetch and see the deciding line. Fails deploys that block the site. |
| [redirect-chain-checker](https://github.com/CrawlCove/redirect-chain-checker) | Follow every hop of a URL's redirects and flag chains, loops, HTTPS downgrades, meta refreshes and redirects to error pages. |
| [hreflang-checker](https://github.com/CrawlCove/hreflang-checker) | Validate the hreflang tags on a page or across a whole XML sitemap, including self-reference, x-default and return tags. |
| [schema-markup-validator](https://github.com/CrawlCove/schema-markup-validator) | Check every schema.org node on a page against the required and recommended properties for rich results. |
| [seo-test-site](https://github.com/CrawlCove/seo-test-site) | A deliberately broken SEO test site with every planted problem and its expected finding listed, for testing any SEO crawler. |
| [seo-crawl-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec) | An open format for site crawl data: JSON Schema and CSV column reference, with a real sample export and a validator script. |
| [seo-crawl-export-js](https://github.com/CrawlCove/seo-crawl-export-js) | Load, query and convert site crawl data in JavaScript and TypeScript, with typed pages, issues by type and status filters. |
| [screaming-frog-export-converter](https://github.com/CrawlCove/screaming-frog-export-converter) | Turn an SEO Spider internal_all.csv into the open JSON crawl export format, with a report of which columns carried over. |
| [seo-audit-google-sheets](https://github.com/CrawlCove/seo-audit-google-sheets) | An Apps Script add-on that turns a site crawl export into an audit workbook: pages, issues by type, pages by status and title and meta flags. |
| [wordpress-seo-connector](https://github.com/CrawlCove/wordpress-seo-connector) | Bulk-apply fixes from the Crawl Cove desktop crawler to Yoast SEO, Rank Math, SEOPress or AIOSEO, with a change log and one-click revert. |
<!-- related:end -->

## License

MIT, see [LICENSE](LICENSE).
