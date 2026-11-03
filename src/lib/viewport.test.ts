import { describe, expect, it } from 'vitest';
import { isEditable, keyboardOpen } from './viewport';

describe('keyboard detection', () => {
  it('needs a focused editable field and a clearly smaller viewport', () => {
    expect(keyboardOpen(800, 450, true)).toBe(true);
    expect(keyboardOpen(800, 450, false)).toBe(false); // e.g. browser toolbar / split screen
    expect(keyboardOpen(800, 720, true)).toBe(false); // URL bar collapsing, not a keyboard
  });

  it('recognises editable elements', () => {
    const text = document.createElement('input');
    const box = document.createElement('input');
    box.type = 'checkbox';
    expect(isEditable(text)).toBe(true);
    expect(isEditable(document.createElement('textarea'))).toBe(true);
    expect(isEditable(box)).toBe(false);
    expect(isEditable(document.createElement('button'))).toBe(false);
    expect(isEditable(null)).toBe(false);
  });
});
