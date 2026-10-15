import type { LiveCallbacks, LiveConnect, LiveSessionLike } from './live.js';
import type { Lang } from './types.js';

const RATE_IN = 16_000;
const RATE_OUT = 24_000;
const TURN_AFTER_BYTES = RATE_IN * 2 * 1.2;

const CANNED: Record<Lang, { heard: string; said: string[] }> = {
  en: {
    heard: 'Is this offer safe?',
    said: ['This offer shows several warning signs. ', 'Please do not pay or send your passport, ', 'and talk to someone you trust first.'],
  },
  my: {
    heard: 'ဒီအလုပ် ဘေးကင်းလား',
    said: ['ဒီအလုပ်မှာ သတိပေးလက္ခဏာတချို့ တွေ့နေရပါတယ်။ ', 'ငွေမလွှဲပါနဲ့၊ ပတ်စပို့ မပေးပါနဲ့။ ', 'ယုံကြည်ရတဲ့သူနဲ့ အရင်တိုင်ပင်ပါ။'],
  },
  id: {
    heard: 'Apakah tawaran ini aman?',
    said: [
      'Tawaran ini menunjukkan beberapa tanda bahaya. ',
      'Jangan transfer uang atau serahkan paspor, ',
      'dan bicarakan dulu dengan orang yang Anda percayai.',
    ],
  },
  tl: {
    heard: 'Ligtas ba ang alok na ito?',
    said: [
      'May mga senyales ng panganib ang alok na ito. ',
      'Huwag munang magbayad o ibigay ang pasaporte, ',
      'at makipag-usap muna sa taong pinagkakatiwalaan mo.',
    ],
  },
  th: { heard: 'ข้อเสนอนี้ปลอดภัยไหม', said: ['ข้อเสนอนี้มีสัญญาณเตือนหลายอย่าง ', 'อย่าเพิ่งโอนเงินหรือส่งพาสปอร์ต ', 'และปรึกษาคนที่ไว้ใจก่อน'] },
};

function tone(ms: number, hz: number): string {
  const n = Math.floor((RATE_OUT * ms) / 1000);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / 240, (n - i) / 240);
    pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / RATE_OUT) * 6000 * fade), i * 2);
  }
  return pcm.toString('base64');
}

/** Offline stand-in for the Gemini Live session: answers after about 1.2 s of audio with a tone and canned captions. */
export function createMockLiveConnect(): LiveConnect {
  return async (_p, ctx) => mockSession(_p.callbacks, ctx.language, ctx.verdict !== 'safe');
}

function mockSession(cb: LiveCallbacks, lang: Lang, risky: boolean): LiveSessionLike {
  const timers = new Set<NodeJS.Timeout>();
  let heard = 0;
  let busy = false;
  let turn = 0;
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const answer = () => {
    busy = true;
    turn++;
    const canned = CANNED[lang];
    cb.onmessage({ serverContent: { inputTranscription: { text: canned.heard } } });
    canned.said.forEach((text, i) => {
      later(250 + i * 500, () => {
        cb.onmessage({ serverContent: { outputTranscription: { text } } });
        cb.onmessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: tone(450, 440 + i * 60) } }] } } });
      });
    });
    later(250 + canned.said.length * 500, () => {
      if (turn === 2 && risky) {
        cb.onmessage({ toolCall: { functionCalls: [{ id: 'mock_call', name: 'open_action_sheet', args: { screen: 'HOTLINES' } }] } });
      }
      cb.onmessage({ serverContent: { turnComplete: true } });
      busy = false;
      heard = 0;
    });
  };

  return {
    sendRealtimeInput(p) {
      if (!p.audio || busy) return;
      heard += Buffer.byteLength(p.audio.data, 'base64');
      if (heard >= TURN_AFTER_BYTES) answer();
    },
    sendToolResponse() {},
    close() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}
