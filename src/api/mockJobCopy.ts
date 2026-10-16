import type { LanguageCode } from './types';

export interface JobMockCopy {
  fee: string;
  documents: string;
  contract: string;
  visa: string;
  meeting: string;
  employer: string;
  salary: string;
  passportHold: string;
  passportPhoto: string;
  secrecy: string;
  payBefore: string;
  summary: { lower: string; verify: string; pause: string };
  unclear: { workplace: string; employer: string; contract: string; workerFee: string; visaOrPermit: string };
  findings: { notChecked: string; recruiter: string };
  fieldLabels: { workerFee: string; documentRequest: string; contract: string; visaOrPermit: string; meetingPoint: string; employer: string; salary: string; secrecyRequest: string; paymentRequest: string };
}

export const JOB_MOCK_COPY: Record<LanguageCode, JobMockCopy> = {
  en: {
    fee: 'The ad says no fee, but the chat seems to ask for a fee or deposit.',
    documents: 'The ad does not mention documents, but the chat seems to ask for your passport or a photo of it.',
    contract: 'The ad mentions an official contract, but the chat seems to say it comes later.',
    visa: 'The ad mentions a work visa, but the chat seems to suggest a tourist visa.',
    meeting: 'The ad names the workplace, but the chat seems to name a different meeting place.',
    employer: 'The employer name in the chat may not match the ad.',
    salary: 'The pay in the chat may be quite different from the ad.',
    passportHold: 'The chat may say someone else will keep your passport.',
    passportPhoto: 'The chat seems to ask for a photo of your passport.',
    secrecy: 'The chat may ask you to keep this secret.',
    payBefore: 'The chat may ask for money before a contract.',
    summary: {
      lower: 'We found few warning signs between the ad and the chat. Some important details may still be missing.',
      verify: 'Some details in the ad and the chat may not match. Please check them with the recruiter and an official source.',
      pause: 'Several details may not match, and some requests could put you at risk.',
    },
    unclear: {
      workplace: 'No workplace address may have been given.',
      employer: 'No employer name may have been given.',
      contract: 'It may be unclear whether you get a written contract.',
      workerFee: 'It may be unclear whether you must pay any fee.',
      visaOrPermit: 'It may be unclear which visa or permit is used.',
    },
    findings: { notChecked: 'We could not check whether a company with this name exists.', recruiter: 'We could not confirm that this recruiter works for that company.' },
    fieldLabels: { workerFee: 'Fee for the worker', documentRequest: 'Documents', contract: 'Contract', visaOrPermit: 'Visa or permit', meetingPoint: 'Meeting point', employer: 'Employer', salary: 'Salary', secrecyRequest: 'Secrecy', paymentRequest: 'Payment' },
  },
  my: {
    fee: 'ကြော်ငြာတွင် ကြေးမလိုဟု ပါသော်လည်း ချက်တင်တွင် ကြေး သို့မဟုတ် စရန်ငွေ တောင်းနေပုံရပါသည်။',
    documents: 'ကြော်ငြာတွင် စာရွက်စာတမ်းအကြောင်း မပါသော်လည်း ချက်တင်တွင် သင့်ပတ်စပို့ သို့မဟုတ် ၎င်း၏ ဓာတ်ပုံကို တောင်းနေပုံရပါသည်။',
    contract: 'ကြော်ငြာတွင် တရားဝင်စာချုပ် ပါသော်လည်း ချက်တင်တွင် နောက်မှ ဖြစ်မည်ဟု ပြောနေပုံရပါသည်။',
    visa: 'ကြော်ငြာတွင် အလုပ်ဗီဇာ ပါသော်လည်း ချက်တင်တွင် ခရီးသွားဗီဇာ အကြံပေးနေပုံရပါသည်။',
    meeting: 'ကြော်ငြာတွင် အလုပ်ခွင်ကို ပြောထားသော်လည်း ချက်တင်တွင် တခြားတွေ့ဆုံရာနေရာ ပြောနေပုံရပါသည်။',
    employer: 'ချက်တင်ထဲက အလုပ်ရှင်အမည်သည် ကြော်ငြာနှင့် မကိုက်ညီနိုင်ပါ။',
    salary: 'ချက်တင်ထဲက လစာသည် ကြော်ငြာနှင့် အတော်ကွာနိုင်ပါသည်။',
    passportHold: 'သင့်ပတ်စပို့ကို တခြားသူက ကိုင်ထားမည်ဟု ချက်တင်တွင် ပြောနေနိုင်ပါသည်။',
    passportPhoto: 'သင့်ပတ်စပို့ဓာတ်ပုံကို ချက်တင်တွင် တောင်းနေပုံရပါသည်။',
    secrecy: 'ဤအကြောင်းကို လျှို့ဝှက်ထားရန် ချက်တင်တွင် ပြောနေနိုင်ပါသည်။',
    payBefore: 'စာချုပ်မချုပ်မီ ငွေတောင်းနေနိုင်ပါသည်။',
    summary: {
      lower: 'ကြော်ငြာနှင့် ချက်တင်ကြား သတိပေးချက် အနည်းငယ်သာ တွေ့ပါသည်။ အရေးကြီးသော အချက်အချို့ ကျန်နေနိုင်ပါသည်။',
      verify: 'ကြော်ငြာနှင့် ချက်တင်ထဲက အချက်အချို့ မကိုက်ညီနိုင်ပါ။ အလုပ်ခေါ်သူနှင့် တရားဝင်ရင်းမြစ်ဖြင့် စစ်ဆေးပေးပါ။',
      pause: 'အချက်အများအပြား မကိုက်ညီနိုင်ပြီး တောင်းဆိုချက်အချို့ သင့်ကို အန္တရာယ်ရှိစေနိုင်ပါသည်။',
    },
    unclear: {
      workplace: 'အလုပ်ခွင်လိပ်စာ မပေးထားနိုင်ပါ။',
      employer: 'အလုပ်ရှင်အမည် မပေးထားနိုင်ပါ။',
      contract: 'စာချုပ်ရမရ မရှင်းလင်းနိုင်ပါ။',
      workerFee: 'ကြေးပေးရမရ မရှင်းလင်းနိုင်ပါ။',
      visaOrPermit: 'မည်သည့်ဗီဇာ သို့မဟုတ် ခွင့်ပြုချက်သုံးမည်ကို မရှင်းလင်းနိုင်ပါ။',
    },
    findings: { notChecked: 'ဤအမည်ဖြင့် ကုမ္ပဏီရှိမရှိ ကျွန်ုပ်တို့ မစစ်ဆေးနိုင်ခဲ့ပါ။', recruiter: 'ဤအလုပ်ခေါ်သူသည် ထိုကုမ္ပဏီအတွက် အလုပ်လုပ်ကြောင်း ကျွန်ုပ်တို့ အတည်မပြုနိုင်ပါ။' },
    fieldLabels: { workerFee: 'လုပ်သားပေးရသော ကြေး', documentRequest: 'စာရွက်စာတမ်း', contract: 'စာချုပ်', visaOrPermit: 'ဗီဇာ သို့မဟုတ် ခွင့်ပြုချက်', meetingPoint: 'တွေ့ဆုံရာနေရာ', employer: 'အလုပ်ရှင်', salary: 'လစာ', secrecyRequest: 'လျှို့ဝှက်ရန်', paymentRequest: 'ငွေပေးချေမှု' },
  },
  id: {
    fee: 'Iklan menyebut tanpa biaya, tetapi chat tampaknya meminta biaya atau uang muka.',
    documents: 'Iklan tidak menyebut dokumen, tetapi chat tampaknya meminta paspor Anda atau foto paspor.',
    contract: 'Iklan menyebut kontrak resmi, tetapi chat tampaknya mengatakan kontrak menyusul.',
    visa: 'Iklan menyebut visa kerja, tetapi chat tampaknya menyarankan visa turis.',
    meeting: 'Iklan menyebut tempat kerja, tetapi chat tampaknya menyebut tempat bertemu yang lain.',
    employer: 'Nama pemberi kerja di chat mungkin tidak sama dengan iklan.',
    salary: 'Gaji di chat mungkin cukup berbeda dari iklan.',
    passportHold: 'Chat mungkin menyebut paspor Anda akan ditahan orang lain.',
    passportPhoto: 'Chat tampaknya meminta foto paspor Anda.',
    secrecy: 'Chat mungkin meminta Anda merahasiakan hal ini.',
    payBefore: 'Chat mungkin meminta uang sebelum ada kontrak.',
    summary: {
      lower: 'Kami menemukan sedikit tanda peringatan antara iklan dan chat. Beberapa hal penting mungkin masih belum jelas.',
      verify: 'Beberapa hal di iklan dan chat mungkin tidak cocok. Mohon periksa dengan perekrut dan sumber resmi.',
      pause: 'Beberapa hal mungkin tidak cocok, dan sebagian permintaan bisa membahayakan Anda.',
    },
    unclear: {
      workplace: 'Alamat tempat kerja mungkin belum diberikan.',
      employer: 'Nama pemberi kerja mungkin belum diberikan.',
      contract: 'Mungkin belum jelas apakah Anda mendapat kontrak tertulis.',
      workerFee: 'Mungkin belum jelas apakah Anda harus membayar biaya.',
      visaOrPermit: 'Mungkin belum jelas visa atau izin apa yang dipakai.',
    },
    findings: { notChecked: 'Kami tidak dapat memeriksa apakah ada perusahaan dengan nama ini.', recruiter: 'Kami tidak dapat memastikan bahwa perekrut ini bekerja untuk perusahaan tersebut.' },
    fieldLabels: { workerFee: 'Biaya untuk pekerja', documentRequest: 'Dokumen', contract: 'Kontrak', visaOrPermit: 'Visa atau izin', meetingPoint: 'Tempat bertemu', employer: 'Pemberi kerja', salary: 'Gaji', secrecyRequest: 'Kerahasiaan', paymentRequest: 'Pembayaran' },
  },
  tl: {
    fee: 'Walang bayad ang sabi ng ad, pero mukhang humihingi ng bayad o deposito ang chat.',
    documents: 'Hindi binanggit ng ad ang mga dokumento, pero mukhang hinihingi ng chat ang pasaporte mo o litrato nito.',
    contract: 'Opisyal na kontrata ang nasa ad, pero mukhang sinasabi ng chat na susunod pa ito.',
    visa: 'Work visa ang nasa ad, pero mukhang tourist visa ang iminumungkahi ng chat.',
    meeting: 'Binanggit ng ad ang lugar ng trabaho, pero mukhang ibang tagpuan ang nasa chat.',
    employer: 'Maaaring hindi tugma ang pangalan ng employer sa chat at sa ad.',
    salary: 'Maaaring malayo ang sahod sa chat sa nasa ad.',
    passportHold: 'Maaaring sinasabi ng chat na ibang tao ang hahawak ng pasaporte mo.',
    passportPhoto: 'Mukhang hinihingi ng chat ang litrato ng pasaporte mo.',
    secrecy: 'Maaaring hinihiling ng chat na ilihim mo ito.',
    payBefore: 'Maaaring humihingi ng pera ang chat bago ang kontrata.',
    summary: {
      lower: 'Kaunti lang ang nakita naming babala sa pagitan ng ad at ng chat. Maaaring may mahahalagang detalye pang kulang.',
      verify: 'Maaaring hindi magkatugma ang ilang detalye sa ad at sa chat. Pakisuri sa recruiter at sa opisyal na source.',
      pause: 'Maaaring hindi magkatugma ang ilang detalye, at ang ilang hiling ay maaaring maglagay sa iyo sa panganib.',
    },
    unclear: {
      workplace: 'Maaaring walang ibinigay na address ng trabaho.',
      employer: 'Maaaring walang ibinigay na pangalan ng employer.',
      contract: 'Maaaring hindi malinaw kung may nakasulat na kontrata.',
      workerFee: 'Maaaring hindi malinaw kung may babayaran kang bayarin.',
      visaOrPermit: 'Maaaring hindi malinaw kung anong visa o permit ang gagamitin.',
    },
    findings: { notChecked: 'Hindi namin nasuri kung may kumpanyang may ganitong pangalan.', recruiter: 'Hindi namin makumpirma na nagtatrabaho ang recruiter na ito para sa kumpanyang iyon.' },
    fieldLabels: { workerFee: 'Bayad ng manggagawa', documentRequest: 'Mga dokumento', contract: 'Kontrata', visaOrPermit: 'Visa o permit', meetingPoint: 'Tagpuan', employer: 'Employer', salary: 'Sahod', secrecyRequest: 'Paglilihim', paymentRequest: 'Bayad' },
  },
  th: {
    fee: 'โฆษณาบอกว่าไม่มีค่าใช้จ่าย แต่แชตดูเหมือนจะขอค่าธรรมเนียมหรือเงินมัดจำ',
    documents: 'โฆษณาไม่ได้พูดถึงเอกสาร แต่แชตดูเหมือนจะขอพาสปอร์ตหรือรูปถ่ายพาสปอร์ตของคุณ',
    contract: 'โฆษณาบอกว่ามีสัญญาจ้างอย่างเป็นทางการ แต่แชตดูเหมือนจะบอกว่าสัญญาจะมาทีหลัง',
    visa: 'โฆษณาบอกว่าเป็นวีซ่าทำงาน แต่แชตดูเหมือนจะแนะนำวีซ่านักท่องเที่ยว',
    meeting: 'โฆษณาระบุสถานที่ทำงาน แต่แชตดูเหมือนจะระบุจุดนัดพบอื่น',
    employer: 'ชื่อนายจ้างในแชตอาจไม่ตรงกับโฆษณา',
    salary: 'เงินเดือนในแชตอาจต่างจากโฆษณาค่อนข้างมาก',
    passportHold: 'แชตอาจบอกว่าจะมีคนอื่นเก็บพาสปอร์ตของคุณไว้',
    passportPhoto: 'แชตดูเหมือนจะขอรูปถ่ายพาสปอร์ตของคุณ',
    secrecy: 'แชตอาจขอให้คุณเก็บเรื่องนี้เป็นความลับ',
    payBefore: 'แชตอาจขอเงินก่อนทำสัญญา',
    summary: {
      lower: 'เราพบสัญญาณเตือนไม่มากระหว่างโฆษณากับแชต อาจยังขาดรายละเอียดสำคัญบางอย่าง',
      verify: 'รายละเอียดบางอย่างในโฆษณากับแชตอาจไม่ตรงกัน โปรดตรวจสอบกับผู้จัดหางานและแหล่งข้อมูลทางการ',
      pause: 'รายละเอียดหลายอย่างอาจไม่ตรงกัน และบางคำขออาจทำให้คุณเสี่ยง',
    },
    unclear: {
      workplace: 'อาจยังไม่มีที่อยู่สถานที่ทำงาน',
      employer: 'อาจยังไม่มีชื่อนายจ้าง',
      contract: 'อาจยังไม่ชัดเจนว่าจะได้สัญญาเป็นลายลักษณ์อักษรหรือไม่',
      workerFee: 'อาจยังไม่ชัดเจนว่าต้องจ่ายค่าใช้จ่ายหรือไม่',
      visaOrPermit: 'อาจยังไม่ชัดเจนว่าใช้วีซ่าหรือใบอนุญาตแบบใด',
    },
    findings: { notChecked: 'เราไม่สามารถตรวจสอบได้ว่ามีบริษัทที่ใช้ชื่อนี้หรือไม่', recruiter: 'เราไม่สามารถยืนยันได้ว่าผู้จัดหางานคนนี้ทำงานให้บริษัทนั้น' },
    fieldLabels: { workerFee: 'ค่าใช้จ่ายของผู้ทำงาน', documentRequest: 'เอกสาร', contract: 'สัญญาจ้าง', visaOrPermit: 'วีซ่าหรือใบอนุญาต', meetingPoint: 'จุดนัดพบ', employer: 'นายจ้าง', salary: 'เงินเดือน', secrecyRequest: 'ความลับ', paymentRequest: 'การจ่ายเงิน' },
  },
};
