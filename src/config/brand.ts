import { t } from '../i18n';

/** The app name in the UI language (Kakwe, or ကာကွယ် in Burmese). The one source is common:appName. */
export function appName(lng?: string): string {
  return lng ? (t('common:appName', { lng }) as string) : (t('common:appName') as string);
}
