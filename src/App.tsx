import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { AppStateProvider } from './state/AppState';
import { AuthProvider } from './state/AuthState';
import { useApiUrl } from './config/runtime';
import theme from './theme/theme';

export default function App() {
  const apiUrl = useApiUrl();
  const mockMode = __DEV__ && apiUrl === '';
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'IBMPlexMono-Medium': require('../assets/fonts/IBMPlexMono-Medium.ttf'),
    'NotoSansMyanmar-Regular': require('../assets/fonts/NotoSansMyanmar-Regular.ttf'),
    'NotoSansMyanmar-Bold': require('../assets/fonts/NotoSansMyanmar-Bold.ttf'),
    'NotoSansThai-Regular': require('../assets/fonts/NotoSansThai-Regular.ttf'),
    'NotoSansThai-Bold': require('../assets/fonts/NotoSansThai-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading SafeRoute...</Text>
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
              <Text style={styles.mockText}>Offline demo mode</Text>
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
