import theme from '../../theme/theme';
import type { ScamTypeId } from './content';

const { colors } = theme;

const NEUTRAL = { accent: colors.textPrimary, soft: colors.borderSubtle };

/** One treatment for every scam type: ink on a warm tile. Hue is reserved for verdicts. */
export const ACCENTS: Record<ScamTypeId, { accent: string; soft: string }> = {
  jobs: NEUTRAL,
  romance: NEUTRAL,
  parcel: NEUTRAL,
  agency: NEUTRAL,
  shop: NEUTRAL,
};
