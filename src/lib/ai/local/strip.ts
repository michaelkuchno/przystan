/** Qwen3 may still emit an (empty) thinking block – never show or parse it. */
export const stripThink = (s: string) => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();

/**
 * Whisper sometimes "hallucinates" loops on noise or music ("że to jest to, że to jest to, …").
 * A phrase of 1–8 words repeated more than twice in a row is collapsed to one occurrence.
 */
export function collapseRepeats(text: string): string {
  const words = text.trim().split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let collapsed = false;
    for (let n = 8; n >= 1 && !collapsed; n--) {
      const phrase = words
        .slice(i, i + n)
        .join(' ')
        .toLowerCase()
        .replace(/[.,!?;:]+$/, '');
      if (!phrase) continue;
      let reps = 1;
      while (
        words
          .slice(i + reps * n, i + (reps + 1) * n)
          .join(' ')
          .toLowerCase()
          .replace(/[.,!?;:]+$/, '') === phrase
      )
        reps++;
      if (reps > 2) {
        out.push(...words.slice(i, i + n));
        i += reps * n;
        collapsed = true;
      }
    }
    if (!collapsed) out.push(words[i++]!);
  }
  return out
    .join(' ')
    .replace(/[,\s]+$/, '')
    .trim();
}

/** Root mean square of the signal – below ~0.005 the recording is practically silence. */
export function rms(pcm: Float32Array): number {
  let s = 0;
  for (let i = 0; i < pcm.length; i++) s += pcm[i]! * pcm[i]!;
  return pcm.length ? Math.sqrt(s / pcm.length) : 0;
}

/** Upper bound for Whisper output: ~8 tokens per second of audio (speech is ≈ 3–5). */
export const maxTokensFor = (samples: number, rate = 16_000) => Math.min(440, Math.ceil((samples / rate) * 8) + 16);
