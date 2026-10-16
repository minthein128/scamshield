export type StepId = 'language' | 'countries' | 'how' | 'shield' | 'account';

export const HELP_POINTS = ['check', 'explain', 'warn'] as const;

export function onboardingSteps(shieldAvailable: boolean): StepId[] {
  return shieldAvailable ? ['language', 'countries', 'how', 'shield', 'account'] : ['language', 'countries', 'how', 'account'];
}

export type AfterOnboarding = 'signUp' | 'signIn' | undefined;
