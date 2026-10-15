import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from '../components/BrandMark';
import { Text } from '../components/Text';
import { RAIL_WIDTH } from '../hooks/useLayout';
import theme from '../theme/theme';
import { TabIcon } from './TabIcons';
import type { TabParamList } from './types';

const { colors, fonts } = theme;

export const TabRail: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" testID="tab-rail" style={[styles.rail, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.brand}>
        <BrandMark size={40} />
      </View>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.textSecondary;
        const label = options.title ?? route.name;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
          }
        };
        return (
          <TouchableOpacity
            key={route.key}
            testID={`rail-${route.name}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.item}
          >
            <View style={[styles.pill, focused && styles.pillOn]}>
              <TabIcon name={route.name as keyof TabParamList} color={color} />
            </View>
            <Text numberOfLines={2} style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  rail: { width: RAIL_WIDTH, backgroundColor: colors.white, borderRightWidth: 1, borderRightColor: colors.border, alignItems: 'center', gap: 8 },
  brand: { height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  item: { width: RAIL_WIDTH - 12, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.brandBlueLight },
  label: { fontSize: 12, lineHeight: 18, fontFamily: fonts.semiBold, textAlign: 'center' },
});
