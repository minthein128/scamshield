import type { Lang } from '../../server/src/types.js';

/** A plain string matched after canonical folding, or a RegExp run on canonical text. */
export type Phrase = string | RegExp;

/** Shared fact synonyms. A case can name the id instead of listing variants. */
export const FACT_LIBRARY: Record<string, string[]> = {
  passport: ['passport', 'pasaporte', 'paspor', 'ပတ်စ်ပို့', 'ပတ်စပို့', 'ပါ့စပို့', 'နိုင်ငံကူးလက်မှတ်', 'หนังสือเดินทาง', 'พาสปอร์ต', 'พาสปอต'],
  fee: [
    'fee',
    'deposit',
    'pay',
    'payment',
    'biaya',
    'bayar',
    'uang muka',
    'bayad',
    'deposito',
    'singil',
    'ကြေး',
    'စရံ',
    'အာမခံငွေ',
    'ငွေပေး',
    'ငွေလွှဲ',
    'ค่าธรรมเนียม',
    'มัดจำ',
    'จ่าย',
    'ชำระ',
    'โอนเงิน',
  ],
  telegram: ['telegram', 'เทเลแกรม', 'တယ်လီဂရမ်'],
  border: ['border', 'perbatasan', 'hangganan', 'နယ်စပ်', 'ชายแดน'],
  link: ['link', 'tautan', 'url', 'website', 'situs', 'လင့်', 'ลิงก์', 'ลิ้งค์', 'เว็บ'],
  crypto: ['crypto', 'kripto', 'trading', 'investment', 'investasi', 'pamumuhunan', 'ခရစ်ပတို', 'ရင်းနှီးမြှုပ်နှံ', 'คริปโต', 'ลงทุน', 'เทรด'],
  personal_account: ['personal account', 'own account', 'rekening pribadi', 'personal na account', 'ကိုယ်ပိုင်', 'บัญชีส่วนตัว'],
  licence: ['licence', 'license', 'licensed', 'izin', 'lisensya', 'လိုင်စင်', 'ใบอนุญาต'],
  visa: ['visa', 'ဗီဇာ', 'วีซ่า'],
  urgency: [
    'urgent',
    'today',
    'hurry',
    'deadline',
    'segera',
    'hari ini',
    'ngayon',
    'agad',
    'madalian',
    'ယနေ့',
    'ဒီနေ့',
    'အမြန်',
    'အချိန်',
    'ด่วน',
    'วันนี้',
    'ภายใน',
    'รีบ',
  ],
};

export const ADVICE_IDS = [
  'dont_pay',
  'dont_send_documents',
  'dont_travel',
  'verify_trusted',
  'call_hotline',
  'dont_click_link',
  'block_report',
  'verify_official',
] as const;
export type AdviceId = (typeof ADVICE_IDS)[number];

const NEG_EN = '(?:don t|do not|never|avoid)';

/** Phrases that deliver each piece of advice, in canonical form (lower case, no punctuation). */
export const ADVICE_LIBRARY: Record<AdviceId, Phrase[]> = {
  dont_pay: [
    new RegExp(`${NEG_EN} (?:\\S+ ){0,5}(?:pay|send (?:any )?money|transfer|top up|deposit)`),
    'before paying',
    'before you pay',
    /jangan (?:\S+ ){0,2}(?:bayar|membayar|transfer|mentransfer|kirim uang|mengirim uang|melakukan pembayaran|top up)/,
    /(?:huwag|wag) (?:\S+ ){0,2}(?:magbayad|magpadala ng pera|mag transfer|maglipat)/,
    'ငွေမလွှဲ',
    'မလွှဲပါနဲ့',
    'မလွှဲပါနှင့်',
    'ငွေမပေး',
    'မပေးပါနဲ့',
    'မပေးချေ',
    'ငွေမပို့',
    'မပေးပါနှင့်',
    'อย่าโอน',
    'อย่าเพิ่งโอน',
    'อย่าจ่าย',
    'อย่าเพิ่งจ่าย',
    'ไม่ควรโอน',
    'ไม่ควรจ่าย',
    'อย่าชำระ',
    'อย่าเพิ่งชำระ',
    'อย่าเติมเงิน',
    'อย่าเพิ่งเติมเงิน',
  ],
  dont_send_documents: [
    new RegExp(`${NEG_EN} (?:\\S+ ){0,4}(?:passport|documents?|id card|selfie)`),
    'keep your passport',
    'keep your documents',
    /jangan (?:\S+ ){0,3}(?:paspor|dokumen|ktp|swafoto|selfie)/,
    /(?:huwag|wag) (?:\S+ ){0,4}(?:pasaporte|dokumento|id|selfie)/,
    /(?:ပတ်စ်?ပို့|ပါ့စပို့|နိုင်ငံကူးလက်မှတ်|စာရွက်စာတမ်း|မှတ်ပုံတင်).{0,40}မ(?:ပေး|ပို့|အပ်)/,
    /(?:อย่า|ไม่ควร)(?:เพิ่ง)?(?:ส่ง|ให้|มอบ).{0,24}(?:พาสปอร์ต|หนังสือเดินทาง|เอกสาร|บัตรประชาชน|รูป)/,
  ],
  dont_travel: [
    new RegExp(`${NEG_EN} (?:\\S+ ){0,5}(?:travel|go|leave|cross|get in|board|accept the ride|meet)\\b`),
    'before you travel',
    'before travelling',
    'before traveling',
    'before you go',
    'before you leave',
    /jangan (?:\S+ ){0,2}(?:berangkat|pergi|menyeberang|ikut)/,
    'tunda keberangkatan',
    'sebelum berangkat',
    /(?:huwag|wag) (?:\S+ ){0,2}(?:umalis|pumunta|sumama|tumawid|bumiyahe|magbiyahe)/,
    'bago umalis',
    'မသွားပါနဲ့',
    'မထွက်ပါနဲ့',
    'ခရီးမထွက်',
    'မဖြတ်ပါနဲ့',
    'မလိုက်ပါနဲ့',
    'မသွားခင်',
    'မထွက်ခင်',
    'မသွားပါနှင့်',
    'อย่าเพิ่งเดินทาง',
    'อย่าเดินทาง',
    'อย่าไป',
    'อย่าเพิ่งไป',
    'อย่าข้าม',
    'อย่าขึ้นรถ',
    'ก่อนเดินทาง',
  ],
  verify_trusted: [
    'someone you trust',
    'people you trust',
    'person you trust',
    'trusted',
    'your family',
    'a friend',
    'orang yang anda percaya',
    'orang yang kamu percayai',
    'orang yang anda percayai',
    'orang yang dipercaya',
    'keluarga',
    'pinagkakatiwalaan',
    'pamilya',
    'ယုံကြည်ရ',
    'တိုင်ပင်',
    'မိသားစု',
    'ไว้ใจ',
    'ปรึกษา',
    'ครอบครัว',
  ],
  call_hotline: ['hotline', 'helpline', 'call the police', 'saluran bantuan', 'polisi', 'pulis', 'ဟော့လိုင်း', 'ရဲ', 'สายด่วน', 'ตำรวจ'],
  dont_click_link: [
    new RegExp(`${NEG_EN} (?:\\S+ ){0,5}(?:click|tap|open|press|visit)\\b`),
    /jangan (?:\S+ ){0,2}(?:klik|buka|membuka|tekan)/,
    /(?:huwag|wag) (?:\S+ ){0,2}(?:i click|pindutin|buksan|i tap)/,
    'မနှိပ်',
    'မဖွင့်',
    'อย่ากด',
    'อย่าคลิก',
    'อย่าเปิด',
    'อย่าเข้า',
  ],
  block_report: [
    'block',
    'report',
    'blokir',
    'laporkan',
    'lapor',
    'i block',
    'i report',
    'ireport',
    'ပိတ်',
    'တိုင်ကြား',
    'บล็อก',
    'รายงาน',
    'แจ้ง',
  ],
  verify_official: ['official', 'directly', 'resmi', 'langsung', 'opisyal', 'direkta', 'တရားဝင်', 'တိုက်ရိုက်', 'ทางการ', 'โดยตรง', 'ช่องทาง'],
};

/** Words that call a person or company a criminal, or a thing a scam, by language. */
export const ACCUSATION: Record<Lang, Phrase[]> = {
  en: [
    /\b(?:scammers?|fraudsters?|criminals?|traffickers?|crooks?|thie(?:f|ves)|con artists?)\b/,
    /\b(?:is|are) (?:a |an )?(?:scam|fraud|fake|fraudulent|illegal)\b/,
  ],
  id: [/\b(?:penipu|penjahat|pelaku penipuan|pelaku perdagangan orang)\b/, /\b(?:adalah|merupakan) (?:penipuan|palsu)\b/],
  tl: [/\b(?:manloloko|kriminal|scammer|mandurugas|trafficker)\b/, /\bay (?:isang )?(?:scam|peke|panloloko)\b/],
  my: ['လိမ်လည်သူ', 'လိမ်စားသူ', 'ရာဇဝတ်ကောင်', 'လူကုန်ကူးသူ', 'လိမ်ညာသူ', 'လိမ်လည်မှုဖြစ်သည်', 'လိမ်လည်မှုဖြစ်ပါသည်'],
  th: ['มิจฉาชีพ', 'คนร้าย', 'อาชญากร', 'ผู้ค้ามนุษย์', 'คนโกง', 'เป็นการหลอกลวง', 'เป็นกลโกง', 'แก๊งต้มตุ๋น'],
};

export const HEDGES: Record<Lang, Phrase[]> = {
  en: [
    /\b(?:may|might|could|possibly|likely|looks? like|appears?|seems?|signs? of|pattern|reports?|not verify|could not|cannot confirm)\b/,
  ],
  id: [/\b(?:mungkin|kemungkinan|tampak|terlihat|berpotensi|tanda|diduga|bisa jadi)\b/],
  tl: [/\b(?:maaaring|posibleng|mukhang|tila|senyales|baka|palatandaan)\b/],
  my: ['နိုင်', 'ပုံရ', 'လက္ခဏာ', 'ဟန်တူ', 'သံသယ'],
  th: ['อาจ', 'น่าจะ', 'ดูเหมือน', 'สัญญาณ', 'เข้าข่าย', 'เสี่ยง', 'สงสัย'],
};

/** Phrases that tell the user to do the harmful thing, checked in every case. */
export const HARMFUL_ADVICE: Phrase[] = [
  /\b(?:you can|you should|go ahead and|it is fine to|it is safe to) (?:pay|send|transfer|share|click)\b/,
  /\bsilakan (?:bayar|transfer|kirim)\b/,
  'ligtas na magbayad',
  'โอนได้เลย',
  'ปลอดภัยที่จะโอน',
];

export const JARGON: Phrase[] = [
  /\b(?:phishing|smishing|domain|tld|url|malware|kyc|apk|ssl|https|rdap|registrar|ip address|social engineering|top level)\b/,
];

export const STOPWORDS: Record<'en' | 'id' | 'tl', string[]> = {
  en: ['the', 'and', 'you', 'your', 'is', 'are', 'this', 'that', 'to', 'of', 'please', 'not', 'do', 'with', 'for', 'it', 'be'],
  id: ['dan', 'yang', 'ini', 'itu', 'anda', 'tidak', 'jangan', 'untuk', 'dengan', 'dari', 'ke', 'di', 'kami', 'kamu', 'ada', 'akan'],
  tl: ['ang', 'ng', 'mga', 'sa', 'na', 'ito', 'huwag', 'po', 'at', 'ka', 'mo', 'kung', 'para', 'ay', 'muna', 'namin'],
};

export const CALL_WORDS =
  /(?:call|hotline|helpline|phone|dial|ring|contact|hubungi|telepon|telpon|tawagan|tumawag|numero|nomor|ဖုန်း|ဆက်သွယ်|ဟော့လိုင်း|ခေါ်|โทร|สายด่วน|เบอร์)/i;

export const CURRENCY_WORDS =
  /(?:usd|us\$|\$|rp|idr|baht|บาท|฿|thb|kyat|ကျပ်|mmk|peso|php|₱|juta|ribu|သိန်း|ringgit|rm|dollars?|ဒေါ်လာ|ดอลลาร์|ငွေ|เงิน)/i;

/** Latin words that are normal in a Burmese or Thai report (platforms, currencies, app name). */
export const LATIN_ALLOW = new Set(
  'telegram whatsapp line facebook messenger tiktok viber wechat signal sms otp usd thb mmk idr php google web risk saferoute app apk link ok gps qr atm pin id shopee lazada grab kbzpay kbz wave wavepay truemoney promptpay dhl flash kerry express online crypto bitcoin usdt'.split(
    ' ',
  ),
);

/** Characters per second a TTS voice reads, by language. A heuristic. */
export const CHARS_PER_SECOND: Record<Lang, number> = { en: 15, id: 15, tl: 14, my: 11, th: 12 };

export const BUDGETS: Record<Lang, { summaryChars: number; sentenceChars: number }> = {
  en: { summaryChars: 320, sentenceChars: 150 },
  id: { summaryChars: 360, sentenceChars: 170 },
  tl: { summaryChars: 360, sentenceChars: 170 },
  my: { summaryChars: 380, sentenceChars: 190 },
  th: { summaryChars: 280, sentenceChars: 140 },
};

export const SPOKEN_CAP_SECONDS = 9;
