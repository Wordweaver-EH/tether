import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sqrt, hypot, sinCosTurn, MATH_VERSION } from '../src/deterministic-math.js';
import { replayProbe } from '../tools/replay-probe.mjs';
import { replayFromLog } from '../src/log.js';

test('fixed arithmetic roots and rotations agree with reference within roundoff', () => {
  const roots = [Number.MIN_VALUE, 1e-300, 1e-50, 0.01, 0.5, 1, 2, 3, 4, 100, 1e100, Number.MAX_VALUE];
  for (const x of roots) assert.ok(Math.abs(sqrt(x) / Math.sqrt(x) - 1) < 4e-16, `sqrt ${x}`);
  assert.equal(sqrt(0), 0); assert.ok(Object.is(sqrt(-0), -0));
  assert.equal(sqrt(Infinity), Infinity); assert.ok(Number.isNaN(sqrt(-1)));
  assert.equal(hypot(3, 4), 5); assert.equal(hypot(0, 0), 0);
  for (let i = 0; i <= 1000; i++) {
    const angle = Math.PI * i / 1000, got = sinCosTurn(angle);
    assert.ok(Math.abs(got.sin - Math.sin(angle)) < 2e-15);
    assert.ok(Math.abs(got.cos - Math.cos(angle)) < 2e-15);
  }
});

test('simulation and log verification are independent of host libm', () => {
  const expected = replayProbe({ ticks: 3600 });
  const originals = {};
  try {
    for (const name of ['atan2', 'sin', 'cos', 'hypot', 'sqrt']) {
      originals[name] = Math[name];
      Math[name] = () => { throw new Error(`host libm used: ${name}`); };
    }
    const actual = replayProbe({ ticks: 3600 });
    assert.equal(actual.log, expected.log);
    assert.equal(replayFromLog(actual.log).finalHash, expected.finalHash);
  } finally { Object.assign(Math, originals); }
});

test('replay supports named experiment overrides and rejects incompatible math explicitly', () => {
  const run = replayProbe({ ticks: 500, experiment: { TURN_RATE_RAD: Math.PI * 3, RETURN_SPEED: 8 } });
  assert.equal(replayFromLog(run.log).finalHash, run.finalHash);
  const records = run.log.split('\n').filter(Boolean).map(JSON.parse);
  assert.equal(records[0].simulation_math, MATH_VERSION);
  delete records[0].simulation_math;
  assert.throws(() => replayFromLog(records), /math version/);
});

test('interpreter and optimized Node replay produce identical full log bytes', () => {
  const url = new URL('../tools/replay-probe.mjs', import.meta.url).href;
  const script = `import { replayProbe } from ${JSON.stringify(url)}; process.stdout.write(replayProbe().log)`;
  const baseline = execFileSync(process.execPath, ['--input-type=module', '-e', script], { maxBuffer: 8e6 });
  const jitless = execFileSync(process.execPath, ['--jitless', '--input-type=module', '-e', script], { maxBuffer: 8e6, stdio: ['ignore', 'pipe', 'ignore'] });
  assert.deepEqual(jitless, baseline);
  const result = replayFromLog(baseline.toString());
  assert.equal(result.world.tick, 3600); assert.equal(result.verifiedSamples, 601);
});
