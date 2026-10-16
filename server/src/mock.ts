import type { Correlator } from './correlate.js';
import type { Extractor } from './extract.js';
import type { Grounder } from './ground.js';
import { redactDeterministic } from './intel/redact.js';
import type { CheckRequest, Extraction, Kind, LinkCheck } from './types.js';
import { findUrls } from './urls.js';

type Canned = Omit<Extraction, 'urls' | 'entities'> & { entities?: Extraction['entities'] };

const ENGLISH: Record<Kind, Canned> = {
  job: {
    flags: [
      { family: 'too_good', label: 'Pay looks far above normal', evidence: 'Salary USD 1800, no experience needed', severity: 'high' },
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
    entities: {
      companies: ['Golden Star Recruitment Co.'],
      phones: [],
      domains: [],
      role: 'customer service',
      country: 'Thailand',
      salaryClaim: 'USD 1800 per month',
    },
    summary:
      'This offer shows several warning signs of trafficking recruitment. Please do not travel or send your passport until it has been verified.',
    spokenWarning:
      'This offer shows several warning signs of trafficking. Please do not pay or send your passport, and check with someone you trust.',
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
    summary:
      'This message looks like it could be a fake parcel fee. Please do not tap the link, and check the parcel in the official courier app.',
    spokenWarning: 'This message shows signs of a parcel scam. Please check the parcel in the official courier app.',
  },
  link: {
    flags: [{ family: 'link_risk', label: 'Unfamiliar domain', evidence: 'Odd domain name', severity: 'medium' }],
    scamType: 'other',
    verdictDraft: 'careful',
    unsolicited: false,
    summary: 'We could not verify this link. Please open the official site by typing its address yourself.',
    spokenWarning: 'We could not verify this link. Please be careful.',
  },
  shop: {
    flags: [
      { family: 'too_good', label: 'Price too low', evidence: '80% off brand-new phone', severity: 'high' },
      { family: 'payment_route', label: 'Pay outside the app', evidence: 'Transfer to my personal account', severity: 'high' },
    ],
    scamType: 'marketplace_fraud',
    verdictDraft: 'danger',
    unsolicited: false,
    summary:
      'A very low price and a request to pay outside the app match a common pattern of fake sellers. Please pay only through the platform.',
    spokenWarning: 'This listing shows several warning signs. Please do not pay outside the app.',
  },
  agency: {
    flags: [
      { family: 'payment_route', label: 'Fee before placement', evidence: 'Deposit 5,000 THB to guarantee your job', severity: 'high' },
      { family: 'identity', label: 'No licence shown', evidence: 'No registration number given', severity: 'medium' },
    ],
    scamType: 'fake_agency',
    verdictDraft: 'careful',
    unsolicited: false,
    entities: { companies: ['Sunrise Overseas Agency'], phones: [], domains: [] },
    summary: 'This agency asks for money first and shows no licence in the text. Please check it with your national labour authority.',
    spokenWarning: 'We could not verify this agency. Please check its licence first.',
  },
  screen: {
    flags: [{ family: 'pressure', label: 'Pushy message', evidence: 'Reply now to claim your bonus', severity: 'low' }],
    scamType: 'other',
    verdictDraft: 'careful',
    unsolicited: true,
    summary: 'The screenshot has a pushy message that shows some warning signs. Please check who sent it before you reply.',
    spokenWarning: 'This message shows some warning signs. Please check who sent it.',
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
          entities: { companies: [], phones: [], domains: [] },
          summary: 'We found no major warning signs in this text. Stay alert if anyone asks for money or documents.',
          spokenWarning: 'We found no major warning signs.',
          urls,
        };
      }
      const phones = (req.text ?? '').match(/(?:\+|\b0)\d[\d\s().-]{7,}\d/g) ?? [];
      const handles = (req.text ?? '').match(/(?<![\w@])@[A-Za-z0-9_]{3,32}/g) ?? [];
      const template = req.text ? redactDeterministic(req.text).text.slice(0, 280) : undefined;
      return {
        ...base,
        entities: base.entities ?? { companies: [], phones: [], domains: [] },
        urls,
        ...(template ? { template, templateSafe: true } : {}),
        sender: { phones: phones.map((p) => p.trim()), handles, accounts: [] },
      };
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

export function createMockGrounder(): Grounder {
  return {
    async ground(_req, extraction) {
      const name = extraction.entities.companies[0];
      if (!name) return { flags: [], sources: [] };
      return {
        flags: [
          {
            family: 'identity',
            label: `We could not find a licence record for ${name}`,
            evidence: 'No match in our search of labour authority licence lists',
            severity: 'medium',
          },
        ],
        sources: [
          { title: 'Mock source: licensed agency registry', url: 'https://example.org/agency-registry' },
          { title: 'Mock source: advisory', url: 'https://example.org/advisory' },
        ],
      };
    },
  };
}
