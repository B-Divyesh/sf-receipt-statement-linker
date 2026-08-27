# Visual thesis — the midnight evidence desk

## Direction and rationale

Receipt Statement Linker uses **cinematic environmental art**: a quiet, rain-darkened evidence desk where an amber receipt and a cyan statement row are joined by one precise beam. The scene turns an otherwise abstract data handoff into the product's single promise—preserve the clue that proves what a bank row meant. The interface is an instrument panel from the same world: ink-dark, restrained, and legible, with warm paper surfaces reserved for evidence and cool light reserved for verified links. It is intentionally single-mode; the darkroom setting is semantic rather than ornamental and every core surface is painted explicitly.

## Palette

- `night #071416`: page/background; near-black green from a darkened desk.
- `deep #0c2021`: raised surfaces.
- `panel #112a2a`: controls and nested surfaces.
- `paper #f4e7c8`: primary light text and receipt paper.
- `mist #b7c8c1`: supporting text (7.7:1 on night).
- `amber #f4b860`: capture/accent, derived from a tungsten desk lamp; `#101817` text on amber.
- `cyan #75d7c7`: linked/success state, derived from a statement screen; `#071416` text on cyan.
- `warning #ffd27a`, `danger #ff9b8e`: state colors always paired with words/icons.
- `line rgba(183, 200, 193, .2)`: hairlines; never carries meaning alone.

All body-size text combinations meet WCAG AA contrast. Focus uses a 3px amber outline with a 3px night offset.

## Type and rhythm

No remote fonts. Headings use `Georgia, Cambria, serif`, whose editorial forms evoke archival records. UI and data use `Inter, ui-sans-serif, system-ui, sans-serif`; system fallback avoids a font payload and keeps dense financial rows crisp. CSV values use `ui-monospace` and tabular figures. Scale: 14, 16, 18, 24, 34, 56px. Spacing follows a 4/8px grid: 4, 8, 12, 16, 24, 32, 48, 72px. Reading measure is capped at 68 characters.

## Composition and interaction grammar

- The landing page moves from atmosphere to proof: wide environmental scene, then a three-beat evidence trail (capture, reconcile, export).
- The extension is a compact workbench. Capture is amber; proposed matches are paper-toned; approved links become cyan. Dense tables are used only where comparison is the task.
- Independent records use thin top/bottom rules and generous gaps rather than generic rounded-card grids.
- Buttons compress by 1px on activation. Every state change is announced in a live region. Destructive actions name the affected item and require confirmation; imports replace only the transient statement workspace, never saved receipts.
- At 390px, comparison rows stack into labelled blocks; nonessential score breakdowns collapse, while approval and export remain full width.

## Motion

UI transitions last 180–240ms and animate opacity or transform only. Match candidates appear as if slid together from two nearby sources; confirmed links settle with a short cyan highlight. The hero has one slow, non-looping light reveal on first paint. Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instantaneous/opacity-only.

## Asset plan and provenance

One original generated hero depicts the product's world without implying OCR, banking access, or automation beyond matching. It ships as responsive WebP/AVIF with a PNG source retained under `assets/src/`; no people, brands, logos, or readable account data.

**Prompt sheet:** cinematic overhead environmental still life of a private home-office evidence desk at midnight; one curled paper receipt on the left and one abstract bank statement grid on a small dim screen at right, joined by a single fine luminous cyan thread; wet window reflections, dark teal lacquered wood, brass paper clip, tungsten amber pool of light, tactile paper fibers, restrained film grain, 35mm anamorphic composition, deep shadows, palette of ink green, parchment, amber, oxidized cyan; editorial product photography, room for interface copy on the left/top. Negative list: people, hands, faces, readable text, numbers, logos, brands, currency symbols, credit cards, bank interfaces, neon cyberpunk clutter, gradients, watermark, signature, extra objects, distorted paper.

- Generator: Azure OpenAI image generation via `/opt/fleet/lib/gen-image.sh`, deployment `factory-image`.
- Date: 2026-08-27.
- License/provenance: original generated asset commissioned for this repository; no third-party source imagery.
- Prompt sidecar: `assets/src/evidence-desk.json`.

