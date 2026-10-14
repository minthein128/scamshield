import React, { useEffect, useState } from 'react';
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
import ContactsScreen from '../screens/ContactsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AccountScreen from '../screens/AccountScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GetHelpScreen from '../screens/GetHelpScreen';
import { navigationRef } from './ref';
import { useAppState } from '../state/AppState';
import { useShieldTokenSync } from '../hooks/useShieldTokenSync';
import LearnScreen from '../screens/LearnScreen';
import ShieldScreen from '../screens/ShieldScreen';
import DemoBoardScreen from '../screens/DemoBoardScreen';
import { useSharedDraft } from '../hooks/useSharedDraft';
import { useShieldDeepLink } from '../hooks/useShieldDeepLink';
import theme from '../theme/theme';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.white, border: theme.colors.border, primary: theme.colors.accent } };

const Tabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarLabelStyle: { fontFamily: theme.fonts.semiBold, fontSize: 11, lineHeight: 18 },
      tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 12 },
      tabBarItemStyle: { height: 52 },
      tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Check" component={CheckScreen} />
    <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Contacts', tabBarAccessibilityLabel: 'Trusted contacts' }} />
    <Tab.Screen name="Learn" component={LearnScreen} />
  </Tab.Navigator>
);

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

const DeepLinkBridge: React.FC<{ ready: boolean }> = ({ ready }) => {
  useShieldDeepLink(ready, openReport);
  return null;
};

export const RootNavigator: React.FC = () => {
  const [ready, setReady] = useState(false);
  const { ready: loaded, profile } = useAppState();
  useShieldTokenSync();
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
            <Stack.Screen name="Shield" component={ShieldScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="GetHelp" component={GetHelpScreen} />
            <Stack.Screen name="DemoBoard" component={DemoBoardScreen} />
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
