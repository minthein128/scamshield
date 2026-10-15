import React from 'react';
import { ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLayout } from '../hooks/useLayout';
import theme from '../theme/theme';

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  edges?: ('top' | 'bottom')[];
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  /** Grid or two-pane screen: uses the full content width on tablets instead of a reading column. */
  wide?: boolean;
  /** Lay footer buttons out in one row on tablets. */
  footerRow?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({ children, footer, edges = ['top'], background = theme.colors.background, contentStyle, scroll = true, wide, footerRow }) => {
  const layout = useLayout();
  const tablet = layout.isTablet;
  const maxWidth = wide ? layout.wideMaxWidth : layout.contentMaxWidth;
  const column = [styles.column, { maxWidth }];
  const padX = { paddingHorizontal: layout.gutter };

  const body = tablet ? <View style={[column, styles.inner, contentStyle]}>{children}</View> : children;
  const footerBody = tablet ? (
    <View style={[column, footerRow ? styles.footerRow : styles.footerCol]}>{footer}</View>
  ) : (
    footer
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: background }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={tablet ? [styles.tabletContent, padX] : [styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, tablet ? [styles.tabletContent, padX] : [styles.content, contentStyle]]}>{body}</View>
      )}
      {footer ? <View style={[styles.footer, tablet && padX, { backgroundColor: background }]}>{footerBody}</View> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { gap: 16, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24 },
  tabletContent: { alignItems: 'center', paddingTop: 28, paddingBottom: 32, flexGrow: 1 },
  column: { width: '100%', alignSelf: 'center' },
  inner: { gap: 16 },
  footer: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  footerCol: { gap: 8 },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
});
