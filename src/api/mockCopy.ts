import type { LanguageCode, Verdict } from './types';

export interface VerdictCopy {
  title: string;
  summary: string;
  spoken: string;
}

export const MOCK_COPY: Record<LanguageCode, Record<Verdict, VerdictCopy>> = {
  en: {
    danger: {
      title: 'High risk: likely scam',
      summary: 'This looks like a scam. Do not pay, share your passport or travel until someone you trust has verified it.',
      spoken: 'Warning. This looks like a scam. Do not send money or your passport.',
    },
    careful: {
      title: 'Be careful: some warning signs',
      summary: 'We found warning signs we could not clear. Verify the sender through an official channel first.',
      spoken: 'Be careful. Check this with an official source before you reply.',
    },
    safe: {
      title: 'Low risk',
      summary: 'We found no clear warning signs. Stay alert and never pay money to get a job.',
      spoken: 'No clear warning signs. Stay alert and never pay to get a job.',
    },
  },
  id: {
    danger: {
      title: 'Risiko tinggi: kemungkinan penipuan',
      summary: 'Ini tampak seperti penipuan. Jangan membayar, mengirim paspor, atau berangkat sebelum orang yang Anda percaya memverifikasinya.',
      spoken: 'Peringatan. Ini tampak seperti penipuan. Jangan kirim uang atau paspor Anda.',
    },
    careful: {
      title: 'Hati-hati: ada tanda peringatan',
      summary: 'Kami menemukan tanda peringatan yang belum bisa dipastikan. Verifikasi pengirim lewat saluran resmi terlebih dahulu.',
      spoken: 'Hati-hati. Periksa dulu ke sumber resmi sebelum membalas.',
    },
    safe: {
      title: 'Risiko rendah',
      summary: 'Kami tidak menemukan tanda peringatan yang jelas. Tetap waspada dan jangan pernah membayar untuk mendapatkan pekerjaan.',
      spoken: 'Tidak ada tanda bahaya yang jelas. Tetap waspada dan jangan bayar untuk mendapatkan pekerjaan.',
    },
  },
  tl: {
    danger: {
      title: 'Mataas na panganib: malamang scam',
      summary: 'Mukhang scam ito. Huwag magbayad, magpadala ng pasaporte o bumiyahe hangga\'t hindi ito napapatunayan ng taong pinagkakatiwalaan mo.',
      spoken: 'Babala. Mukhang scam ito. Huwag magpadala ng pera o pasaporte.',
    },
    careful: {
      title: 'Mag-ingat: may mga palatandaan',
      summary: 'May nakita kaming palatandaan na hindi namin napawalang-bisa. Patunayan muna ang nagpadala sa opisyal na paraan.',
      spoken: 'Mag-ingat. Alamin muna sa opisyal na source bago sumagot.',
    },
    safe: {
      title: 'Mababang panganib',
      summary: 'Walang malinaw na palatandaan ng scam. Manatiling alerto at huwag magbayad para makakuha ng trabaho.',
      spoken: 'Walang malinaw na babala. Manatiling alerto at huwag magbayad para sa trabaho.',
    },
  },
  my: {
    danger: {
      title: 'အန္တရာယ်မြင့်: လိမ်လည်မှု ဖြစ်နိုင်သည်',
      summary: 'ဤအရာသည် လိမ်လည်မှုနှင့် တူသည်။ ယုံကြည်ရသူက အတည်ပြုပေးသည်အထိ ငွေမပေးပါနှင့်၊ ပတ်စပို့မပေးပို့ပါနှင့်၊ ခရီးမထွက်ပါနှင့်။',
      spoken: 'သတိပေးချက်။ ဤအရာသည် လိမ်လည်မှုနှင့် တူသည်။ ငွေ သို့မဟုတ် ပတ်စပို့ မပေးပို့ပါနှင့်။',
    },
    careful: {
      title: 'သတိထားပါ: သတိပေးအချက်များ ရှိသည်',
      summary: 'မရှင်းလင်းသေးသော သတိပေးအချက်များ တွေ့ရှိသည်။ တရားဝင်လမ်းကြောင်းဖြင့် ပေးပို့သူကို အရင်စစ်ဆေးပါ။',
      spoken: 'သတိထားပါ။ မဖြေမီ တရားဝင်ရင်းမြစ်ထံ အရင်စစ်ဆေးပါ။',
    },
    safe: {
      title: 'အန္တရာယ်နည်း',
      summary: 'ရှင်းလင်းသော သတိပေးအချက် မတွေ့ပါ။ သတိရှိပါ၊ အလုပ်ရရန် ငွေမပေးပါနှင့်။',
      spoken: 'ရှင်းလင်းသော သတိပေးအချက် မတွေ့ပါ။ အလုပ်ရရန် ငွေမပေးပါနှင့်။',
    },
  },
  th: {
    danger: {
      title: 'ความเสี่ยงสูง: อาจเป็นการหลอกลวง',
      summary: 'ข้อความนี้ดูเหมือนมีความเสี่ยง อย่าเพิ่งจ่ายเงิน ส่งพาสปอร์ต หรือเดินทาง จนกว่าคนที่คุณไว้ใจจะช่วยตรวจสอบ',
      spoken: 'โปรดระวัง ข้อความนี้ดูเหมือนมีความเสี่ยง อย่าเพิ่งโอนเงินหรือส่งพาสปอร์ต',
    },
    careful: {
      title: 'โปรดระวัง: พบสัญญาณเตือน',
      summary: 'เราพบสัญญาณเตือนที่ยังตรวจสอบไม่ได้ โปรดตรวจสอบผู้ส่งผ่านช่องทางทางการก่อน',
      spoken: 'โปรดระวัง ตรวจสอบกับแหล่งข้อมูลทางการก่อนตอบกลับ',
    },
    safe: {
      title: 'ความเสี่ยงต่ำ',
      summary: 'เราไม่พบสัญญาณเตือนที่ชัดเจน โปรดยังคงระวัง และอย่าจ่ายเงินเพื่อให้ได้งาน',
      spoken: 'ไม่พบสัญญาณเตือนที่ชัดเจน โปรดยังคงระวัง และอย่าจ่ายเงินเพื่อให้ได้งาน',
    },
  },
};
