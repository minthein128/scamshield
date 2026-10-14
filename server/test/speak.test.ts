import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createGeminiSpeaker, createMockSpeaker, pcmToWav, toWav } from '../src/speak.js';

const cfg = loadConfig({ GEMINI_API_KEY: 'g', TTS_MODEL: 'tts-test' });
const audio = (data: Buffer, mimeType: string) => ({
  candidates: [{ content: { parts: [{ inlineData: { data: data.toString('base64'), mimeType } }] } }],
});

describe('speak', () => {
  it('wraps raw PCM in a WAV header using the mime rate', async () => {
    const pcm = Buffer.alloc(480);
    const generateContent = vi.fn(async () => audio(pcm, 'audio/L16;codec=pcm;rate=16000'));
    const out = await createGeminiSpeaker(cfg, { models: { generateContent } } as never).speak('hello');
    const wav = Buffer.from(out.audioBase64, 'base64');
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.length).toBe(44 + 480);
    expect(out).toMatchObject({ mimeType: 'audio/wav', sampleRate: 16000, model: 'tts-test' });
    const call = (generateContent.mock.calls[0] as unknown as [{ model: string; config: { responseModalities: string[] } }])[0];
    expect(call.model).toBe('tts-test');
    expect(call.config.responseModalities).toEqual(['AUDIO']);
  });

  it('passes a WAV through unchanged', () => {
    const wav = pcmToWav(Buffer.alloc(10), 24000);
    expect(toWav(wav).wav).toBe(wav);
  });

  it('fails with upstream when no audio comes back', async () => {
    const generateContent = vi.fn(async () => ({ candidates: [] }));
    await expect(createGeminiSpeaker(cfg, { models: { generateContent } } as never).speak('x')).rejects.toMatchObject({ code: 'upstream' });
  });

  it('mock speaker returns a valid WAV', async () => {
    const out = await createMockSpeaker(cfg).speak('x');
    expect(Buffer.from(out.audioBase64, 'base64').subarray(0, 4).toString()).toBe('RIFF');
  });
});
