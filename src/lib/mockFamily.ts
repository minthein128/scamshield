// Mock data: the family circle backend does not exist yet. Phone numbers are placeholders.
export const MOCK_FAMILY = {
  traveller: { name: 'Rina', phone: '+66000000001' },
  viewer: 'Ibu',
  trip: { destination: 'Bangkok, Thailand', employer: 'Sunrise Digital Co.', recruiter: 'Telegram @sunrise_hr_th', risk: 'danger' as const },
  alert: { title: 'Rina missed a check-in', body: 'Expected at 09:00 today. Her job offer was rated high risk before she left.' },
  checkIns: [
    { label: 'Departed home airport', time: 'Yesterday 08:40', ok: true },
    { label: 'Landed in Bangkok', time: 'Yesterday 14:10', ok: true },
    { label: 'Picked up by company car', time: 'Yesterday 15:30', ok: true },
    { label: 'Morning check-in missed', time: 'Today 09:00', ok: false },
  ],
  contacts: [
    { label: 'Call embassy', phone: '+66000000002' },
    { label: 'Call migrant helpline', phone: '+66000000003' },
  ],
};
