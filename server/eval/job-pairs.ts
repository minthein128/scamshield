import type { Lang } from '../src/types.js';

/** Ad and chat pairs for the Job Shield eval. Every company, person, number and address is fictional. */
export interface JobPair {
  id: string;
  lang: Lang;
  kind: 'scam' | 'legit';
  /** What the pair tests. */
  about: string;
  ad: string;
  chat: string;
}

export const JOB_PAIRS: JobPair[] = [
  {
    id: 'scam-fee-en',
    lang: 'en',
    kind: 'scam',
    about: 'ad says no fee, chat asks for a fee before the contract',
    ad: 'Riverbend Fresh Packing Co., Ltd. is hiring packing staff for our factory in Samut Sakhon, Thailand. Salary 11,500 THB per month. No fees for workers. Official contract and work permit through the MOU channel. Apply at our office.',
    chat: 'Hello sister, I am Ko Zaw from the agency. To keep your place you must pay 18,000 baht processing fee to my personal KBank account before Friday. The contract will be given when you arrive in Thailand.',
  },
  {
    id: 'scam-passport-photo-my',
    lang: 'my',
    kind: 'scam',
    about: 'chat asks for a passport photo now',
    ad: 'ငွေပဒုမ္မာ အထည်ချုပ်စက်ရုံ (Ngwe Padonma Garment Co., Ltd.) ဘန်ကောက်မြို့ ဗန်ဘွန် ရပ်ကွက် အထည်ချုပ်လုပ်သားများ ခေါ်ယူနေပါသည်။ လစာ တစ်လ ၁၂,၀၀၀ ဘတ်။ MOU အလုပ်ပါမစ်ဖြင့် တရားဝင်စာချုပ် ချုပ်ပေးပါသည်။',
    chat: 'မင်္ဂလာပါရှင်။ နေရာရဖို့ ပတ်စပို့ ဓာတ်ပုံကို ဒီနေ့ပဲ Viber ကနေ ပို့ပေးပါ။ မနက်ဖြန်ဆို နေရာပြည့်သွားပြီ။ ပတ်စပို့ ဓာတ်ပုံ မရရင် စာရင်းထဲ မထည့်ပေးနိုင်ဘူး။',
  },
  {
    id: 'scam-tourist-th',
    lang: 'th',
    kind: 'scam',
    about: 'ad promises a work visa, chat says to fly on a tourist visa',
    ad: 'บริษัท ฟาร์มดาวรุ่งแสง จำกัด รับคนงานไปทำงานฟาร์มผักที่เกาหลีใต้ เงินเดือน 1,900,000 วอน ไปด้วยวีซ่าทำงาน E-9 ผ่านกรมการจัดหางาน มีสัญญาจ้างก่อนเดินทาง',
    chat: 'ไม่ต้องรอวีซ่าทำงานนะคะ บินไปด้วยวีซ่าท่องเที่ยวก่อนเลย ถึงสนามบินแล้วจะมีคนมารับไปฟาร์ม ค่าดำเนินการ ๘๐,๐๐๐ บาท โอนก่อนบิน',
  },
  {
    id: 'scam-border-en',
    lang: 'en',
    kind: 'scam',
    about: 'chat moves the meeting point to a border pickup and holds back the address',
    ad: 'Blue Heron Seafood Processing Co., Ltd., 88 Rama II Road, Samut Sakhon, Thailand. Line workers wanted, 12,500 THB monthly. The company arranges the work permit. Interview and start at our factory.',
    chat: 'Take the bus to Mae Sot. At the border a driver will pick you up and take you across the river at night. We tell you the workplace address after you arrive.',
  },
  {
    id: 'scam-secrecy-id',
    lang: 'id',
    kind: 'scam',
    about: 'chat asks to keep the trip secret and enter as a tourist',
    ad: 'PT Samudra Cahaya Lestari membuka lowongan operator pabrik elektronik di Johor, Malaysia. Gaji RM 1.800 per bulan. Tanpa biaya untuk pekerja. Kontrak resmi melalui P3MI berizin.',
    chat: 'Jangan bilang ke keluarga atau petugas imigrasi kalau mau kerja ya, bilang saja liburan. Berangkat lewat Batam naik kapal, nanti ada sopir yang jemput di pelabuhan.',
  },
  {
    id: 'legit-typo-my',
    lang: 'my',
    kind: 'legit',
    about: 'the chat misspells the company name',
    ad: 'Shwe Linyaung Garment Co., Ltd. ဘန်ကောက်မြို့ ဗန်ဘွန် စက်ရုံအတွက် စက်ချုပ်သမများ ခေါ်ယူသည်။ လစာ တစ်လ ၁၂,၅၀၀ ဘတ်။ MOU အလုပ်ပါမစ်။ အလုပ်သမားထံမှ ကြေးငွေ မယူပါ။ တရားဝင်စာချုပ် ပေးပါသည်။',
    chat: 'Shwe Linyaung Garmant HR ကပါ။ အင်တာဗျူးကို ရန်ကုန် ရုံးမှာ စနေနေ့ မနက် ၉ နာရီ လာပါ။ စာချုပ်ကို အင်တာဗျူးမှာ ဖတ်ခိုင်းပါမယ်။ လစာ တစ်လ ၁၂,၅၀၀ ဘတ်ပါ။',
  },
  {
    id: 'legit-recruiter-tl',
    lang: 'tl',
    kind: 'legit',
    about: 'a different recruiter from the same agency writes',
    ad: 'Pacific Lantern Care Agency (lisensyado ng DMW) ay naghahanap ng caregiver para sa Taiwan. Sahod NT$ 20,000 kada buwan. Walang placement fee. May kontrata at work visa bago umalis.',
    chat: 'Hi po, ako si Maria Santos, kasamahan ni Ana sa Pacific Lantern Care Agency. Ako na ang hahawak ng application mo. Interview sa opisina namin sa Ermita, Manila sa Lunes ng 10 ng umaga.',
  },
  {
    id: 'legit-salary-en',
    lang: 'en',
    kind: 'legit',
    about: 'salary stated yearly in the ad and monthly in the chat',
    ad: 'Northwind Orchard Packers Ltd. needs fruit packers in Hastings, New Zealand. Salary NZD 48,000 per year. The employer pays all recruitment costs. Work visa sponsored, contract signed before travel.',
    chat: 'Hi, this is Dan from Northwind Orchard Packers HR. The pay is NZD 4,000 per month before tax. We will email you the contract and the visa documents this week.',
  },
  {
    id: 'legit-interview-th',
    lang: 'th',
    kind: 'legit',
    about: 'the chat moves the interview to a later date',
    ad: 'บริษัท แสงอรุณรุ่ง อาหารทะเล จำกัด รับพนักงานแพ็คสินค้า ที่โรงงานสมุทรสาคร เงินเดือน 12,000 บาท ไม่มีค่าใช้จ่ายสำหรับผู้สมัคร มีสัญญาจ้างและใบอนุญาตทำงาน สัมภาษณ์วันที่ 5 พฤศจิกายน',
    chat: 'สวัสดีค่ะ ฝ่ายบุคคล แสงอรุณรุ่ง อาหารทะเล ขอเลื่อนสัมภาษณ์เป็นวันที่ 12 พฤศจิกายน ที่สำนักงานโรงงานสมุทรสาคร นะคะ จะให้อ่านสัญญาจ้างก่อนเซ็นค่ะ',
  },
  {
    id: 'legit-agency-id',
    lang: 'id',
    kind: 'legit',
    about: 'the chat comes from the company email and adds an allowance',
    ad: 'PT Harapan Bahari Sentosa (P3MI berizin) membuka lowongan perawat lansia di Jepang. Gaji ¥180.000 per bulan. Visa kerja Specified Skilled Worker. Biaya penempatan ditanggung pemberi kerja.',
    chat: 'Selamat siang, ini dari HRD PT Harapan Bahari Sentosa (hrd@harapanbahari.example.co.id). Pelatihan bahasa Jepang gratis di kantor kami di Bekasi mulai bulan depan. Gaji pokok ¥180.000 per bulan, ditambah tunjangan makan.',
  },
];
