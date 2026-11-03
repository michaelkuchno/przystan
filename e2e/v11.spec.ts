/**
 * Version 1.1: German / Switzerland, practice log, notebook & supervision, anonymous case study,
 * backup reminder, biometric option.
 */
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { go, onboard, PASSWORD } from './helpers';

test('German UI with Switzerland as the country of work', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /Deutsch/ }).click();
  await expect(page.getByRole('heading', { name: 'Willkommen bei Przystań' })).toBeVisible();
  await page.getByRole('radio', { name: 'Schweiz', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Schweiz', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByLabel('Passwort oder PIN (mind. 6 Zeichen)').fill(PASSWORD);
  await page.getByLabel('Passwort wiederholen').fill(PASSWORD);
  await page.getByRole('checkbox', { name: /Ich verstehe/ }).check();
  await page.getByRole('button', { name: 'Verschlüsseln und weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: /Übungsmodus/ }).click();
  await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });

  // Swiss demo cases only
  await go(page, '#/clients');
  await expect(page.getByRole('link', { name: /LM-17/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /KW-16/ })).toHaveCount(0);

  // Swiss help system
  await go(page, '#/help/map');
  await expect(page.getByText('Berner Gesundheit', { exact: false }).first()).toBeVisible();
  await go(page, '#/crisis');
  const headings = page.locator('#main h2');
  await expect(headings.first()).toHaveText(/Schweiz/i);
  await expect(page.getByRole('link', { name: /143/ })).toBeVisible();

  // Swiss scenarios first in the simulator
  await go(page, '#/simulator');
  await expect(page.locator('#main a').first()).toContainText('Schweiz');

  // Swiss spelling throughout the visible UI
  for (const r of ['#/', '#/help', '#/settings', '#/knowledge']) {
    await go(page, r);
    await page.waitForTimeout(300);
    expect(await page.locator('body').innerText(), r).not.toContain('ß');
  }
});

test('country of work is independent of the language (Polish UI, Swiss help system)', async ({ page }) => {
  await onboard(page, 'practice');
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'Szwajcaria' }).click();
  await go(page, '#/help/map');
  await expect(page.getByText('Berner Gesundheit', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/kanton Berno/).first()).toBeVisible();
  await go(page, '#/help/law');
  await expect(page.getByText(/Betäubungsmittelgesetz|BetmG/).first()).toBeVisible();
});

test('practice log: entries, hour counter and PDF for the supervisor', async ({ page }) => {
  await onboard(page, 'practice');
  await go(page, '#/practice');
  await expect(page.getByText('0 / 90 h')).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj wpis' }).first().click();
  await page.getByLabel('Liczba godzin').fill('6');
  await page.getByLabel('Placówka').fill('Poradnia profilaktyki, Kraków');
  await page.getByLabel('Rodzaj zajęć').selectOption('group');
  await page.getByLabel('Opis').fill('Zajęcia socjoterapeutyczne, tel. 600 123 456');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('6 / 90 h')).toBeVisible();
  await expect(page.getByText('Pozostało 84 h')).toBeVisible();
  await page.getByLabel('Cel (h)').fill('120');
  await expect(page.getByText('6 / 120 h')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF dla opiekuna' }).click();
  const file = await download;
  expect(readFileSync((await file.path())!).subarray(0, 5).toString()).toBe('%PDF-');
});

test('supervision note with a task appears on the dashboard and in search', async ({ page }) => {
  await onboard(page, 'practice');
  await go(page, '#/notes');
  await page.getByRole('link', { name: 'Superwizja' }).click();
  await page.getByLabel('Tytuł').fill('Superwizja grupowa – opór');
  await page.getByLabel('Rola osoby').fill('superwizorka');
  await page.getByLabel('Wnioski').fill('Więcej odzwierciedleń złożonych');
  await page.getByLabel('Nowe zadanie').fill('Przećwiczyć odzwierciedlenia');
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click();
  await expect(page.getByText('Zapisano').first()).toBeVisible();
  await expect(page).toHaveURL(/#\/notes\/[\w-]+$/);
  await go(page, '#/');
  await expect(page.getByText('Zadania z superwizji')).toBeVisible();
  await expect(page.getByRole('link', { name: /Przećwiczyć odzwierciedlenia/ })).toBeVisible();
  await go(page, '#/search');
  await page.getByPlaceholder('Szukaj we wszystkich modułach…').fill('odzwierciedlen');
  await expect(page.getByText('Superwizja grupowa – opór')).toBeVisible();
  await go(page, '#/notes');
  await page.getByPlaceholder('Szukaj w notatkach').fill('opor');
  await expect(page.getByRole('link', { name: /Superwizja grupowa/ })).toBeVisible();
});

test('notes are hidden in presentation mode @desktop', async ({ page }) => {
  await onboard(page, 'practice');
  await go(page, '#/notes/new');
  await page.getByLabel('Tytuł').fill('Prywatna notatka');
  await expect(page.getByText('Zapisano').first()).toBeVisible();
  await page.getByRole('button', { name: 'Włącz tryb prezentacji' }).click();
  await go(page, '#/notes');
  await expect(page.getByText('Notatki ukryte')).toBeVisible();
  await expect(page.getByText('Prywatna notatka')).toHaveCount(0);
});

test('anonymous case study: preview without identifiers and PDF', async ({ page }) => {
  await onboard(page, 'demo');
  await go(page, '#/clients/demo-01');
  await page.getByRole('link', { name: 'Studium przypadku' }).click();
  await expect(page.getByRole('heading', { name: 'Anonimowe studium przypadku' })).toBeVisible();
  await expect(page.getByText(/Automatycznie usunięto/)).toBeVisible();
  const texts = await page.locator('#main textarea').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
  expect(texts.length).toBe(5);
  const all = texts.join('\n');
  expect(all).not.toContain('KW-16');
  expect(all).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  expect(all.length).toBeGreaterThan(500);
  // a section can be excluded and the text edited before export
  await page.getByRole('switch', { name: 'Przebieg' }).click();
  await expect(page.locator('#main textarea')).toHaveCount(4);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^studium-przypadku-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('backup reminder on the dashboard; biometric option hidden without WebAuthn PRF', async ({ page }) => {
  // a browser that explicitly reports no PRF support: the option must not be offered
  await page.addInitScript(() => {
    const PKC = window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> } | undefined;
    if (PKC) PKC.getClientCapabilities = async () => ({ 'extension:prf': false });
  });
  await onboard(page, 'practice');
  await go(page, '#/clients/new');
  await page.getByRole('button', { name: 'Rozumiem' }).click();
  await page.getByLabel('Kod / inicjały').fill('ZZ-01');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  // the form navigates to the profile once saved – wait for it before leaving
  await expect(page.getByRole('heading', { name: 'ZZ-01' })).toBeVisible();
  await go(page, '#/');
  await expect(page.getByText('Czas na kopię zapasową')).toBeVisible();
  await page.getByRole('button', { name: 'Jutro' }).click();
  await expect(page.getByText('Czas na kopię zapasową')).toHaveCount(0);
  await go(page, '#/settings');
  await expect(page.getByRole('heading', { name: 'Bezpieczeństwo' })).toBeVisible();
  await expect(page.getByText(/Odblokowanie (odciskiem|Face ID)/)).toHaveCount(0);
});

test('biometric option is offered with a platform authenticator unless PRF is explicitly unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    const PKC = window.PublicKeyCredential as unknown as {
      getClientCapabilities?: () => Promise<Record<string, boolean>>;
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean>;
    };
    // like Safari: PRF works, but getClientCapabilities() does not list it – the option must still appear
    PKC.getClientCapabilities = async () => ({});
    PKC.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
  });
  await onboard(page, 'practice');
  await go(page, '#/settings');
  const sw = page.getByRole('switch', { name: /Odblokowanie Face ID/ });
  await expect(sw).toBeVisible();
  await sw.click();
  // step 1: the password is required; step 2 (a separate tap) opens the system prompt
  await expect(page.getByRole('dialog', { name: 'Włącz odblokowanie biometrią' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dalej', exact: true })).toBeDisabled();
  await page.getByLabel('Obecne hasło').fill('złe-hasło');
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await expect(page.getByText('Obecne hasło jest nieprawidłowe.')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Obecne hasło').fill(PASSWORD);
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Włącz', exact: true })).toBeEnabled({ timeout: 15_000 });
});
