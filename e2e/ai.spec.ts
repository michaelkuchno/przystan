/**
 * Optional AI assistant (docs/AI.md). Real providers are never called here: the deterministic
 * fake provider is switched on with window.__PRZYSTAN_FAKE_AI__ before the app loads.
 */
import { expect, test, type Page } from '@playwright/test';
import { go, onboard } from './helpers';

const external = (url: string) => !/^(https?:\/\/localhost[:/]|data:|blob:|chrome-extension:)/.test(url);

async function useFakeAi(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __PRZYSTAN_FAKE_AI__: boolean }).__PRZYSTAN_FAKE_AI__ = true;
  });
}

async function setMode(page: Page, mode: 'Wyłączony' | 'Lokalny' | 'Chmura (Gemini)') {
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: new RegExp(mode.replace(/[()]/g, '\\$&')) }).click();
  await expect(page.getByRole('radio', { name: new RegExp(mode.replace(/[()]/g, '\\$&')) })).toHaveAttribute(
    'aria-checked',
    'true',
  );
}

test('AI off (default): no request leaves the device', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (external(r.url())) requests.push(r.url());
  });
  await onboard(page, 'demo');
  for (const r of [
    '#/',
    '#/simulator/mow-cannabis',
    '#/knowledge/mi-core',
    '#/learn',
    '#/meetings/new',
    '#/notes/new',
    '#/settings',
    '#/settings/ai',
    '#/ai/info',
    '#/ask',
    '#/search',
  ]) {
    await go(page, r);
    await page.waitForTimeout(300);
  }
  // nothing AI-related is offered while it is off
  await go(page, '#/knowledge/mi-core');
  await expect(page.getByRole('button', { name: 'Wytłumacz prościej' })).toHaveCount(0);
  await go(page, '#/simulator/mow-cannabis');
  await expect(page.getByRole('link', { name: /Na żywo z AI/ })).toHaveCount(0);
  await go(page, '#/meetings/new');
  await expect(page.getByRole('button', { name: 'Dyktuj' })).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('AI settings: modes, key check, local models need consent', async ({ page }) => {
  await onboard(page);
  await go(page, '#/settings');
  await page.getByRole('link', { name: /Asystent AI/ }).click();
  await expect(page.getByRole('heading', { name: 'Asystent AI', level: 1 })).toBeVisible();
  await setMode(page, 'Chmura (Gemini)');
  await page.getByLabel('Klucz API Gemini').fill('not-a-key');
  await expect(page.getByText('To nie wygląda na klucz Gemini')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zapisz klucz' })).toBeDisabled();
  await page.getByLabel('Klucz API Gemini').fill(`AIza${'A'.repeat(35)}`);
  await page.getByRole('button', { name: 'Zapisz klucz' }).click();
  await expect(page.getByText(/Klucz zapisany \(…AAAA\)/)).toBeVisible();
  // client data in the cloud is off by default
  await expect(page.getByRole('switch', { name: /Zezwalaj na wysyłkę danych osób/ })).toHaveAttribute('aria-checked', 'false');
  // downloading a model asks for consent first (cancelled here – nothing is downloaded)
  const download = page.getByRole('button', { name: 'Pobierz' }).first();
  if (await download.isEnabled()) {
    await download.click();
    await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toContainText('Hugging Face');
    await page.keyboard.press('Escape');
  }
  await page.getByRole('link', { name: /Jak działa AI/ }).click();
  await expect(page.getByText(/Szwajcarii/).first()).toBeVisible();
  // the change is in the audit log
  await go(page, '#/audit');
  await expect(page.getByText('Zmieniono ustawienia asystenta AI').first()).toBeVisible();
});

test('live simulator with the fake AI: free answers, MITI feedback, statistics', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  await go(page, '#/simulator/mow-cannabis');
  await page.getByRole('link', { name: /Na żywo z AI/ }).click();
  const input = page.getByLabel('Twoja odpowiedź:');
  await input.fill('Brzmi, że z jednej strony to cię odpręża, a z drugiej masz kłopoty w szkole.');
  await page.getByRole('button', { name: 'Wyślij' }).click();
  await expect(page.getByTestId('live-verdict').first()).toContainText('Refleksja złożona');
  await expect(page.getByText('FAKE 1: Może faktycznie coś bym zmienił.')).toBeVisible();
  await input.fill('Musisz przestać palić.');
  await page.getByRole('button', { name: 'Wyślij' }).click();
  await expect(page.getByTestId('live-verdict').nth(1)).toContainText('Moralizowanie');
  await expect(page.getByText(/Nie będziesz mi mówić/)).toBeVisible();
  await expect(page.getByText('Zostało 10 wypowiedzi')).toBeVisible();
  await page.getByRole('button', { name: 'Zakończ rozmowę' }).click();
  await expect(page.getByRole('heading', { name: 'Koniec rozmowy' })).toBeVisible();
  await expect(page.getByText('Refleksje złożone')).toBeVisible();
  await expect(page.getByText('Pomocnicze – zweryfikuj').first()).toBeVisible();
});

test('live simulator needs the cloud; local mode explains why', async ({ page }) => {
  await onboard(page, 'demo');
  await setMode(page, 'Lokalny');
  await go(page, '#/simulator/mow-cannabis/live');
  await expect(page.getByText(/wymaga Chmury/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wersja z wyborem odpowiedzi' })).toBeVisible();
});

test('learning assistant: explain, flashcards from notes, open exam', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  await go(page, '#/knowledge/mi-core');
  await page.getByRole('button', { name: 'Wytłumacz prościej' }).click();
  await expect(page.getByTestId('ai-explain')).toContainText('FAKE');
  await expect(page.getByRole('dialog').getByText('Pomocnicze – zweryfikuj')).toBeVisible();
  await page.keyboard.press('Escape');

  await go(page, '#/learn');
  await page.getByRole('link', { name: /Fiszki z notatek/ }).click();
  await page
    .getByLabel('Tekst do nauki')
    .fill(
      'Dialog motywujący (MI) to styl rozmowy wzmacniający motywację do zmiany. OARS: pytania otwarte, afirmacje, refleksje, podsumowania.',
    );
  await page.getByRole('button', { name: 'Zaproponuj fiszki' }).click();
  await expect(page.getByTestId('generated-cards').getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Zapisz w talii' }).click();
  await expect(page.getByText(/Zapisano 3 fiszki/)).toBeVisible();
  await expect(page).toHaveURL(/#\/learn\/deck\//);

  await go(page, '#/learn/exam-open');
  await expect(page.getByTestId('open-question')).toBeVisible();
  await page.getByLabel('Twoja odpowiedź').fill('To styl rozmowy, który pomaga wydobyć własne powody do zmiany.');
  await page.getByRole('button', { name: 'Oceń odpowiedź' }).click();
  await expect(page.getByTestId('grade')).toContainText('60%');
  await expect(page.getByTestId('grade')).toContainText('Częściowo');
});

test('ask the knowledge base: answer with source links', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  await go(page, '#/ask');
  await page.getByLabel(/np\. Jak reagować/).fill('Czym jest dialog motywujący?');
  await page.getByRole('button', { name: 'Zapytaj' }).click();
  await expect(page.getByTestId('ask-answer')).toContainText('FAKE');
  await expect(page.getByTestId('ask-answer').getByRole('link', { name: '[1]' })).toBeVisible();
  await expect(page.getByTestId('ask-hits').getByRole('listitem').first()).toBeVisible();
});

test('client data: local only by default; cloud only pseudonymised with preview and consent', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  await go(page, '#/meetings/new?client=demo-01');
  const notes = page.getByLabel('Szybkie notatki');
  await notes.fill('KW-16 przyszedł z mamą. Tomasz Nowak (tel. 600 123 456) dzwonił rano. Rozmowa o szkole.');
  await page.getByRole('button', { name: 'Uporządkuj' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Zaproponuj' }).click();
  await expect(page.getByRole('dialog').getByText(/Dane osób są przetwarzane tylko na urządzeniu/)).toBeVisible();
  await page.keyboard.press('Escape');

  // allow pseudonymised sending
  await go(page, '#/settings/ai');
  await page.getByRole('switch', { name: /Zezwalaj na wysyłkę danych osób/ }).click();
  await go(page, '#/meetings/new?client=demo-01');
  await notes.fill('KW-16 przyszedł z mamą. Tomasz Nowak (tel. 600 123 456) dzwonił rano. Rozmowa o szkole.');
  await page.getByRole('button', { name: 'Uporządkuj' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Zaproponuj' }).click();
  const preview = page.getByTestId('cloud-preview');
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText('KW-16');
  await expect(preview).not.toContainText('Tomasz');
  await expect(preview).not.toContainText('600 123 456');
  await expect(preview).toContainText('[Osoba A]');
  await page.getByRole('button', { name: 'Wyślij ten tekst' }).click();
  await expect(page.getByTestId('organized')).toContainText('FAKE: uporządkowany przebieg');
  await page.getByRole('button', { name: 'Wstaw do notatki' }).click();
  await expect(page.getByLabel(/Przebieg/).first()).toHaveValue(/FAKE: uporządkowany przebieg/);
  // every consented cloud send is in the audit log
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).not.toHaveURL(/meetings\/new/);
  await go(page, '#/audit');
  await expect(page.getByText('Wysłano tekst do chmury AI (po zgodzie)').first()).toBeVisible();
});

test('dictation and organising in notes, supervision questions, crisis numbers', async ({ page }) => {
  await useFakeAi(page);
  await page.addInitScript(() => {
    // fake microphone: MediaRecorder + decode are replaced, the fake transcriber returns fixed text
    const md = navigator.mediaDevices as MediaDevices;
    md.getUserMedia = async () => new MediaStream();
    class FakeRecorder {
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['x']) });
        this.onstop?.();
      }
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
    AudioContext.prototype.decodeAudioData = async function () {
      return { numberOfChannels: 1, getChannelData: () => new Float32Array(16000) } as unknown as AudioBuffer;
    };
  });
  await onboard(page, 'demo');
  await setMode(page, 'Lokalny');
  // local mode without a downloaded LLM: supervision questions explain what is missing
  await go(page, '#/notes/new?type=supervision');
  await page.getByRole('button', { name: 'Dyktuj' }).click();
  await page.getByRole('button', { name: 'Zakończ dyktowanie' }).click();
  await expect(page.getByLabel('Przebieg / notatki')).toHaveValue(/FAKE: podyktowany tekst notatki/);
  await setMode(page, 'Chmura (Gemini)');
  await page.getByRole('switch', { name: /Zezwalaj na wysyłkę danych osób/ }).click();
  await go(page, '#/notes/new?type=supervision');
  await page.getByLabel('Przebieg / notatki').fill('Podopieczny mówi, że ojciec go bije i że nie chce już żyć.');
  await page.getByRole('button', { name: 'Pytania refleksyjne' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Zaproponuj pytania' }).click();
  await page.getByRole('button', { name: 'Wyślij ten tekst' }).click();
  await expect(page.getByTestId('supervision-questions')).toContainText('FAKE');
  await expect(page.getByRole('dialog').getByText('Tekst może dotyczyć zagrożenia życia lub przemocy')).toBeVisible();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: /116 123|112|800 70 2222/ })
      .first(),
  ).toBeVisible();
});

test('wizards: session plan proposal with the good-practice check', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  await go(page, '#/recipes');
  await page.getByRole('button', { name: /Nowy/ }).first().click();
  await page.getByRole('button', { name: 'Zaproponuj scenariusz' }).click();
  await page.getByRole('dialog').getByLabel('Cel').fill('Trening odmawiania');
  await page.getByRole('dialog').getByRole('button', { name: 'Zaproponuj', exact: true }).click();
  await expect(page.getByTestId('lesson-plan')).toContainText('Scenki');
  await expect(page.getByRole('dialog').getByTestId('practice-check')).toContainText('Nie znaleziono typowych błędów');
  await page.getByRole('button', { name: 'Dodaj kroki do kreatora' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('input, textarea')].some((e) => (e as HTMLInputElement).value.includes('FAKE: odgrywanie')),
      ),
    )
    .toBe(true);
});

test('presentation mode: AI on client data only with demo data', async ({ page }) => {
  await useFakeAi(page);
  await onboard(page, 'practice');
  await setMode(page, 'Chmura (Gemini)');
  await page.getByRole('switch', { name: /Zezwalaj na wysyłkę danych osób/ }).click();
  await go(page, '#/settings');
  await page.getByRole('switch', { name: /Tryb prezentacji/ }).click();
  await go(page, '#/meetings/new');
  await page.getByLabel('Szybkie notatki').fill('Notatka z pracy z osobą.');
  await page.getByRole('button', { name: 'Uporządkuj' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Zaproponuj' }).click();
  await expect(page.getByRole('dialog').getByText('W trybie prezentacji AI działa tylko na danych demo.')).toBeVisible();
});

test('AI screens with AI on: no horizontal scrolling, no serious accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await useFakeAi(page);
  await onboard(page, 'demo');
  await setMode(page, 'Chmura (Gemini)');
  const problems: string[] = [];
  for (const r of [
    '#/settings/ai',
    '#/ai/info',
    '#/ask',
    '#/learn',
    '#/learn/generate',
    '#/learn/exam-open',
    '#/simulator/mow-cannabis',
    '#/simulator/mow-cannabis/live',
    '#/knowledge/mi-core',
    '#/meetings/new?client=demo-01',
    '#/notes/new?type=supervision',
    '#/clients/demo-01/relapse',
    '#/prevention/demo-08-prev',
    '#/tools/urgeSurfing',
  ]) {
    await go(page, r);
    await page.waitForTimeout(450);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 1) problems.push(`${r} horizontal scroll ${sw}px`);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical'))
      problems.push(
        `${r} ${v.id}: ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
      );
  }
  expect(problems).toEqual([]);
});
