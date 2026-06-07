import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:9140/';
const outDir = process.env.OUT_DIR || '/work/dogfood-output/t_99d2a08d/screenshots';
const resolverHost = process.env.TAILNET_HOST || 'vion-kanban-ec2.tail276347.ts.net';
const resolverIp = process.env.TAILNET_IP || '';
const launchArgs = resolverIp ? [`--host-resolver-rules=MAP ${resolverHost} ${resolverIp}`] : [];
const browser = await chromium.launch({ headless: true, args: launchArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));
page.on('requestfailed', req => logs.push({ type: 'requestfailed', text: `${req.method()} ${req.url()} ${req.failure()?.errorText}` }));

function cleanConsole() {
  return logs.filter(l => !/favicon\.ico|DevTools/.test(l.text));
}
async function shot(name) {
  const path = `${outDir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}
async function visibleText() {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}
async function clickText(text, opts={}) {
  const loc = page.getByText(text, { exact: opts.exact ?? false }).first();
  await loc.waitFor({ state: 'visible', timeout: opts.timeout || 10000 });
  await loc.click();
}
async function assertVisible(text, opts={}) {
  await page.getByText(text, { exact: opts.exact ?? false }).first().waitFor({ state: 'visible', timeout: opts.timeout || 10000 });
}

const result = { baseURL, screenshots: [], checks: [], console: [] };
try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
  result.screenshots.push(await shot('01-landing'));
  await assertVisible('Vion Learning');
  await assertVisible('AWS Certified Cloud Practitioner');
  await assertVisible('AWS Certified AI Practitioner');
  result.checks.push('Landing renders with both track cards');

  // CLF-C02 track separation + routes
  await clickText('Continue CLF-C02', { exact: true });
  await page.waitForURL(/\/tracks\/clf-c02/, { timeout: 10000 });
  result.screenshots.push(await shot('02-clf-overview'));
  await assertVisible('CLF-C02');
  await assertVisible('Start quick 10');
  result.checks.push('CLF-C02 track opens and shows Overview Start quick 10');

  // overview quick 10 -> quiz progression end-to-end
  await clickText('Start quick 10');
  await page.waitForURL(/\/tracks\/clf-c02\/quiz/, { timeout: 10000 });
  await assertVisible('Question 1 of');
  result.screenshots.push(await shot('03-quiz-question-1'));
  const optionButtons = page.locator('section .panel button').filter({ hasNotText: /Quick 10|Domain 15|Full 65 timed|Weakness drill|Mixed review|Next question|Finish quiz|Retry quiz|Restart quick 10/ });
  const count = await optionButtons.count();
  if (count < 2) {
    const allButtons = await page.locator('button').evaluateAll((els) => els.map((el) => el.textContent?.trim()));
    throw new Error(`Expected at least 2 answer option buttons, found ${count}; all buttons=${JSON.stringify(allButtons)}; body=${(await visibleText()).slice(0, 1000)}`);
  }
  await optionButtons.nth(0).click();
  await assertVisible('Why the correct answer works:');
  await assertVisible('Why your choice landed where it did:');
  // Some questions may not include optional common-trap/decision-rule metadata; the required retest target is detailed answer feedback plus progression.
  await assertVisible('Next question');
  result.screenshots.push(await shot('04-quiz-feedback-q1'));
  await clickText('Next question', { exact: true });
  await assertVisible('Question 2 of');
  result.screenshots.push(await shot('05-quiz-question-2'));
  result.checks.push('Quiz answer -> feedback -> Next question works');

  // Finish all remaining questions, always select first option.
  let guard = 0;
  while (guard++ < 20) {
    const body = await visibleText();
    if (/Quiz results/.test(body)) break;
    const buttons = page.locator('section .panel button').filter({ hasNotText: /Quick 10|Domain 15|Full 65 timed|Weakness drill|Mixed review|Next question|Finish quiz|Retry quiz|Restart quick 10/ });
    if (await buttons.count()) {
      await buttons.nth(0).click();
      await page.waitForTimeout(250);
    }
    const body2 = await visibleText();
    if (/Finish quiz/.test(body2)) {
      await clickText('Finish quiz', { exact: true });
      await page.waitForTimeout(500);
    } else if (/Next question/.test(body2)) {
      await clickText('Next question', { exact: true });
      await page.waitForTimeout(250);
    }
  }
  await assertVisible('Quiz results');
  await assertVisible('Score:');
  await assertVisible('Readiness impact:');
  result.screenshots.push(await shot('06-quiz-results'));
  result.checks.push('Final answer -> Finish quiz -> score/readiness summary works');

  // Learn card status controls
  await page.goto(new URL('/tracks/clf-c02/learn', baseURL).toString(), { waitUntil: 'networkidle' });
  await assertVisible('I know this');
  await assertVisible('Review again');
  result.screenshots.push(await shot('07-learn-before'));
  await clickText('I know this', { exact: true });
  await assertVisible('Card status:');
  await assertVisible('Next review:');
  result.screenshots.push(await shot('08-learn-after-know'));
  await clickText('Review again', { exact: true });
  await assertVisible('Card status:');
  result.checks.push('Learn card Know/Review controls update visible card status');

  // Other routes / nav smoke
  const routes = [
    ['/tracks/clf-c02/sources', 'Source verification and refresh'],
    ['/tracks/clf-c02/study-plan', '30 day plan'],
    ['/tracks/clf-c02/console', 'Cost warning:'],
    ['/tracks/clf-c02/progress', 'Progress history'],
  ];
  for (const [route, expected] of routes) {
    await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' });
    await assertVisible(expected);
    result.checks.push(`Route ${route} renders ${expected}`);
  }
  const exportResponse = await page.goto(new URL('/api/admin/export', baseURL).toString(), { waitUntil: 'networkidle' });
  if (!exportResponse?.ok()) throw new Error(`Export endpoint failed with ${exportResponse?.status()}`);
  const exportText = await page.locator('body').innerText();
  if (!/clf-c02/.test(exportText) || !/aif-c01/.test(exportText)) throw new Error('Export endpoint did not include both tracks');
  result.checks.push('Export endpoint returns progress snapshot');

  // AIF-C01 separation
  await page.goto(new URL('/tracks/aif-c01', baseURL).toString(), { waitUntil: 'networkidle' });
  await assertVisible('AIF-C01');
  const aifText = await visibleText();
  if (!/AIF-C01|AI Practitioner/.test(aifText)) throw new Error('AIF-C01 route did not render AI track text');
  result.screenshots.push(await shot('09-aif-overview'));
  result.checks.push('AIF-C01 track opens separately from CLF-C02');

  // Mobile overflow smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('/tracks/clf-c02/quiz', baseURL).toString(), { waitUntil: 'networkidle' });
  result.screenshots.push(await shot('10-mobile-quiz'));
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollWidth > clientWidth + 2) throw new Error(`Mobile horizontal overflow: scrollWidth ${scrollWidth}, clientWidth ${clientWidth}`);
  result.checks.push('Mobile quiz viewport has no horizontal overflow');

  result.console = cleanConsole();
  if (result.console.length) throw new Error(`Console/network noise detected: ${JSON.stringify(result.console)}`);
  result.status = 'PASS';
} catch (err) {
  result.status = 'FAIL';
  result.error = err.stack || String(err);
  try { result.screenshots.push(await shot('failure')); } catch {}
  result.console = cleanConsole();
} finally {
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
if (result.status !== 'PASS') process.exit(1);
