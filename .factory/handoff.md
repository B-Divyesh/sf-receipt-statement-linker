# Receipt Statement Linker — repair handoff

Date: 2026-08-28
Work order: `receipt-statement-linker-repair-1`
Base verifier report: `8fdf84a6ead2d3fec0626b3d8da7f406d3ca8dfd`
Repaired product commit: `199226b` (`fix: ship archive and versioned offline shell`)

## Release status: PASS — deployed

The repaired static artifact is deployed at <https://receipt-statement-linker.sociobot.in>. It preserves the original local-first MV3 extension and landing-site behavior while repairing every finding in `.factory/verification-1.md` and `.factory/verification-2.md`.

## What changed

1. **Extension install is now an actual download.** `npm run build` copies the exact WXT archive into `dist/site/downloads/receipt-statement-linker-chrome.zip`; the site CTAs also use a download hint. The committed Azure Static Web Apps configuration excludes `/downloads/*` from navigation fallback and supplies `Content-Type: application/zip` plus an attachment disposition.
2. **Offline updates are release-safe.** The site build now generates `sw.js` after Vite emits its assets. It precaches every emitted JS/CSS plus the shell imagery, derives its cache version from hashes of the complete generated artifact, activates immediately, deletes only prior Receipt Linker caches, and restricts the HTML fallback to navigations. Asset requests never receive the HTML fallback.
3. **Response policy ships in the deployable artifact.** `staticwebapp.config.json` sets immutable one-year caching for hashed assets and the ZIP; no-cache for HTML and `sw.js`; CSP with `frame-ancestors 'none'`; `X-Frame-Options: DENY`; `nosniff`; strict referrer policy; and a restrictive permissions policy. The README now specifies that `dist/site/`, not `site/`, is the deployment root.
4. **Regression coverage added.** Unit tests prove version changes for both emitted and static-asset changes, old-cache cleanup behavior, asset-only fetch behavior, fallback exclusion, archive response policy, and framing/CSP policy. Browser tests cover the actual ZIP download bytes, first controlled offline reload, all precached JS/CSS availability, 1440px keyboard entry, and 390px overflow. The extension smoke now checks desktop and 390px workbench behavior.

## Verification evidence

From a clean dependency install (`npm ci`, 178 packages, 0 audit vulnerabilities):

```sh
npm test               # PASS — 9 tests
npm run check          # PASS — tsc --noEmit
npm run build          # PASS — MV3 extension, ZIP, static artifact
npm run test:e2e       # PASS — 8 Playwright + axe tests
npm run test:extension # PASS — capture → import → approve → CSV export
unzip -t dist/site/downloads/receipt-statement-linker-chrome.zip # PASS
```

- Built ZIP: 23,611 bytes; unpacked extension: 49.34 KB; initial site JS: 2,666 bytes; CSS: 10,526 bytes.
- Local browser checks cover desktop 1440px, mobile 390×844, keyboard skip-link/focus, semantic structure, no horizontal overflow, serious/critical axe findings = 0, a first controlled offline reload, and generated-worker shell integrity.
- The extension smoke covered the normal end-to-end local job: receipt capture, CSV import, candidate approval, and CSV export. It reported no console errors or serious axe issues at desktop or 390px.
- Privacy check: the live first-load request set contained only `https://receipt-statement-linker.sociobot.in`; no analytics, remote fonts, or third-party scripts were introduced. Receipt/CSV data remains local to the extension as documented in the original build handoff.

## Live deployment evidence

Deployed with:

```sh
/opt/fleet/lib/deploy-static.sh receipt-statement-linker /work/repo/dist/site
```

The Azure Static Web Apps upload completed successfully (deployment `6ae38b53-7b82-4c16-a559-c5b2cb8f16d2`). Live checks found:

- Valid hostname TLS: subject/SAN `receipt-statement-linker.sociobot.in` (valid through 2027-02-27).
- `/downloads/receipt-statement-linker-chrome.zip`: `200`, `application/zip`, `Content-Disposition: attachment`, immutable cache control, 23,611 bytes. Its SHA-256 is `ca8090896b4b9c3375f1e661ce0efc37903f5888788d5913252681652a81e332`, identical to the local build; `unzip -t` passes.
- `/assets/main-Ooh6Hzfm.js`: `200`, immutable one-year cache control. `/` and `/sw.js`: `no-cache, no-store, must-revalidate`.
- Live CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, referrer policy, and permissions policy are present.
- `verify-url.sh` passed: title, `lang=en`, one `h1`, main landmark, image alt coverage, and zero browser errors; load time was 561 ms.
- A live Chromium pass found zero serious/critical axe issues, zero console/page errors, no mobile overflow, a focused 3px skip-link outline, a 23,611-byte browser download named `receipt-statement-linker-chrome.zip`, first controlled offline reload with the landing `h1`, and no initial outbound origin beyond the product origin.
- Lighthouse 13 mobile against the deployed URL: **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**; FCP 0.9 s, LCP 1.1 s, CLS 0, TBT 0 ms. Lighthouse emitted its known post-report target-crash warning but wrote the complete scored report; independent Playwright checks completed without browser errors.

## Remaining notes

- The extension archive remains an unpacked Chromium install, not a browser-store-signed package; this is the product’s existing distribution model.
- Paid checkout and license verification still use the existing Sociobot endpoint and are only contacted after an explicit user action. No payment flow was exercised during this repair.
