# Independent verification 4 — FAIL

Date: 2026-08-28
Work order: `receipt-statement-linker-verify-4`
Candidate: `d232704e4f1bf061de4a5a2463a1d2168403a80f` (`fix: verify and ship extension archive`)
Live URL: <https://receipt-statement-linker.sociobot.in>

## Decision

**FAIL — do not release this deployment.** The candidate is locally buildable, its generated consumer ZIP installs and completes the end-to-end job, and the live HTML/JS/legal/service-worker resources byte-match the candidate. But the product’s only public install artifact is absent: the advertised Chromium ZIP returns `404 text/html` on the required live URL. A visitor cannot download or install the browser extension, so the brief’s core job cannot begin.

## Defects

| Severity | Evidence | Required remediation |
| --- | --- | --- |
| **P0 — release blocker** | Fresh `GET` and `HEAD` to `https://receipt-statement-linker.sociobot.in/downloads/receipt-statement-linker-chrome.zip` returned `404`, `content-type: text/html`. The local candidate produces a valid 23,611-byte ZIP at that exact path with SHA-256 `ca8090896b4b9c3375f1e661ce0efc37903f5888788d5913252681652a81e332`; `unzip -t` passes. | Deploy the complete fresh `dist/site/` directory, including `downloads/receipt-statement-linker-chrome.zip`. Retest live `200`, `application/zip`, attachment disposition, immutable caching, matching SHA-256, download, fresh-profile install, and the workflow below. |
| **P2 — live performance budget miss** | Fresh Lighthouse 13 mobile report: Performance 93, Accessibility 100, Best Practices 100, SEO 100; FCP/LCP 2.6 s, TBT 0 ms, CLS 0. The stated LCP target is `<2.5 s`; the very small payload (about 28 KB transferred on first load) makes this primarily live host/document latency (about 1.6 s in the trace). Lighthouse wrote the scored report but emitted `TARGET_CRASHED` while collecting post-report screenshot/BFCache artifacts. | Investigate static-host response latency and repeat under controlled release conditions. This is not the release blocker, but it misses the stated target in this fresh measurement. |

## Clean candidate verification

The worktree was clean at the requested SHA before `npm ci`. No product code was changed during verification.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 178 locked packages installed. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities. |
| `npm test` | PASS — 10/10 Vitest tests. |
| `npm run check` | PASS — `tsc --noEmit`. No lint script exists. |
| `npm run build` | PASS — exact production command built extension, site, ZIP, and package gate. |
| `npm run test:package` | PASS — verifies deployable archive placement/signature/policy. |
| `npm run test:e2e` | PASS — 8/8 Playwright tests. |
| `npm run test:extension` | PASS — built MV3 smoke. |
| `npm run test:consumer` | PASS — unpacked generated ZIP in a fresh Chromium profile. |

Build outputs are within the stated static budgets: initial JS 2,666 bytes, initial CSS 10,526 bytes, generated ZIP 23,611 bytes, and unpacked extension 49,339 bytes. The ZIP integrity test passed.

### Independent extension workflow

In a separate fresh Chromium MV3 profile loaded from `dist/extension/chrome-mv3/`, I independently exercised:

- Normal capture of `North Star Market`, `$48.20`, `2026-05-13`, and HTTPS receipt URL; CSV import; explicit approval; enriched CSV and attachment-manifest downloads.
- Invalid/recovery cases: empty capture focuses Merchant; amount `0` gives actionable feedback and focuses Amount; an invalid URL receives native validation focus and succeeds after correction.
- Matching guardrails: a receipt cannot be approved against two statement rows; duplicate attempt reports the conflict.
- Import recovery: unclosed-quote CSV, valid-header CSV with no readable date/amount, and a file above 3 MB each report an actionable error and preserve the existing 3-row/1-approved workspace.
- Destructive recovery: canceling Clear statement preserves the workspace; confirming it removes statement rows/approvals but keeps saved receipts.
- Boundary/mobile: at 25 saved receipts the free capture control disables with an explanation; at a real 390×844 viewport there is no horizontal overflow, Tab exposes focus, and reduced motion resolves button transition duration to `0.01ms` (computed as `1e-05s`).
- axe-core scans of popup and workbench reported zero serious/critical findings. This normal local workflow made zero external requests and had zero console/page errors.

## Live deployment and privacy evidence

The following fresh live bytes match the candidate build:

| Resource | SHA-256 |
| --- | --- |
| `/` | `b9b6f12ec20e0b3b3ada6f950c7583930752d8d94e7f98f53c92fb89c4e5fe15` |
| `/privacy/` | `99b1adcabfa759b4fd5c5a2d28581d9bf8cab5ad8065339b0114676ae8091ef1` |
| `/terms/` | `e21b00971e8ad772c692ce0b8b2b998b6e4db93951d9eb997d8a881fcdcc3a6e` |
| `/sw.js` | `90ba7a21b9b7e26cd9ca682c150a89837b7d5cd6886a2c2622fb348cb0d629dc` |
| `/assets/main-Ooh6Hzfm.js` | `042eb099c61a5a2730fe4529aa59aa955425fbc49f67b95407bb9313521e00d3` |

Fresh desktop checks of `/`, `/privacy/`, and `/terms/` confirmed correct title, `lang=en`, exactly one `main` and one `h1`, zero serious/critical axe findings, and zero console/page errors. At 390×844, landing content did not overflow, the first Tab exposes the skip link, reduced motion is honored, and a newly controlled service worker performed an offline reload with the landing heading present. First paint contacted only the product origin; no analytics, remote font, tracker, or third-party script loaded automatically.

The built extension declares only `storage`, `downloads`, and `activeTab`; it has no host permissions and no content scripts. Receipt/statement state uses `chrome.storage.local`. Static/network inspection found the only product API is the documented Sociobot license verification after a stored or explicitly supplied license; ordinary capture/import/export made no network request.

Live HTML and `sw.js` use `Cache-Control: no-cache, no-store, must-revalidate`; hashed assets use `public, max-age=31536000, immutable`. CSP restricts scripts/styles/images to self (with only the documented billing API in `connect-src`), and HSTS, `nosniff`, strict referrer policy, `frame-ancestors 'none'`/`X-Frame-Options: DENY`, and restrictive permissions policy are present. The local `staticwebapp.config.json` correctly declares ZIP media type, attachment disposition, immutable cache, and excludes `/downloads/*` from SPA fallback—those rules cannot help while the file is not deployed.

## Retest gate

After deployment, verify the archive’s live status/type/disposition/cache/hash, install the downloaded ZIP into a fresh Chromium profile, and rerun capture → CSV import → explicit approval → enriched CSV + manifest export. Repeat Lighthouse after host latency work if the `<2.5 s` LCP budget remains contractual.
