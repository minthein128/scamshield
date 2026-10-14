import type { Lang } from '../types.js';

type Subject = 'phone' | 'handle' | 'account' | 'domain';

const SUBJECT: Record<Lang, Record<Subject, string>> = {
  en: { phone: 'This phone number', handle: 'This chat account', account: 'This payment account', domain: 'This website' },
  id: { phone: 'Nomor telepon ini', handle: 'Akun chat ini', account: 'Rekening pembayaran ini', domain: 'Situs web ini' },
  tl: { phone: 'Ang numerong ito', handle: 'Ang chat account na ito', account: 'Ang payment account na ito', domain: 'Ang website na ito' },
  my: { phone: 'ဤဖုန်းနံပါတ်', handle: 'ဤချတ်အကောင့်', account: 'ဤငွေပေးချေမှုအကောင့်', domain: 'ဤဝက်ဘ်ဆိုက်' },
};

export function reportedLabel(lang: Lang, subject: Subject, n: number): string {
  const s = SUBJECT[lang][subject];
  switch (lang) {
    case 'id':
      return `${s} dilaporkan ${n} kali dalam 30 hari terakhir`;
    case 'tl':
      return `${s} ay iniulat nang ${n} beses sa nakalipas na 30 araw`;
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
    case 'my':
      return `SafeRoute ကွန်ရက်: သီးခြားတိုင်ကြားမှု ${n} ခု`;
    default:
      return `SafeRoute network: ${n} separate reports`;
  }
}

export function campaignLabel(lang: Lang, name: string, n: number): string {
  switch (lang) {
    case 'id':
      return `Cocok dengan kampanye aktif "${name}", terlihat ${n} kali minggu ini`;
    case 'tl':
      return `Tugma sa aktibong kampanyang "${name}", nakita nang ${n} beses ngayong linggo`;
    case 'my':
      return `လက်ရှိ လိမ်လည်မှု "${name}" နှင့် တူညီသည်၊ ဤအပတ်အတွင်း ${n} ကြိမ် တွေ့ရှိထားသည်`;
    default:
      return `Matches an active "${name}" campaign seen ${n} times this week`;
  }
}
