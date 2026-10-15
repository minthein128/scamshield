import { randomUUID } from 'node:crypto';
import { buildActions } from '../explain.js';
import type { Grounder } from '../ground.js';
import { rewriteCertainty } from '../language-guard.js';
import { score } from '../score.js';
import type { Flag, Lang, Source, Verdict } from '../types.js';
import { applyBorderProtection, detectConflicts, extractSingleSourceFlags, getStillUnclear, mapToAttentionTier } from './rules.js';
import type { JobAssessRequest, JobAssessResponse } from './types.js';

const SUMMARY_TEMPLATES: Record<'pause' | 'verify' | 'lower', Record<Lang, (conflictsCount: number, unclearCount: number) => string>> = {
  pause: {
    en: (c, _u) =>
      `Significant discrepancies and coercive instructions detected between the advertised job and recruiter demands (${c} conflict${c === 1 ? '' : 's'}). Pause before making payments, sending documents, or traveling.`,
    id: (c, _u) =>
      `Ditemukan perbedaan mencolok dan instruksi berisiko antara iklan pekerjaan dan permintaan perekrut (${c} konflik). Tunda sebelum melakukan pembayaran, mengirim dokumen, atau bepergian.`,
    tl: (c, _u) =>
      `May nakitang malaking pagkakaiba at mga mapanganib na tagubilin sa pagitan ng ad ng trabaho at mga hinihingi ng recruiter (${c} salungatan). Huminto muna bago magbayad, magpadala ng dokumento, o bumiyahe.`,
    my: (c, _u) =>
      `ကြော်ငြာထားသောအလုပ်နှင့် အလုပ်ခေါ်သူ၏ တောင်းဆိုချက်များအကြား သိသာထင်ရှားသော ကွဲလွဲချက်များနှင့် သတိပေးချက်များ တွေ့ရှိရပါသည် (${c} ချက် မကိုက်ညီပါ)။ ငွေလွှဲခြင်း၊ စာရွက်စာတမ်းပို့ခြင်း သို့မဟုတ် ခရီးထွက်ခြင်း မပြုမီ ရပ်တန့်စဉ်းစားပါ။`,
    th: (c, _u) =>
      `พบข้อขัดแย้งที่สำคัญและคำสั่งที่น่าสงสัยระหว่างโฆษณางานและข้อเรียกร้องของผู้รับสมัคร (${c} จุดไม่ตรงกัน) โปรดหยุดคิดก่อนโอนเงิน ส่งเอกสาร หรือออกเดินทาง`,
  },
  verify: {
    en: (_c, _u) =>
      `Some details do not match or remain unconfirmed between the job ad and chat messages. Verify the recruitment agency's official licence before proceeding.`,
    id: (_c, _u) =>
      `Beberapa rincian tidak cocok atau belum terkonfirmasi antara iklan pekerjaan dan percakapan. Periksa izin resmi agensi perekrutan sebelum melanjutkan.`,
    tl: (_c, _u) =>
      `Ilang detalye ay hindi tugma o hindi pa nakumpirma sa pagitan ng job ad at chat. I-verify ang opisyal na lisensya ng ahensya bago magpatuloy.`,
    my: (_c, _u) =>
      `အလုပ်ကြော်ငြာနှင့် စကားပြောဆိုချက်များအကြား အချို့သောအချက်အလက်များ မကိုက်ညီခြင်း သို့မဟုတ် ရှင်းလင်းမှုမရှိခြင်း တွေ့ရပါသည်။ ဆက်လက်မလုပ်ဆောင်မီ တရားဝင်အေဂျင်စီလိုင်စင်ကို အတည်ပြုစစ်ဆေးပါ။`,
    th: (_c, _u) =>
      `รายละเอียดบางอย่างไม่ตรงกันหรือไม่ได้รับการยืนยันระหว่างโฆษณางานและการสนทนา โปรดตรวจสอบใบอนุญาตอย่างเป็นทางการของหน่วยงานก่อนดำเนินการต่อ`,
  },
  lower: {
    en: (_c, _u) => `Few warning signs found between the ad and chat, though critical details may still need independent verification.`,
    id: (_c, _u) =>
      `Sedikit tanda peringatan ditemukan antara iklan dan percakapan, meskipun rincian penting mungkin masih memerlukan verifikasi mandiri.`,
    tl: (_c, _u) =>
      `Kakaunting babala ang natukoy sa pagitan ng ad at chat, ngunit maaaring kailangan pa rin ng independiyenteng beripikasyon ang ilang mahalagang detalye.`,
    my: (_c, _u) => `ကြော်ငြာနှင့် စကားပြောဆိုချက်များအကြား သတိပေးချက် အနည်းငယ်သာ တွေ့ရှိရသော်လည်း အရေးကြီးသောအချက်များကို သီးခြားစစ်ဆေးရန် လိုအပ်နိုင်ပါသည်။`,
    th: (_c, _u) => `พบสัญญาณเตือนน้อยระหว่างโฆษณาและการสนทนา แม้ว่ารายละเอียดสำคัญอาจยังต้องได้รับการตรวจสอบเพิ่มเติม`,
  },
};

const SPOKEN_WARNINGS: Record<'pause' | 'verify' | 'lower', Record<Lang, string>> = {
  pause: {
    en: 'Warning signs detected between the ad and recruiter instructions. Do not pay fees, surrender your passport, or travel without verified official contracts.',
    id: 'Tanda bahaya terdeteksi antara iklan dan instruksi perekrut. Jangan membayar biaya, menyerahkan paspor, atau bepergian tanpa kontrak resmi.',
    tl: 'May mga babalang natukoy sa pagitan ng ad at tagubilin ng recruiter. Huwag magbayad, huwag ibigay ang pasaporte, o bumiyahe nang walang opisyal na kontrata.',
    my: 'ကြော်ငြာနှင့် အလုပ်ခေါ်သူ၏ညွှန်ကြားချက်များအကြား သတိပေးလက္ခဏာများ တွေ့ရှိရပါသည်။ ငွေကြေးမပေးပါနှင့်၊ ပတ်စပို့မပေးအပ်ပါနှင့်၊ တရားဝင်စာချုပ်မရှိဘဲ ခရီးမထွက်ပါနှင့်။',
    th: 'พบสัญญาณเตือนระหว่างโฆษณาและคำแนะนำของผู้รับสมัคร โปรดอย่าจ่ายเงิน อย่ายื่นพาสปอร์ต หรือเดินทางโดยไม่มีสัญญาที่เป็นทางการ',
  },
  verify: {
    en: 'Some details in this offer conflict or are missing. Please verify the employer and recruiter with trusted labour authorities before agreeing.',
    id: 'Beberapa rincian tawaran ini bertentangan atau belum lengkap. Harap verifikasi pemberi kerja kepada pihak berwenang sebelum menyetujui.',
    tl: 'May mga detalyeng sumasalungat o kulang sa alok na ito. Mangyaring i-verify ang employer sa mga awtoridad bago sumang-ayon.',
    my: 'ဤကမ်းလှမ်းချက်ရှိ အချို့သောအချက်များ ကွဲလွဲနေပါသည် သို့မဟုတ် လိုအပ်နေပါသည်။ သဘောမတူမီ အလုပ်ရှင်နှင့် အေဂျင်စီကို တရားဝင် အတည်ပြုစစ်ဆေးပါ။',
    th: 'รายละเอียดบางอย่างในข้อเสนอนี้ขัดแย้งกันหรือยังขาดหายไป โปรดตรวจสอบนายจ้างกับหน่วยงานแรงงานที่เชื่อถือได้ก่อนตกลง',
  },
  lower: {
    en: 'Few warning signs detected. Remember never to travel on a tourist visa for work or surrender your passport to any agency.',
    id: 'Sedikit tanda peringatan terdeteksi. Ingat untuk tidak pernah bepergian dengan visa turis untuk bekerja atau menyerahkan paspor Anda.',
    tl: 'Kakaunting babala ang natukoy. Tandaan na huwag maglakbay gamit ang tourist visa para magtrabaho o ibigay ang iyong pasaporte.',
    my: 'သတိပေးချက် အနည်းငယ်သာ တွေ့ရှိရပါသည်။ အလုပ်လုပ်ရန်အတွက် ဗီဇာမရှိဘဲ ခရီးမထွက်ရန်နှင့် မည်သူ့ကိုမျှ ပတ်စပို့မပေးအပ်ရန် သတိပြုပါ။',
    th: 'พบสัญญาณเตือนน้อย โปรดจำไว้ว่าอย่าเดินทางด้วยวีซ่าท่องเที่ยวเพื่อทำงาน หรือมอบพาสปอร์ตให้ใคร',
  },
};

export async function assessJobOffer(req: JobAssessRequest, grounder?: Grounder, timeoutMs = 5000): Promise<JobAssessResponse> {
  const ad = req.facts.ad ?? null;
  const chat = req.facts.chat ?? null;
  const lang = req.language || 'en';

  // 1. Detect conflicts between ad and chat
  const conflicts = detectConflicts(ad, chat);

  // 2. Turn conflicts into flags
  const flags: Flag[] = conflicts.map((c) => ({
    family: c.family,
    label: c.description,
    evidence: `Ad: "${c.adQuote}" vs Chat: "${c.chatQuote}"`,
    severity: c.severity,
  }));

  // 3. Extract single-source flags
  if (ad) {
    flags.push(...extractSingleSourceFlags(ad, 'ad'));
  }
  if (chat) {
    flags.push(...extractSingleSourceFlags(chat, 'chat'));
  }

  // 4. Grounding (if employer exists)
  const sources: Source[] = [];
  const employerName = ad?.employer?.value || chat?.employer?.value;
  if (employerName && grounder) {
    try {
      const entities = {
        companies: [employerName],
        phones: chat?.contactChannel?.value === 'phone' && chat.contactChannel.quote ? [chat.contactChannel.quote] : [],
        domains: [],
        role: ad?.jobTitle?.value || chat?.jobTitle?.value || undefined,
        country: ad?.destinationCountry?.value || chat?.destinationCountry?.value || undefined,
      };
      const groundRes = await grounder.ground({ kind: 'job', language: lang, context: req.context }, { entities } as never, timeoutMs);
      flags.push(...groundRes.flags);
      sources.push(...groundRes.sources);

      // Section 3.1 Item 3:
      // "In grounding for job checks, report two separate findings:
      // 'We found a company with this name' and 'We could not confirm this recruiter works for that company'
      // Never let 'company found' lower the risk on its own."
      const contactChannel = chat?.contactChannel?.value;
      if (contactChannel === 'personal_chat_app') {
        flags.push({
          family: 'identity',
          label: 'Recruiter contacted via personal chat app without verified company domain linkage',
          evidence: chat?.contactChannel?.quote || 'Personal chat app',
          severity: 'medium',
        });
      }
    } catch {
      // Grounding degrades gracefully
    }
  }

  // 5. Score using standard rules engine
  const scored = score({
    flags,
    linkChecks: [],
    unsolicited: false,
    scamType: 'job_trafficking',
  });

  // 6. Apply border town protection rule (Section 3.1 Item 4)
  const protectedResult = applyBorderProtection(scored.flags, scored.score);
  const finalScore = protectedResult.score;
  const finalVerdict: Verdict = finalScore >= 70 ? 'danger' : finalScore >= 35 ? 'careful' : 'safe';

  // 7. Map attention tier
  const { tier, headline } = mapToAttentionTier(finalVerdict);

  // 8. Find still unclear fields
  const stillUnclear = getStillUnclear(ad, chat);

  // 9. Build summary and spoken warning
  const rawSummary = SUMMARY_TEMPLATES[tier][lang](conflicts.length, stillUnclear.length);
  const rawSpoken = SPOKEN_WARNINGS[tier][lang];

  // Pass through language guard
  const { text: cleanSummary } = rewriteCertainty(rawSummary, lang);
  const { text: cleanSpoken } = rewriteCertainty(rawSpoken, lang);

  const actions = buildActions(finalVerdict, 'job_trafficking', lang, req.context?.destination);

  const id = req.jobId || `chk_${randomUUID().replaceAll('-', '').slice(0, 20)}`;

  return {
    id,
    createdAt: new Date().toISOString(),
    kind: 'job',
    verdict: finalVerdict,
    score: finalScore,
    attention: tier,
    attentionHeadline: headline,
    title: headline,
    summary: cleanSummary,
    spokenWarning: cleanSpoken,
    scamType: 'job_trafficking',
    flags: protectedResult.flags,
    linkChecks: [],
    sources,
    actions,
    model: 'job-shield-v1',
    conflicts,
    stillUnclear,
    adFacts: ad,
    chatFacts: chat,
  };
}
