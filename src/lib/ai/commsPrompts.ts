/**
 * AI for e-mails and SMS (D-063). COMMS_GUIDE is the professional knowledge the model gets for
 * every message: confidentiality, the specific recipients of social-rehabilitation / addiction
 * work in Poland and Switzerland, de-escalation, crisis content, structure and language
 * conventions. Reviewed in docs/CONTENT_REVIEW.md, section 15.
 */
import type { Lang } from '@/lib/prefs';
import { BASE, LANG_NAME } from './prompts';

export type Recipient =
  | 'client'
  | 'guardian'
  | 'family'
  | 'school'
  | 'court'
  | 'probation'
  | 'institution'
  | 'colleague'
  | 'supervisor'
  | 'other';

export const COMMS_GUIDE = `PROFESSIONAL CORRESPONDENCE GUIDE (social rehabilitation, addiction work, youth work; Poland and Switzerland)

Confidentiality and data protection (GDPR / Polish RODO, Swiss nDSG; professional secrecy):
- E-mail and SMS are not secure channels. Write only what is necessary for the purpose ("data minimisation").
  Never include diagnoses, substance use details, test or screening results, criminal matters, health data or
  information about third parties unless the professional explicitly asked for it and the recipient is entitled to it.
  If sensitive content seems necessary, suggest a phone call, a meeting or an encrypted/official channel instead and
  mention this in "cautions".
- Never confirm to a third party that someone is a client without the client's consent (or a clear legal basis).
  With minors: parents/legal guardians have rights to information, but the young person's trust matters – share
  facts about cooperation and safety, not therapeutic content; say what will be shared with the young person.
- Courts, family courts, probation officers (kurator sądowy; Swiss Bewährungsdienst / Jugendanwaltschaft), KESB:
  answer only within the scope that was requested and that the professional is authorised to share; strictly factual;
  separate observations (what was seen/said, dates, attendance) from interpretations; no opinions on guilt; no
  diagnoses; refer to the formal report / opinion when one is required.
- Child protection or danger to life: the AI does not assess risk. If an incoming text suggests danger (suicidal
  thoughts, violence, abuse, neglect), the reply must not handle it only by e-mail: advise immediate personal/phone
  contact, give emergency/crisis numbers of the country, and note in "cautions" that the institution's procedure
  (e.g. Niebieska Karta in Poland, a risk notification to KESB in Switzerland) must be checked by the professional.
- Never promise what the professional cannot guarantee (outcomes, decisions of other institutions, deadlines of others).

Recipients and register:
- client (adult): respectful, plain language, person-first (no "addict"), motivational interviewing spirit: autonomy,
  no lecturing, no threats; short.
- client (young person): friendly, direct, not childish, no slang that ages badly.
- guardian / family: empathic, concrete, invite cooperation; no blame; protect the young person's confidences.
- school: cooperative, focused on support and concrete arrangements; for requests for an opinion mention the
  purpose and (if relevant) the consent of the guardian.
- court / probation officer / KESB / Jugendanwaltschaft: formal, concise, reference numbers if given ("sygn. akt",
  "Ihr Zeichen"), dates, facts; nothing beyond the request.
- institution (treatment centre, social services MOPS/OPS, Sozialdienst, Suchtfachstelle, police): formal, clear
  purpose, what is needed and by when, contact details for follow-up.
- colleague / supervisor: collegial, concise; for supervision requests describe the case only pseudonymised.
- angry or accusing messages: de-escalate – thank for the message, acknowledge feelings without admitting
  facts that are not established, state facts calmly, offer a concrete next step (call / meeting), keep boundaries.

Structure of a good e-mail:
- Subject: specific (what + when), no personal data of clients in the subject line.
- Greeting by convention, one-sentence purpose, the content, a clear next step / question / deadline, closing, signature.
- Replies: answer every question of the sender in order; confirm what was received; say what happens next and when.
- Unknown facts, dates, places or names: never invent them – write a placeholder in square brackets
  (e.g. "[data]", "[Datum]", "[date]") and list it in "cautions".
- Keep placeholders like "[Osoba A]" exactly as they are.

Language conventions:
- Polish: "Szanowna Pani / Szanowny Panie" (formal) or "Dzień dobry," (neutral); forms "Pani/Pan"; closing
  "Z poważaniem" (formal) / "Pozdrawiam serdecznie" (warmer); with young clients "Cześć" only if the professional
  uses "ty" with them.
- German (Switzerland): "Guten Tag Frau X / Herr Y" or "Sehr geehrte Frau X"; "Sie" (use "du" only with young people
  or in street work if the professional does); closing "Freundliche Grüsse" (Swiss spelling: always "ss", never "ß").
- English: "Dear Ms X / Mr Y" or "Hello [name],"; closing "Kind regards".

SMS:
- Max. ~300 characters (ideally one or two segments), no sensitive content at all (no diagnosis, no substance, no
  court matter – the phone may be seen by others), neutral sender identification ("Przystań/[name]" is fine), the
  practical point (time, place, change, request to call back), no links unless asked.`;

export interface ComposeOptions {
  channel: 'email' | 'sms';
  recipient: Recipient;
  tone: 'formal' | 'neutral' | 'warm';
  country: 'PL' | 'CH';
}

const COMMON = (lang: Lang, o: ComposeOptions) =>
  [
    BASE(lang),
    '',
    COMMS_GUIDE,
    '',
    `Country of work: ${o.country === 'CH' ? 'Switzerland (canton of Bern)' : 'Poland'}. Recipient type: ${o.recipient}. Tone: ${o.tone}. Channel: ${o.channel}.`,
    `Write the message in ${LANG_NAME[lang]}.`,
    'Return JSON: subject (e-mail subject; empty for SMS), body (the full message incl. greeting and closing; sign with',
    'the signature provided, otherwise "[podpis]"/"[Signatur]"/"[signature]"), sms (a short SMS version of the core point,',
    'max 300 characters, no sensitive content), cautions (0–5 short notes for the professional: privacy risks,',
    'placeholders to fill, things to verify, consent needed; empty if none).',
  ].join('\n');

export const COMMS_PROMPTS = {
  /** A new message from the professional's instructions (+ optional template draft). */
  compose: (lang: Lang, o: ComposeOptions) =>
    [COMMON(lang, o), 'Task: write a new message following the professional\'s instructions below.'].join('\n'),
  /** Reply to an incoming e-mail, with the professional's intention and context from the app. */
  reply: (lang: Lang, o: ComposeOptions) =>
    [
      COMMON(lang, o),
      'Task: draft a reply to the incoming e-mail below.',
      '- Identify every question and request in the incoming e-mail and address each one (or say when it will be answered).',
      '- Follow the professional\'s intention ("what I want to say") – it overrides your own ideas.',
      '- Use the "context from the app" (knowledge, help system, client summary) only where it really helps; never quote',
      '  internal notes or reveal information the recipient is not entitled to.',
      '- If the incoming e-mail contains danger signals, follow the crisis rule of the guide.',
    ].join('\n'),
  /** Rework of an existing draft (text answer). */
  improve: (lang: Lang, how: 'shorter' | 'formal' | 'warmer' | 'simpler' | 'translate', target: Lang) =>
    [
      BASE(how === 'translate' ? target : lang),
      '',
      COMMS_GUIDE,
      '',
      how === 'shorter'
        ? 'Make the message clearly shorter, keep every fact, date and request.'
        : how === 'formal'
          ? 'Make the message more formal and professional, keep the content.'
          : how === 'warmer'
            ? 'Make the message warmer and more empathic, still professional, keep the content.'
            : how === 'simpler'
              ? 'Rewrite the message in plain, easy language (short sentences), keep the content.'
              : `Translate the message into ${LANG_NAME[target]} using that language's letter conventions; keep facts, dates and placeholders.`,
      'Output only the reworked message text (no comments).',
    ].join('\n'),
};
