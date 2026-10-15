import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { restoreUiLanguage } from './i18n';
import { BrandMark } from './components/BrandMark';
import { Text } from './components/Text';
import RootNavigator from './navigation/RootNavigator';
import { AppStateProvider } from './state/AppState';
import { AuthProvider } from './state/AuthState';
import { useApiUrl } from './config/runtime';
import theme from './theme/theme';

export default function App() {
  const { t } = useTranslation();
  const apiUrl = useApiUrl();
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    restoreUiLanguage().finally(() => setLanguageReady(true));
  }, []);
  const mockMode = __DEV__ && apiUrl === '';
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'IBMPlexMono-Medium': require('../assets/fonts/IBMPlexMono-Medium.ttf'),
    'A10YoeShin-Regular': require('../assets/fonts/A10_YoeShin-Regular.ttf'),
    'A10YoeShin-Bold': require('../assets/fonts/A10_YoeShin-Bold.ttf'),
    'NotoSansThai-Regular': require('../assets/fonts/NotoSansThai-Regular.ttf'),
    'NotoSansThai-Bold': require('../assets/fonts/NotoSansThai-Bold.ttf'),
  });

  if (!fontsLoaded || !languageReady) {
    return (
      <View style={styles.loading}>
        <BrandMark size={56} />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.column}>
          {mockMode ? (
            <View testID="mock-banner" accessibilityRole="alert" style={styles.mock}>
              <Text style={styles.mockText}>{t('offlineDemo')}</Text>
            </View>
          ) : null}
          <AuthProvider>
            <AppStateProvider>
              <RootNavigator />
            </AppStateProvider>
          </AuthProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? theme.colors.deepDarkBackground : theme.colors.background },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: theme.colors.background,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' as const } : {}),
  },
  mock: { backgroundColor: theme.colors.amberBadge, paddingVertical: 4, alignItems: 'center' },
  mockText: { color: theme.colors.amberDark, fontSize: 12, lineHeight: 16, fontFamily: theme.fonts.bold },
  loading: { flex: 1, backgroundColor: theme.colors.darkBackground, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.colors.white, fontSize: 16 },
});
