import { APP_NAMES } from '../brand.js';
import type { Lang, ScamType } from '../types.js';

type Subject = 'phone' | 'handle' | 'account' | 'domain';

const SUBJECT: Record<Lang, Record<Subject, string>> = {
  en: { phone: 'This phone number', handle: 'This chat account', account: 'This payment account', domain: 'This website' },
  id: { phone: 'Nomor telepon ini', handle: 'Akun chat ini', account: 'Rekening pembayaran ini', domain: 'Situs web ini' },
  tl: { phone: 'Ang numerong ito', handle: 'Ang chat account na ito', account: 'Ang payment account na ito', domain: 'Ang website na ito' },
  my: { phone: 'ဤဖုန်းနံပါတ်', handle: 'ဤချတ်အကောင့်', account: 'ဤငွေပေးချေမှုအကောင့်', domain: 'ဤဝက်ဘ်ဆိုက်' },
  th: { phone: 'หมายเลขโทรศัพท์นี้', handle: 'บัญชีแชตนี้', account: 'บัญชีรับเงินนี้', domain: 'เว็บไซต์นี้' },
};

export function reportedLabel(lang: Lang, subject: Subject, n: number): string {
  const s = SUBJECT[lang][subject];
  switch (lang) {
    case 'id':
      return `${s} dilaporkan ${n} kali dalam 30 hari terakhir`;
    case 'tl':
      return `${s} ay iniulat nang ${n} beses sa nakalipas na 30 araw`;
    case 'th':
      return `${s}ถูกรายงาน ${n} ครั้งในช่วง 30 วันที่ผ่านมา`;
    case 'my':
      return `${s}ကို လွန်ခဲ့သော ရက် ၃၀ အတွင်း ${n} ကြိမ် တိုင်ကြားထားသည်`;
    default:
      return `${s} was reported ${n} times in the last 30 days`;
  }
}

export function reportedEvidence(lang: Lang, n: number): string {
  switch (lang) {
    case 'id':
      return `Jaringan ${APP_NAMES.id}: ${n} laporan terpisah`;
    case 'tl':
      return `${APP_NAMES.tl} network: ${n} magkakahiwalay na ulat`;
    case 'th':
      return `เครือข่าย ${APP_NAMES.th}: ${n} รายงานแยกกัน`;
    case 'my':
      return `${APP_NAMES.my} ကွန်ရက်: သီးခြားတိုင်ကြားမှု ${n} ခု`;
    default:
      return `${APP_NAMES.en} network: ${n} separate reports`;
  }
}

type NamedType = Exclude<ScamType, 'other' | 'none'>;

// Mirrors the reviewed app strings in feedback.json `choices`.
const SCAM_TYPE_NAME: Record<Exclude<Lang, 'en'>, Record<NamedType, string>> = {
  id: {
    job_trafficking: 'Lowongan kerja luar negeri',
    romance_pig_butchering: 'Asmara atau kripto',
    parcel_phishing: 'Paket atau tautan biaya',
    fake_agency: 'Penyalur tenaga kerja',
    marketplace_fraud: 'Toko online',
    investment: 'Investasi atau tugas',
  },
  tl: {
    job_trafficking: 'Alok na trabaho sa ibang bansa',
    romance_pig_butchering: 'Romance o crypto',
    parcel_phishing: 'Parcel o link ng bayarin',
    fake_agency: 'Recruitment agency',
    marketplace_fraud: 'Online shop',
    investment: 'Investment o task',
  },
  th: {
    job_trafficking: 'ชวนไปทำงานต่างประเทศ',
    romance_pig_butchering: 'หลอกให้รักหรือคริปโต',
    parcel_phishing: 'พัสดุหรือลิงก์เสียค่าธรรมเนียม',
    fake_agency: 'นายหน้าจัดหางาน',
    marketplace_fraud: 'ร้านค้าออนไลน์',
    investment: 'ลงทุนหรือทำภารกิจ',
  },
  my: {
    job_trafficking: 'နိုင်ငံခြား အလုပ်ကမ်းလှမ်းချက်',
    romance_pig_butchering: 'အချစ်ရေး သို့မဟုတ် ခရစ်ပတို',
    parcel_phishing: 'ပါဆယ် သို့မဟုတ် ဝန်ဆောင်ခ လင့်ခ်',
    fake_agency: 'အလုပ်အကိုင်ရှာဖွေရေး အေဂျင်စီ',
    marketplace_fraud: 'အွန်လိုင်း အရောင်းဆိုင်',
    investment: 'ရင်းနှီးမြှုပ်နှံမှု သို့မဟုတ် အလုပ်တာဝန်',
  },
};

const named = (t: ScamType | undefined): t is NamedType => t !== undefined && t !== 'other' && t !== 'none';

/** The network campaign line. English names the campaign; other languages name the scam type, since campaign keys are English. */
export function campaignLabel(lang: Lang, name: string, scamType: ScamType | undefined, n: number): string {
  if (lang === 'en') return `Looks similar to the "${name}" pattern reported ${n} times this week`;
  const type = named(scamType) ? SCAM_TYPE_NAME[lang][scamType] : undefined;
  switch (lang) {
    case 'id':
      return type
        ? `Mirip dengan pola penipuan "${type}" yang dilaporkan ${n} kali minggu ini`
        : `Mirip dengan pola penipuan yang dilaporkan ${n} kali minggu ini`;
    case 'tl':
      return type
        ? `Kahawig ng panlolokong "${type}" na iniulat nang ${n} beses ngayong linggo`
        : `Kahawig ng paraan ng panloloko na iniulat nang ${n} beses ngayong linggo`;
    case 'th':
      return type ? `คล้ายกับรูปแบบ "${type}" ที่มีรายงาน ${n} ครั้งในสัปดาห์นี้` : `คล้ายกับรูปแบบการหลอกลวงที่มีรายงาน ${n} ครั้งในสัปดาห์นี้`;
    case 'my':
      return type
        ? `"${type}" ဟု တိုင်ကြားထားသော လိမ်လည်မှုပုံစံနှင့် ဆင်တူသည်၊ ဤအပတ်အတွင်း ${n} ကြိမ် တိုင်ကြားထားသည်`
        : `တိုင်ကြားထားသော လိမ်လည်မှုပုံစံတစ်ခုနှင့် ဆင်တူသည်၊ ဤအပတ်အတွင်း ${n} ကြိမ် တိုင်ကြားထားသည်`;
  }
}
