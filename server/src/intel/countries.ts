const NAMES: Record<string, string> = {
  thailand: 'TH',
  thai: 'TH',
  tailandia: 'TH',
  ထိုင်း: 'TH',
  ထိုင်းနိုင်ငံ: 'TH',
  ไทย: 'TH',
  myanmar: 'MM',
  burma: 'MM',
  birmania: 'MM',
  မြန်မာ: 'MM',
  မြန်မာနိုင်ငံ: 'MM',
  cambodia: 'KH',
  kamboja: 'KH',
  ကမ္ဗောဒီးယား: 'KH',
  laos: 'LA',
  လာအို: 'LA',
  vietnam: 'VN',
  'viet nam': 'VN',
  malaysia: 'MY',
  မလေးရှား: 'MY',
  singapore: 'SG',
  singapura: 'SG',
  စင်ကာပူ: 'SG',
  indonesia: 'ID',
  philippines: 'PH',
  pilipinas: 'PH',
  filipina: 'PH',
  'the philippines': 'PH',
  china: 'CN',
  tiongkok: 'CN',
  တရုတ်: 'CN',
  india: 'IN',
  japan: 'JP',
  jepang: 'JP',
  korea: 'KR',
  'south korea': 'KR',
  taiwan: 'TW',
  'hong kong': 'HK',
  'united arab emirates': 'AE',
  uae: 'AE',
  dubai: 'AE',
  'saudi arabia': 'SA',
  arab: 'SA',
};

const ISO = new Set(Object.values(NAMES));

/** ISO 3166-1 alpha-2 code for a country name or code, or undefined. */
export function toCountryCode(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/[.,]+$/, '');
  if (!t) return undefined;
  if (/^[a-z]{2}$/.test(t)) return ISO.has(t.toUpperCase()) ? t.toUpperCase() : undefined;
  const direct = NAMES[t];
  if (direct) return direct;
  for (const [name, code] of Object.entries(NAMES)) {
    if (name.length > 3 && t.includes(name)) return code;
  }
  return undefined;
}

export const COUNTRY_CODES = [...ISO].sort();
