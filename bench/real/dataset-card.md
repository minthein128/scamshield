---
license: cc-by-nc-4.0
pretty_name: SafeRoute scam screenshots
language:
  - my
  - en
  - th
  - id
  - tl
  - zh
task_categories:
  - image-text-to-text
  - image-classification
tags:
  - scam-detection
  - migrant-workers
  - benchmark
  - evaluation
size_categories:
  - n<1K
configs:
  - config_name: synthetic
    data_files:
      - split: test
        path: data/synthetic/**
  - config_name: real
    data_files:
      - split: test
        path: data/real_redacted/**
---

# SafeRoute scam screenshots

A small evaluation set of chat and message screenshots for SafeRoute, an Android app that helps migrant workers from Myanmar, Indonesia, the Philippines and Thailand spot scams before they pay, send documents or travel. Each image has a label for the right verdict, the facts a good warning must state and the advice it must give.

## Access

Use this dataset for evaluation. Do not use it to identify or contact any person.

## Configs

| Config | Images | Source |
| --- | --- | --- |
| `synthetic` | {{N_SYNTHETIC}} | Rendered fictional phone screenshots. No real person, number or company. |
| `real` | {{N_REAL}} | Real scam screenshots collected by the SafeRoute team, redacted. |

## How the images were made

Synthetic images are drawn from a layout description (chat, SMS or post) with fictional names, numbers and companies. Some cases come with the same message in a second language. More than half are risky messages (job trafficking, fake agencies, romance and crypto, parcel fees, task scams, marketplace fraud). The rest are safe, and many of those are hard negatives: real-looking employer, bank, school and advisory messages that use scam words such as fee, passport or OTP.

Real images are screenshots collected by the SafeRoute team from screenshots that were publicly posted online, for example warning posts on social media. They come from Facebook and Messenger, Telegram, Viber and SMS. Most are in Burmese; some are in Chinese or English. The original images are not part of this dataset.

## Fields

Each folder holds a `metadata.jsonl` file with one row per image.

| Field | Meaning |
| --- | --- |
| `file_name` | Image file in the same folder |
| `config`, `split`, `source` | `synthetic` or `real`; every row is in the `test` split |
| `id`, `parent_id`, `variant` | Case id; for a translation, the id of the original case |
| `language` | Language the report is requested in |
| `content_language` | Language of the text in the image |
| `app`, `home`, `destination` | Source app, home country of the reader, destination named in the message |
| `scam_type` | `job_trafficking`, `romance_pig_butchering`, `parcel_phishing`, `fake_agency`, `marketplace_fraud`, `investment`, `other`, `none` |
| `expected_verdict` | `safe`, `careful` or `danger` |
| `score_range` | Accepted risk score band, 0 to 100 |
| `families` | Red-flag families: `too_good`, `pressure`, `payment_route`, `identity`, `link_risk`, `known_bad`, `trafficking` |
| `source_text` | Transcription of the visible text. In real rows, hidden names, numbers and handles appear as `[NAME]`, `[PHONE]` and `[HANDLE]` |
| `must_mention` | Facts a good warning must state, each with accepted spellings in several languages |
| `must_advise` | Advice a good warning must give |
| `must_not_accuse`, `must_not_advice` | Names the report must not call criminals; wrong advice it must not give. In real rows the names are placeholders such as `[NAME]` |
| `label_status` | `authored` for synthetic rows. `draft` for real rows until a person checks them |
| `labelled_by` | Who or what wrote the labels |
| `redaction` | `not_needed` for synthetic rows. `checked` for real rows after a person looked at the redacted image |

## Labelling

Real-image labels start as drafts written by a Gemini model that reads each image once and a second model that cross-checks the numbers. The draft says whether the image is a scam, proposes a verdict and lists the facts and advice. Lines the model could not read with confidence are flagged for review. Burmese transcription is unreliable, and Burmese digits are confused easily (for example ၃ and ၂). Treat drafts as provisional until `label_status` is `reviewed`.

## Redaction

For real images, a model proposes region boxes and a script blurs or boxes them with fixed pixel coordinates. Hidden: profile photos, avatars and faces; personal names in headers and sender labels; phone numbers; usernames, handles and account numbers. This applies to victims and to senders, because scammers often use the identities of real people. Message text, amounts, times and scam links stay legible. Every redacted image was then inspected and missed regions were corrected before the image was marked `redaction: checked`. Public posting does not make a name or a face fair to republish, so the rule is the same for every image.

## Personal information

Real screenshots show people who did not agree to be in a dataset, and scammers often use stolen identities. The following were removed from the published images and from every text field:

- profile photos, avatars and faces
- personal names, including names in chat headers, sender labels and replies
- phone numbers and account numbers
- usernames, handles and links that carry a profile name

The original images and the table that maps case ids to original file names are not published. If you see yourself or someone you know in this dataset, or you find anything that identifies a person, open an issue on this repository with the case id. The row and image are removed.

## Intended use

Evaluation of scam-warning systems: does a model give a frightened reader the right verdict, name the fee, document or handle in question, and say what to do next. Not for training a model that writes scam messages, and not for identifying any person.

## Known limits

- The set is small. A difference of a few points between two systems is noise.
- Real labels are drafts. Verdicts on ambiguous images are judgement calls.
- Real images come from a few apps and campaigns. They do not cover every scam type or language.
- Redaction removes visible identity, not the style of a campaign. Text in messages can still point to a known scam.
- Redacted images differ from what a user sees, so scores can differ from scores on original screenshots.

## Verdict split

Synthetic by expected verdict:

| Verdict | Images |
| --- | --- |
{{SYN_BY_VERDICT}}

Real by app:

| App | Images |
| --- | --- |
{{REAL_BY_APP}}

Real by expected verdict:

| Verdict | Images |
| --- | --- |
{{REAL_BY_VERDICT}}

## Licence

CC BY-NC 4.0. Use is non-commercial and needs attribution.
