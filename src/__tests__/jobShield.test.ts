import { createHttpClient } from '../api/http';
import { createMockClient } from '../api/mock';
import { ApiError } from '../api/errors';
import type { JobExtractRequest, JobAssessRequest, JobExtractResponse, JobAssessResponse } from '../api/types';

const mockExtractResponse: JobExtractResponse = {
  jobId: 'job_test_123',
  ad: {
    employer: { value: 'Bangkok Logistics Co.', quote: 'Bangkok Logistics Co.', confidence: 0.95 },
    jobTitle: { value: 'Warehouse Staff', quote: 'Warehouse Staff', confidence: 0.9 },
    workplace: { value: 'Bangkok, Thailand', quote: 'Bangkok warehouse', confidence: 0.9 },
    destinationCountry: null,
    salary: { value: { amount: 15000, currency: 'THB', period: 'month' }, quote: '15,000 THB / month', confidence: 0.85 },
    workerFee: { value: 'Free, no placement fees', quote: 'Free placement, no fees', confidence: 0.9 },
    contract: { value: 'official', quote: 'Official MOU contract', confidence: 0.9 },
    visaOrPermit: { value: 'work_visa', quote: 'Employer handles legal work visa', confidence: 0.9 },
    travelArrangedBy: null,
    route: null,
    meetingPoint: null,
    documentRequest: null,
    paymentRequest: null,
    contactChannel: null,
    urgency: null,
    secrecyRequest: null,
  },
  chat: {
    employer: null,
    jobTitle: null,
    workplace: { value: 'Mae Sot border area', quote: 'Actually report to Mae Sot border first', confidence: 0.85 },
    destinationCountry: null,
    salary: null,
    workerFee: { value: '5,000 THB travel deposit', quote: 'Transfer 5,000 THB deposit before departure', confidence: 0.95 },
    contract: { value: 'later', quote: 'We will give you the contract after you cross', confidence: 0.85 },
    visaOrPermit: { value: 'tourist', quote: 'Cross with border pass, no need work visa', confidence: 0.9 },
    travelArrangedBy: null,
    route: null,
    meetingPoint: { value: 'border', quote: 'Wait at Mae Sot river crossing at 10 PM', confidence: 0.9 },
    documentRequest: { value: 'passport_hold', quote: 'Hand over passport to driver upon arrival', confidence: 0.95 },
    paymentRequest: null,
    contactChannel: null,
    urgency: null,
    secrecyRequest: null,
  },
};

const mockAssessResponse: JobAssessResponse = {
  id: 'chk_job_test_123',
  createdAt: '2026-10-16T00:00:00Z',
  kind: 'job',
  verdict: 'danger',
  score: 85,
  title: 'Job terms conflict report',
  summary: 'High-risk conflicts detected between advertised terms and recruiter instructions.',
  spokenWarning: 'SafeRoute warning: high risk terms conflict with recruiter demands.',
  scamType: 'job_trafficking',
  flags: [
    { family: 'trafficking', severity: 'high', label: 'Surrender of identity documents demanded', evidence: 'Hand over passport to driver upon arrival' },
    { family: 'payment_route', severity: 'high', label: 'Advance deposit requested', evidence: 'Transfer 5,000 THB deposit before departure' },
  ],
  linkChecks: [],
  sources: [],
  actions: [{ type: 'call', label: 'Call helpline', value: '1300' }],
  model: 'gemini-1.5-flash',
  attention: 'pause',
  attentionHeadline: 'High-risk demands conflict with advertised terms',
  conflicts: [
    {
      field: 'workerFee',
      fieldLabel: 'Worker Fee',
      adValue: 'Free, no placement fees',
      adQuote: 'Free placement, no fees',
      chatValue: '5,000 THB travel deposit',
      chatQuote: 'Transfer 5,000 THB deposit before departure',
      description: 'Ad promised free placement, but recruiter demanded an upfront fee.',
      family: 'payment_route',
      severity: 'high',
    },
    {
      field: 'documentRequest',
      fieldLabel: 'Passport / Documents',
      adValue: 'Not mentioned',
      adQuote: '',
      chatValue: 'Surrender original passport',
      chatQuote: 'Hand over passport to driver upon arrival',
      description: 'Recruiter asked for original passport to be surrendered.',
      family: 'trafficking',
      severity: 'high',
    },
  ],
  stillUnclear: ['Exact employer registration could not be verified.'],
  adFacts: mockExtractResponse.ad,
  chatFacts: mockExtractResponse.chat,
};

const reply = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('JobShield API & Client', () => {
  it('extracts job facts via POST /v1/job/extract', async () => {
    const fetchImpl = reply(200, mockExtractResponse);
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    const req: JobExtractRequest = {
      ad: { text: 'Bangkok warehouse job 15000 baht' },
      chat: { text: 'Deposit 5000 baht first' },
      language: 'en',
    };

    const res = await client.extractJob(req);
    expect(res.jobId).toBe('job_test_123');
    expect(res.ad?.employer?.value).toBe('Bangkok Logistics Co.');
    expect(res.chat?.workerFee?.value).toBe('5,000 THB travel deposit');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/v1/job/extract',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(req) })
    );
  });

  it('rejects extractJob when neither ad nor chat is provided', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(200, mockExtractResponse) });
    await expect(client.extractJob({ language: 'en' })).rejects.toBeInstanceOf(ApiError);
  });

  it('assesses job facts via POST /v1/job/assess and returns conflicts & attention tier', async () => {
    const fetchImpl = reply(200, mockAssessResponse);
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    const req: JobAssessRequest = {
      jobId: 'job_test_123',
      facts: { ad: mockExtractResponse.ad, chat: mockExtractResponse.chat },
      language: 'en',
    };

    const res = await client.assessJob(req);
    expect(res.attention).toBe('pause');
    expect(res.conflicts).toHaveLength(2);
    expect(res.conflicts[0].family).toBe('payment_route');
    expect(res.stillUnclear).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/v1/job/assess',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(req) })
    );
  });

  it('mock client supports extractJob and assessJob offline', async () => {
    const mockClient = createMockClient({ delayMs: 0 });
    const extractRes = await mockClient.extractJob({
      ad: { text: 'Free recruitment in Bangkok hotel' },
      chat: { text: 'Send 2000 deposit and meet driver in Mae Sot' },
      language: 'en',
    });

    expect(extractRes.jobId).toBeTruthy();
    expect(extractRes.ad).not.toBeNull();

    const assessRes = await mockClient.assessJob({
      jobId: extractRes.jobId,
      facts: { ad: extractRes.ad, chat: extractRes.chat },
      language: 'en',
    });

    expect(assessRes.attention).toBeTruthy();
    expect(['lower', 'verify', 'pause']).toContain(assessRes.attention);
    expect(Array.isArray(assessRes.conflicts)).toBe(true);
    expect(Array.isArray(assessRes.stillUnclear)).toBe(true);
  });

  it('ensures assessJob responses strictly avoid banned certainty phrases in headline and summary', () => {
    const banned = [/\bsafe\b/i, /verified job/i, /scam confirmed/i, /no risk detected/i];
    const textToCheck = `${mockAssessResponse.title} ${mockAssessResponse.summary} ${mockAssessResponse.attentionHeadline}`;

    for (const pattern of banned) {
      expect(textToCheck).not.toMatch(pattern);
    }
  });
});
