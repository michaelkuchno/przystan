/**
 * Manual test against the REAL services (not in CI): Gemini endpoint (wrong key → readable error,
 * proves CORS) and the real local embedding model (≈ 145 MB download). Run: npm run e2e:ai-real
 */
import { expect, test } from '@playwright/test';
import { go, onboard, unlock } from '../e2e/helpers';

test.setTimeout(15 * 60_000);

test('real Gemini endpoint: CORS works and a wrong key is reported', async ({ page }) => {
  await onboard(page, 'demo');
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Chmura/ }).click();
  await page.getByLabel('Klucz API Gemini').fill(`AQ.Ab${'B'.repeat(46)}`);
  await page.getByRole('button', { name: 'Zapisz klucz' }).click();
  await page.getByRole('button', { name: 'Sprawdź połączenie' }).click();
  await expect(page.getByText(/Klucz Gemini został odrzucony/)).toBeVisible({ timeout: 30_000 });
});

test('real local embeddings: download with consent, semantic search offline', async ({ page }) => {
  const consoleErr: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErr.push(m.text()));
  await onboard(page, 'demo');
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Lokalny/ }).click();
  const row = page.locator('li', { hasText: 'Wyszukiwanie semantyczne' });
  await row.getByRole('button', { name: 'Pobierz' }).click();
  await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: 'Pobierz' }).click();
  await expect(row.getByText('Pobrany')).toBeVisible({ timeout: 10 * 60_000 });
  await go(page, '#/ask');
  await expect(page.getByText(/Przygotowuję indeks/)).toBeHidden({ timeout: 5 * 60_000 });
  await expect(page.getByText(/Wyszukiwanie słów kluczowych/)).toHaveCount(0);
  // network off: the model must work from the cache
  await page.context().setOffline(true);
  await page.getByLabel(/np\. Jak reagować/).fill('jak rozmawiać z kimś, kto nie chce się zmieniać');
  await page
    .locator('form')
    .getByRole('button', { name: /Szukaj|Zapytaj/ })
    .click();
  const first = page.getByTestId('ask-hits').getByRole('listitem').first();
  await expect(first).toBeVisible({ timeout: 120_000 });
  console.log('TOP HITS:', await page.getByTestId('ask-hits').innerText());
  console.log('CONSOLE ERRORS:', consoleErr.join('\n'));
});

test('real Whisper: download with consent, transcription runs on the device', async ({ page }) => {
  await page.addInitScript(() => {
    // microphone replaced by 3 s of a quiet tone – checks the pipeline, not the recognition quality
    (navigator.mediaDevices as MediaDevices).getUserMedia = async () => new MediaStream();
    class R {
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.ondataavailable?.({ data: new Blob(['x']) });
        this.onstop?.();
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = R;
    AudioContext.prototype.decodeAudioData = async function () {
      const d = new Float32Array(48000).map((_, i) => 0.05 * Math.sin((2 * Math.PI * 220 * i) / 16000));
      return { numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer;
    };
  });
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await onboard(page, 'demo');
  // second start: the service worker now controls the page (as for every real user after the first visit)
  await page.reload();
  await unlock(page);
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Lokalny/ }).click();
  const row = page.locator('li', { hasText: 'Dyktowanie (Whisper)' });
  await row.getByRole('button', { name: 'Pobierz' }).click();
  await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: 'Pobierz' }).click();
  await expect(row.getByText('Pobrany')).toBeVisible({ timeout: 10 * 60_000 });
  // open the screen first (the service worker controls the page only after the first reload)
  await go(page, '#/notes/new');
  await expect(page.getByRole('button', { name: 'Dyktuj' })).toBeVisible();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Dyktuj' }).click();
  await page.getByRole('button', { name: 'Zakończ dyktowanie' }).click();
  await expect(page.getByRole('button', { name: 'Dyktuj' })).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText(/Dyktowanie wymaga|Serwer AI/)).toHaveCount(0);
  console.log('WHISPER RESULT:', await page.getByLabel('Treść').inputValue(), 'ERRORS:', errors.join(' | '));
});

test('real Gemini key (AQ.… format) in the app: test connection and one live simulator turn', async ({ page }) => {
  const key = process.env.GEMINI_KEY;
  test.skip(!key, 'set GEMINI_KEY to run');
  await onboard(page, 'demo');
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Chmura/ }).click();
  await page.getByLabel('Klucz API Gemini').fill(key!);
  await expect(page.getByText('To nie wygląda na klucz Gemini')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zapisz klucz' }).click();
  await page.getByRole('button', { name: 'Sprawdź połączenie' }).click();
  await expect(page.getByText('Połączenie działa')).toBeVisible({ timeout: 120_000 });
  await go(page, '#/simulator/mow-cannabis/live');
  await page.getByLabel('Twoja odpowiedź:').fill('Brzmi, że z jednej strony to cię odpręża, a z drugiej masz przez to kłopoty.');
  await page.getByRole('button', { name: 'Wyślij' }).click();
  await expect(page.getByTestId('live-verdict').first()).toBeVisible({ timeout: 180_000 });
  console.log('LIVE VERDICT:', await page.getByTestId('live-verdict').first().innerText());
});
