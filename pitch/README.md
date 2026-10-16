# Kakwe pitch kit

Kakwe (ကာကွယ်) is the product name; the app build, package and URLs still say SafeRoute.

| File | Purpose |
| --- | --- |
| `deck/index.html`, `deck/deck.css` | Source of the submission deck: 13 slides at 1920 x 1080 |
| `deck/dolls.mts` | Writes the doll medallion and the three mood dolls to `deck/img/` from `src/components/dollMark.ts` and `avatarArt.ts` |
| `deck/build.sh` | Renders `deck.pdf` with headless Chrome and page previews to `/tmp/kakwe-pages` |
| `deck.pdf` | Rendered deck |
| `Kakwe-AIBuilderCup-submission.pptx`, `.pdf` | The submission in the contest template |
| `submission/` | Template, `assets.py` (images), `build_pptx.py` (fills the template) and `build.sh` |
| `video-script.md` | Shot list and voice-over for the video under 3 minutes |
| `demo-inputs.md` | Fictional test inputs for the demo flows |
| `e2e/` | Screenshots from the end-to-end scripts; the deck uses some of them |

## Re-render the PDF

```
pitch/deck/build.sh
```

The script uses Chromium from the Playwright or Puppeteer cache (set `CHROME` to override) and `pdftoppm` for previews. Node 22.6 or later runs `dolls.mts` directly.

## Re-render the submission

```
pitch/submission/build.sh
```

Needs uv, headless Chromium, LibreOffice Impress and Google Sans Flex in `~/.local/share/fonts`. The mockups for the wireframe slide come from `~/work/home-check-v2-handoff` (set `MOCK_DIR` to override).

## Screens in the deck

| Slide | Screenshot |
| --- | --- |
| 5 | `verdict-report-danger-390x844-en.png`, `jobshield-result-conflicts-pause-en-390x844.png` (offline demo banner cropped) |
| 6 | `bubble-doll-states.png` (overlay views on a drawn chat), `verdict-report-danger-390x844-my.png`, `contacts-signin-warn-en.png` |
| 10 | `privacy-onboarding-sharing-en.png` |
| 11 | `refine-01-onboarding-phone-my.png` (cropped below the logo) |

## Sources for the numbers

| Claim | Source |
| --- | --- |
| 120,000 in Myanmar | OHCHR via UN News, 29 August 2023, news.un.org/en/story/2023/08/1140187 |
| Text eval 31/31, 0 certainty phrases | `npm run eval` in `server/`, recorded in the root README |
| Protection Score 89.7 on 24 synthetic cases | `bench/RESULTS-v2.md` |
| About 67 on 96 real screenshots | Bench v2 production prompt, 54 + 42 real cases, mean over 3 runs (66.6 and 68.1), draft labels |
| Job Shield 10/10 | `npm run eval:job` in `server/`, 16 October 2026 |
| Dataset 93 real + 28 synthetic | huggingface.co/datasets/Rickaym/saferoute-scam-screenshots |
| Safe Browsing test URL flagged | Live `/v1/check` on testsafebrowsing.appspot.com/s/phishing.html: High risk, `social_engineering` |
