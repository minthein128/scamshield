import React from 'react';
import { useTranslation } from 'react-i18next';
import { InputBlock, OrDivider, ScreenshotPicker, TextBox } from './CheckBlocks';
import type { BlockIconName } from './blockIcons';
import type { PreparedImage } from '../lib/image';

interface Props {
  testID: string;
  icon: BlockIconName;
  title: string;
  hint: string;
  a11y: string;
  placeholder: string;
  pickHint: string;
  optional?: boolean;
  text: string;
  image: PreparedImage | null;
  busy: boolean;
  onText: (value: string) => void;
  onPaste: () => void;
  onPick: () => void;
  onRemove: () => void;
}

/** One input block of the Check page: pasted text or a screenshot of it. */
export const SourceBlock: React.FC<Props> = ({ testID, icon, title, hint, a11y, placeholder, pickHint, optional, text, image, busy, onText, onPaste, onPick, onRemove }) => {
  const { t } = useTranslation(['check', 'common']);
  return (
    <InputBlock testID={testID} icon={icon} title={title} hint={hint} chip={optional ? t('job.chat.optional') : undefined}>
      <TextBox testID={`${testID}-text`} a11y={a11y} placeholder={placeholder} value={text} onChange={onText} onPaste={onPaste} pasteLabel={t('common:actions.paste')} />
      <OrDivider label={t('or')} />
      <ScreenshotPicker
        testID={`${testID}-pick`}
        image={image}
        busy={busy}
        title={busy ? t('screenshot.preparing') : t('screenshot.pick')}
        sub={pickHint}
        readyText={t('screenshot.ready', { kb: Math.round((image?.bytes ?? 0) / 1024) })}
        changeLabel={t('screenshot.change')}
        removeLabel={t('common:actions.remove')}
        onPick={onPick}
        onRemove={onRemove}
      />
    </InputBlock>
  );
};
