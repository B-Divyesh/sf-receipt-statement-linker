# Receipt Statement Linker — build handoff

Date: 2026-08-27
Work order: `receipt-statement-linker-build-1`

## What was built

- A production WXT + TypeScript Manifest V3 extension with only `activeTab`, `storage`, and `downloads` permissions.
- A 390px toolbar capture flow that prefills the current page title/URL and records merchant, amount, currency, purchase date, URL, and note in `chrome.storage.local`.
- A full-tab matching workbench with receipt empty states, deletion confirmation, local CSV import, column inference/remapping, actionable parser/quota errors, and statement clearing.
- A deterministic matcher requiring amount equality within two cents and dates within ten days, with merchant-token similarity used only to rank candidates.
- Explicit false-match review: approve, manual replacement, reject, undo, duplicate-receipt protection, and optional bulk approval only for ≥92% candidates.
- Enriched CSV export that preserves every source row and labels unmatched ones, plus an approved-link JSON attachment manifest.
- A genuinely useful free tier (25 stored receipts; all matching and export features included) and a one-time $19 Sociobot unlock for unlimited receipts and JSON library backup/restore.
- Paid-license return-token capture on the website, paste-to-restore in the extension, once-daily verdict caching, optimistic cached unlock, and an offline-safe free experience.
- A responsive static product site, `/privacy/`, `/terms/`, offline service worker, robots file, sitemap, and the packaged Chromium zip under `dist/site/downloads/`.
- A product-specific midnight evidence-desk visual system and original Azure OpenAI artwork. Prompt and provenance are in `.factory/design.md` and `assets/src/`.

## Build and verification

From a clean checkout:

```sh
npm install
npm test
npm run check
npm run build
npm run test:extension
npm run test:e2e
```

The exact production build command is `npm run build`. Deploy `dist/site/`; its root contains `index.html`. The unpacked extension is at `dist/extension/chrome-mv3/`, and the downloadable archive is `dist/site/downloads/receipt-statement-linker-chrome.zip`.

Verified locally on the final source:

- Vitest: 7/7 passing (CSV parsing, delimiter/quote handling, inference, locale amounts/dates, matching boundaries, enriched CSV, manifest).
- TypeScript: `tsc --noEmit` passes.
- Playwright site tests: 4/4 passing at a 390×844 viewport, including `/`, `/privacy/`, `/terms/`, offline feedback, title/lang/main/single-h1 checks, console monitoring, and axe serious/critical checks.
- Chromium MV3 smoke: toolbar capture → local persistence → statement upload → inferred mapping → suggested match → approval → CSV download passes. Final workbench axe scan has zero serious/critical findings and no console errors.
- `npm audit`: zero known vulnerabilities.
- Lighthouse 13 mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, CLS 0, total blocking time 50 ms, speed index 1.0 s.
- Static initial payload: 2.67 KB JavaScript, 10.53 KB shared CSS, 0.57 KB legal CSS; hero is 20 KB mobile AVIF / 32 KB mobile WebP (60 KB / 84 KB desktop), all below budget. Extension total is 49.34 KB unpacked; packaged zip is 23.61 KB.
- The final manifest has `options_ui.open_in_tab: true` and no host permissions.

## Known gaps and release steps

- The factory must register `receipt-statement-linker` in the Sociobot billing engine and exercise the live checkout/return URL before launch. No provider product ID is embedded; all links use the required slug endpoint.
- The repository produces an installable Chromium zip, but it is not signed or listed in a browser store. The current site explains the unpacked-extension installation path.
- Ambiguous numeric dates such as `05/06/2026` are interpreted day-first; unambiguous U.S. dates such as `05/14/2026` and ISO dates are supported. A later release could add a per-import date-locale selector.
- Receipt OCR, automatic page scraping, bank connections, spending advice, and tax/accounting correctness are intentionally outside the brief.
