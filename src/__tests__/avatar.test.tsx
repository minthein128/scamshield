import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { Avatar } from '../components/Avatar';
import { AVATAR_ART, avatarPose, type AvatarConcept, type AvatarState } from '../components/avatarArt';

let mockReduce = false;
jest.mock('../components/ShieldLoader', () => ({ useReduceMotion: () => mockReduce }));

const CONCEPTS: AvatarConcept[] = ['A', 'B', 'C'];
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
    for (const c of CONCEPTS) {
      const p = avatarPose(c, 'idle', 1);
      expect(p.haloOpacity).toBe(0);
      expect(p.swing).toBe(0);
    }
  });

  it('grows the halo with the speaking level', () => {
    for (const c of CONCEPTS) {
      const quiet = avatarPose(c, 'speaking', 0);
      const loud = avatarPose(c, 'speaking', 1);
      expect(loud.haloScale).toBeGreaterThan(quiet.haloScale);
      expect(loud.haloOpacity).toBeGreaterThan(quiet.haloOpacity);
    }
  });

  it('gives each concept its own motion', () => {
    expect(avatarPose('A', 'speaking', 1).blink).toBe(true);
    expect(avatarPose('A', 'listening', 0).tilt).not.toBe(0);
    expect(avatarPose('B', 'speaking', 1).overlay).toBeGreaterThan(avatarPose('B', 'speaking', 0).overlay);
    expect(avatarPose('C', 'speaking', 1).swing).toBeGreaterThan(avatarPose('C', 'speaking', 0).swing);
  });

  it('uses the warm halo while listening', () => {
    expect(avatarPose('A', 'listening').haloColor).not.toBe(avatarPose('A', 'speaking').haloColor);
  });

  it('clamps a level outside 0..1', () => {
    expect(avatarPose('C', 'speaking', 5)).toEqual(avatarPose('C', 'speaking', 1));
    expect(avatarPose('C', 'speaking', -2)).toEqual(avatarPose('C', 'speaking', 0));
    expect(avatarPose('C', 'speaking', Number.NaN)).toEqual(avatarPose('C', 'speaking', 0));
  });

  it('holds still under reduce motion and ignores the level', () => {
    for (const c of CONCEPTS) {
      for (const s of STATES) {
        const p = avatarPose(c, s, 1, true);
        expect(p).toEqual(avatarPose(c, s, 0, true));
        expect(p).toMatchObject({ tilt: 0, swing: 0, overlay: 0, breathe: false, blink: false });
      }
    }
    expect(avatarPose('A', 'speaking', 0, true).haloOpacity).toBeGreaterThan(0);
    expect(avatarPose('A', 'idle', 0, true).haloOpacity).toBe(0);
  });
});

describe('Avatar', () => {
  it('renders every concept and state at the requested size', () => {
    const warn = jest.spyOn(console, 'warn');
    for (const concept of CONCEPTS) {
      for (const state of STATES) {
        const view = render(<Avatar concept={concept} state={state} level={0.5} size={48} />);
        const root = screen.getByTestId('avatar');
        expect(StyleSheet.flatten(root.props.style)).toMatchObject({ width: 48, height: 48 });
        expect(root.props.accessibilityLabel).toBe('SafeRoute');
        expect(screen.queryByTestId('avatar-overlay') !== null).toBe(AVATAR_ART[concept].overlay.length > 0);
        view.unmount();
      }
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('defaults to 160 px', () => {
    render(<Avatar concept="B" state="idle" />);
    expect(StyleSheet.flatten(screen.getByTestId('avatar').props.style)).toMatchObject({ width: 160, height: 160 });
  });

  it('runs the thinking loop and the blink timer when motion is allowed', () => {
    const loop = jest.spyOn(Animated, 'loop');
    render(<Avatar concept="A" state="thinking" />);
    expect(loop).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it('starts no loops, rock or blink under reduce motion', () => {
    mockReduce = true;
    const loop = jest.spyOn(Animated, 'loop');
    for (const concept of CONCEPTS) {
      for (const state of STATES) {
        const view = render(<Avatar concept={concept} state={state} level={1} />);
        act(() => jest.advanceTimersByTime(10000));
        view.unmount();
      }
    }
    expect(loop).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('shows a static halo for an active state under reduce motion', () => {
    mockReduce = true;
    render(<Avatar concept="C" state="speaking" level={1} />);
    const halo = StyleSheet.flatten(screen.getByTestId('avatar-halo').props.style);
    expect(halo.opacity).toBeCloseTo(0.5);
  });

  it('stops its timers on unmount', () => {
    const view = render(<Avatar concept="A" state="speaking" level={0.6} />);
    view.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
