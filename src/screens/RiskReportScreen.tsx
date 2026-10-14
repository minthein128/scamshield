import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../theme/theme';

interface RiskReportScreenProps {
  onNavigate?: (route: string) => void;
}

export const RiskReportScreen: React.FC<RiskReportScreenProps> = ({ onNavigate }) => {
  const [lang, setLang] = useState<'en' | 'id' | 'tl'>('en');

  const summaries = {
    en: 'This offer shows strong signs of a trafficking recruitment scam. Do not travel or send your passport until it has been verified.',
    id: 'Tawaran ini menunjukkan tanda-tanda kuat penipuan perekrutan perdagangan orang. Jangan berangkat atau mengirim paspor Anda sebelum tawaran ini diverifikasi.',
    tl: 'May malakas na palatandaan ang alok na ito ng panloloko para sa human trafficking. Huwag bumiyahe o ipadala ang iyong pasaporte hangga\'t hindi ito napapatunayan.',
  };

  const langOptions = [
    { id: 'en' as const, label: 'English' },
    { id: 'id' as const, label: 'Bahasa' },
    { id: 'tl' as const, label: 'Tagalog' },
  ];

  const reasons = [
    { text: 'Pay is far above normal for this job', source: 'Ad text' },
    { text: 'No work visa or permit mentioned', source: 'Ad text' },
    { text: 'Recruiter account is new and anonymous', source: 'Profile' },
    { text: 'No trace of this company online', source: 'Google Search' },
    { text: 'Car pickup route heads toward the border', source: 'Travel plan' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onNavigate?.('JobCheck.dc.html')}
            style={styles.backButton}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Risk report</Text>
        </View>

        {/* High Risk Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <Path d="M12 9v4" />
              <Path d="M12 17h.01" />
            </Svg>
            <View style={{ flexDirection: 'column' }}>
              <Text style={styles.bannerTitle}>High risk</Text>
              <Text style={styles.bannerSubtitle}>Likely trafficking recruitment</Text>
            </View>
          </View>
          {/* 4 segment indicator */}
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorSegWhite} />
            <View style={styles.indicatorSegWhite} />
            <View style={styles.indicatorSegWhite} />
            <View style={styles.indicatorSegOrange} />
          </View>
        </View>

        {/* Language switch */}
        <View style={styles.langRow}>
          {langOptions.map(item => {
            const isSelected = lang === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => setLang(item.id)}
                style={isSelected ? styles.langBtnSelected : styles.langBtnUnselected}
              >
                <Text style={isSelected ? styles.langTextSelected : styles.langTextUnselected}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summaries[lang]}</Text>
        </View>

        {/* Why we flagged this */}
        <View style={styles.flaggedSection}>
          <Text style={styles.flaggedHeader}>Why we flagged this</Text>
          {reasons.map((r, i) => (
            <View key={i} style={styles.reasonCard}>
              <Text style={styles.reasonText}>{r.text}</Text>
              <View style={styles.reasonBadge}>
                <Text style={styles.reasonBadgeText}>{r.source}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate?.('Family.dc.html')}
          style={styles.shareBtn}
        >
          <Text style={styles.shareBtnText}>Share with my family circle</Text>
        </TouchableOpacity>
        <View style={styles.footerRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('report')} style={styles.footerSubBtn}>
            <Text style={styles.footerSubBtnText}>Report this ad</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate?.('hotline')} style={styles.footerSubBtn}>
            <Text style={styles.footerSubBtnText}>Call [HOTLINE]</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 390,
    height: 844,
    backgroundColor: '#F4F6F8',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    gap: 14,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: theme.fonts.bold,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
  banner: {
    backgroundColor: '#C2410C',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'column',
    gap: 10,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: theme.fonts.bold,
    letterSpacing: -0.3,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
    color: '#FFEDD5',
    includeFontPadding: false,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  indicatorSegWhite: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  indicatorSegOrange: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDBA8C',
  },
  langRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtnSelected: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0F1B2D',
    backgroundColor: '#0F1B2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langTextSelected: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  langBtnUnselected: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langTextUnselected: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 16,
    padding: 14,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: theme.fonts.medium,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
  flaggedSection: {
    flexDirection: 'column',
    gap: 8,
  },
  flaggedHeader: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fonts.bold,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.semiBold,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
  reasonBadge: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  reasonBadgeText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    color: '#334155',
    includeFontPadding: false,
  },
  footer: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'column',
    gap: 8,
    backgroundColor: '#F4F6F8',
  },
  shareBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footerSubBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSubBtnText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.semiBold,
    color: '#0F1B2D',
    includeFontPadding: false,
  },
});

export default RiskReportScreen;
