import type { FlagFamily } from '../../api/types';
import type { IconName } from '../../components/Icon';

export const LEARN_TITLE = 'Learn';
export const LEARN_TAGLINE = 'Know the signs before you reply, pay or travel.';
export const SCAMS_HEADING = 'Common scams';
export const FLAGS_HEADING = 'The 7 red flags';
export const FLAGS_HINT = 'SafeRoute looks for these signs. Tap one to learn more.';
export const SHIELD_ROW_TITLE = 'How the Screen shield works';
export const SHIELD_ROW_HINT = '3 quick steps';
export const REPORT_ROW = 'Report a scam';
export const HELP_ROW = 'Get help';

export const GUIDE_HOW_IT_STARTS = 'How it starts';
export const GUIDE_SIGNS = 'Warning signs';
export const GUIDE_EXAMPLE = 'See an example';
export const GUIDE_EXAMPLE_NOTE = 'Example. Names and posts are made up.';
export const GUIDE_ACTIONS = 'What to do';
export const SHIELD_HOWTO_TITLE = 'Screen shield';
export const STEPPER_BACK = 'Back';
export const STEPPER_NEXT = 'Next';
export const STEPPER_DONE = 'Done';
export const SHEET_EXAMPLE = 'You might hear';
export const SHEET_CLOSE = 'Close';

export type ScamTypeId = 'jobs' | 'romance' | 'parcel' | 'agency' | 'shop';

export type DemoKey =
  | 'shield-intro' | 'job-spot' | 'job-cutoff' | 'job-scan' | 'job-verdict'
  | 'chat-strange' | 'chat-more' | 'chat-older' | 'chat-verdict'
  | 'notif-warning' | 'notif-verdict'
  | 'agency-page' | 'agency-verdict'
  | 'shop-listing' | 'shop-seller' | 'shop-profile' | 'shop-verdict';

export interface ExampleStep {
  demo: DemoKey;
  title: string;
  caption: string;
}

export type GuideActionKind = 'noPay' | 'check' | 'help';

export interface GuideAction {
  kind: GuideActionKind;
  title: string;
  body: string;
}

export interface ScamSign {
  family: FlagFamily;
  text: string;
}

export interface ScamType {
  id: ScamTypeId;
  icon: IconName;
  title: string;
  hook: string;
  howItStarts: string;
  signs: ScamSign[];
  example: ExampleStep[];
  actions: GuideAction[];
}

const noPay: GuideAction = {
  kind: 'noPay',
  title: "Don't pay, don't send documents",
  body: 'Real jobs, shops and banks rarely ask for money or your passport first.',
};
const check: GuideAction = {
  kind: 'check',
  title: 'Check it with SafeRoute',
  body: 'Paste the text or link, or add a screenshot.',
};
const help: GuideAction = {
  kind: 'help',
  title: 'Get help',
  body: 'Find hotlines and people who can help you.',
};
const actions = [noPay, check, help];

export const SCAM_TYPES: ScamType[] = [
  {
    id: 'jobs',
    icon: 'octagon',
    title: 'Fake job offers and trafficking',
    hook: 'Overseas jobs with high pay, a border pickup, or a request to hand over your passport.',
    howItStarts:
      'A post or message offers a job abroad with a big salary. No experience, no interview. Someone asks for a photo of your passport to book your place, then tells you to meet a driver.',
    signs: [
      { family: 'too_good', text: 'Very high pay for easy work, and no experience needed.' },
      { family: 'pressure', text: 'Only a few places left. Leave this week.' },
      { family: 'trafficking', text: 'A pickup at the border or airport, and no visa papers.' },
      { family: 'trafficking', text: 'They want to keep your passport.' },
      { family: 'identity', text: 'The recruiter has no company name and only uses a private chat app.' },
    ],
    example: [
      { demo: 'job-spot', title: 'You see a job post', caption: 'A big salary, free flight and no experience needed.' },
      { demo: 'job-cutoff', title: 'Tap the shield', caption: 'The shield sees the post on your screen. It asks to open the hidden text.' },
      { demo: 'job-scan', title: 'SafeRoute checks it', caption: 'It reads the whole post and looks for the red flags.' },
      { demo: 'job-verdict', title: 'The result', caption: 'SafeRoute shows Danger, with the reasons and what to do next.' },
    ],
    actions,
  },
  {
    id: 'romance',
    icon: 'chat',
    title: 'Romance and investment',
    hook: 'A friendly stranger who later pushes crypto or trading.',
    howItStarts:
      'A stranger writes to you by mistake and is kind. After days or weeks of chat, they say they make good money on a trading app. Then they invite you to try it with a small deposit.',
    signs: [
      { family: 'identity', text: 'A stranger says "wrong number" and then keeps chatting.' },
      { family: 'too_good', text: 'They show big profits from a trading or crypto app.' },
      { family: 'link_risk', text: 'They send a link to an app you cannot find in the official store.' },
      { family: 'payment_route', text: 'They ask for a deposit, or for crypto, to start.' },
      { family: 'pressure', text: 'They say the chance will close soon.' },
    ],
    example: [
      { demo: 'chat-strange', title: 'A stranger starts a chat', caption: 'Friendly words, then talk about easy profit.' },
      { demo: 'chat-more', title: 'Tap the shield', caption: 'SafeRoute needs the older messages to see the full story.' },
      { demo: 'chat-older', title: 'Scroll up and tap again', caption: 'The start of the chat shows a "wrong number" opening.' },
      { demo: 'chat-verdict', title: 'The result', caption: 'The chat shows signs of a romance and investment scam.' },
    ],
    actions,
  },
  {
    id: 'parcel',
    icon: 'phone',
    title: 'Parcel and bank messages',
    hook: '"Pay a fee" or "verify your account" with a link.',
    howItStarts:
      'A text says your parcel is held, or your bank account is locked. It has a short link and a deadline. The link opens a copy of a real site that asks for your card or login.',
    signs: [
      { family: 'payment_route', text: 'A small fee to release a parcel.' },
      { family: 'link_risk', text: 'A short link or a web address that looks a little wrong.' },
      { family: 'pressure', text: 'Pay today or it will be returned. Verify now or lose access.' },
      { family: 'identity', text: 'The sender is an unknown number, not your bank.' },
      { family: 'known_bad', text: 'The same message was sent to many other people.' },
    ],
    example: [
      { demo: 'notif-warning', title: 'A message arrives', caption: 'SafeRoute warns you before you open the link.' },
      { demo: 'notif-verdict', title: 'Tap to see why', caption: 'You see the reasons. Do not open the link.' },
    ],
    actions,
  },
  {
    id: 'agency',
    icon: 'user',
    title: 'Fake recruitment agencies',
    hook: 'No licence, upfront fees.',
    howItStarts:
      'A page says it is an official, licensed agency. It lists many jobs abroad. When you write to them, they ask for a registration fee, a training fee or a deposit before any contract.',
    signs: [
      { family: 'identity', text: 'No licence number, or one you cannot verify.' },
      { family: 'payment_route', text: 'Fees for registration, training, visa or a "seat".' },
      { family: 'too_good', text: 'Every job pays well and needs no skills.' },
      { family: 'pressure', text: 'They tell you to pay today to keep your place.' },
      { family: 'known_bad', text: 'Other workers have reported the same name or number.' },
    ],
    example: [
      { demo: 'agency-page', title: 'You open an agency page', caption: 'It says "official" and shows a licence number.' },
      { demo: 'agency-verdict', title: 'SafeRoute checks it', caption: 'It looks for the licence and for reports about the agency.' },
    ],
    actions,
  },
  {
    id: 'shop',
    icon: 'gift',
    title: 'Online shop fraud',
    hook: 'Too-cheap deals, pay outside the app.',
    howItStarts:
      'You find a phone or a product at a very low price. The seller says "chat me for a better deal", and asks you to pay by bank transfer. After you pay, the seller goes quiet and nothing arrives.',
    signs: [
      { family: 'too_good', text: 'The price is far below the normal price.' },
      { family: 'payment_route', text: 'The seller asks you to pay outside the shop app.' },
      { family: 'identity', text: 'A new seller account with no history or reviews.' },
      { family: 'pressure', text: '"Need money fast." "Last one."' },
      { family: 'link_risk', text: 'The seller moves the chat to another app.' },
    ],
    example: [
      { demo: 'shop-listing', title: 'You see a cheap deal', caption: 'A phone for a fraction of its normal price.' },
      { demo: 'shop-seller', title: 'Tap the seller name', caption: 'Ask SafeRoute to look at who is selling.' },
      { demo: 'shop-profile', title: 'Open the seller page', caption: 'A new account with few sales.' },
      { demo: 'shop-verdict', title: 'The result', caption: 'SafeRoute shows the signs that make this deal look risky.' },
    ],
    actions,
  },
];

export interface RedFlag {
  family: FlagFamily;
  icon: IconName;
  name: string;
  title: string;
  explain: string;
  phrase: string;
}

export const RED_FLAGS: RedFlag[] = [
  { family: 'too_good', icon: 'gift', name: 'Too good', title: 'Too good to be true', explain: 'Pay or perks far above normal, with no experience needed.', phrase: '"Earn 5,000 a month. No experience needed."' },
  { family: 'pressure', icon: 'clock', name: 'Pressure', title: 'Pressure', explain: 'They want you to act fast and not think or ask anyone.', phrase: '"Only 3 places left. Do not tell anyone."' },
  { family: 'payment_route', icon: 'card', name: 'Odd payment', title: 'Payment route', explain: 'Fees, deposits or transfers before you start, or outside the app.', phrase: '"Send the fee to this account to book your seat."' },
  { family: 'identity', icon: 'user', name: 'Hidden identity', title: 'Hidden identity', explain: 'No clear name or company. They only use private chat apps.', phrase: '"Just message me on Telegram."' },
  { family: 'link_risk', icon: 'link', name: 'Risky link', title: 'Risky link', explain: 'New web addresses, shortened links or fake tracking pages.', phrase: '"Track your parcel: bit.ly/x7Kd2"' },
  { family: 'known_bad', icon: 'flag', name: 'Known scam', title: 'Known scam', explain: 'The number, page or script was already reported by others.', phrase: '"Dear customer, your account is locked."' },
  { family: 'trafficking', icon: 'octagon', name: 'Trafficking', title: 'Trafficking signs', explain: 'No visa, your passport is kept, or a pickup at the border.', phrase: '"A driver will meet you at the border. Bring your passport."' },
];

export interface ShieldStep {
  demo: DemoKey;
  title: string;
  caption: string;
}

export const SHIELD_STEPS: ShieldStep[] = [
  { demo: 'shield-intro', title: 'Turn on the shield', caption: 'A small button sits on the side of your screen.' },
  { demo: 'job-cutoff', title: 'Tap it on anything strange', caption: 'It works on posts, chats and shops in other apps.' },
  { demo: 'job-verdict', title: 'Read the result', caption: 'Safe, Careful or Danger, with the reasons.' },
];

export function findScamType(id: string): ScamType | undefined {
  return SCAM_TYPES.find(s => s.id === id);
}

export function findRedFlag(family: FlagFamily): RedFlag | undefined {
  return RED_FLAGS.find(f => f.family === family);
}
