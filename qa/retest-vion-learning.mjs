import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:9140';
const outDir = process.env.OUT_DIR || '/work/qa/retest-2026-06-03';
const screenshotsDir = path.join(outDir, 'screenshots');
await fs.mkdir(screenshotsDir, { recursive: true });

const results = [];
const issues = [];
const consoleEvents = [];
const networkFailures = [];
let screenshotIndex = 0;

function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${details.note ? ` — ${details.note}` : ''}`);
}

function issue(severity, category, title, details) {
  issues.push({ severity, category, title, ...details });
  console.log(`ISSUE ${severity}/${category}: ${title}`);
}

async function shot(page, name) {
  const safe = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const file = path.join(screenshotsDir, `${String(++screenshotIndex).padStart(2, '0')}-${safe}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function checkConsole(context) {
  const bad = consoleEvents.filter((e) => ['error'].includes(e.type) || /TypeError|ReferenceError|Unhandled|Failed to fetch/i.test(e.text));
  const failed = networkFailures.filter((f) => !/favicon/i.test(f.url));
  record(`console/network clean: ${context}`, bad.length === 0 && failed.length === 0, {
    consoleErrors: bad,
    networkFailures: failed,
  });
  consoleEvents.length = 0;
  networkFailures.length = 0;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('console', (msg) => consoleEvents.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
page.on('pageerror', (err) => consoleEvents.push({ type: 'error', text: `pageerror: ${err.message}`, stack: err.stack }));
page.on('requestfailed', (req) => networkFailures.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText }));

try {
  const health = await page.request.get(`${baseURL}/health`);
  record('health endpoint returns ok', health.ok(), { status: health.status(), body: await health.text() });

  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Vion Learning' }).waitFor();
  const landingShot = await shot(page, 'landing');
  await checkConsole('landing load');
  record('landing exposes both track selection actions', await page.getByRole('link', { name: /Continue CLF-C02/ }).isVisible() && await page.getByRole('link', { name: /Continue AIF-C01/ }).isVisible(), { screenshot: landingShot });

  // Keyboard: tab to first Continue link and activate it with Enter.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/tracks\/clf-c02\/overview$/, { timeout: 5000 });
  await page.getByRole('heading', { name: /AWS Certified Cloud Practitioner/ }).waitFor();
  const clfOverviewShot = await shot(page, 'clf-overview-keyboard-navigation');
  await checkConsole('CLF overview via keyboard');
  record('keyboard can activate landing track selection', page.url().endsWith('/tracks/clf-c02/overview'), { screenshot: clfOverviewShot });

  // Overview quick-start should visibly transition into quiz route.
  await page.getByRole('button', { name: 'Start quick 10' }).click();
  await page.waitForURL(/\/tracks\/clf-c02\/quiz$/, { timeout: 5000 });
  await page.getByRole('heading', { name: /quick quiz/i }).waitFor();
  const quickShot = await shot(page, 'clf-quick-quiz-started');
  await checkConsole('CLF overview quick quiz');
  record('overview Start quick 10 navigates to visible quiz', /\/tracks\/clf-c02\/quiz$/.test(page.url()), { screenshot: quickShot });

  // Answer flow, then check for next/results affordances.
  await page.locator('.panel').filter({ hasText: /quick quiz/i }).getByRole('button').first().click();
  await page.getByText(/Mapping: clf-c02/i).waitFor({ timeout: 5000 });
  const answerShot = await shot(page, 'clf-answer-review');
  await checkConsole('CLF quiz answer');
  record('quiz answer displays review feedback and track mapping', await page.getByText(/Next actions:/).isVisible(), { screenshot: answerShot });
  const nextOrResults = await page.getByRole('button', { name: /next|finish|result|score/i }).count();
  if (nextOrResults === 0) {
    issue('High', 'Functional', 'Quiz flow stops after first answered question; no Next/Finish/Results control', {
      url: page.url(),
      steps: [
        'Open /tracks/clf-c02/overview',
        'Click Start quick 10',
        'Answer the first quiz question',
      ],
      expected: 'User can advance through remaining questions and reach a score/results summary.',
      actual: 'Review feedback appears, but no Next, Finish, Results, or score control is present; quiz is stuck on first question despite quick quiz advertising 10 questions.',
      screenshot: answerShot,
      owner: 'coder',
      acceptance: 'After each answer, show a Next question action until the final question, then show a results/score summary without console errors.',
    });
  }
  record('quiz exposes next/results affordance after answering', nextOrResults > 0, { count: nextOrResults });

  // Learn card actions.
  await page.goto(`${baseURL}/tracks/clf-c02/learn`, { waitUntil: 'networkidle' });
  await page.getByRole('heading').first().waitFor();
  const beforeStatus = await page.locator('.learning-card').first().locator('text=Card status:').locator('..').textContent().catch(() => '');
  await page.locator('.learning-card').first().getByRole('button', { name: 'I know this' }).click();
  await page.locator('.learning-card').first().getByText(/Card status:\s*know/i).waitFor({ timeout: 5000 });
  const knowShot = await shot(page, 'clf-learn-card-know');
  await checkConsole('CLF learn mark know');
  record('learn card I know this saves visible status', await page.locator('.learning-card').first().getByText(/Card status:\s*know/i).isVisible(), { beforeStatus, screenshot: knowShot });
  await page.locator('.learning-card').first().getByRole('button', { name: 'Review again' }).click();
  await page.locator('.learning-card').first().getByText(/Card status:\s*review/i).waitFor({ timeout: 5000 });
  await checkConsole('CLF learn mark review');
  record('learn card Review again saves visible status', await page.locator('.learning-card').first().getByText(/Card status:\s*review/i).isVisible());

  // Source links in details and sources tab.
  await page.locator('.learning-card').first().locator('summary').click();
  const detailSourceHref = await page.locator('.learning-card').first().locator('details a').first().getAttribute('href');
  record('learn card detail source link has external URL', /^https?:\/\//.test(detailSourceHref || ''), { href: detailSourceHref });
  await page.goto(`${baseURL}/tracks/clf-c02/sources`, { waitUntil: 'networkidle' });
  const sourceHrefs = await page.locator('a[href^="http"]').evaluateAll((els) => els.map((a) => a.href));
  const sourcesShot = await shot(page, 'clf-sources');
  await checkConsole('CLF sources');
  record('sources page renders source links', sourceHrefs.length > 0, { count: sourceHrefs.length, sample: sourceHrefs.slice(0, 3), screenshot: sourcesShot });

  // Track separation and nav labels.
  await page.goto(`${baseURL}/tracks/aif-c01/overview`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /AI Practitioner/i }).waitFor();
  const aifText = await page.locator('main').innerText();
  const aifShot = await shot(page, 'aif-overview');
  await checkConsole('AIF overview');
  record('AIF-C01 route renders AI track, not CLF-C02 heading', /AI Practitioner/i.test(aifText) && !/Cloud Practitioner/i.test(aifText), { screenshot: aifShot });
  record('AWS Console Practice nav label is visible', await page.getByRole('link', { name: 'AWS Console Practice' }).isVisible());

  // Progress, console, study-plan routes.
  for (const [route, expected] of [
    ['study-plan', /day plan/i],
    ['console', /Cost warning|Cleanup/i],
    ['progress', /Progress history|Readiness/i],
  ]) {
    await page.goto(`${baseURL}/tracks/aif-c01/${route}`, { waitUntil: 'networkidle' });
    const text = await page.locator('main').innerText();
    await checkConsole(`AIF ${route}`);
    record(`AIF ${route} route renders expected content`, expected.test(text), { url: page.url() });
  }

  // Admin/export/reset API flows.
  const exportRes = await page.request.get(`${baseURL}/api/admin/export`);
  const exportJson = await exportRes.json();
  record('admin export returns snapshot JSON', exportRes.ok() && exportJson.app?.name === 'Vion Learning' && exportJson.tracks, { status: exportRes.status(), keys: Object.keys(exportJson) });
  const resetRes = await page.request.post(`${baseURL}/api/admin/reset`);
  const resetJson = await resetRes.json();
  record('admin reset returns reset status', resetRes.ok() && resetJson.status === 'reset', { status: resetRes.status(), body: resetJson });

  // Responsive/mobile smoke.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Vion Learning' }).waitFor();
  const mobileShot = await shot(page, 'mobile-landing');
  await checkConsole('mobile landing');
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  record('mobile landing has no horizontal overflow', !mobileOverflow, { scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), innerWidth: await page.evaluate(() => window.innerWidth), screenshot: mobileShot });
} catch (error) {
  issue('Critical', 'Test Blocker', 'Automated browser retest crashed before completion', {
    url: page.url(),
    expected: 'Retest script completes all scoped flows.',
    actual: error.stack || error.message,
    owner: 'webtester/devops',
  });
  console.error(error);
} finally {
  await browser.close();
}

const summary = {
  baseURL,
  generatedAt: new Date().toISOString(),
  passCount: results.filter((r) => r.ok).length,
  failCount: results.filter((r) => !r.ok).length,
  issueCount: issues.length,
  results,
  issues,
};
await fs.writeFile(path.join(outDir, 'retest-results.json'), JSON.stringify(summary, null, 2));
console.log(`RESULT_JSON ${path.join(outDir, 'retest-results.json')}`);
if (issues.length || results.some((r) => !r.ok)) process.exitCode = 1;
