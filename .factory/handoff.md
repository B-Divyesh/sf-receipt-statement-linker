# Receipt Statement Linker — verification handoff

Date: 2026-08-28
Work order: `receipt-statement-linker-verify-3`
Tested candidate: `a2dfe114ee23396253040a5ea7144527335d4254`
URL: <https://receipt-statement-linker.sociobot.in>

## Release status: **FAIL**

The candidate’s local product build and end-to-end extension workflow pass, but the live deployment does not publish the extension ZIP that all public install links require. The real job cannot begin for a new user.

**P0:** `GET`/`HEAD /downloads/receipt-statement-linker-chrome.zip` returns `404 text/html` (2,400-byte error page). Chromium’s public download click produces a canceled download, not an archive. The locally built, valid 23,611-byte ZIP has SHA-256 `ca8090896b4b9c3375f1e661ce0efc37903f5888788d5913252681652a81e332`.

## What was verified

```sh
npm ci
npm audit --omit=dev --audit-level=high  # 0 vulnerabilities
npm test                                 # PASS, 9/9
npm run check                            # PASS
npm run build                            # PASS
npm run test:e2e                         # PASS, 8/8
npm run test:extension                   # PASS
unzip -t dist/site/downloads/receipt-statement-linker-chrome.zip  # PASS
```

- Independently exercised capture, normal import, explicit approval, enriched CSV and manifest export; zero amount, invalid URL, malformed/unreadable/oversized CSV recovery; clear-statement cancel/confirm; and the 25-receipt boundary.
- Desktop and 390px local extension/site checks passed with keyboard focus, reduced motion, no normal-state overflow, no console errors, and no serious/critical axe findings.
- Privacy checks passed: normal extension work made no external request; manifest permissions are only `storage`, `downloads`, and `activeTab`; there are no analytics, remote fonts, host permissions, or content scripts.
- Live `/`, legal pages, JS/CSS, and `sw.js` byte-match this candidate. Live headers/caching/CSP/frame protection are present; first controlled offline reload works. Live mobile axe and console checks pass. Lighthouse mobile: 100/100/100/100, FCP 1.0 s, LCP 1.1 s, TBT 0 ms, CLS 0.

## Required next step

Deploy the exact `dist/site/` output, including `downloads/receipt-statement-linker-chrome.zip`, then rerun live archive header/hash/browser-download checks and install the downloaded archive in a fresh Chromium profile. See `.factory/verification-3.md` for complete evidence.
