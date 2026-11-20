# Changelog

## 1.1.0 (2026-11-20)

- Runs seo-crawler-cli v1.2.0 by default, which counts each dead link once
  (before, one dead link read as 2) and counts missing titles and noindex only
  on pages that answered 2xx. The `broken-links`, `missing-titles` and `noindex`
  outputs can be lower than under 1.0.x for the same site; pin
  `cli-version: v1.1.3` to keep the old counting.
- The PR comment's lists match the counts: each dead link appears once with the
  status it got, and a 404 page's own title or noindex is no longer listed.

## 1.0.2 (2026-11-16)

- Shorter `action.yml` description, to fit the GitHub Marketplace limit of 125
  characters. No behaviour change.

## 1.0.1 (2026-09-29)

- `cli-version` defaults to crawlcove-cli v1.1.3 (versioned user agent pointing
  at crawlcove.com).

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
