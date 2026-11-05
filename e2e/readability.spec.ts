/**
 * Readability audit on narrow Android phones (360 px, also with the largest system font):
 * no single-line field whose text does not fit (scrolling "letter by letter"), no cramped text
 * areas with inner scrolling, no cut-off texts and no tiny fonts – on every screen and tab,
 * with realistic long texts (demo data + a long lesson step).
 */
import { expect, test, type Page } from '@playwright/test';
import { go, onboard } from './helpers';

const STATIC = [
  '#/',
  '#/clients',
  '#/meetings',
  '#/recipes',
  '#/tools',
  '#/screening',
  '#/prevention',
  '#/resocialization',
  '#/family',
  '#/help',
  '#/practice',
  '#/notes',
  '#/notes/new?type=supervision',
  '#/knowledge',
  '#/simulator',
  '#/learn',
  '#/learn/generate',
  '#/learn/exam-open',
  '#/settings',
  '#/settings/ai',
  '#/settings/notify',
  '#/messages',
  '#/messages/contacts',
  '#/studies',
  '#/studies/search',
  '#/ask',
  '#/ai/info',
  '#/audit',
  '#/trash',
  '#/crisis',
  '#/more',
  '#/search',
];

/** First detail link of each list screen (ids differ between runs). */
const LISTS: [string, RegExp][] = [
  ['#/clients', /^#\/clients\/[^/]+$/],
  ['#/meetings', /^#\/meetings\/[^/]+$/],
  ['#/recipes', /^#\/recipes\/[^/]+$/],
  ['#/tools', /^#\/tools\/[^/]+$/],
  ['#/screening', /^#\/screening\/[^/]+$/],
  ['#/prevention', /^#\/prevention\/[^/]+$/],
  ['#/notes', /^#\/notes\/[^/]+$/],
  ['#/knowledge', /^#\/knowledge\/[^/]+$/],
  ['#/simulator', /^#\/simulator\/[^/]+$/],
  ['#/learn', /^#\/learn\/deck\/[^/]+$/],
  ['#/studies', /^#\/studies\/course\/[^/]+$/],
];

async function audit(page: Page, where: string): Promise<string[]> {
  return page.evaluate((w) => {
    const out: string[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const name = (el: Element) =>
      (el.getAttribute('aria-label') ||
        (el as HTMLInputElement).labels?.[0]?.textContent ||
        el.getAttribute('placeholder') ||
        el.id ||
        el.tagName
      ).slice(0, 40);
    const SINGLE = ['text', 'search', 'email', 'url', 'tel', 'password', ''];
    for (const el of Array.from(document.querySelectorAll('input'))) {
      if (!SINGLE.includes(el.type) || !visible(el) || !el.value) continue;
      if (el.scrollWidth > el.clientWidth + 2) out.push(`${w} input overflows: "${name(el)}" = "${el.value.slice(0, 50)}"`);
    }
    for (const el of Array.from(document.querySelectorAll('textarea'))) {
      if (!visible(el) || !el.value) continue;
      if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight < 96)
        out.push(`${w} textarea scrolls inside (${el.clientHeight}px): "${name(el)}"`);
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('#main *, [role=dialog] *'))) {
      if (!visible(el) || el.children.length > 0 || !el.textContent?.trim()) continue;
      // screen-reader-only labels are clipped on purpose; 2-line previews in lists (line-clamp) are intentional
      if (el.getBoundingClientRect().width <= 2) continue;
      const s = getComputedStyle(el);
      const fs = parseFloat(s.fontSize);
      if (fs < 11) out.push(`${w} tiny font ${fs}px: "${el.textContent.trim().slice(0, 40)}"`);
      const clip = s.overflowX === 'hidden' || s.textOverflow === 'ellipsis' || s.overflow === 'hidden';
      if (clip && s.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1)
        out.push(`${w} text cut off: "${el.textContent.trim().slice(0, 60)}"`);
    }
    return out;
  }, where);
}

async function auditWithTabs(page: Page, route: string, problems: string[]) {
  await go(page, route);
  await page.waitForTimeout(500);
  problems.push(...(await audit(page, route)));
  const tabs = page.locator('#main [role=tab]');
  const n = Math.min(await tabs.count(), 12);
  for (let i = 1; i < n; i++) {
    const tab = tabs.nth(i);
    if (!(await tab.isVisible())) continue;
    const label = ((await tab.textContent()) ?? '').trim();
    await tab.click();
    await page.waitForTimeout(350);
    problems.push(...(await audit(page, `${route} [${label}]`)));
  }
}

test('readability: no squeezed, cut-off or letter-by-letter scrolling texts on narrow phones @android', async ({ page }) => {
  test.setTimeout(600_000);
  await onboard(page, 'demo');
  // a realistic long lesson step (as written by hand or by AI)
  await go(page, '#/recipes');
  await page.getByRole('button', { name: /Nowy przepis/ }).first().click();
  await page.getByRole('button', { name: /Własny krok/ }).click();
  const long =
    'Prowadzący zaprasza uczestników do rundy: każdy mówi jednym zdaniem, z czym przychodzi dziś na zajęcia, a pozostali słuchają bez komentowania; potem krótkie podsumowanie wspólnych wątków i zapisanie ich na flipcharcie.';
  await page.getByLabel('Uwagi do prowadzenia').first().fill(long);
  await page.getByLabel('Krok 1').fill('Runda otwierająca – z czym dziś przychodzę i czego potrzebuję od grupy');
  await page.waitForTimeout(400);
  const recipeUrl = await page.evaluate(() => location.hash);

  const routes = new Set<string>([...STATIC, recipeUrl]);
  for (const [list, re] of LISTS) {
    await go(page, list);
    await page.waitForTimeout(500);
    const hrefs = await page.locator('#main a[href^="#/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    const first = hrefs.find((h) => re.test(h));
    if (first) routes.add(first);
  }
  const problems: string[] = [];
  for (const r of routes) await auditWithTabs(page, r, problems);
  expect([...new Set(problems)]).toEqual([]);
});
