// Delivery-only diagnostics, kept separate from the frozen 131-test suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeReplayProbeServer, resolveProbeRequest } from '../tools/serve-replay-probe.mjs';

async function withServer(run) {
  const server = makeReplayProbeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('diagnostic server serves the unmodified browser probe with HTML MIME', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/tools/replay-probe.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.match(await response.text(), /Generate browser log/);
  });
});

test('diagnostic server serves probe and simulation module imports', async () => {
  await withServer(async base => {
    for (const path of ['/tools/replay-probe.mjs', '/src/sim.js', '/src/log.js', '/src/deterministic-math.js', '/src/perception.js']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /^text\/javascript/);
      assert.ok((await response.text()).length > 0);
    }
  });
});

test('diagnostic server supports HEAD without a response body', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/tools/replay-probe.html`, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.ok(Number(response.headers.get('content-length')) > 0);
    assert.equal(await response.text(), '');
  });
});

test('diagnostic server refuses mutation methods', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/tools/replay-probe.html`, { method: 'POST', body: 'no writes' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  });
});

test('diagnostic server excludes repository, reports, unrelated tools, and the game client', async () => {
  await withServer(async base => {
    for (const path of ['/.git/config', '/reports/final/phase4a-exploits.md', '/tools/serve-replay-probe.mjs', '/client/index.html', '/']) {
      assert.equal((await fetch(`${base}${path}`)).status, 403, path);
    }
  });
});

test('diagnostic resolver rejects source traversal, encoded separators, and non-module assets', () => {
  for (const path of ['/src/../../README.md', '/src/../tools/replay-probe.mjs', '/src/%2e%2e/serve.mjs', '/src/..%5cserve.mjs', '/src/secret.json', '/src/%00.js']) {
    assert.equal(resolveProbeRequest(path), null, path);
  }
});

test('diagnostic server reports malformed and absent paths without crashing', async () => {
  await withServer(async base => {
    assert.equal((await fetch(`${base}/src/%zz.js`)).status, 400);
    assert.equal((await fetch(`${base}/src/missing-module.js`)).status, 404);
    assert.equal((await fetch(`${base}/tools/replay-probe.html`)).status, 200);
  });
});
