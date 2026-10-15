import { describe, expect, it } from 'vitest';
import {
  applyBorderProtection,
  detectConflicts,
  extractSingleSourceFlags,
  getStillUnclear,
  isBorderLocation,
  mapToAttentionTier,
} from '../src/job/rules.js';
import type { JobFacts } from '../src/job/types.js';

function baseFacts(): JobFacts {
  return {
    employer: null,
    jobTitle: null,
    workplace: null,
    destinationCountry: null,
    salary: null,
    workerFee: null,
    contract: null,
    visaOrPermit: null,
    travelArrangedBy: null,
    route: null,
    meetingPoint: null,
    documentRequest: null,
    paymentRequest: null,
    urgency: null,
    contactChannel: null,
    secrecyRequest: null,
  };
}

describe('Job Shield Conflict Rules', () => {
  it('detects fee conflict when ad says no fee and chat asks for a deposit', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      workerFee: { value: 'none stated', quote: 'Free placement, zero fee', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      workerFee: { value: 'Deposit required', quote: 'Send 300 USD deposit to secure seat', confidence: 0.9 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'workerFee',
      family: 'payment_route',
      severity: 'high',
    });
  });

  it('detects documents conflict when chat demands passport', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      documentRequest: { value: 'none', quote: 'No original documents needed', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      documentRequest: { value: 'passport_hold', quote: 'You must surrender your physical passport upon arrival', confidence: 0.95 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'documentRequest',
      family: 'trafficking',
      severity: 'high',
    });
  });

  it('detects contract conflict when ad offers official contract but chat delays it', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      contract: { value: 'official', quote: 'Official standard MOEAF contract', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      contract: { value: 'later', quote: 'Sign the contract after 3 months trial', confidence: 0.85 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'contract',
      family: 'payment_route',
      severity: 'high',
    });
  });

  it('detects visa conflict when ad promises work visa but chat instructs tourist visa', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      visaOrPermit: { value: 'work_visa', quote: 'Non-B work permit included', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      visaOrPermit: { value: 'tourist', quote: 'Travel on tourist visa, we convert later', confidence: 0.95 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'visaOrPermit',
      family: 'trafficking',
      severity: 'high',
    });
  });

  it('detects meeting point conflict when chat shifts to driver or border pickup', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      meetingPoint: { value: 'workplace', quote: 'Report to Bangkok office, Sukhumvit Rd', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      meetingPoint: { value: 'border', quote: 'Meet the driver in Mae Sot near the river', confidence: 0.9 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'meetingPoint',
      family: 'trafficking',
      severity: 'medium',
    });
  });

  it('detects employer conflict when company name differs', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      employer: { value: 'Siam Pacific Ltd', quote: 'Siam Pacific Ltd recruitment', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      employer: { value: 'Golden Crown Club', quote: 'Office is Golden Crown Club', confidence: 0.85 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'employer',
      family: 'identity',
      severity: 'medium',
    });
  });

  it('detects salary conflict when amounts differ significantly', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      salary: { value: { amount: '45000', currency: 'THB', period: 'monthly' }, quote: '45,000 THB', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      salary: { value: { amount: '18000', currency: 'THB', period: 'monthly' }, quote: '18,000 THB initially', confidence: 0.85 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      field: 'salary',
      family: 'too_good',
      severity: 'low',
    });
  });

  it('produces NO conflict when only one source states a value', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      workerFee: { value: 'none stated', quote: 'No fees', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Work visa', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      // workerFee is null in chat
      // visaOrPermit is null in chat
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(0);
  });

  it('produces NO conflict when both sources state matching values', () => {
    const ad: JobFacts = {
      ...baseFacts(),
      employer: { value: 'CP Group Thailand', quote: 'CP Group Thailand', confidence: 0.9 },
      contract: { value: 'official', quote: 'Standard contract', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Legal work permit', confidence: 0.9 },
    };
    const chat: JobFacts = {
      ...baseFacts(),
      employer: { value: 'CP Group Thailand', quote: 'CP Group HR Department', confidence: 0.9 },
      contract: { value: 'official', quote: 'Official contract ready for review', confidence: 0.9 },
      visaOrPermit: { value: 'work_visa', quote: 'Non-B visa sponsorship', confidence: 0.9 },
    };
    const conflicts = detectConflicts(ad, chat);
    expect(conflicts).toHaveLength(0);
  });

  it('extracts single source flags for coercive demands even if no conflict exists', () => {
    const chat: JobFacts = {
      ...baseFacts(),
      secrecyRequest: { value: true, quote: 'Do not tell anyone about this job', confidence: 0.95 },
      paymentRequest: { value: 'personal_account', quote: 'Transfer to KBZ account 12345', confidence: 0.9 },
      documentRequest: { value: 'passport_hold', quote: 'We keep your passport for safety', confidence: 0.9 },
    };
    const flags = extractSingleSourceFlags(chat, 'chat');
    expect(flags.some((f) => f.family === 'pressure')).toBe(true);
    expect(flags.some((f) => f.family === 'payment_route')).toBe(true);
    expect(flags.some((f) => f.family === 'trafficking')).toBe(true);
  });
});

describe('Border town protection rule', () => {
  it('identifies border locations correctly', () => {
    expect(isBorderLocation('Meet near Mae Sot border')).toBe(true);
    expect(isBorderLocation('မဲဆောက်မြို့')).toBe(true);
    expect(isBorderLocation('Myawaddy gate')).toBe(true);
    expect(isBorderLocation('Bangkok downtown office')).toBe(false);
    expect(isBorderLocation('Kuala Lumpur warehouse')).toBe(false);
  });

  it('caps score below danger if only border town location is present without other risk families', () => {
    const borderOnlyFlags = [
      {
        family: 'trafficking' as const,
        label: 'Pickup arranged near border crossing (chat)',
        evidence: 'Meet driver in Mae Sot',
        severity: 'medium' as const,
      },
    ];
    // Hypothetical score calculated as 80
    const res = applyBorderProtection(borderOnlyFlags, 80);
    expect(res.score).toBeLessThan(70);
    expect(res.score).toBe(50);
  });

  it('allows danger score when non-geographic risk families are present alongside border location', () => {
    const multiRiskFlags = [
      {
        family: 'trafficking' as const,
        label: 'Pickup arranged near border crossing',
        evidence: 'Mae Sot border crossing',
        severity: 'medium' as const,
      },
      {
        family: 'payment_route' as const,
        label: 'Payment demanded prior to contract',
        evidence: 'Pay 500 USD upfront',
        severity: 'high' as const,
      },
      {
        family: 'pressure' as const,
        label: 'Instructed secrecy',
        evidence: 'Do not tell anyone',
        severity: 'high' as const,
      },
    ];
    const res = applyBorderProtection(multiRiskFlags, 85);
    expect(res.score).toBe(85);
  });
});

describe('Still unclear and attention tier mapping', () => {
  it('lists missing critical fields when both sources are empty', () => {
    const emptyAd = baseFacts();
    const emptyChat = baseFacts();
    const unclear = getStillUnclear(emptyAd, emptyChat);
    expect(unclear).toContain('No verifiable workplace address or physical facility location was provided.');
    expect(unclear).toContain('No written employment contract or official terms of service were provided.');
    expect(unclear).toContain('No legal work visa or registered work permit pathway was confirmed.');
  });

  it('maps verdicts to spec attention tiers correctly', () => {
    expect(mapToAttentionTier('danger').tier).toBe('pause');
    expect(mapToAttentionTier('careful').tier).toBe('verify');
    expect(mapToAttentionTier('safe').tier).toBe('lower');
  });
});
