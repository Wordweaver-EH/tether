import {createHash} from 'node:crypto';

// Kept independent of the simulator and saved study data. These constants and
// identifiers reproduce PREDECLARATION.md and protocol.mjs exactly.
const CLUSTERS = 32;
const MINUTES = 5;
const SECONDS = 300;
const DECISION_HZ = 30;
const RESAMPLES = 20000;
const NAMESPACE = 'tether-rear-awareness-bootstrap-v1';
const ARMS = Object.freeze(['unchanged', 'awareness']);
const SEATS = Object.freeze(['P1', 'P2']);

export const COUNT_METRICS = Object.freeze([
  'returningReceived', 'outboundReceived', 'totalReceived', 'delivered',
  'returningDelivered', 'outboundDelivered', 'actualThrows', 'actualRecalls',
  'baseProposedThrows', 'throwCommands', 'withheldThrows',
  'alignedAwayOpportunities', 'warnings', 'warningEpisodes', 'scans',
  'movementOverrides', 'scanOnly', 'warningExpired', 'warningScoreResets',
  'reacquisitions', 'visibleOpponentDecisions', 'visibleSpearDecisions',
  'visibleReturningDecisions', 'decisions', 'warningActualReturning',
  'warningActualNotReturning', 'postScanSamples', 'postScanSpearVisible',
  'postScanReturningVisible', 'postScanOpponentVisible',
]);
export const TOTAL_METRICS = Object.freeze([
  'scanAimDisplacementRadTotal', 'motorSigmaTotal',
]);
export const FIXED_METRICS = Object.freeze([...COUNT_METRICS, ...TOTAL_METRICS]);
const RECEIVED = new Set(['returningReceived', 'outboundReceived', 'totalReceived']);
const RATIO_SPECS = Object.freeze({
  meanScanAimDisplacementRad: {numerator: 'scanAimDisplacementRadTotal', denominator: 'scans', unit: 'radians'},
  meanMotorSigmaRad: {numerator: 'motorSigmaTotal', denominator: 'decisions', unit: 'radians'},
  warningDecisionFraction: {numerator: 'warnings', denominator: 'decisions', unit: 'proportion'},
  visibleOpponentFraction: {numerator: 'visibleOpponentDecisions', denominator: 'decisions', unit: 'proportion'},
  visibleSpearFraction: {numerator: 'visibleSpearDecisions', denominator: 'decisions', unit: 'proportion'},
  visibleReturningFraction: {numerator: 'visibleReturningDecisions', denominator: 'decisions', unit: 'proportion'},
  warningActualReturningFraction: {numerator: 'warningActualReturning', denominator: 'warnings', unit: 'proportion'},
  warningActualNotReturningFraction: {numerator: 'warningActualNotReturning', denominator: 'warnings', unit: 'proportion'},
  postScanSpearVisibleFraction: {numerator: 'postScanSpearVisible', denominator: 'postScanSamples', unit: 'proportion'},
  postScanReturningVisibleFraction: {numerator: 'postScanReturningVisible', denominator: 'postScanSamples', unit: 'proportion'},
  postScanOpponentVisibleFraction: {numerator: 'postScanOpponentVisible', denominator: 'postScanSamples', unit: 'proportion'},
});

function check(condition, message) {
  if (!condition) throw new Error(`Invalid study summaries: ${message}`);
}
const sum = values => values.reduce((a, b) => a + b, 0);
const mean = values => sum(values) / values.length;
const ratio = (numerator, denominator) => denominator === 0 ? null : numerator / denominator;
const approximatelyEqual = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));

function validate(bouts) {
  check(Array.isArray(bouts) && bouts.length === 128, 'exactly 128 bout rows are required');
  const rows = new Map();
  for (const row of bouts) {
    check(row && typeof row === 'object' && !Array.isArray(row), 'each bout must be an object');
    const {cluster, counterSeat, arm, boutId, metrics: m} = row;
    check(Number.isInteger(cluster) && cluster >= 0 && cluster < CLUSTERS, 'cluster must be an integer from 0 to 31');
    check(SEATS.includes(counterSeat), 'counterSeat must be P1 or P2');
    check(ARMS.includes(arm), 'arm must be unchanged or awareness');
    const expected = `cluster-${String(cluster).padStart(2, '0')}-${counterSeat}-${arm}`;
    check(boutId === expected, `boutId must match its exact manifest identity (${expected})`);
    check(!rows.has(boutId), `duplicate manifest row ${boutId}`);
    check(row.elapsedSec === SECONDS, `${boutId}: elapsedSec must be exactly 300`);
    for (const key of ['counterHits', 'ordinaryHits']) {
      check(Number.isSafeInteger(row[key]) && row[key] >= 0, `${boutId}: ${key} must be a nonnegative safe integer`);
    }
    check(Number.isFinite(row.netHitsPerMin), `${boutId}: netHitsPerMin must be finite`);
    check(approximatelyEqual(row.netHitsPerMin, (row.counterHits - row.ordinaryHits) / MINUTES), `${boutId}: netHitsPerMin does not reconcile with hits and five-minute exposure`);
    check(m && typeof m === 'object' && !Array.isArray(m), `${boutId}: metrics object is required`);
    for (const key of COUNT_METRICS) {
      check(Number.isSafeInteger(m[key]) && m[key] >= 0, `${boutId}: ${key} must be a nonnegative safe integer`);
    }
    for (const key of TOTAL_METRICS) {
      check(Number.isFinite(m[key]) && m[key] >= 0, `${boutId}: ${key} must be finite and nonnegative`);
    }
    const eq = (a, b, label) => check(a === b, `${boutId}: ${label} do not reconcile`);
    const le = (a, b, label) => check(a <= b, `${boutId}: ${label} exceeds its denominator or parent count`);
    eq(m.delivered, row.counterHits, 'delivered and counterHits');
    eq(m.totalReceived, row.ordinaryHits, 'totalReceived and ordinaryHits');
    eq(m.returningDelivered + m.outboundDelivered, m.delivered, 'delivered phase counts');
    eq(m.returningReceived + m.outboundReceived, m.totalReceived, 'received phase counts');
    eq(m.warningActualReturning + m.warningActualNotReturning, m.warnings, 'warning truth counts');
    eq(m.movementOverrides + m.scanOnly, m.scans, 'scan movement categories');
    eq(m.throwCommands + m.withheldThrows, m.baseProposedThrows, 'proposed, commanded and withheld throws');
    le(m.decisions, SECONDS * DECISION_HZ, 'decisions');
    for (const key of ['baseProposedThrows', 'alignedAwayOpportunities', 'warnings', 'visibleOpponentDecisions', 'visibleSpearDecisions', 'warningExpired', 'warningScoreResets', 'reacquisitions']) le(m[key], m.decisions, key);
    le(m.actualThrows, m.throwCommands, 'actualThrows');
    le(m.actualRecalls, m.decisions, 'actualRecalls');
    le(m.warningEpisodes, m.warnings, 'warningEpisodes');
    le(m.scans, m.warnings, 'scans');
    le(m.withheldThrows, m.scans, 'withheldThrows');
    le(m.visibleReturningDecisions, m.visibleSpearDecisions, 'visibleReturningDecisions');
    le(m.postScanSamples, m.scans, 'postScanSamples');
    le(m.postScanSpearVisible, m.postScanSamples, 'postScanSpearVisible');
    le(m.postScanOpponentVisible, m.postScanSamples, 'postScanOpponentVisible');
    le(m.postScanReturningVisible, m.postScanSpearVisible, 'postScanReturningVisible');
    check(m.scans !== 0 || m.scanAimDisplacementRadTotal === 0, `${boutId}: scan angular total requires executed scans`);
    check(m.decisions !== 0 || m.motorSigmaTotal === 0, `${boutId}: motor sigma total requires decisions`);
    for (const [field, count] of [['warningExposureSec', m.warnings], ['scanExposureSec', m.scans]]) {
      if (row[field] !== undefined) {
        check(Number.isFinite(row[field]) && row[field] >= 0 &&
          row[field] <= Math.min(SECONDS, count / DECISION_HZ) + 1e-9,
        `${boutId}: ${field} must be a finite, nonnegative, clipped decision exposure`);
        check(count !== 0 || row[field] === 0, `${boutId}: ${field} requires matching decision counts`);
      }
    }
    if (arm === 'unchanged') eq(m.scans, 0, 'unchanged-arm executed scans');
    rows.set(boutId, row);
  }
  // Checking every slot, rather than only array length, rules out replacement,
  // duplicate and omitted cluster/seat/arm combinations. Input order is immaterial.
  return Array.from({length: CLUSTERS}, (_, cluster) => {
    const result = {cluster};
    for (const arm of ARMS) result[arm] = SEATS.map(seat => {
      const id = `cluster-${String(cluster).padStart(2, '0')}-${seat}-${arm}`;
      check(rows.has(id), `missing manifest row ${id}`);
      return rows.get(id);
    });
    return result;
  });
}

// One immutable-address draw table is shared by every arm, rate, ratio and
// difference. There is no outcome-seeded RNG and no metric-specific resampling.
let drawTable;
function draws() {
  if (!drawTable) {
    drawTable = new Uint8Array(RESAMPLES * CLUSTERS);
    for (let r = 0; r < RESAMPLES; r++) for (let i = 0; i < CLUSTERS; i++) {
      drawTable[r * CLUSTERS + i] = createHash('sha256')
        .update(JSON.stringify([NAMESPACE, r, i])).digest().readUInt32BE(0) % CLUSTERS;
    }
  }
  return drawTable;
}
function quantile(sorted, p) {
  const position = (sorted.length - 1) * p;
  const lo = Math.floor(position);
  const hi = Math.ceil(position);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (position - lo);
}
function interval(estimate, samples, undefinedResamples = 0) {
  // Undefined conditional resamples are never dropped or redrawn. A percentile
  // interval is unavailable if any resample has an empty required denominator.
  const ci95 = undefinedResamples > 0 || estimate === null ? null : (() => {
    samples.sort((a, b) => a - b);
    return [quantile(samples, 0.025), quantile(samples, 0.975)];
  })();
  return {estimate, ci95, lower: ci95?.[0] ?? null, upper: ci95?.[1] ?? null, undefinedResamples};
}
function meanInterval(values) {
  if (values.every(value => value === values[0])) return interval(values[0], [values[0]]);
  const table = draws();
  const samples = new Array(RESAMPLES);
  for (let r = 0; r < RESAMPLES; r++) {
    let total = 0;
    for (let i = 0; i < CLUSTERS; i++) total += values[table[r * CLUSTERS + i]];
    samples[r] = total / CLUSTERS;
  }
  return interval(mean(values), samples);
}
function pooledRatioInterval(numerators, denominators) {
  const estimate = ratio(sum(numerators), sum(denominators));
  if (estimate === null) return interval(null, [], RESAMPLES);
  const table = draws();
  const samples = [];
  let undefinedResamples = 0;
  for (let r = 0; r < RESAMPLES; r++) {
    let numerator = 0, denominator = 0;
    for (let i = 0; i < CLUSTERS; i++) {
      const c = table[r * CLUSTERS + i];
      numerator += numerators[c]; denominator += denominators[c];
    }
    if (denominator === 0) undefinedResamples++;
    else samples.push(numerator / denominator);
  }
  return interval(estimate, samples, undefinedResamples);
}
function pooledRatioDifference(an, ad, un, ud) {
  const a = ratio(sum(an), sum(ad));
  const u = ratio(sum(un), sum(ud));
  if (a === null || u === null) return interval(null, [], RESAMPLES);
  const table = draws();
  const samples = [];
  let undefinedResamples = 0;
  for (let r = 0; r < RESAMPLES; r++) {
    let aNumerator = 0, aDenominator = 0, uNumerator = 0, uDenominator = 0;
    for (let i = 0; i < CLUSTERS; i++) {
      const c = table[r * CLUSTERS + i];
      aNumerator += an[c]; aDenominator += ad[c];
      uNumerator += un[c]; uDenominator += ud[c];
    }
    if (aDenominator === 0 || uDenominator === 0) undefinedResamples++;
    else samples.push(aNumerator / aDenominator - uNumerator / uDenominator);
  }
  return interval(a - u, samples, undefinedResamples);
}

export function classifyPrimaryInterval(lower, upper) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) throw new Error('A finite ordered primary interval is required');
  return lower > 0 ? 'awareness-improves-net-rate' : upper < 0 ? 'awareness-worsens-net-rate' : 'inconclusive';
}
export function classifyAgainstOrdinaryInterval(lower, upper) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) throw new Error('A finite ordered against-ordinary interval is required');
  return lower > 0 ? 'beats-ordinary' : lower >= -1 ? 'neutralizes-within-margin' : upper < -1 ? 'ordinary-dominates' : 'inconclusive';
}

export function summarizeStudy(bouts) {
  const clusters = validate(bouts);
  const clusterTotals = Object.fromEntries(ARMS.map(arm => [arm,
    Object.fromEntries(FIXED_METRICS.map(key => [key, clusters.map(c => sum(c[arm].map(row => row.metrics[key])))])),
  ]));
  const armNet = Object.fromEntries(ARMS.map(arm => [arm, clusters.map(c =>
    mean(c[arm].map(row => (row.counterHits - row.ordinaryHits) / MINUTES))),
  ]));
  const seatDifferences = clusters.map(c => SEATS.map((_, s) =>
    ((c.awareness[s].counterHits - c.awareness[s].ordinaryHits) -
      (c.unchanged[s].counterHits - c.unchanged[s].ordinaryHits)) / MINUTES));
  const deltas = seatDifferences.map(mean);
  const primary = {
    ...meanInterval(deltas), unit: 'HIT/min', direction: 'awareness-minus-unchanged',
    estimand: 'mean of 32 paired cluster differences, each averaging its two counter seats',
  };
  primary.classification = classifyPrimaryInterval(primary.lower, primary.upper);
  primary.practicalThreshold = 0.5;
  primary.practicallyClearImprovement = primary.lower >= primary.practicalThreshold;
  primary.clusters = clusters.map((c, index) => ({cluster: c.cluster,
    seatDifferences: Object.fromEntries(SEATS.map((seat, s) => [seat, seatDifferences[index][s]])),
    unchanged: armNet.unchanged[index], awareness: armNet.awareness[index], difference: deltas[index],
  }));

  const againstOrdinary = Object.fromEntries(ARMS.map(arm => {
    const result = {...meanInterval(armNet[arm]), unit: 'HIT/min', direction: 'counter-minus-ordinary'};
    result.classification = classifyAgainstOrdinaryInterval(result.lower, result.upper);
    result.classificationBoundaries = 'lower > 0: beats; else lower >= -1: neutralizes within margin; else upper < -1: ordinary dominates; else inconclusive';
    return [arm, result];
  }));
  const perArm = {};
  for (const arm of ARMS) {
    const totals = Object.fromEntries(FIXED_METRICS.map(key => [key, sum(clusterTotals[arm][key])]));
    const denominators = {bouts: 64, exposureMinutes: 320, exposureSeconds: 19200,
      decisions: totals.decisions, scans: totals.scans, warnings: totals.warnings,
      warningTruthSamples: totals.warningActualReturning + totals.warningActualNotReturning,
      postScanSamples: totals.postScanSamples};
    const metrics = Object.fromEntries(COUNT_METRICS.map(key => [key, {total: totals[key],
      meanPerBout: totals[key] / denominators.bouts,
      perMinute: totals[key] / denominators.exposureMinutes,
      denominator: {bouts: denominators.bouts, exposureMinutes: denominators.exposureMinutes},
    }]));
    for (const [key, denominator] of [['scanAimDisplacementRadTotal', 'scans'], ['motorSigmaTotal', 'decisions']]) {
      metrics[key] = {total: totals[key], mean: ratio(totals[key], totals[denominator]),
        denominator: {metric: denominator, count: totals[denominator]}, unit: 'radians'};
    }
    const conditional = Object.fromEntries(Object.entries(RATIO_SPECS).map(([key, spec]) => [key, {
      value: ratio(totals[spec.numerator], totals[spec.denominator]), numerator: totals[spec.numerator],
      denominator: totals[spec.denominator], numeratorMetric: spec.numerator,
      denominatorMetric: spec.denominator, unit: spec.unit,
    }]));
    const occupancy = (field, countMetric) => {
      const rows = clusters.flatMap(c => c[arm]);
      const exactExposureBouts = rows.filter(row => row[field] !== undefined).length;
      const seconds = sum(rows.map(row => row[field] ?? Math.min(SECONDS, row.metrics[countMetric] / DECISION_HZ)));
      return {seconds, denominatorSeconds: denominators.exposureSeconds,
        fraction: seconds / denominators.exposureSeconds, secondsPerDecision: 1 / DECISION_HZ,
        exactExposureBouts, nominalCountExposureBouts: rows.length - exactExposureBouts,
        calculation: 'use recorded end-clipped receipt intervals when supplied; otherwise count times 1/30 second, bounded by the bout'};
    };
    perArm[arm] = {denominators, counterHits: totals.delivered, ordinaryHits: totals.totalReceived,
      netHitsPerMin: (totals.delivered - totals.totalReceived) / denominators.exposureMinutes,
      metrics, conditional,
      warningOccupancy: occupancy('warningExposureSec', 'warnings'),
      scanOccupancy: occupancy('scanExposureSec', 'scans'),
    };
  }

  const secondary = {};
  for (const key of COUNT_METRICS) {
    const rate = Object.fromEntries(ARMS.map(arm => [arm, clusterTotals[arm][key].map(total => total / (2 * MINUTES))]));
    const sign = RECEIVED.has(key) ? -1 : 1;
    const difference = rate.awareness.map((value, c) => sign * (value - rate.unchanged[c]));
    secondary[key] = {...meanInterval(difference), unit: 'count/min',
      direction: sign === -1 ? 'unchanged-minus-awareness' : 'awareness-minus-unchanged',
      positiveMeaning: sign === -1 ? 'fewer HITs received with awareness' : 'greater rate with awareness',
      denominator: 'five minutes per bout; two paired counter seats per cluster',
      arms: Object.fromEntries(ARMS.map(arm => [arm, meanInterval(rate[arm])])),
    };
  }
  for (const [key, spec] of Object.entries(RATIO_SPECS)) {
    const n = Object.fromEntries(ARMS.map(arm => [arm, clusterTotals[arm][spec.numerator]]));
    const d = Object.fromEntries(ARMS.map(arm => [arm, clusterTotals[arm][spec.denominator]]));
    secondary[key] = {...pooledRatioDifference(n.awareness, d.awareness, n.unchanged, d.unchanged),
      unit: spec.unit, direction: 'awareness-minus-unchanged', numeratorMetric: spec.numerator,
      denominatorMetric: spec.denominator, estimand: 'difference of pooled arm ratios, resampling full paired clusters',
      arms: Object.fromEntries(ARMS.map(arm => [arm, {
        ...pooledRatioInterval(n[arm], d[arm]), numerator: sum(n[arm]), denominator: sum(d[arm]),
      }])),
    };
  }
  const awarenessWarnings = perArm.awareness.metrics.warnings.total;
  const awarenessScans = perArm.awareness.metrics.scans.total;
  return {
    schemaVersion: 1,
    design: {clusters: CLUSTERS, bouts: 128, seats: [...SEATS], arms: [...ARMS],
      durationSec: SECONDS, minutesPerBout: MINUTES, totalExposureMinutes: 640},
    bootstrap: {namespace: NAMESPACE, resamples: RESAMPLES, drawsPerResample: CLUSTERS,
      unit: 'paired seed cluster', jointAcrossAllMetrics: true, confidenceLevel: 0.95,
      method: 'percentile', quantile: 'linear interpolation at (n - 1) * p',
      address: 'SHA256(JSON.stringify([namespace, resampleIndex, drawIndex])).readUInt32BE(0) % 32; zero-based indices',
      emptyDenominators: 'null; undefined resamples are neither dropped nor redrawn'},
    primary, againstOrdinary, secondary, perArm,
    validity: {manifestAndNumericalChecksPassed: true,
      awarenessExposurePresent: awarenessWarnings > 0 && awarenessScans > 0,
      missingAwarenessExposure: [awarenessWarnings === 0 ? 'warnings' : null, awarenessScans === 0 ? 'scans' : null].filter(Boolean),
      intendedAwarenessEffectClaimRequires: 'warnings/scans present and a separate passed integrity/manipulation review; numerical classification alone is insufficient'},
    interpretation: {
      conditionalMeans: 'Pooled numerators divided by their stated denominators; empty conditional denominators are null',
      secondary: 'Descriptive, without multiplicity-adjusted secondary efficacy claims',
      warningComplement: 'Current-state non-return warning fraction, not proof of a false prediction',
      postScan: 'Process associations, not isolated causal scan effects; reacquisition does not establish spear identity',
    },
  };
}
