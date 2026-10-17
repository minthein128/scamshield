# Kakwe brand

TLDR: the mark is the Pyit Taing Htaung, the Myanmar roly-poly doll that always gets back up. Lacquer red and gold belong to the doll and the logo. Buttons and links are lacquer black. Verdict colours keep their meaning, and high risk is a deep crimson that never appears as branding.

## Name

The app is named Kakwe. When the app language is Burmese the UI, spoken lines and share text say ကာကွယ်. The single source is the i18n key `common:appName` (`src/config/brand.ts` reads it; native overlay and notification text receive it through `ShieldStrings.appName`; the server uses `server/src/brand.ts`). The Android launcher label is "Kakwe", with ကာကွယ် for a Burmese device locale through `plugins/with-localized-app-name.js`. The launcher follows the device locale, not the in-app language.

The old name stays in identifiers that would break installs, sign-in or links: the Android package `com.saferoute.antifraud`, the Kotlin package `com.saferoute.shield`, the `saferoute://` link scheme, storage keys, the Firebase project `saferoute-aibc`, the domains `saferoute-aibc.web.app` and `saferoute-api.akkhayar.com`, and env var names. The doll stays "Pyit Taing Htaung".

## Mark

The app icon is the doll on a gold medallion on a lacquer-black tile (concept B in `assets/brand/concepts/sheet.png`). It has the highest contrast at 24 and 48 px, the doll keeps its full outline on light and dark launchers, and black and gold come from Burmese lacquerware. The red tile (A) loses the doll's red body against the tile and reads as an alarm. The blue tile (C) clashes with blue as the Low risk colour. The cream tile with a route arc (D) is weak at small sizes, and the arc turns to noise at 24 px.

| Use | Form |
| --- | --- |
| App icon, favicon | Doll on the gold medallion, lacquer-black tile |
| Android themed icon | One-colour silhouette with the face window, eyes and smile cut out |
| Light grounds (header, onboarding, empty states) | The doll standing free |
| Dark grounds (Screen shield card, Checking screen, dark logo) | The doll on a gold medallion |
| Logo lockup | Doll + "Kak" in ink and "we" in lacquer red (white and gold on dark). In Burmese the app shows ကာကွယ် in one colour |

The doll geometry lives in `src/components/dollMark.ts`. `BrandMark` draws it in the app, and `scripts/render-brand.mjs` renders every asset and the contact sheet from the same paths (`BRAND_TOOLS=<dir with sharp and opentype.js> node scripts/render-brand.mjs`).

## Palette

The palette moves from brand blue to the doll's lacquer red (`#B8321C`) and gold (`#F2B01E`), with lacquer black (`#1F1A17`) for buttons, links, switches and selection, and warm neutrals (`#F7F3EE` page, `#57504A` secondary text) in place of the cool greys. Red and gold appear only in the doll and the logo, never as a button, chip, band or verdict, so a red surface in the app always means risk. High risk moves from orange-red `#C2410C`, which sat almost on the doll's red, to deep crimson `#9F1239` (CIEDE2000 distance 6.5 before, 15.9 after; 12.2 under deuteranopia) and always comes with the octagon glyph and the words "High risk". Be careful stays amber `#B45309` with the triangle, and Low risk stays blue `#1D4ED8` with the check, now the only blue in the app. Text pairs pass WCAG AA: white on high risk 8.0:1, secondary text on the page 7.2:1, muted text on white 5.9:1.

The Android overlay (`modules/shield-module`, `ShieldPalette.kt`) uses the same palette: the doll on its gold disc in the bubble, verdict badges shaped like the app's marks, a lacquer-black Ask chip, and red and gold only in the doll and its voice halo. `BrandPaletteTest` compares it with `src/theme/theme.ts`.
