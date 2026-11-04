/**
 * Crisis signals (D-055). When a text sent to or returned by the AI mentions suicidal thoughts,
 * self-harm or violence, the UI shows the crisis numbers of the country of work next to the
 * answer. Detection is local, simple and deliberately over-inclusive – a false alarm only shows
 * a list of phone numbers. It is NOT a risk assessment and is never presented as one.
 */
const PATTERNS: RegExp[] = [
  // Polish
  /samob[oó]j/iu,
  /odebra[ćc]\s+sobie\s+życie/iu,
  /zabi[ćc]\s+(?:si[ęe]|siebie)/iu,
  /nie\s+chc[ęe]\s+(?:ju[żz]\s+)?(?:[żz]y[ćc]|by[ćc]\s+na\s+tym\s+[śs]wiecie)/iu,
  /(?:ci[ąa][ćc]|tn[ęe])\s+si[ęe]/iu,
  /samookalecz/iu,
  /przemoc|bije\s+(?:mnie|go|j[ąa])|(?:mnie|go|j[ąa]|nas)\s+bij|pobi[łl]|gwa[łl]t|molest/iu,
  /zabij[ęe]\s|zabi[ćc]\s+(?:go|j[ąa]|ich)/iu,
  // German
  /suizid|selbstmord|selbsttötung/iu,
  /(?:mich|mir)\s+(?:umbringen|das\s+leben\s+nehmen)/iu,
  /nicht\s+mehr\s+leben/iu,
  /ritzen|selbstverletz/iu,
  /gewalt|schlägt\s+(?:mich|ihn|sie)|vergewaltig|missbrauch/iu,
  // English
  /suicid|kill\s+myself|end\s+my\s+life|self[-\s]?harm|cutting\s+myself|want\s+to\s+die/iu,
  /\babuse[ds]?\b|\bbeats?\s+(?:me|him|her)\b|\brape[ds]?\b|domestic\s+violence/iu,
];

export function hasCrisisSignal(...texts: (string | undefined)[]): boolean {
  const all = texts.filter(Boolean).join('\n');
  return PATTERNS.some((p) => p.test(all));
}
