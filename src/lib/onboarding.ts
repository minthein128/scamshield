export type StepId = 'language' | 'account' | 'countries' | 'how' | 'sharing';

export const ONBOARDING_STEPS: readonly StepId[] = ['language', 'account', 'countries', 'how', 'sharing'];

export function onboardingSteps(): StepId[] {
  return [...ONBOARDING_STEPS];
}

export type HowId = 'check' | 'doll' | 'call' | 'warn';

export const HELP_POINTS: readonly HowId[] = ['check', 'doll', 'call', 'warn'];

/** The doll row points at the screen shield, which only runs on Android. */
export function helpPoints(shieldAvailable: boolean): HowId[] {
  return HELP_POINTS.filter(p => p !== 'doll' || shieldAvailable);
}

export const SHARING_POINTS = ['p1', 'p2', 'p3', 'p4'] as const;

/** Hourly check limits per uid. They mirror ANON_LIMIT_PER_HOUR and USER_LIMIT_PER_HOUR in server/src/config.ts. */
export const CHECKS_PER_HOUR = { anonymous: 20, account: 60 } as const;

const BURMESE_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

export function localNumber(n: number, language: string): string {
  return language === 'my' ? String(n).replace(/\d/g, d => BURMESE_DIGITS[Number(d)]) : String(n);
}
