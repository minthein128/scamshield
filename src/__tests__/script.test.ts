import { scriptOf, scriptStyle } from '../theme/script';

describe('script fonts', () => {
  it('detects scripts', () => {
    expect(scriptOf('အန္တရာယ်မြင့်')).toBe('myanmar');
    expect(scriptOf('งานด่วน')).toBe('thai');
    expect(scriptOf('Pekerjaan, trabaho')).toBe('latin');
    expect(scriptOf('')).toBe('latin');
  });

  it('picks the font and widens line height for Burmese', () => {
    expect(scriptStyle('မြန်မာ', 'bold', 20)).toEqual({ fontFamily: 'A10YoeShin-Bold', lineHeight: 24 });
    expect(scriptStyle('hello', 'semiBold', 20)).toEqual({ fontFamily: 'PlusJakartaSans-SemiBold', lineHeight: 20 });
  });
});
