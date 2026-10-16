import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react-native';
import { Avatar } from '../components/Avatar';
import { avatarPose, type AvatarState } from '../components/avatarArt';
import { sheetAvatarState, useSampledLevel } from '../components/LiveVoiceSheet';

let mockReduce = false;
jest.mock('../hooks/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

const STATES: AvatarState[] = ['idle', 'listening', 'speaking', 'thinking'];

jest.useFakeTimers();

beforeEach(() => {
  mockReduce = false;
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

describe('avatarPose', () => {
  it('rests with no halo while idle', () => {
    expect(avatarPose('idle', 1)).toMatchObject({ haloOpacity: 0, swing: 0, tilt: 0 });
  });

  it('grows the halo and the rock with the speaking level', () => {
    const quiet = avatarPose('speaking', 0);
    const loud = avatarPose('speaking', 1);
    expect(loud.haloScale).toBeGreaterThan(quiet.haloScale);
    expect(loud.haloOpacity).toBeGreaterThan(quiet.haloOpacity);
    expect(loud.swing).toBeGreaterThan(quiet.swing);
  });

  it('leans in and uses the warm halo while listening', () => {
    expect(avatarPose('listening').tilt).not.toBe(0);
    expect(avatarPose('listening').haloColor).not.toBe(avatarPose('speaking').haloColor);
  });

  it('clamps a level outside 0..1', () => {
    expect(avatarPose('speaking', 5)).toEqual(avatarPose('speaking', 1));
    expect(avatarPose('speaking', -2)).toEqual(avatarPose('speaking', 0));
    expect(avatarPose('speaking', Number.NaN)).toEqual(avatarPose('speaking', 0));
  });

  it('holds still under reduce motion and ignores the level', () => {
    for (const s of STATES) {
      const p = avatarPose(s, 1, true);
      expect(p).toEqual(avatarPose(s, 0, true));
      expect(p).toMatchObject({ tilt: 0, swing: 0, breathe: false });
    }
    expect(avatarPose('speaking', 0, true).haloOpacity).toBeGreaterThan(0);
    expect(avatarPose('idle', 0, true).haloOpacity).toBe(0);
  });
});

describe('Avatar', () => {
  it('renders every state at the requested size without warnings', () => {
    const warn = jest.spyOn(console, 'warn');
    for (const state of STATES) {
      const view = render(<Avatar concept="C" state={state} level={0.5} size={48} />);
      const root = screen.getByTestId('avatar');
      expect(StyleSheet.flatten(root.props.style)).toMatchObject({ width: 48, height: 48 });
      expect(root.props.accessibilityLabel).toBe('Kakwe');
      view.unmount();
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('defaults to the doll at 160 px', () => {
    render(<Avatar state="idle" />);
    expect(StyleSheet.flatten(screen.getByTestId('avatar').props.style)).toMatchObject({ width: 160, height: 160 });
  });

  it('hides from screen readers when decorative', () => {
    render(<Avatar state="idle" size={30} decorative />);
    const root = screen.getByTestId('avatar', { includeHiddenElements: true });
    expect(root.props.accessibilityLabel).toBeUndefined();
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('runs the rock and breathing loops when motion is allowed', () => {
    const loop = jest.spyOn(Animated, 'loop');
    render(<Avatar state="thinking" />);
    expect(loop).toHaveBeenCalledTimes(2);
  });

  it('starts no loops under reduce motion', () => {
    mockReduce = true;
    const loop = jest.spyOn(Animated, 'loop');
    for (const state of STATES) {
      const view = render(<Avatar state={state} level={1} />);
      act(() => jest.advanceTimersByTime(5000));
      view.unmount();
    }
    expect(loop).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('shows a static halo for an active state under reduce motion', () => {
    mockReduce = true;
    render(<Avatar state="speaking" level={1} />);
    expect(StyleSheet.flatten(screen.getByTestId('avatar-halo').props.style).opacity).toBeCloseTo(0.5);
  });
});

describe('Talk sheet avatar', () => {
  it('maps the live state to an avatar state', () => {
    expect(sheetAvatarState('connecting', false)).toBe('thinking');
    expect(sheetAvatarState('speaking', false)).toBe('speaking');
    expect(sheetAvatarState('listening', false)).toBe('listening');
    expect(sheetAvatarState('listening', true)).toBe('idle');
    expect(sheetAvatarState('ended', false)).toBe('idle');
    expect(sheetAvatarState('error', false)).toBe('idle');
  });

  it('samples and smooths the level, and stops when there is no reader', () => {
    let raw = 1;
    const read = () => raw;
    const { result, rerender } = renderHook(({ r }: { r: (() => number) | null }) => useSampledLevel(r), { initialProps: { r: read as (() => number) | null } });
    expect(result.current).toBe(0);
    act(() => jest.advanceTimersByTime(60));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1);
    act(() => jest.advanceTimersByTime(600));
    expect(result.current).toBe(1);
    raw = 0;
    act(() => jest.advanceTimersByTime(60));
    expect(result.current).toBeLessThan(1);
    rerender({ r: null });
    expect(result.current).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});
