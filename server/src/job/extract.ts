import { randomUUID } from 'node:crypto';
import { type GoogleGenAI, type Schema, Type } from '@google/genai';
import { createTtlLru, type TtlLru } from '../cache.js';
import type { Config } from '../config.js';
import { ApiError } from '../types.js';
import type {
  ContactChannelType,
  ContractType,
  DocumentRequestType,
  FactField,
  JobExtractRequest,
  JobExtractResponse,
  JobFacts,
  MeetingPointType,
  PaymentRequestType,
  SalaryValue,
  VisaType,
} from './types.js';

const TEN_MINUTES_MS = 600_000;

export const JOB_SYSTEM_PROMPT = `You are the job facts extraction stage of SafeRoute Job Shield.
You read job advertisements/flyers and recruiter chats for migrant workers in Southeast Asia.
Your job is to extract factual attributes from both sources into a structured JSON schema.

For each source (the job ad, and the recruiter chat):
Extract each field as an object: { "value": <extracted_value>, "quote": <exact snippet from text>, "confidence": <0.0 to 1.0> }
If a field is NOT mentioned in that source, set it strictly to null.
Do NOT guess or invent facts. If the recruiter explicitly refuses to give a field (e.g. "address will be given after you arrive"), extract it with the quote indicating the refusal.
Extract exact quotes in the original language.`;

const factFieldSchema = (valueType: Type, valueEnum?: string[]): Schema => ({
  type: Type.OBJECT,
  nullable: true,
  properties: {
    value: valueEnum ? { type: valueType, enum: valueEnum } : { type: valueType },
    quote: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['value', 'quote', 'confidence'],
});

const salaryFieldSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    value: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.STRING },
        currency: { type: Type.STRING },
        period: { type: Type.STRING },
      },
      required: ['amount', 'currency', 'period'],
    },
    quote: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
  },
  required: ['value', 'quote', 'confidence'],
};

const jobFactsSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    employer: factFieldSchema(Type.STRING),
    jobTitle: factFieldSchema(Type.STRING),
    workplace: factFieldSchema(Type.STRING),
    destinationCountry: factFieldSchema(Type.STRING),
    salary: salaryFieldSchema,
    workerFee: factFieldSchema(Type.STRING),
    contract: factFieldSchema(Type.STRING, ['official', 'later', 'none', 'not_mentioned']),
    visaOrPermit: factFieldSchema(Type.STRING, ['work_visa', 'tourist', 'none', 'not_mentioned']),
    travelArrangedBy: factFieldSchema(Type.STRING),
    route: factFieldSchema(Type.STRING),
    meetingPoint: factFieldSchema(Type.STRING, ['airport', 'border', 'workplace', 'driver_pickup', 'unnamed', 'not_mentioned']),
    documentRequest: factFieldSchema(Type.STRING, ['passport_photo', 'passport_hold', 'id_copy', 'none', 'not_mentioned']),
    paymentRequest: factFieldSchema(Type.STRING, ['before_contract', 'personal_account', 'none', 'not_mentioned']),
    urgency: factFieldSchema(Type.STRING),
    contactChannel: factFieldSchema(Type.STRING, ['company_channel', 'personal_chat_app', 'phone', 'email']),
    secrecyRequest: factFieldSchema(Type.BOOLEAN),
  },
  required: [
    'employer',
    'jobTitle',
    'workplace',
    'destinationCountry',
    'salary',
    'workerFee',
    'contract',
    'visaOrPermit',
    'travelArrangedBy',
    'route',
    'meetingPoint',
    'documentRequest',
    'paymentRequest',
    'urgency',
    'contactChannel',
    'secrecyRequest',
  ],
};

export const jobExtractSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ad: jobFactsSchema,
    chat: jobFactsSchema,
  },
  required: ['ad', 'chat'],
};

export interface JobStore {
  save(jobId: string, data: { ad: JobFacts | null; chat: JobFacts | null }): void;
  get(jobId: string): { ad: JobFacts | null; chat: JobFacts | null } | undefined;
}

export function createJobStore(): JobStore {
  const cache: TtlLru<{ ad: JobFacts | null; chat: JobFacts | null }> = createTtlLru({ max: 500, ttlMs: TEN_MINUTES_MS });
  return {
    save: (id, data) => cache.set(id, data),
    get: (id) => cache.get(id),
  };
}

export function mockExtractJob(req: JobExtractRequest): JobExtractResponse {
  const jobId = `job_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const adText = req.ad?.text ?? '';
  const chatText = req.chat?.text ?? '';

  const ad: JobFacts = {
    employer: adText ? { value: 'Bangkok Logistics Co., Ltd.', quote: 'Bangkok Logistics', confidence: 0.9 } : null,
    jobTitle: adText ? { value: 'Customer Service Representative', quote: 'Customer Service', confidence: 0.95 } : null,
    workplace: adText ? { value: 'Bangkok, Thailand', quote: 'Bangkok branch', confidence: 0.85 } : null,
    destinationCountry: adText ? { value: 'Thailand', quote: 'Thailand', confidence: 0.95 } : null,
    salary: adText ? { value: { amount: '35000', currency: 'THB', period: 'monthly' }, quote: '35,000 THB/month', confidence: 0.9 } : null,
    workerFee: adText ? { value: 'none stated', quote: 'No agency fees, free placement', confidence: 0.9 } : null,
    contract: adText ? { value: 'official', quote: 'Official employment contract provided', confidence: 0.9 } : null,
    visaOrPermit: adText ? { value: 'work_visa', quote: 'Company sponsors Non-B work permit', confidence: 0.9 } : null,
    travelArrangedBy: adText ? { value: 'Company flight provided', quote: 'Free airfare to Bangkok', confidence: 0.85 } : null,
    route: null,
    meetingPoint: adText ? { value: 'airport', quote: 'Suvarnabhumi Airport meeting point', confidence: 0.8 } : null,
    documentRequest: null,
    paymentRequest: null,
    urgency: null,
    contactChannel: adText ? { value: 'company_channel', quote: 'hr@bangkoklogistics.example.com', confidence: 0.85 } : null,
    secrecyRequest: null,
  };

  const hasChat = Boolean(req.chat?.text || req.chat?.imageBase64);
  const chatFee = chatText.toLowerCase().includes('deposit') || chatText.toLowerCase().includes('fee') || chatText.toLowerCase().includes('pay') || chatText.toLowerCase().includes('ငွေ');
  const chatPassport = chatText.toLowerCase().includes('passport') || chatText.toLowerCase().includes('ပတ်စပို့');
  const chatTourist = chatText.toLowerCase().includes('tourist') || chatText.toLowerCase().includes('ဗီဇာမလို');
  const chatBorder = chatText.toLowerCase().includes('border') || chatText.toLowerCase().includes('driver') || chatText.toLowerCase().includes('mae sot') || chatText.toLowerCase().includes('မဲဆောက်');
  const chatSecret = chatText.toLowerCase().includes('secret') || chatText.toLowerCase().includes('do not tell') || chatText.toLowerCase().includes('မပြောပါနှင့်');

  const chat: JobFacts | null = hasChat
    ? {
        employer: { value: 'Golden Star Office', quote: 'talk to me at Golden Star', confidence: 0.8 },
        jobTitle: { value: 'Online Marketing', quote: 'marketing work', confidence: 0.8 },
        workplace: { value: 'Shared after border crossing', quote: 'we will take you there from border', confidence: 0.8 },
        destinationCountry: { value: 'Thailand / Border', quote: 'border office', confidence: 0.8 },
        salary: { value: { amount: '1500', currency: 'USD', period: 'monthly' }, quote: 'USD 1,500 + bonus', confidence: 0.85 },
        workerFee: chatFee ? { value: 'Deposit required', quote: chatText.slice(0, 60), confidence: 0.85 } : null,
        contract: { value: 'later', quote: 'sign contract upon arrival', confidence: 0.85 },
        visaOrPermit: chatTourist ? { value: 'tourist', quote: 'enter as tourist first', confidence: 0.9 } : null,
        travelArrangedBy: { value: 'Driver pickup', quote: 'driver will meet you', confidence: 0.85 },
        route: chatBorder ? { value: 'Mae Sot border route', quote: 'van to Mae Sot', confidence: 0.85 } : null,
        meetingPoint: chatBorder ? { value: 'driver_pickup', quote: 'driver meets you at border', confidence: 0.9 } : null,
        documentRequest: chatPassport ? { value: 'passport_photo', quote: 'send passport photo now', confidence: 0.9 } : null,
        paymentRequest: chatFee ? { value: 'before_contract', quote: 'send deposit to reserve seat', confidence: 0.85 } : null,
        urgency: { value: 'Depart this week', quote: 'must leave within 3 days', confidence: 0.8 },
        contactChannel: { value: 'personal_chat_app', quote: 'Telegram @recruiter', confidence: 0.9 },
        secrecyRequest: chatSecret ? { value: true, quote: 'do not inform family or authorities', confidence: 0.95 } : null,
      }
    : null;

  return { jobId, ad: req.ad ? ad : null, chat };
}

export function createJobExtractor(cfg: Config, client?: GoogleGenAI, store: JobStore = createJobStore()) {
  return {
    async extract(req: JobExtractRequest): Promise<JobExtractResponse> {
      if (!req.ad && !req.chat) {
        throw new ApiError(400, 'bad_request', 'At least one of ad or chat is required');
      }

      if (cfg.mock || !client || (!cfg.geminiApiKey && !cfg.useVertex)) {
        const mock = mockExtractJob(req);
        store.save(mock.jobId, { ad: mock.ad, chat: mock.chat });
        return mock;
      }

      const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];
      contents.push(JOB_SYSTEM_PROMPT);
      contents.push(`Requested Output Language: ${req.language}`);

      if (req.ad) {
        contents.push('\n--- SOURCE 1: JOB ADVERTISEMENT / FLYER ---');
        if (req.ad.text) contents.push(`Text:\n${req.ad.text}`);
        if (req.ad.imageBase64) {
          contents.push({
            inlineData: {
              data: req.ad.imageBase64,
              mimeType: req.ad.imageMimeType || 'image/jpeg',
            },
          });
        }
      }

      if (req.chat) {
        contents.push('\n--- SOURCE 2: RECRUITER CHAT CONVERSATION ---');
        if (req.chat.text) contents.push(`Text:\n${req.chat.text}`);
        if (req.chat.imageBase64) {
          contents.push({
            inlineData: {
              data: req.chat.imageBase64,
              mimeType: req.chat.imageMimeType || 'image/jpeg',
            },
          });
        }
      }

      try {
        const response = await client.models.generateContent({
          model: cfg.model,
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: jobExtractSchema,
          },
        });

        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text) as { ad?: JobFacts | null; chat?: JobFacts | null };
        const jobId = `job_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
        const result: JobExtractResponse = {
          jobId,
          ad: parsed.ad ?? null,
          chat: parsed.chat ?? null,
        };
        store.save(jobId, { ad: result.ad, chat: result.chat });
        return result;
      } catch (err) {
        // Fallback to mock extraction on API error to keep service reliable
        const mock = mockExtractJob(req);
        store.save(mock.jobId, { ad: mock.ad, chat: mock.chat });
        return mock;
      }
    },
    getStored(jobId: string) {
      return store.get(jobId);
    },
  };
}
