import type { Lang } from '../types.js';
import type { AttentionTier, ConflictCode, FactKey, FindingCode } from './types.js';

type L = Record<Lang, string>;

export const TIER_HEADLINE: Record<AttentionTier, L> = {
  lower: {
    en: 'Few warning signs found, but important details may still be missing',
    id: 'Sedikit tanda bahaya ditemukan, tetapi detail penting mungkin masih kurang',
    tl: 'Kaunti ang nakitang babala, pero maaaring may kulang pang mahalagang detalye',
    my: 'သတိပေးလက္ခဏာ အနည်းငယ်သာ တွေ့ရသော်လည်း အရေးကြီးအချက်များ လိုနေနိုင်သေးသည်',
    th: 'พบสัญญาณเตือนไม่มาก แต่อาจยังขาดรายละเอียดสำคัญ',
  },
  verify: {
    en: 'Some details do not add up, check them before you go',
    id: 'Beberapa detail tidak cocok, periksa dulu sebelum berangkat',
    tl: 'May mga detalyeng hindi tugma, suriin muna bago umalis',
    my: 'အချို့အချက်များ မကိုက်ညီပါ၊ မသွားမီ စစ်ဆေးပါ',
    th: 'รายละเอียดบางอย่างไม่ตรงกัน โปรดตรวจสอบก่อนเดินทาง',
  },
  pause: {
    en: 'Pause before you pay, send documents or travel',
    id: 'Berhenti dulu sebelum membayar, mengirim dokumen, atau berangkat',
    tl: 'Huminto muna bago magbayad, magpadala ng dokumento, o bumiyahe',
    my: 'ငွေမပေးမီ၊ စာရွက်စာတမ်းမပို့မီ သို့မဟုတ် ခရီးမထွက်မီ ခဏရပ်ပါ',
    th: 'หยุดก่อนจ่ายเงิน ส่งเอกสาร หรือออกเดินทาง',
  },
};

export const TIER_SUMMARY: Record<AttentionTier, L> = {
  lower: {
    en: 'We found few warning signs in what you shared, but important details may still be missing. Before you pay or travel, check the employer and ask for a written contract.',
    id: 'Kami menemukan sedikit tanda bahaya dari yang Anda bagikan, tetapi detail penting mungkin masih kurang. Sebelum membayar atau berangkat, periksa pemberi kerja dan minta kontrak tertulis.',
    tl: 'Kaunti ang nakita naming babala sa ibinahagi mo, pero maaaring may kulang pang mahalagang detalye. Bago magbayad o bumiyahe, suriin ang employer at humingi ng nakasulat na kontrata.',
    my: 'သင်မျှဝေထားသည့်အထဲတွင် သတိပေးလက္ခဏာ အနည်းငယ်သာ တွေ့ရသော်လည်း အရေးကြီးအချက်များ လိုနေနိုင်သေးသည်။ ငွေမပေးမီ သို့မဟုတ် ခရီးမထွက်မီ အလုပ်ရှင်ကို စစ်ဆေးပြီး စာချုပ်ကို စာဖြင့် တောင်းပါ။',
    th: 'เราพบสัญญาณเตือนไม่มากในสิ่งที่คุณแชร์ แต่อาจยังขาดรายละเอียดสำคัญ ก่อนจ่ายเงินหรือเดินทาง โปรดตรวจสอบนายจ้างและขอสัญญาจ้างเป็นลายลักษณ์อักษร',
  },
  verify: {
    en: 'Some details are missing or do not match. Check the employer, the contract and the recruiter licence before you pay or travel.',
    id: 'Beberapa detail kurang atau tidak cocok. Periksa pemberi kerja, kontrak, dan izin perekrut sebelum membayar atau berangkat.',
    tl: 'May mga detalyeng kulang o hindi tugma. Suriin ang employer, ang kontrata, at ang lisensya ng recruiter bago magbayad o bumiyahe.',
    my: 'အချို့အချက်များ လိုနေသည် သို့မဟုတ် မကိုက်ညီပါ။ ငွေမပေးမီ သို့မဟုတ် ခရီးမထွက်မီ အလုပ်ရှင်၊ စာချုပ်နှင့် အလုပ်ခေါ်သူ၏ လိုင်စင်ကို စစ်ဆေးပါ။',
    th: 'รายละเอียดบางอย่างขาดหายหรือไม่ตรงกัน โปรดตรวจสอบนายจ้าง สัญญาจ้าง และใบอนุญาตของผู้รับสมัครก่อนจ่ายเงินหรือเดินทาง',
  },
  pause: {
    en: 'This offer shows several warning signs that match common trafficking and fee scams. Please do not pay, send your passport or travel until you check the offer with someone you trust or a hotline.',
    id: 'Tawaran ini menunjukkan beberapa tanda bahaya yang mirip pola umum perdagangan orang dan penipuan biaya. Jangan membayar, mengirim paspor, atau berangkat sebelum Anda memeriksa tawaran ini dengan orang yang Anda percayai atau hotline.',
    tl: 'May ilang babala ang alok na ito na kahawig ng karaniwang pattern ng trafficking at scam sa bayarin. Huwag munang magbayad, magpadala ng pasaporte, o bumiyahe hangga’t hindi mo ito naitatanong sa taong pinagkakatiwalaan mo o sa hotline.',
    my: 'ဤကမ်းလှမ်းချက်တွင် လူကုန်ကူးမှုနှင့် ကြေးငွေလိမ်ခြင်း ပုံစံများနှင့် တူသော သတိပေးလက္ခဏာ များစွာ တွေ့ရသည်။ ယုံကြည်ရသူ သို့မဟုတ် ဟော့လိုင်းနှင့် မစစ်ဆေးမီ ငွေမပေးပါနှင့်၊ ပတ်စပို့မပို့ပါနှင့်၊ ခရီးမထွက်ပါနှင့်။',
    th: 'ข้อเสนอนี้มีสัญญาณเตือนหลายอย่างที่คล้ายรูปแบบการค้ามนุษย์และการหลอกเก็บค่าธรรมเนียม โปรดอย่าเพิ่งจ่ายเงิน ส่งพาสปอร์ต หรือออกเดินทาง จนกว่าจะได้ตรวจสอบกับคนที่คุณไว้ใจหรือสายด่วน',
  },
};

export const TIER_SPOKEN: Record<AttentionTier, L> = {
  lower: {
    en: 'Few warning signs found, but details may be missing. Please check the employer before you pay or travel.',
    id: 'Sedikit tanda bahaya ditemukan, tetapi detail mungkin masih kurang. Periksa pemberi kerja sebelum membayar atau berangkat.',
    tl: 'Kaunti ang nakitang babala, pero maaaring may kulang na detalye. Suriin muna ang employer bago magbayad o bumiyahe.',
    my: 'သတိပေးလက္ခဏာ နည်းနည်းပဲ တွေ့ရပေမယ့် အချက်အလက် လိုနေနိုင်ပါတယ်ရှင့်။ ငွေမပေးခင်၊ ခရီးမထွက်ခင် အလုပ်ရှင်ကို စစ်ဆေးပါ။',
    th: 'พบสัญญาณเตือนไม่มาก แต่อาจยังขาดรายละเอียดค่ะ โปรดตรวจสอบนายจ้างก่อนจ่ายเงินหรือเดินทาง',
  },
  verify: {
    en: "Some details don't match. Please check the employer and the contract before you pay or travel.",
    id: 'Beberapa detail tidak cocok. Periksa pemberi kerja dan kontraknya sebelum membayar atau berangkat.',
    tl: 'May mga detalyeng hindi tugma. Suriin muna ang employer at kontrata bago magbayad o bumiyahe.',
    my: 'အချို့အချက်တွေ မကိုက်ညီပါဘူးရှင့်။ ငွေမပေးခင်၊ ခရီးမထွက်ခင် အလုပ်ရှင်နဲ့ စာချုပ်ကို စစ်ဆေးပါ။',
    th: 'รายละเอียดบางอย่างไม่ตรงกันค่ะ โปรดตรวจสอบนายจ้างและสัญญาก่อนจ่ายเงินหรือเดินทาง',
  },
  pause: {
    en: "Please pause. Don't pay, send your passport or travel until you check this offer with someone you trust.",
    id: 'Mohon berhenti dulu. Jangan membayar, mengirim paspor, atau berangkat sebelum memeriksa tawaran ini dengan orang yang Anda percayai.',
    tl: 'Huminto muna. Huwag magbayad, magpadala ng pasaporte, o bumiyahe hangga’t hindi mo ito naitatanong sa taong pinagkakatiwalaan mo.',
    my: 'ခဏရပ်ပါရှင့်။ ယုံကြည်ရသူနဲ့ မစစ်ဆေးခင် ငွေမပေးပါနဲ့၊ ပတ်စပို့မပို့ပါနဲ့၊ ခရီးမထွက်ပါနဲ့။',
    th: 'โปรดหยุดก่อนนะคะ อย่าเพิ่งจ่ายเงิน ส่งพาสปอร์ต หรือออกเดินทาง จนกว่าจะได้ปรึกษาคนที่คุณไว้ใจค่ะ',
  },
};

export const FIELD_LABEL: Partial<Record<FactKey, L>> = {
  workerFee: {
    en: 'Worker fee',
    id: 'Biaya pekerja',
    tl: 'Bayad ng manggagawa',
    my: 'အလုပ်သမားပေးရသည့်ကြေး',
    th: 'ค่าธรรมเนียมที่คนงานต้องจ่าย',
  },
  documentRequest: { en: 'Documents', id: 'Dokumen', tl: 'Mga dokumento', my: 'စာရွက်စာတမ်း', th: 'เอกสาร' },
  contract: { en: 'Contract', id: 'Kontrak kerja', tl: 'Kontrata', my: 'အလုပ်စာချုပ်', th: 'สัญญาจ้าง' },
  visaOrPermit: {
    en: 'Visa and work permit',
    id: 'Visa dan izin kerja',
    tl: 'Visa at work permit',
    my: 'ဗီဇာနှင့် အလုပ်ပါမစ်',
    th: 'วีซ่าและใบอนุญาตทำงาน',
  },
  meetingPoint: { en: 'Meeting point', id: 'Titik temu', tl: 'Tagpuan', my: 'တွေ့ဆုံမည့်နေရာ', th: 'จุดนัดพบ' },
  employer: { en: 'Employer', id: 'Pemberi kerja', tl: 'Employer', my: 'အလုပ်ရှင်', th: 'นายจ้าง' },
  workplace: { en: 'Workplace', id: 'Tempat kerja', tl: 'Lugar ng trabaho', my: 'အလုပ်လုပ်မည့်နေရာ', th: 'สถานที่ทำงาน' },
  salary: { en: 'Salary', id: 'Gaji', tl: 'Sahod', my: 'လစာ', th: 'เงินเดือน' },
};

/** `{chat}` is replaced with the chat value. */
export const CONFLICT_TEXT: Record<ConflictCode, L> = {
  fee_vs_no_fee: {
    en: 'The ad says there is no fee. The chat asks you to pay {chat}.',
    id: 'Iklan menyebut tidak ada biaya. Chat meminta Anda membayar {chat}.',
    tl: 'Sinasabi ng ad na walang bayad. Sa chat, hinihingan ka ng {chat}.',
    my: 'ကြော်ငြာတွင် ကြေးမပေးရဟု ဆိုထားသည်။ စကားပြောတွင် {chat} ပေးရန် တောင်းထားသည်။',
    th: 'ประกาศบอกว่าไม่มีค่าธรรมเนียม แต่ในแชทขอให้คุณจ่าย {chat}',
  },
  documents_passport_photo: {
    en: 'The ad does not ask for documents like this. The chat asks for a photo of your passport now.',
    id: 'Iklan tidak meminta dokumen seperti ini. Chat meminta foto paspor Anda sekarang.',
    tl: 'Hindi humihingi ng ganitong dokumento ang ad. Sa chat, hinihingi ngayon ang litrato ng pasaporte mo.',
    my: 'ကြော်ငြာတွင် ဤကဲ့သို့ စာရွက်စာတမ်း မတောင်းထားပါ။ စကားပြောတွင် သင့်ပတ်စပို့ဓာတ်ပုံကို ယခုပို့ရန် တောင်းထားသည်။',
    th: 'ประกาศไม่ได้ขอเอกสารแบบนี้ แต่ในแชทขอรูปถ่ายพาสปอร์ตของคุณตอนนี้',
  },
  documents_passport_hold: {
    en: 'The ad does not mention handing over documents. The chat says someone will keep your passport.',
    id: 'Iklan tidak menyebut penyerahan dokumen. Chat mengatakan paspor Anda akan dipegang orang lain.',
    tl: 'Walang sinasabi ang ad tungkol sa pagbibigay ng dokumento. Sa chat, sinasabing may ibang hahawak ng pasaporte mo.',
    my: 'ကြော်ငြာတွင် စာရွက်စာတမ်း အပ်ရမည်ဟု မပါပါ။ စကားပြောတွင် သင့်ပတ်စပို့ကို တစ်စုံတစ်ယောက်က သိမ်းထားမည်ဟု ဆိုထားသည်။',
    th: 'ประกาศไม่ได้บอกว่าต้องมอบเอกสาร แต่ในแชทบอกว่าจะมีคนเก็บพาสปอร์ตของคุณไว้',
  },
  documents_id_copy: {
    en: 'The ad does not ask for documents. The chat asks for a copy of your ID.',
    id: 'Iklan tidak meminta dokumen. Chat meminta salinan kartu identitas Anda.',
    tl: 'Hindi humihingi ng dokumento ang ad. Sa chat, hinihingi ang kopya ng ID mo.',
    my: 'ကြော်ငြာတွင် စာရွက်စာတမ်း မတောင်းထားပါ။ စကားပြောတွင် သင့်မှတ်ပုံတင်မိတ္တူကို တောင်းထားသည်။',
    th: 'ประกาศไม่ได้ขอเอกสาร แต่ในแชทขอสำเนาบัตรประจำตัวของคุณ',
  },
  contract_later: {
    en: 'The ad promises an official contract. The chat says the contract comes later or not at all.',
    id: 'Iklan menjanjikan kontrak resmi. Chat mengatakan kontrak diberikan nanti atau tidak ada.',
    tl: 'Nangangako ang ad ng opisyal na kontrata. Sa chat, sinasabing mamaya pa o wala ang kontrata.',
    my: 'ကြော်ငြာတွင် တရားဝင်စာချုပ် ပေးမည်ဟု ဆိုထားသည်။ စကားပြောတွင် စာချုပ်ကို နောက်မှပေးမည် သို့မဟုတ် မပေးဟု ဆိုထားသည်။',
    th: 'ประกาศบอกว่ามีสัญญาจ้างที่เป็นทางการ แต่ในแชทบอกว่าจะให้สัญญาทีหลังหรือไม่มีสัญญา',
  },
  contract_pay_first: {
    en: 'The ad promises an official contract. The chat asks you to pay before you see the contract.',
    id: 'Iklan menjanjikan kontrak resmi. Chat meminta Anda membayar sebelum melihat kontrak.',
    tl: 'Nangangako ang ad ng opisyal na kontrata. Sa chat, pinagbabayad ka bago mo makita ang kontrata.',
    my: 'ကြော်ငြာတွင် တရားဝင်စာချုပ် ပေးမည်ဟု ဆိုထားသည်။ စကားပြောတွင် စာချုပ်မမြင်ရမီ ငွေပေးရန် တောင်းထားသည်။',
    th: 'ประกาศบอกว่ามีสัญญาจ้างที่เป็นทางการ แต่ในแชทขอให้คุณจ่ายเงินก่อนเห็นสัญญา',
  },
  visa_tourist: {
    en: 'The ad promises a work visa. The chat says to travel on a tourist visa.',
    id: 'Iklan menjanjikan visa kerja. Chat menyuruh berangkat dengan visa turis.',
    tl: 'Nangangako ang ad ng work visa. Sa chat, sinasabing bumiyahe gamit ang tourist visa.',
    my: 'ကြော်ငြာတွင် အလုပ်ဗီဇာ ပေးမည်ဟု ဆိုထားသည်။ စကားပြောတွင် ခရီးသွားဗီဇာဖြင့် လာရန် ဆိုထားသည်။',
    th: 'ประกาศบอกว่ามีวีซ่าทำงาน แต่ในแชทบอกให้เดินทางด้วยวีซ่าท่องเที่ยว',
  },
  visa_none: {
    en: 'The ad promises a work visa. The chat says you do not need a visa or permit.',
    id: 'Iklan menjanjikan visa kerja. Chat mengatakan Anda tidak perlu visa atau izin.',
    tl: 'Nangangako ang ad ng work visa. Sa chat, sinasabing hindi mo kailangan ng visa o permit.',
    my: 'ကြော်ငြာတွင် အလုပ်ဗီဇာ ပေးမည်ဟု ဆိုထားသည်။ စကားပြောတွင် ဗီဇာ သို့မဟုတ် ပါမစ် မလိုဟု ဆိုထားသည်။',
    th: 'ประกาศบอกว่ามีวีซ่าทำงาน แต่ในแชทบอกว่าไม่ต้องมีวีซ่าหรือใบอนุญาต',
  },
  meeting_informal: {
    en: 'The ad names a workplace or an airport. The chat arranges a driver, a border pickup or a place it does not name.',
    id: 'Iklan menyebut tempat kerja atau bandara. Chat mengatur jemputan sopir, jemputan di perbatasan, atau tempat yang tidak disebut.',
    tl: 'Binabanggit ng ad ang lugar ng trabaho o airport. Sa chat, may driver, sundo sa border, o lugar na hindi sinasabi.',
    my: 'ကြော်ငြာတွင် အလုပ်နေရာ သို့မဟုတ် လေဆိပ်ကို ဖော်ပြထားသည်။ စကားပြောတွင် ကားဆရာ၊ နယ်စပ်တွင် ကြိုခြင်း သို့မဟုတ် အမည်မဖော်သောနေရာကို စီစဉ်ထားသည်။',
    th: 'ประกาศระบุสถานที่ทำงานหรือสนามบิน แต่ในแชทนัดให้คนขับรถมารับ รับที่ชายแดน หรือที่ที่ไม่บอกชื่อ',
  },
  employer_different: {
    en: 'The company name in the chat does not match the company in the ad.',
    id: 'Nama perusahaan di chat tidak sama dengan perusahaan di iklan.',
    tl: 'Hindi tugma ang pangalan ng kumpanya sa chat at sa ad.',
    my: 'စကားပြောထဲရှိ ကုမ္ပဏီအမည်သည် ကြော်ငြာထဲရှိ ကုမ္ပဏီနှင့် မကိုက်ညီပါ။',
    th: 'ชื่อบริษัทในแชทไม่ตรงกับบริษัทในประกาศ',
  },
  employer_refused: {
    en: 'The ad names a company. The chat does not say who the employer is yet.',
    id: 'Iklan menyebut nama perusahaan. Chat belum menyebut siapa pemberi kerjanya.',
    tl: 'May pangalan ng kumpanya ang ad. Sa chat, hindi pa sinasabi kung sino ang employer.',
    my: 'ကြော်ငြာတွင် ကုမ္ပဏီအမည် ပါသည်။ စကားပြောတွင် အလုပ်ရှင်မည်သူဖြစ်ကြောင်း မပြောသေးပါ။',
    th: 'ประกาศระบุชื่อบริษัท แต่ในแชทยังไม่บอกว่านายจ้างคือใคร',
  },
  workplace_refused: {
    en: 'The ad names the company or workplace. The chat holds back the workplace address until later.',
    id: 'Iklan menyebut perusahaan atau tempat kerja. Chat menahan alamat tempat kerja sampai nanti.',
    tl: 'Binabanggit ng ad ang kumpanya o lugar ng trabaho. Sa chat, mamaya pa ibibigay ang address ng trabaho.',
    my: 'ကြော်ငြာတွင် ကုမ္ပဏီ သို့မဟုတ် အလုပ်နေရာကို ဖော်ပြထားသည်။ စကားပြောတွင် အလုပ်နေရာလိပ်စာကို နောက်မှပြောမည်ဟု ဆိုထားသည်။',
    th: 'ประกาศระบุบริษัทหรือสถานที่ทำงาน แต่ในแชทบอกว่าจะให้ที่อยู่ที่ทำงานทีหลัง',
  },
  salary_different: {
    en: 'The salary in the chat is quite different from the salary in the ad.',
    id: 'Gaji di chat cukup berbeda dari gaji di iklan.',
    tl: 'Malaki ang pagkakaiba ng sahod sa chat at sa ad.',
    my: 'စကားပြောထဲရှိ လစာသည် ကြော်ငြာထဲရှိ လစာနှင့် အတော်ကွာခြားသည်။',
    th: 'เงินเดือนในแชทต่างจากเงินเดือนในประกาศค่อนข้างมาก',
  },
};

export type SignalCode =
  | 'passport_hold'
  | 'passport_photo'
  | 'id_copy'
  | 'secrecy'
  | 'pay_before_contract'
  | 'personal_account'
  | 'worker_fee'
  | 'tourist_visa'
  | 'no_visa'
  | 'border_pickup'
  | 'driver_pickup'
  | 'unnamed_meeting'
  | 'border_route'
  | 'employer_withheld'
  | 'workplace_withheld';

export const SIGNAL_LABEL: Record<SignalCode, L> = {
  passport_hold: {
    en: 'Someone asks to keep your passport',
    id: 'Ada yang meminta untuk memegang paspor Anda',
    tl: 'May humihiling na hawakan ang pasaporte mo',
    my: 'သင့်ပတ်စပို့ကို သိမ်းထားရန် တောင်းဆိုထားသည်',
    th: 'มีการขอเก็บพาสปอร์ตของคุณไว้',
  },
  passport_photo: {
    en: 'The chat asks for a photo of your passport',
    id: 'Chat meminta foto paspor Anda',
    tl: 'Hinihingi sa chat ang litrato ng pasaporte mo',
    my: 'စကားပြောတွင် ပတ်စပို့ဓာတ်ပုံ တောင်းထားသည်',
    th: 'ในแชทขอรูปถ่ายพาสปอร์ตของคุณ',
  },
  id_copy: {
    en: 'The chat asks for a copy of your ID',
    id: 'Chat meminta salinan kartu identitas Anda',
    tl: 'Hinihingi sa chat ang kopya ng ID mo',
    my: 'စကားပြောတွင် မှတ်ပုံတင်မိတ္တူ တောင်းထားသည်',
    th: 'ในแชทขอสำเนาบัตรประจำตัวของคุณ',
  },
  secrecy: {
    en: 'Asks you to keep the job secret from family or officials',
    id: 'Meminta Anda merahasiakan pekerjaan ini dari keluarga atau petugas',
    tl: 'Pinalilihim sa iyo ang trabaho sa pamilya o mga opisyal',
    my: 'အလုပ်အကြောင်းကို မိသားစု သို့မဟုတ် အာဏာပိုင်များထံ လျှို့ဝှက်ထားရန် ပြောထားသည်',
    th: 'ขอให้ปิดเรื่องงานนี้เป็นความลับจากครอบครัวหรือเจ้าหน้าที่',
  },
  pay_before_contract: {
    en: 'Asks for payment before a contract is signed',
    id: 'Meminta pembayaran sebelum kontrak ditandatangani',
    tl: 'Humihingi ng bayad bago pirmahan ang kontrata',
    my: 'စာချုပ်မချုပ်မီ ငွေပေးရန် တောင်းထားသည်',
    th: 'ขอให้จ่ายเงินก่อนเซ็นสัญญา',
  },
  personal_account: {
    en: 'Asks you to pay into a personal account',
    id: 'Meminta Anda membayar ke rekening pribadi',
    tl: 'Pinagbabayad ka sa personal na account',
    my: 'ကိုယ်ပိုင်အကောင့်သို့ ငွေလွှဲရန် တောင်းထားသည်',
    th: 'ขอให้โอนเงินเข้าบัญชีส่วนตัว',
  },
  worker_fee: {
    en: 'Asks the worker to pay a fee',
    id: 'Meminta pekerja membayar biaya',
    tl: 'Pinagbabayad ng bayarin ang manggagawa',
    my: 'အလုပ်သမားထံ ကြေးတောင်းထားသည်',
    th: 'ขอให้คนงานจ่ายค่าธรรมเนียม',
  },
  tourist_visa: {
    en: 'Says to travel on a tourist visa for work',
    id: 'Menyuruh berangkat kerja dengan visa turis',
    tl: 'Sinasabing bumiyahe gamit ang tourist visa para magtrabaho',
    my: 'အလုပ်လုပ်ရန် ခရီးသွားဗီဇာဖြင့် လာရန် ပြောထားသည်',
    th: 'บอกให้เดินทางไปทำงานด้วยวีซ่าท่องเที่ยว',
  },
  no_visa: {
    en: 'Says no visa or work permit is needed',
    id: 'Mengatakan tidak perlu visa atau izin kerja',
    tl: 'Sinasabing hindi kailangan ng visa o work permit',
    my: 'ဗီဇာ သို့မဟုတ် အလုပ်ပါမစ် မလိုဟု ပြောထားသည်',
    th: 'บอกว่าไม่ต้องมีวีซ่าหรือใบอนุญาตทำงาน',
  },
  border_pickup: {
    en: 'Pickup arranged at a border',
    id: 'Penjemputan diatur di perbatasan',
    tl: 'May sundo sa border',
    my: 'နယ်စပ်တွင် ကြိုရန် စီစဉ်ထားသည်',
    th: 'นัดรับที่ชายแดน',
  },
  driver_pickup: {
    en: 'A driver will pick you up',
    id: 'Sopir akan menjemput Anda',
    tl: 'May driver na susundo sa iyo',
    my: 'ကားဆရာက လာကြိုမည်ဟု စီစဉ်ထားသည်',
    th: 'นัดให้คนขับรถมารับคุณ',
  },
  unnamed_meeting: {
    en: 'The meeting place is not named',
    id: 'Tempat bertemu tidak disebut',
    tl: 'Hindi sinasabi ang tagpuan',
    my: 'တွေ့ဆုံမည့်နေရာကို အမည်မဖော်ပါ',
    th: 'ไม่บอกชื่อสถานที่นัดพบ',
  },
  border_route: {
    en: 'The route passes a border town',
    id: 'Rutenya melewati kota perbatasan',
    tl: 'Dumadaan ang ruta sa bayan sa border',
    my: 'ခရီးလမ်းကြောင်းသည် နယ်စပ်မြို့ကို ဖြတ်သွားသည်',
    th: 'เส้นทางผ่านเมืองชายแดน',
  },
  employer_withheld: {
    en: 'Does not say who the employer is',
    id: 'Tidak menyebut siapa pemberi kerjanya',
    tl: 'Hindi sinasabi kung sino ang employer',
    my: 'အလုပ်ရှင်မည်သူဖြစ်ကြောင်း မပြောပါ',
    th: 'ไม่บอกว่านายจ้างคือใคร',
  },
  workplace_withheld: {
    en: 'Holds back the workplace address until later',
    id: 'Menahan alamat tempat kerja sampai nanti',
    tl: 'Mamaya pa ibibigay ang address ng trabaho',
    my: 'အလုပ်နေရာလိပ်စာကို နောက်မှပြောမည်ဟု ဆိုထားသည်',
    th: 'บอกว่าจะให้ที่อยู่ที่ทำงานทีหลัง',
  },
};

export const UNCLEAR_FIELDS = ['workplace', 'contract', 'visaOrPermit', 'employer', 'salary'] as const;
export type UnclearField = (typeof UNCLEAR_FIELDS)[number];

export const UNCLEAR_TEXT: Record<UnclearField, L> = {
  workplace: {
    en: 'No workplace address was given',
    id: 'Tidak ada alamat tempat kerja',
    tl: 'Walang ibinigay na address ng trabaho',
    my: 'အလုပ်နေရာလိပ်စာ မပေးထားပါ',
    th: 'ไม่มีที่อยู่ของสถานที่ทำงาน',
  },
  contract: {
    en: 'No written contract was mentioned',
    id: 'Tidak disebut ada kontrak tertulis',
    tl: 'Walang nabanggit na nakasulat na kontrata',
    my: 'စာချုပ် ရှိကြောင်း မဖော်ပြထားပါ',
    th: 'ไม่มีการพูดถึงสัญญาจ้างเป็นลายลักษณ์อักษร',
  },
  visaOrPermit: {
    en: 'No work visa or work permit was mentioned',
    id: 'Tidak disebut visa kerja atau izin kerja',
    tl: 'Walang nabanggit na work visa o work permit',
    my: 'အလုပ်ဗီဇာ သို့မဟုတ် အလုပ်ပါမစ် အကြောင်း မဖော်ပြထားပါ',
    th: 'ไม่มีการพูดถึงวีซ่าทำงานหรือใบอนุญาตทำงาน',
  },
  employer: {
    en: 'No employer name was given',
    id: 'Tidak ada nama pemberi kerja',
    tl: 'Walang ibinigay na pangalan ng employer',
    my: 'အလုပ်ရှင်အမည် မပေးထားပါ',
    th: 'ไม่มีชื่อนายจ้าง',
  },
  salary: {
    en: 'No salary amount was given',
    id: 'Tidak ada jumlah gaji',
    tl: 'Walang ibinigay na halaga ng sahod',
    my: 'လစာပမာဏ မပေးထားပါ',
    th: 'ไม่มีจำนวนเงินเดือน',
  },
};

export const FINDING_TEXT: Record<FindingCode, L> = {
  company_found: {
    en: 'We found a company with this name',
    id: 'Kami menemukan perusahaan dengan nama ini',
    tl: 'May nakita kaming kumpanya na may ganitong pangalan',
    my: 'ဤအမည်ဖြင့် ကုမ္ပဏီတစ်ခုကို ကျွန်ုပ်တို့ ရှာတွေ့ခဲ့သည်',
    th: 'เราพบบริษัทที่มีชื่อนี้',
  },
  company_not_found: {
    en: 'We could not find a company with this name',
    id: 'Kami tidak menemukan perusahaan dengan nama ini',
    tl: 'Wala kaming nakitang kumpanya na may ganitong pangalan',
    my: 'ဤအမည်ဖြင့် ကုမ္ပဏီကို ကျွန်ုပ်တို့ ရှာမတွေ့ပါ',
    th: 'เราไม่พบบริษัทที่มีชื่อนี้',
  },
  company_not_checked: {
    en: 'We could not search for this company right now',
    id: 'Kami belum bisa mencari perusahaan ini sekarang',
    tl: 'Hindi namin mahanap ngayon ang kumpanyang ito',
    my: 'ဤကုမ္ပဏီကို ယခု ရှာဖွေ၍ မရပါ',
    th: 'ตอนนี้เราค้นหาบริษัทนี้ไม่ได้',
  },
  recruiter_not_confirmed: {
    en: 'We could not confirm this recruiter works for that company',
    id: 'Kami tidak dapat memastikan perekrut ini bekerja untuk perusahaan itu',
    tl: 'Hindi namin makumpirma na nagtatrabaho ang recruiter na ito para sa kumpanyang iyon',
    my: 'ဤအလုပ်ခေါ်သူသည် ထိုကုမ္ပဏီအတွက် အလုပ်လုပ်ကြောင်း ကျွန်ုပ်တို့ အတည်မပြုနိုင်ပါ',
    th: 'เรายืนยันไม่ได้ว่าผู้รับสมัครคนนี้ทำงานให้บริษัทนั้น',
  },
};

export const SOURCE_NAME: Record<'ad' | 'chat', L> = {
  ad: { en: 'Ad', id: 'Iklan', tl: 'Ad', my: 'ကြော်ငြာ', th: 'ประกาศ' },
  chat: { en: 'Chat', id: 'Chat', tl: 'Chat', my: 'စကားပြော', th: 'แชท' },
};

/** Every table above, for the wording tests. */
export const ALL_TABLES: Array<Record<string, L | undefined>> = [
  TIER_HEADLINE,
  TIER_SUMMARY,
  TIER_SPOKEN,
  FIELD_LABEL,
  CONFLICT_TEXT,
  SIGNAL_LABEL,
  UNCLEAR_TEXT,
  FINDING_TEXT,
  SOURCE_NAME,
];
