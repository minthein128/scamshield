import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../i18n';
import { ConflictCard } from '../components/ConflictCard';
import { JobFactsScreen } from '../screens/JobFactsScreen';
import { createMockClient } from '../api/mock';
import type { JobExtractResponse, JobFacts } from '../api/types';
import { FIELD_DEFS } from '../lib/jobFacts';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ getParent: () => undefined, dispatch: jest.fn() }),
}));

type Node = { props: { children?: unknown } };
const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' ? children : children && typeof children === 'object' && 'props' in children ? flat((children as Node).props.children) : '';
const textOf = (id: string): string => flat(screen.getByTestId(id));

const blank = (): JobFacts => Object.fromEntries(FIELD_DEFS.map(d => [d.key, null])) as unknown as JobFacts;

const EXTRACTION: JobExtractResponse = {
  jobId: 'job_1',
  ad: { ...blank(), contract: { value: 'official', quote: 'Official contract provided', confidence: 0.9 } },
  chat: {
    ...blank(),
    contract: { value: 'later', quote: 'We sign the contract when you arrive', confidence: 0.9 },
    salary: { value: { amount: 1500, currency: 'USD', period: 'monthly' }, quote: 'USD 1,500 a month', confidence: 0.5 },
    workplace: { value: '', quote: 'address will be shared later', confidence: 0.5, refused: true },
  },
};

function renderFacts() {
  const navigate = jest.fn();
  const navigation = { navigate, goBack: jest.fn(), canGoBack: () => true } as never;
  const route = { params: { extraction: EXTRACTION, extractRequest: { chat: { text: 'x' }, language: 'en' as const }, source: 'ad' } } as never;
  render(<JobFactsScreen navigation={navigation} route={route} />);
  return navigate;
}

const sent = (navigate: jest.Mock) => navigate.mock.calls[0][1].job.request;

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Is this right screen', () => {
  it('shows every field of the spec in both groups with the quote it came from', () => {
    renderFacts();
    expect(FIELD_DEFS).toHaveLength(16);
    for (const source of ['ad', 'chat']) for (const d of FIELD_DEFS) expect(screen.getByTestId(`fact-${source}-${d.key}`)).toBeTruthy();
    for (const key of ['secrecyRequest', 'paymentRequest', 'route', 'meetingPoint', 'contactChannel']) expect(screen.getByTestId(`fact-chat-${key}`)).toBeTruthy();
    expect(textOf('fact-chat-contract-quote')).toContain('We sign the contract when you arrive');
    expect(textOf('fact-chat-contract-value')).toContain('A contract later');
  });

  it('highlights low confidence and declined facts', () => {
    renderFacts();
    expect(screen.getByTestId('facts-unclear-note')).toBeTruthy();
    expect(screen.getByText('They may not have answered')).toBeTruthy();
    expect(screen.getByText('Please check')).toBeTruthy();
  });

  it('changes an enum field with a select, keeps the shown quote and sends the code', () => {
    const navigate = renderFacts();
    fireEvent.press(screen.getByTestId('fact-chat-contract-edit'));
    fireEvent.press(screen.getByTestId('fact-chat-contract-select'));
    fireEvent.press(screen.getByTestId('fact-chat-contract-select-official'));
    expect(textOf('fact-chat-contract-value')).toContain('An official contract');
    expect(textOf('fact-chat-contract-quote')).toContain('We sign the contract when you arrive');
    expect(screen.queryByTestId('fact-chat-contract-input')).toBeNull();

    fireEvent.press(screen.getByTestId('facts-submit'));
    expect(sent(navigate).facts.chat.contract).toEqual({ value: 'official', quote: 'We sign the contract when you arrive', confidence: 1, edited: true });
    expect(sent(navigate).facts.ad.contract.edited).toBeUndefined();
  });

  it('edits salary as amount, currency and period', () => {
    const navigate = renderFacts();
    fireEvent.press(screen.getByTestId('fact-chat-salary-edit'));
    fireEvent.changeText(screen.getByTestId('fact-chat-salary-amount'), '40000');
    fireEvent.changeText(screen.getByTestId('fact-chat-salary-currency'), 'thb');
    fireEvent.press(screen.getByTestId('fact-chat-salary-period'));
    fireEvent.press(screen.getByTestId('fact-chat-salary-period-daily'));
    fireEvent.press(screen.getByTestId('facts-submit'));
    expect(sent(navigate).facts.chat.salary).toEqual({ value: { amount: 40000, currency: 'THB', period: 'daily' }, quote: 'USD 1,500 a month', confidence: 1, edited: true });
  });

  it('marks a fact not mentioned, keeps its quote and sends null', () => {
    const navigate = renderFacts();
    fireEvent.press(screen.getByTestId('fact-chat-salary-edit'));
    fireEvent.press(screen.getByTestId('fact-chat-salary-none'));
    expect(textOf('fact-chat-salary-value')).toContain('Not mentioned');
    expect(textOf('fact-chat-salary-quote')).toContain('USD 1,500 a month');
    fireEvent.press(screen.getByTestId('facts-submit'));
    expect(sent(navigate).facts.chat.salary).toBeNull();
    expect(sent(navigate).jobId).toBe('job_1');
  });

  it('lets the user add a value the model did not find', () => {
    const navigate = renderFacts();
    fireEvent.press(screen.getByTestId('fact-chat-secrecyRequest-edit'));
    fireEvent.press(screen.getByTestId('fact-chat-secrecyRequest-select'));
    fireEvent.press(screen.getByTestId('fact-chat-secrecyRequest-select-yes'));
    fireEvent.press(screen.getByTestId('facts-submit'));
    expect(sent(navigate).facts.chat.secrecyRequest).toEqual({ value: true, quote: '', confidence: 1, edited: true });
  });

  it('renders in Burmese without English field names', async () => {
    await i18n.changeLanguage('my');
    renderFacts();
    expect(textOf('fact-chat-contract-value')).not.toContain('contract later');
    expect(textOf('fact-chat-contract-value').length).toBeGreaterThan(0);
    expect(screen.queryByText('Looks right, check it')).toBeNull();
  });
});

describe('conflict list', () => {
  it('shows both quotes for each conflict', async () => {
    const client = createMockClient({ delayMs: 0 });
    const ad = await client.extractJob({ ad: { text: 'Cashier job in Bangkok. No agency fees. Official contract provided.' }, chat: { text: 'Pay a 200 USD deposit first. The contract is signed on arrival.' }, language: 'en' });
    const result = await client.assessJob({ jobId: ad.jobId, facts: { ad: ad.ad, chat: ad.chat }, language: 'en' });
    expect(result.conflicts.map(c => c.field)).toEqual(expect.arrayContaining(['workerFee', 'contract']));
    render(<>{result.conflicts.map(c => <ConflictCard key={c.field} conflict={c} />)}</>);
    expect(textOf('conflict-workerFee-ad')).toContain('No agency fees');
    expect(textOf('conflict-workerFee-chat')).toContain('deposit');
    expect(textOf('conflict-contract-ad')).toContain('Official contract provided');
    expect(textOf('conflict-contract-chat')).toContain('signed on arrival');
    expect(screen.getAllByText('The ad says').length).toBe(result.conflicts.length);
  });
});
