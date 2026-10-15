import type { Lang } from '../types.js';

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
      return `Jaringan SafeRoute: ${n} laporan terpisah`;
    case 'tl':
      return `SafeRoute network: ${n} magkakahiwalay na ulat`;
    case 'th':
      return `เครือข่าย SafeRoute: ${n} รายงานแยกกัน`;
    case 'my':
      return `SafeRoute ကွန်ရက်: သီးခြားတိုင်ကြားမှု ${n} ခု`;
    default:
      return `SafeRoute network: ${n} separate reports`;
  }
}

export function campaignLabel(lang: Lang, name: string, n: number): string {
  switch (lang) {
    case 'id':
      return `Mirip dengan kampanye "${name}" yang dilaporkan ${n} kali minggu ini`;
    case 'tl':
      return `Kahawig ng kampanyang "${name}" na iniulat nang ${n} beses ngayong linggo`;
    case 'th':
      return `คล้ายกับรูปแบบ "${name}" ที่มีรายงาน ${n} ครั้งในสัปดาห์นี้`;
    case 'my':
      return `"${name}" ဟု တိုင်ကြားထားသော လိမ်လည်မှုပုံစံနှင့် ဆင်တူသည်၊ ဤအပတ်အတွင်း ${n} ကြိမ် တိုင်ကြားထားသည်`;
    default:
      return `Looks similar to the "${name}" pattern reported ${n} times this week`;
  }
}
