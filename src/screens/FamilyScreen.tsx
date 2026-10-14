import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { Button, Card, Pill, ScreenHeader } from '../components/ui';
import { MOCK_FAMILY as F } from '../lib/mockFamily';
import { telUrl, VERDICT_STYLES } from '../lib/report';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const call = (phone: string) => Linking.openURL(telUrl(phone)).catch(() => undefined);

export const FamilyScreen: React.FC = () => {
  const risk = VERDICT_STYLES[F.trip.risk];
  return (
    <Screen
      footer={
        <>
          <Button testID="family-call" label={`Call ${F.traveller.name}`} onPress={() => call(F.traveller.phone)} />
          <View style={styles.row}>
            {F.contacts.map(c => (
              <Button key={c.label} label={c.label} variant="secondary" style={styles.flex} onPress={() => call(c.phone)} />
            ))}
          </View>
          <Text style={styles.footnote}>{`Nothing about this circle shows on ${F.traveller.name}'s phone.`}</Text>
        </>
      }
    >
      <View style={styles.headerRow}>
        <ScreenHeader title="Family circle" />
        <Text style={styles.viewer}>{`${F.viewer}'s phone`}</Text>
      </View>

      <View style={styles.alert}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </Svg>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.alertTitle}>{F.alert.title}</Text>
          <Text style={styles.alertBody}>{F.alert.body}</Text>
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>Trip details on file</Text>
        <Row label="Destination" value={F.trip.destination} />
        <Row label="Employer" value={F.trip.employer} />
        <Row label="Recruiter" value={F.trip.recruiter} />
        <View style={styles.rowBetween}>
          <Text style={styles.rowLabel}>Risk check</Text>
          <Pill label={risk.label} background={risk.background} color={risk.foreground} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Check-ins</Text>
        {F.checkIns.map(c => (
          <View key={c.label} style={styles.checkIn}>
            <View style={[styles.dot, { backgroundColor: c.ok ? colors.brandBlueLight : colors.danger }]}>
              <Text style={{ color: c.ok ? colors.safeText : colors.white, fontFamily: fonts.bold, fontSize: 13 }}>{c.ok ? '✓' : '!'}</Text>
            </View>
            <Text style={[styles.checkLabel, !c.ok && { color: colors.dangerDark }]}>{c.label}</Text>
            <Text style={styles.rowLabel}>{c.time}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.rowBetween}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewer: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.semiBold },
  alert: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.dangerSoftBg, borderWidth: 1, borderColor: colors.danger, borderRadius: 16, padding: 14 },
  alertTitle: { color: colors.dangerSoftText, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  alertBody: { color: colors.dangerDark, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
  cardTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontFamily: fonts.bold },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: fonts.regular },
  rowValue: { color: colors.textPrimary, fontSize: 13, lineHeight: 19, fontFamily: fonts.semiBold, flexShrink: 1, textAlign: 'right' },
  checkIn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1, height: 46 },
  footnote: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 16, fontFamily: fonts.regular },
});

export default FamilyScreen;
