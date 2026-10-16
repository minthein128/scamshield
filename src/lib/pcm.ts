export function createResampler(inRate: number, outRate: number) {
  const ratio = inRate / outRate;
  let acc = 0;
  let count = 0;
  let seen = 0;
  let edge = ratio;
  return {
    /** Box-filter downsample of a stream. Output length varies per block. */
    push(input: Float32Array): Float32Array {
      const out: number[] = [];
      for (let i = 0; i < input.length; i++) {
        acc += input[i];
        count++;
        seen++;
        if (seen >= edge - 1e-9) {
          out.push(acc / count);
          acc = 0;
          count = 0;
          edge += ratio;
        }
      }
      return Float32Array.from(out);
    },
  };
}

export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const v = Math.max(-1, Math.min(1, input[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export function pcm16ToFloat(pcm: Int16Array): Float32Array {
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function base64ToPcm16(b64: string): Int16Array {
  const bytes = base64ToBytes(b64);
  const even = bytes.length - (bytes.length % 2);
  return new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + even));
}

export const rms = (input: ArrayLike<number>): number => {
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
  return input.length ? Math.sqrt(sum / input.length) : 0;
};

/** Maps a speech RMS (about 0.01 to 0.3) to a 0..1 meter value. */
export const meter = (level: number): number => Math.min(1, Math.sqrt(level) * 1.8);
