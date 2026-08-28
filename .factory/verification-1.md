# Independent verification — FAIL

Date: 2026-08-27  
Work order: `receipt-statement-linker-verify-1`  
Candidate: `938ba61f2fa11119803edaa77aa913288ce19809` (`fix: harden imports and complete release verification`)  
Required live URL: <https://receipt-statement-linker.sociobot.in>

## Decision

**FAIL — do not release this candidate at the required URL.** The locally built candidate is functional, but the live hostname neither presents a certificate valid for the hostname nor serves the product. This independently confirms a deployment failure rather than a product-build failure.

## Release-blocking defect

### BLOCKER — deployment is absent and TLS is invalid

- Chromium navigation to the required URL fails with `net::ERR_CERT_COMMON_NAME_INVALID`.
- The served certificate subject is `*.msha-slice-7-eus2-0-ase.p.azurewebsites.net`; its SAN list contains only that Azure hostname family, not `receipt-statement-linker.sociobot.in`.
- A diagnostic `curl -k` request (used only after normal TLS validation failed) returns `HTTP/1.1 404 Site Not Found`, title `Microsoft Azure Web App - Error 404`, and body heading `404 Web Site not found.`
- Therefore the candidate cannot be compared to a functioning live product; live response security headers, caching policy, console state, axe results, and mobile behavior are not testable. The Azure error page is conclusively not the candidate site.

Required remediation: bind the hostname to the deployed static product, provision a certificate including `receipt-statement-linker.sociobot.in`, deploy the exact `dist/site/` output from this candidate, then repeat live verification.

### MEDIUM — service-worker cache is not release-versioned

`site/public/sw.js` uses the fixed cache name `receipt-linker-shell-v1` and a cache-first handler for every GET request. A later deployment that changes application assets while retaining this cache name can retain old HTML/assets rather than reliably activate the new shell. Offline reload succeeds for this build, but a service-worker update path is not safe to approve until the cache name is tied to a release/build version and an old-to-new update test passes.

## Local clean-checkout evidence

The checkout was clean and already detached at the candidate SHA before installation. `npm ci` installed 178 locked packages with **0 vulnerabilities**.

| Check | Result |
| --- | --- |
| `npm test` | PASS — 7/7 Vitest tests |
| `npm run check` | PASS — `tsc --noEmit` |
| `npm run build` | PASS — production extension, zip, and `dist/site/` generated |
| `npm run test:extension` | PASS — capture → import → approval → CSV export; zero serious/critical axe findings |
| `npm run test:e2e` | PASS — 4/4 Playwright site tests |
| Independent extension boundary/recovery check | PASS — zero amount rejected, valid retry saved, unclosed-quote CSV rejected, duplicate column mapping rejected, corrected mapping imported |
| Independent local site check (1440px and 390×844) | PASS — no console/page errors, no serious/critical axe findings, no horizontal overflow, one `h1`/`main`, `lang=en`, titles and decorative empty alt text present |
| Keyboard and motion | PASS — first Tab reaches skip link with 3px amber visible outline; 390px extension workbench has the same visible focus; reduced-motion computes to `scroll-behavior: auto` and `transition-duration: 0.00001s` |
| Offline reload | PASS — service worker controlled a subsequent offline reload and preserved the landing page/title/h1 (subject to the update defect above) |
| Privacy/network smoke | PASS locally — first-load network requests stayed on `127.0.0.1`; no analytics/third-party scripts. Built extension requests the Sociobot API only after an explicit license-verification action; receipt/CSV processing uses `chrome.storage.local` and no host permissions are declared. |
| Built payload | PASS — site JS 2,666 B, shared CSS 10,526 B, mobile AVIF 18,904 B; extension unpacked total 49,340 B, all below stated budgets. |
| Lighthouse mobile, local production preview | 100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO; FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 0 ms. The Lighthouse runner printed a post-report browser-tab-crash warning, but wrote a complete scored JSON report; the independent Playwright checks above completed without browser errors. |

The exact production build created:

- `dist/site/` — static deployment root.
- `dist/extension/chrome-mv3/` — unpacked MV3 extension.
- `dist/site/downloads/receipt-statement-linker-chrome.zip` — 23.61 KB installable archive.

## Product-workflow coverage

On the built extension, an independently driven Chromium session covered a representative receipt (`Boundary Shop`, `12.34`, `2026-08-27`, HTTPS receipt URL), imported a normal statement CSV, inspected the match, and verified mobile layout. The repository smoke test additionally approved the candidate and observed the CSV download. Boundary and recovery cases covered zero amount, malformed CSV quoting, duplicate column assignments, and a successful retry after each recoverable input error.

The artifact honors the brief’s local-first core workflow: manual capture, local CSV import, suggested amount/date/merchant matches, explicit approval, enriched CSV and attachment-manifest export. It declares only `activeTab`, `storage`, and `downloads`; there is no bank-login or broad site permission.

## Live evidence commands

```sh
# Normal browser navigation: fails
# page.goto('https://receipt-statement-linker.sociobot.in/')
# -> net::ERR_CERT_COMMON_NAME_INVALID

echo | openssl s_client -connect receipt-statement-linker.sociobot.in:443 \
  -servername receipt-statement-linker.sociobot.in 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

# Diagnostic only; bypasses the already-established certificate failure
curl -ksSIL https://receipt-statement-linker.sociobot.in/
# HTTP/1.1 404 Site Not Found
```

## Retest gate

After deployment repair, verify all of the following against the public URL: valid hostname certificate, 200 candidate HTML/assets and extension zip, security/caching headers, desktop and 390px flows, keyboard/focus/reduced motion, console/page errors, axe, initial outbound requests, and service-worker upgrade from an older cached release.
