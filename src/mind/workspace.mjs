const CHANNELS = ['gaze', 'move', 'throw', 'recall'];

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
    const entry = 0.3 - Math.min(0.06, affect.arousal * 0.06);
    const hold = ablations.noHysteresis ? entry : 0.18;
    const incumbent = entries.find(([name]) => name === focus);
    let next = winner[1].salience >= entry ? winner[0] : null;
    if (focus && incumbent && incumbent[1].salience >= hold && !ablations.noHysteresis) {
      if (now - lastSwitch < 0.38 || incumbent[1].salience + 0.13 >= winner[1].salience) next = focus;
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
    return { focus, ignition, broadcast, outputs, saliences: Object.fromEntries(entries.map(([k, v]) => [k, v.salience])) };
  }
  return { choose };
}
