/**
 * Android phone profiles (see playwright.config.ts: android-360, android-412, android-large-font).
 *
 * The Android app runs edge-to-edge: Capacitor's SystemBars plugin injects
 * --safe-area-inset-* CSS variables and MainActivity injects --os-font-scale. Here the same
 * variables are injected with typical Samsung One UI values (status bar 32 px, gesture bar 24 px,
 * 3-button navigation 48 px) to check that nothing is drawn under the system bars.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { go, onboard } from './helpers';

interface AndroidMeta {
  fontScale: number;
  insetTop: number;
  insetBottom: number;
}

const meta = (info: TestInfo) => info.project.metadata as AndroidMeta;

async function injectAndroidVars(page: Page, m: AndroidMeta) {
  await page.addInitScript((v: AndroidMeta) => {
    const apply = () => {
      const s = document.documentElement.style;
      s.setProperty('--safe-area-inset-top', `${v.insetTop}px`);
      s.setProperty('--safe-area-inset-bottom', `${v.insetBottom}px`);
      s.setProperty('--safe-area-inset-left', '0px');
      s.setProperty('--safe-area-inset-right', '0px');
      s.setProperty('--os-font-scale', String(v.fontScale));
    };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, m);
}

const ROUTES = [
  '#/',
  '#/clients',
  '#/clients/demo-01',
  '#/clients/demo-01/diagnosis',
  '#/clients/demo-01/ipr',
  '#/meetings',
  '#/tools',
  '#/tools/urgeSurfing',
  '#/screening/AUDIT',
  '#/prevention/demo-08-prev',
  '#/help',
  '#/help/map',
  '#/knowledge',
  '#/simulator',
  '#/learn',
  '#/settings',
  '#/more',
  '#/search',
  '#/crisis',
];

test.beforeEach(async ({ page }, info) => {
  await injectAndroidVars(page, meta(info));
});

test('nothing overlaps the system bars and no horizontal scrolling @android', async ({ page }, info) => {
  const m = meta(info);
  await onboard(page, 'demo');
  const problems: string[] = [];
  for (const r of ROUTES) {
    await go(page, r);
    await page.waitForTimeout(350);
    const res = await page.evaluate(
      ({ top, bottom }) => {
        const out: string[] = [];
        const vh = window.innerHeight;
        const vw = window.visualViewport?.width ?? window.innerWidth;
        if (document.documentElement.scrollWidth > vw + 1)
          out.push(`horizontal scroll ${document.documentElement.scrollWidth} > ${vw}`);
        window.scrollTo(0, 0);
        const header = document.querySelector('header');
        const bar = header?.firstElementChild?.getBoundingClientRect();
        if (bar && bar.top < top - 0.5) out.push(`header content at ${bar.top}px, under the status bar (${top}px)`);
        const nav = document.querySelector('nav.fixed');
        const links = nav ? [...nav.querySelectorAll('a')] : [];
        for (const a of links) {
          const rc = a.getBoundingClientRect();
          if (rc.bottom > vh - bottom + 0.5) out.push(`tab "${a.textContent}" bottom ${rc.bottom} > ${vh - bottom}`);
          if (rc.right > vw + 0.5) out.push(`tab "${a.textContent}" off-screen`);
        }
        // the end of the page must be reachable above the tab bar
        window.scrollTo(0, document.documentElement.scrollHeight);
        const main = document.getElementById('main');
        const navRect = nav?.getBoundingClientRect();
        const navTop = navRect && navRect.height > 0 ? navRect.top : vh;
        const last = main?.lastElementChild?.getBoundingClientRect();
        if (last && last.bottom > navTop + 0.5) out.push(`end of page hidden under the tab bar (${last.bottom} > ${navTop})`);
        window.scrollTo(0, 0);
        return out;
      },
      { top: m.insetTop, bottom: m.insetBottom },
    );
    problems.push(...res.map((x) => `${r}: ${x}`));
  }
  expect(problems).toEqual([]);
});

test('onboarding and lock screen stay clear of the system bars @android', async ({ page }, info) => {
  const m = meta(info);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Witaj w Przystani' })).toBeVisible();
  await page.waitForTimeout(500); // step-in animation (translateX) finished
  const check = () =>
    page.evaluate(
      ({ top, bottom }) => {
        const vh = window.innerHeight;
        const out: string[] = [];
        const vw = window.visualViewport?.width ?? window.innerWidth;
        if (document.documentElement.scrollWidth > vw + 1) out.push(`horizontal scroll ${document.documentElement.scrollWidth} > ${vw}`);
        for (const el of document.querySelectorAll('button, a, h1, input')) {
          const rc = el.getBoundingClientRect();
          if (rc.height === 0) continue;
          const docTop = rc.top + window.scrollY;
          if (docTop < top - 0.5) out.push(`${el.tagName} "${el.textContent?.trim()}" under the status bar`);
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
        const btns = [...document.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0);
        const lastBtn = btns.at(-1)?.getBoundingClientRect();
        if (lastBtn && lastBtn.bottom > vh - bottom + 0.5) out.push(`last button under the navigation bar`);
        window.scrollTo(0, 0);
        return out;
      },
      { top: m.insetTop, bottom: m.insetBottom },
    );
  expect(await check()).toEqual([]);
});

test('the keyboard does not cover the focused field and hides the tab bar @android', async ({ page }) => {
  await onboard(page, 'practice');
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click(); // first-client privacy notice
  const field = page.locator('#main').locator('input[type="text"], input:not([type]), textarea').last();
  await expect(field).toBeVisible();
  await field.scrollIntoViewIfNeeded();
  await field.focus();
  // simulate the on-screen keyboard: the visible viewport shrinks by ~45 %
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.width, height: Math.round(vp.height * 0.55) });
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await expect(page.locator('nav.fixed')).toBeHidden();
  await page.waitForTimeout(700);
  const box = await field.boundingBox();
  const h = page.viewportSize()!.height;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(h);
  // keyboard closed again
  await field.blur();
  await page.setViewportSize(vp);
  await expect(page.locator('html')).not.toHaveAttribute('data-keyboard', 'open');
  await expect(page.locator('nav.fixed')).toBeVisible();
});
