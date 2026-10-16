import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CheckResponse, LanguageCode } from '../api/types';
import { useLiveVoice, type LiveAction } from '../hooks/useLiveVoice';
import { useSheetLayout } from './useSheetLayout';
import theme from '../theme/theme';
import { Icon } from './Icon';
import { ShieldVoice } from './ShieldVoice';
import { Text } from './Text';
import { Button, LinkButton } from './ui';

const { colors, fonts } = theme;

interface Props {
  visible: boolean;
  result: CheckResponse;
  language: LanguageCode;
  home?: string;
  destination?: string;
  onClose: () => void;
  onAction: (screen: LiveAction) => void;
  onGetHelp: () => void;
}

export const LiveVoiceSheet: React.FC<Props> = ({ visible, result, language, home, destination, onClose, onAction, onGetHelp }) => {
  const { t } = useTranslation('live');
  const { height } = useWindowDimensions();
  const sheet = useSheetLayout();
  const [family, setFamily] = useState(false);
  const live = useLiveVoice({ result, language, mode: family ? 'family' : 'self', home, destination, onAction });
  const { start, reset } = live;

  useEffect(() => {
    if (visible) start();
    else reset();
  }, [visible, start, reset]);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const toggleFamily = (value: boolean) => {
    setFamily(value);
    live.changeMode(value ? 'family' : 'self');
  };

  const active = live.state === 'listening' || (live.state === 'speaking' && !live.warning);
  const animated = live.state === 'listening' || live.state === 'speaking';
  const over = live.state === 'ended' || live.state === 'error';
  const status = (() => {
    if (live.state === 'error') return t(`errors.${live.error ?? 'upstream'}`);
    if (live.state === 'ended') return t(`ended.${live.endedBy ?? 'server'}`);
    if (live.warning) return t('state.warning');
    if (live.state === 'connecting') return t('state.connecting');
    if (live.state === 'speaking') return t('state.speaking');
    return live.muted ? t('state.listeningMuted') : t('state.listening');
  })();
  const caption = live.caption || (live.state === 'connecting' || live.state === 'idle' || live.warning ? '' : t('placeholder'));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={[styles.overlay, { height }, sheet.overlay]}>
        <Pressable accessibilityLabel={t('close')} style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, sheet.sheet]} testID="live-sheet" {...({ dataSet: { state: live.state } } as object)}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>{t('title')}</Text>
            {active ? (
              <Text testID="live-countdown" accessibilityLabel={t('a11yCountdown', { seconds: live.remainingSec })} style={styles.countdown}>
                {t('countdown', { seconds: live.remainingSec })}
              </Text>
            ) : null}
          </View>

          <View style={styles.mascot}>
            <ShieldVoice verdict={result.verdict} active={animated} outputLevel={live.outputLevel} inputLevel={live.inputLevel} />
          </View>

          <Text testID="live-status" accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
          <View style={styles.captionBox}>
            <Text testID="live-caption" accessibilityLiveRegion="polite" style={styles.caption}>{caption}</Text>
            {live.userCaption && active && !live.warning ? <Text testID="live-heard" style={styles.heard}>{t('heard', { text: live.userCaption })}</Text> : null}
          </View>

          <View style={styles.familyRow}>
            <Text style={styles.familyLabel}>{t('family')}</Text>
            <Switch testID="live-family" accessibilityLabel={t('family')} value={family} onValueChange={toggleFamily} trackColor={{ true: colors.accent, false: colors.borderLight }} />
          </View>

          {over ? (
            <View style={{ gap: 10 }}>
              {live.state === 'error' && live.fallback ? null : <Button testID="live-retry" label={t('retry')} onPress={() => start()} />}
              <Button testID="live-close" label={t('close')} variant="secondary" onPress={close} />
            </View>
          ) : (
            <View style={styles.controls}>
              <TouchableOpacity
                testID="live-mute"
                accessibilityRole="button"
                accessibilityLabel={live.muted ? t('unmute') : t('mute')}
                accessibilityState={{ selected: live.muted }}
                activeOpacity={0.7}
                onPress={() => live.setMuted(!live.muted)}
                style={[styles.muteBtn, live.muted && styles.muteOn]}
              >
                <Icon name={live.muted ? 'micOff' : 'mic'} size={22} color={live.muted ? colors.white : colors.textPrimary} />
                <Text style={[styles.muteText, live.muted && { color: colors.white }]}>{live.muted ? t('unmute') : t('mute')}</Text>
              </TouchableOpacity>
              <Button testID="live-end" label={t('end')} variant="danger" onPress={live.end} style={{ flex: 1 }} />
            </View>
          )}

          <LinkButton testID="live-help" label={t('getHelp')} onPress={onGetHelp} />
          <Text testID="live-privacy" style={styles.privacy}>{t('privacy')}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.6)' },
  sheet: { backgroundColor: colors.background, padding: 20, gap: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxWidth: 430, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  countdown: { marginLeft: 8, color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  mascot: { alignItems: 'center', backgroundColor: colors.deepDarkBackground, borderRadius: 20, paddingVertical: 8 },
  status: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' },
  captionBox: { minHeight: 92, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 6, justifyContent: 'center' },
  caption: { color: colors.textPrimary, fontSize: 17, lineHeight: 26, fontFamily: fonts.medium },
  heard: { color: colors.textMuted, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  familyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  familyLabel: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: fonts.semiBold },
  controls: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  muteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, minHeight: 52, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight },
  muteOn: { backgroundColor: colors.darkBackground, borderColor: colors.darkBackground },
  muteText: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.semiBold },
  privacy: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, textAlign: 'center' },
});

export default LiveVoiceSheet;
