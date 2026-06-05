const { chromium } = require('playwright');
const fs = require('node:fs/promises');
(async () => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:9145';
  const outDir = process.env.OUT_DIR || '/work/qa/retest-2026-06-04-t_3e313643-rerun';
  await fs.mkdir(outDir + '/screenshots', { recursive: true });
  const consoleEvents = [];
  const failures = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('console', (m) => consoleEvents.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => consoleEvents.push({ type: 'error', text: e.stack || e.message }));
  page.on('requestfailed', (r) => failures.push({ url: r.url(), failure: r.failure()?.errorText }));
  await page.goto(base + '/tracks/clf-c02/overview', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start quick 10' }).click();
  await page.waitForURL(/\/tracks\/clf-c02\/quiz$/, { timeout: 5000 });
  const steps = [];
  for (let i = 1; i <= 10; i += 1) {
    await page.locator('.panel').filter({ hasText: /quick quiz/i }).getByRole('button').first().click();
    await page.getByText(/Mapping: clf-c02/i).waitFor({ timeout: 5000 });
    const panelText = await page.locator('.panel').filter({ hasText: /quick quiz/i }).innerText();
    steps.push({ question: i, hasNext: /Next question/i.test(panelText), hasResults: /results|score/i.test(panelText) });
    if (i < 10) {
      await page.getByRole('button', { name: /Next question/i }).click();
    } else {
      await page.getByRole('button', { name: /Finish quiz/i }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: outDir + '/screenshots/09-clf-quiz-final-results.png', fullPage: true });
    }
  }
  const finalText = await page.locator('main').innerText();
  const summary = {
    ok: /Quiz results/i.test(finalText) && /Score:/i.test(finalText) && /Progress impact:/i.test(finalText),
    steps,
    finalText: finalText.slice(0, 2000),
    consoleErrors: consoleEvents.filter((e) => e.type === 'error' || /TypeError|ReferenceError|Unhandled|Failed to fetch/i.test(e.text)),
    networkFailures: failures.filter((f) => !/favicon/i.test(f.url)),
    screenshot: outDir + '/screenshots/09-clf-quiz-final-results.png'
  };
  await fs.writeFile(outDir + '/quiz-results-verification.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  if (!summary.ok || summary.consoleErrors.length || summary.networkFailures.length) process.exitCode = 1;
})();
