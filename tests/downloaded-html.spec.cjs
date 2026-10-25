const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');

const origin = 'https://the-treasury.samuelsmanuals.com';
const blankHash = 'e418d07a2531363f7559fbc6007e098e91fd854a22daf2fb2fabeecb3e07b86a';
const fixture = path.resolve(__dirname, '../fixtures/payments.csv');
const note = 'Fictional QA: keep a bicycle repair buffer.';
const goal = 'Fictional QA buffer';

function inert(raw, id) {
  const match = raw.match(new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>'));
  if (!match) throw new Error('Missing inert saved block: ' + id);
  return JSON.parse(match[1]);
}
async function enter(page) {
  await expect(page.locator('#treasury-header')).toBeAttached();
  if (await page.locator('#guide').isVisible()) await page.locator('#guide-explore').click();
}
async function save(page, info, button, filename) {
  await page.locator('#data-open').click();
  await page.locator('#save-copy').click();
  const waiting = page.waitForEvent('download');
  await page.locator(button).click();
  const download = await waiting;
  const destination = info.outputPath(filename);
  await download.saveAs(destination);
  await page.getByRole('button', { name: 'Close save', exact: true }).click();
  return destination;
}
async function importCSV(page, existing = false) {
  await page.locator('#dock-import').click();
  await page.locator('#import').setInputFiles(fixture);
  await expect(page.locator('#csv-mapping')).toBeVisible();
  if (existing) await page.locator('#csv-account').selectOption({ label: 'Fictional current account' });
  else await page.locator('#csv-account-name').fill('Fictional current account');
  await page.locator('#preview-csv').click();
  await expect(page.locator('#import-preview')).toBeVisible();
  await page.locator('#apply-import').click();
  await expect(page.locator('#import-panel')).not.toBeVisible();
}


async function appearanceChecks(page, draft = false) {
  await page.locator('#appearance-open').click();
  await expect(page.locator('#appearance-panel')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('#appearance-open')).toHaveAttribute('aria-expanded', 'true');
  for (const skin of ['sleek', 'medieval', 'gold']) {
    await page.locator('[data-skin-choice="' + skin + '"]').click();
    for (const mode of ['light', 'dark']) {
      const current = await page.locator('body').getAttribute('data-mode');
      if (current !== mode) await page.locator('#appearance-mode').click();
      await expect(page.locator('body')).toHaveAttribute('data-mode', mode);
      await expect(page.locator('body')).toHaveAttribute('data-skin', skin);
      await expect(page.locator('#appearance-panel')).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('#help')).color === getComputedStyle(document.querySelector('#guidance h2')).color)).toBe(true);
      if (draft) await expect(page.locator('#guidance-text')).toHaveValue('Fictional QA unfinished appearance draft.');
    }
  }
  await page.locator('#monochrome-colors').check();
  for(const mode of ['light','dark']){
    if(await page.locator('body').getAttribute('data-mode')!==mode)await page.locator('#appearance-mode').click();
    await expect(page.locator('body')).toHaveAttribute('data-colors','gold_white');
    const leaks=await page.evaluate(()=>{const out=[];for(const el of document.querySelectorAll('.panel svg [fill],.panel svg [stroke],.section-nav a,.panel h2,.dock-tools button,.action,#values-legend [data-account-color]')){if(!el.getClientRects().length)continue;const cs=getComputedStyle(el);for(const prop of ['color','fill','stroke','backgroundColor']){const color=cs[prop],m=color?.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!m)continue;const [r,g,b]=m.slice(1).map(Number);if(Math.max(r,g,b)-Math.min(r,g,b)>40&&!(r>=g&&g>=b&&r-b>20))out.push({prop,color});}}return out;});
    expect(leaks).toEqual([]);
    expect(await page.locator('.panel svg text[fill]').evaluateAll(nodes=>nodes.filter(el=>el.getClientRects().length).every(el=>getComputedStyle(el).stroke==='none'))).toBe(true);
    await expect(page.locator('.mortgage-chart-key')).toContainText('base projection (thin), with extra payment (thick)');
    if(draft)await expect(page.locator('#guidance-text')).toHaveValue('Fictional QA unfinished appearance draft.');
  }
  await page.locator('#monochrome-colors').uncheck();
  await page.locator('#appearance-mode').press('Escape');
  await expect(page.locator('#appearance-panel')).toBeHidden();
  await expect(page.locator('#appearance-open')).toBeFocused();
  await page.locator('#appearance-open').click();
  await page.locator('#data-open').click();
  await expect(page.locator('#appearance-panel')).toBeHidden();
  await expect(page.locator('#data-panel')).toBeVisible();
  await expect(page.locator('#data-view-title')).toBeVisible();
  await page.locator('#data-panel [data-close-dialog]').click();
}
async function blankDownloadCheck(page, button, help, info, name, reference) {
  await expect(button).toHaveClass(/blank-download/);
  expect(await button.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(227, 194, 110)');
  if (help) {
  await button.focus();
  await help.hover();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(help).toHaveAttribute('aria-expanded', 'false');
  await button.hover();
  await help.hover();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await help.click();
  const tip = page.locator('#' + await help.getAttribute('aria-describedby'));
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('trusted browser');
  await expect(tip).toContainText('unencrypted');
  await help.press('Escape');
  await expect(tip).toBeHidden();
  await expect(help).toBeFocused();
  // Tab from the actual download focuses the same explanation without a pointer.
  await button.press('Tab');
  await expect(help).toBeFocused();
  // A focus transition is required after Escape, so Tab away and back.
  await help.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(tip).toBeVisible();
  await help.press('Escape');
  }
  const waiting = page.waitForEvent('download');
  await button.click();
  const download = await waiting;
  const destination = info.outputPath('blank-' + name + '.html');
  await download.saveAs(destination);
  expect(download.suggestedFilename()).toBe('Treasury.html');
  const clicked = await fs.readFile(destination, 'utf8');
  // Compose adds a fresh empty spending-preference identity, so click-downloads
  // intentionally differ from the static blank's hash. Code and blank records must match.
  expect(inert(clicked, 'source-bundle')).toEqual(inert(reference, 'source-bundle'));
  expect(inert(clicked, 'ledger-data')).toEqual(inert(reference, 'ledger-data'));
  expect(inert(clicked, 'view-state')).toEqual({});
  expect(inert(clicked, 'demo-data')).toEqual(inert(reference, 'demo-data'));
  const scripts = raw => [...raw.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  expect(scripts(clicked)).toEqual(scripts(reference));
  expect(clicked.startsWith(inert(reference, 'source-bundle').head)).toBe(true);
  const meta = inert(clicked, 'backup-metadata');
  const spending = meta.envelope_fields.treasury_spending_view;
  expect(spending.excluded).toEqual([]);expect(spending.work).toBe(false);
  expect(spending.scope).toBe('treasury-spending-view');
}

test('downloaded file imports, edits, saves, reopens and restores without network', async ({ browser }, info) => {
  // This executes only on the independent CI VM. Never on a desktop profile.
  const response = await fetch(origin + '/Treasury.html', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TreasuryReleaseQA/1.0)' },
    redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  expect(response.status).toBe(200);
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(blankHash);
  const blank = info.outputPath('Treasury.html');
  await fs.writeFile(blank, bytes);
  const empty = inert(bytes.toString(), 'ledger-data');
  expect(empty.transactions).toEqual([]);
  expect(empty.fictional).toBe(false);

  const online = await browser.newContext();
  const publicPage = await online.newPage();
  await publicPage.goto(origin + '/?qa=1.3.0');
  await expect(publicPage.locator('#treasury-favicon')).toHaveAttribute('href', '/favicon.png?v=1.3.0');
  for (const [name, mime, hash] of [['favicon.png','image/png','2e57cbc6f14c28ccf0dd0c60cb22fcd54ce16934c476528e9b8001f1cf5ba513'],['favicon.ico','image/vnd.microsoft.icon','3067b468e8430d44063885801d8f549f0dc6a84c88384bd9df86844bca0f2368']]) {
    const icon = await fetch(origin + '/' + name + '?v=1.3.0', {headers:{'User-Agent':'Mozilla/5.0 (compatible; TreasuryReleaseQA/1.0)'}});
    expect(icon.status).toBe(200); expect(icon.headers.get('content-type')).toBe(mime);
    expect(crypto.createHash('sha256').update(Buffer.from(await icon.arrayBuffer())).digest('hex')).toBe(hash);
  }
  expect(await publicPage.evaluate(async () => {const img=new Image();img.src=document.querySelector('#treasury-favicon').href;await img.decode();return img.naturalWidth===64&&img.naturalHeight===64;})).toBe(true);

  await expect(publicPage.locator('#guide-download-purpose')).toHaveText('Download your own blank treasury file and open in browser to fill in with your data');
  await expect(publicPage.locator('#guide-explore-purpose')).toHaveText('Check out visualisations with example Steve’s demo data.');
  expect(await publicPage.locator('#guide .welcome-choice').evaluateAll(nodes=>nodes.map(el=>el.dataset.welcomePath))).toEqual(['guide','download','explore']);
  await expect(publicPage.locator('.dock-tools .download-help')).toHaveCount(0);
  await blankDownloadCheck(publicPage, publicPage.locator('#guide-download'), publicPage.locator('#guide .download-help'), info, 'welcome', bytes.toString());
  await expect(publicPage.locator('#guide')).toBeVisible();
  await publicPage.locator('#guide-explore').click();
  await appearanceChecks(publicPage);
  await blankDownloadCheck(publicPage, publicPage.locator('#dock-import'), null, info, 'dock', bytes.toString());
  await blankDownloadCheck(publicPage, publicPage.locator('#mode .download-link'), publicPage.locator('#mode .download-help'), info, 'notice', bytes.toString());
  await publicPage.locator('#data-open').click();
  await blankDownloadCheck(publicPage, publicPage.locator('#data-import'), publicPage.locator('#data-panel .download-help'), info, 'data', bytes.toString());
  await expect(publicPage.locator('#data-panel')).toBeVisible();
  await publicPage.locator('#data-panel [data-close-dialog]').click();
  await publicPage.locator('#help').click();
  await blankDownloadCheck(publicPage, publicPage.locator('#help-entry'), publicPage.locator('#help-panel .download-help'), info, 'help', bytes.toString());
  await expect(publicPage.locator('#help-panel')).toBeVisible();
  await publicPage.locator('#help-close').click();
  await publicPage.setViewportSize({width:390,height:844});
  await publicPage.locator('#appearance-open').click();
  const panelBox = await publicPage.locator('#appearance-panel').boundingBox();
  expect(panelBox.x).toBeGreaterThanOrEqual(0);expect(panelBox.x+panelBox.width).toBeLessThanOrEqual(390);
  expect(await publicPage.locator('#dock-import svg').evaluate(el=>getComputedStyle(el).display)).toBe('block');
  await publicPage.locator('#appearance-close').click();

  await online.close();

  const context = await browser.newContext({ acceptDownloads: true, offline: true });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await page.goto(pathToFileURL(blank).href);
  expect(new URL(page.url()).protocol).toBe('file:');
  await enter(page);
  await expect(page.locator('footer').getByRole('button', { name: 'Getting started', exact: true })).toBeAttached();
  await expect(page.locator('#release-notes,#help-updates,.help-version')).toHaveCount(0);
  expect(bytes.toString()).not.toContain('Beta testing:');
  await expect(page.locator('#header-inline-controls label > span')).toHaveText(['Track:', 'As a % of:']);
  await expect(page.locator('#treasury-favicon')).toHaveAttribute('type', 'image/png');
  expect(await page.evaluate(async () => {
    const link = document.querySelector('#treasury-favicon');
    const image = new Image(); image.src = link.href; await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0 && link.href.startsWith('data:image/png;base64,');
  })).toBe(true);


  await expect(page.locator('#dock-import')).not.toHaveClass(/blank-download/);
  await expect(page.locator('.dock-tools .download-help')).toBeHidden();
  await page.locator('#data-open').click();
  await expect(page.locator('#data-import')).toHaveText('Import payments or restore a copy');
  await expect(page.locator('#data-import')).not.toHaveClass(/blank-download/);
  await expect(page.locator('#data-panel .download-help')).toBeHidden();
  await page.locator('#data-panel [data-close-dialog]').click();
  await expect(page.locator('#include-current')).toBeVisible();
  await expect(page.locator('.cash-display-options summary')).toHaveCount(0);
  await page.locator('#show-markers').check();
  await page.getByRole('button', {name:'Add strategic note',exact:true}).click();
  await page.locator('#guidance-text').fill('Fictional QA unfinished appearance draft.');
  await appearanceChecks(page, true);
  await page.locator('#appearance-open').click();
  await page.locator('#monochrome-colors').check();
  await expect(page.locator('body')).toHaveAttribute('data-colors','gold_white');
  await page.locator('#appearance-close').click();
  await expect(page.locator('#show-markers')).toBeChecked();
  await page.locator('#guidance-cancel').click();

  await importCSV(page);
  for (const [section, total] of [['cash', 'kpis'], ['spending', 'spend-note'], ['baseline', 'baseline-kpis'], ['charity', 'giving-total'], ['investments', 'savings-kpis'], ['home', 'mortgage-kpis'], ['income', 'income-kpis']]) {
    await expect(page.locator('#' + section + ' > .section-head #' + total)).toHaveCount(1);
  }
  await expect(page.locator('#cash > .section-head #kpis')).toContainText('£947.65');
  await expect(page.locator('#spending > .section-head #spend-note strong')).toHaveText('£947.65');
  await expect(page.locator('#spending')).toContainText('£947.65');

  await page.getByRole('button', { name: 'Add payment', exact: true }).click();
  await page.locator('#payment-date').fill('2026-01-04');
  await page.locator('#payment-name').fill('Fictional QA coffee');
  await page.locator('#payment-amount').fill('-12.34');
  await page.locator('#payment-category').fill('Food');
  await page.locator('#manual-record').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#spending')).toContainText('£959.99');

  await page.getByRole('button', { name: 'Add strategic note', exact: true }).click();
  await page.locator('#guidance-text').fill(note);
  await page.locator('#guidance-save').click();
  await page.getByRole('button', { name: 'Income-left goal', exact: true }).click();
  await page.locator('#goal-label').fill(goal);
  await page.locator('#goal-metric').selectOption('cash');
  await page.locator('#goal-start').fill('0');
  await page.locator('#goal-date').fill('2026-01-01');
  await page.locator('#goal-target').fill('500');
  await page.locator('#goal-save').click();

  // Reimport into the same account must preserve the manual edit and avoid duplicates.
  await importCSV(page, true);
  // The interactive help must work on an offline local copy without changing records.
  const beforeTourFile = await save(page, info, '#save-html', 'Before-tour.html');
  const beforeTour = await fs.readFile(beforeTourFile, 'utf8');
  await page.locator('#help').click();
  await expect(page.locator('#help-panel')).toContainText('Set up your Treasury');
  await expect(page.locator('#help-panel')).toContainText('The app does not encrypt them');
  await expect(page.locator('#help-setup')).toBeVisible();
  await page.locator('#help-tour').click();
  for (let step = 1; step <= 6; step++) {
    await expect(page.locator('#tour-count')).toHaveText('Walkthrough · ' + step + ' of 6');
    await expect(page.locator('.tour-target')).toHaveCount(1);
    await expect(page.locator('.tour-active-surface')).toHaveCount(1);
    await expect(page.locator('#tour-dimmer')).toBeVisible();
    await page.locator('#tour-try').click();
    await expect(page.locator('#tour-try')).toHaveText('Show guide');
    if (step === 3) await expect(page.locator('#tour-try')).not.toBeFocused();
    if (step === 6) {
      await page.locator('#data-open').click();
      await expect(page.locator('#data-panel')).toBeVisible();
      await expect(page.locator('#app-tour')).not.toBeVisible();
      await page.getByRole('button', { name: 'Close data', exact: true }).click();
      await expect(page.locator('#app-tour')).toBeVisible();
    }
    await page.locator('#tour-next').click();
  }
  await expect(page.locator('#app-tour')).not.toBeVisible();
  await expect(page.locator('#tour-dimmer')).not.toBeVisible();
  await expect(page.locator('.tour-active-surface')).toHaveCount(0);
  await expect(page.locator('#help-panel')).toBeVisible();
  await expect(page.locator('#help-entry')).toBeFocused();
  await expect(page.locator('#help-entry')).toHaveText('Open import');
  await expect(page.locator('#help-setup')).toContainText('Your local copy is ready');
  await page.getByRole('button', { name: 'Close help', exact: true }).click();
  const saved = await save(page, info, '#save-html', 'My-Treasury.html');
  const raw = await fs.readFile(saved, 'utf8');
  const ledger = inert(raw, 'ledger-data'), view = inert(raw, 'view-state');
  expect(ledger).toEqual(inert(beforeTour, 'ledger-data'));
  expect(view.appearance.colors).toBe('gold_white');
  for (const key of ['goals', 'drafts', 'folded']) expect(view[key]).toEqual(inert(beforeTour, 'view-state')[key]);
  expect(ledger.transactions).toHaveLength(4);
  expect(ledger.transactions.reduce((sum, row) => sum + row.amount_minor, 0)).toBe(154001);
  expect(ledger.transactions.find(row => row.merchant === 'Fictional QA coffee').amount_minor).toBe(-1234);
  expect(ledger.guidance_notes.some(row => row.text === note)).toBe(true);
  expect(view.goals.some(row => row.label === goal && row.target_minor === 50000)).toBe(true);
  const source = inert(bytes.toString(), 'source-bundle');
  expect(inert(raw, 'source-bundle')).toEqual(source);
  await context.close();

  // Reopen the actual saved file in a fresh context, with no remembered browser state.
  const reopened = await browser.newContext({ acceptDownloads: true, offline: true });
  const second = await reopened.newPage();
  second.on('pageerror', error => errors.push(error.message));
  second.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await second.goto(pathToFileURL(saved).href);
  await enter(second);
  await expect(second.locator('#spending')).toContainText('£959.99');
  await expect(second.locator('#guidance')).toContainText(note);
  await expect(second.locator('.goal-card')).toContainText(goal);
  await expect(second.locator('body')).toHaveAttribute('data-colors','gold_white');
  await second.locator('#appearance-open').click();await second.locator('#monochrome-colors').uncheck();await second.locator('#appearance-close').click();
  await second.reload();await enter(second);await expect(second.locator('body')).toHaveAttribute('data-colors','gold_white');
  const backup = await save(second, info, '#save-json', 'My-Treasury.json');
  // The same saved file must override a later, opposite device preference in both directions.
  await second.locator('#appearance-open').click();await second.locator('#monochrome-colors').uncheck();await second.locator('#appearance-close').click();
  const semanticFile=await save(second,info,'#save-html','Semantic-Treasury.html'),semanticRaw=await fs.readFile(semanticFile,'utf8');
  expect(inert(semanticRaw,'view-state').appearance.colors).toBe('semantic');expect(inert(semanticRaw,'ledger-data')).toEqual(ledger);
  await second.goto(pathToFileURL(semanticFile).href);await enter(second);await expect(second.locator('body')).toHaveAttribute('data-colors','semantic');
  await second.locator('#appearance-open').click();await second.locator('#monochrome-colors').check();await second.locator('#appearance-close').click();
  await second.reload();await enter(second);await expect(second.locator('body')).toHaveAttribute('data-colors','semantic');
  await expect(second.locator('#spending')).toContainText('£959.99');

  await second.screenshot({ path: info.outputPath('reopened.png'), fullPage: false });
  await reopened.close();

  const restored = await browser.newContext({ acceptDownloads: true, offline: true });
  const third = await restored.newPage();
  third.on('pageerror', error => errors.push(error.message));
  third.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await third.goto(pathToFileURL(blank).href);
  await enter(third);
  await third.locator('#dock-import').click();
  await third.locator('#import').setInputFiles(backup);
  await expect(third.locator('#import-preview')).toBeVisible();
  await third.locator('#apply-import').click();
  await expect(third.locator('#spending')).toContainText('£959.99');
  await expect(third.locator('body')).toHaveAttribute('data-colors','gold_white');
  await expect(third.locator('#guidance')).toContainText(note);
  await expect(third.locator('.goal-card')).toContainText(goal);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await restored.close();
});


test('documented Bankline files import and recover with precise currency and account boundaries', async ({browser},info)=>{
 const profiles=require('../fixtures/bank-layouts.json').profiles.filter(p=>['rbs-bankline-statement-signed','rbs-bankline-transaction-search'].includes(p.id));
 const response=await fetch(origin+'/Treasury.html',{headers:{'User-Agent':'Mozilla/5.0 (compatible; TreasuryReleaseQA/1.0)'},redirect:'error',signal:AbortSignal.timeout(30000)});
 expect(response.status).toBe(200);const bytes=Buffer.from(await response.arrayBuffer());expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(blankHash);
 const blank=info.outputPath('Bank-import-Treasury.html');await fs.writeFile(blank,bytes);
 for(const profile of profiles){
  const csv=info.outputPath(profile.id+'.csv');await fs.writeFile(csv,profile.raw);
  const context=await browser.newContext({acceptDownloads:true,offline:true}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
  await page.goto(pathToFileURL(blank).href);await enter(page);
  async function importProfile(existing=false){await page.locator('#dock-import').click();await page.locator('#import').setInputFiles(csv);await expect(page.locator('#csv-mapping')).toBeVisible();
   if(existing)await page.locator('#csv-account').selectOption({label:'Invented Bankline QA'});else await page.locator('#csv-account-name').fill('Invented Bankline QA');
   await page.locator('#preview-csv').click();await expect(page.locator('#import-preview')).toBeVisible();await page.locator('#apply-import').click();await expect(page.locator('#import-panel')).toBeHidden();}
  await importProfile();await expect(page.locator('#spending')).toContainText('£12.34');await importProfile(true);
  const saved=await save(page,info,'#save-html',profile.id+'-saved.html'),raw=await fs.readFile(saved,'utf8'),ledger=inert(raw,'ledger-data');
  expect(ledger.transactions.map(t=>t.amount_minor)).toEqual(profile.expected_minor);expect(ledger.import_sources).toHaveLength(1);expect(ledger.import_sources[0].raw).toBe(profile.raw);expect(ledger.transaction_coverage.basis).toBe('observed');
  const reopened=await browser.newContext({offline:true}),fresh=await reopened.newPage();await fresh.goto(pathToFileURL(saved).href);await enter(fresh);await expect(fresh.locator('#spending')).toContainText('£12.34');await reopened.close();
  // Clearing the optional currency mapping cannot hide an explicit foreign account currency.
  if(profile.id==='rbs-bankline-statement-signed'){
   for(const [name,raw] of [['foreign-account',profile.raw.replace('GBP','EUR')],['mixed-account',profile.raw.replace('00000000','00000001')]]){
    const bad=info.outputPath(name+'.csv');await fs.writeFile(bad,raw);await page.locator('#dock-import').click();await page.locator('#import').setInputFiles(bad);await expect(page.locator('#csv-mapping')).toBeVisible();
    await page.locator('#csv-account').selectOption({label:'Invented Bankline QA'});if(name==='foreign-account')await page.locator('#map-currency').selectOption('-1');
    await page.locator('#preview-csv').click();await expect(page.locator('#import-error')).toBeVisible();await expect(page.locator('#import-preview')).toBeHidden();
    await page.locator('#discard-import').click();await page.locator('#import-panel [data-close-dialog]').click();await expect(page.locator('#spending')).toContainText('£12.34');
   }
  }
  const after=await save(page,info,'#save-html',profile.id+'-after-probes.html');expect(inert(await fs.readFile(after,'utf8'),'ledger-data')).toEqual(ledger);
  expect(errors).toEqual([]);expect(external).toEqual([]);await context.close();
 }
});
