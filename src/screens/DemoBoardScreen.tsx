import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ui';
import { findBoard } from './demo/boards';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

export const DemoBoardScreen: React.FC<RootScreenProps<'DemoBoard'>> = ({ navigation, route }) => {
  const board = findBoard(route.params.key);
  const onNavigate = (target: string) => {
    if (target === 'exit') navigation.goBack();
    else if (findBoard(target)) navigation.replace('DemoBoard', { key: target });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <ScreenHeader title={board?.title ?? 'Demo'} onBack={() => navigation.goBack()} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} horizontal={(board?.width ?? 0) > 430}>
        <ScrollView nestedScrollEnabled contentContainerStyle={styles.scroll}>
          {board ? (
            <View style={{ width: board.width, height: board.height, overflow: 'hidden', borderRadius: 12 }}>
              <board.Component onNavigate={onNavigate} />
            </View>
          ) : null}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  scroll: { alignItems: 'center', paddingBottom: 24 },
});

export default DemoBoardScreen;
