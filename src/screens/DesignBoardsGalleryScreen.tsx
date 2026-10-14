import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import theme from '../theme/theme';

import HomeScreen from './HomeScreen';
import JobCheckScreen from './JobCheckScreen';
import RiskReportScreen from './RiskReportScreen';
import FamilyGuardianScreen from './FamilyGuardianScreen';
import ShieldIntroScreen from './ShieldIntroScreen';
import JobSpotScreen from './JobSpotScreen';
import JobCutOffScreen from './JobCutOffScreen';
import JobExpandScreen from './JobExpandScreen';
import JobAutoCheckScreen from './JobAutoCheckScreen';
import JobVerdictScreen from './JobVerdictScreen';
import ChatStrangeScreen from './ChatStrangeScreen';
import ChatNeedOlderScreen from './ChatNeedOlderScreen';
import ChatScrolledScreen from './ChatScrolledScreen';
import ChatVerdictScreen from './ChatVerdictScreen';
import NotifWarningScreen from './NotifWarningScreen';
import NotifVerdictScreen from './NotifVerdictScreen';
import AgencyPageScreen from './AgencyPageScreen';
import AgencyCheckScreen from './AgencyCheckScreen';
import ShopListingScreen from './ShopListingScreen';
import ShopSellerScreen from './ShopSellerScreen';
import ShopSellerProfileScreen from './ShopSellerProfileScreen';
import ShopVerdictScreen from './ShopVerdictScreen';
import ScamTaxonomyScreen from './ScamTaxonomyScreen';
import CaseStudyArchitectureScreen from './CaseStudyArchitectureScreen';

export interface BoardItem {
  id: string;
  num: string;
  title: string;
  routeKey: string;
  width: number;
  height: number;
  Component: React.ComponentType<{ onNavigate?: (route: string) => void }>;
}

export const ALL_BOARDS: BoardItem[] = [
  { id: '01', num: '01', title: 'Home', routeKey: 'Main.dc.html', width: 390, height: 844, Component: HomeScreen },
  { id: '02', num: '02', title: 'Check a job offer', routeKey: 'JobCheck.dc.html', width: 390, height: 844, Component: JobCheckScreen },
  { id: '03', num: '03', title: 'Risk report', routeKey: 'Result.dc.html', width: 390, height: 844, Component: RiskReportScreen },
  { id: '04', num: '04', title: 'Family guardian', routeKey: 'Family.dc.html', width: 390, height: 844, Component: FamilyGuardianScreen },
  { id: '05', num: '05', title: 'A. Turn on shield', routeKey: 'ShieldIntro', width: 390, height: 844, Component: ShieldIntroScreen },
  { id: '06', num: '06', title: 'B. Spot a job post', routeKey: 'Bubble.dc.html', width: 390, height: 844, Component: JobSpotScreen },
  { id: '07', num: '07', title: 'C. Text is cut off', routeKey: 'CutOff.dc.html', width: 390, height: 844, Component: JobCutOffScreen },
  { id: '08', num: '08', title: 'D. Tap again', routeKey: 'Expanded.dc.html', width: 390, height: 844, Component: JobExpandScreen },
  { id: '09', num: '09', title: 'E. Auto check', routeKey: 'Scanning.dc.html', width: 390, height: 844, Component: JobAutoCheckScreen },
  { id: '10', num: '10', title: 'F. Picture verdict', routeKey: 'Verdict.dc.html', width: 390, height: 844, Component: JobVerdictScreen },
  { id: '11', num: '11', title: 'G. Strange chat', routeKey: 'ChatBubble', width: 390, height: 844, Component: ChatStrangeScreen },
  { id: '12', num: '12', title: 'H. Show older messages', routeKey: 'ChatMore.dc.html', width: 390, height: 844, Component: ChatNeedOlderScreen },
  { id: '13', num: '13', title: 'I. Scroll up & tap again', routeKey: 'ChatOlder.dc.html', width: 390, height: 844, Component: ChatScrolledScreen },
  { id: '14', num: '14', title: 'J. Chat verdict', routeKey: 'ChatVerdict.dc.html', width: 390, height: 844, Component: ChatVerdictScreen },
  { id: '15', num: '15', title: 'K. Automatic warning', routeKey: 'NotifWarning', width: 390, height: 844, Component: NotifWarningScreen },
  { id: '16', num: '16', title: 'L. Message verdict', routeKey: 'NotifVerdict.dc.html', width: 390, height: 844, Component: NotifVerdictScreen },
  { id: '17', num: '17', title: 'M. Agency page', routeKey: 'AgencyPage', width: 390, height: 844, Component: AgencyPageScreen },
  { id: '18', num: '18', title: 'N. Agency check', routeKey: 'AgencyVerdict.dc.html', width: 390, height: 844, Component: AgencyCheckScreen },
  { id: '19', num: '19', title: 'O. Cheap listing', routeKey: 'ShopListing', width: 390, height: 844, Component: ShopListingScreen },
  { id: '20', num: '20', title: 'P. Show the seller', routeKey: 'ShopMore.dc.html', width: 390, height: 844, Component: ShopSellerScreen },
  { id: '21', num: '21', title: 'Q. Seller page tap again', routeKey: 'ShopSeller.dc.html', width: 390, height: 844, Component: ShopSellerProfileScreen },
  { id: '22', num: '22', title: 'R. Shopping verdict', routeKey: 'ShopVerdict.dc.html', width: 390, height: 844, Component: ShopVerdictScreen },
  { id: '23', num: '23', title: 'Scam taxonomy', routeKey: 'ScamTypes', width: 1440, height: 1160, Component: ScamTaxonomyScreen },
  { id: '24', num: '24', title: 'Case study: Gambling bonus lure', routeKey: 'CaseStudy', width: 1840, height: 1040, Component: CaseStudyArchitectureScreen },
];

interface DesignBoardsGalleryScreenProps {
  onNavigate?: (route: string) => void;
}

export const DesignBoardsGalleryScreen: React.FC<DesignBoardsGalleryScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>SafeRoute Design Boards</Text>
          <Text style={styles.badgeText}>24 boards</Text>
        </View>
        <Text style={styles.subtitleText}>
          Source: SafeRoute-Anti-Fraud-App-Mockup.html · Expo React Native SDK 52
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.galleryContent}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.galleryVertical}
        >
          <View style={styles.grid}>
            {ALL_BOARDS.map(board => (
              <View key={board.id} style={styles.boardCard}>
                <View style={styles.boardHeader}>
                  <View style={styles.boardMeta}>
                    <Text style={styles.boardNum}>#{board.num}</Text>
                    <Text style={styles.boardTitle}>{board.title}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => onNavigate?.(board.routeKey)}
                  >
                    <Text style={styles.openBtnText}>Open Screen</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.canvasWrapper, { width: board.width, height: board.height }]}>
                  <board.Component onNavigate={onNavigate} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: '#F8FAFC',
    includeFontPadding: false,
    lineHeight: 26,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: '#38BDF8',
    backgroundColor: '#0369A1',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    includeFontPadding: false,
    lineHeight: 16,
  },
  subtitleText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#94A3B8',
    marginTop: 4,
    includeFontPadding: false,
    lineHeight: 18,
  },
  galleryContent: {
    padding: 24,
  },
  galleryVertical: {
    paddingBottom: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    alignItems: 'flex-start',
  },
  boardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'flex-start',
  },
  boardHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  boardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boardNum: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: '#38BDF8',
    includeFontPadding: false,
    lineHeight: 18,
  },
  boardTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: '#F1F5F9',
    includeFontPadding: false,
    lineHeight: 20,
  },
  openBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  openBtnText: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
    includeFontPadding: false,
    lineHeight: 16,
  },
  canvasWrapper: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#0F1B2D',
    borderWidth: 1,
    borderColor: '#475569',
  },
});

export default DesignBoardsGalleryScreen;
