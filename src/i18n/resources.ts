import enAccount from './locales/en/account.json';
import enCheck from './locales/en/check.json';
import enChecking from './locales/en/checking.json';
import enCommon from './locales/en/common.json';
import enContacts from './locales/en/contacts.json';
import enErrors from './locales/en/errors.json';
import enFeedback from './locales/en/feedback.json';
import enHelp from './locales/en/help.json';
import enHome from './locales/en/home.json';
import enLearn from './locales/en/learn.json';
import enLive from './locales/en/live.json';
import enOnboarding from './locales/en/onboarding.json';
import enRadar from './locales/en/radar.json';
import enReport from './locales/en/report.json';
import enSettings from './locales/en/settings.json';
import enShield from './locales/en/shield.json';
import idBundle from './locales/id';
import myBundle from './locales/my';
import thBundle from './locales/th';
import tlBundle from './locales/tl';

export const en = {
  account: enAccount,
  check: enCheck,
  checking: enChecking,
  common: enCommon,
  contacts: enContacts,
  errors: enErrors,
  feedback: enFeedback,
  help: enHelp,
  home: enHome,
  learn: enLearn,
  live: enLive,
  onboarding: enOnboarding,
  radar: enRadar,
  report: enReport,
  settings: enSettings,
  shield: enShield,
};

export type Resources = typeof en;
export type Namespace = keyof Resources;
export const NAMESPACES = Object.keys(en) as Namespace[];

export const resources = { en, id: idBundle, my: myBundle, th: thBundle, tl: tlBundle };
