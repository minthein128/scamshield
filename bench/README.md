# Benchmarks

Two benchmarks run the real SafeRoute pipeline and write to `bench/results/`. `RESULTS.md` is generated from those files.

| Bench | Input | Command (in `server/`) |
| --- | --- | --- |
| Text eval | 27 labelled texts in `server/eval/cases.ts` | `EVAL_JSON=../bench/results/<date>-<model>-text-eval.json npm run eval` |
| Screenshot bench | Screenshots plus a `labels.csv` | `npm run bench` |

Both need `GEMINI_API_KEY` on the machine that runs the server.

## Screenshot bench

1. Put the images in one folder. Default folder: `$BENCH_SRC`, else the uploads/bench folder set in `bench/lib.ts`. Override with `--src DIR`.
2. Run `npm run bench:labels`. It adds one row per new image to `labels.csv` and guesses `app` from the file name prefix (`tiktok-03.png` gives `tiktok`).
3. Fill the `expected` column with `safe`, `careful` or `danger`. Rows with no value are skipped.
4. Start the server: `cd server && npm run build && PORT=8099 node dist/index.js`.
5. Run `PORT=8099 npm run bench`. Use `--api URL` for another host, or `--inprocess` to skip the server.

`labels.csv` columns:

| Column | Values |
| --- | --- |
| `file` | image file name in the same folder (png, jpg, webp, under 4 MB) |
| `app` | free text, for example `tiktok`, `facebook`, `viber`, `telegram`, `line`, `sms`, `shopee` |
| `expected` | `safe`, `careful` or `danger` |
| `scam_type` | `job_trafficking`, `romance_pig_butchering`, `parcel_phishing`, `fake_agency`, `marketplace_fraud`, `investment`, `other` or `none` |
| `language` | `en`, `id`, `tl` or `my` (language of the screenshot; also the report language) |
| `notes` | free text, never published |
| `public` | `yes` only for images that are safe to publish |

Each image is sent as `kind: "screen"` with `shareSignals: false`, so the benchmark never writes to the shared intel network. Images run one at a time with a pause (`--delay`, default 2500 ms).

### Metrics

- Accuracy counts a result as correct when risky (careful or danger) matches the label. Exact three-class accuracy is listed next to it.
- False-positive rate: safe screenshots that returned careful or danger.
- Per-app and per-language accuracy, confusion matrix, p50 and p95 latency.
- PII check: the redaction module (`server/src/intel/redact.ts`) runs over the returned title, summary and flag evidence. Phone, email, ID, passport, card, IBAN and account patterns that remain are counted.

## Privacy

Screenshots can contain real names, faces and phone numbers.

- Do not commit them. Keep them outside the repo or under `bench/private/`, which is gitignored.
- Result files hold only file names, app, labels, verdicts, scores, flag families, counts and timings. They hold none of the model's text and none of the image content.
- `npm run bench -- --publishable` copies images whose `public` column is `yes` into `bench/public/`, with a labels file. Public images must be synthetic or blurred.
- A run on a real set also copies its labels (without notes) to `bench/labels.csv`.

## Synthetic set

`bench/public/synthetic/` has 6 fictional screenshots built from `pitch/demo-inputs.md` and `server/eval/cases.ts`. They check that the harness works end to end. Regenerate them with `node bench/synth/render.mjs` (needs Chrome from the Puppeteer cache).

```bash
npm run bench -- --src ../bench/public/synthetic --set synthetic
```

## Files

| File | Purpose |
| --- | --- |
| `run.ts` | ingest, run, score, write results |
| `labels.ts` | add blank rows for unlabelled images |
| `report.ts` | build `RESULTS.md` from `results/*.json` |
| `lib.ts` | CSV parsing and metrics |
| `labels.template.csv` | label file template |
