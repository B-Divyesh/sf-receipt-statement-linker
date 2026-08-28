# Receipt Statement Linker

Receipt Statement Linker is a local-first Chromium extension for freelancers and households who need to reconnect online receipts with later bank or accounting statement rows. It captures purchase context at checkout, proposes matches from an imported CSV, requires explicit approval, and exports an enriched CSV plus a portable attachment manifest.

No bank login, receipt OCR, tracking, or hosted financial-data pipeline is involved. The extension requests only `activeTab`, `storage`, and `downloads`. The public site is designed for <https://receipt-statement-linker.sociobot.in>.

## What ships

- WXT + TypeScript Manifest V3 extension with a toolbar capture popup and full-page matching workbench.
- CSV parser for comma, semicolon, and tab-separated files, quoted multiline cells, common amount formats, and ISO/day-first dates.
- Reviewable amount/date/merchant candidates, manual overrides, dismiss, undo, and bulk approval for high-confidence pairs.
- Local enriched CSV and JSON manifest exports.
- Free library of 25 receipts; a one-time $19 Sociobot license unlocks unlimited capture and portable library backup/restore. Matching, exports, accessibility, and safety controls stay free.
- Static product, privacy, and terms pages with an offline cache.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev          # extension development build
npm run dev:site     # landing site at the printed local URL
npm test             # core unit tests
npm run check        # TypeScript
npm run build        # extension, zip, and static site
npm run test:e2e     # Playwright + axe against the built site
```

The exact production build command is `npm run build`. It writes the deployable static site to `dist/site/` (with `index.html` at that root), the unpacked extension to `dist/extension/chrome-mv3/`, and the installable archive to `dist/site/downloads/receipt-statement-linker-chrome.zip`.

To install locally, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/extension/chrome-mv3`.

## Privacy and matching boundaries

Extension records stay in `chrome.storage.local`. A license token is the only value sent to Sociobot, solely for verification and at most once daily after a cached verdict. The matcher requires amounts within two cents and dates within ten days, then uses merchant token overlap only to rank candidates. Users approve every link; results are not accounting or tax advice.

See [the visual system](.factory/design.md), [handoff](.factory/handoff.md), [privacy policy](site/privacy/index.html), and [terms](site/terms/index.html).

## Deploy

Deploy the exact output of `npm run build`: `dist/site/` is the static-site root and includes both `downloads/receipt-statement-linker-chrome.zip` and `staticwebapp.config.json`. The latter keeps the ZIP out of navigation fallback, makes hashed assets immutable, and sets the CSP/framing policy; do not deploy `site/` directly. The factory owns DNS and deployment. Register the paid product with the factory billing workflow before release; the UI intentionally uses the product slug rather than a hardcoded provider product ID.

## License

MIT. See [LICENSE](LICENSE).
