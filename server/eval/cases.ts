import type { Kind, Lang } from '../src/types.js';

export interface EvalCase {
  id: string;
  lang: Lang;
  kind: Kind;
  expect: 'safe' | 'risky';
  text: string;
}

export const CASES: EvalCase[] = [
  {
    id: 'job-traf-en',
    lang: 'en',
    kind: 'job',
    expect: 'risky',
    text: 'URGENT HIRING! Customer service / online marketing staff for our branch in Thailand (Mae Sot side). Salary USD 1,800 + bonus, no experience, no degree needed. Free flight, free housing and food. We arrange everything, you only send a passport photo today. Car pickup at the border, no visa needed. Seats are limited, leave this week. Do not tell your family or the police, it will delay the process. Add me on Telegram @hr_goldenbridge',
  },
  {
    id: 'job-traf-my',
    lang: 'my',
    kind: 'job',
    expect: 'risky',
    text: 'ထိုင်းနိုင်ငံ မဲဆောက်ဘက်ခြမ်းရှိ ကျွန်ုပ်တို့ကုမ္ပဏီအတွက် Customer Service ဝန်ထမ်းများ အရေးပေါ် ခေါ်ယူနေပါသည်။ လစာ ဒေါ်လာ ၁၂၀၀ နှင့် ဘောနပ်စ်၊ အတွေ့အကြုံ မလိုပါ။ လေယာဉ်လက်မှတ်၊ အိပ်ခန်း၊ စားသောက်စရိတ် အခမဲ့။ ဗီဇာ မလိုပါ၊ နယ်စပ်တွင် ကားဖြင့် လာကြိုပါမည်။ ပတ်စပို့ ဓာတ်ပုံကို ယနေ့ပို့ပေးပါ။ မိသားစုကို မပြောပါနှင့်။ Telegram မှာ ဆက်သွယ်ပါ။',
  },
  {
    id: 'job-traf-id',
    lang: 'id',
    kind: 'job',
    expect: 'risky',
    text: 'DICARI admin online & customer service untuk perusahaan di Kamboja (Sihanoukville). Gaji 20 juta/bulan + bonus, tanpa pengalaman, lulusan SMA boleh. Tiket pesawat dan mess gratis. Berangkat pakai visa turis saja, nanti diurus di sana. Kirim foto paspor hari ini, kuota terbatas. Jangan bilang ke keluarga dulu. Hubungi WA 0812-0000-1111',
  },
  {
    id: 'job-traf-tl',
    lang: 'tl',
    kind: 'job',
    expect: 'risky',
    text: 'HIRING NGAYON! Online marketing / chat support sa Cambodia (Poipet). Sahod $1,500 kada buwan, walang experience, walang diploma. Libre ang flight at tirahan. Tourist visa lang, kami na ang bahala sa work permit pagdating. Ipadala ang passport mo ngayon, limitado ang slots. Huwag mo munang sabihin sa pamilya mo. Mag-message sa Telegram.',
  },
  {
    id: 'pig-en',
    lang: 'en',
    kind: 'message',
    expect: 'risky',
    text: "Hey Anna, sorry for the random message, I think we met through a friend? I'm Daniel, I work in logistics in Singapore. I really enjoy talking to you, you seem so kind. My uncle taught me a crypto trading platform, I made 38% last month. I can show you, start with just $200, I already helped many friends. Withdraw anytime! Here is the site: https://goldvest-trade.vip/register  Don't tell others yet, the team only accepts a few new members.",
  },
  {
    id: 'pig-id',
    lang: 'id',
    kind: 'message',
    expect: 'risky',
    text: 'Halo kak, salam kenal ya. Aku Michelle dari Hong Kong, kerja di bank. Aku suka ngobrol sama kakak, orangnya baik banget. Paman aku punya platform investasi emas, untungnya 5% per hari, bisa tarik kapan saja. Aku udah untung 30 juta. Kakak coba deposit 500 ribu dulu aja, nanti aku bimbing. Daftar di https://emas-global88.top Jangan kasih tau orang lain dulu ya, ini kesempatan langka.',
  },
  {
    id: 'parcel-id',
    lang: 'id',
    kind: 'message',
    expect: 'risky',
    text: '[J&T Express] Paket Anda tertahan karena alamat tidak lengkap. Bayar biaya tambahan Rp 4.500 dalam 24 jam atau paket dikembalikan: https://jnt-expres-id.xyz/bayar',
  },
  {
    id: 'parcel-tl',
    lang: 'tl',
    kind: 'message',
    expect: 'risky',
    text: 'LBC: Hindi na-deliver ang iyong package dahil kulang ang address. Magbayad ng P35 redelivery fee ngayon din o ibabalik ito sa sender: https://lbc-redelivery.top/pay',
  },
  {
    id: 'agency-en',
    lang: 'en',
    kind: 'agency',
    expect: 'risky',
    text: "Sunrise Global Manpower: guaranteed overseas jobs in Korea, Japan and Dubai! No experience required. To secure your slot pay a deposit of 15,000 THB to my personal account (KBank 123-4-56789-0) today. Our licence is being renewed but don't worry, thousands placed. Only 3 slots left. Visa is processed after the deposit, no refund.",
  },
  {
    id: 'agency-my',
    lang: 'my',
    kind: 'agency',
    expect: 'risky',
    text: 'ကိုရီးယား၊ ဂျပန်၊ ဒူဘိုင်း အလုပ်အကိုင် သေချာပေါက်ရစေမည်။ အတွေ့အကြုံ မလိုပါ။ နေရာချထားခ ၅၀၀၀၀၀ ကျပ်ကို ကျွန်တော့် ကိုယ်ပိုင်ဘဏ်အကောင့်သို့ ယနေ့ လွှဲပေးပါ။ လိုင်စင်ကို သက်တမ်းတိုးနေဆဲ ဖြစ်သည်။ နေရာ ၃ ခုသာ ကျန်ပါသည်။ ငွေပြန်မအမ်းပါ။',
  },
  {
    id: 'shop-id',
    lang: 'id',
    kind: 'shop',
    expect: 'risky',
    text: 'FLASH SALE iPhone 15 Pro Max 256GB baru segel hanya Rp 2.900.000 (diskon 80%)! Stok tinggal 2, hanya hari ini. Transfer langsung ke rekening pribadi BCA 8830-1122-33 a/n Budi, jangan lewat Shopee karena kena biaya admin. Setelah transfer kirim bukti ke WA.',
  },
  {
    id: 'shop-tl',
    lang: 'tl',
    kind: 'shop',
    expect: 'risky',
    text: 'Brand new PS5 80% OFF, P6,500 na lang! Last 1 piece, ngayong araw lang. Mag-GCash nang diretso sa personal number ko 0917-000-1234, huwag sa Lazada checkout kasi may fee. Wala pang review ang shop pero legit po, promise.',
  },
  {
    id: 'legit-job-en',
    lang: 'en',
    kind: 'job',
    expect: 'safe',
    text: 'Staff Nurse (ICU), Bangkok. Full-time, 3 years experience and valid Thai nursing licence required. Salary 32,000 - 42,000 THB per month plus social security and annual leave. Work permit sponsored by the employer and processed through the Department of Employment. No fee is charged to candidates. Apply on the careers page of our official website and bring your original certificates to the interview.',
  },
  {
    id: 'legit-sms-en',
    lang: 'en',
    kind: 'message',
    expect: 'safe',
    text: 'Your Shopee order #240915A1B2 has been shipped and will arrive on 16 Oct between 2pm and 5pm. Track it in the Shopee app under My Purchases. No action is needed.',
  },
  {
    id: 'legit-family-tl',
    lang: 'tl',
    kind: 'message',
    expect: 'safe',
    text: 'Ma, kumain ka na ba? Nakarating na ako sa Maynila, mag-iingat po kayo diyan. Tatawag ako mamaya pagkatapos ng trabaho. Sabihin mo kay bunso na mag-aral siyang mabuti. Uuwi ako sa Sabado para sa kaarawan ni Tatay.',
  },
  {
    id: 'legit-family-my',
    lang: 'my',
    kind: 'message',
    expect: 'safe',
    text: 'မေမေ ထမင်းစားပြီးပြီလား။ သားက ဒီနေ့ ရန်ကုန်ရောက်ပြီ။ ညနေအလုပ်ဆင်းရင် ဖုန်းဆက်မယ်နော်။ ညီလေးကို စာကြိုးစားအောင် ပြောပေးပါ။ စနေနေ့ အဖေ မွေးနေ့အတွက် အိမ်ပြန်လာမယ်။',
  },
  {
    id: 'legit-agency-id',
    lang: 'id',
    kind: 'agency',
    expect: 'safe',
    text: 'Informasi penempatan resmi: Penempatan Pekerja Migran Indonesia hanya melalui P3MI berizin Kementerian Ketenagakerjaan dan terdaftar di SISKOP2MI. Biaya penempatan sudah ditentukan pemerintah dan sebagian besar ditanggung pemberi kerja. Pekerja tidak membayar uang muka ke rekening pribadi. Cek izin agensi di situs resmi Kemnaker atau BP2MI sebelum mendaftar.',
  },
  {
    id: 'legit-otp-en',
    lang: 'en',
    kind: 'message',
    expect: 'safe',
    text: 'Your verification code is 482913. It expires in 5 minutes. Never share this code with anyone, including the bank staff.',
  },
  {
    id: 'legit-listing-id',
    lang: 'id',
    kind: 'shop',
    expect: 'safe',
    text: 'Dijual sepeda lipat bekas Polygon, kondisi baik, pemakaian 1 tahun, harga Rp 2.500.000 (harga baru sekitar 4 juta). Bisa COD di area Bandung, cek barang dulu sebelum bayar. Pembayaran lewat fitur checkout Tokopedia juga boleh.',
  },
];
