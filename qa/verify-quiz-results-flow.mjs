import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:9144';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
const requestFailures = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('requestfailed', (request) => {
  if (!/favicon/i.test(request.url())) requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
});

try {
  await page.goto(`${baseURL}/tracks/clf-c02/overview`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start quick 10' }).click();
  await page.waitForURL(/\/tracks\/clf-c02\/quiz$/);
  await page.getByRole('heading', { name: /quick quiz/i }).waitFor();

  for (let questionNumber = 1; questionNumber <= 10; questionNumber += 1) {
    await page.getByText(`Question ${questionNumber} of 10`).waitFor({ timeout: 5000 });
    await page.locator('.panel').filter({ hasText: /quick quiz/i }).getByRole('button').first().click();
    await page.getByText(/Mapping: clf-c02/i).waitFor({ timeout: 5000 });
    if (questionNumber < 10) {
      await page.getByRole('button', { name: 'Next question' }).click();
    } else {
      await page.getByRole('button', { name: 'Finish quiz' }).click();
    }
  }

  await page.getByRole('heading', { name: 'Quiz results' }).waitFor({ timeout: 5000 });
  const mainText = await page.locator('main').innerText();
  const checks = [
    [/Score:\s*10\/10 correct \(10 answered\)/, 'score summary'],
    [/Correctness:\s*10 correct · 0 review needed/, 'correctness summary'],
    [/Readiness impact:/, 'readiness impact'],
    [/Progress impact:/, 'progress impact'],
    [/Retry quiz|Restart quick 10/, 'retry affordance'],
  ];
  const missing = checks.filter(([pattern]) => !pattern.test(mainText)).map(([, name]) => name);
  if (missing.length || consoleErrors.length || requestFailures.length) {
    console.error(JSON.stringify({ ok: false, missing, consoleErrors, requestFailures, text: mainText }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, answered: 10, result: 'Quiz results visible with score, correctness, readiness/progress impact, and retry affordance.' }, null, 2));
  }
} finally {
  await browser.close();
}
