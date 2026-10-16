import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useShieldShareSync } from '../hooks/useShieldShareSync';

const mockSet = jest.fn(async (_v: boolean) => true);
jest.mock('shield-module', () => ({ setShieldShareSignals: (v: boolean) => mockSet(v) }));
let mockShare: boolean | undefined = false;
jest.mock('../state/AppState', () => ({ useAppState: () => ({ profile: { shareSignals: mockShare } }) }));


describe('screen shield signal sharing', () => {
  beforeEach(() => {
    mockSet.mockClear();
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('sends false until the user opts in, then true', () => {
    mockShare = false;
    const view = renderHook(() => useShieldShareSync());
    expect(mockSet).toHaveBeenLastCalledWith(false);
    mockShare = true;
    view.rerender({});
    expect(mockSet).toHaveBeenLastCalledWith(true);
  });

  it('treats a missing choice as no', () => {
    mockShare = undefined;
    renderHook(() => useShieldShareSync());
    expect(mockSet).toHaveBeenLastCalledWith(false);
  });
});
