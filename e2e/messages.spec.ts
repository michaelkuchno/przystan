/**
 * Messages (e-mail / SMS) and notifications. mailto: / sms: links are checked by their href and
 * the click is kept inside the page (no external app in the test browser).
 */
import { expect, test, type Page } from '@playwright/test';
import { go, onboard } from './helpers';

async function keepExternalLinksInPage(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener(
      'click',
      (e) => {
        const a = (e.target as HTMLElement).closest?.('a[href^="mailto:"], a[href^="sms:"]');
        if (a) e.preventDefault();
      },
      true,
    );
  });
}

test('meeting reminder by SMS: template with date, sms: link, history', async ({ page }) => {
  await keepExternalLinksInPage(page);
  await onboard(page, 'demo');
  await go(page, '#/meetings/demo-01-m6');
  await page.getByRole('link', { name: 'Przypomnienie' }).click();
  await expect(page).toHaveURL(/messages\/new\?.*template=meetingReminder/);
  const body = page.getByLabel('Treść', { exact: true });
  await expect(body).toHaveValue(/przypominam o spotkaniu .+ o \d{2}:\d{2}/);
  await page.getByLabel('Numer telefonu').fill('600 123 456');
  const sms = page.getByRole('link', { name: 'Otwórz w aplikacji SMS' });
  await expect(sms).toHaveAttribute('href', /^sms:600123456\?&body=Dzie%C5%84%20dobry/);
  await sms.click();
  await go(page, '#/messages/history');
  await expect(page.getByTestId('message-history')).toContainText('Wysłano');
  await expect(page.getByTestId('message-history')).toContainText('przez aplikację SMS');
});

test('contacts and e-mail from a template; long texts warn; draft saved', async ({ page }) => {
  await keepExternalLinksInPage(page);
  await onboard(page);
  await go(page, '#/messages/contacts');
  await page.getByRole('button', { name: 'Nowy kontakt' }).click();
  await page.getByLabel('Imię i nazwisko / nazwa').fill('Sekretariat SP 12');
  await page.getByLabel('Rola').selectOption('school');
  await page.getByLabel('E-mail', { exact: true }).fill('sekretariat@sp12.edu.pl');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByTestId('contacts')).toContainText('Sekretariat SP 12');
  await page
    .getByTestId('contacts')
    .getByRole('link', { name: /E-mail/ })
    .click();
  await expect(page.getByLabel('Adres e-mail')).toHaveValue('sekretariat@sp12.edu.pl');
  await page.getByLabel('Szablon').selectOption('schoolOpinion');
  await expect(page.getByLabel('Temat')).toHaveValue('Prośba o opinię o uczniu/uczennicy');
  const mail = page.getByRole('link', { name: 'Otwórz w aplikacji poczty' });
  await expect(mail).toHaveAttribute('href', /^mailto:sekretariat@sp12\.edu\.pl\?subject=Pro%C5%9Bba/);
  await page.getByRole('button', { name: 'Zapisz szkic' }).click();
  await expect(page.getByText('Zapisano szkic')).toBeVisible();
  await mail.click();
  // the hand-over is in the audit log (practice mode) – metadata only
  await go(page, '#/audit');
  await expect(page.getByText('Wysłano / przekazano wiadomość').first()).toBeVisible();
});

test('AI reply to an e-mail: client data needs consent, pseudonymised preview, draft with cautions', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __PRZYSTAN_FAKE_AI__: boolean }).__PRZYSTAN_FAKE_AI__ = true;
  });
  await onboard(page, 'demo');
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Chmura/ }).click();
  await go(page, '#/messages/new?client=demo-01');
  const ai = page.getByTestId('message-ai');
  await ai.getByRole('tab', { name: 'Odpowiedz na e-mail' }).click();
  await ai
    .getByLabel('Otrzymany e-mail (wklej treść)')
    .fill('Dzień dobry, tu Anna Kowalska, mama KW-16. Czy syn chodzi na spotkania? Proszę o telefon 600 123 456.');
  await ai.getByLabel(/Co chcesz odpowiedzieć/).fill('Zaproponuj rozmowę telefoniczną, bez szczegółów terapii.');
  await ai.getByRole('button', { name: 'Przygotuj szkic' }).click();
  await expect(ai.getByText(/Dane osób są przetwarzane tylko na urządzeniu/)).toBeVisible();

  await go(page, '#/settings/ai');
  await page.getByRole('switch', { name: /Zezwalaj na wysyłkę danych osób/ }).click();
  await go(page, '#/messages/new?client=demo-01');
  await ai.getByRole('tab', { name: 'Odpowiedz na e-mail' }).click();
  await ai
    .getByLabel('Otrzymany e-mail (wklej treść)')
    .fill('Dzień dobry, tu Anna Kowalska, mama KW-16. Czy syn chodzi na spotkania? Proszę o telefon 600 123 456.');
  await ai.getByRole('button', { name: 'Przygotuj szkic' }).click();
  const preview = page.getByTestId('cloud-preview');
  await expect(preview).toContainText('PROFESSIONAL CORRESPONDENCE GUIDE');
  for (const leaked of ['Anna', 'Kowalska', 'KW-16', '600 123 456']) await expect(preview).not.toContainText(leaked);
  await page.getByRole('button', { name: 'Wyślij ten tekst' }).click();
  await expect(ai.getByTestId('ai-draft')).toContainText('FAKE: dziękuję za wiadomość');
  await expect(ai.getByTestId('ai-draft')).toContainText('FAKE: uzupełnij datę');
  await ai.getByRole('button', { name: 'Wstaw do wiadomości' }).click();
  await expect(page.getByLabel('Treść', { exact: true })).toHaveValue(/FAKE: dziękuję za wiadomość/);
  await expect(page.getByLabel('Temat')).toHaveValue('FAKE: Odpowiedź w sprawie spotkania');
});

test('notifications: off by default; on → today card, summary preview without details, calendar export', async ({ page }) => {
  await onboard(page, 'demo');
  await expect(page.getByTestId('today-card')).toHaveCount(0);
  await go(page, '#/settings');
  await page.getByRole('link', { name: /Przypomnienia i podsumowanie dnia/ }).click();
  await page.getByRole('switch', { name: 'Przypomnienia i podsumowanie dnia' }).click();
  await expect(page.getByTestId('notify-permission')).toBeVisible();
  await page.getByRole('button', { name: 'Podgląd podsumowania dnia' }).click();
  const preview = page.getByTestId('digest-preview');
  await expect(preview).toContainText('Spotkania:');
  await expect(preview).not.toContainText('KW-16');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj terminy do kalendarza' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^przystan-terminy-.*\.ics$/);
  const text = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain('BEGIN:VALARM');
  expect(text).not.toContain('KW-16'); // privacy "hidden"
  await go(page, '#/');
  await expect(page.getByTestId('today-card')).toBeVisible();
});

test('messages and notification screens: no horizontal scrolling, no serious accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await onboard(page, 'demo');
  await go(page, '#/settings/notify');
  await page.getByRole('switch', { name: 'Przypomnienia i podsumowanie dnia' }).click();
  const problems: string[] = [];
  for (const r of [
    '#/settings/notify',
    '#/messages',
    '#/messages/new?meeting=demo-01-m6&template=meetingReminder',
    '#/messages/history',
    '#/messages/contacts',
    '#/',
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

test('e-mail directly from Gmail (Google sign-in mocked): token, Gmail API call, history', async ({ page }) => {
  await page.addInitScript(() => {
    // Google Identity Services stand-in: returns a token without a popup
    (window as unknown as { google: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: (c: { callback: (r: unknown) => void }) => ({
            requestAccessToken: () => setTimeout(() => c.callback({ access_token: 'TEST-TOKEN', expires_in: 3600 }), 10),
          }),
        },
      },
    };
  });
  const sent: string[] = [];
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (r) => r.fulfill({ json: { email: 'ewelina.test@gmail.com' } }));
  await page.route('https://gmail.googleapis.com/**', async (r) => {
    sent.push(`${r.request().headers().authorization} ${r.request().postDataJSON().raw.length}`);
    await r.fulfill({ json: { id: 'm1' } });
  });
  await onboard(page);
  await go(page, '#/settings/notify');
  await page.getByLabel('Identyfikator klienta OAuth (Google Cloud)').fill('123-abc.apps.googleusercontent.com');
  await page.getByLabel('Identyfikator klienta OAuth (Google Cloud)').blur();
  await page.getByRole('button', { name: 'Połącz z Google' }).click();
  await expect(page.getByText('Połączono: ewelina.test@gmail.com')).toBeVisible();
  await go(page, '#/messages/new?channel=email');
  await expect(page.getByTestId('send-actions')).toBeVisible();
  await page.getByLabel('Adres e-mail', { exact: true }).fill('szkola@example.pl');
  await page.getByLabel('Temat').fill('Zaproszenie');
  await page.getByLabel('Treść', { exact: true }).fill('Dzień dobry, zapraszam na rozmowę.');
  await page.getByRole('button', { name: 'Wyślij z ewelina.test@gmail.com' }).click();
  await page.getByRole('button', { name: 'Wyślij z Gmaila' }).click(); // confirmation dialog
  await expect(page.getByText('Wysłano z ewelina.test@gmail.com')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatch(/^Bearer TEST-TOKEN \d+$/);
  await go(page, '#/messages/history');
  await expect(page.getByTestId('message-history')).toContainText('z Gmaila');
});
