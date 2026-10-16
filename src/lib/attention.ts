import type { AttentionTier, CheckResponse, Verdict } from '../api/types';
import { t } from '../i18n';
import { verdictLabel } from './labels';

/** A Job Shield tier reuses the verdict visuals: meter step, doll mood and colour. */
export const TIER_VERDICT: Record<AttentionTier, Verdict> = { lower: 'safe', verify: 'careful', pause: 'danger' };

type Leveled = Pick<CheckResponse, 'verdict'> & { attention?: AttentionTier };

export function tierWord(tier: AttentionTier): string {
  return t(`report:attention.word.${tier}`);
}

export function tierHeadline(tier: AttentionTier): string {
  return t(`report:attention.headline.${tier}`);
}

/** The word on the verdict band, meter and chips. Job results never say Low risk, so the tier word wins. */
export function resultWord(result: Leveled): string {
  return result.attention ? tierWord(result.attention) : verdictLabel(result.verdict);
}

/** The meter shows three steps; a tier result names them with tier words. */
export function stepWord(step: Verdict, attention?: AttentionTier): string {
  if (!attention) return verdictLabel(step);
  return tierWord((Object.keys(TIER_VERDICT) as AttentionTier[]).find(k => TIER_VERDICT[k] === step) as AttentionTier);
}

/** History keeps the verdict and the conflicts, not the facts the user typed or the model read. */
export function forHistory(result: CheckResponse): CheckResponse {
  if (!result.adFacts && !result.chatFacts) return result;
  const { adFacts: _ad, chatFacts: _chat, ...rest } = result;
  return rest;
}
