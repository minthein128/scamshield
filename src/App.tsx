import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Modal, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import theme from './theme/theme';

import HomeScreen from './screens/HomeScreen';
import JobCheckScreen from './screens/JobCheckScreen';
import RiskReportScreen from './screens/RiskReportScreen';
import FamilyGuardianScreen from './screens/FamilyGuardianScreen';
import ShieldIntroScreen from './screens/ShieldIntroScreen';
import JobSpotScreen from './screens/JobSpotScreen';
import JobCutOffScreen from './screens/JobCutOffScreen';
import JobExpandScreen from './screens/JobExpandScreen';
import JobAutoCheckScreen from './screens/JobAutoCheckScreen';
import JobVerdictScreen from './screens/JobVerdictScreen';
import ChatStrangeScreen from './screens/ChatStrangeScreen';
import ChatNeedOlderScreen from './screens/ChatNeedOlderScreen';
import ChatScrolledScreen from './screens/ChatScrolledScreen';
import ChatVerdictScreen from './screens/ChatVerdictScreen';
import NotifWarningScreen from './screens/NotifWarningScreen';
import NotifVerdictScreen from './screens/NotifVerdictScreen';
import AgencyPageScreen from './screens/AgencyPageScreen';
import AgencyCheckScreen from './screens/AgencyCheckScreen';
import ShopListingScreen from './screens/ShopListingScreen';
import ShopSellerScreen from './screens/ShopSellerScreen';
import ShopSellerProfileScreen from './screens/ShopSellerProfileScreen';
import ShopVerdictScreen from './screens/ShopVerdictScreen';
import ScamTaxonomyScreen from './screens/ScamTaxonomyScreen';
import CaseStudyArchitectureScreen from './screens/CaseStudyArchitectureScreen';
import DesignBoardsGalleryScreen, { ALL_BOARDS } from './screens/DesignBoardsGalleryScreen';

const ROUTE_MAP: Record<string, React.ComponentType<{ onNavigate?: (route: string) => void }>> = {
  // Aliases from design hrefs
  'Main.dc.html': HomeScreen,
  'main': HomeScreen,
  'home': HomeScreen,
  'JobCheck.dc.html': JobCheckScreen,
  'jobcheck': JobCheckScreen,
  'Result.dc.html': RiskReportScreen,
  'riskreport': RiskReportScreen,
  'Family.dc.html': FamilyGuardianScreen,
  'family': FamilyGuardianScreen,
  'ShieldIntro': ShieldIntroScreen,
  'Bubble.dc.html': JobSpotScreen,
  'CutOff.dc.html': JobCutOffScreen,
  'Expanded.dc.html': JobExpandScreen,
  'Scanning.dc.html': JobAutoCheckScreen,
  'Verdict.dc.html': JobVerdictScreen,
  'ChatBubble': ChatStrangeScreen,
  'ChatMore.dc.html': ChatNeedOlderScreen,
  'ChatOlder.dc.html': ChatScrolledScreen,
  'ChatVerdict.dc.html': ChatVerdictScreen,
  'NotifWarning': NotifWarningScreen,
  'NotifVerdict.dc.html': NotifVerdictScreen,
  'AgencyPage': AgencyPageScreen,
  'AgencyVerdict.dc.html': AgencyCheckScreen,
  'ShopListing': ShopListingScreen,
  'ShopMore.dc.html': ShopSellerScreen,
  'ShopSeller.dc.html': ShopSellerProfileScreen,
  'ShopVerdict.dc.html': ShopVerdictScreen,
  'ScamTypes': ScamTaxonomyScreen,
  'CaseStudy': CaseStudyArchitectureScreen,
  'Gallery': DesignBoardsGalleryScreen,
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'IBMPlexMono-Medium': require('../assets/fonts/IBMPlexMono-Medium.ttf'),
  });

  const [currentRoute, setCurrentRoute] = useState<string>('Main.dc.html');
  const [menuVisible, setMenuVisible] = useState(false);
  const [hideSwitcher, setHideSwitcher] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const checkUrl = () => {
        const hash = (window.location.hash || '').replace('#', '');
        if (hash && ROUTE_MAP[hash]) {
          setCurrentRoute(hash);
        }
        if (window.location.search && window.location.search.includes('hideSwitcher=true')) {
          setHideSwitcher(true);
        }
      };
      checkUrl();
      window.addEventListener('hashchange', checkUrl);
      (window as any).__setRoute = (route: string) => {
        if (ROUTE_MAP[route]) {
          setCurrentRoute(route);
        }
      };
      (window as any).__setHideSwitcher = (hide: boolean) => {
        setHideSwitcher(hide);
      };
      return () => window.removeEventListener('hashchange', checkUrl);
    }
  }, []);

  const handleNavigate = (route: string) => {
    if (ROUTE_MAP[route]) {
      setCurrentRoute(route);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
        window.location.hash = route;
      }
    } else {
      console.log('Navigate to unknown route:', route);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading SafeRoute fonts...</Text>
      </View>
    );
  }

  const CurrentScreenComponent = ROUTE_MAP[currentRoute] || HomeScreen;
  const currentBoard = ALL_BOARDS.find(b => b.routeKey === currentRoute);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Render */}
      <View style={styles.mainContainer}>
        <CurrentScreenComponent onNavigate={handleNavigate} />
      </View>

      {/* Floating Navigator Button */}
      {!hideSwitcher && (
        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.8}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.floatingButtonText}>
            {currentRoute === 'Gallery' ? 'Boards Menu' : `Board: ${currentBoard?.num || '01'} ▾`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Navigation Modal */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SafeRoute Screen Switcher</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.galleryBtn, currentRoute === 'Gallery' && styles.activeBtn]}
              onPress={() => {
                setCurrentRoute('Gallery');
                setMenuVisible(false);
              }}
            >
              <Text style={styles.galleryBtnText}>★ All 24 Boards Gallery View</Text>
            </TouchableOpacity>

            <ScrollView style={styles.boardsList}>
              {ALL_BOARDS.map((board) => {
                const isActive = currentRoute === board.routeKey;
                return (
                  <TouchableOpacity
                    key={board.id}
                    style={[styles.boardRow, isActive && styles.activeRow]}
                    onPress={() => {
                      setCurrentRoute(board.routeKey);
                      setMenuVisible(false);
                    }}
                  >
                    <Text style={[styles.boardNumText, isActive && styles.activeNumText]}>
                      #{board.num}
                    </Text>
                    <View style={styles.boardTextCol}>
                      <Text style={[styles.boardTitleText, isActive && styles.activeTitleText]}>
                        {board.title}
                      </Text>
                      <Text style={styles.boardDimText}>
                        {board.width} × {board.height}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F1B2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.bold,
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0F1B2D',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    includeFontPadding: false,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    includeFontPadding: false,
  },
  closeBtn: {
    color: '#94A3B8',
    fontSize: 20,
    padding: 4,
  },
  galleryBtn: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    includeFontPadding: false,
  },
  activeBtn: {
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  boardsList: {
    maxHeight: 460,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  activeRow: {
    backgroundColor: '#334155',
  },
  boardNumText: {
    color: '#38BDF8',
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    width: 30,
    includeFontPadding: false,
  },
  activeNumText: {
    color: '#60A5FA',
  },
  boardTextCol: {
    flex: 1,
  },
  boardTitleText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    includeFontPadding: false,
  },
  activeTitleText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bold,
  },
  boardDimText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false,
  },
});
