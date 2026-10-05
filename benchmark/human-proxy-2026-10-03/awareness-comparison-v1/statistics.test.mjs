import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  COUNT_METRICS, FIXED_METRICS, summarizeStudy,
  classifyPrimaryInterval, classifyAgainstOrdinaryInterval,
} from './statistics.mjs';

// Synthetic summaries only: this suite never imports the simulator, opens saved
// outcomes, runs a bout, or reads a previously produced comparison.
function fixture(change = () => {}) {
  const rows = [];
  for (let cluster = 0; cluster < 32; cluster++) for (const counterSeat of ['P1', 'P2']) {
    for (const arm of ['unchanged', 'awareness']) {
      const awareness = arm === 'awareness';
      const metrics = Object.fromEntries(FIXED_METRICS.map(key => [key, 0]));
      Object.assign(metrics, {
        decisions: 100, warnings: 2, warningEpisodes: 1,
        warningActualReturning: 1, warningActualNotReturning: 1,
        baseProposedThrows: 4, throwCommands: awareness ? 3 : 4,
        withheldThrows: awareness ? 1 : 0, actualThrows: 2, actualRecalls: 1,
        scans: awareness ? 2 : 0, movementOverrides: awareness ? 1 : 0,
        scanOnly: awareness ? 1 : 0, alignedAwayOpportunities: 3,
        visibleOpponentDecisions: 20, visibleSpearDecisions: 10,
        visibleReturningDecisions: 5, warningExpired: 1, reacquisitions: 1,
        postScanSamples: awareness ? 2 : 0, postScanSpearVisible: awareness ? 1 : 0,
        postScanReturningVisible: awareness ? 1 : 0, postScanOpponentVisible: awareness ? 1 : 0,
        scanAimDisplacementRadTotal: awareness ? 1.5 : 0, motorSigmaTotal: 4,
      });
      const row = {cluster, counterSeat, arm,
        boutId: `cluster-${String(cluster).padStart(2, '0')}-${counterSeat}-${arm}`,
        elapsedSec: 300, counterHits: awareness ? 14 : 10, ordinaryHits: awareness ? 7 : 8,
        warningExposureSec: 2 / 30, scanExposureSec: awareness ? 2 / 30 : 0,
        metrics,
      };
      change(row);
      reconcile(row);
      rows.push(row);
    }
  }
  return rows;
}
function reconcile(row) {
  row.netHitsPerMin = (row.counterHits - row.ordinaryHits) / 5;
  row.metrics.delivered = row.counterHits;
  row.metrics.totalReceived = row.ordinaryHits;
  row.metrics.returningDelivered = Math.min(2, row.counterHits);
  row.metrics.outboundDelivered = row.counterHits - row.metrics.returningDelivered;
  row.metrics.outboundReceived = Math.min(2, row.ordinaryHits);
  row.metrics.returningReceived = row.ordinaryHits - row.metrics.outboundReceived;
}
const close = (actual, expected, label = '') => assert.ok(Math.abs(actual - expected) < 1e-11,
  `${label}: expected ${expected}, received ${actual}`);
const closeInterval = (actual, expected) => {
  assert.equal(actual.length, 2);
  close(actual[0], expected[0], 'lower CI');
  close(actual[1], expected[1], 'upper CI');
};

test('constant synthetic deltas give exact known intervals and five-minute rate differences', () => {
  const result = summarizeStudy(fixture());
  assert.equal(result.primary.estimate, 1);
  assert.deepEqual(result.primary.ci95, [1, 1]);
  assert.equal(result.primary.classification, 'awareness-improves-net-rate');
  assert.equal(result.primary.practicallyClearImprovement, true);
  closeInterval(result.againstOrdinary.unchanged.ci95, [0.4, 0.4]);
  closeInterval(result.againstOrdinary.awareness.ci95, [1.4, 1.4]);
  close(result.secondary.delivered.estimate, 0.8);
  closeInterval(result.secondary.delivered.ci95, [0.8, 0.8]);
  closeInterval(result.secondary.returningReceived.ci95, [0.2, 0.2]);
  closeInterval(result.secondary.totalReceived.ci95, [0.2, 0.2]);
  assert.equal(result.secondary.totalReceived.direction, 'unchanged-minus-awareness');
  assert.equal(result.secondary.delivered.direction, 'awareness-minus-unchanged');
  assert.deepEqual(result.secondary.outboundReceived.ci95, [0, 0]);
  close(result.secondary.withheldThrows.estimate, 0.2);
  assert.equal(result.design.bouts, 128);
  assert.equal(result.design.totalExposureMinutes, 640);
  assert.equal(result.bootstrap.resamples, 20000);
  assert.equal(result.bootstrap.namespace, 'tether-rear-awareness-bootstrap-v1');
  assert.equal(result.bootstrap.jointAcrossAllMetrics, true);
  assert.equal(result.validity.awarenessExposurePresent, true);
});

test('pairing averages seats inside each of 32 clusters and all rate CIs share exact SHA-addressed draws', () => {
  const rows = fixture(row => {
    const s = row.counterSeat === 'P1' ? 1 : -1;
    row.counterHits = 200 + s * 20;
    row.ordinaryHits = 100;
    if (row.arm === 'awareness') {
      row.counterHits += row.cluster + s * 4;
      row.ordinaryHits -= row.cluster;
    }
  });
  const result = summarizeStudy(rows.reverse());
  close(result.primary.estimate, 6.2);
  for (const cluster of result.primary.clusters) {
    close(cluster.seatDifferences.P1, (2 * cluster.cluster + 4) / 5);
    close(cluster.seatDifferences.P2, (2 * cluster.cluster - 4) / 5);
    close(cluster.difference, 2 * cluster.cluster / 5);
  }
  // Independent reference: sum sampled cluster integers first, then convert to
  // the known synthetic HIT/min contrast. No implementation helpers are reused.
  const reference = [];
  for (let r = 0; r < 20000; r++) {
    let total = 0;
    for (let i = 0; i < 32; i++) total += createHash('sha256')
      .update(JSON.stringify(['tether-rear-awareness-bootstrap-v1', r, i]))
      .digest().readUInt32BE(0) % 32;
    reference.push(2 * total / (5 * 32));
  }
  reference.sort((a, b) => a - b);
  const endpoint = p => {
    const x = (reference.length - 1) * p;
    const j = Math.floor(x);
    return reference[j] + (reference[Math.ceil(x)] - reference[j]) * (x - j);
  };
  closeInterval(result.primary.ci95, [endpoint(0.025), endpoint(0.975)]);
  closeInterval(result.secondary.delivered.ci95, result.primary.ci95.map(x => x / 2));
  closeInterval(result.secondary.totalReceived.ci95, result.primary.ci95.map(x => x / 2));
  const reordered = summarizeStudy([...rows].sort((a, b) => a.boutId.localeCompare(b.boutId)));
  assert.deepEqual(reordered, result, 'summaries must be independent of input row order');
});

test('primary and against-ordinary classification use the exact declared strict boundaries', () => {
  assert.equal(classifyPrimaryInterval(0, 1), 'inconclusive');
  assert.equal(classifyPrimaryInterval(-1, 0), 'inconclusive');
  assert.equal(classifyPrimaryInterval(0, 0), 'inconclusive');
  assert.equal(classifyPrimaryInterval(Number.EPSILON, 1), 'awareness-improves-net-rate');
  assert.equal(classifyPrimaryInterval(-1, -Number.EPSILON), 'awareness-worsens-net-rate');
  assert.equal(classifyAgainstOrdinaryInterval(Number.EPSILON, 1), 'beats-ordinary');
  assert.equal(classifyAgainstOrdinaryInterval(0, 1), 'neutralizes-within-margin');
  assert.equal(classifyAgainstOrdinaryInterval(-1, -1), 'neutralizes-within-margin');
  assert.equal(classifyAgainstOrdinaryInterval(-2, -1), 'inconclusive');
  assert.equal(classifyAgainstOrdinaryInterval(-2, -1 - Number.EPSILON), 'ordinary-dominates');
  assert.equal(classifyAgainstOrdinaryInterval(-2, 2), 'inconclusive');
  for (const fn of [classifyPrimaryInterval, classifyAgainstOrdinaryInterval]) {
    for (const pair of [[null, 0], [0, Infinity], [NaN, 0], [1, 0]]) assert.throws(() => fn(...pair));
  }
});

test('a 0.5 lower endpoint qualifies practically, but a 0.4 endpoint does not', () => {
  const exact = summarizeStudy(fixture(row => {
    row.ordinaryHits = 8;
    row.counterHits = 10 + (row.arm === 'awareness' ? (row.counterSeat === 'P1' ? 2 : 3) : 0);
  }));
  assert.deepEqual(exact.primary.ci95, [0.5, 0.5]);
  assert.equal(exact.primary.practicallyClearImprovement, true);
  const below = summarizeStudy(fixture(row => {
    row.ordinaryHits = 8;
    row.counterHits = row.arm === 'awareness' ? 12 : 10;
  }));
  assert.deepEqual(below.primary.ci95, [0.4, 0.4]);
  assert.equal(below.primary.practicallyClearImprovement, false);
  assert.equal(below.primary.classification, 'awareness-improves-net-rate');
});

test('every fixed metric is aggregated and conditional means expose explicit denominators', () => {
  const result = summarizeStudy(fixture());
  for (const arm of ['unchanged', 'awareness']) {
    assert.deepEqual(Object.keys(result.perArm[arm].metrics).sort(), [...FIXED_METRICS].sort());
    assert.equal(result.perArm[arm].denominators.bouts, 64);
    assert.equal(result.perArm[arm].denominators.exposureMinutes, 320);
    assert.equal(result.perArm[arm].denominators.exposureSeconds, 19200);
    assert.equal(result.perArm[arm].denominators.decisions, 6400);
    assert.equal(result.perArm[arm].metrics.decisions.total, 6400);
    assert.equal(result.perArm[arm].metrics.decisions.perMinute, 20);
    assert.equal(result.perArm[arm].conditional.visibleOpponentFraction.value, 0.2);
    assert.equal(result.perArm[arm].conditional.visibleOpponentFraction.denominator, 6400);
    assert.equal(result.perArm[arm].conditional.warningDecisionFraction.value, 0.02);
    assert.equal(result.perArm[arm].conditional.warningActualReturningFraction.value, 0.5);
    assert.equal(result.perArm[arm].conditional.warningActualNotReturningFraction.value, 0.5);
    assert.equal(result.perArm[arm].metrics.motorSigmaTotal.mean, 0.04);
    for (const key of COUNT_METRICS) assert.ok(result.secondary[key]);
  }
  assert.equal(result.perArm.awareness.metrics.scanAimDisplacementRadTotal.total, 96);
  assert.equal(result.perArm.awareness.metrics.scanAimDisplacementRadTotal.mean, 0.75);
  assert.equal(result.perArm.awareness.metrics.scanAimDisplacementRadTotal.denominator.count, 128);
  assert.equal(result.perArm.unchanged.metrics.scanAimDisplacementRadTotal.mean, null);
  assert.equal(result.perArm.unchanged.metrics.scanAimDisplacementRadTotal.denominator.count, 0);
  assert.equal(result.secondary.meanScanAimDisplacementRad.estimate, null);
  assert.equal(result.secondary.meanScanAimDisplacementRad.ci95, null);
  assert.deepEqual(result.secondary.meanScanAimDisplacementRad.arms.awareness.ci95, [0.75, 0.75]);
  assert.equal(result.secondary.meanScanAimDisplacementRad.arms.unchanged.estimate, null);
  assert.equal(result.perArm.awareness.conditional.postScanReturningVisibleFraction.value, 0.5);
  assert.equal(result.perArm.unchanged.conditional.postScanReturningVisibleFraction.value, null);
});

test('exact clipped exposure fields supersede nominal warning/scan count times 1/30', () => {
  const rows = fixture(row => {
    row.warningExposureSec = 1 / 30 + 1 / 60;
    row.scanExposureSec = row.arm === 'awareness' ? 1 / 30 + 1 / 60 : 0;
  });
  const result = summarizeStudy(rows);
  close(result.perArm.awareness.warningOccupancy.seconds, 64 * 0.05);
  close(result.perArm.awareness.scanOccupancy.seconds, 64 * 0.05);
  close(result.perArm.awareness.warningOccupancy.fraction, 64 * 0.05 / 19200);
  assert.equal(result.perArm.awareness.warningOccupancy.exactExposureBouts, 64);
  assert.equal(result.perArm.awareness.warningOccupancy.nominalCountExposureBouts, 0);
  assert.equal(result.perArm.unchanged.scanOccupancy.seconds, 0);
});

test('empty conditional denominators stay null, including CIs, and missing exposure cannot support an awareness claim', () => {
  const rows = fixture(row => {
    for (const key of FIXED_METRICS) row.metrics[key] = 0;
    row.warningExposureSec = 0;
    row.scanExposureSec = 0;
    row.counterHits = 0;
    row.ordinaryHits = 0;
  });
  const result = summarizeStudy(rows);
  assert.equal(result.primary.classification, 'inconclusive');
  assert.deepEqual(result.primary.ci95, [0, 0]);
  assert.equal(result.validity.awarenessExposurePresent, false);
  assert.deepEqual(result.validity.missingAwarenessExposure, ['warnings', 'scans']);
  for (const arm of ['unchanged', 'awareness']) {
    for (const value of Object.values(result.perArm[arm].conditional)) {
      assert.equal(value.value, null);
      assert.equal(value.denominator, 0);
    }
    assert.equal(result.perArm[arm].metrics.motorSigmaTotal.mean, null);
    assert.equal(result.perArm[arm].metrics.scanAimDisplacementRadTotal.mean, null);
  }
  assert.equal(result.secondary.warningActualReturningFraction.estimate, null);
  assert.equal(result.secondary.warningActualReturningFraction.ci95, null);
  assert.equal(result.secondary.warningActualReturningFraction.undefinedResamples, 20000);
});

test('conditional resampling retains zero-denominator clusters instead of dropping or redrawing them', () => {
  const rows = fixture(row => {
    if (row.cluster !== 0) {
      for (const key of ['warnings', 'warningEpisodes', 'warningActualReturning', 'warningActualNotReturning',
        'scans', 'movementOverrides', 'scanOnly', 'withheldThrows', 'scanAimDisplacementRadTotal',
        'postScanSamples', 'postScanSpearVisible', 'postScanReturningVisible', 'postScanOpponentVisible']) row.metrics[key] = 0;
      row.metrics.throwCommands = row.metrics.baseProposedThrows;
      row.warningExposureSec = 0;
      row.scanExposureSec = 0;
    }
  });
  const result = summarizeStudy(rows);
  const fraction = result.secondary.warningActualReturningFraction;
  assert.equal(fraction.estimate, 0);
  assert.equal(fraction.ci95, null);
  assert.ok(fraction.undefinedResamples > 0 && fraction.undefinedResamples < 20000);
  assert.equal(fraction.arms.unchanged.estimate, 0.5);
  assert.equal(fraction.arms.unchanged.ci95, null);
  assert.equal(fraction.arms.unchanged.undefinedResamples, fraction.undefinedResamples);
  assert.equal(fraction.arms.awareness.undefinedResamples, fraction.undefinedResamples);
});

test('malformed manifest rows, durations, hits and net rates are rejected before inference', () => {
  assert.throws(() => summarizeStudy([]), /exactly 128/);
  assert.throws(() => summarizeStudy({length: 128}), /exactly 128/);
  for (const mutate of [
    rows => rows.pop(),
    rows => rows.push(rows[0]),
    rows => { rows[1] = structuredClone(rows[0]); },
    rows => { rows[0].cluster = 32; },
    rows => { rows[0].cluster = 0.5; },
    rows => { rows[0].counterSeat = 'P3'; },
    rows => { rows[0].arm = 'control'; },
    rows => { rows[0].boutId = 'another-bout'; },
    rows => { rows[0].elapsedSec = 299.99; },
    rows => { rows[0].counterHits = -1; },
    rows => { rows[0].ordinaryHits = 2.5; },
    rows => { rows[0].netHitsPerMin += 0.01; },
    rows => { rows[0].netHitsPerMin = NaN; },
    rows => { rows[0].metrics.delivered += 1; },
    rows => { rows[0].metrics.totalReceived += 1; },
    rows => { rows[0].metrics.returningReceived += 1; },
    rows => { rows[0].metrics.returningDelivered += 1; },
    rows => { rows[0] = null; },
  ]) {
    const rows = fixture();
    mutate(rows);
    assert.throws(() => summarizeStudy(rows), /Invalid study summaries/);
  }
});

test('malformed metrics, impossible subcounts and invalid exposure fields are rejected', () => {
  for (const change of [
    row => { delete row.metrics; },
    row => { delete row.metrics.actualRecalls; },
    row => { row.metrics.scans = '2'; },
    row => { row.metrics.warnings = 1.5; },
    row => { row.metrics.decisions = -1; },
    row => { row.metrics.decisions = 9001; },
    row => { row.metrics.actualThrows = Number.MAX_SAFE_INTEGER + 1; },
    row => { row.metrics.motorSigmaTotal = Infinity; },
    row => { row.metrics.scanAimDisplacementRadTotal = NaN; },
    row => { row.metrics.warningActualReturning += 1; },
    row => { row.metrics.visibleReturningDecisions = 11; },
    row => { row.metrics.postScanReturningVisible = 10; },
    row => { row.metrics.throwCommands += 1; },
    row => { row.metrics.movementOverrides += 1; },
    row => { row.warningExposureSec = -1; },
    row => { row.scanExposureSec = Infinity; },
    row => { row.warningExposureSec = 300; },
  ]) {
    const rows = fixture();
    change(rows[1]);
    assert.throws(() => summarizeStudy(rows), /Invalid study summaries/);
  }
});
