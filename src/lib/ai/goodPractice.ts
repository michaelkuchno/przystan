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

export function checkPractice(text: string): PracticeWarning[] {
  return (Object.keys(RULES) as PracticeWarning[]).filter((k) => RULES[k].some((re) => re.test(text)));
}
