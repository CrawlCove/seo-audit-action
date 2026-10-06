# Changelog

## 1.0.0 — 2026-09-29

Initial release.

- Composite action wrapping [crawlcove-cli](https://github.com/CrawlCove/seo-crawler-cli)
  v1.1.2: crawls `url` up to `max-pages`, fails the check when the `fail-on`
  checks (broken-links, missing-titles, noindex, redirect-chains) reach
  `threshold`.
- Job summary plus a single, self-updating pull-request comment (opt out with
  `comment: 'false'`), listing every broken link, missing title, noindex page
  and redirect chain (first 25 each), and the URLs robots.txt kept us out of.
- Outputs: `exit-code`, `pages`, `broken-links`, `missing-titles`, `noindex`,
  `redirect-chains`, `report-path` (the full JSON report).
- `ignore-robots` for staging hosts behind a blanket `Disallow: /`.
- Example workflows for Vercel/Netlify previews, a Next.js build served in the
  job, and a scheduled WordPress staging crawl.
