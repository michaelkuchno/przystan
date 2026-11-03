/**
 * On-screen keyboard handling for phones (Android WebView, iOS Safari, PWA).
 *
 * - Marks `<html data-keyboard="open">` while the keyboard covers part of the layout viewport,
 *   so the bottom tab bar is hidden and stops covering the focused field (see index.css).
 * - Scrolls the focused field into the visible area when the keyboard appears.
 *
 * Android: Capacitor's SystemBars plugin pads the WebView by the IME height, so the window
 * itself shrinks; iOS / browsers shrink only `visualViewport`. Both cases are covered by
 * comparing the current visible height with the tallest height seen for the current width.
 */

const KEYBOARD_MIN_PX = 150;

export function isEditable(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color', 'image'].includes(el.type);
  }
  return false;
}

/** Pure decision used by the listener (and the unit test). */
export function keyboardOpen(tallest: number, visible: number, focusedEditable: boolean): boolean {
  return focusedEditable && tallest - visible > KEYBOARD_MIN_PX;
}

export function initViewport(win: Window = window) {
  const doc = win.document;
  const root = doc.documentElement;
  let width = win.innerWidth;
  let tallest = win.innerHeight;

  const visibleHeight = () => win.visualViewport?.height ?? win.innerHeight;

  const update = () => {
    if (Math.abs(win.innerWidth - width) > 40) {
      // rotation / split screen: start measuring again
      width = win.innerWidth;
      tallest = win.innerHeight;
    }
    const editing = isEditable(doc.activeElement);
    if (!editing) tallest = Math.max(tallest, win.innerHeight, visibleHeight());
    const open = keyboardOpen(tallest, visibleHeight(), editing);
    if (open) root.dataset.keyboard = 'open';
    else delete root.dataset.keyboard;
    return open;
  };

  const reveal = () => {
    const el = doc.activeElement;
    if (!isEditable(el)) return;
    const rect = el.getBoundingClientRect();
    const vv = win.visualViewport;
    const top = vv?.offsetTop ?? 0;
    const bottom = top + visibleHeight();
    // 72 px ≈ sticky header; keep a margin below the field for its hint / error text
    if (rect.top < top + 72 || rect.bottom > bottom - 24) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const onResize = () => {
    if (update()) reveal();
  };
  win.visualViewport?.addEventListener('resize', onResize);
  win.addEventListener('resize', onResize);
  doc.addEventListener('focusin', () => {
    update();
    // the keyboard animates in; check again once it has settled
    win.setTimeout(() => {
      update();
      reveal();
    }, 350);
  });
  doc.addEventListener('focusout', () => win.setTimeout(update, 50));
}
