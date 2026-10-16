import type { Lang } from './types.js';

/** The app name per language. Burmese text and speech use ကာကွယ်; every other language uses Kakwe. */
export const APP_NAMES: Record<Lang, string> = { en: 'Kakwe', id: 'Kakwe', tl: 'Kakwe', th: 'Kakwe', my: 'ကာကွယ်' };

export const appNameFor = (lang: Lang): string => APP_NAMES[lang];
