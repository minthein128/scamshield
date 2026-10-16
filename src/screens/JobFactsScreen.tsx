import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text, TextInput } from '../components/Text';
import { Button, Card, Divider, LinkButton, Pill, ScreenHeader, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import { getApiClient } from '../api';
import type { FactField, JobFacts } from '../api/types';
import type { RootScreenProps } from '../navigation/types';
import { useLayout } from '../hooks/useLayout';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

interface FactItemProps {
  label: string;
  field: FactField<any> | null;
  onEdit: () => void;
  tablet?: boolean;
}

const FactItem: React.FC<FactItemProps> = ({ label, field, onEdit, tablet }) => {
  const { t } = useTranslation(['check', 'common']);
  const isUnclear = !field || field.confidence < 0.8;
  const displayVal = field?.value
    ? typeof field.value === 'object' && 'amount' in field.value
      ? `${field.value.amount} ${field.value.currency || ''} / ${field.value.period || ''}`
      : String(field.value)
    : t('jobFacts.notMentioned', 'Not mentioned');

  return (
    <View style={styles.factCard}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.factHeader}>
          <Text style={[styles.factLabel, readable(Boolean(tablet), 14, 20)]}>{label}</Text>
          {isUnclear ? (
            <Pill label={t('jobFacts.unclear', 'Unclear')} background={colors.amberLight} color={colors.amberDark} />
          ) : (
            <Pill label={t('jobFacts.extracted', 'Extracted')} background={colors.codeBg} color={colors.textSecondary} />
          )}
        </View>
        <Text style={[styles.factValue, !field && styles.factValueMuted, readable(Boolean(tablet), 15, 22)]}>{displayVal}</Text>
        {field?.quote ? (
          <Text numberOfLines={2} style={[styles.factQuote, readable(Boolean(tablet), 13, 18)]}>
            {`"${field.quote}"`}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity activeOpacity={0.7} onPress={onEdit} style={styles.editButton} accessibilityLabel={t('jobFacts.editA11y', { defaultValue: `Edit ${label}`, label })}>
        <Icon name="chevron" size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
};

export const JobFactsScreen: React.FC<RootScreenProps<'JobFacts'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['check', 'common', 'report']);
  const { jobId, language, context } = route.params;
  const [adFacts, setAdFacts] = useState<JobFacts | null>(route.params.ad);
  const [chatFacts, setChatFacts] = useState<JobFacts | null>(route.params.chat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingTarget, setEditingTarget] = useState<{ source: 'ad' | 'chat'; key: keyof JobFacts; label: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const layout = useLayout();
  const tablet = layout.isTablet;

  const leaveQuickly = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const openEdit = (source: 'ad' | 'chat', key: keyof JobFacts, label: string) => {
    const current = source === 'ad' ? adFacts?.[key] : chatFacts?.[key];
    const val = current?.value
      ? typeof current.value === 'object' && 'amount' in current.value
        ? String(current.value.amount)
        : String(current.value)
      : '';
    setEditingTarget({ source, key, label });
    setEditValue(val);
  };

  const saveEdit = (markNotMentioned = false) => {
    if (!editingTarget) return;
    const { source, key } = editingTarget;
    const updater = source === 'ad' ? setAdFacts : setChatFacts;

    updater((prev) => {
      if (!prev) return prev;
      if (markNotMentioned) {
        return { ...prev, [key]: null };
      }
      return {
        ...prev,
        [key]: {
          value: editValue.trim(),
          quote: editValue.trim() || 'User confirmed correction',
          confidence: 1.0,
        },
      };
    });

    setEditingTarget(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getApiClient().assessJob({
        jobId,
        facts: { ad: adFacts, chat: chatFacts },
        language,
        context,
      });
      navigation.navigate('Report', { result, language, fresh: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assess offer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <View style={styles.topBar}>
          <ScreenHeader title={t('jobFacts.title', 'Is this right?')} onBack={() => navigation.goBack()} />
          <LinkButton label={t('report:leaveQuickly', 'Leave quickly')} onPress={leaveQuickly} />
        </View>
      }
      footer={<Button testID="job-facts-submit" label={busy ? t('jobFacts.checking', 'Checking for conflicts...') : t('jobFacts.submit', 'Looks right, check it')} onPress={submit} disabled={busy} />}
    >
      <Card style={{ gap: 6, backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlue }}>
        <Text style={[styles.helpTitle, readable(tablet, 16, 22)]}>{t('jobFacts.reviewTitle', 'Review the extracted facts')}</Text>
        <Text style={[styles.helpBody, readable(tablet, 14, 20)]}>
          {t('jobFacts.reviewBody', 'SafeRoute extracted these facts from the ad and chat. Check if they are right, or tap any item to correct it.')}
        </Text>
      </Card>

      {error ? (
        <Card style={{ backgroundColor: colors.dangerSoftBg, borderColor: colors.danger }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.semiBold }}>{error}</Text>
        </Card>
      ) : null}

      {/* Source 1: The Job Ad */}
      <View style={styles.section}>
        <SectionTitle>{t('jobFacts.adSection', 'The Job Ad')}</SectionTitle>
        <Card style={{ gap: 8 }}>
          <FactItem tablet={tablet} label={t('jobFacts.fields.employer', 'Employer')} field={adFacts?.employer ?? null} onEdit={() => openEdit('ad', 'employer', t('jobFacts.fields.employer', 'Employer'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.jobTitle', 'Job Title')} field={adFacts?.jobTitle ?? null} onEdit={() => openEdit('ad', 'jobTitle', t('jobFacts.fields.jobTitle', 'Job Title'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.workplace', 'Workplace Address')} field={adFacts?.workplace ?? null} onEdit={() => openEdit('ad', 'workplace', t('jobFacts.fields.workplace', 'Workplace Address'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.salary', 'Salary')} field={adFacts?.salary ?? null} onEdit={() => openEdit('ad', 'salary', t('jobFacts.fields.salary', 'Salary'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.workerFee', 'Worker Fee')} field={adFacts?.workerFee ?? null} onEdit={() => openEdit('ad', 'workerFee', t('jobFacts.fields.workerFee', 'Worker Fee'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.contract', 'Contract')} field={adFacts?.contract ?? null} onEdit={() => openEdit('ad', 'contract', t('jobFacts.fields.contract', 'Contract'))} />
          <FactItem tablet={tablet} label={t('jobFacts.fields.visaOrPermit', 'Visa / Permit')} field={adFacts?.visaOrPermit ?? null} onEdit={() => openEdit('ad', 'visaOrPermit', t('jobFacts.fields.visaOrPermit', 'Visa / Permit'))} />
        </Card>
      </View>

      <Divider />

      {/* Source 2: Recruiter Chat */}
      <View style={styles.section}>
        <SectionTitle>{t('jobFacts.chatSection', 'What the recruiter asked')}</SectionTitle>
        {chatFacts ? (
          <Card style={{ gap: 8 }}>
            <FactItem tablet={tablet} label={t('jobFacts.fields.employer', 'Recruiter / Company')} field={chatFacts?.employer ?? null} onEdit={() => openEdit('chat', 'employer', t('jobFacts.fields.employer', 'Recruiter / Company'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.workplace', 'Workplace / Location')} field={chatFacts?.workplace ?? null} onEdit={() => openEdit('chat', 'workplace', t('jobFacts.fields.workplace', 'Workplace / Location'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.salary', 'Salary Offered')} field={chatFacts?.salary ?? null} onEdit={() => openEdit('chat', 'salary', t('jobFacts.fields.salary', 'Salary Offered'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.workerFee', 'Fee / Deposit Demanded')} field={chatFacts?.workerFee ?? null} onEdit={() => openEdit('chat', 'workerFee', t('jobFacts.fields.workerFee', 'Fee / Deposit Demanded'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.contract', 'Contract Timing')} field={chatFacts?.contract ?? null} onEdit={() => openEdit('chat', 'contract', t('jobFacts.fields.contract', 'Contract Timing'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.visaOrPermit', 'Visa Instruction')} field={chatFacts?.visaOrPermit ?? null} onEdit={() => openEdit('chat', 'visaOrPermit', t('jobFacts.fields.visaOrPermit', 'Visa Instruction'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.documentRequest', 'Passport / Documents')} field={chatFacts?.documentRequest ?? null} onEdit={() => openEdit('chat', 'documentRequest', t('jobFacts.fields.documentRequest', 'Passport / Documents'))} />
            <FactItem tablet={tablet} label={t('jobFacts.fields.meetingPoint', 'Meeting Point')} field={chatFacts?.meetingPoint ?? null} onEdit={() => openEdit('chat', 'meetingPoint', t('jobFacts.fields.meetingPoint', 'Meeting Point'))} />
          </Card>
        ) : (
          <Card style={{ gap: 8 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14 }}>
              {t('jobFacts.noChatProvided', 'No recruiter conversation was provided. SafeRoute will verify the ad claims alone.')}
            </Text>
          </Card>
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={Boolean(editingTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('jobFacts.editTitle', { defaultValue: `Edit ${editingTarget?.label ?? ''}`, label: editingTarget?.label ?? '' })}</Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={t('jobFacts.placeholder', 'Enter confirmed value')}
              style={[styles.input, { minHeight: 44, marginVertical: 12 }]}
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ gap: 8 }}>
              <Button label={t('jobFacts.saveCorrection', 'Save correction')} onPress={() => saveEdit(false)} />
              <Button label={t('jobFacts.markNotMentioned', 'Mark as Not Mentioned')} variant="secondary" onPress={() => saveEdit(true)} />
              <LinkButton label={t('common:actions.cancel', 'Cancel')} onPress={() => setEditingTarget(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

export default JobFactsScreen;

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: 8 },
  helpTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 15 },
  helpBody: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  factHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  factLabel: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 },
  factValue: { color: colors.textPrimary, fontFamily: fonts.semiBold, fontSize: 15 },
  factValueMuted: { color: colors.textMuted, fontStyle: 'italic' },
  factQuote: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  editButton: { padding: 8, marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 8 },
  modalTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
  },
});
