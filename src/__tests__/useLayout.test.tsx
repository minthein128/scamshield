import React from 'react';
import { Dimensions } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { APP_MAX_WIDTH, layoutFor, sizeClassFor, useLayout, type Layout } from '../hooks/useLayout';

describe('sizeClassFor', () => {
  it.each([
    [320, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [899, 'medium'],
    [900, 'expanded'],
    [1280, 'expanded'],
  ])('%d dp is %s', (width, expected) => {
    expect(sizeClassFor(width)).toBe(expected);
  });
});

describe('layoutFor', () => {
  it('keeps the phone layout on compact widths', () => {
    const l = layoutFor(390, 844);
    expect(l).toMatchObject({ sizeClass: 'compact', isTablet: false, isExpanded: false, columns: 1, contentMaxWidth: 390, gutter: 20 });
  });

  it('centers a reading column on medium widths', () => {
    const l = layoutFor(768, 1024);
    expect(l).toMatchObject({ sizeClass: 'medium', isTablet: true, isExpanded: false, columns: 2, contentMaxWidth: 680 });
    expect(l.contentMaxWidth).toBeLessThanOrEqual(720);
    expect(l.contentMaxWidth).toBeGreaterThanOrEqual(640);
  });

  it('uses the rail layout on expanded widths', () => {
    const l = layoutFor(1024, 768);
    expect(l).toMatchObject({ sizeClass: 'expanded', isTablet: true, isExpanded: true, columns: 3 });
    expect(l.wideMaxWidth).toBeLessThan(1024);
  });

  it('caps very wide windows at the app maximum', () => {
    expect(layoutFor(1920, 1080).width).toBe(APP_MAX_WIDTH);
  });
});

describe('useLayout', () => {
  const Probe: React.FC<{ out: { current?: Layout } }> = ({ out }) => {
    out.current = useLayout();
    return null;
  };

  it('follows the window across a rotation', () => {
    const spy = jest.spyOn(Dimensions, 'get');
    const set = (width: number, height: number) => spy.mockReturnValue({ width, height, scale: 2, fontScale: 1 });
    set(768, 1024);
    const out: { current?: Layout } = {};
    render(<Probe out={out} />);
    expect(out.current?.sizeClass).toBe('medium');
    act(() => {
      set(1024, 768);
      Dimensions.set({ window: { width: 1024, height: 768, scale: 2, fontScale: 1 } });
    });
    expect(out.current?.sizeClass).toBe('expanded');
    spy.mockRestore();
  });
});
