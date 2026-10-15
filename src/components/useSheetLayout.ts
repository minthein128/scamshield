import type { ViewStyle } from 'react-native';
import { useLayout } from '../hooks/useLayout';

const DIALOG_MAX_WIDTH = 560;
const DIALOG_RADIUS = 24;

/** Style layers that turn a bottom sheet into a centered dialog on tablets. Empty on phones. */
export function useSheetLayout(): { tablet: boolean; overlay: ViewStyle | null; sheet: ViewStyle | null } {
  const { isTablet } = useLayout();
  if (!isTablet) return { tablet: false, overlay: null, sheet: null };
  return {
    tablet: true,
    overlay: { justifyContent: 'center', padding: 24 },
    sheet: {
      maxWidth: DIALOG_MAX_WIDTH,
      borderTopLeftRadius: DIALOG_RADIUS,
      borderTopRightRadius: DIALOG_RADIUS,
      borderBottomLeftRadius: DIALOG_RADIUS,
      borderBottomRightRadius: DIALOG_RADIUS,
    },
  };
}
