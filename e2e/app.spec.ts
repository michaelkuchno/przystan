import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { go, onboard, unlock, PASSWORD } from './helpers';

test('onboarding creates an encrypted vault and opens the dashboard', async ({ page }) => {
  await onboard(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Dzień dobry|Dobry wieczór/);
  // data at rest: the vault exists, no plain text client data in IndexedDB
  const vault = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const r = indexedDB.open('przystan');
        r.onsuccess = () => {
          const tx = r.result.transaction('meta', 'readonly');
          const g = tx.objectStore('meta').get('vault');
          g.onsuccess = () => resolve(g.result?.value);
        };
      }),
  );
  expect(vault).toMatchObject({ iterations: 600000 });
});

test('add a client with a pedagogical diagnosis', async ({ page }) => {
  await onboard(page);
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click(); // first-client privacy notice
  await page.getByLabel('Kod / inicjały').fill('AK-17'); // first-client privacy notice
  await page.getByRole('radio', { name: 'Kuratela sądowa' }).click();
  await page.getByRole('checkbox', { name: 'Alkohol' }).click();
  await page.getByLabel('Mocne strony i zasoby').fill('Gotuje dla młodszego rodzeństwa');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('heading', { name: 'AK-17' })).toBeVisible();

  await page.getByRole('tab', { name: 'Diagnoza' }).click();
  await page.getByRole('button', { name: 'Rozpocznij diagnozę' }).click();
  await page.getByRole('radio', { name: /^2 – / }).first().click();
  await page.getByLabel('Wnioski i kierunki pracy').fill('Wzmacniać relacje z rodziną.');
  await expect(page.getByText('Zapisano').first()).toBeVisible();
  await expect(page.locator('.recharts-polar-grid').first()).toBeVisible();

  // encrypted at rest
  const raw = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open('przystan');
        r.onsuccess = () => {
          const g = r.result.transaction('records', 'readonly').objectStore('records').getAll();
          g.onsuccess = () => resolve(JSON.stringify(g.result));
        };
      }),
  );
  expect(raw).not.toContain('AK-17');
  expect(raw).not.toContain('Gotuje');
});

test('session with an interactive tool and a screening', async ({ page }) => {
  await onboard(page);
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click(); // first-client privacy notice
  await page.getByLabel('Kod / inicjały').fill('MN-30');
  await page.getByLabel('Płeć').selectOption('male');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('heading', { name: 'MN-30' })).toBeVisible();

  await page.getByRole('link', { name: 'Spotkanie' }).click();
  await page.getByRole('button', { name: 'Zapisz i rozpocznij' }).click();
  await expect(page.getByText('Tryb spotkania').first()).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByLabel('Szybkie notatki').fill('Rozmowa o motywacji.');

  await page.getByRole('link', { name: 'Linijka gotowości' }).click();
  await expect(page.getByRole('heading', { name: 'Linijka gotowości' })).toBeVisible();
  await page.getByRole('slider', { name: 'Na ile jesteś gotowy/a zacząć?' }).press('ArrowRight');
  await page.getByRole('button', { name: 'Zapisz wynik' }).click();
  await expect(page.getByText('Wynik zapisany w karcie')).toBeVisible();

  await expect(page.getByText('Tryb spotkania').first()).toBeVisible();
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await page.getByLabel('Cel spotkania').fill('Ocena gotowości do zmiany');
  await page.getByRole('button', { name: 'Zapisz i zakończ' }).click();
  await expect(page.getByText('Odbyte').first()).toBeVisible();

  // screening
  await go(page, '#/screening/AUDIT-C');
  await page.getByLabel('Klient').or(page.getByLabel('Podopieczny')).selectOption({ label: 'MN-30' });
  const groups = page.getByRole('radiogroup');
  await groups.nth(0).getByRole('radio').nth(3).click();
  await groups.nth(1).getByRole('radio').nth(1).click();
  await groups.nth(2).getByRole('radio').nth(1).click();
  await expect(page.getByText('Wynik dodatni – picie ryzykowne')).toBeVisible();
  await page.getByRole('button', { name: 'Zapisz w karcie' }).click();
  await expect(page.getByRole('heading', { name: 'AUDIT-C' })).toBeVisible();
  await expect(page.getByText('Linijka gotowości').first()).toBeVisible();
});

test('prevention programme with PDF export', async ({ page }) => {
  await onboard(page);
  await go(page, '#/prevention');
  await page.getByRole('button', { name: 'Nowy program' }).first().click();
  await page.getByLabel('Nazwa programu').fill('Mocni razem');
  await page.getByLabel('Środowisko').fill('SP nr 5');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByLabel('Grupa docelowa').fill('Klasy 7');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByLabel('Cel ogólny').fill('Opóźnienie inicjacji alkoholowej');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByRole('button', { name: 'Wskaźnik' }).click();
  await page.getByLabel('Wskaźnik', { exact: true }).fill('Wiedza o normach');
  await page.getByLabel('Przed (1–5)').fill('2.5');
  await page.getByLabel('Po (1–5)').fill('3.8');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Gotowe – PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^mocni-razem-\d{4}-\d{2}-\d{2}\.pdf$/);
  const path = await file.path();
  expect(readFileSync(path!).subarray(0, 5).toString()).toBe('%PDF-');
});

test('language switch to English and back', async ({ page }) => {
  await onboard(page);
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await go(page, '#/tools');
  await expect(page.getByText('Urge surfing')).toBeVisible();
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'Polski' }).click();
  await expect(page.getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
});

test('demo mode with case studies and the MI simulator', async ({ page }) => {
  await onboard(page, 'demo');
  await expect(page.getByText(/DEMO/).first()).toBeVisible();
  await go(page, '#/clients');
  await expect(page.getByRole('link', { name: /KW-16/ })).toBeVisible();
  await go(page, '#/simulator');
  await page.getByRole('link').filter({ hasText: 'Kacper' }).first().click();
  await page.getByRole('button', { name: 'Rozpocznij rozmowę' }).click();
  const summary = page.getByRole('heading', { name: 'Podsumowanie' });
  for (let i = 0; i < 12 && !(await summary.isVisible()); i++) {
    // after the last answer the options animate out – a click on a vanishing option is not an error
    await page
      .locator('main button.block')
      .first()
      .click({ timeout: 3_000 })
      .catch(() => undefined);
  }
  await expect(summary).toBeVisible();
});

test('works offline after the first visit', async ({ page, context }) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await unlock(page);
  await go(page, '#/knowledge');
  await expect(page.getByRole('heading', { name: 'Wiedza' })).toBeVisible();
  await go(page, '#/tools/breathing');
  await expect(page.getByRole('heading', { name: 'Ćwiczenie oddechowe' })).toBeVisible();
  await context.setOffline(false);
});

test('encrypted backup and restore', async ({ page }) => {
  await onboard(page);
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click(); // first-client privacy notice
  await page.getByLabel('Kod / inicjały').fill('BK-01');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('heading', { name: 'BK-01' })).toBeVisible();

  await go(page, '#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Utwórz kopię' }).click();
  const file = await download;
  const backupPath = await file.path();
  const text = readFileSync(backupPath!, 'utf8');
  expect(text).toContain('przystan-backup');
  expect(text).not.toContain('BK-01');

  // wipe and set up again with a different password
  await page.getByRole('button', { name: 'Usuń wszystkie dane' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Usuń wszystkie dane' }).click();
  await expect(page.getByRole('heading', { name: 'Witaj w Przystani' })).toBeVisible();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByLabel('Hasło lub PIN (min. 6 znaków)').fill('inne-haslo');
  await page.getByLabel('Powtórz hasło').fill('inne-haslo');
  await page.getByRole('checkbox', { name: /Rozumiem, że bez hasła/ }).check();
  await page.getByRole('button', { name: 'Zaszyfruj i dalej' }).click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByRole('button', { name: /Tryb praktyczny/ }).click();
  await go(page, '#/clients');
  await expect(page.getByText(/Nie masz jeszcze żadnych/)).toBeVisible();

  await go(page, '#/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Przywróć z kopii' }).click();
  await (await chooser).setFiles(backupPath!);
  await page.getByLabel('Hasło kopii').fill('złe');
  await page.getByRole('button', { name: 'Przywróć', exact: true }).click();
  await expect(page.getByText('Nieprawidłowe hasło kopii.')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Hasło kopii').fill(PASSWORD);
  await page.getByRole('button', { name: 'Przywróć', exact: true }).click();
  await expect(page.getByText(/Przywrócono/)).toBeVisible({ timeout: 15_000 });
  await go(page, '#/clients');
  await expect(page.getByRole('link', { name: /BK-01/ })).toBeVisible();
});

test('presentation mode hides identifiers and navigates with arrows @desktop', async ({ page }) => {
  await onboard(page, 'demo');
  await page.getByRole('button', { name: 'Włącz tryb prezentacji' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-presentation', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#\/clients$/);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/#\/$/);
});

test('no horizontal scrolling at phone width on any screen', async ({ page }) => {
  await onboard(page, 'demo');
  const routes = [
    '#/',
    '#/clients',
    '#/clients/demo-01',
    '#/clients/demo-01/diagnosis',
    '#/clients/demo-01/ipr',
    '#/clients/demo-01/relapse',
    '#/clients/demo-01/measurements',
    '#/clients/demo-01/timeline',
    '#/clients/demo-01/genogram',
    '#/clients/demo-03/readaptation',
    '#/clients/demo-07/family',
    '#/meetings',
    '#/recipes',
    '#/tools',
    '#/tools/urgeSurfing',
    '#/tools/decisionalBalance',
    '#/tools/triggerMap',
    '#/tools/socialSkills',
    '#/screening',
    '#/screening/AUDIT',
    '#/prevention',
    '#/prevention/demo-08-prev',
    '#/resocialization',
    '#/family',
    '#/help',
    '#/help/map',
    '#/help/law',
    '#/knowledge',
    '#/simulator',
    '#/learn',
    '#/learn/exam',
    '#/settings',
    '#/info/privacy',
    '#/crisis',
    '#/more',
    '#/search',
    '#/practice',
    '#/notes',
    '#/notes/new?type=supervision',
    '#/case-study/demo-01',
    '#/audit',
    '#/trash',
    '#/settings/ai',
    '#/ai/info',
    '#/ask',
    '#/learn/generate',
    '#/learn/exam-open',
    '#/simulator/mow-cannabis/live',
    '#/messages',
    '#/messages/history',
    '#/messages/contacts',
    '#/settings/notify',
  ];
  const overflow: string[] = [];
  for (const r of routes) {
    await go(page, r);
    await page.waitForTimeout(350);
    const w = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.visualViewport?.width ?? window.innerWidth,
    ]);
    if (w[0]! > w[1]! + 1) overflow.push(`${r}: ${w[0]} > ${w[1]}`);
  }
  expect(overflow).toEqual([]);
});

test('main screens have no serious accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await onboard(page, 'demo');
  const routes = [
    '#/',
    '#/clients',
    '#/clients/demo-01',
    '#/clients/demo-01/diagnosis',
    '#/clients/demo-01/genogram',
    '#/meetings',
    '#/tools',
    '#/tools/urgeSurfing',
    '#/screening/AUDIT',
    '#/prevention/demo-08-prev',
    '#/help',
    '#/knowledge',
    '#/simulator',
    '#/learn',
    '#/settings',
    '#/practice',
    '#/notes',
    '#/notes/new?type=supervision',
    '#/case-study/demo-01',
    '#/audit',
    '#/trash',
    '#/settings/ai',
    '#/ai/info',
    '#/ask',
    '#/learn/generate',
    '#/learn/exam-open',
    '#/simulator/mow-cannabis/live',
  ];
  const problems: string[] = [];
  for (const r of routes) {
    await go(page, r);
    await page.waitForTimeout(500);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'))
      problems.push(
        `${r} ${v.id}: ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
      );
  }
  expect(problems).toEqual([]);
});
