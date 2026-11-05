/** Studies module: WSHE Brzeg programme, materials, flashcards, mock exams, search and AI (fake). */
import { expect, test } from '@playwright/test';
import { go, onboard } from './helpers';

test('studies without AI: programme, exam date, topic levels, materials, cards, mock exam from cards, search', async ({ page }) => {
  await onboard(page);
  await go(page, '#/more');
  await page.getByRole('link', { name: /Studia/ }).click();
  await expect(page.getByText('WSHE Brzeg · Pedagogika II stopnia')).toBeVisible();
  await page.getByLabel('Na którym semestrze jesteś?').selectOption('3');
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  const courses = page.getByTestId('study-courses');
  await expect(courses).toContainText('Psychologia uzależnień i współuzależnień');
  await expect(courses).toContainText('Diagnostyka w resocjalizacji');
  await courses.getByRole('link', { name: /Psychologia uzależnień/ }).click();

  // programme tab: exam date + topic self-assessment
  await page.getByLabel('Data egzaminu / zaliczenia').fill('2030-01-25');
  const topics = page.getByTestId('topics');
  await expect(topics).toContainText('Rodzina z problemem alkoholowym; współuzależnienie; FAS');
  await topics.getByRole('radio', { name: 'Umiem' }).first().click();
  await expect(topics.getByRole('radio', { name: 'Umiem' }).first()).toHaveAttribute('aria-checked', 'true');
  // built-in study note for every syllabus topic
  await topics.getByRole('button', { name: 'Notatka' }).first().click();
  await expect(page.getByTestId('study-note')).toContainText('Najważniejsze pojęcia');
  await page.keyboard.press('Escape');

  // materials
  await page.getByRole('tab', { name: 'Materiały' }).click();
  await expect(page.getByTestId('pack-notes')).toContainText('Opracowanie tematów');
  await page.getByRole('button', { name: 'Dodaj materiał' }).click();
  await page.getByLabel('Tytuł').fill('Wykład 2 – współuzależnienie');
  await page.getByLabel('Treść').fill('Współuzależnienie to wyuczony sposób funkcjonowania bliskich osoby uzależnionej. Kontrola, zaprzeczanie, nadodpowiedzialność.');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByTestId('materials')).toContainText('Wykład 2 – współuzależnienie');

  // own cards → mock exam from cards
  await page.getByRole('tab', { name: 'Fiszki' }).click();
  for (const [f, b] of [
    ['FAS', 'Alkoholowy zespół płodowy'],
    ['Współuzależnienie', 'Wzorzec funkcjonowania bliskich osoby uzależnionej'],
    ['Profilaktyka wskazująca', 'Dla osób z pierwszymi objawami problemów'],
    ['ICD', 'Międzynarodowa klasyfikacja chorób'],
  ]) {
    await page.getByLabel('Pytanie / pojęcie').fill(f);
    await page.getByLabel('Odpowiedź').fill(b);
    await page.getByRole('button', { name: 'Dodaj fiszkę' }).click();
  }
  await expect(page.getByText('Fiszki').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Egzamin próbny' }).click();
  await page.getByLabel('Liczba pytań').selectOption('5');
  await page.getByRole('button', { name: 'Test z moich fiszek' }).click();
  const exam = page.getByTestId('exam');
  await expect(exam.getByRole('radiogroup')).toHaveCount(5);
  for (const g of await exam.getByRole('radiogroup').all()) await g.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Sprawdź odpowiedzi' }).click();
  await expect(page.getByTestId('exam-result')).toContainText('%');
  await page.getByRole('button', { name: 'Zapisz wynik' }).click();
  await expect(page.getByTestId('exam-history').getByRole('listitem')).toHaveCount(1);
  // exam from the built-in question bank (no AI): single-choice + open question with a model answer
  await page.getByRole('button', { name: 'Egzamin z bazy pytań' }).click();
  await expect(exam.getByRole('radiogroup')).toHaveCount(4);
  await expect(exam.getByLabel('Twoja odpowiedź')).toHaveCount(1);
  for (const g of await exam.getByRole('radiogroup').all()) await g.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Sprawdź odpowiedzi' }).click();
  await expect(exam).toContainText('Odpowiedź wzorcowa');
  await page.getByRole('button', { name: 'Zapisz wynik' }).click();
  await expect(page.getByTestId('exam-history').getByRole('listitem')).toHaveCount(2);

  // search in university data (no AI)
  await go(page, '#/studies/search');
  await page.getByRole('radio', { name: 'Wszystkie' }).click();
  await page.getByLabel(/Czym jest współuzależnienie/).fill('współuzależnienie rodzina');
  await page.locator('form').getByRole('button', { name: 'Szukaj' }).click();
  const hits = page.getByTestId('study-hits');
  await expect(hits).toContainText('Rodzina z problemem alkoholowym');
  await expect(hits).toContainText('Wykład 2 – współuzależnienie');

  // home: next exam + daily goal counted the exam questions; dashboard card
  await go(page, '#/studies');
  await expect(page.getByTestId('study-today')).toContainText('Psychologia uzależnień i współuzależnień');
  await expect(page.getByTestId('study-today')).toContainText('10 / 15');
  await go(page, '#/');
  await expect(page.getByTestId('study-dashboard')).toBeVisible();
});

test('studies with AI (fake): answers only from university data, mock exam, topic explanation', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __PRZYSTAN_FAKE_AI__: boolean }).__PRZYSTAN_FAKE_AI__ = true;
  });
  await onboard(page, 'demo');
  await go(page, '#/settings/ai');
  await page.getByRole('radio', { name: /Chmura/ }).click();
  await go(page, '#/studies');
  await page.getByLabel('Na którym semestrze jesteś?').selectOption('3');
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  await page.getByTestId('study-courses').getByRole('link', { name: /Profilaktyka uzależnień/ }).click();
  await page.getByRole('button', { name: 'Wytłumacz na egzamin' }).first().click();
  await expect(page.getByTestId('topic-explain')).toContainText('FAKE');
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Egzamin próbny' }).click();
  await page.getByRole('button', { name: 'Wygeneruj egzamin (AI)' }).click();
  const exam = page.getByTestId('exam');
  await expect(exam).toContainText('FAKE: Co oznacza współuzależnienie?');
  await exam.getByRole('radio', { name: /Zaburzony wzorzec/ }).click();
  await exam.getByRole('radio', { name: /osób z pierwszymi objawami/ }).click();
  await exam.getByLabel('Twoja odpowiedź').fill('Czynniki ryzyka zwiększają prawdopodobieństwo problemów.');
  await page.getByRole('button', { name: 'Sprawdź odpowiedzi' }).click();
  await exam.getByRole('radio', { name: 'Dobrze' }).click();
  await expect(page.getByTestId('exam-result')).toContainText('100%');

  await page.getByRole('tab', { name: 'Zapytaj' }).click();
  await page.getByLabel(/Czym jest współuzależnienie/).fill('Czym jest profilaktyka wskazująca?');
  await page.getByRole('button', { name: 'Zapytaj' }).click();
  await expect(page.getByTestId('study-answer')).toContainText('FAKE');
  await expect(page.getByTestId('study-answer').getByRole('link', { name: '[1]' })).toBeVisible();
});

test('studies screens: no horizontal scrolling, no serious accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await onboard(page);
  await go(page, '#/studies');
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  const problems: string[] = [];
  for (const r of ['#/studies', '#/studies/course/psychologia-uzaleznien', '#/studies/course/psychologia-uzaleznien?tab=exam', '#/studies/course/kurator?tab=cards', '#/studies/search']) {
    await go(page, r);
    await page.waitForTimeout(450);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 1) problems.push(`${r} horizontal scroll ${sw}px`);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical'))
      problems.push(`${r} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  expect(problems).toEqual([]);
});
