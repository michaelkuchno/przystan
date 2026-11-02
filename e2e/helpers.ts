import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Przystań-2026!';

/** Completes onboarding in Polish with the given mode. */
export async function onboard(page: Page, mode: 'practice' | 'demo' = 'practice') {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Witaj w Przystani' })).toBeVisible();
  await page.getByRole('radio', { name: /Polski/ }).click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByLabel('Hasło lub PIN (min. 6 znaków)').fill(PASSWORD);
  await page.getByLabel('Powtórz hasło').fill(PASSWORD);
  await page.getByRole('checkbox', { name: /Rozumiem, że bez hasła/ }).check();
  await page.getByRole('button', { name: 'Zaszyfruj i dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Co znajdziesz w środku' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByRole('button', { name: mode === 'demo' ? /Tryb szkoleniowy/ : /Tryb praktyczny/ }).click();
  await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });
}

export async function unlock(page: Page, password = PASSWORD) {
  await page.getByLabel('Hasło', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Odblokuj' }).click();
  await expect(page.locator('#main')).toBeVisible({ timeout: 20_000 });
}

/** Navigates using the hash router. */
export async function go(page: Page, hash: string) {
  await page.evaluate((h) => (window.location.hash = h), hash);
}
