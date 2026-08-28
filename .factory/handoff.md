# Receipt Statement Linker — repair handoff

Date: 2026-08-28

Work order: `receipt-statement-linker-repair-2`

Verifier baseline: `f8861feec43da3609b11d823fc06a8550d8cef28`
Repaired deployment: <https://receipt-statement-linker.sociobot.in>

## Release status: PASS

The P0 verifier finding is repaired: the public Chromium install link now serves the real extension archive. The deployment used the exact `dist/site/` result of `npm run build` (Azure Static Web Apps deployment `d4766245-f682-4641-9528-0b7cc1dfd67f`).

`GET` and `HEAD /downloads/receipt-statement-linker-chrome.zip` now return `200`, `Content-Type: application/zip`, `Content-Disposition: attachment; filename=receipt-statement-linker-chrome.zip`, and immutable one-year caching. The live download is 23,611 bytes with SHA-256 `ca8090896b4b9c3375f1e661ce0efc37903f5888788d5913252681652a81e332`, exactly matching the local artifact; `unzip -t` passes and fresh Chromium download is not canceled.

## Repair and regression coverage

- Added `scripts/verify-package.mjs`, invoked by `npm run build` and exposed as `npm run test:package`. It fails the release build unless `dist/site/index.html`, the public ZIP, and `staticwebapp.config.json` are present; it verifies the ZIP signature/size plus fallback exclusion and attachment/media-type policy.
- Added a source-level regression test ensuring the CTA, README deployment root, and archive path cannot drift apart.
- Added `npm run test:consumer`, which unpacks the actual generated ZIP into a temporary directory and loads it in a fresh Chromium MV3 profile. The existing end-to-end workflow then proves capture → CSV import → explicit approval → CSV export from the consumer artifact, at desktop and 390px, with axe and console checks.
- `scripts/smoke-extension.mjs` now accepts `EXTENSION_PATH`, allowing that same smoke coverage to exercise either the unpacked build or the packaged consumer artifact.

## Verification evidence

Performed after a clean dependency install:

```sh
npm ci                                             # 178 packages
npm audit --omit=dev --audit-level=high            # 0 vulnerabilities
npm test                                           # PASS — 10 tests
npm run check                                      # PASS — tsc --noEmit
npm run build                                      # PASS — extension, ZIP, site, package gate
npm run test:package                               # PASS
npm run test:e2e                                   # PASS — 8 Playwright + axe tests
npm run test:extension                             # PASS — local MV3 smoke
npm run test:consumer                              # PASS — packaged ZIP in fresh profile
unzip -t dist/site/downloads/receipt-statement-linker-chrome.zip  # PASS
```

- Build budgets: initial JS 2,666 bytes; CSS 10,526 bytes; extension ZIP 23,611 bytes; unpacked extension 49,339 bytes.
- Browser coverage: local desktop 1440px keyboard entry, local and live 390×844 no-overflow/keyboard/axe checks, meaningful title/lang/main/h1 checks, focus ring, reduced-motion test, static worker asset checks, and a first controlled live desktop offline reload all pass without console errors.
- Live privacy/identity: live first paint contacted only `receipt-statement-linker.sociobot.in`; no analytics, remote font, or third-party script was observed. The built extension manifest has only `storage`, `downloads`, and `activeTab`, no host permissions, and no content scripts.
- Response policy: live HTML and `sw.js` are `no-cache, no-store, must-revalidate`; hashed assets and ZIP are immutable. CSP includes `frame-ancestors 'none'`, and `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer policy, and restrictive permissions policy are present.
- Live Lighthouse 13 mobile: **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**; FCP 303 ms, LCP 303 ms, TBT 0 ms, CLS 0. Lighthouse emitted its known post-report Chromium `TARGET_CRASHED` warning while collecting screenshot/BFCache artifacts, but wrote the complete scored report; independent Playwright checks had no browser errors.

## Known notes

- The distributed archive remains an unpacked Chromium extension for developer-mode installation, not a browser-store-signed package; this is the product's established delivery model.
- No paid checkout transaction was run. Existing license behavior was preserved; normal receipt and statement work remains local-first and free.
