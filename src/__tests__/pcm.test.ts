import { base64ToPcm16, bytesToBase64, createResampler, floatToPcm16, meter, pcm16ToFloat, rms } from '../lib/pcm';

describe('pcm helpers', () => {
  it('downsamples 48 kHz to 16 kHz across blocks without drift', () => {
    const r = createResampler(48000, 16000);
    const block = new Float32Array(480).fill(0.5);
    let total = 0;
    for (let i = 0; i < 10; i++) total += r.push(block).length;
    expect(total).toBe(1600);
  });

  it('handles 44.1 kHz input with a steady output rate', () => {
    const r = createResampler(44100, 16000);
    let total = 0;
    for (let i = 0; i < 100; i++) total += r.push(new Float32Array(441)).length;
    expect(Math.abs(total - 16000)).toBeLessThanOrEqual(1);
  });

  it('averages samples so a constant stays constant', () => {
    const out = createResampler(48000, 16000).push(new Float32Array(30).fill(0.25));
    expect(Array.from(out).every(v => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });

  it('round-trips pcm16 through base64', () => {
    const pcm = Int16Array.from([0, 1000, -1000, 32767, -32768]);
    const back = base64ToPcm16(bytesToBase64(new Uint8Array(pcm.buffer)));
    expect(Array.from(back)).toEqual(Array.from(pcm));
  });

  it('converts floats to pcm16 with clipping and back', () => {
    expect(Array.from(floatToPcm16(Float32Array.from([0, 1, -1, 2])))).toEqual([0, 32767, -32768, 32767]);
    expect(pcm16ToFloat(Int16Array.from([16384]))[0]).toBeCloseTo(0.5, 3);
  });

  it('meters silence as 0 and loud speech near 1', () => {
    expect(meter(rms([0, 0, 0]))).toBe(0);
    expect(meter(0.3)).toBeGreaterThan(0.9);
  });
});
