# SafeRoute pitch kit

| File | Purpose |
| --- | --- |
| `deck.md` | Marp source of the submission deck (12 slides) |
| `theme.css` | Custom Marp theme `saferoute` (palette from `src/theme/theme.ts`, Plus Jakarta Sans from `assets/fonts`) |
| `deck.pdf` | Rendered deck |
| `video-script.md` | Timed shot list and voice-over for the video under 3 minutes |
| `demo-inputs.md` | Fictional test inputs for the demo flows |
| `img/` | Phone screens cropped from the design mockup |

## Re-render the PDF

Chrome comes from the Puppeteer cache. On Ubuntu 23.10 and later the Chrome sandbox is blocked, so use a wrapper that adds `--no-sandbox`.

```
cat > /tmp/chrome-ns.sh <<'EOF'
#!/bin/sh
exec $(ls -d $HOME/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | tail -1) --no-sandbox "$@"
EOF
chmod +x /tmp/chrome-ns.sh

cd pitch
CHROME_PATH=/tmp/chrome-ns.sh npx @marp-team/marp-cli --no-stdin \
  --theme theme.css deck.md --pdf --allow-local-files -o deck.pdf
```

Where the sandbox works, set `CHROME_PATH` to the Chrome binary directly. Keep `--no-stdin`, or marp waits for input. To check layout, render PNGs with `pdftoppm -r 70 -png deck.pdf /tmp/s`.

## Edit the track

Slide 2 holds the track name and the criteria map. If the track changes to BFSI, edit the heading `Track: ...`, the theme line and the paragraph below it. The title slide carries the track name once.

## To replace before submission

Slide images are cropped from the design mockup and are not screenshots of the running app. Replace them with real captures at the same file names in `img/` (about 410x848 px or larger, same aspect ratio).

| File | Slide | Content to capture |
| --- | --- | --- |
| `img/home.png` | 4 | Home screen |
| `img/family.png` | 4 | Family Guardian, missed check-in |
| `img/shield.png` | 5 | Turn on Shield screen |
| `img/spot.png` | 6 | Floating Shield over a job post |
| `img/checking.png` | 6 | Checking screen, six stages |
| `img/verdict.png` | 6 | Danger verdict with Listen button |
| `img/chatverdict.png` | 6 | Chat (pig butchering) verdict |

Unused spare images: `img/risk.png`, `img/chat.png`, `img/sms.png`.

Other items to supply:

- Team names and roles on slide 12 (placeholders `[NAME]`, `[Role]`).
- Deployed web demo URL and contact email on slide 12.
- Confirm the Firebase Hosting web demo is live before recording.
- Web Risk is not yet verified live on Cloud Run. Verify before the video, or remove it from the demo narration.
- Cost per check on slide 10 is an estimate. Replace it with the measured Cloud Billing figure after a test run. TTS pricing is unconfirmed for the deployed model.
- Statistics (sources are in slide footers and speaker notes): OHCHR via UN News (2023), UNODC via OCCRP (July 2026), GASA and Feedzai (October 2025).
