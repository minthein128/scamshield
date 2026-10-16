import { contactAccess } from '../lib/contactAccess';

describe('contact access gate', () => {
  it('allows a provider account', () => {
    expect(contactAccess({ kind: 'account', uid: 'u1', email: 'a@b.co' })).toBe('allowed');
  });

  it('asks the anonymous install to sign in', () => {
    expect(contactAccess({ kind: 'anonymous', uid: 'anon' })).toBe('signIn');
  });

  it('asks a still-loading session to sign in', () => {
    expect(contactAccess({ kind: 'loading' })).toBe('signIn');
  });

  it('reports builds without Firebase auth as unavailable', () => {
    expect(contactAccess({ kind: 'unavailable' })).toBe('unavailable');
  });
});
