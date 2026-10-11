export const SCAM_FAMILIES = [
  { id: 'too_good', name: 'Too good', desc: 'Pay, price or bonus far above market rate', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'pressure', name: 'Pressure', desc: 'Urgency, artificial scarcity, forced secrecy', color: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'payment_route', name: 'Payment route', desc: 'Off-platform transfer, personal bank account, top-up', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'identity', name: 'Identity', desc: 'Unknown sender, new account, unverified credentials', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'link_risk', name: 'Link risk', desc: 'Odd top-level domain (.vip, .top), young domain age', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'known_bad', name: 'Known bad', desc: 'Web Risk database hit, previously reported fraud number', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'trafficking', name: 'Trafficking', desc: 'Passport confiscation, tourist visa bypass, border pickup', color: 'bg-red-200 text-red-900 border-red-400 font-bold' },
];

export const SCAM_TAXONOMY = [
  {
    shield: 'Job shield',
    type: 'Trafficking recruitment',
    desc: 'A fake overseas job moves people across a border into a scam compound.',
    tags: ['Trafficking', 'Too good', 'Pressure'],
    severity: 'High risk'
  },
  {
    shield: 'Job shield',
    type: 'Money mule recruitment',
    desc: 'The "job" is receiving and forwarding illegal funds through your own bank account.',
    tags: ['Payment route', 'Too good'],
    severity: 'High risk'
  },
  {
    shield: 'Job shield',
    type: 'Fake agency deposit',
    desc: 'An unlicensed "agency" collects an upfront placement fee and disappears.',
    tags: ['Identity', 'Payment route'],
    severity: 'Careful'
  },
  {
    shield: 'Job shield',
    type: 'Task scam',
    desc: 'Paid small sums to like videos or rate products, then forced to top up to withdraw earnings.',
    tags: ['Too good', 'Payment route', 'Pressure'],
    severity: 'High risk'
  },
  {
    shield: 'Message shield',
    type: 'Gambling bonus lure',
    desc: 'An unknown sender offers free credit and deposit bonuses on an illegal gambling site to harvest deposits and identity.',
    tags: ['Identity', 'Link risk', 'Too good', 'Pressure'],
    severity: 'High risk',
    hasCaseStudy: true
  },
  {
    shield: 'Message shield',
    type: 'Fake fee or bill',
    desc: 'A "parcel delivery fee", "toll charge", or "utility bill" demands urgent payment via a credential-harvesting link.',
    tags: ['Link risk', 'Pressure', 'Known bad'],
    severity: 'High risk'
  },
  {
    shield: 'Message shield',
    type: 'Love and money trap',
    desc: 'A patient online romance ("pig butchering") turns into an invitation to invest on a rigged trading platform.',
    tags: ['Identity', 'Too good', 'Payment route'],
    severity: 'High risk'
  },
  {
    shield: 'Message shield',
    type: 'Impersonation',
    desc: 'Pretends to be a family member with a broken phone, tax police, immigration, or a courier officer.',
    tags: ['Identity', 'Pressure', 'Payment route'],
    severity: 'High risk'
  },
  {
    shield: 'E-commerce shield',
    type: 'Fake seller, pay outside app',
    desc: 'A heavily discounted marketplace listing pushes the buyer to make an off-platform bank transfer, then blocks them.',
    tags: ['Too good', 'Payment route', 'Identity', 'Known bad'],
    severity: 'High risk'
  },
  {
    shield: 'E-commerce shield',
    type: 'Fake shop or ad',
    desc: 'A copycat website or social media ad offers 80% off brand goods that are never delivered.',
    tags: ['Link risk', 'Too good', 'Identity'],
    severity: 'High risk'
  },
  {
    shield: 'E-commerce shield',
    type: 'Fake payment proof',
    desc: 'Targets sellers with an altered bank transfer slip and applies pressure to dispatch goods before funds clear.',
    tags: ['Payment route', 'Pressure'],
    severity: 'Careful'
  },
  {
    shield: 'E-commerce shield',
    type: 'Fake support "verification"',
    desc: 'Impersonates marketplace support sending a phishing link to "verify account" or "release pending payment".',
    tags: ['Link risk', 'Identity', 'Pressure'],
    severity: 'High risk'
  }
];

export const DETECTION_STAGES = [
  {
    num: 1,
    name: 'Capture',
    title: 'On the user phone',
    source: 'Viber · Not in contacts',
    content: {
      sender: '+95 966 876 ****',
      displayName: '[Burmese Name] (translates to "Unfaithful person")',
      message: '12 free red envelopes! 200% bonus on your first top-up. Limited slots, first come, first served. dljie[.]vip/kzfs',
      note: 'Message summarised. Number masked and link broken with [.] so nobody opens it from this board.'
    }
  },
  {
    num: 2,
    name: 'Extract',
    title: 'OCR + Multimodal Gemini',
    fields: [
      { key: 'app', val: 'Viber' },
      { key: 'sender', val: '+95 966 876 ****' },
      { key: 'in_contacts', val: 'false' },
      { key: 'display_name', val: '"Unfaithful person" (from Burmese)' },
      { key: 'url', val: 'dljie[.]vip/kzfs' },
      { key: 'tld', val: '.vip (high-risk registrar category)' },
      { key: 'offers', val: '12 free red envelopes; 200% first top-up bonus' },
      { key: 'pressure', val: '"limited slots", "first come, first served"' }
    ]
  },
  {
    num: 3,
    name: 'Detect',
    title: 'Gemini Classification',
    classification: 'Gambling bonus lure',
    intent: 'Harvests deposits and personal identity data',
    flags: [
      { family: 'Identity', signal: 'Unsolicited, unverified sender outside address book' },
      { family: 'Link risk', signal: 'Link on an obscure domain (.vip)' },
      { family: 'Too good', signal: 'Free credit and 200% immediate bonus' },
      { family: 'Pressure', signal: 'Limited slots, first come first served countdown' }
    ],
    status: 'Complete message, so no ask-for-more step required.'
  },
  {
    num: 4,
    name: 'Correlate',
    title: 'Live Threat Intelligence Lookups',
    lookups: [
      { target: 'Link → Web Risk', result: 'Known malicious URL hit', status: 'critical' },
      { target: 'Domain → RDAP Age', result: 'Registered 6 days ago in Panama', status: 'bad' },
      { target: '.vip → Risk List', result: 'High-abuse TLD flagged in registry', status: 'bad' },
      { target: 'Number → Report Graph', result: 'Reported 14 times this week across Myanmar & Thailand', status: 'bad' },
      { target: 'Display name → Search', result: 'Pruned: low informational value', status: 'neutral' }
    ]
  },
  {
    num: 5,
    name: 'Score',
    title: 'Rules Engine & Thresholds',
    scoring: [
      { item: 'Base: unsolicited message', weight: '-1.0' },
      { item: 'Identity (unknown sender)', weight: '+0.8' },
      { item: 'Link risk (shady .vip URL)', weight: '+1.4' },
      { item: 'Too good (unrealistic bonus)', weight: '+1.4' },
      { item: 'Pressure (false urgency)', weight: '+0.6' }
    ],
    totalScore: '3.2',
    threshold: 'Danger threshold: >= 3.0',
    verdict: 'Danger: 3.2 is over the 3.0 line and 4 distinct flag families agree. (A single Web Risk hit also triggers Danger automatically).'
  },
  {
    num: 6,
    name: 'Explain',
    title: 'Localized Voice & Clear Verdict',
    badge: 'Danger',
    category: 'Gambling trap',
    advice: 'Do not open the link or top up. The bonus is a trick to steal your money.',
    actions: ['Read in Myanmar', 'Listen audio explanation', 'Block this number', 'Report it']
  }
];

export const SCREENS_CATALOG = [
  { id: 'home', title: '1 · Home Screen', category: 'Core App', screen: 'HomeScreen' },
  { id: 'job_check', title: '2 · Check a Job Offer', category: 'Core App', screen: 'JobCheckScreen' },
  { id: 'risk_report', title: '3 · Risk Report', category: 'Core App', screen: 'RiskReportScreen' },
  { id: 'family_guardian', title: '4 · Family Guardian', category: 'Core App', screen: 'FamilyGuardianScreen' },
  { id: 'shield_intro', title: 'A · Turn on Shield', category: 'Shield Setup', screen: 'ShieldIntroScreen' },
  { id: 'job_spot', title: 'B · Spot a Job Post', category: 'Job Scam Flow', screen: 'JobShieldFlow', step: 1 },
  { id: 'job_cutoff', title: 'C · Text is Cut Off', category: 'Job Scam Flow', screen: 'JobShieldFlow', step: 2 },
  { id: 'job_expand', title: 'D · Full Post, Tap Again', category: 'Job Scam Flow', screen: 'JobShieldFlow', step: 3 },
  { id: 'job_scanning', title: 'E · Auto-Check Analysis', category: 'Job Scam Flow', screen: 'JobShieldFlow', step: 4 },
  { id: 'job_verdict', title: 'F · Picture Verdict (Danger)', category: 'Job Scam Flow', screen: 'JobShieldFlow', step: 5 },
  { id: 'chat_strange', title: 'G · Strange Chat', category: 'Romance Scam Flow', screen: 'ChatShieldFlow', step: 1 },
  { id: 'chat_older_req', title: 'H · Need Older Messages', category: 'Romance Scam Flow', screen: 'ChatShieldFlow', step: 2 },
  { id: 'chat_scrolled', title: 'I · Older Messages, Tap Again', category: 'Romance Scam Flow', screen: 'ChatShieldFlow', step: 3 },
  { id: 'chat_verdict', title: 'J · Chat Verdict (Danger)', category: 'Romance Scam Flow', screen: 'ChatShieldFlow', step: 4 },
  { id: 'notif_warning', title: 'K · Automatic Warning', category: 'SMS Phishing Flow', screen: 'MessageShieldFlow', step: 1 },
  { id: 'notif_verdict', title: 'L · Message Verdict (Danger)', category: 'SMS Phishing Flow', screen: 'MessageShieldFlow', step: 2 },
  { id: 'agency_page', title: 'M · Recruitment Agency Page', category: 'Agency Check Flow', screen: 'AgencyShieldFlow', step: 1 },
  { id: 'agency_verdict', title: 'N · Agency Check (Careful)', category: 'Agency Check Flow', screen: 'AgencyShieldFlow', step: 2 },
  { id: 'shop_listing', title: 'O · Cheap Tech Listing', category: 'E-Commerce Scam Flow', screen: 'MarketplaceShieldFlow', step: 1 },
  { id: 'shop_seller_req', title: 'P · Show the Seller', category: 'E-Commerce Scam Flow', screen: 'MarketplaceShieldFlow', step: 2 },
  { id: 'shop_profile', title: 'Q · Seller Profile, Tap Again', category: 'E-Commerce Scam Flow', screen: 'MarketplaceShieldFlow', step: 3 },
  { id: 'shop_verdict', title: 'R · Shopping Verdict (Danger)', category: 'E-Commerce Scam Flow', screen: 'MarketplaceShieldFlow', step: 4 },
  { id: 'scam_matrix', title: 'Scam Types by Shield', category: 'Architecture & Guides', screen: 'ScamTaxonomyView' },
  { id: 'case_study', title: 'Case Study: Gambling Bonus Lure', category: 'Architecture & Guides', screen: 'CaseStudyArchitectureView' }
];
