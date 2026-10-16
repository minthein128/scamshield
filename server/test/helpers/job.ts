import type { FactField, JobFacts } from '../../src/job/types.js';
import { emptyFacts } from '../../src/job/types.js';

export const f = <T>(value: T, quote = String(value), confidence = 0.9): FactField<T> => ({ value, quote, confidence });

export const facts = (over: Partial<JobFacts> = {}): JobFacts => ({ ...emptyFacts(), ...over });

export const refused = (quote: string): FactField<string> => ({ value: '', quote, confidence: 0.8, refused: true });
