// Run with: node tools/smoke.mjs
// Edge and Playwright come from codefilm; no package installation is needed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/arcx/tools/codefilm/node_modules/playwright-core/index.mjs';
import { gpuInfo } from 'file:///C:/arcx/tools/codefilm/lib/browser.mjs';
import { makeServer } from '../serve.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'reports', 'smoke');
const checks = [], shots = [], timings = {};
let browser, server, client, replay;
const started = performance.now();
const check = (name, detail, pass = true) => {
  checks.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
};

async function sourceHash() {
  const paths = [];
  async function walk(path) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      const child = join(path, item.name);
      if (item.isDirectory()) await walk(child);
      else if (/\.(?:js|mjs|html|css)$/.test(item.name)) paths.push(child);
    }
  }
  for (const dir of ['client', 'replay', 'src', 'arena', 'tools']) await walk(join(root, dir));
  paths.push(join(root, 'serve.mjs'));
  const hash = createHash('sha256');
  for (const path of paths.sort()) {
    hash.update(relative(root, path).replaceAll('\\', '/')).update('\0');
    hash.update(await readFile(path)).update('\0');
  }
  return hash.digest('hex');
}

function watch(page, name) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  const inspect = () => check(`${name} browser errors`, errors.length ? errors.join(' | ') : 'none', errors.length === 0);
  inspect.errors = errors;
  return inspect;
}

async function shot(page, name) {
  await page.evaluate(() => window.__codegame?.render());
  const path = join(output, `${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  shots.push({ name, path: relative(root, path).replaceAll('\\', '/') });
}

async function atWorld(page, x, y) {
  const box = await page.locator('#arena').boundingBox();
  assert.ok(box);
  const scale = Math.min((box.width - 36) / 16, (box.height - 36) / 10);
  await page.mouse.move(box.x + (box.width - 16 * scale) / 2 + (x + 8) * scale,
    box.y + (box.height - 10 * scale) / 2 + (y + 5) * scale);
}

async function state(page) {
  return page.evaluate(() => ({
    view: window.__codegame.percept('P1'), hash: window.__codegame.hashWorld(),
    snapshot: window.__codegame.snapshot().world,
  }));
}

async function advance(page, ticks) {
  return page.evaluate(n => window.__codegame.advance(n), ticks);
}

async function contactSheet(page) {
  const items = await Promise.all(shots.map(async shot => ({
    name: shot.name, src: `data:image/png;base64,${(await readFile(join(root, shot.path))).toString('base64')}`,
  })));
  await page.goto('about:blank');
  const png = await page.evaluate(async items => {
    const width = 600, imageHeight = 375, rowHeight = 410, columns = 3;
    const canvas = document.createElement('canvas');
    canvas.width = width * columns; canvas.height = rowHeight * Math.ceil(items.length / columns);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#071119'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < items.length; i++) {
      const image = new Image(); image.src = items[i].src;
      await image.decode();
      const x = i % columns * width, y = Math.floor(i / columns) * rowHeight;
      ctx.drawImage(image, x, y, width, imageHeight);
      ctx.fillStyle = '#e9e5d9'; ctx.font = '20px sans-serif';
      ctx.fillText(items[i].name.replaceAll('_', ' '), x + 16, y + imageHeight + 25);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, items);
  await writeFile(join(output, 'contact.png'), Buffer.from(png, 'base64'));
  check('contact sheet', `${shots.length} screenshots`);
}

async function main() {
  await mkdir(output, { recursive: true });
  // Playwright's download staging files have UUID names. Clear only prior smoke staging files.
  for (const name of await readdir(output)) if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(name))
    await unlink(join(output, name));
  process.env.CODEFILM_GPU = '0';
  browser = await chromium.launch({ channel: 'msedge', headless: true,
    args: ['--disable-gpu'], downloadsPath: output });
  const graphics = await gpuInfo(browser);
  const renderer = `${graphics.vendor ?? ''} ${graphics.renderer ?? ''}`.trim();
  metadata.renderer = renderer;
  metadata.graphics = graphics;
  if (/radeon|amd/i.test(renderer)) check('software renderer', renderer, false);
  if (graphics.renderer) check('software renderer', renderer, graphics.software === true);
  else {
    const probe = await browser.newPage();
    const canvas2d = await probe.evaluate(() => !!document.createElement('canvas').getContext('2d'));
    await probe.close();
    check('software renderer', 'Canvas 2D (WebGL unavailable)', canvas2d);
  }
  timings.rendererMs = Math.round(performance.now() - started);

  server = makeServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  client = await context.newPage();
  const checkClientErrors = watch(client, 'client');
  await client.goto(`${base}/client/index.html?test=1`, { waitUntil: 'load' });
  await client.waitForFunction(() => window.__codegame?.ready === true, null, { timeout: 10000 })
    .catch(error => { throw new Error(`${error.message}; browser: ${checkClientErrors.errors.join(' | ')}`); });
  check('client loaded', 'test hook ready');
  const contract = await client.evaluate(() => ({
    version: window.__codegame.contractVersion, rate: window.__codegame.tickRate,
    names: ['reset', 'advance', 'percept', 'hashWorld', 'snapshot', 'restore', 'render']
      .every(name => typeof window.__codegame[name] === 'function'),
  }));
  check('codegame contract', JSON.stringify(contract), contract.version === 1 && contract.rate === 120 && contract.names);
  const ordinary = await context.newPage();
  const checkOrdinaryErrors = watch(ordinary, 'normal client');
  await ordinary.goto(`${base}/client/index.html`);
  check('hook absent in normal play', String(await ordinary.evaluate(() => !('__codegame' in window))),
    await ordinary.evaluate(() => !('__codegame' in window)));
  checkOrdinaryErrors(); await ordinary.close();

  await client.selectOption('#difficulty', 'normal');
  await client.selectOption('#mode', 'MODE_B');
  await client.click('#begin');
  check('bout starts from UI', 'HUD visible', await client.locator('#hud').isVisible());
  const seed = 24680;
  await client.evaluate(seed => window.__codegame.reset(seed), seed);
  const initial = await state(client);
  check('seeded MODE_B normal start', `tick ${initial.snapshot.tick}, hash ${initial.hash}`,
    initial.snapshot.tick === 0 && initial.view.mode === 'MODE_B');
  await shot(client, '01_start');

  await client.keyboard.down('KeyW'); await client.keyboard.down('KeyD');
  await advance(client, 72);
  await client.keyboard.up('KeyW'); await client.keyboard.up('KeyD');
  const moved = await state(client);
  check('WASD movement', JSON.stringify(moved.view.own.position),
    moved.view.own.position.x > initial.view.own.position.x + 1 &&
    moved.view.own.position.y < initial.view.own.position.y - 1);
  await atWorld(client, 2, moved.view.own.position.y);
  await client.locator('#arena').click({ position: { x: 1, y: 1 }, force: true });
  // The click above moves the pointer; put aim back toward obstacle B.
  await atWorld(client, 2, moved.view.own.position.y);
  await advance(client, 1);
  let current = await state(client);
  check('mouse aim and click throw', `spear ${current.snapshot.spears[0].state}`,
    current.snapshot.spears[0].state === 'OUTBOUND');
  await shot(client, '02_first_throw');
  await advance(client, 80);
  current = await state(client);
  check('spear embeds', `spear ${current.snapshot.spears[0].state}`,
    current.snapshot.spears[0].state === 'EMBEDDED');
  await shot(client, '03_embedded');
  await client.keyboard.press('Space');
  await advance(client, 1);
  current = await state(client);
  check('Space recalls', `spear ${current.snapshot.spears[0].state}`,
    current.snapshot.spears[0].state === 'RETURNING');
  await shot(client, '04_recall');

  const own = current.view.own.position;
  await atWorld(client, -7.8, own.y);
  await advance(client, 70);
  current = await state(client);
  check('MODE_B hides off-cone NPC', `opponent ${current.view.opponent ? 'visible' : 'hidden'}`,
    current.view.opponent === null);
  await shot(client, '05_npc_hidden');
  await advance(client, 2400 - current.snapshot.tick);
  current = await state(client);
  check('20 seconds of game time', `tick ${current.snapshot.tick}, hash ${current.hash}`,
    current.snapshot.tick === 2400 && !current.snapshot.ended);
  const saved = await client.evaluate(() => window.__codegame.snapshot());
  const renderResult = await client.evaluate(() => {
    const before = window.__codegame.hashWorld();
    window.__codegame.render(); window.__codegame.render();
    return [before, window.__codegame.hashWorld()];
  });
  check('render does not advance simulation', renderResult.join(' = '), renderResult[0] === renderResult[1]);
  await client.evaluate(() => window.__codegame.reset(24680));
  await client.evaluate(snapshot => window.__codegame.restore(snapshot), saved);
  check('snapshot restore reproducible', saved.hash, await client.evaluate(() => window.__codegame.hashWorld()) === saved.hash);
  timings.gameplayMs = Math.round(performance.now() - started);

  for (let remaining = 36000 - 2400; remaining > 0; remaining -= 1200)
    await advance(client, Math.min(remaining, 1200));
  await client.locator('#result').waitFor({ state: 'visible' });
  const end = await state(client);
  check('bout result screen', `${await client.locator('#resultTitle').textContent()}, tick ${end.snapshot.tick}`,
    end.snapshot.ended && end.snapshot.tick === 36000 && await client.locator('#download').isVisible());
  await shot(client, '06_result');
  const [download] = await Promise.all([client.waitForEvent('download'), client.click('#download')]);
  const logPath = join(output, 'bout.jsonl');
  await download.saveAs(logPath);
  const log = await readFile(logPath, 'utf8');
  // Exact floating-point hashes can differ between Edge and Node, so verify in the recording engine.
  const verified = await client.evaluate(async text => {
    const { replayFromLog } = await import('/src/log.js');
    const result = replayFromLog(text);
    return { verifiedSamples: result.verifiedSamples, finalHash: result.finalHash };
  }, log);
  check('downloaded log verifies in Edge', `${verified.verifiedSamples} samples, ${verified.finalHash}`,
    verified.finalHash === end.hash && verified.verifiedSamples === 6001);
  timings.boutMs = Math.round(performance.now() - started);

  replay = await context.newPage();
  const checkReplayErrors = watch(replay, 'Mind View');
  await replay.goto(`${base}/replay/index.html`, { waitUntil: 'load' });
  await replay.locator('#file').setInputFiles(logPath);
  await replay.waitForFunction(() => document.querySelector('#verification')?.textContent?.startsWith('VERIFIED'), null,
    { timeout: 120000 });
  const verification = await replay.locator('#verification').textContent();
  check('Mind View verifies downloaded log', verification, /6001 SAMPLES/.test(verification));
  await replay.locator('#scrub').evaluate((element) => {
    element.value = String(Number(element.max) / 2);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const replayState = await replay.evaluate(() => ({
    time: Number(document.querySelector('#scrub').value),
    layers: [...document.querySelectorAll('[data-layer]')].every(el => el.checked),
    focus: document.querySelector('#focus').textContent,
  }));
  check('Mind View middle with all overlays', JSON.stringify(replayState),
    replayState.time === 150 && replayState.layers && replayState.focus !== '—');
  await shot(replay, '07_mind_view_middle');
  checkClientErrors(); checkReplayErrors();
  await contactSheet(replay);
  timings.totalMs = Math.round(performance.now() - started);
  await unlink(logPath);
  await unlink(await download.path()).catch(() => {});
  metadata.sourceTreeHash = await sourceHash();
  metadata.gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

let metadata = {};
try { await main(); }
catch (error) {
  checks.push({ name: 'smoke run', pass: false, detail: error.stack ?? String(error) });
  process.exitCode = 1;
} finally {
  await replay?.close().catch(() => {});
  await client?.close().catch(() => {});
  await browser?.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  timings.totalMs ??= Math.round(performance.now() - started);
  await mkdir(output, { recursive: true });
  for (const name of await readdir(output)) if (name === 'bout.jsonl' ||
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(name))
    await unlink(join(output, name)).catch(() => {});
  metadata.sourceTreeHash ??= await sourceHash();
  metadata.gitHead ??= execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  await writeFile(join(output, 'smoke.json'), JSON.stringify({
    passed: checks.every(check => check.pass), checks, renderer: metadata.renderer ?? null,
    graphics: metadata.graphics ?? null, timings, sourceTreeHash: metadata.sourceTreeHash ?? null,
    gitHead: metadata.gitHead ?? null, screenshots: shots,
  }, null, 2) + '\n');
  for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}: ${item.detail}`);
}
