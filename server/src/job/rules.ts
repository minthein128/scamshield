import type { Flag } from '../types.js';
import type { AttentionTier, JobConflict, JobFacts } from './types.js';

const BORDER_TOWNS = [
  'mae sot',
  'maesot',
  'myawaddy',
  'tachileik',
  'poipet',
  'shwe kokko',
  'shwe kokko',
  'kk park',
  'laukkaing',
  'golden triangle',
  'မဲဆောက်',
  'မြဝတီ',
  'တာချီလိတ်',
  'แม่สอด',
  'เมียวดี',
  'ท่าขี้เหล็ก',
  'ปอยเปต',
];

export function isBorderLocation(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BORDER_TOWNS.some((town) => lower.includes(town));
}

export function detectConflicts(ad: JobFacts | null, chat: JobFacts | null): JobConflict[] {
  if (!ad || !chat) return [];
  const conflicts: JobConflict[] = [];

  // 1. Fee conflict (Ad: no fee vs Chat: fee/deposit)
  if (ad.workerFee && chat.workerFee) {
    const adFeeLower = ad.workerFee.value.toLowerCase();
    const chatFeeLower = chat.workerFee.value.toLowerCase();
    const adSaysNoFee =
      adFeeLower.includes('no fee') ||
      adFeeLower.includes('none') ||
      adFeeLower.includes('free') ||
      adFeeLower.includes('0') ||
      adFeeLower.includes('အခမဲ့') ||
      adFeeLower.includes('gratis') ||
      adFeeLower.includes('libre') ||
      adFeeLower.includes('ฟรี');
    const chatAsksFee =
      chatFeeLower.includes('deposit') ||
      chatFeeLower.includes('fee') ||
      chatFeeLower.includes('pay') ||
      chatFeeLower.includes('cost') ||
      /\d+/.test(chatFeeLower) ||
      chat.paymentRequest?.value === 'before_contract' ||
      chat.paymentRequest?.value === 'personal_account';

    if (adSaysNoFee && chatAsksFee) {
      conflicts.push({
        field: 'workerFee',
        fieldLabel: 'Worker Fee',
        adValue: ad.workerFee.value,
        adQuote: ad.workerFee.quote,
        chatValue: chat.workerFee.value,
        chatQuote: chat.workerFee.quote,
        description: 'The ad advertised no fee or free placement, but the recruiter asks for payment or a deposit.',
        family: 'payment_route',
        severity: 'high',
      });
    }
  }

  // 2. Documents conflict (Ad: normal or not mentioned vs Chat: passport photo now or passport held)
  if (ad.documentRequest && chat.documentRequest) {
    const adDoc = ad.documentRequest.value;
    const chatDoc = chat.documentRequest.value;
    const adNormal = adDoc === 'none' || adDoc === 'id_copy' || adDoc === 'not_mentioned';
    const chatDemanding = chatDoc === 'passport_photo' || chatDoc === 'passport_hold';

    if (adNormal && chatDemanding) {
      conflicts.push({
        field: 'documentRequest',
        fieldLabel: 'Identity Documents',
        adValue: ad.documentRequest.value,
        adQuote: ad.documentRequest.quote,
        chatValue: chat.documentRequest.value,
        chatQuote: chat.documentRequest.quote,
        description:
          chatDoc === 'passport_hold'
            ? 'The ad did not require surrender of documents, but the recruiter demands holding your physical passport.'
            : 'The ad had normal requirements, but the recruiter immediately demands a passport photo before formal screening.',
        family: 'trafficking',
        severity: 'high',
      });
    }
  }

  // 3. Contract conflict (Ad: official contract vs Chat: contract later or pay before contract)
  if (ad.contract && chat.contract) {
    const adContract = ad.contract.value;
    const chatContract = chat.contract.value;
    const adOfficial = adContract === 'official';
    const chatLaterOrNone = chatContract === 'later' || chatContract === 'none' || chat.paymentRequest?.value === 'before_contract';

    if (adOfficial && chatLaterOrNone) {
      conflicts.push({
        field: 'contract',
        fieldLabel: 'Employment Contract',
        adValue: ad.contract.value,
        adQuote: ad.contract.quote,
        chatValue: chat.contract.value,
        chatQuote: chat.contract.quote,
        description:
          'The ad promised an official employment contract, but the recruiter says it will be signed later or demands prior payment.',
        family: 'payment_route',
        severity: 'high',
      });
    }
  }

  // 4. Visa conflict (Ad: work visa vs Chat: tourist or none)
  if (ad.visaOrPermit && chat.visaOrPermit) {
    const adVisa = ad.visaOrPermit.value;
    const chatVisa = chat.visaOrPermit.value;
    const adWorkVisa = adVisa === 'work_visa';
    const chatTourist = chatVisa === 'tourist' || chatVisa === 'none';

    if (adWorkVisa && chatTourist) {
      conflicts.push({
        field: 'visaOrPermit',
        fieldLabel: 'Visa and Work Permit',
        adValue: ad.visaOrPermit.value,
        adQuote: ad.visaOrPermit.quote,
        chatValue: chat.visaOrPermit.value,
        chatQuote: chat.visaOrPermit.quote,
        description: 'The ad promised an official work visa, but the recruiter instructs entering on a tourist visa or without permits.',
        family: 'trafficking',
        severity: 'high',
      });
    }
  }

  // 5. Meeting point conflict (Ad: workplace address vs Chat: driver, border or unnamed place)
  if (ad.meetingPoint && chat.meetingPoint) {
    const adMeet = ad.meetingPoint.value;
    const chatMeet = chat.meetingPoint.value;
    const adFormal = adMeet === 'workplace' || adMeet === 'airport';
    const chatInformal = chatMeet === 'driver_pickup' || chatMeet === 'border' || chatMeet === 'unnamed';

    if (adFormal && chatInformal) {
      conflicts.push({
        field: 'meetingPoint',
        fieldLabel: 'Meeting Point',
        adValue: ad.meetingPoint.value,
        adQuote: ad.meetingPoint.quote,
        chatValue: chat.meetingPoint.value,
        chatQuote: chat.meetingPoint.quote,
        description:
          'The ad stated a formal office or workplace address, but the chat arranges an informal driver pickup or border crossing.',
        family: 'trafficking',
        severity: 'medium',
      });
    }
  }

  // 6. Employer conflict (Ad: named company vs Chat: different name or workplace address refused)
  if (ad.employer && chat.employer) {
    const adEmp = ad.employer.value.trim().toLowerCase();
    const chatEmp = chat.employer.value.trim().toLowerCase();
    const refused =
      chatEmp.includes('later') ||
      chatEmp.includes('refused') ||
      chatEmp.includes('confidential') ||
      (chat.workplace?.quote.toLowerCase().includes('later') ?? false);

    if (adEmp && chatEmp && (adEmp !== chatEmp || refused)) {
      conflicts.push({
        field: 'employer',
        fieldLabel: 'Employer Identity',
        adValue: ad.employer.value,
        adQuote: ad.employer.quote,
        chatValue: chat.employer.value,
        chatQuote: chat.employer.quote,
        description: refused
          ? 'The recruiter refused to provide the company or workplace address until you travel.'
          : 'The employer or company name in chat does not match the company named on the ad.',
        family: 'identity',
        severity: 'medium',
      });
    }
  }

  // 7. Salary conflict (Ad: amount X vs Chat: clearly different amount)
  if (ad.salary && chat.salary) {
    const adAmount = String(ad.salary.value.amount || '').replace(/[, ]/g, '');
    const chatAmount = String(chat.salary.value.amount || '').replace(/[, ]/g, '');
    const adNum = Number.parseFloat(adAmount);
    const chatNum = Number.parseFloat(chatAmount);

    if (!Number.isNaN(adNum) && !Number.isNaN(chatNum) && adNum > 0 && chatNum > 0) {
      // Check ratio difference (> 30% diff)
      const diff = Math.abs(adNum - chatNum) / Math.max(adNum, chatNum);
      if (diff > 0.3) {
        conflicts.push({
          field: 'salary',
          fieldLabel: 'Salary Terms',
          adValue: `${ad.salary.value.amount} ${ad.salary.value.currency} / ${ad.salary.value.period}`,
          adQuote: ad.salary.quote,
          chatValue: `${chat.salary.value.amount} ${chat.salary.value.currency} / ${chat.salary.value.period}`,
          chatQuote: chat.salary.quote,
          description: 'The salary offered by the recruiter is significantly different from the advertised compensation.',
          family: 'too_good',
          severity: 'low',
        });
      }
    }
  }

  return conflicts;
}

export function extractSingleSourceFlags(facts: JobFacts, sourceName: 'ad' | 'chat'): Flag[] {
  const flags: Flag[] = [];

  // Passport holding
  if (facts.documentRequest?.value === 'passport_hold') {
    flags.push({
      family: 'trafficking',
      label: `Recruiter demands surrender of original passport (${sourceName})`,
      evidence: facts.documentRequest.quote,
      severity: 'high',
    });
  }

  // Secrecy request
  if (facts.secrecyRequest?.value === true) {
    flags.push({
      family: 'pressure',
      label: `Instructed to keep travel or job secret from family or officials (${sourceName})`,
      evidence: facts.secrecyRequest.quote,
      severity: 'high',
    });
  }

  // Payment before contract
  if (facts.paymentRequest?.value === 'before_contract') {
    flags.push({
      family: 'payment_route',
      label: `Payment demanded prior to signing a verified employment contract (${sourceName})`,
      evidence: facts.paymentRequest.quote,
      severity: 'high',
    });
  }

  // Payment to personal account
  if (facts.paymentRequest?.value === 'personal_account') {
    flags.push({
      family: 'payment_route',
      label: `Instructed to send funds to a personal bank or crypto account (${sourceName})`,
      evidence: facts.paymentRequest.quote,
      severity: 'high',
    });
  }

  // Tourist visa for employment
  if (facts.visaOrPermit?.value === 'tourist') {
    flags.push({
      family: 'trafficking',
      label: `Instructed to travel on a tourist visa for work (${sourceName})`,
      evidence: facts.visaOrPermit.quote,
      severity: 'high',
    });
  }

  // Border pickup
  if (facts.meetingPoint?.value === 'border' || facts.meetingPoint?.value === 'driver_pickup') {
    const isBorder = isBorderLocation(facts.meetingPoint.quote) || isBorderLocation(facts.route?.quote);
    flags.push({
      family: 'trafficking',
      label: isBorder ? `Pickup arranged near border crossing (${sourceName})` : `Informal driver pickup arranged (${sourceName})`,
      evidence: facts.meetingPoint.quote,
      severity: 'medium',
    });
  }

  return flags;
}

export function getStillUnclear(ad: JobFacts | null, chat: JobFacts | null): string[] {
  const missing: string[] = [];

  const workplaceGiven = ad?.workplace?.value || chat?.workplace?.value;
  if (!workplaceGiven) {
    missing.push('No verifiable workplace address or physical facility location was provided.');
  }

  const contractGiven = (ad?.contract && ad.contract.value === 'official') || (chat?.contract && chat.contract.value === 'official');
  if (!contractGiven) {
    missing.push('No written employment contract or official terms of service were provided.');
  }

  const visaGiven =
    (ad?.visaOrPermit && ad.visaOrPermit.value === 'work_visa') || (chat?.visaOrPermit && chat.visaOrPermit.value === 'work_visa');
  if (!visaGiven) {
    missing.push('No legal work visa or registered work permit pathway was confirmed.');
  }

  const employerGiven = ad?.employer?.value || chat?.employer?.value;
  if (!employerGiven) {
    missing.push('Company registration number or verified corporate identity was not identified.');
  }

  return missing;
}

export function applyBorderProtection(flags: Flag[], scoreValue: number): { flags: Flag[]; score: number } {
  // A route through a border town must never raise the result to danger unless another non-geographic family is present.
  const nonGeoFlags = flags.filter(
    (f) => f.family !== 'trafficking' || (!isBorderLocation(f.evidence) && !isBorderLocation(f.label) && !f.label.includes('border')),
  );

  const hasNonGeoRisks = nonGeoFlags.some(
    (f) => f.family === 'payment_route' || f.family === 'pressure' || f.family === 'identity' || f.family === 'known_bad',
  );

  // If there are no other risk families and only border mention exists, cap score below danger (max 50, 'careful' at most)
  if (!hasNonGeoRisks && scoreValue >= 70) {
    return { flags, score: 50 };
  }

  return { flags, score: scoreValue };
}

export function mapToAttentionTier(verdict: 'safe' | 'careful' | 'danger'): { tier: AttentionTier; headline: string } {
  switch (verdict) {
    case 'danger':
      return {
        tier: 'pause',
        headline: 'Pause before you pay, send documents or travel',
      };
    case 'careful':
      return {
        tier: 'verify',
        headline: 'Some details do not add up, check them before you go',
      };
    default:
      return {
        tier: 'lower',
        headline: 'Few warning signs found, but important details may still be missing',
      };
  }
}
