// Renders fictional phone-style screenshots with headless Chrome. Usage: node bench/synth/render.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'synthetic');
mkdirSync(out, { recursive: true });
const chromeRoot = join(homedir(), '.cache/puppeteer/chrome');
const chrome = process.env.CHROME ?? join(chromeRoot, readdirSync(chromeRoot).sort().at(-1), 'chrome-linux64/chrome');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
const base = `
*{box-sizing:border-box;margin:0}
body{width:390px;height:844px;font-family:'Noto Sans','DejaVu Sans',sans-serif;overflow:hidden;background:#fff;color:#111}
.status{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:13px;font-weight:600}
.hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #e3e3e3}
.av{width:36px;height:36px;border-radius:50%;background:#7a8bb5;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px}
.nm{font-weight:600;font-size:16px}.sub{font-size:12px;color:#777}
.msgs{padding:14px;display:flex;flex-direction:column;gap:8px}
.b{max-width:80%;padding:9px 12px;border-radius:16px;font-size:14.5px;line-height:1.35}
.in{background:#eef0f4;align-self:flex-start;border-bottom-left-radius:4px}
.out{background:#2b6cf0;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.t{align-self:center;font-size:11px;color:#888;margin:4px 0}
.card{margin:12px;border:1px solid #e3e3e3;border-radius:12px;padding:14px;font-size:14.5px;line-height:1.4}
.post-h{display:flex;gap:10px;align-items:center;margin-bottom:10px}
.act{display:flex;justify-content:space-around;border-top:1px solid #eee;margin-top:12px;padding-top:10px;font-size:13px;color:#666}
`;
const phone = (inner, extra = '') =>
  `<!doctype html><meta charset=utf-8><style>${base}${extra}</style><div class=status><span>9:41</span><span>5G 87%</span></div>${inner}`;
const chat = (name, sub, msgs) =>
  phone(
    `<div class=hdr><div class=av>${name[0]}</div><div><div class=nm>${name}</div><div class=sub>${sub}</div></div></div><div class=msgs>${msgs
      .map(([who, text]) => (who === 't' ? `<div class=t>${esc(text)}</div>` : `<div class="b ${who}">${esc(text)}</div>`))
      .join('')}</div>`,
  );
const sms = (name, msgs) =>
  phone(
    `<div class=hdr style="justify-content:center;flex-direction:column;gap:2px"><div class=nm>${name}</div><div class=sub>Text message</div></div><div class=msgs>${msgs
      .map(([who, text]) =>
        who === 't'
          ? `<div class=t>${esc(text)}</div>`
          : `<div class="b ${who}" style="border-radius:18px;${who === 'out' ? 'background:#34c759' : ''}">${esc(text)}</div>`,
      )
      .join('')}</div>`,
  );
const post = (name, text) =>
  phone(
    `<div class=hdr><b style="font-size:18px;color:#2b6cf0">feed</b></div><div class=card><div class=post-h><div class=av>${name[0]}</div><div><div class=nm style="font-size:15px">${name}</div><div class=sub>Sponsored</div></div></div>${esc(text)}<div class=act><span>Like</span><span>Comment</span><span>Share</span></div></div>`,
  );

const shots = [
  [
    'chat-job-01',
    chat('Mr Kyaw', 'online', [
      ['t', 'Today 10:12'],
      [
        'in',
        'URGENT HIRING - Customer Service Staff, Thailand\nCompany: Golden Harbor Digital Co., Ltd (Mae Sot branch)\nSalary: USD 1,800 per month + bonus + free housing',
      ],
      ['in', 'No experience. No English needed. Ages 18-35.\nWe pay your flight and handle the visa. Do not worry about permits.'],
      [
        'in',
        'Send a photo of your passport and a selfie to book your seat today. Only 5 places left. A driver will pick you up at the border and take you to the office.',
      ],
      ['out', 'Is it safe?'],
      ['in', 'Very safe. Contact me on Telegram: @goldenharbor_hr_88'],
    ]),
  ],
  [
    'chat-romance-02',
    chat('Kevin', 'last seen recently', [
      ['in', 'Hello, sorry wrong number. But your photo looks kind.'],
      ['out', 'Haha it is ok'],
      ['in', 'I am an engineer working overseas. It is lonely here.'],
      ['t', '3 weeks later'],
      ['in', 'I think I am falling for you. God sent you to me.'],
      ['in', 'My uncle showed me a secret trading app. Very safe. I made big profit again today.'],
      ['in', 'You should join, I will guide you. Just top up first: https://nova-yield-trade.example/app'],
      ['in', 'Send the money today, the price goes up tomorrow. Trust me.'],
    ]),
  ],
  [
    'sms-parcel-03',
    sms('PostBox', [
      ['t', 'Text Message - Today 14:03'],
      [
        'in',
        '[PostBox] Your parcel is held at the warehouse. Pay the small delivery fee today or it will be returned: hxxp://postbox-fee-pay.example/r/8231',
      ],
    ]),
  ],
  [
    'sms-school-04',
    sms('Hartwell School', [
      ['t', 'Text Message - Today 08:30'],
      [
        'in',
        'Hi Rina, this is Dewi from the Hartwell Language School front desk. Your class on Thursday moved to room 4. No payment needed. Call the office at the number on the school website if you have questions.',
      ],
    ]),
  ],
  [
    'social-agency-05',
    post(
      'Banyan Bridge Placement',
      'Banyan Bridge Placement Agency. Licensed overseas placement. Jobs in factory, caregiver and restaurant. Departure guaranteed in 2 weeks. Pay a deposit to reserve a place.',
    ),
  ],
  [
    'chat-family-06',
    chat('Nanay', 'online', [
      ['t', 'Yesterday'],
      ['out', 'Ma, kumain ka na ba? Nakarating na ako sa Maynila, mag-iingat po kayo diyan.'],
      ['out', 'Tatawag ako mamaya pagkatapos ng trabaho. Sabihin mo kay bunso na mag-aral siyang mabuti.'],
      ['out', 'Uuwi ako sa Sabado para sa kaarawan ni Tatay.'],
      ['in', 'Salamat anak. Ingat ka palagi.'],
    ]),
  ],
];

for (const [name, html] of shots) {
  const page = join(tmpdir(), `${name}.html`);
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--window-size=390,844',
      `--screenshot=${join(out, `${name}.png`)}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  );
  console.log(`rendered ${name}.png`);
}
