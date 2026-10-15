import { assessJobOffer } from '../src/job/assess.js';
import type { AttentionTier, JobFacts } from '../src/job/types.js';
import type { Lang } from '../src/types.js';

export interface JobPairEvalCase {
  id: string;
  lang: Lang;
  description: string;
  expectedTier: AttentionTier;
  mustNotBe: AttentionTier;
  ad: JobFacts;
  chat: JobFacts;
}

function f(): JobFacts {
  return {
    employer: null,
    jobTitle: null,
    workplace: null,
    destinationCountry: null,
    salary: null,
    workerFee: null,
    contract: null,
    visaOrPermit: null,
    travelArrangedBy: null,
    route: null,
    meetingPoint: null,
    documentRequest: null,
    paymentRequest: null,
    urgency: null,
    contactChannel: null,
    secrecyRequest: null,
  };
}

export const JOB_PAIRS: JobPairEvalCase[] = [
  // 1. SCAM 1 (EN): Ad promises free Bangkok job; chat demands fee and tourist visa
  {
    id: 'job-pair-scam-1-en',
    lang: 'en',
    description: 'Ad free Bangkok job vs chat 400 USD fee and tourist visa',
    expectedTier: 'pause',
    mustNotBe: 'lower',
    ad: {
      ...f(),
      employer: { value: 'Bangkok Tech Services Ltd', quote: 'Bangkok Tech Services Ltd', confidence: 0.9 },
      jobTitle: { value: 'Customer Service Representative', quote: 'Customer Service', confidence: 0.9 },
      workplace: { value: 'Bangkok, Silom Road', quote: 'Silom Road, Bangkok', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'Thailand', confidence: 0.9 },
      workerFee: { value: 'none stated', quote: 'Zero placement fee, free airfare', confidence: 0.95 },
      contract: { value: 'official', quote: 'Official employment contract on arrival', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Non-Immigrant B work permit sponsored', confidence: 0.9 },
    },
    chat: {
      ...f(),
      employer: { value: 'Bangkok Tech HR', quote: 'Contact HR via telegram', confidence: 0.8 },
      workerFee: { value: 'Fee required', quote: 'You need to transfer 400 USD advance deposit today', confidence: 0.9 },
      contract: { value: 'later', quote: 'Contract will be signed after 3 months trial', confidence: 0.85 },
      visaOrPermit: { value: 'tourist', quote: 'Enter on a 60-day tourist visa first', confidence: 0.95 },
      paymentRequest: { value: 'before_contract', quote: 'Pay deposit before contract preparation', confidence: 0.9 },
    },
  },

  // 2. SCAM 2 (MY): Ad promises legal factory job; chat asks for passport surrender & border pickup
  {
    id: 'job-pair-scam-2-my',
    lang: 'my',
    description: 'Ad legal factory job vs chat passport hold and Mae Sot pickup',
    expectedTier: 'pause',
    mustNotBe: 'lower',
    ad: {
      ...f(),
      employer: { value: 'Thai Union Foods', quote: 'Thai Union Foods Co., Ltd.', confidence: 0.9 },
      jobTitle: { value: 'Factory Packaging Staff', quote: 'စက်ရုံထုပ်ပိုးဝန်ထမ်း', confidence: 0.9 },
      workplace: { value: 'Samut Sakhon', quote: 'စမွတ်စခွန်စက်ရုံ', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ထိုင်းနိုင်ငံ', confidence: 0.95 },
      contract: { value: 'official', quote: 'တရားဝင် MOU စာချုပ်ဖြင့် ခေါ်ယူခြင်း', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'တရားဝင် အလုပ်သမားဗီဇာ ရရှိမည်', confidence: 0.9 },
    },
    chat: {
      ...f(),
      meetingPoint: { value: 'border', quote: 'မဲဆောက်နယ်စပ်တွင် ကားဖြင့် လာကြိုပါမည်', confidence: 0.9 },
      documentRequest: { value: 'passport_hold', quote: 'ပတ်စပို့မူရင်းကို နယ်စပ်တွင် အပ်ရပါမည်', confidence: 0.95 },
      secrecyRequest: { value: true, quote: 'မိသားစု သို့မဟုတ် ရဲကို မပြောပါနှင့်', confidence: 0.9 },
      paymentRequest: { value: 'personal_account', quote: 'ကြိုတင်ငွေ ကျပ် ၅ သိန်း ကိုယ်ပိုင်အကောင့်သို့ လွှဲပေးပါ', confidence: 0.9 },
    },
  },

  // 3. SCAM 3 (TH): Ad in Thai promises admin job in Bangkok; chat routes to border with secrecy
  {
    id: 'job-pair-scam-3-th',
    lang: 'th',
    description: 'Ad admin in Bangkok vs chat secret driver pickup at Poipet border',
    expectedTier: 'pause',
    mustNotBe: 'lower',
    ad: {
      ...f(),
      employer: { value: 'Siam Digital Hub', quote: 'บริษัท สยาม ดิจิทัล ฮับ จำกัด', confidence: 0.9 },
      jobTitle: { value: 'Data Entry Admin', quote: 'เจ้าหน้าที่แอดมินพิมพ์ข้อมูล', confidence: 0.9 },
      workplace: { value: 'Bangkok, Asoke', quote: 'สำนักงานใหญ่อโศก กรุงเทพฯ', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ประเทศไทย', confidence: 0.9 },
      contract: { value: 'official', quote: 'มีสัญญาจ้างงานตามกฎหมายแรงงาน', confidence: 0.9 },
    },
    chat: {
      ...f(),
      meetingPoint: { value: 'border', quote: 'ให้ไปขึ้นรถตู้ที่ด่านปอยเปตเพื่อเริ่มงาน', confidence: 0.9 },
      secrecyRequest: { value: true, quote: 'ห้ามบอกคนในครอบครัวหรือหน่วยงานราชการ', confidence: 0.95 },
      contract: { value: 'later', quote: 'สัญญาจะให้เซ็นที่ออฟฟิศชายแดน', confidence: 0.85 },
      documentRequest: { value: 'passport_photo', quote: 'ส่งรูปถ่ายหน้าพาสปอร์ตมาก่อนทันที', confidence: 0.9 },
    },
  },

  // 4. SCAM 4 (EN): Ad promises marketing job with flight; chat demands passport photo and crypto payment
  {
    id: 'job-pair-scam-4-en',
    lang: 'en',
    description: 'Ad online marketing vs chat passport demand and crypto wallet deposit',
    expectedTier: 'pause',
    mustNotBe: 'lower',
    ad: {
      ...f(),
      employer: { value: 'Apex Global Media', quote: 'Apex Global Media Group', confidence: 0.9 },
      jobTitle: { value: 'Marketing Associate', quote: 'Marketing Associate', confidence: 0.9 },
      workplace: { value: 'Kuala Lumpur, Malaysia', quote: 'Kuala Lumpur corporate tower', confidence: 0.9 },
      destinationCountry: { value: 'Malaysia', quote: 'Malaysia', confidence: 0.95 },
      workerFee: { value: 'none stated', quote: 'No fees charged to candidates', confidence: 0.9 },
      contract: { value: 'official', quote: 'Direct employment contract with benefits', confidence: 0.9 },
    },
    chat: {
      ...f(),
      documentRequest: { value: 'passport_hold', quote: 'Original passport must be held during employment period', confidence: 0.95 },
      paymentRequest: { value: 'personal_account', quote: 'Send 300 USDT crypto deposit for visa processing', confidence: 0.95 },
      workerFee: { value: 'Deposit required', quote: '300 USDT security fee', confidence: 0.9 },
    },
  },

  // 5. SCAM 5 (MY): Ad promises hotel service in Yangon/Thailand; chat demands payment before contract
  {
    id: 'job-pair-scam-5-my',
    lang: 'my',
    description: 'Ad hotel service vs chat payment before contract and secret route',
    expectedTier: 'pause',
    mustNotBe: 'lower',
    ad: {
      ...f(),
      employer: { value: 'Grand Palace Hospitality', quote: 'Grand Palace Hotel & Resort', confidence: 0.9 },
      jobTitle: { value: 'Hotel Service Staff', quote: 'ဟိုတယ်ဝန်ဆောင်မှုဝန်ထမ်း', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ထိုင်းနိုင်ငံ', confidence: 0.9 },
      workerFee: { value: 'none stated', quote: 'အေဂျင်စီကြေးလုံးဝမလိုပါ', confidence: 0.9 },
      contract: { value: 'official', quote: 'တရားဝင်စာချုပ်ချုပ်ဆိုမည်', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'တရားဝင်အလုပ်လုပ်ခွင့်ဗီဇာ', confidence: 0.9 },
    },
    chat: {
      ...f(),
      paymentRequest: { value: 'before_contract', quote: 'စာချုပ်မချုပ်မီ စပေါ်ငွေ ကြိုသွင်းရမည်', confidence: 0.9 },
      workerFee: { value: 'Deposit required', quote: 'စပေါ်ငွေ ဘတ် ၁၀၀၀၀ ပေးသွင်းရန်', confidence: 0.9 },
      meetingPoint: { value: 'driver_pickup', quote: 'နယ်စပ်မှ ကားသမားက လာကြိုပါမည်', confidence: 0.85 },
      secrecyRequest: { value: true, quote: 'ခရီးစဉ်ကို အခြားသူများအား အသိမပေးပါနှင့်', confidence: 0.9 },
    },
  },

  // 6. LEGIT 1 (EN): Normal inconsistencies (recruiter name variant & monthly vs annual pay)
  {
    id: 'job-pair-legit-1-en',
    lang: 'en',
    description: 'Legit job with monthly vs yearly salary phrasing',
    expectedTier: 'lower',
    mustNotBe: 'pause',
    ad: {
      ...f(),
      employer: { value: 'DHL Supply Chain Thailand', quote: 'DHL Supply Chain Thailand Ltd', confidence: 0.95 },
      jobTitle: { value: 'Warehouse Associate', quote: 'Warehouse Associate', confidence: 0.9 },
      workplace: { value: 'Bang Na, Bangkok', quote: 'Bang Na Logistics Campus, Bangkok', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'Thailand', confidence: 0.95 },
      salary: { value: { amount: '360000', currency: 'THB', period: 'yearly' }, quote: '360,000 THB per year', confidence: 0.9 },
      contract: { value: 'official', quote: 'Permanent employment contract with health insurance', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Non-Immigrant B work permit provided', confidence: 0.9 },
      workerFee: { value: 'none stated', quote: 'Direct employer hiring, no recruitment fees', confidence: 0.95 },
    },
    chat: {
      ...f(),
      employer: { value: 'DHL Supply Chain Thailand', quote: 'DHL Thailand HR Talent Acquisition', confidence: 0.95 },
      jobTitle: { value: 'Warehouse Associate', quote: 'Warehouse Associate position', confidence: 0.9 },
      workplace: { value: 'Bang Na, Bangkok', quote: 'Bang Na site', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'Thailand', confidence: 0.95 },
      salary: { value: { amount: '30000', currency: 'THB', period: 'monthly' }, quote: 'Base salary is 30,000 THB per month', confidence: 0.9 },
      contract: { value: 'official', quote: 'Official employment contract will be signed at our Bang Na office', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Our legal team processes your Non-B visa directly with Immigration', confidence: 0.9 },
      meetingPoint: { value: 'workplace', quote: 'Report to Reception at Bang Na Logistics Campus', confidence: 0.9 },
      contactChannel: { value: 'company_channel', quote: 'careers.th@dhl.example.com', confidence: 0.95 },
    },
  },

  // 7. LEGIT 2 (MY): Normal factory job with later interview date
  {
    id: 'job-pair-legit-2-my',
    lang: 'my',
    description: 'Legit factory job with interview scheduling',
    expectedTier: 'lower',
    mustNotBe: 'pause',
    ad: {
      ...f(),
      employer: { value: 'Thai Garment Factory', quote: 'Thai Garment Manufacturing Co.', confidence: 0.9 },
      jobTitle: { value: 'Garment Sewing Operator', quote: 'အထည်ချုပ်စက်ချုပ်ကျွမ်းကျင်', confidence: 0.9 },
      workplace: { value: 'Chonburi', quote: 'ချွန်ဘူရီစက်မှုဇုန်', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ထိုင်းနိုင်ငံ', confidence: 0.95 },
      contract: { value: 'official', quote: 'တရားဝင် MOU စာချုပ် အပြည့်အစုံ', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'အလုပ်သမားဗီဇာ ရရှိမည်', confidence: 0.9 },
      workerFee: { value: 'none stated', quote: 'ကြိုတင်ငွေ ပေးသွင်းရန် မလိုပါ', confidence: 0.9 },
    },
    chat: {
      ...f(),
      employer: { value: 'Thai Garment Factory', quote: 'Thai Garment HR ဌာန', confidence: 0.9 },
      jobTitle: { value: 'Garment Sewing Operator', quote: 'စက်ချုပ်အလုပ်', confidence: 0.9 },
      workplace: { value: 'Chonburi', quote: 'ချွန်ဘူရီစက်ရုံ', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ထိုင်းနိုင်ငံ', confidence: 0.95 },
      contract: { value: 'official', quote: 'MOU စာချုပ်ကို ရုံးချုပ်တွင် ချုပ်ဆိုပါမည်', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'ဗီဇာနှင့် Work Permit အား ကုမ္ပဏီမှ လျှောက်ထားပေးမည်', confidence: 0.9 },
      meetingPoint: { value: 'workplace', quote: 'စက်ရုံရုံးခန်းသို့ လာရောက်အင်တာဗျူးပါ', confidence: 0.85 },
      contactChannel: { value: 'company_channel', quote: 'hr@thaigarment.example.com', confidence: 0.9 },
    },
  },

  // 8. LEGIT 3 (TH): Legit restaurant branch staff in Bangkok
  {
    id: 'job-pair-legit-3-th',
    lang: 'th',
    description: 'Legit restaurant staff hiring with official contract and address',
    expectedTier: 'lower',
    mustNotBe: 'pause',
    ad: {
      ...f(),
      employer: { value: 'MK Restaurant Group', quote: 'บริษัท เอ็มเค เรสโตรองต์ กรุ๊ป จำกัด (มหาชน)', confidence: 0.95 },
      jobTitle: { value: 'Kitchen Assistant', quote: 'พนักงานผู้ช่วยครัว', confidence: 0.9 },
      workplace: { value: 'Bangkok, Central World', quote: 'สาขาเซ็นทรัลเวิลด์ กรุงเทพฯ', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ประเทศไทย', confidence: 0.95 },
      contract: { value: 'official', quote: 'สัญญาจ้างงานประจำ สวัสดิการครบถ้วน', confidence: 0.9 },
      workerFee: { value: 'none stated', quote: 'ไม่มีค่าใช้จ่ายในการสมัครงาน', confidence: 0.95 },
    },
    chat: {
      ...f(),
      employer: { value: 'MK Restaurant Group', quote: 'ฝ่ายบุคคล สำนักงานใหญ่ เอ็มเค', confidence: 0.95 },
      jobTitle: { value: 'Kitchen Assistant', quote: 'ตำแหน่งผู้ช่วยครัว', confidence: 0.9 },
      workplace: { value: 'Bangkok, Central World', quote: 'เซ็นทรัลเวิลด์ ชั้น 6', confidence: 0.9 },
      destinationCountry: { value: 'Thailand', quote: 'ประเทศไทย', confidence: 0.95 },
      contract: { value: 'official', quote: 'เซ็นสัญญาจ้างงานที่ฝ่ายบุคคลสำนักงานใหญ่', confidence: 0.9 },
      meetingPoint: { value: 'workplace', quote: 'มาสัมภาษณ์ที่สำนักงานใหญ่ บางนา', confidence: 0.9 },
      contactChannel: { value: 'company_channel', quote: 'recruitment@mkrestaurant.example.com', confidence: 0.95 },
    },
  },

  // 9. LEGIT 4 (EN): Legitimate nursing aide job with accredited hospital
  {
    id: 'job-pair-legit-4-en',
    lang: 'en',
    description: 'Legit nursing aide role with accredited hospital and official work visa',
    expectedTier: 'lower',
    mustNotBe: 'pause',
    ad: {
      ...f(),
      employer: { value: 'Singapore General Hospital', quote: 'Singapore General Hospital', confidence: 0.95 },
      jobTitle: { value: 'Healthcare Assistant', quote: 'Healthcare Assistant', confidence: 0.9 },
      workplace: { value: 'Outram Road, Singapore', quote: 'Outram Road, Singapore', confidence: 0.95 },
      destinationCountry: { value: 'Singapore', quote: 'Singapore', confidence: 0.95 },
      contract: { value: 'official', quote: '2-year institutional contract with Ministry of Manpower registration', confidence: 0.95 },
      visaOrPermit: { value: 'work_visa', quote: 'MOM S-Pass / Work Permit sponsorship', confidence: 0.95 },
      workerFee: { value: 'none stated', quote: 'Zero placement fee policy under MOM rules', confidence: 0.95 },
    },
    chat: {
      ...f(),
      employer: { value: 'Singapore General Hospital', quote: 'SGH Human Resource Division', confidence: 0.95 },
      jobTitle: { value: 'Healthcare Assistant', quote: 'Healthcare Assistant (Inpatient)', confidence: 0.9 },
      workplace: { value: 'Outram Road, Singapore', quote: 'SGH Outram Campus', confidence: 0.95 },
      destinationCountry: { value: 'Singapore', quote: 'Singapore', confidence: 0.95 },
      contract: { value: 'official', quote: 'Formal employment offer letter sent via SingPass / official email', confidence: 0.95 },
      visaOrPermit: { value: 'work_visa', quote: 'IPA (In-Principle Approval) work pass issued before departure', confidence: 0.95 },
      meetingPoint: { value: 'airport', quote: 'Hospital liaison officer receives you at Changi Airport Terminal 3', confidence: 0.9 },
      contactChannel: { value: 'company_channel', quote: 'careers@sgh.example.com', confidence: 0.95 },
    },
  },

  // 10. LEGIT 5 (ID): Legitimate plantation worker with formal agency contract
  {
    id: 'job-pair-legit-5-id',
    lang: 'id',
    description: 'Legit plantation job with certified P2MI agency and official contract',
    expectedTier: 'lower',
    mustNotBe: 'pause',
    ad: {
      ...f(),
      employer: { value: 'Sime Darby Plantation', quote: 'Sime Darby Plantation Berhad', confidence: 0.9 },
      jobTitle: { value: 'Agricultural Technician', quote: 'Teknisi Pertanian', confidence: 0.9 },
      destinationCountry: { value: 'Malaysia', quote: 'Malaysia', confidence: 0.95 },
      contract: { value: 'official', quote: 'Kontrak kerja resmi terdaftar BP2MI', confidence: 0.95 },
      visaOrPermit: { value: 'work_visa', quote: 'Calling Visa dan Visa Kerja resmi Malaysia', confidence: 0.95 },
      workerFee: { value: 'none stated', quote: 'Program bebas biaya penempatan sesuai peraturan', confidence: 0.9 },
    },
    chat: {
      ...f(),
      employer: { value: 'Sime Darby Plantation', quote: 'Perwakilan Resmi Sime Darby', confidence: 0.9 },
      jobTitle: { value: 'Agricultural Technician', quote: 'Pekerja kebun bersertifikat', confidence: 0.9 },
      destinationCountry: { value: 'Malaysia', quote: 'Malaysia', confidence: 0.95 },
      contract: { value: 'official', quote: 'Tanda tangan kontrak resmi di kantor BP2MI', confidence: 0.95 },
      visaOrPermit: { value: 'work_visa', quote: 'Visa kerja resmi diterbitkan sebelum keberangkatan', confidence: 0.95 },
      meetingPoint: { value: 'airport', quote: 'Penjemputan resmi di Bandara KLIA', confidence: 0.9 },
      contactChannel: { value: 'company_channel', quote: 'hr@simedarby.example.com', confidence: 0.9 },
    },
  },
];

export async function runJobPairEval(): Promise<{ passed: boolean; results: Array<{ id: string; tier: AttentionTier; ok: boolean }> }> {
  const results = [];
  let allOk = true;

  for (const pair of JOB_PAIRS) {
    const res = await assessJobOffer({
      facts: { ad: pair.ad, chat: pair.chat },
      language: pair.lang,
    });

    const isOk = res.attention !== pair.mustNotBe;
    if (!isOk) allOk = false;
    results.push({ id: pair.id, tier: res.attention, ok: isOk });
  }

  return { passed: allOk, results };
}
