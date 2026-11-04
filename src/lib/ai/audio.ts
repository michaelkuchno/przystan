/**
 * Microphone recording for dictation → 16 kHz mono PCM (Whisper input). Audio stays in memory
 * and is discarded after transcription; it is never stored.
 */

export const SAMPLE_RATE = 16_000;
/** Max length of one dictation (Whisper on a phone gets slow beyond that). */
export const MAX_SECONDS = 120;

export interface Recording {
  stop(): Promise<Float32Array>;
  cancel(): void;
}

export async function startRecording(onAutoStop?: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  const timer = setTimeout(() => onAutoStop?.(), MAX_SECONDS * 1000);
  const release = () => {
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
  };
  return {
    stop: () =>
      new Promise<Float32Array>((resolve, reject) => {
        rec.onstop = async () => {
          release();
          try {
            resolve(await decode(new Blob(chunks, { type: rec.mimeType })));
          } catch (e) {
            reject(e);
          }
        };
        rec.stop();
      }),
    cancel: () => {
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      release();
    },
  };
}

async function decode(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: SAMPLE_RATE });
  try {
    const audio = await ctx.decodeAudioData(buf);
    if (audio.numberOfChannels === 1) return audio.getChannelData(0).slice();
    const a = audio.getChannelData(0);
    const b = audio.getChannelData(1);
    return a.map((x, i) => (x + b[i]!) / 2);
  } finally {
    void ctx.close();
  }
}

/** 16-bit PCM WAV, base64 (for Gemini inline audio). */
export function pcmToWavBase64(pcm: Float32Array, rate = SAMPLE_RATE): string {
  const bytes = new Uint8Array(44 + pcm.length * 2);
  const v = new DataView(bytes.buffer);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i]!)) * 0x7fff, true);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
