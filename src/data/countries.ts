export type CountryCode = 'MM' | 'TH' | 'KH' | 'LA' | 'MY' | 'ID' | 'PH' | 'VN';

export interface Country {
  code: CountryCode;
  name: string;
  aliases: string[];
}

export const COUNTRIES: Country[] = [
  { code: 'MM', name: 'Myanmar', aliases: ['myanmar', 'burma', 'yangon', 'naypyidaw', 'mandalay', 'myawaddy'] },
  { code: 'TH', name: 'Thailand', aliases: ['thailand', 'thai', 'bangkok', 'chiang mai', 'phuket', 'mae sot'] },
  { code: 'KH', name: 'Cambodia', aliases: ['cambodia', 'phnom penh', 'sihanoukville', 'poipet', 'siem reap'] },
  { code: 'LA', name: 'Laos', aliases: ['laos', 'lao pdr', 'vientiane', 'golden triangle', 'bokeo'] },
  { code: 'MY', name: 'Malaysia', aliases: ['malaysia', 'kuala lumpur', 'penang', 'johor'] },
  { code: 'ID', name: 'Indonesia', aliases: ['indonesia', 'jakarta', 'bali', 'surabaya', 'batam'] },
  { code: 'PH', name: 'Philippines', aliases: ['philippines', 'manila', 'cebu', 'davao', 'pogo'] },
  { code: 'VN', name: 'Vietnam', aliases: ['vietnam', 'viet nam', 'hanoi', 'ho chi minh', 'saigon'] },
];
