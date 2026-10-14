import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabIcon } from './TabIcons';
import type { RootStackParamList, TabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import CheckScreen from '../screens/CheckScreen';
import CheckingScreen from '../screens/CheckingScreen';
import ReportScreen from '../screens/ReportScreen';
import FamilyScreen from '../screens/FamilyScreen';
import LearnScreen from '../screens/LearnScreen';
import ShieldScreen from '../screens/ShieldScreen';
import DemoBoardScreen from '../screens/DemoBoardScreen';
import { useSharedDraft } from '../hooks/useSharedDraft';
import theme from '../theme/theme';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.white, border: theme.colors.border, primary: theme.colors.accent } };

const Tabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarLabelStyle: { fontFamily: theme.fonts.semiBold, fontSize: 11, lineHeight: 18 },
      tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8 },
      tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Check" component={CheckScreen} />
    <Tab.Screen name="Family" component={FamilyScreen} />
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

export const RootNavigator: React.FC = () => {
  const [ready, setReady] = useState(false);
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={() => setReady(true)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Checking" component={CheckingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Shield" component={ShieldScreen} />
        <Stack.Screen name="DemoBoard" component={DemoBoardScreen} />
      </Stack.Navigator>
      <ShareIntentBridge ready={ready} />
    </NavigationContainer>
  );
};

export default RootNavigator;
