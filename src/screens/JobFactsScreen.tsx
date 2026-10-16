import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Notice, SectionTitle } from '../components/ui';
import { HeaderWithLeave } from '../components/LeaveQuickly';
import { FactRow } from '../components/FactRow';
import { Icon } from '../components/Icon';
import { useLayout } from '../hooks/useLayout';
import type { JobFactKey } from '../api/types';
import {
  FIELD_DEFS,
  draftFromFacts,
  hasAnyFact,
  resetFact,
  setNotMentioned,
  setValue,
  toFacts,
  unclearCount,
  type SourceDraft,
} from '../lib/jobFacts';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

type Source = 'ad' | 'chat';
interface Editing {
  source: Source;
  key: JobFactKey;
}

export const JobFactsScreen: React.FC<RootScreenProps<'JobFacts'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['check', 'common']);
  const { extraction, extractRequest, source } = route.params;
  const layout = useLayout();
  const [drafts, setDrafts] = useState<Record<Source, SourceDraft | null>>(() => ({
    ad: extraction.ad ? draftFromFacts(extraction.ad) : null,
    chat: extraction.chat ? draftFromFacts(extraction.chat) : null,
  }));
  const [editing, setEditing] = useState<Editing | null>(null);

  const sources = (['ad', 'chat'] as Source[]).filter(s => drafts[s]);
  const flagged = sources.reduce((n, s) => n + unclearCount(drafts[s] as SourceDraft), 0);
  const nothing = useMemo(() => sources.every(s => !hasAnyFact(drafts[s] as SourceDraft)), [sources, drafts]);
  const twoPanes = layout.isExpanded && sources.length === 2;

  const update = (s: Source, change: (d: SourceDraft) => SourceDraft) => setDrafts(prev => ({ ...prev, [s]: change(prev[s] as SourceDraft) }));

  const submit = () => {
    navigation.navigate('Checking', {
      job: {
        phase: 'assess',
        request: {
          jobId: extraction.jobId,
          facts: { ad: drafts.ad ? toFacts(drafts.ad) : null, chat: drafts.chat ? toFacts(drafts.chat) : null },
          language: extractRequest.language,
          ...(extractRequest.context ? { context: extractRequest.context } : {}),
        },
      },
      source,
    });
  };

  const group = (s: Source) => {
    const draft = drafts[s] as SourceDraft;
    return (
      <View key={s} testID={`facts-${s}`} style={styles.group}>
        <SectionTitle>{t(s === 'ad' ? 'job.facts.adGroup' : 'job.facts.chatGroup')}</SectionTitle>
        <View style={styles.list}>
          {FIELD_DEFS.map((def, i) => (
            <React.Fragment key={def.key}>
              {i > 0 ? <View style={styles.rule} /> : null}
              <FactRow
                source={s}
                fieldKey={def.key}
                fact={draft[def.key]}
                editing={editing?.source === s && editing.key === def.key}
                onToggle={() => setEditing(cur => (cur?.source === s && cur.key === def.key ? null : { source: s, key: def.key }))}
                onValue={value => update(s, d => setValue(d, def.key, value))}
                onNotMentioned={on => update(s, d => setNotMentioned(d, def.key, on))}
                onReset={() => update(s, d => resetFact(d, def.key))}
              />
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Screen
      edges={['top']}
      wide={twoPanes}
      header={<HeaderWithLeave title={t('job.facts.title')} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} />}
      footer={
        <>
          <Text style={styles.hint}>{t('job.facts.submitHint')}</Text>
          <Button testID="facts-submit" label={t('job.facts.submit')} onPress={submit} />
        </>
      }
    >
      <Text style={styles.intro}>{t('job.facts.intro')}</Text>
      {flagged > 0 ? (
        <View testID="facts-unclear-note" style={styles.note} accessibilityRole="alert">
          <Icon name="alert" size={20} color={colors.amberDark} />
          <Text style={styles.noteText}>{t('job.facts.unclearNote')}</Text>
        </View>
      ) : null}
      {nothing ? <Notice tone="info" message={t('job.facts.empty')} testID="facts-empty" /> : null}
      {twoPanes ? <View style={styles.panes}>{sources.map(s => <View key={s} style={styles.pane}>{group(s)}</View>)}</View> : sources.map(group)}
    </Screen>
  );
};

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.amberLight },
  noteText: { flex: 1, minWidth: 0, color: colors.amberDark, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  group: { gap: 10 },
  list: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 4 },
  rule: { height: 1, marginHorizontal: 14, backgroundColor: colors.border },
  panes: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  pane: { flex: 1, flexBasis: 0, minWidth: 0 },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
});

export default JobFactsScreen;
