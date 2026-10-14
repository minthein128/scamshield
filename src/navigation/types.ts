import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CheckRequest, CheckResponse, LanguageCode } from '../api/types';
import type { Draft } from '../lib/share';

export type CheckIntent = 'text' | 'link' | 'image';

export interface CheckParams {
  draft?: Draft;
  intent?: CheckIntent;
  nonce?: number;
}

export type TabParamList = {
  Home: undefined;
  Check: CheckParams | undefined;
  Contacts: undefined;
  Learn: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Account: { mode?: 'signUp' | 'signIn' } | undefined;
  Settings: undefined;
  GetHelp: undefined;
  Checking: { request: CheckRequest; source?: string };
  Report: { result: CheckResponse; language: LanguageCode; fresh?: boolean };
  Shield: undefined;
  DemoBoard: { key: string };
};

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
