// Descriptive readouts from recorded observations, never claims about a
// player's intent. Older logs and missing evidence remain explicitly unknown.
const finite = value => Number.isFinite(value);
export function learnedSummary(snapshot) {
  const a = snapshot?.adaptation;
  if (!a || !finite(a.drift?.n) || a.drift.n < 1)
    return 'Not enough visible observations yet to summarize your play.';
  const parts = [`${Math.floor(a.drift.n)} visible movement observations recorded`];
  if (finite(a.recall?.n) && a.recall.n > 0 && finite(a.recall.mean))
    parts.push(`recent observed embed-to-recall delay: ${a.recall.mean.toFixed(2)} s (${Math.floor(a.recall.n)} observations)`);
  if (finite(a.scan?.n) && a.scan.n > 0 && finite(a.scan.mean))
    parts.push(`recent visible turning rate: ${a.scan.mean.toFixed(2)} rad/s`);
  if (finite(a.side?.a) && finite(a.side?.b) && a.side.a + a.side.b > 5) {
    const p = a.side.a / (a.side.a + a.side.b);
    parts.push(`current lateral-movement estimate: ${Math.round(Math.max(p, 1 - p) * 100)}% toward ${p >= 0.5 ? 'the positive' : 'the negative'} side of the mind-to-player axis`);
  }
  if (finite(a.reversals) && a.reversals > 0)
    parts.push(`${Math.floor(a.reversals)} changes against a strong prior side estimate`);
  return parts.join(' · ') + '. These estimates use what the mind could see and can change as you play.';
}
export function cognitionReadouts(trace) {
  const c = trace?.cognition;
  if (!c) return [['Status', 'Not recorded in this log']];
  const tiers = { 0: 'Reflex', 1: 'Intuition', 2: 'Deliberation' };
  const rows = [['Tier', tiers[c.tier] ?? String(c.tier ?? 'Not recorded')]];
  if (c.budget && finite(c.budget.spent) && finite(c.budget.limit))
    rows.push(['Work units', `${c.budget.spent} / ${c.budget.limit}`]);
  if (c.tactic) rows.push(['Tactic', String(c.tactic)]);
  if (typeof c.automatic === 'boolean') rows.push(['Learned automatic response', c.automatic ? 'Yes' : 'No']);
  if (c.cover) {
    if (c.cover.intent) rows.push(['Cover intent', String(c.cover.intent)]);
    if (c.cover.reason) rows.push(['Cover reason', String(c.cover.reason)]);
    if (c.cover.actionSource) rows.push(['Command source', String(c.cover.actionSource)]);
    if (c.cover.arbitration) {
      const a = c.cover.arbitration;
      if (a.locomotionSource) rows.push(['Movement source', String(a.locomotionSource)]);
      if (a.weaponSource) rows.push(['Weapon intention source', String(a.weaponSource)]);
      if (a.guard) rows.push(['Pre-noise shot guard', a.guard.shotAllowed ? 'Compatible with received visible target' : String(a.guard.reason ?? 'No shot issued')]);
    }
    if (typeof c.cover.routeCache?.reused === 'boolean')
      rows.push(['Route cache reused', c.cover.routeCache.reused ? 'Yes' : 'No']);
    if (c.cover.planning?.status) rows.push(['Planning status', String(c.cover.planning.status)]);
    if (c.cover.planning?.execution) rows.push(['Weapon execution', String(c.cover.planning.execution)]);
    if (c.cover.planning && Object.hasOwn(c.cover.planning, 'fallback'))
      rows.push(['Planning fallback', c.cover.planning.fallback ? String(c.cover.planning.fallback) : 'None']);
  }
  if (trace.actualCommand) {
    if (trace.input) rows.push(['Requested input (before noise)', commandReadout(trace.input)]);
    rows.push(['Actual command (post-noise)', commandReadout(trace.actualCommand)]);
  }
  return rows;
}
function commandReadout(command) {
  const parts = [];
  if (finite(command.moveX) && finite(command.moveY))
    parts.push(`move (${command.moveX.toFixed(3)}, ${command.moveY.toFixed(3)})`);
  if (finite(command.aimX) && finite(command.aimY))
    parts.push(`aim (${command.aimX.toFixed(3)}, ${command.aimY.toFixed(3)})`);
  if (typeof command.throw === 'boolean') parts.push(`throw ${command.throw ? 'yes' : 'no'}`);
  if (typeof command.recall === 'boolean') parts.push(`recall ${command.recall ? 'yes' : 'no'}`);
  return parts.join(' · ') || 'Not recorded';
}
export function adaptationReadouts(trace) {
  const a = trace?.cognition?.adaptation ?? trace?.adaptation;
  if (!a) return [['Status', 'Not recorded in this log']];
  if (a.enabled === false) return [['Status', 'Ablated / disabled']];
  const rows = [];
  if (finite(a.sideProbability)) rows.push(['Positive-side estimate', `${Math.round(a.sideProbability * 100)}%`]);
  if (finite(a.confidence)) rows.push(['Side bias strength', `${Math.round(a.confidence * 100)}%`]);
  if (finite(a.samples)) rows.push(['Effective side evidence', a.samples.toFixed(1)]);
  if (finite(a.recallDelay)) rows.push(['Observed recall delay', `${a.recallDelay.toFixed(2)} s`]);
  if (finite(a.scanRate)) rows.push(['Observed turning rate', `${a.scanRate.toFixed(2)} rad/s`]);
  if (finite(a.neutralization)) rows.push(['Approach-to-spear estimate', `${Math.round(a.neutralization * 100)}%`]);
  if (finite(a.reversals)) rows.push(['Prior reversals', String(a.reversals)]);
  return rows.length ? rows : [['Status', 'No observations yet']];
}
export function counterfactualReadout(trace, legacyNote = null) {
  const c = trace?.cognition, branches = c?.branches;
  if (branches?.length) {
    const embedded = c.situation?.startsWith('EMBEDDED:');
    return branches.map(branch => {
      const label = embedded ? branch.tactic === 'direct' ? 'Recall now' : 'Wait 0.3 s, then recall' : String(branch.tactic);
      const value = finite(branch.value) ? `${Math.round(branch.value * 100)}%` : 'unknown';
      return `${label}: model hit estimate ${value} (${branch.trials ?? 0} hypotheses)`;
    }).join('\n') + '\nPredictions from the mind’s percept model, not measured outcomes.';
  }
  if (!legacyNote) return 'No counterfactual branch recorded at this cycle.';
  const estimate = finite(legacyNote.estimatedHitChance) ? `${Math.round(legacyNote.estimatedHitChance * 100)}%` : 'not recorded';
  return `Latest static diagnostic: ${legacyNote.choice} vs ${legacyNote.alternative} · estimated hit chance ${estimate}`;
}
