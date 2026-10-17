import { CAPTURE_RATE, type LiveAudio, NOT_AVAILABLE, PLAYBACK_RATE } from './liveAudio.types';
import { base64ToPcm16, bytesToBase64, createResampler, floatToPcm16, meter, pcm16ToFloat, rms } from './pcm';

export type { LiveAudio };

const CHUNK_SAMPLES = 1600;
const LEAD_S = 0.04;

const WORKLET_SRC = `
class KakweCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / ${CAPTURE_RATE};
    this.acc = 0; this.count = 0; this.seen = 0; this.edge = this.ratio;
    this.buf = new Float32Array(${CHUNK_SAMPLES}); this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]; this.count++; this.seen++;
      if (this.seen >= this.edge - 1e-9) {
        this.buf[this.n++] = this.acc / this.count;
        this.acc = 0; this.count = 0; this.edge += this.ratio;
        if (this.n === this.buf.length) {
          const out = this.buf;
          this.port.postMessage(out, [out.buffer]);
          this.buf = new Float32Array(${CHUNK_SAMPLES}); this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('kakwe-capture', KakweCapture);
`;

type AnyAudioContext = AudioContext;

export function createLiveAudio(): LiveAudio {
  let stream: MediaStream | null = null;
  let ctx: AnyAudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioNode | null = null;
  let mute: GainNode | null = null;
  let workletUrl: string | null = null;
  let analyser: AnalyserNode | null = null;
  let outBuf: Float32Array<ArrayBuffer> | null = null;
  let inLevel = 0;
  let outLevel = 0;
  let nextStart = 0;
  const playing = new Set<AudioBufferSourceNode>();

  const audioContext = (): AnyAudioContext => {
    if (ctx && ctx.state !== 'closed') return ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error(NOT_AVAILABLE);
    ctx = new Ctor({ latencyHint: 'interactive' });
    analyser = null;
    return ctx;
  };

  const outputChain = (c: AnyAudioContext): AnalyserNode => {
    if (analyser) return analyser;
    analyser = c.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(c.destination);
    outBuf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
    return analyser;
  };

  const emit = (samples: Float32Array, onChunk: (b64: string) => void) => {
    inLevel = meter(rms(samples));
    const pcm = floatToPcm16(samples);
    onChunk(bytesToBase64(new Uint8Array(pcm.buffer)));
  };

  return {
    async requestPermission() {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      try {
        stream ??= await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        await audioContext().resume();
        return true;
      } catch {
        return false;
      }
    },

    async startCapture(onChunk) {
      if (!stream) throw new Error('Microphone permission was not granted.');
      const c = audioContext();
      await c.resume();
      await this.stopCapture();
      source = c.createMediaStreamSource(stream);
      mute = c.createGain();
      mute.gain.value = 0;
      mute.connect(c.destination);
      if (c.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          workletUrl ??= URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
          await c.audioWorklet.addModule(workletUrl);
          const worklet = new AudioWorkletNode(c, 'kakwe-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
          worklet.port.onmessage = (e: MessageEvent<Float32Array>) => emit(e.data, onChunk);
          source.connect(worklet);
          worklet.connect(mute);
          node = worklet;
          return;
        } catch {
          // fall through to the ScriptProcessor path
        }
      }
      const resampler = createResampler(c.sampleRate, CAPTURE_RATE);
      let pending = new Float32Array(0);
      const sp = c.createScriptProcessor(4096, 1, 1);
      sp.onaudioprocess = (e) => {
        const down = resampler.push(e.inputBuffer.getChannelData(0));
        const merged = new Float32Array(pending.length + down.length);
        merged.set(pending);
        merged.set(down, pending.length);
        let off = 0;
        while (merged.length - off >= CHUNK_SAMPLES) {
          emit(merged.slice(off, off + CHUNK_SAMPLES), onChunk);
          off += CHUNK_SAMPLES;
        }
        pending = merged.slice(off);
      };
      source.connect(sp);
      sp.connect(mute);
      node = sp;
    },

    async stopCapture() {
      if (node) {
        if ('port' in node) (node as AudioWorkletNode).port.onmessage = null;
        if ('onaudioprocess' in node) (node as ScriptProcessorNode).onaudioprocess = null;
        node.disconnect();
        node = null;
      }
      source?.disconnect();
      source = null;
      mute?.disconnect();
      mute = null;
      inLevel = 0;
    },

    playChunk(base64Pcm24k) {
      const c = audioContext();
      if (c.state === 'suspended') void c.resume();
      const samples = pcm16ToFloat(base64ToPcm16(base64Pcm24k));
      if (!samples.length) return;
      const buffer = c.createBuffer(1, samples.length, PLAYBACK_RATE);
      buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(outputChain(c));
      const at = Math.max(c.currentTime + LEAD_S, nextStart);
      src.start(at);
      nextStart = at + buffer.duration;
      playing.add(src);
      src.onended = () => {
        playing.delete(src);
        src.disconnect();
      };
    },

    stopPlayback() {
      for (const s of playing) {
        s.onended = null;
        try {
          s.stop();
        } catch {
          // already stopped
        }
        s.disconnect();
      }
      playing.clear();
      nextStart = 0;
      outLevel = 0;
    },

    outputLevel() {
      if (!analyser || !outBuf || playing.size === 0) {
        outLevel *= 0.8;
        return outLevel < 0.01 ? 0 : outLevel;
      }
      analyser.getFloatTimeDomainData(outBuf);
      const target = meter(rms(outBuf));
      outLevel = target > outLevel ? target : outLevel * 0.85 + target * 0.15;
      return outLevel;
    },

    inputLevel: () => inLevel,

    async dispose() {
      this.stopPlayback();
      await this.stopCapture();
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (workletUrl) URL.revokeObjectURL(workletUrl);
      workletUrl = null;
      analyser = null;
      const c = ctx;
      ctx = null;
      await c?.close().catch(() => undefined);
    },
  };
}

export default createLiveAudio;
