import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Select } from './Select';
import { Text, TextInput } from './Text';
import { Button, Pill } from './ui';
import {
  FEE_MENTIONED,
  NO_FEE,
  SALARY_PERIODS,
  defOf,
  enumOptions,
  fieldLabel,
  isEmptyValue,
  isUnclear,
  periodLabel,
  valueLabel,
  type FactDraft,
  type FactValue,
} from '../lib/jobFacts';
import type { JobFactKey, SalaryValue } from '../api/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

interface Props {
  source: 'ad' | 'chat';
  fieldKey: JobFactKey;
  fact: FactDraft;
  editing: boolean;
  onToggle: () => void;
  onValue: (value: FactValue) => void;
  onNotMentioned: (on: boolean) => void;
  onReset: () => void;
}

const asSalary = (value: FactValue | null): SalaryValue => (value && typeof value === 'object' ? value : { amount: '', currency: '', period: 'monthly' });

const Editor: React.FC<Props> = ({ source, fieldKey, fact, onValue }) => {
  const { t } = useTranslation('check');
  const def = defOf(fieldKey);
  const id = `fact-${source}-${fieldKey}`;
  const label = fieldLabel(fieldKey);
  const current = fact.notMentioned ? null : fact.value;

  switch (def.kind) {
    case 'enum':
      return <Select testID={`${id}-select`} label={label} placeholder={t('job.notMentioned')} value={typeof current === 'string' ? current : ''} options={enumOptions(fieldKey)} onChange={onValue} />;
    case 'boolean':
      return (
        <Select
          testID={`${id}-select`}
          label={label}
          placeholder={t('job.notMentioned')}
          value={current === true ? 'yes' : current === false ? 'no' : ''}
          options={[
            { value: 'yes', label: t('job.values.secrecyRequest.yes') },
            { value: 'no', label: t('job.values.secrecyRequest.no') },
          ]}
          onChange={v => onValue(v === 'yes')}
        />
      );
    case 'fee': {
      const some = typeof current === 'string' && current !== NO_FEE;
      return (
        <View style={styles.editorGroup}>
          <Select
            testID={`${id}-select`}
            label={t('job.facts.feeChoice')}
            placeholder={t('job.notMentioned')}
            value={current === NO_FEE ? 'none' : some ? 'some' : ''}
            options={[
              { value: 'none', label: t('job.values.workerFee.none') },
              { value: 'some', label: t('job.values.workerFee.some') },
            ]}
            onChange={v => onValue(v === 'none' ? NO_FEE : typeof fact.original?.value === 'string' && fact.original.value !== NO_FEE ? fact.original.value : FEE_MENTIONED)}
          />
          {some ? (
            <View style={styles.editorGroup}>
              <Text style={styles.editorLabel}>{t('job.facts.feeAmount')}</Text>
              <TextInput testID={`${id}-input`} accessibilityLabel={t('job.facts.feeAmount')} value={current === FEE_MENTIONED ? '' : String(current)} onChangeText={v => onValue(v.trim() ? v : FEE_MENTIONED)} placeholder={t('job.facts.textPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} />
            </View>
          ) : null}
        </View>
      );
    }
    case 'salary': {
      const s = asSalary(current);
      return (
        <View style={styles.editorGroup}>
          <View style={styles.editorGroup}>
            <Text style={styles.editorLabel}>{t('job.facts.amount')}</Text>
            <TextInput testID={`${id}-amount`} accessibilityLabel={t('job.facts.amount')} value={String(s.amount)} onChangeText={amount => onValue({ ...s, amount })} keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textMuted} style={styles.input} />
          </View>
          <View style={styles.editorGroup}>
            <Text style={styles.editorLabel}>{t('job.facts.currency')}</Text>
            <TextInput testID={`${id}-currency`} accessibilityLabel={t('job.facts.currency')} value={s.currency} onChangeText={currency => onValue({ ...s, currency })} autoCapitalize="characters" autoCorrect={false} maxLength={6} placeholder={t('job.facts.currencyPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} />
          </View>
          <Select
            testID={`${id}-period`}
            label={t('job.facts.period')}
            value={s.period}
            options={SALARY_PERIODS.map(p => ({ value: p, label: periodLabel(p) }))}
            onChange={period => onValue({ ...s, period })}
          />
        </View>
      );
    }
    default:
      return (
        <View style={styles.editorGroup}>
          <Text style={styles.editorLabel}>{label}</Text>
          <TextInput testID={`${id}-input`} accessibilityLabel={label} value={typeof current === 'string' ? current : ''} onChangeText={onValue} placeholder={t('job.facts.textPlaceholder')} placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>
      );
  }
};

/** One extracted fact: its value, the quote it came from, and the controls to correct it. */
export const FactRow: React.FC<Props> = props => {
  const { source, fieldKey, fact, editing, onToggle, onNotMentioned, onReset } = props;
  const { t } = useTranslation('check');
  const id = `fact-${source}-${fieldKey}`;
  const unclear = isUnclear(fact);
  const def = defOf(fieldKey);
  const shown = fact.notMentioned || isEmptyValue(def, fact.value) ? null : fact.value;
  const refused = unclear && fact.original?.refused === true;
  const quote = fact.original?.quote?.trim();
  const label = fieldLabel(fieldKey);

  return (
    <View testID={id} style={[styles.row, unclear && styles.rowUnclear]}>
      <View style={styles.top}>
        <View style={styles.head}>
          <Text style={styles.label}>{label}</Text>
          <Text testID={`${id}-value`} style={[styles.value, shown === null && styles.valueEmpty]}>{valueLabel(fieldKey, shown)}</Text>
        </View>
        <TouchableOpacity
          testID={`${id}-edit`}
          accessibilityRole="button"
          accessibilityLabel={t('job.facts.editA11y', { field: label })}
          accessibilityState={{ expanded: editing }}
          activeOpacity={0.7}
          onPress={onToggle}
          style={styles.edit}
        >
          <Text style={styles.editText}>{editing ? t('job.facts.done') : shown === null && !fact.edited ? t('job.facts.add') : t('job.facts.edit')}</Text>
        </TouchableOpacity>
      </View>

      {unclear || fact.edited || fact.notMentioned ? (
        <View style={styles.pills}>
          {unclear ? (
            <View style={styles.flagPill}>
              <Icon name="alert" size={16} color={colors.amberDark} />
              <Text style={styles.flagPillText}>{refused ? t('job.facts.declined') : t('job.facts.pleaseCheck')}</Text>
            </View>
          ) : null}
          {fact.edited || fact.notMentioned ? <Pill label={t('job.facts.edited')} background={colors.codeBg} color={colors.codeText} /> : null}
        </View>
      ) : null}

      {quote ? (
        <View testID={`${id}-quote`} style={styles.quote}>
          <Text style={styles.quoteLabel}>{t('job.facts.quoteLabel')}</Text>
          <Text style={styles.quoteText}>{quote}</Text>
        </View>
      ) : fact.edited ? (
        <Text style={styles.noQuote}>{t('job.facts.noQuote')}</Text>
      ) : null}

      {editing ? (
        <View style={styles.editor}>
          <Editor {...props} />
          <View style={styles.actions}>
            {fact.notMentioned ? null : <Button testID={`${id}-none`} variant="secondary" label={t('job.facts.markNotMentioned')} onPress={() => onNotMentioned(true)} />}
            {fact.edited || fact.notMentioned ? <Button testID={`${id}-reset`} variant="secondary" label={t('job.facts.reset')} onPress={onReset} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12 },
  rowUnclear: { backgroundColor: colors.amberLight },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  head: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  value: { color: colors.textPrimary, fontSize: 16, lineHeight: 23, fontFamily: fonts.bold },
  valueEmpty: { color: colors.textMuted, fontFamily: fonts.medium },
  edit: { minHeight: 48, minWidth: 64, paddingHorizontal: 8, marginTop: -8, marginRight: -8, alignItems: 'flex-end', justifyContent: 'center' },
  editText: { color: colors.accent, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  flagPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.amberBadge, maxWidth: '100%' },
  flagPillText: { flexShrink: 1, color: colors.amberDark, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold },
  quote: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: colors.codeBg },
  quoteLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: fonts.semiBold },
  quoteText: { color: colors.codeText, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  noQuote: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  editor: { gap: 12, paddingTop: 4 },
  editorGroup: { gap: 6 },
  editorLabel: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.regular },
  actions: { gap: 8 },
});
