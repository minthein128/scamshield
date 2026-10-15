import { t } from '../i18n';
import type { CheckKind, CheckRequest, CheckResponse, FeedbackRequest, LanguageCode, ScamType } from '../api/types';

export const FEEDBACK_WINDOW_MS = 7 * 86_400_000;

export type ChoosableScam = Exclude<ScamType, 'none'>;

const choice = (type: ChoosableScam): { type: ChoosableScam; label: string } => ({
  type,
  get label() {
    return t(`feedback:choices.${type}`);
  },
});

export const SCAM_CHOICES = (
  ['job_trafficking', 'romance_pig_butchering', 'parcel_phishing', 'fake_agency', 'marketplace_fraud', 'investment', 'other'] as const
).map(choice);

/** The server accepts feedback for 7 days after a check. */
export function canGiveFeedback(result: Pick<CheckResponse, 'id' | 'createdAt'>, now: number = Date.now()): boolean {
  const made = Date.parse(result.createdAt);
  return result.id.startsWith('chk_') && (Number.isNaN(made) || now - made < FEEDBACK_WINDOW_MS);
}

export type FeedbackAnswer =
  | { kind: 'right' }
  | { kind: 'safe' }
  | { kind: 'scam'; scamType?: ChoosableScam }
  | { kind: 'different'; scamType: ChoosableScam };

export function buildFeedback(result: Pick<CheckResponse, 'id'>, answer: FeedbackAnswer): FeedbackRequest {
  switch (answer.kind) {
    case 'right':
      return { checkId: result.id, correct: true };
    case 'safe':
      return { checkId: result.id, correct: false, actualVerdict: 'safe' };
    case 'scam':
      return { checkId: result.id, correct: false, actualVerdict: 'danger', ...(answer.scamType ? { actualScamType: answer.scamType } : {}) };
    case 'different':
      return { checkId: result.id, correct: false, actualVerdict: 'danger', actualScamType: answer.scamType };
  }
}

const answered = new Set<string>();
export const markAnswered = (id: string) => void answered.add(id);
export const wasAnswered = (id: string) => answered.has(id);

export interface ReportForm {
  text: string;
  scamType: ChoosableScam | null;
  lostMoney: boolean | null;
  imageBase64?: string;
  imageMimeType?: string;
  language: LanguageCode;
  home?: string;
  destination?: string;
}

const KIND_BY_SCAM: Record<ChoosableScam, CheckKind> = {
  job_trafficking: 'job',
  fake_agency: 'agency',
  marketplace_fraud: 'shop',
  romance_pig_butchering: 'message',
  parcel_phishing: 'message',
  investment: 'message',
  other: 'message',
};

export const reportReady = (f: Pick<ReportForm, 'text' | 'scamType' | 'imageBase64'>) =>
  Boolean(f.scamType && (f.text.trim() || f.imageBase64));

/** A report is a normal check request with the existing kinds, plus the report fields. */
export function buildReportRequest(form: ReportForm): CheckRequest | null {
  if (!form.scamType || !reportReady(form)) return null;
  const text = form.text.trim();
  const isLink = /^https?:\/\/\S+$/i.test(text);
  const home = form.home?.trim();
  const destination = form.destination?.trim();
  const context = { ...(destination ? { destination } : {}), ...(home ? { home } : {}) };
  return {
    kind: isLink ? 'link' : KIND_BY_SCAM[form.scamType],
    language: form.language,
    ...(text ? (isLink ? { url: text } : { text }) : {}),
    ...(form.imageBase64 ? { imageBase64: form.imageBase64, imageMimeType: form.imageMimeType ?? 'image/jpeg' } : {}),
    ...(Object.keys(context).length ? { context } : {}),
    reported: true,
    reportedType: form.scamType,
    ...(form.lostMoney === null ? {} : { lostMoney: form.lostMoney }),
  };
}
