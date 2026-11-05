/**
 * Local check of prevention plans against well-known "what does not work" findings
 * (EDPQS / European Prevention Curriculum, Polish recommendations of the KBPN/KCPU, Sucht Schweiz):
 * scare tactics, ex-user testimonies as the main method, one-off lectures, detailed substance
 * information, moralising. Runs on the device on every proposal and on the user's own plan.
 */
export type PracticeWarning = 'fear' | 'exUser' | 'oneOff' | 'info' | 'moral';

const RULES: Record<PracticeWarning, RegExp[]> = {
  fear: [
    /strasz|przera[żz]|szokuj|drastyczn|śmier[ćc] od|zniszczysz sobie|wrak człowieka|zdj[ęe]cia (?:zniszczon|płuc)/iu,
    /abschreck|schockier|angst machen|horror/iu,
    /scare|fear appeal|shock(?:ing)? (?:images|tactics)/iu,
  ],
  exUser: [
    /by[łl](?:y|ym|ego|ymi|ych|a|ą|ej)? (?:narkoman|alkoholik|u[żz]ytkownik|uzale[żz]nion)|[śs]wiadectw\p{L}* (?:by[łl]|osoby uzale[żz]nionej)/iu,
    /ehemalige[rn]? (?:süchtige|abhängige|konsument)/iu,
    /ex-?(?:addict|user)s? (?:talk|testimon)/iu,
  ],
  oneOff: [
    /jednorazow[aey] (?:pogadank|prelekcj|wyk[łl]ad|spotkani)|pogadank/iu,
    /einmalige[rn]? (?:vortrag|veranstaltung)/iu,
    /one-?off (?:lecture|talk|assembly)/iu,
  ],
  info: [
    /jak (?:si[ęe] )?za[żz]ywa|sposoby za[żz]ywania|dawk(?:i|owanie) (?:narkotyk|substancj)/iu,
    /konsumformen im detail|dosierung von drogen/iu,
    /how to (?:use|take) drugs|drug dosage/iu,
  ],
  moral: [/moralizow|powinni[śs]cie wstydzi|grzech/iu, /moralisier/iu, /moraliz/iu],
};

/**
 * Negated mentions are good practice, not a problem: "bez straszenia", "nie moralizujemy",
 * "ohne Abschreckung", "avoid scare tactics" – they are removed before the check.
 */
const NEGATED =
  /(?<![\p{L}])(?:bez|nie|unika\p{L}*|zamiast|ohne|kein\p{L}*|vermeid\p{L}*|statt|avoid\p{L}*|no|not|without|instead of)\s+(?:\p{L}+\s+){0,3}?\p{L}*(?:strasz|przera[żz]|szokuj|abschreck|schock|angst|scare|fear|shock|moraliz|moralisier|pogadank|vortr|lecture)\p{L}*/giu;

export function checkPractice(text: string): PracticeWarning[] {
  const t = text.replace(NEGATED, ' ');
  return (Object.keys(RULES) as PracticeWarning[]).filter((k) => RULES[k].some((re) => re.test(t)));
}
