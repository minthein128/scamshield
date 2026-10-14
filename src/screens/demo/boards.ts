import type React from 'react';
import AgencyCheckScreen from './AgencyCheckScreen';
import AgencyPageScreen from './AgencyPageScreen';
import CaseStudyArchitectureScreen from './CaseStudyArchitectureScreen';
import ChatNeedOlderScreen from './ChatNeedOlderScreen';
import ChatScrolledScreen from './ChatScrolledScreen';
import ChatStrangeScreen from './ChatStrangeScreen';
import ChatVerdictScreen from './ChatVerdictScreen';
import JobAutoCheckScreen from './JobAutoCheckScreen';
import JobCutOffScreen from './JobCutOffScreen';
import JobExpandScreen from './JobExpandScreen';
import JobSpotScreen from './JobSpotScreen';
import JobVerdictScreen from './JobVerdictScreen';
import NotifVerdictScreen from './NotifVerdictScreen';
import NotifWarningScreen from './NotifWarningScreen';
import ScamTaxonomyScreen from './ScamTaxonomyScreen';
import ShieldIntroScreen from './ShieldIntroScreen';
import ShopListingScreen from './ShopListingScreen';
import ShopSellerProfileScreen from './ShopSellerProfileScreen';
import ShopSellerScreen from './ShopSellerScreen';
import ShopVerdictScreen from './ShopVerdictScreen';

export type BoardComponent = React.ComponentType<{ onNavigate?: (route: string) => void }>;

export interface Board {
  key: string;
  title: string;
  group: string;
  width: number;
  height: number;
  Component: BoardComponent;
}

export const BOARDS: Board[] = [
  { key: 'shield-intro', group: 'Overlay: shield button', title: 'Turn on the shield', width: 390, height: 844, Component: ShieldIntroScreen },
  { key: 'job-spot', group: 'Overlay: job post', title: 'Spot a job post', width: 390, height: 844, Component: JobSpotScreen },
  { key: 'job-cutoff', group: 'Overlay: job post', title: 'Text is cut off', width: 390, height: 844, Component: JobCutOffScreen },
  { key: 'job-expand', group: 'Overlay: job post', title: 'Tap again', width: 390, height: 844, Component: JobExpandScreen },
  { key: 'job-scan', group: 'Overlay: job post', title: 'Auto check', width: 390, height: 844, Component: JobAutoCheckScreen },
  { key: 'job-verdict', group: 'Overlay: job post', title: 'Picture verdict', width: 390, height: 844, Component: JobVerdictScreen },
  { key: 'chat-strange', group: 'Overlay: strange chat', title: 'Strange chat', width: 390, height: 844, Component: ChatStrangeScreen },
  { key: 'chat-more', group: 'Overlay: strange chat', title: 'Show older messages', width: 390, height: 844, Component: ChatNeedOlderScreen },
  { key: 'chat-older', group: 'Overlay: strange chat', title: 'Scroll up and tap again', width: 390, height: 844, Component: ChatScrolledScreen },
  { key: 'chat-verdict', group: 'Overlay: strange chat', title: 'Chat verdict', width: 390, height: 844, Component: ChatVerdictScreen },
  { key: 'notif-warning', group: 'Overlay: SMS', title: 'Automatic warning', width: 390, height: 844, Component: NotifWarningScreen },
  { key: 'notif-verdict', group: 'Overlay: SMS', title: 'Message verdict', width: 390, height: 844, Component: NotifVerdictScreen },
  { key: 'agency-page', group: 'Overlay: agency', title: 'Agency page', width: 390, height: 844, Component: AgencyPageScreen },
  { key: 'agency-verdict', group: 'Overlay: agency', title: 'Agency check', width: 390, height: 844, Component: AgencyCheckScreen },
  { key: 'shop-listing', group: 'Overlay: shop', title: 'Cheap listing', width: 390, height: 844, Component: ShopListingScreen },
  { key: 'shop-seller', group: 'Overlay: shop', title: 'Show the seller', width: 390, height: 844, Component: ShopSellerScreen },
  { key: 'shop-profile', group: 'Overlay: shop', title: 'Seller page, tap again', width: 390, height: 844, Component: ShopSellerProfileScreen },
  { key: 'shop-verdict', group: 'Overlay: shop', title: 'Shopping verdict', width: 390, height: 844, Component: ShopVerdictScreen },
  { key: 'taxonomy', group: 'Reference', title: 'Scam types by shield', width: 1440, height: 1160, Component: ScamTaxonomyScreen },
  { key: 'architecture', group: 'Reference', title: 'Case study: detection pipeline', width: 1840, height: 1040, Component: CaseStudyArchitectureScreen },
];

export function findBoard(key: string): Board | undefined {
  return BOARDS.find(b => b.key === key);
}
