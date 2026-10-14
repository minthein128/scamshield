import type React from 'react';
import type { DemoKey } from '../learn/content';
import AgencyCheckScreen from './AgencyCheckScreen';
import AgencyPageScreen from './AgencyPageScreen';
import ChatNeedOlderScreen from './ChatNeedOlderScreen';
import ChatScrolledScreen from './ChatScrolledScreen';
import ChatStrangeScreen from './ChatStrangeScreen';
import ChatVerdictScreen from './ChatVerdictScreen';
import JobAutoCheckScreen from './JobAutoCheckScreen';
import JobCutOffScreen from './JobCutOffScreen';
import JobSpotScreen from './JobSpotScreen';
import JobVerdictScreen from './JobVerdictScreen';
import NotifVerdictScreen from './NotifVerdictScreen';
import NotifWarningScreen from './NotifWarningScreen';
import ShieldIntroScreen from './ShieldIntroScreen';
import ShopListingScreen from './ShopListingScreen';
import ShopSellerProfileScreen from './ShopSellerProfileScreen';
import ShopSellerScreen from './ShopSellerScreen';
import ShopVerdictScreen from './ShopVerdictScreen';

export const DEMO_SIZE = { width: 390, height: 844 } as const;

export const DEMOS: Record<DemoKey, React.ComponentType<{ onNavigate?: (route: string) => void }>> = {
  'shield-intro': ShieldIntroScreen,
  'job-spot': JobSpotScreen,
  'job-cutoff': JobCutOffScreen,
  'job-scan': JobAutoCheckScreen,
  'job-verdict': JobVerdictScreen,
  'chat-strange': ChatStrangeScreen,
  'chat-more': ChatNeedOlderScreen,
  'chat-older': ChatScrolledScreen,
  'chat-verdict': ChatVerdictScreen,
  'notif-warning': NotifWarningScreen,
  'notif-verdict': NotifVerdictScreen,
  'agency-page': AgencyPageScreen,
  'agency-verdict': AgencyCheckScreen,
  'shop-listing': ShopListingScreen,
  'shop-seller': ShopSellerScreen,
  'shop-profile': ShopSellerProfileScreen,
  'shop-verdict': ShopVerdictScreen,
};
