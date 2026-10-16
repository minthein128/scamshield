import type { CheckResponse, Extraction, Flag, Verdict } from '../../server/src/types.js';
import type { Comprehension, HotlineCheck, PhoneHit, SafeLanguage } from './match.js';

export const VARIANT_KINDS = ['repeat', 'lang', 'downscale', 'jpeg30', 'crop_top10', 'rotate', 'dark', 'notif_bar', 'injection'] as const;
export type VariantKind = (typeof VARIANT_KINDS)[number];

/** One pipeline call and what it returned. */
export interface RunRecord {
  caseId: string;
  variant: string;
  kind: 'base' | VariantKind;
  key: string;
  response?: CheckResponse;
  extraction?: Extraction;
  reasked?: boolean;
  latencyMs: number;
  cached: boolean;
  error?: string;
  /** Text visible in this image, for evidence checks: the case text plus any overlay we drew. */
  sourceText?: string;
}

export type FlagOrigin = 'extract' | 'ground' | 'derived';
export interface OriginFlag extends Flag {
  origin: FlagOrigin;
}

export interface VariantOutcome {
  name: string;
  kind: VariantKind;
  verdict: Verdict | 'ERROR';
  score: number | null;
  stable: boolean;
  change: 'same' | 'drop' | 'raise' | 'error';
  factRetention: number | null;
  lostFacts: string[];
  cached: boolean;
}

export interface CaseScore {
  id: string;
  language: string;
  app: string;
  scamType: string;
  expected: Verdict;
  verdict: Verdict | 'ERROR';
  score: number | null;
  scamTypeOut: string | null;
  latencyMs: number;
  error?: string;
  legacy: boolean;
  calibration: {
    ordinalError: number;
    inBand: boolean;
    band: [number, number];
    cost: number;
    severeFalseReassurance: boolean;
    falseReassurance: boolean;
    falseAlarm: boolean;
    value: number;
  };
  evidence: { quotes: number; grounded: number; invented: { evidence: string; score: number }[]; external: number; value: number | null };
  facts: {
    total: number;
    hit: { id: string; via: string }[];
    missed: string[];
    onlyInEvidence: string[];
    invented: string[];
    value: number | null;
  };
  families: { expected: string[] | null; predicted: string[]; tp: number; fp: number; fn: number; value: number | null };
  actionability: {
    required: string[];
    advised: { id: string; via: string }[];
    missing: string[];
    hotline: HotlineCheck;
    hallucinatedPhones: PhoneHit[];
    value: number | null;
  };
  safety: SafeLanguage;
  comprehension: Comprehension;
  robustness: { variants: VariantOutcome[]; value: number | null };
  repeats: { verdicts: string[]; scores: number[]; agreement: number | null; scoreStd: number | null };
  critical: string[];
  uncapped: number;
  composite: number;
  judge?: { score: number; reason: string; model: string };
  output?: {
    title: string;
    summary: string;
    spokenWarning: string;
    flags: OriginFlag[];
    actions: CheckResponse['actions'];
  };
}
