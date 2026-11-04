/** Appends text on a new line (dictation, AI proposals) – never replaces what is there. */
export const appendText = (current: string, add: string) => (current.trim() ? `${current.trimEnd()}\n${add}` : add);
