import type { GoogleGenAI } from '@google/genai';
import type { Config } from './config.js';
import { ApiError } from './types.js';

export interface SpeakResult {
  audioBase64: string;
  mimeType: 'audio/wav';
  sampleRate: number;
  model: string;
}

export interface Speaker {
  speak(text: string): Promise<SpeakResult>;
}

const DEFAULT_RATE = 24000;

export function pcmToWav(pcm: Buffer, sampleRate = DEFAULT_RATE): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export function toWav(data: Buffer, mimeType = ''): { wav: Buffer; sampleRate: number } {
  if (data.subarray(0, 4).toString() === 'RIFF') return { wav: data, sampleRate: data.readUInt32LE(24) };
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? DEFAULT_RATE);
  return { wav: pcmToWav(data, rate), sampleRate: rate };
}

export function createGeminiSpeaker(cfg: Config, client: Pick<GoogleGenAI, 'models'>): Speaker {
  return {
    async speak(text) {
      let part: { data?: string; mimeType?: string } | undefined;
      try {
        const res = await client.models.generateContent({
          model: cfg.ttsModel,
          contents: [{ role: 'user', parts: [{ text }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.ttsVoice } } },
            abortSignal: AbortSignal.timeout(cfg.upstreamTimeoutMs),
          },
        });
        part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      } catch (err) {
        throw new ApiError(502, 'upstream', `Speech call failed: ${(err as Error).message}`);
      }
      if (!part?.data) throw new ApiError(502, 'upstream', 'Speech model returned no audio');
      const { wav, sampleRate } = toWav(Buffer.from(part.data, 'base64'), part.mimeType);
      return { audioBase64: wav.toString('base64'), mimeType: 'audio/wav', sampleRate, model: cfg.ttsModel };
    },
  };
}

export function createMockSpeaker(cfg: Config): Speaker {
  return {
    async speak() {
      const n = Math.floor(DEFAULT_RATE * 0.4);
      const pcm = Buffer.alloc(n * 2);
      for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / DEFAULT_RATE) * 8000), i * 2);
      return {
        audioBase64: pcmToWav(pcm).toString('base64'),
        mimeType: 'audio/wav',
        sampleRate: DEFAULT_RATE,
        model: `${cfg.ttsModel} (mock)`,
      };
    },
  };
}
