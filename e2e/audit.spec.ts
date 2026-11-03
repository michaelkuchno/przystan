/**
 * Version 1.2: change history with restore, trash, audit log with integrity
 * check and PDF / CSV export, person data export (docs/DECISIONS.md D-049).
 */
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { go, onboard } from './helpers';

async function newNote(page: Page, title: string, body: string) {
  await go(page, '#/notes/new');
  await page.getByLabel('Tytuł').fill(title);
  await page.getByLabel('Treść').fill(body);
  await expect(page.getByText('Zapisano').first()).toBeVisible();
  await expect(page).toHaveURL(/#\/notes\/[\w-]+$/);
}

test('history: an accidental change is undone by restoring the earlier version', async ({ page }) => {
  await onboard(page, 'practice');
  await newNote(page, 'Plan pracy', 'Wersja pierwsza – ważne ustalenia');
  await page.waitForTimeout(800);
  await page.getByLabel('Treść').fill('Przypadkowo skasowane');
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: 'Historia' }).click();
  const dialog = page.getByRole('dialog', { name: 'Historia zmian' });
  await expect(dialog.getByTestId('version')).toHaveCount(2);
  await expect(dialog.getByText('Przypadkowo skasowane')).toBeVisible();
  await dialog.getByRole('button', { name: 'Przywróć tę wersję' }).click();
  await page.getByRole('dialog', { name: 'Przywrócić tę wersję?' }).getByRole('button', { name: 'Przywróć tę wersję' }).click();
  await expect(page.getByText(/Przywrócono wersję z/)).toBeVisible();
  await expect(dialog.getByTestId('version')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Treść')).toHaveValue('Wersja pierwsza – ważne ustalenia');

  // the restored content stays after leaving and coming back
  await go(page, '#/notes');
  await page.getByRole('link', { name: /Plan pracy/ }).click();
  await expect(page.getByLabel('Treść')).toHaveValue('Wersja pierwsza – ważne ustalenia');

  // audit log: all three operations, integrity confirmed
  await go(page, '#/audit');
  const entries = page.getByTestId('audit-entry');
  await expect(entries.filter({ hasText: 'Przywrócono wcześniejszą wersję' })).toHaveCount(1);
  await expect(entries.filter({ hasText: /^Zmieniono/ })).toHaveCount(1);
  await expect(entries.filter({ hasText: /^Utworzono\s*Notatka/ })).toHaveCount(1);
  await expect(
    entries
      .filter({ hasText: 'Odblokowano aplikację' })
      .or(entries.filter({ hasText: 'Utworzono zabezpieczenie' }))
      .first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sprawdź teraz' }).click();
  await expect(page.getByTestId('integrity')).toContainText('Integralność potwierdzona');

  // filter + search
  await page.getByRole('radio', { name: 'Logowania' }).click();
  await expect(entries.filter({ hasText: 'Notatka' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Wszystko' }).click();
  await page.getByLabel('Szukaj w dzienniku').fill('Plan pracy');
  await expect(entries).toHaveCount(3);

  // tapping an entry opens the history of that record
  await entries.first().click();
  await expect(page.getByRole('dialog', { name: 'Historia zmian' }).getByTestId('version')).toHaveCount(3);
});

test('trash: restore a deleted note, delete permanently with the name erased from the log', async ({ page }) => {
  await onboard(page, 'practice');
  await newNote(page, 'Notatka do kosza', 'Treść');
  await page.getByRole('button', { name: 'Usuń' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Potwierdź' }).click();
  await expect(page).toHaveURL(/#\/notes$/);

  await go(page, '#/settings');
  await page.getByRole('link', { name: /Kosz/ }).click();
  const item = page.getByTestId('trash-item');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Notatka „Notatka do kosza”');
  await item.getByRole('button', { name: 'Przywróć' }).click();
  await expect(page.getByText('Kosz jest pusty.')).toBeVisible();
  await go(page, '#/notes');
  await expect(page.getByRole('link', { name: /Notatka do kosza/ })).toBeVisible();

  await page.getByRole('link', { name: /Notatka do kosza/ }).click();
  await page.getByRole('button', { name: 'Usuń' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Potwierdź' }).click();
  await expect(page).toHaveURL(/#\/notes$/);
  await go(page, '#/trash');
  await page.getByTestId('trash-item').getByRole('button', { name: 'Usuń trwale' }).click();
  await page.getByRole('dialog', { name: 'Usunąć trwale?' }).getByRole('button', { name: 'Usuń trwale' }).click();
  await expect(page.getByText('Kosz jest pusty.')).toBeVisible();

  await go(page, '#/audit');
  const entries = page.getByTestId('audit-entry');
  await expect(entries.filter({ hasText: 'Usunięto trwale' })).toHaveCount(1);
  await expect(page.locator('#main')).not.toContainText('Notatka do kosza');
  await expect(entries.filter({ hasText: 'szczegóły usunięte (RODO)' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sprawdź teraz' }).click();
  await expect(page.getByTestId('integrity')).toContainText('Integralność potwierdzona');
});

test('audit log exports (PDF, CSV) are themselves recorded; person data export', async ({ page }) => {
  await onboard(page, 'practice');
  await newNote(page, 'Do raportu', 'x');
  await go(page, '#/audit');
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Raport PDF' }).click();
  let file = await download;
  expect(file.suggestedFilename()).toMatch(/^przystan-audyt-.*\.pdf$/);
  expect(
    readFileSync((await file.path())!)
      .subarray(0, 5)
      .toString(),
  ).toBe('%PDF-');
  await expect(page.getByTestId('audit-entry').filter({ hasText: 'Wyeksportowano dziennik audytu' })).toHaveCount(1);

  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  file = await download;
  const csv = readFileSync((await file.path())!, 'utf8');
  expect(csv).toContain('Integralność łańcucha wpisów: potwierdzona');
  expect(csv).toContain('record.create');
  expect(csv).toContain('audit.export');
  await expect(page.getByTestId('audit-entry').filter({ hasText: 'Wyeksportowano dziennik audytu' })).toHaveCount(2);

  // GDPR export of everything about one person
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click(); // first-client privacy notice
  await page.getByLabel('Kod / inicjały').fill('RODO-1');
  await page
    .getByRole('button', { name: /Zapisz|Utwórz/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /RODO-1/ })).toBeVisible();
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksport danych (RODO)' }).click();
  file = await download;
  const data = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(data.format).toBe('przystan-person-export');
  expect(data.client.code).toBe('RODO-1');
  expect(data.audit.map((a: { action: string }) => a.action)).toContain('record.create');
});

test('training mode has no history button and records nothing', async ({ page }) => {
  await onboard(page, 'demo');
  await go(page, '#/clients/demo-01/ipr');
  await expect(page.locator('#main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Historia' })).toHaveCount(0);
  await go(page, '#/audit');
  await expect(page.getByTestId('audit-entry').filter({ hasText: 'Notatka' })).toHaveCount(0);
});
