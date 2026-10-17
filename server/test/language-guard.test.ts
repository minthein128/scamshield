import { describe, expect, it } from 'vitest';
import { buildActions, titleFor } from '../src/explain.js';
import { GROUND_EXAMPLES } from '../src/ground.js';
import {
  countCertainty,
  countMaleForms,
  findCertainty,
  findMaleForms,
  findMaleFormsAny,
  findPromises,
  fixAppName,
  GROUND_EVIDENCE_FALLBACK,
  guardExtraction,
  guardFlags,
  isHeavy,
  rewriteCertainty,
  wrongLanguage,
} from '../src/language-guard.js';
import type { Extraction } from '../src/types.js';

describe('language guard', () => {
  it.each([
    ['This job offer is a dangerous human trafficking trap.', 'en', 'looks like a possible human trafficking trap'],
    ['This is a scam.', 'en', 'This looks like a scam.'],
    ['These messages are scams.', 'en', 'look like scams'],
    ['The shop is definitely fake.', 'en', 'looks fake'],
    ['Acme Ltd is a criminal company.', 'en', 'may be linked to scam reports'],
    ['I am 100% sure.', 'en', 'likely concerning'],
    ['A stranger pushes you into a fake crypto site.', 'en', 'a possibly fake crypto site'],
    ['Tawaran ini adalah penipuan.', 'id', 'kemungkinan penipuan'],
    ['Ini pasti jebakan.', 'id', 'kemungkinan besar jebakan'],
    ['Ang alok na ito ay scam.', 'tl', 'ay mukhang scam'],
    ['Siguradong peke ito.', 'tl', 'posibleng peke'],
    ['ဤအလုပ်ကမ်းလှမ်းချက်သည် လိမ်လည်မှု ဖြစ်သည်။', 'my', 'လိမ်လည်မှု ဖြစ်နိုင်ပါသည်'],
    ['ข้อเสนองานนี้เป็นการหลอกลวง', 'th', 'ข้อเสนองานนี้ดูเหมือนการหลอกลวง'],
    ['ข้อความนี้เป็นกลโกงแน่นอน', 'th', 'ข้อความนี้ดูเหมือนกลโกง'],
    ['เว็บนี้คือกับดักชัวร์ๆ', 'th', 'เว็บนี้ดูเหมือนกับดัก'],
    ['ลิงก์นี้เป็นลิงก์ปลอม', 'th', 'ลิงก์นี้ดูเหมือนลิงก์ปลอม'],
    ['บริษัทนี้เป็นมิจฉาชีพ', 'th', 'บริษัทนี้อาจเกี่ยวข้องกับรายงานการหลอกลวง'],
    ['ผู้ส่งคือคนร้าย อย่าโอนเงิน', 'th', 'ผู้ส่งอาจเกี่ยวข้องกับรายงานการหลอกลวง อย่าโอนเงิน'],
    ['ร้านนี้ปลอดภัย 100%', 'th', 'ร้านนี้ไม่พบสัญญาณเตือนสำคัญ'],
    ['ร้านนี้ปลอดภัยแน่นอน', 'th', 'ร้านนี้ไม่พบสัญญาณเตือนสำคัญ'],
    ['ทางการยืนยันแล้วว่าบริษัทนี้ไม่มีใบอนุญาต', 'th', 'ทางการมีรายงานว่าบริษัทนี้ไม่มีใบอนุญาต'],
    ['ข้อมูลนี้พิสูจน์ได้ว่าบริษัทไม่มีตัวตน', 'th', 'ข้อมูลนี้บ่งชี้ว่าบริษัทไม่มีตัวตน'],
  ] as const)('rewrites %s', (input, lang, expected) => {
    const r = rewriteCertainty(input, lang);
    expect(r.hits).toBeGreaterThan(0);
    expect(r.text).toContain(expected);
    expect(findCertainty(r.text, lang)).toEqual([]);
  });

  it.each([
    ['This could be a fake parcel fee. It looks like a fake shop.', 'en'],
    ['This offer shows several warning signs of trafficking. We could not find a licence record.', 'en'],
    ['The message was not confirmed by the courier. Please verify.', 'en'],
    ['Pastikan Anda memeriksa izin agensi. Kami tidak pasti.', 'id'],
    ['Mukhang may mga senyales ng panloloko. Posibleng scam ito.', 'tl'],
    ['ဒီအလုပ်ကမ်းလှမ်းချက်မှာ သတိပေးလက္ခဏာတချို့ တွေ့နေရပါတယ်။', 'my'],
    ['ข้อเสนอนี้ดูเหมือนมีความเสี่ยง พบสัญญาณเตือนหลายอย่าง โปรดตรวจสอบก่อน', 'th'],
    ['งานนี้มีสัญญาณเตือนหลายอย่างที่อาจเข้าข่ายการค้ามนุษย์ อย่าเพิ่งโอนเงิน และปรึกษาคนที่คุณไว้ใจก่อนตัดสินใจ', 'th'],
    ['ข้อความนี้อาจเป็นกลโกง และดูเหมือนเป็นการหลอกลวง', 'th'],
    ['ข้อความนี้น่าจะเป็นกับดัก ถ้าเป็นกลโกง ให้หยุดทันที', 'th'],
    ['ผลยังไม่แน่นอน เราไม่สามารถยืนยันได้ และยังไม่ได้รับการยืนยันจากบริษัท', 'th'],
    ['เราไม่สามารถพิสูจน์ได้ว่าบริษัทนี้มีอยู่จริง โปรดยืนยันกับหน่วยงานของรัฐ', 'th'],
    ['อย่าเพิ่งบอกว่าปลอดภัย เพราะเรายังไม่แน่ใจ ไม่ชัวร์', 'th'],
    ['เราไม่พบข้อมูลใบอนุญาตของบริษัทนี้ ลิงก์นี้ไม่ใช่เว็บทางการ', 'th'],
  ] as const)('leaves hedged text alone: %s', (input, lang) => {
    expect(findCertainty(input, lang)).toEqual([]);
    expect(rewriteCertainty(input, lang).text).toBe(input);
  });

  it('matches Thai patterns inside unspaced text', () => {
    const t = 'พบข้อความนี้เป็นกลโกงและบริษัทคือมิจฉาชีพชัวร์ๆ';
    expect(findCertainty(t, 'th').length).toBe(3);
    const r = rewriteCertainty(t, 'th');
    expect(findCertainty(r.text, 'th')).toEqual([]);
    expect(r.text).not.toContain('ชัวร์');
  });

  it('keeps fixed Thai titles and actions free of certainty wording', () => {
    const texts = [
      ...(['danger', 'careful', 'safe'] as const).map((v) => titleFor(v, 'th')),
      ...buildActions('danger', 'job_trafficking', 'th').map((a) => a.label),
    ];
    for (const t of texts) expect(findCertainty(t, 'th')).toEqual([]);
  });

  it('detects Thai certainty it cannot rewrite', () => {
    expect(findCertainty('แน่นอนว่าข้อความนี้ต้องระวัง ปลอดภัยแน่ๆ 100%', 'th').length).toBeGreaterThanOrEqual(2);
    expect(rewriteCertainty('มั่นใจ 100%', 'th').text).toBe('มั่นใจ 100%');
  });

  it('detects Burmese certainty it cannot rewrite', () => {
    const t = 'ဒါ ကျိန်းသေ ဖြစ်သည်၊ မလွဲဧကန်၊ ၁၀၀% အတည်ပြုပြီး';
    expect(findCertainty(t, 'my').length).toBeGreaterThanOrEqual(3);
    expect(isHeavy(findCertainty(t, 'my').length)).toBe(true);
  });

  const base: Extraction = {
    flags: [{ family: 'pressure', label: 'This is a scam', evidence: 'This is a scam quoted from the input', severity: 'high' }],
    scamType: 'other',
    verdictDraft: 'danger',
    unsolicited: true,
    summary: 'This is a scam and definitely fake.',
    spokenWarning: 'Danger.',
    urls: [],
    entities: { companies: [], phones: [], domains: [] },
  };

  it('guards model fields but leaves quoted evidence alone', () => {
    const { extraction, stats } = guardExtraction(base, 'en');
    expect(extraction.summary).not.toMatch(/is a scam|definitely/i);
    expect(extraction.flags[0]?.label).toBe('This looks like a scam');
    expect(extraction.flags[0]?.evidence).toBe(base.flags[0]?.evidence);
    expect(stats.before).toBe(3);
    expect(isHeavy(stats.before)).toBe(true);
  });

  it('guards grounding evidence too', () => {
    const { flags } = guardFlags([{ family: 'known_bad', label: 'X', evidence: 'Acme is a scammer', severity: 'low' }], 'en');
    expect(flags[0]?.evidence).toBe('Acme may be linked to scam reports');
  });

  it('replaces English grounding evidence in a Burmese, Thai, Indonesian or Tagalog report', () => {
    const en = 'Reports online describe similar messages as scams.';
    for (const lang of ['my', 'th', 'id', 'tl'] as const) {
      const { flags, stats } = guardFlags(
        [{ family: 'identity', label: GROUND_EXAMPLES[lang].licence, evidence: en, severity: 'low' }],
        lang,
      );
      expect(flags[0]?.evidence).toBe(GROUND_EVIDENCE_FALLBACK[lang]);
      expect(flags[0]?.label).toBe(GROUND_EXAMPLES[lang].licence);
      expect(stats.replaced).toBe(1);
    }
    expect(guardFlags([{ family: 'identity', label: 'X', evidence: en, severity: 'low' }], 'en').flags[0]?.evidence).toBe(en);
  });

  it('keeps report-language evidence that names a source or a website', () => {
    const kept = [
      ['thaipost-redelivery.top သည် Thailand Post နှင့် မသက်ဆိုင်ကြောင်း Scamwatch တွင် တွေ့ရသည်။', 'my'],
      ['DICA', 'my'],
      ['Royal Thai Police', 'th'],
      ['มีรายงานบน https://www.thaipost.net/news ว่าข้อความคล้ายกันถูกใช้หลอกลวง', 'th'],
      ['Ada laporan online di Scamwatch bahwa pesan serupa dipakai untuk menipu.', 'id'],
      ['May mga ulat online na ang website na ito ay hindi registered.', 'tl'],
    ] as const;
    for (const [text, lang] of kept) expect(wrongLanguage(text, lang)).toBe(false);
    expect(wrongLanguage('We could not find a licence record for Acme.', 'id')).toBe(true);
    expect(wrongLanguage('No licence record was found for this company on DICA.', 'my')).toBe(true);
  });

  it('drops a grounded finding whose label is English in a Burmese report', () => {
    const { flags, stats } = guardFlags(
      [{ family: 'identity', label: 'We could not find a licence record for Acme', evidence: 'DICA', severity: 'low' }],
      'my',
    );
    expect(flags).toEqual([]);
    expect(stats.dropped).toBe(1);
  });

  it('counts certainty in a response', () => {
    const res = { title: 'ok', summary: 'It is a scam', spokenWarning: 'fine', flags: [] };
    expect(countCertainty(res, 'en')).toBe(1);
  });
});

describe('male speaker forms', () => {
  it('finds Burmese and Thai male forms', () => {
    expect(findMaleForms('ကျွန်တော် ကူညီပါမယ် ခင်ဗျာ', 'my')).toEqual(['ကျွန်တော်', 'ခင်ဗျာ']);
    expect(findMaleForms('ခင်ဗျ ဘာမေးချင်လဲ', 'my')).toEqual(['ခင်ဗျ']);
    expect(findMaleForms('อย่าเพิ่งโอนเงินนะครับ ผมแนะนำ', 'th')).toEqual(['ครับ', 'ผม']);
  });

  it('passes female forms and languages without gendered forms', () => {
    expect(findMaleForms('ကျွန်မ ကူညီပါမယ် ရှင့်', 'my')).toEqual([]);
    expect(findMaleForms('อย่าเพิ่งโอนเงินนะคะ ดิฉันแนะนำค่ะ', 'th')).toEqual([]);
    expect(findMaleForms('Saya sarankan jangan transfer.', 'id')).toEqual([]);
    expect(findMaleFormsAny('ok ครับ and ကျွန်တော်')).toHaveLength(2);
  });

  it('counts male forms in a check response', () => {
    const res = { title: 'ระวังค่ะ', summary: 'ผมคิดว่ามีความเสี่ยงครับ', spokenWarning: 'อย่าเพิ่งโอนเงินค่ะ', flags: [] };
    expect(countMaleForms(res, 'th')).toBe(2);
    expect(countMaleForms(res, 'en')).toBe(0);
  });
});

describe('promises Kakwe cannot keep', () => {
  it('finds promises in each language', () => {
    expect(findPromises('We will send you the numbers later.')).toHaveLength(1);
    expect(findPromises("I'll call the agency for you.")).toHaveLength(1);
    expect(findPromises('Kami akan menghubungi polisi.')).toHaveLength(1);
    expect(findPromises('Tatawagan ko sila.')).toHaveLength(1);
    expect(findPromises('ကျွန်မတို့ ဖုန်းနံပါတ်တွေကို ပေးပို့ပေးပါမယ်။')).toHaveLength(1);
    expect(findPromises('ดิฉันจะส่งเบอร์ให้ค่ะ')).toHaveLength(1);
  });

  it('passes advice that points to the screen', () => {
    expect(findPromises('You can press Get help to call a verified hotline.')).toEqual([]);
    expect(findPromises('Get help ခလုတ်ကို နှိပ်ပြီး ဖုန်းဆက်နိုင်ပါတယ်ရှင်။')).toEqual([]);
    expect(findPromises('กด Get help เพื่อโทรหาสายด่วนได้ค่ะ')).toEqual([]);
  });
});

describe('app name guard', () => {
  it.each([
    ['ผ่านทางกาควาย', 'ผ่านทางKakwe'],
    ['คาควายตรวจพบ', 'Kakwe' + 'ตรวจพบ'],
    ['ใช้กาเกวเพื่อตรวจสอบ', 'ใช้Kakweเพื่อตรวจสอบ'],
    ['ใช้คาเคว ตรวจ', 'ใช้Kakwe ตรวจ'],
    ['กาเกวย์ ช่วยได้', 'Kakwe ช่วยได้'],
  ])('rewrites %s in Thai', (input, out) => {
    expect(fixAppName(input, 'th')).toBe(out);
  });

  it.each(['ปากควายใหญ่', 'ขาควายเดินช้า', 'เกวียนเก่า', 'กาเกวียนเก่า', 'การควบคุมความเสี่ยง', 'ความปลอดภัย', 'ฝากควายไว้'])(
    'leaves normal Thai alone: %s',
    (t) => {
      expect(fixAppName(t, 'th')).toBe(t);
    },
  );

  it('does not touch other languages', () => {
    expect(fixAppName('กาควาย', 'en')).toBe('กาควาย');
    expect(fixAppName('ကာကွယ်', 'my')).toBe('ကာကွယ်');
  });

  it('rewrites the summary, spoken warning and flag labels of an extraction', () => {
    const x = {
      summary: 'ตรวจโดยกาควาย พบสัญญาณเตือน',
      spokenWarning: 'ลองถามกาควายอีกครั้ง',
      flags: [{ family: 'x', label: 'กาควายพบลิงก์', evidence: 'e', weight: 1 }],
    } as unknown as Extraction;
    const { extraction } = guardExtraction(x, 'th');
    expect(extraction.summary).toContain('Kakwe');
    expect(extraction.spokenWarning).toContain('Kakwe');
    expect(extraction.flags[0]?.label).toContain('Kakwe');
    expect(JSON.stringify(extraction)).not.toContain('ควาย');
  });
});
