import React from 'react';
import { cleanup, render, screen } from '@testing-library/react-native';
import { DollLoader, VERDICT_MARK } from '../components/DollLoader';
import { MARK_COLORS } from '../components/dollMark';
import theme from '../theme/theme';

let mockReduce = true;
jest.mock('../hooks/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

afterEach(() => {
  cleanup();
  mockReduce = true;
});

const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const distance = (a: string, b: string) => Math.hypot(...channels(a).map((v, i) => v - channels(b)[i]));

describe('DollLoader', () => {
  it('shows the doll and no verdict mark while the check runs', () => {
    render(<DollLoader step={1} label="Checking" />);
    expect(screen.getByTestId('loader-doll')).toBeTruthy();
    expect(screen.queryByTestId(/loader-verdict-/)).toBeNull();
    expect(screen.getByLabelText('Checking')).toBeTruthy();
  });

  it('shows the verdict mark once the verdict lands', () => {
    render(<DollLoader step={5} verdict="danger" label="Checking" />);
    expect(screen.getByTestId('loader-verdict-danger')).toBeTruthy();
  });

  it('gives every verdict its own glyph', () => {
    const icons = Object.values(VERDICT_MARK).map(m => m.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('brand palette', () => {
  it('keeps the danger colour apart from the doll red', () => {
    expect(distance(theme.colors.danger, MARK_COLORS.body)).toBeGreaterThan(40);
    expect(theme.colors.danger).not.toBe(theme.colors.brandRed);
    expect(theme.colors.accent).not.toBe(theme.colors.brandRed);
  });

  it('matches the mark colours to the theme', () => {
    expect(MARK_COLORS.body).toBe(theme.colors.brandRed);
    expect(MARK_COLORS.gold).toBe(theme.colors.brandGold);
  });
});
