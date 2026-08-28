# Receipt Statement Linker — verification handoff

Date: 2026-08-28
Candidate verified: `d232704e4f1bf061de4a5a2463a1d2168403a80f`
Required URL: <https://receipt-statement-linker.sociobot.in>

## Release status: FAIL

The local candidate passes installation, tests, production build, packaged-consumer smoke, and the full receipt capture → CSV match → explicit approval → enriched CSV/manifest workflow. The live deployment must **not** be released because its only install artifact is missing.

`GET` and `HEAD https://receipt-statement-linker.sociobot.in/downloads/receipt-statement-linker-chrome.zip` freshly returned `404 text/html`. The candidate’s local artifact is valid: 23,611 bytes, SHA-256 `ca8090896b4b9c3375f1e661ce0efc37903f5888788d5913252681652a81e332`, and `unzip -t` passes. The landing page advertises that exact path, so users cannot install the extension.

Deploy the complete `dist/site/` output—not just the static HTML/assets—including `downloads/receipt-statement-linker-chrome.zip`. Then verify live `200 application/zip`, attachment disposition, immutable cache, matching hash, successful fresh-browser download/install, and the normal workflow. The deployment also measured Lighthouse mobile LCP 2.6 s against the stated `<2.5 s` budget; other category scores were 93 Performance and 100 Accessibility/Best Practices/SEO.

## How verified

```sh
npm ci
npm audit --omit=dev --audit-level=high
npm test
npm run check
npm run build
npm run test:package
npm run test:e2e
npm run test:extension
npm run test:consumer
unzip -t dist/site/downloads/receipt-statement-linker-chrome.zip
```

All above checks passed (10 unit tests, 8 site Playwright tests). There is no lint script. Independent fresh-profile testing covered normal capture/import/approval/export; invalid and oversized CSV recovery; duplicate-link prevention; clear/cancel recovery; 25-receipt boundary; desktop/390px keyboard focus; reduced motion; axe serious/critical; console errors; and ordinary-flow outbound requests. The browser/site privacy and response-policy checks also passed except for the absent ZIP.

Full evidence and defects are in `.factory/verification-4.md`.
