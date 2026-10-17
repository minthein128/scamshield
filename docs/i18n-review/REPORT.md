# SafeRoute language review: how the languages work today

TLDR: all four non-English languages have every key, and none has a human review. Burmese has the most automatic flags (121 of 516) and the weakest model coverage, so it needs a native reviewer first. Verdict copy from the backend reads well and keeps its hedges in most cases, with a few exceptions listed below. Spoken warnings work in my, id and tl.

Generated 2026-10-15 from commit `3d1bf79`. Files in this folder: `languages-to-check.json` (main review file), `languages-to-check.csv` (same items for spreadsheets), `verdict-samples.json` (live backend samples). The merge script is `scripts/i18n-apply-review.mjs`. No app code, translation or locale file was changed.

## How the pre-screen was made

- Back-translation: `gemini-3.7-flash` translated each translation back to English with no sight of the English source or the key name.
- Review: `gemini-3.8-flash` compared English, translation and back-translation against the house rules and glossary, with the UI context. The UI strings were translated by `gemini-3.8-flash`, so the reviewer shares blind spots with the translator. The stronger Pro models timed out on this key, so they were not used.
- Automatic checks (no model): placeholder parity, length ratio above 1.8 or below 0.4 (in characters), leftover Latin text in my and th, empty values, strings identical to English, glossary terms, and Zawgyi and Unicode-order checks for Burmese. A hit raises the flag to at least `check`.
- Flags: `ok`, `check`, `likely_wrong`. The model was told to use `check` when unsure. An `ok` is not a pass.

## Coverage per language

| Language | Keys | Keys translated | Effectively translated (not English copy) | Namespaces reviewed | Strings with no review |
| --- | --- | --- | --- | --- | --- |
| Burmese (my) | 516 | 100% | 97.9% (11 English copies) | 0 of 15 | 100% |
| Bahasa Indonesia (id) | 516 | 100% | 97.9% (11 English copies) | 0 of 15 | 100% |
| Tagalog (tl) | 523 | 100% | 97.2% (15 English copies) | 0 of 15 | 100% |
| Thai (th) | 516 | 100% | 97.9% (11 English copies) | 0 of 15 | 100% |

English has 523 keys. Burmese, Bahasa and Thai have 516 because they use one plural form (`_other`). Tagalog has 523. Every file has `_meta.reviewed: false`.

Items marked safety: 242 per language (about 47%). The Learn namespace alone is 142 keys.

## Automated findings

| Language | Items | ok | check | likely_wrong | Safety items not ok |
| --- | --- | --- | --- | --- | --- |
| Burmese | 516 | 395 | 118 | 3 | 66 of 242 |
| Bahasa Indonesia | 516 | 478 | 38 | 0 | 22 of 242 |
| Tagalog | 523 | 439 | 80 | 4 | 40 of 242 |
| Thai | 516 | 481 | 33 | 2 | 23 of 242 |

Automatic check hits per language:

| Language | length | latin | identical | mmorder | zawgyi |
| --- | --- | --- | --- | --- | --- |
| Burmese | 65 | 13 | 0 | 2 | 0 |
| Bahasa Indonesia | 10 | 0 | 2 | 0 | 0 |
| Tagalog | 30 | 0 | 20 | 0 | 0 |
| Thai | 18 | 0 | 0 | 0 | 0 |

The model gave Burmese 77% `ok` and the other languages 84% to 93%. That gap most likely shows the model's weaker Burmese, not better Burmese text. Treat Burmese `ok` as unconfirmed.

### Worst 15 items per language

Ranked by flag, then the model's severity score, then safety priority.

#### Burmese (my)

| Item | English | Translation | Back-translation | Problem |
| --- | --- | --- | --- | --- |
| `common.scamTypes.other` (likely_wrong) | Suspicious message | မသင်္ကာစရာ မက်ဆေ့ခ်ျ | Suspicious message | Non-canonical Unicode in 'မက်ဆေ့ခ်ျ': asat is ordered before medial ya (should be U+103B then U+103A 'မက်ဆေ့ချ်'), causing font rendering and search glitches. |
| `feedback.reportScam.placeholder` (likely_wrong) | The message, job post or chat | မက်ဆေ့ခ်ျ၊ အလုပ်ခေါ်စာ သို့မဟုတ် ချက်တင် | Message, job announcement or chat | Non-canonical Unicode in မက်ဆေ့ခ်ျ (asat before medial ya). Causes rendering artifacts; should be မက်ဆေ့ချ်. |
| `home.quick.link` (likely_wrong) | Paste link | လင့်ခ် | Link | Missing the action verb 'Paste'; translation only says 'Link' (လင့်ခ်). Should be လင့်ခ်ကူးထည့်ရန် or လင့်ခ် ထည့်ပါ။ |
| `common.scamTypes.fake_agency` (check) | Recruitment agency that looks risky | အန္တရာယ်ရှိနိုင်ပုံပေါ်သော အေဂျင်စီ | Agency that appears to be dangerous | 'Recruitment' is omitted; translation only says 'agency' (အေဂျင်စီ). Should specify recruitment/job agency ('အလုပ်အကိုင် အေဂျင်စီ') for migrant workers. |
| `learn.scams.jobs.signs.s2` (check) | Only a few places left. Leave this week. | လူနည်းနည်းပဲ ကျန်တော့တယ်။ ဒီအပတ်ထဲ ထွက်ရမယ်။ | Only a few people left. Must leave within this week. | 'လူနည်းနည်းပဲ ကျန်တော့တယ်' means 'only a few people left' rather than 'only a few places/openings left' (e.g. နေရာ အနည်းငယ်သာ ကျန်တော့သည်). |
| `learn.guide.exampleNote` (check) | Example. Names and posts are made up. | နမူနာသာ ဖြစ်ပါသည်။ အမည်များနှင့် ပို့စ်များကို လုပ်ကြံဖန်တီးထားခြင်း … | It is only a sample. Names and posts are fabricated. | 'လုပ်ကြံဖန်တီးထားခြင်း' carries a harsh connotation of malicious fabrication or plotting. For fictional UI examples, consider 'စိတ်ကူးယဉ် ဖန်တီးထားခြင်း' or 'ဥ… |
| `common.families.pressure` (check) | Pressure | အလောတကြီး ဖိအားပေးခြင်း | Hastily pressuring | Exceeds 15-character limit (23 chars). Shorten to ဖိအားပေးခြင်း to fit card badge without overflow. |
| `common.families.identity` (check) | Identity | မည်သူမည်ဝါဖြစ်ကြောင်း | Identity | 'မည်သူမည်ဝါဖြစ်ကြောင်း' is formal, long (21 chars), and may overflow UI chip limits; consider shorter wording like 'မည်သူမည်ဝါ'. |
| `learn.actions.noPay.title` (check) | Don't pay, don't send documents | ငွေမလွှဲပါနှင့်၊ စာရွက်စာတမ်းများ မပို့ပါနှင့် | Do not transfer money, do not send documents | 'ငွေမလွှဲပါနှင့်' specifically means don't transfer money; check if 'ငွေမပေးပါနှင့်' (don't pay) is safer to include in-person cash payments to brokers. |
| `learn.scams.romance.howItStarts` (check) | A stranger writes to you by mistake and is kind. After days or weeks … | လူစိမ်းတစ်ယောက်က မှားပြီး စာပို့မိရာမှ စကားစပြောလာပါတယ်။ ရက်ပိုင်း သိ… | A stranger starts talking from having sent a message by mistake. Afte… | Contains parenthetical English '(trading) app' which may confuse low-literacy readers; also mixes written 'ရသည်ဟု' with spoken 'ပါတယ်'. |
| `learn.examples.agency.e2.caption` (check) | It looks for the licence and for reports about the agency. | လိုင်စင်နှင့် အေဂျင်စီအကြောင်း တိုင်ကြားထားမှုများကို စစ်ဆေးရှာဖွေပေး… | Checks and searches complaints about the license and the agency. | Phrasing 'လိုင်စင်နှင့် အေဂျင်စီအကြောင်း တိုင်ကြားထားမှုများ' may imply complaints about the licence rather than checking the licence itself plus reports. |
| `report.webRisk.malware` (check) | Malware warning | မဲလ်ဝဲ သတိပေးချက် | Malware warning | Low-literacy workers may not understand transliterated loanword 'မဲလ်ဝဲ' (malware); verify if familiar phrasing or virus is preferred. |
| `report.warnMessage` (check) | SafeRoute warning ({{verdict}}): {{title}}. {{summary}} Please do not… | SafeRoute သတိပေးချက် ({{verdict}})- {{title}}။ {{summary}} ကျေးဇူးပြု… | SafeRoute warning ({{verdict}}): {{title}}. {{summary}} Please do not… | 'ကျွန်တော့်ကို' is male gender-specific ('call me'). Consider a gender-neutral pronoun like 'ကျွန်ုပ်ကို' or plain 'ငါ့ကို/ကျွန်တော့်/ကျွန်မ' or omit the prono… |
| `learn.guide.howItStarts` (check) | How it starts | စတင်ပုံ | How to start | 'စတင်ပုံ' commonly means 'how to get started' (onboarding); for how a scam starts, verify if 'စတင်ဖြစ်ပွားပုံ' is clearer. |
| `radar.trend.flat` (check) | Steady | အပြောင်းအလဲမရှိပါ | No change | Length exceeds 12-character limit (17 chars); consider shorter term like ပုံမှန် for a trend chip instead of အပြောင်းအလဲမရှိပါ. |

#### Bahasa Indonesia (id)

| Item | English | Translation | Back-translation | Problem |
| --- | --- | --- | --- | --- |
| `learn.scams.romance.hook` (check) | A friendly stranger who later pushes crypto or trading. | Orang asing yang ramah lalu mengajak kripto atau trading. | A friendly stranger then invites to crypto or trading. | Low-literacy readers often read 'orang asing' as 'foreigner'; consider 'Orang tak dikenal' as used in item 15. Also 'mengajak kripto' is awkward. |
| `report.webRisk.clean` (check) | No known threats | Tidak ada ancaman yang ditemukan | No threats found | Exceeds 29-character limit (32 chars). Also translates 'known' as 'ditemukan' (found) rather than 'diketahui', making the verdict sound more certain than inten… |
| `contacts.footnote.synced` (check) | Your contacts are synced to your account. | Kontak Anda diselaraskan dengan akun Anda. | Your contacts are synchronized with your account. | 'diselaraskan' is stiff/formal for low-literacy users. Consider 'disinkronkan' or simpler phrasing like 'tersimpan di akun Anda'. |
| `contacts.warn.title` (check) | Warn someone you trust | Beri tahu orang tepercaya | Notify trusted person | 'Beri tahu' means inform rather than warn; check if 'orang yang Anda percaya' is more natural than 'orang tepercaya'. |
| `errors.api.rate_limited.message` (check) | Wait a little and try again. A free account gets a higher limit. | Tunggu sebentar lalu coba lagi. Akun gratis mendapat batas lebih bany… | Wait a moment then try again. Free accounts get more limit. | 'Batas lebih banyak' sounds awkward; consider 'batas lebih tinggi' (higher limit) or 'kuota pemeriksaan lebih banyak'. |
| `errors.rateLimitedWait` (check) | Try again in about {{wait}}. A free account gets a higher limit. | Coba lagi dalam sekitar {{wait}}. Akun gratis mendapat batas lebih ba… | Try again in about {{wait}}. Free accounts get more limit. | 'dalam sekitar' is awkward phrasing (choose either 'sekitar' or 'dalam'); also 'batas lebih banyak' should preferably be 'batas lebih tinggi'. |
| `report.webRisk.social_engineering` (check) | Phishing or deception warning | Peringatan phishing atau penipuan | Phishing or scam warning | Consider whether English loanword 'phishing' is understood by low-literacy users, or if a plain term like 'pengelabuan' or combining into simple scam terminolo… |
| `settings.privacy.p1` (check) | Your checks are saved on this device. Signed-in accounts also sync th… | Hasil periksa Anda disimpan di perangkat ini. Akun yang masuk juga me… | Your check results are stored on this device. Logged-in accounts also… | 'Akun yang masuk' is awkward phrasing for 'Signed-in accounts'; consider 'Jika masuk dengan akun...' alongside 'disinkronkan' instead of 'menyelaraskan'. |
| `settings.privacy.p4` (check) | You can delete the data on this device at any time. Account holders c… | Anda dapat menghapus data di perangkat ini kapan saja. Pemilik akun j… | You can delete data on this device anytime. The account owner can als… | 'diselaraskan' is formal/bureaucratic for low literacy; consider 'disinkronkan' or 'tersimpan di akun'. |
| `feedback.choices.parcel_phishing` (check) | Parcel or fee link | Paket atau tautan biaya | Package or fee link | Verify if 'tautan biaya' is natural for low-literacy users; 'tautan pembayaran' or 'link tagihan' might be clearer. |
| `learn.guide.exampleNote` (check) | Example. Names and posts are made up. | Contoh. Nama dan kiriman hanya rekaan. | Example. Names and posts are only fictional. | The word 'rekaan' is literary and formal for low-literacy readers. Consider simpler wording like 'bukan sungguhan' or 'hanya contoh'. |
| `learn.shieldSteps.s1.title` (check) | Turn on the shield | Nyalakan pelindung | Turn on protector | Verify if 'shield' refers to the feature 'Screen shield', which should stay in English per glossary. |
| `onboarding.how.warn.body` (check) | Send a warning to people you trust and find official hotlines for the… | Kirim peringatan ke orang yang Anda percayai dan temukan nomor bantua… | Send alerts to people you trust and find official help numbers for th… | 'negara yang Anda tuju' narrows 'countries you care about' to destination country only; consider 'negara yang Anda pilih' or 'negara terkait' to include home c… |
| `check.errors.clipboardEmpty` (check) | Your clipboard is empty. | Papan klip Anda kosong. | Your clipboard is empty. | Verify if 'papan klip' is easily understood by low-literacy users, or if phrasing like 'Belum ada teks yang disalin' would be clearer. |
| `errors.api.bad_request.title` (check) | We could not read that | Kami tidak dapat membaca itu | We cannot read that | 'Kami tidak dapat membaca itu' is a literal phrasing; 'Kami tidak dapat membacanya' sounds much more natural in Indonesian. |

#### Tagalog (tl)

| Item | English | Translation | Back-translation | Problem |
| --- | --- | --- | --- | --- |
| `common.offlineDemo` (likely_wrong) | Offline demo mode | Offline demo mode | Offline demo mode | Untranslated English left in; translate 'Offline demo mode' for low-literacy users. |
| `help.categories.trafficking` (likely_wrong) | Anti-trafficking | Anti-trafficking | Anti-trafficking | Left in English. Consider 'Laban sa human trafficking' or 'Kontra-trafficking' for low-literacy clarity, though 'Anti-trafficking' is common. |
| `feedback.choices.fake_agency` (likely_wrong) | Recruitment agency | Recruitment agency | Recruitment agency | Left untranslated; 'Recruitment agency' is widely understood in the Philippines, but verify if plain phrasing is preferred. |
| `check.source.screenshotAt` (likely_wrong) | Screenshot, {{place}} | Screenshot, {{place}} | Screenshot, {{place}} | Auto: identical to English (left untranslated) |
| `contacts.footnote.local` (check) | Your contacts are saved on this device. Sign in to keep them if you c… | Naka-save ang iyong contacts sa device na ito. Mag-sign in para maita… | Your contacts are saved on this device. Sign in to keep them if you c… | 'maitago' usually means to hide or conceal; consider 'hindi mawala' or 'mapanatili' for keeping/retaining contacts across devices. |
| `feedback.reportScam.intro` (check) | Tell us about a scam you saw. We remove names, numbers and links befo… | Ibahagi sa amin ang scam na nakita mo. Inaalis namin ang mga pangalan… | Share with us the scam you saw. We remove names, numbers, and links b… | 'Itago' means 'to hide'; in data storage contexts, 'i-save' or 'itabi' is clearer and avoids implying secretive concealment. |
| `learn.examples.shop.e4.caption` (check) | SafeRoute shows the signs that make this deal look risky. | Ipinapakita ng SafeRoute ang mga senyales na nagpapakitang mapanganib… | SafeRoute shows the signs that show this offer is dangerous. | "nagpapakitang mapanganib" asserts the deal is dangerous; consider "mukhang mapanganib" to keep the hedging from English "look risky". |
| `feedback.choices.parcel_phishing` (check) | Parcel or fee link | Parcel o link ng bayarin | Parcel or bill link | Consider using 'Padala' instead of 'Parcel', as 'padala' is far more recognizable for Filipino migrant workers. |
| `common.scamTypes.romance_pig_butchering` (check) | Possible romance or investment scam | Posibleng romance o investment scam | Possible romance or investment scam | Inconsistent with item 12 which translates 'scam' as 'panloloko'; verify if 'scam' or 'panloloko' is better understood by low-literacy users. |
| `help.openSite` (check) | Open reporting site | Buksan ang website para sa pag-uulat | Open the website for reporting | Character length 36 exceeds limit 35. Consider shortening 'website para sa pag-uulat' to 'site para sa pag-uulat' or 'ulat website'. |
| `learn.examples.jobs.e1.caption` (check) | A big salary, free flight and no experience needed. | Malaking sahod, libreng lipad at walang kailangang karanasan. | Big salary, free flight and no needed experience. | 'libreng lipad' sounds unnatural for free flight/plane ticket; consider 'libreng pamasahe sa eroplano' or 'libreng flight'. |
| `learn.examples.parcel.e2.title` (check) | Tap to see why | Pindutin para makita kung bakit | Press to see why | Exceeds length limit of 26 characters (31 chars). Consider shortening to 'Tingnan kung bakit' to avoid UI overflow. |
| `feedback.sheet.titleSafe` (check) | What kind of scam was it? | Anong uri ng scam ito? | What kind of scam is this? | Rule check: uses 'scam' directly ('Anong uri ng scam ito?'), verify if acceptable in user reporting context. |
| `feedback.sheet.itWasSafe` (check) | I think it was safe | Sa tingin ko ligtas ito | I think this is safe | House rule states safe verdict must never read 'Safe', though here it is user feedback ('ligtas ito'). Check if acceptable. |
| `feedback.sheet.different` (check) | I think it was a different scam | Sa tingin ko ibang scam ito | I think this is another scam | House rule restricts direct scam labelling; verify if acceptable in user feedback option 'ibang scam ito'. |

#### Thai (th)

| Item | English | Translation | Back-translation | Problem |
| --- | --- | --- | --- | --- |
| `learn.scams.jobs.signs.s5` (likely_wrong) | The recruiter has no company name and only uses a private chat app. | คนหางานไม่มีชื่อบริษัท และคุยผ่านแอปแช็ตส่วนตัวเท่านั้น | Job recruiter has no company name, and talks via personal chat app on… | 'คนหางาน' means job seeker, not recruiter. Use 'ผู้รับสมัครงาน' or 'นายหน้า' instead. |
| `learn.examples.shop.e4.caption` (likely_wrong) | SafeRoute shows the signs that make this deal look risky. | SafeRoute แสดงสัญญาณเตือนที่ทำให้ข้อเสนอนี้ดูน่าเสี่ยง | SafeRoute displays warning signs that make this offer look risky | 'น่าเสี่ยง' means 'worth taking a risk/tempting gamble', reversing the warning. Use 'ดูมีความเสี่ยง' instead of 'ดูน่าเสี่ยง'. |
| `help.unverified` (check) | We have not verified an official hotline for {{country}} yet. Contact… | เรายังไม่ได้ตรวจสอบสายด่วนที่เป็นทางการของ {{country}} โปรดติดต่อสถาน… | We have not yet verified the official hotline of {{country}}, please … | 'สถานทูตใกล้บ้าน' translates 'nearest embassy' as 'embassy near your home', which can confuse migrants abroad. Consider 'สถานทูตที่ใกล้ที่สุด'. |
| `report.webRisk.clean` (check) | No known threats | ไม่พบสิ่งอันตราย | No dangerous things found | Check if 'ไม่พบสิ่งอันตราย' drops the hedging of 'known' threats, potentially over-promising safety to users. |
| `feedback.reportScam.source` (check) | Reported scam | เรื่องหลอกลวงที่ได้รับแจ้ง | Scams that have been reported | Contains 26 characters (limit 24); 'เรื่องหลอกลวง' sounds definitive rather than hedge. Consider shortening to 'รายงานการหลอกลวง'. |
| `learn.guide.howItStarts` (check) | How it starts | เริ่มต้นอย่างไร | How to start | 'เริ่มต้นอย่างไร' can be misunderstood as 'how to get started'. Consider 'จุดเริ่มต้น' or 'กลโกงนี้เริ่มอย่างไร'. |
| `checking.verdict.careful` (check) | Hmm, be careful | อืม ระวัง | Hmm, be careful | 'อืม' is a literal translation of filler 'Hmm' and sounds awkward in Thai UI; consider simplifying to 'ระวัง' or 'ควรระวัง'. |
| `errors.api.network.title` (check) | You are offline | คุณไม่ได้เชื่อมต่ออินเทอร์เน็ต | You are not connected to the internet | Exceeds character limit (30 vs 27 chars). Consider shortening to 'ไม่มีอินเทอร์เน็ต'. |
| `help.intro` (check) | Official hotlines and reporting lines. If someone is holding your pas… | สายด่วนและช่องทางแจ้งเรื่องที่เป็นทางการ หากมีคนยึดพาสปอร์ต ไม่ยอมให้… | Hotlines and official reporting channels. If someone seizes your pass… | 'ไม่ยอมให้คุณเดินทาง' translates 'stopping you from leaving' specifically as traveling abroad; consider 'ไม่ยอมให้คุณออกไป' or 'ไม่ให้ไปไหน'. |
| `learn.scams.romance.hook` (check) | A friendly stranger who later pushes crypto or trading. | คนแปลกหน้าที่ดูเป็นมิตร แล้วชวนเล่นคริปโตหรือเทรดหุ้น | A stranger who looks friendly, then invites to play crypto or trade s… | 'ชวน' softens 'pushes', and 'เทรดหุ้น' narrows general 'trading' specifically to stocks. |
| `learn.flags.pressure.title` (check) | Pressure | การกดดันและเร่งรัด | Pressuring and rushing | At 18 characters, exceeds the 15-character limit and may overflow. Consider simpler 'เร่งรัด' or 'การกดดัน'. |
| `report.block.withValue` (check) | Block {{value}} in the app where you found it. | บล็อก {{value}} ในแอปที่คุณได้รับข้อความ | Block {{value}} in the app where you received the message | Translates 'where you found it' specifically as 'where you received the message' (ที่คุณได้รับข้อความ). Check if sender could be found elsewhere (e.g. social p… |
| `report.block.generic` (check) | Block and report the sender in the app where you found it. | บล็อกและรายงานผู้ส่งในแอปที่คุณได้รับข้อความ | Block and report sender in the app where you received the message | Translates 'where you found it' as 'where you received the message' (ที่คุณได้รับข้อความ). Verify if context is strictly message-based. |
| `feedback.row.down` (check) | No, this was wrong | ไม่ใช่ ยังไม่ถูกต้อง | No, not yet correct | 'ยังไม่ถูกต้อง' means 'not yet correct' rather than 'was wrong'. Consider 'ไม่ใช่ ไม่ถูกต้อง' for clarity. |
| `learn.shieldRow.title` (check) | How the Screen shield works | วิธีใช้งาน Screen shield | How to use Screen shield | 'วิธีใช้งาน' means 'how to use' rather than 'how it works' ('Screen shield ทำงานอย่างไร'). |

The model's reasons are leads, not facts. Some notes are wrong or over-eager (for example it flags Taglish loanwords such as "Recruitment agency" as `likely_wrong`, and it states pronoun and word-sense claims it cannot be sure of). A native reviewer decides each one.

## Systematic issues

**Terminology and the glossary.** The fixed glossary terms (Low risk, Be careful, High risk, Scam radar, Trusted contacts, SafeRoute, Screen shield) pass the automatic check in every language. Gaps remain around them:
- Thai uses "มิจฉาชีพ" (scammer, a person) in the glossary term for Scam radar ("เรดาร์มิจฉาชีพ", 3 strings), in `help.categories.cybercrime` and in `settings.privacy.shareBody`. The house rule says to describe signs and never call people scammers. A Thai reviewer should pick a sign-based word.
- Bahasa uses "pelindung" for "shield" in `learn.shieldSteps.s1.title`, while the glossary keeps "Screen shield" in English. Burmese uses "Shield" alone in several shield errors.
- Tagalog mixes "scam" and "panloloko". Bahasa mixes "penipuan" and "phishing" and "tautan" and "link". Burmese uses Latin "app", "store" and "trading" in 13 strings where a Burmese word may exist. Low-literacy readers may not read Latin script.
- "Recruitment agency" is left in English in Tagalog in two places, which may be acceptable Taglish. Native review decides.
- Thai `learn.scams.jobs.signs.s5` says "คนหางาน" (job seeker) where the English means recruiter. This changes the meaning of a warning sign.

**Register and tone.** Burmese mixes two styles. The UI files use written endings ("ပါသည်", 94 strings) with some spoken endings ("ပါတယ်", 19 strings). The server verdict titles and action labels are written style, while the model-written summary, spoken warning and the prompt's examples are spoken style. A reader sees both in one result card. Bahasa has a few stiff words for low literacy ("diselaraskan", "muluk", "rekaan", "papan klip", "phishing"). Tagalog has a few formal or literary words ("estranghero", "Pakiusap"). The model also flagged a gender-specific pronoun in the Burmese `report.warnMessage` text that the user sends to family.

**Certainty wording.** The UI copy mostly kept the hedges. Items to review:
- `report.webRisk.clean` ("No known threats") is "Tidak ada ancaman yang ditemukan" in Bahasa and "ไม่พบสิ่งอันตราย" in Thai. Both drop "known" and read as "no threats found", which sounds safer than the English.
- Tagalog `learn.examples.shop.e4.caption` says the deal "shows it is dangerous" ("nagpapakitang mapanganib") where the English says "look risky".
- Thai uses "หลอกลวง" (deceit) as a plain noun for "a scam" in 13 places. It describes the act, not a person, so it is likely acceptable. A reviewer should confirm it does not read as a verdict.
- Thai `learn.examples.shop.e4.caption` uses "น่าเสี่ยง", which the model says reads as "worth the risk". A Thai reviewer should confirm.
- No Zawgyi text was found. Two Burmese strings use a non-canonical order for "မက်ဆေ့ချ်" (asat before the medial), which may render or search badly.

**Overflow.** Length is measured in characters. Median length ratio to English: Burmese 1.36, Tagalog 1.26, Bahasa 1.15, Thai 1.00. Strings over 1.8x: Burmese 65, Tagalog 30, Thai 18, Bahasa 10. Burmese is the largest risk, but the character count overstates it, because Burmese uses many combining marks that take little width. These counts show where to look first in the app with the A10 YoeShin font (chips, tabs, `common.families.*`, `radar.trend.*`, `help.openSite`). Nobody has rendered these on a device in this review.

## The backend verdicts

Method: 6 live checks for each of my, id and tl (18 total) through the local server built from this commit, model `gemini-3.5-flash-lite`, `kind` as listed in the JSON, `shareSignals: false`. The inputs are English text. Real users will paste Burmese, Indonesian or Tagalog text, so this tests the reply language, not input handling. Network intel was off (no `INTEL_PEPPER` was loaded) so the run could not read or write the shared Firestore. Full text, back-translations and per-field flags are in `verdict-samples.json`. The title and action labels are fixed server strings in `server/src/explain.ts`; they are in `server_static_copy` in the same file.

| Scenario | my | id | tl |
| --- | --- | --- | --- |
| trafficking_job | danger 100, hedged, nat 4, 2 field(s) to check, 3.3s | danger 100, hedged, nat 5, 0 field(s) to check, 2.1s | danger 100, hedged, nat 5, 0 field(s) to check, 2.6s |
| pig_butchering_chat | danger 100, hedged, nat 4, 2 field(s) to check, 3.0s | danger 100, hedged, nat 4, 1 field(s) to check, 2.9s | danger 100, hedged, nat 4, 1 field(s) to check, 2.8s |
| parcel_sms | danger 77, hedged, nat 5, 0 field(s) to check, 3.6s | danger 100, hedged, nat 4, 2 field(s) to check, 4.1s | danger 100, hedged, nat 4, 1 field(s) to check, 4.9s |
| fake_agency | danger 98, hedged, nat 5, 0 field(s) to check, 3.0s | danger 98, hedged, nat 5, 0 field(s) to check, 2.9s | danger 100, hedged, nat 5, 0 field(s) to check, 2.7s |
| marketplace_listing | danger 100, hedged, nat 5, 0 field(s) to check, 3.9s | danger 100, hedged, nat 5, 0 field(s) to check, 2.1s | danger 100, hedged, nat 5, 0 field(s) to check, 2.6s |
| legitimate_message | safe 0, hedged, nat 5, 0 field(s) to check, 2.1s | safe 0, hedged, nat 4, 1 field(s) to check, 2.3s | safe 0, hedged, nat 5, 2 field(s) to check, 2.0s |

Every scam input scored danger (77 to 100). The legitimate message scored safe (0) in all three languages. No sample used "is a scam", "fake" or "scammer" as a verdict. Titles use "warning signs" language in all three.

**Hedging.** Most output keeps the likelihood tone ("shows warning signs", "tanda bahaya", "senyales"). Exceptions I found when reading the text, besides the model's own flags:
- Bahasa parcel SMS: the `known_bad` flag label reads "Domain tersebut diasosiasikan dengan penipuan phishing pengiriman yang menyamar sebagai J&T Express." The input never said the domain was reported, and the prompt allows `known_bad` only when the input says so. This claims a link to a known scam without evidence. It is a prompt-following issue, not only a translation one.
- Burmese pig-butchering summary: "လှည့်စားကာ" (deceiving) states deceit as fact.
- Tagalog pig-butchering summary: "huwad na ugnayan" (fake relationship) states the relationship is fake.
- Tagalog legitimate message: "Mukhang ligtas" (looks safe) in the spoken warning and "ligtas" in the summary. The rule is "no major warning signs", never "safe".
- Bahasa legitimate message: "tanda-tanda ancaman" (threat signs) is slightly off for "warning signs".
- Burmese trafficking summary says the passport "will be taken" ("ပတ်စပို့သိမ်းမည့်") as a plain future fact. The post said the recruiter would keep it. Reviewers should check that it reads as a claim of the post.
- One Burmese flag label has a typo: "အကန့်အမြတ်" for "အကန့်အသတ်" (limited).

**Naturalness.** The model rated Bahasa and Tagalog 4 to 5 of 5 and Burmese 4 to 5. It is not native and is weakest in Burmese, so these scores are weak evidence. Bahasa and Tagalog read as plain, kind advice with the "don't pay, don't send your passport, ask someone you trust" structure that the prompt asks for. Burmese follows the prompt's example sentences closely, which means the tone is copied from the examples, not independently checked.

## Spoken warnings

`/v1/speak` returned 200 for all three languages with the `gemini-3.8-flash-tts` model and the voice Kore, using the spoken warning from the trafficking sample.

| Language | Text length | Duration | Latency | Round-trip transcript |
| --- | --- | --- | --- | --- |
| my | 2 short sentences | 8.85 s | 4.4 s | Matches the text (one small spelling difference in "passport") |
| id | 2 short sentences | 8.05 s | 4.2 s | Matches the text |
| tl | 2 short sentences | 6.97 s | 3.2 s | Matches the text |

I cannot listen to audio. To get some evidence, I sent each WAV file to a second Gemini model and asked it to transcribe in the native script. The transcripts match the input text in all three languages, which shows the speech is intelligible and in the right language to a model. It does not show accent, tone, stress, natural rhythm or a pleasant voice. The same voice (Kore) is used for every language. A native speaker must listen to each language, in particular Burmese. Durations are 7 to 9 seconds for a 20-word limit, which is slow-ish but suitable for the audience. Thai has no spoken warning because the Thai UI uses English verdicts.

## What a model cannot judge

A native reviewer is required. The model:
- Cannot hear the audio, and cannot tell whether a Burmese voice sounds natural or odd.
- Is weak in Burmese. It passes fluent-looking Burmese that a native reader may find wrong, and its Burmese corrections may themselves be wrong. Expect false `ok` results and false alarms. Burmese safety strings (verdict labels, flag explanations, hotline and Get help text, scam guide warnings, privacy and consent text) must be read by a Burmese speaker, with priority over everything else.
- Cannot tell regional or local usage: which word a Myanmar migrant worker in Thailand really uses for "passport", "agent" or "broker", or what Filipino workers say for "padala", "remittance" or "recruiter".
- Cannot see how text renders: font fallback, line breaks, stacked consonants, clipped text in buttons.
- Cannot judge cultural fit: respect, honorifics, whether a warning sounds like an order or like care.
- Shares its blind spots with the translator, since both are Gemini models. A back-translation that reads fluent can hide a real meaning shift.
- Cannot confirm hotline correctness. Hotline names and notes are not in the locale files and stay in English or the official language. They need a separate check against official sources.

## Suggested review plan

Estimates use about 12 seconds plus 0.5 seconds per English character for a safety item and 6 seconds plus 0.3 seconds per character for a UI item, then add time for typing corrections.

| Reviewer | Scope | Items | Time |
| --- | --- | --- | --- |
| Burmese speaker (native, ideally a migrant worker or outreach worker) | Safety items first, then flagged UI items, then the rest | 516 | 2 to 2.5 hours for safety, 5 to 6 hours for all |
| Indonesian speaker | Flagged and safety items, then the rest | 516 | 1.5 hours for safety and flagged, 4 hours for all |
| Tagalog speaker | Same | 523 | 1.5 hours for safety and flagged, 4 hours for all |
| Thai speaker | Same, plus the question of whether Thai needs its own verdicts | 516 | 1.5 hours for safety and flagged, 4 hours for all |
| Each of my, id, tl | Verdict samples (18 checks plus fixed server copy) and a listen to the spoken warning | 6 samples each | 30 to 45 minutes each |

Order:
1. Burmese safety items, then the other languages' safety items, in parallel.
2. Flagged UI items, then the remaining UI items.
3. Verdict samples and spoken warnings.
4. Spot-check on a device for overflow after the corrections merge.
5. A second reviewer for Burmese safety strings, because the model gives the least backup there.

## How to apply corrections

1. Give reviewers `languages-to-check.csv` (UTF-8 with BOM, opens in Excel or Google Sheets) or the JSON. They fill `reviewer_verdict` with `ok` or `corrected`, and the full replacement text in `reviewer_correction`. Other values leave the item pending.
2. Run a dry run: `node scripts/i18n-apply-review.mjs docs/i18n-review/languages-to-check.json` (or pass the returned CSV). Use `--lang my` to limit it and `--locales <dir>` to point at another locale folder.
3. Read the diff summary, then add `--write`.
4. The script keeps the file layout and key order, refuses a correction that changes the `{{placeholders}}`, reports keys that do not exist, and sets `_meta.reviewed: true` only for a namespace file when every key in it has `ok` or `corrected`. For files already marked reviewed, it removes keys from `_meta.unreviewed` once answered.
5. Run `pnpm i18n:check` and open a PR with the JSON locale changes only.

I tested the script on a small fixture (one file becoming reviewed, one partly reviewed, a placeholder-changing correction, a CSV with a BOM, quotes and a multi-line cell). The dry run left the files unchanged, and `--write` produced the expected files.
