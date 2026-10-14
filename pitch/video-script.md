# SafeRoute demo video script

Target length: under 3:00. Voice-over pace: 140 words per minute.

| Time | On screen | Voice-over | Caption |
| --- | --- | --- | --- |
| 0:00-0:12 | Full-screen phone: a job ad on a social feed. Text: Customer Service Staff, Thailand. USD 1,800. Free flight and visa. Only 5 places left. Slow zoom on the Telegram handle. | This is a real-style job ad. Eighteen hundred dollars a month, free flight, no experience. Rina is twenty-four, and she is about to send her passport. | "Would you say yes?" |
| 0:12-0:32 | Title card, then three numbers one by one: 220,000+ / $442 bn / 15 s. Cut to a soft map of Thailand, Myanmar, Cambodia. | Ads like this feed scam compounds. The UN says at least one hundred twenty thousand people in Myanmar and another hundred thousand in Cambodia may be held there. Global scam losses reach four hundred forty-two billion dollars a year. Victims decide in minutes. We check in seconds. | 220,000+ people may be held in forced scam work (OHCHR, 2023). $442 bn lost to scams (GASA, 2025). |
| 0:32-1:02 | Demo flow 1. Web demo or app, Check a job offer screen. Language chip set to Myanmar. Paste the job post from demo-inputs.md, tap Analyse. Six-stage progress, then the red Danger screen with the evidence list. Tap Listen. | Flow one. Rina pastes the post and picks Burmese. Gemini reads it and finds the flags: pay too good, no visa, a passport request, and a border pickup. Then it searches the web for the company and finds nothing. The verdict is danger. She taps Listen, and hears the warning in Burmese. | Flow 1: paste a job post. Verdict: Danger. Spoken in Burmese. |
| 1:02-1:30 | Demo flow 2. Upload screenshot of the Kevin chat. Short wait on the Checking screen, then the Danger card: Love and money trap, with the grooming timeline (wrong number, loves you, secret trading app, asks for money). | Flow two is a screenshot. A stranger, three weeks of kindness, then a trading app. This is pig butchering. One multimodal Gemini call reads the image, no separate OCR, and returns structured flags. The timeline shows how the trap was built. The advice: do not send money. | Flow 2: screenshot of a chat. Gemini reads the image. |
| 1:30-1:55 | Demo flow 3. Android phone, screen recording. Social feed with the sample job post. Tap the floating Shield bubble. Tap See more, tap the Shield again. Colour verdict fills the screen: Danger, orange-red. Small beat on Safe and Careful chips. | Flow three works inside any app. A floating Shield sits over the feed. One tap, and the post is checked. Safe is blue. Careful is amber. Danger is orange-red, with one word and a voice. No typing, no reading needed. | Flow 3: the floating Shield on Android. Safe, Careful, Danger. |
| 1:55-2:20 | Architecture diagram: Capture, Extract, Detect, Correlate, Score, Explain with Google logos or labels: Cloud Run, Gemini on Vertex AI, Google Search grounding, Web Risk, rules engine, Gemini text-to-speech. Highlight Score. | Behind the button is a six-stage pipeline on Cloud Run. Gemini extracts the evidence. Google Search grounding verifies the recruiter. Web Risk and domain age check each link. Then a deterministic rules engine decides the score, so the model cannot invent a danger verdict. Gemini speaks the result. | Cloud Run + Gemini + Search grounding + Web Risk. A rules engine decides. |
| 2:20-2:40 | Family Guardian screen: Ibu sees the missed check-in alert. Then a stat card: cost per check, estimate. Autoscaling graphic. | Rina can share the result with her mother, who gets an alert if a check-in is missed. One check costs under one cent without web grounding, and about four cents with it. This is an estimate. Cloud Run scales with demand, and there is no database to size. | Estimated cost: about $0.006 to $0.04 per check. |
| 2:40-2:55 | Logo and tagline on dark. Web demo URL. Team names. | SafeRoute. A shield in the language people speak, on the phone they already own. Check before you say yes. | SafeRoute. Check before you say yes. [DEPLOYED URL] |

## Word count and runtime

| Segment | Words | Seconds at 140 wpm |
| --- | --- | --- |
| 0:00-0:12 | 26 | 11 |
| 0:12-0:32 | 47 | 20 |
| 0:32-1:02 | 52 | 22 |
| 1:02-1:30 | 47 | 20 |
| 1:30-1:55 | 40 | 17 |
| 1:55-2:20 | 48 | 21 |
| 2:20-2:40 | 47 | 20 |
| 2:40-2:55 | 19 | 8 |
| **Total** | **326** | **140 (about 2:20)** |

The shot list ends at 2:55. Spoken time is shorter than the shot list because of pauses at screen changes.

## Recording checklist

- Device: one physical Android phone (Android 10 or later, 1080x2400) with the SafeRoute build installed and the Shield overlay permission granted. Set the phone to Do Not Disturb, 100% battery or plugged in, clean home screen, no notifications.
- Screen recorder: the Android built-in screen recorder at 1080p, 30 fps, with touches shown (Developer options, Show taps). Record the web demo with OBS at 1920x1080 in a Chrome window set to a 390x844 phone size.
- Voice-over: record separately in a quiet room with a USB microphone, then lay it over the screen capture. Read from this table. Leave a half-second pause at every cut.
- Burmese audio: play the app's spoken warning (Gemini text-to-speech) with the phone volume at 70% and capture it with system audio, not the microphone.
- Test inputs: all texts, the chat and the SMS are in `pitch/demo-inputs.md`. Prepare the chat screenshot image and the social feed post before recording.
- Backend: confirm `GET /healthz` returns `"mock": false` before recording. Run each flow once before the take, so the Cloud Run instance is warm and the first check is not slow.
- Take order: flow 1, flow 2, flow 3, then the diagram and the Family Guardian screen. Re-record any take where the check takes longer than 10 seconds.
- Captions: burn in the caption column. Keep every caption under 12 words and on screen for at least 3 seconds.
- Slides and figures: the 220,000+ and $442 bn numbers come from slide 3 of the deck. Show the source line on screen when they appear.
- Final check: total length under 3:00, no real company names or phone numbers visible, no personal notifications in the recording.
