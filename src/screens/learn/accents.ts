import theme from '../../theme/theme';
import type { ScamTypeId } from './content';

const { colors } = theme;

export const ACCENTS: Record<ScamTypeId, { accent: string; soft: string }> = {
  jobs: { accent: colors.danger, soft: colors.dangerSoftBg },
  romance: { accent: colors.indigoMedium, soft: '#E0E7FF' },
  parcel: { accent: colors.cyanDark, soft: '#DDF3F7' },
  agency: { accent: colors.tealDark, soft: '#DDF4F0' },
  shop: { accent: colors.roseDark, soft: '#FCE7F3' },
};
