import type { FlagFamily } from '../../api/types';
import type { IconName } from '../../components/Icon';
import { t } from '../../i18n';

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

type SignIndex = 1 | 2 | 3 | 4 | 5;
type ExampleKey =
  | 'jobs.e1' | 'jobs.e2' | 'jobs.e3' | 'jobs.e4'
  | 'romance.e1' | 'romance.e2' | 'romance.e3' | 'romance.e4'
  | 'parcel.e1' | 'parcel.e2'
  | 'agency.e1' | 'agency.e2'
  | 'shop.e1' | 'shop.e2' | 'shop.e3' | 'shop.e4';
type ShieldStepKey = 's1' | 's2' | 's3';

/* Text fields are getters so they follow the active UI language each time they are read. */
const action = (kind: GuideActionKind): GuideAction => ({
  kind,
  get title() {
    return t(`learn:actions.${kind}.title`);
  },
  get body() {
    return t(`learn:actions.${kind}.body`);
  },
});

const sign = (id: ScamTypeId, n: SignIndex, family: FlagFamily): ScamSign => ({
  family,
  get text() {
    return t(`learn:scams.${id}.signs.s${n}`);
  },
});

const step = (key: ExampleKey, demo: DemoKey): ExampleStep => ({
  demo,
  get title() {
    return t(`learn:examples.${key}.title`);
  },
  get caption() {
    return t(`learn:examples.${key}.caption`);
  },
});

const scam = (id: ScamTypeId, icon: IconName, signs: ScamSign[], example: ExampleStep[]): ScamType => ({
  id,
  icon,
  get title() {
    return t(`learn:scams.${id}.title`);
  },
  get hook() {
    return t(`learn:scams.${id}.hook`);
  },
  get howItStarts() {
    return t(`learn:scams.${id}.howItStarts`);
  },
  signs,
  example,
  actions: [action('noPay'), action('check'), action('help')],
});

export const SCAM_TYPES: ScamType[] = [
  scam('jobs', 'octagon', [sign('jobs', 1, 'too_good'), sign('jobs', 2, 'pressure'), sign('jobs', 3, 'trafficking'), sign('jobs', 4, 'trafficking'), sign('jobs', 5, 'identity')], [
    step('jobs.e1', 'job-spot'),
    step('jobs.e2', 'job-cutoff'),
    step('jobs.e3', 'job-scan'),
    step('jobs.e4', 'job-verdict'),
  ]),
  scam('romance', 'chat', [sign('romance', 1, 'identity'), sign('romance', 2, 'too_good'), sign('romance', 3, 'link_risk'), sign('romance', 4, 'payment_route'), sign('romance', 5, 'pressure')], [
    step('romance.e1', 'chat-strange'),
    step('romance.e2', 'chat-more'),
    step('romance.e3', 'chat-older'),
    step('romance.e4', 'chat-verdict'),
  ]),
  scam('parcel', 'phone', [sign('parcel', 1, 'payment_route'), sign('parcel', 2, 'link_risk'), sign('parcel', 3, 'pressure'), sign('parcel', 4, 'identity'), sign('parcel', 5, 'known_bad')], [
    step('parcel.e1', 'notif-warning'),
    step('parcel.e2', 'notif-verdict'),
  ]),
  scam('agency', 'user', [sign('agency', 1, 'identity'), sign('agency', 2, 'payment_route'), sign('agency', 3, 'too_good'), sign('agency', 4, 'pressure'), sign('agency', 5, 'known_bad')], [
    step('agency.e1', 'agency-page'),
    step('agency.e2', 'agency-verdict'),
  ]),
  scam('shop', 'gift', [sign('shop', 1, 'too_good'), sign('shop', 2, 'payment_route'), sign('shop', 3, 'identity'), sign('shop', 4, 'pressure'), sign('shop', 5, 'link_risk')], [
    step('shop.e1', 'shop-listing'),
    step('shop.e2', 'shop-seller'),
    step('shop.e3', 'shop-profile'),
    step('shop.e4', 'shop-verdict'),
  ]),
];

export interface RedFlag {
  family: FlagFamily;
  icon: IconName;
  name: string;
  title: string;
  explain: string;
  phrase: string;
}

const flag = (family: FlagFamily, icon: IconName): RedFlag => ({
  family,
  icon,
  get name() {
    return t(`learn:flags.${family}.name`);
  },
  get title() {
    return t(`learn:flags.${family}.title`);
  },
  get explain() {
    return t(`learn:flags.${family}.explain`);
  },
  get phrase() {
    return t(`learn:flags.${family}.phrase`);
  },
});

export const RED_FLAGS: RedFlag[] = [
  flag('too_good', 'gift'),
  flag('pressure', 'clock'),
  flag('payment_route', 'card'),
  flag('identity', 'user'),
  flag('link_risk', 'link'),
  flag('known_bad', 'flag'),
  flag('trafficking', 'octagon'),
];

export interface ShieldStep {
  demo: DemoKey;
  title: string;
  caption: string;
}

const shieldStep = (key: ShieldStepKey, demo: DemoKey): ShieldStep => ({
  demo,
  get title() {
    return t(`learn:shieldSteps.${key}.title`);
  },
  get caption() {
    return t(`learn:shieldSteps.${key}.caption`);
  },
});

export const SHIELD_STEPS: ShieldStep[] = [shieldStep('s1', 'shield-intro'), shieldStep('s2', 'job-cutoff'), shieldStep('s3', 'job-verdict')];

export function findScamType(id: string): ScamType | undefined {
  return SCAM_TYPES.find(s => s.id === id);
}

export function findRedFlag(family: FlagFamily): RedFlag | undefined {
  return RED_FLAGS.find(f => f.family === family);
}
