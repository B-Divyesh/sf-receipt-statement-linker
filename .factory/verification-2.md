# Independent verification — FAIL

Date: 2026-08-28
Work order: `receipt-statement-linker-verify-2`
Candidate: `938ba61f2fa11119803edaa77aa913288ce19809` (`fix: harden imports and complete release verification`)
Live URL: <https://receipt-statement-linker.sociobot.in>

## Decision

**FAIL — do not release the candidate at the required URL.** The previous TLS/404 deployment failure has been repaired: the live HTML, legal pages, and service worker now match this candidate. However, every public extension-download CTA leads to a URL that returns the landing-page HTML rather than the installable ZIP. A new user cannot obtain the browser extension, so the brief's end-to-end job cannot begin.

## Defects

| Severity | Defect and fresh evidence | Required remediation |
| --- | --- | --- |
| **P0 / release blocker** | `GET`/`HEAD https://receipt-statement-linker.sociobot.in/downloads/receipt-statement-linker-chrome.zip` returns `200`, `content-type: text/html`, `content-length: 7323`, and the landing-page ETag. Chromium at 390px navigates to that URL, produces no download event, and shows the landing page again. The locally built ZIP is valid and 23,611 bytes. | Deploy the exact `dist/site/downloads/receipt-statement-linker-chrome.zip` at that path; return an archive MIME type and verify a browser download whose bytes match the build. Re-run live QA. |
| **P2** | The first offline reload after service-worker installation returns cached `/` for an uncached JS request. Chromium logs: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".` The page shell appears but is not functional. A second online load caches runtime assets, after which offline reload passes. | Precache versioned JS/CSS and use navigation-only fallback (never return HTML for scripts/styles); version the cache per release and test a first offline reload plus an old-to-new SW update. |
| **P2** | Live hashed JS and CSS have only `cache-control: public, must-revalidate, max-age=30`; they are not immutable/long-lived as required by the performance contract. Tested responses also omit `Content-Security-Policy` and frame-ancestors/X-Frame-Options. | Configure immutable caching for hashed assets, short/no-cache HTML and SW, and an appropriate CSP with framing protection. |

## Clean-checkout local evidence

The checkout was clean, detached at the candidate SHA, then installed with `npm ci` (178 locked packages; `npm audit` reported 0 vulnerabilities).

| Check | Result |
| --- | --- |
| `npm test` | PASS — 7/7 Vitest tests. |
| `npm run check` | PASS — `tsc --noEmit`. |
| `npm run build` | PASS — exact production build created `dist/site/`, `dist/extension/chrome-mv3/`, and a 23,611-byte Chrome ZIP. |
| `npm run test:extension` | PASS — capture → import → approval → CSV export, no extension console errors, no serious/critical axe findings. |
| `npm run test:e2e` | PASS — 4/4 site tests across `/`, `/privacy/`, `/terms/`, and mobile offline-status feedback. |
| Artifact integrity | PASS — `unzip -t` reports no errors; `diff -rq .output/chrome-mv3 dist/extension/chrome-mv3` is clean. The extension is 49,340 bytes unpacked; initial site JS is 2,666 bytes and CSS 10,526 bytes, within the stated budgets. |
| Lighthouse mobile, production preview | PASS — Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.1 s, TBT 0 ms, CLS 0. Lighthouse wrote the complete scored report despite emitting a post-report tab-crash warning. |

### Independently exercised extension workflow

In a fresh Chromium MV3 profile loaded from the built artifact, I verified:

- Empty state and normal capture (`North Star Market`, `48.20`, `2026-05-13`, HTTPS receipt URL), local persistence, CSV import, inferred mapping, explicit approval, and CSV export.
- A zero amount is rejected with an actionable message; an invalid URL receives native invalid-input focus; correcting either input permits save.
- Malformed quoted CSV and a CSV with no readable date/amount show actionable errors and retain the existing imported statement and approval. A >3 MB CSV is rejected without replacing the existing workspace.
- Statement clearing asks for specific confirmation and clears the transient statement/approval workspace after confirmation. The 25-receipt free-tier boundary disables capture with explanatory copy.
- Desktop 1440px and 390×844 layouts have no horizontal overflow. Keyboard first Tab reaches the skip link with a visible 3px amber focus outline; the same outline remains under reduced motion. Controls sampled at or above the 44px target height.

## Privacy, accessibility, and network evidence

- Built manifest declares only `activeTab`, `storage`, and `downloads`; it has no host permissions or content scripts. Receipt and imported-statement data use `chrome.storage.local`.
- Static inspection found no analytics, tracking pixels, remote fonts, or third-party scripts. Normal extension capture/import/export emitted no external requests. The only product network call in source is Sociobot license verification after an explicit license action.
- Fresh local and live landing-page loads requested only their own origin. The live site has no serious/critical axe findings on `/`, `/privacy/`, or `/terms/`; no console or page errors occurred in normal online desktop or 390px sessions.
- Semantic checks passed: `lang=en`, one `h1`, one `main`, meaningful landmarks, decorative image empty alt text, page titles, visible keyboard focus, and reduced-motion rules.

## Live candidate comparison and response policy

Deployment now serves the candidate's public pages byte-for-byte:

| Resource | SHA-256 match |
| --- | --- |
| `/` | `0cad69c29bff831e0e0d0484a2ef4398dd2e048a20ed90112dca3ee00bc2c55a` |
| `/privacy/` | `99b1adcabfa759b4fd5c5a2d28581d9bf8cab5ad8065339b0114676ae8091ef1` |
| `/terms/` | `e21b00971e8ad772c692ce0b8b2b998b6e4db93951d9eb997d8a881fcdcc3a6e` |
| `/sw.js` | matches the candidate byte-for-byte (`2f5e34369df72f8430141d11689da88a5dab800e2d9273678d58f6235cd8fd56`) |

The live origin has valid HTTPS and returns `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. The 900px AVIF is available and selected by Chromium at 390px. The deployment is therefore not a stale-site mismatch; the missing ZIP and response-policy gaps are deployment defects.

## Retest gate

After publishing the ZIP and response-policy/SW fixes, repeat live verification of the download bytes and MIME type, Chromium installation from the downloaded archive, first offline reload, SW update from a prior cache, asset caching headers, CSP/frame policy, and the normal 390px/desktop workflow.
