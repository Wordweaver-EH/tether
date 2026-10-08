import { clamp } from './math.mjs';

const CHANNELS = ['gaze', 'move', 'throw', 'recall'];

// Appraisal changes the cost of abandoning an ongoing intention, not its utility.
// Threat, surprise and adverse outcomes favor reorientation; confident favorable
// appraisals favor persistence. Zero appraisal preserves the fixed control arm.
export function appraisalControl(affect = {}) {
  const arousal = clamp(affect.arousal ?? 0, 0, 1);
  const valence = clamp(affect.valence ?? 0, -1, 1);
  const confidence = clamp(affect.confidenceMood ?? 0, 0, 1);
  const deficit = clamp(-(affect.scoreMargin ?? 0) / 5, 0, 1);
  const urgency = clamp(arousal + 0.25 * Math.max(0, -valence) + 0.2 * deficit, 0, 1);
  const stability = clamp(confidence + Math.max(0, valence), 0, 1);
  return { urgency, stability, entry: 0.3 - 0.06 * arousal, hold: 0.18,
    refractorySec: 0.38 * (1 - 0.70 * urgency + 0.20 * stability),
    switchMargin: 0.13 * (1 - 0.65 * urgency + 0.20 * stability) };
}

export function createWorkspace(ablations = {}) {
  let focus = null, lastSwitch = -Infinity;
  function choose(candidates, now, affect) {
    let entries = Object.entries(candidates);
    if (ablations.singleUtility) {
      const wants = {};
      for (const channel of CHANNELS) {
        const best = entries.filter(([, c]) => c.wants[channel]).sort((a, b) => b[1].salience - a[1].salience)[0];
        if (best) wants[channel] = best[1].wants[channel];
      }
      entries = [['Utility', { content: 'Merged utility',
        salience: Math.max(...entries.map(([, c]) => c.salience)), wants }]];
    }
    entries.sort((a, b) => b[1].salience - a[1].salience);
    const winner = entries[0];
    const control = appraisalControl(ablations.noAffect ? {} : affect);
    const { entry } = control;
    const hold = ablations.noHysteresis ? entry : control.hold;
    const incumbent = entries.find(([name]) => name === focus);
    let next = winner[1].salience >= entry ? winner[0] : null;
    if (focus && incumbent && incumbent[1].salience >= hold && !ablations.noHysteresis) {
      if (now - lastSwitch < control.refractorySec || incumbent[1].salience + control.switchMargin >= winner[1].salience) next = focus;
    }
    if (ablations.noHysteresis && winner[1].salience >= entry) next = winner[0];
    const ignition = next !== focus;
    if (ignition) { focus = next; lastSwitch = now; }
    const broadcast = focus ? entries.find(([name]) => name === focus)?.[1] : null;
    const outputs = {};
    if (ablations.noWorkspace) {
      for (const channel of CHANNELS) {
        const best = entries.filter(([, c]) => c.wants[channel]).sort((a, b) => b[1].salience - a[1].salience)[0];
        outputs[channel] = best?.[1].wants[channel];
      }
    } else {
      for (const channel of CHANNELS) outputs[channel] = broadcast?.wants[channel];
    }
    return { focus, ignition, broadcast, outputs, control, saliences: Object.fromEntries(entries.map(([k, v]) => [k, v.salience])) };
  }
  return { choose };
}
