export type StepId = 'language' | 'countries' | 'how' | 'shield' | 'sharing' | 'account';

export const HELP_POINTS = ['check', 'explain', 'warn'] as const;

export const SHARING_POINTS = ['p1', 'p2', 'p3', 'p4'] as const;

export function onboardingSteps(shieldAvailable: boolean): StepId[] {
  return shieldAvailable ? ['language', 'countries', 'how', 'shield', 'sharing', 'account'] : ['language', 'countries', 'how', 'sharing', 'account'];
}

export type AfterOnboarding = 'signUp' | 'signIn' | undefined;
