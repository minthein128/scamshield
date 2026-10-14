import type { Correlator } from './correlate.js';
import type { Extractor } from './extract.js';
import type { CheckRequest, Extraction, Kind, LinkCheck } from './types.js';
import { findUrls } from './urls.js';

type Canned = Omit<Extraction, 'urls'>;

const ENGLISH: Record<Kind, Canned> = {
  job: {
    flags: [
      { family: 'too_good', label: 'Pay far above normal', evidence: 'Salary USD 1800, no experience needed', severity: 'high' },
      {
        family: 'trafficking',
        label: 'Border route and passport',
        evidence: 'Send passport copy, car pickup at the border',
        severity: 'high',
      },
      { family: 'pressure', label: 'Urgent and secret', evidence: 'Leave this week, do not tell anyone', severity: 'medium' },
    ],
    scamType: 'job_trafficking',
    verdictDraft: 'danger',
    unsolicited: true,
    summary:
      'This offer shows strong signs of a trafficking recruitment scam. Do not travel or send your passport until it has been verified.',
    spokenWarning: 'Danger. This job offer looks like trafficking. Do not travel.',
  },
  message: {
    flags: [
      { family: 'pressure', label: 'Short deadline', evidence: 'Pay within 24 hours or the parcel is returned', severity: 'medium' },
      { family: 'link_risk', label: 'Odd link', evidence: 'Fee link on an unfamiliar domain', severity: 'medium' },
      { family: 'identity', label: 'Unknown sender', evidence: 'Courier name with no tracking number', severity: 'medium' },
    ],
    scamType: 'parcel_phishing',
    verdictDraft: 'careful',
    unsolicited: true,
    summary: 'This message looks like a fake parcel fee. Do not tap the link. Check the parcel in the official courier app.',
    spokenWarning: 'Be careful. This looks like a fake parcel message.',
  },
  link: {
    flags: [{ family: 'link_risk', label: 'Unfamiliar domain', evidence: 'Odd domain name', severity: 'medium' }],
    scamType: 'other',
    verdictDraft: 'careful',
    unsolicited: false,
    summary: 'This link is unfamiliar. Open the official site by typing its address yourself.',
    spokenWarning: 'Be careful with this link.',
  },
  shop: {
    flags: [
      { family: 'too_good', label: 'Price too low', evidence: '80% off brand-new phone', severity: 'high' },
      { family: 'payment_route', label: 'Pay outside the app', evidence: 'Transfer to my personal account', severity: 'high' },
    ],
    scamType: 'marketplace_fraud',
    verdictDraft: 'danger',
    unsolicited: false,
    summary: 'A very cheap price and a request to pay outside the app is a common fake seller trick. Pay only through the platform.',
    spokenWarning: 'Danger. Do not pay outside the app.',
  },
  agency: {
    flags: [
      { family: 'payment_route', label: 'Fee before placement', evidence: 'Deposit 5,000 THB to guarantee your job', severity: 'high' },
      { family: 'identity', label: 'No licence shown', evidence: 'No registration number given', severity: 'medium' },
    ],
    scamType: 'fake_agency',
    verdictDraft: 'careful',
    unsolicited: false,
    summary: 'This agency asks for money first and shows no licence. Check the agency with your national labour authority.',
    spokenWarning: 'Be careful. Check this agency is licensed.',
  },
  screen: {
    flags: [{ family: 'pressure', label: 'Pushy message', evidence: 'Reply now to claim your bonus', severity: 'low' }],
    scamType: 'other',
    verdictDraft: 'careful',
    unsolicited: true,
    summary: 'The screenshot has a pushy message. Do not reply until you have checked who sent it.',
    spokenWarning: 'Be careful. Check who sent this.',
  },
};

export function createMockExtractor(): Extractor {
  return {
    async extract(req: CheckRequest) {
      const base = ENGLISH[req.kind];
      const text = `${req.text ?? ''} ${req.url ?? ''}`.toLowerCase();
      const safe = /\b(hello|thanks|thank you|meeting|lunch)\b/.test(text) && !/https?:|\.com|passport|fee|deposit/.test(text);
      const urls = [...new Set([...(req.url ? [req.url] : []), ...findUrls(req.text ?? '')])].slice(0, 5);
      if (safe) {
        return {
          flags: [],
          scamType: 'none',
          verdictDraft: 'safe',
          unsolicited: false,
          summary: 'No warning signs found in this text. Stay alert if anyone asks for money or documents.',
          spokenWarning: 'No warning signs found.',
          urls,
        };
      }
      return { ...base, urls };
    },
  };
}

export function createMockCorrelator(): Correlator {
  return {
    async checkAll(urls) {
      return urls.map((url): LinkCheck => {
        const bad = /(scam|phish|malware|testsafebrowsing)/i.test(url);
        const young = /\.(xyz|top|vip|icu)\b/i.test(url);
        return {
          url,
          webRisk: bad ? 'social_engineering' : 'clean',
          domainAgeDays: young ? 12 : 2400,
          registrar: 'Mock Registrar',
        };
      });
    },
  };
}
