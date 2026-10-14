import React from 'react';
import { ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../theme/theme';

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  edges?: ('top' | 'bottom')[];
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({ children, footer, edges = ['top'], background = theme.colors.background, contentStyle, scroll = true }) => (
  <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: background }]}>
    {scroll ? (
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
    )}
    {footer ? <View style={[styles.footer, { backgroundColor: background }]}>{footer}</View> : null}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { gap: 16, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24 },
  footer: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
});
