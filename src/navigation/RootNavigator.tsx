import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CheckResponse, LanguageCode } from '../api/types';
import { TabIcon } from './TabIcons';
import type { RootStackParamList, TabParamList } from './types';
import type { AfterOnboarding } from '../lib/onboarding';
import HomeScreen from '../screens/HomeScreen';
import CheckScreen from '../screens/CheckScreen';
import CheckingScreen from '../screens/CheckingScreen';
import ReportScreen from '../screens/ReportScreen';
import ReportScamScreen from '../screens/ReportScamScreen';
import ContactsScreen from '../screens/ContactsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AccountScreen from '../screens/AccountScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GetHelpScreen from '../screens/GetHelpScreen';
import RadarScreen from '../screens/RadarScreen';
import { navigationRef } from './ref';
import { useAppState } from '../state/AppState';
import { useMessageGuardConfigSync } from '../hooks/useMessageGuard';
import { useShieldTokenSync } from '../hooks/useShieldTokenSync';
import LearnScreen from '../screens/LearnScreen';
import ShieldScreen from '../screens/ShieldScreen';
import ScamGuideScreen from '../screens/ScamGuideScreen';
import ShieldHowToScreen from '../screens/ShieldHowToScreen';
import { useSharedDraft } from '../hooks/useSharedDraft';
import { useShieldDeepLink } from '../hooks/useShieldDeepLink';
import { Text } from '../components/Text';
import theme from '../theme/theme';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.white, border: theme.colors.border, primary: theme.colors.accent } };

const Tabs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tall = i18n.language === 'my' || i18n.language === 'th';
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarLabel: ({ color, children }) => <Text style={{ color, fontFamily: theme.fonts.semiBold, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{children}</Text>,
      tabBarStyle: { height: tall ? 88 : 72, paddingTop: 8, paddingBottom: 12 },
      tabBarItemStyle: { minHeight: tall ? 68 : 52 },
      tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
    <Tab.Screen name="Check" component={CheckScreen} options={{ title: t('tabs.check') }} />
    <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: t('tabs.contacts'), tabBarAccessibilityLabel: t('tabs.contactsA11y') }} />
    <Tab.Screen name="Learn" component={LearnScreen} options={{ title: t('tabs.learn') }} />
  </Tab.Navigator>
  );
};

const ShareIntentBridge: React.FC<{ ready: boolean }> = ({ ready }) => {
  const { draft, clear } = useSharedDraft();
  useEffect(() => {
    if (!draft || !ready) return;
    navigationRef.navigate('Tabs', { screen: 'Check', params: { draft, nonce: Date.now() } });
    clear();
  }, [draft, ready, clear]);
  return null;
};

const openReport = (result: CheckResponse, language: LanguageCode) => navigationRef.navigate('Report', { result, language });

const openScreen = (screen: 'GetHelp' | 'Shield') => navigationRef.navigate(screen);

const DeepLinkBridge: React.FC<{ ready: boolean }> = ({ ready }) => {
  useShieldDeepLink(ready, openReport, openScreen);
  return null;
};

export const RootNavigator: React.FC = () => {
  const [ready, setReady] = useState(false);
  const { ready: loaded, profile } = useAppState();
  useShieldTokenSync();
  useMessageGuardConfigSync();
  const onOnboardingDone = (next?: AfterOnboarding) => {
    if (next) setTimeout(() => navigationRef.navigate('Account', { mode: next }), 150);
  };
  if (!loaded) return null;
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={() => setReady(true)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {profile.onboarded ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Checking" component={CheckingScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="ReportScam" component={ReportScamScreen} />
            <Stack.Screen name="Shield" component={ShieldScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="GetHelp" component={GetHelpScreen} />
            <Stack.Screen name="Radar" component={RadarScreen} />
            <Stack.Screen name="ScamGuide" component={ScamGuideScreen} />
            <Stack.Screen name="ShieldHowTo" component={ShieldHowToScreen} />
          </>
        ) : (
          <Stack.Screen name="Onboarding">{() => <OnboardingScreen onDone={onOnboardingDone} />}</Stack.Screen>
        )}
      </Stack.Navigator>
      <ShareIntentBridge ready={ready && profile.onboarded} />
      <DeepLinkBridge ready={ready && profile.onboarded} />
    </NavigationContainer>
  );
};

export default RootNavigator;
