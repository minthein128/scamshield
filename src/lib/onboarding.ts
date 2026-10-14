export type StepId = 'language' | 'countries' | 'how' | 'shield' | 'account';

export const HELP_POINTS: { title: string; body: string }[] = [
  { title: 'Check before you say yes', body: 'Paste a job offer, chat or link, or share a screenshot. SafeRoute looks for trafficking and scam warning signs.' },
  { title: 'See why, in your language', body: 'You get a clear verdict, the evidence behind it and a spoken warning in the language you choose.' },
  { title: 'Warn family and get help', body: 'Send a warning to people you trust and find official hotlines for the countries you care about.' },
];

export function onboardingSteps(shieldAvailable: boolean): StepId[] {
  return shieldAvailable ? ['language', 'countries', 'how', 'shield', 'account'] : ['language', 'countries', 'how', 'account'];
}

export type AfterOnboarding = 'signUp' | 'signIn' | undefined;
