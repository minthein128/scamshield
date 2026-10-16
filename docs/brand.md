# SafeRoute brand

TLDR: the mark is the Pyit Taing Htaung, the Myanmar roly-poly doll that always gets back up. Lacquer red and gold belong to the doll and the logo. Buttons and links are lacquer black. Verdict colours keep their meaning, and high risk is a deep crimson that never appears as branding.

## Mark

The app icon is the doll on a gold medallion on a lacquer-black tile (concept B in `assets/brand/concepts/sheet.png`). It has the highest contrast at 24 and 48 px, the doll keeps its full outline on light and dark launchers, and black and gold come from Burmese lacquerware. The red tile (A) loses the doll's red body against the tile and reads as an alarm. The blue tile (C) clashes with blue as the Low risk colour. The cream tile with a route arc (D) is weak at small sizes, and the arc turns to noise at 24 px.

| Use | Form |
| --- | --- |
| App icon, favicon | Doll on the gold medallion, lacquer-black tile |
| Android themed icon | One-colour silhouette with the face window, eyes and smile cut out |
| Light grounds (header, onboarding, empty states) | The doll standing free |
| Dark grounds (Screen shield card, Checking screen, dark logo) | The doll on a gold medallion |
| Logo lockup | Doll + "Safe" in ink and "Route" in lacquer red (white and gold on dark) |

The doll geometry lives in `src/components/dollMark.ts`. `BrandMark` draws it in the app, and `scripts/render-brand.mjs` renders every asset and the contact sheet from the same paths (`BRAND_TOOLS=<dir with sharp and opentype.js> node scripts/render-brand.mjs`).

## Palette

The palette moves from brand blue to the doll's lacquer red (`#B8321C`) and gold (`#F2B01E`), with lacquer black (`#1F1A17`) for buttons, links, switches and selection, and warm neutrals (`#F7F3EE` page, `#57504A` secondary text) in place of the cool greys. Red and gold appear only in the doll and the logo, never as a button, chip, band or verdict, so a red surface in the app always means risk. High risk moves from orange-red `#C2410C`, which sat almost on the doll's red, to deep crimson `#9F1239` (CIEDE2000 distance 6.5 before, 15.9 after; 12.2 under deuteranopia) and always comes with the octagon glyph and the words "High risk". Be careful stays amber `#B45309` with the triangle, and Low risk stays blue `#1D4ED8` with the check, now the only blue in the app. Text pairs pass WCAG AA: white on high risk 8.0:1, secondary text on the page 7.2:1, muted text on white 5.9:1.

The Android overlay (`modules/shield-module`, `ShieldPalette.kt`) still uses the old high-risk orange-red and blue accent until its owner updates it.
