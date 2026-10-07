import { createMind } from '../mind/index.mjs';
import { createCoverInterface } from './cover-interface.mjs';

// Separate optional controller. Historical Cover/Duel factories stay unchanged.
export function createIntegratedCoverMind({ seed = 1, captureTrace = true,
  captureDiagnostics = false, cognitionBudget = 192, controls = {} } = {}) {
  const { report = true, ...policyControls } = controls;
  const mind = createMind({ seed, difficulty: 'normal', benchmarkInterface: true,
    deferCommand: true, captureTrace, captureDiagnostics, cognitionBudget,
    // Public ring points are not identifiable tactical outcomes. Do not credit
    // them as successful shot/recall teaching or fabricate learned tactics.
    ablations: { noLearning: true }, coverControl: { ...policyControls, report },
    coordinationControls: { reportEnabled: report } });
  const embodied = createCoverInterface(mind, { seed });
  return { ...mind, ...embodied,
    act(view, dt = 1 / 120) {
      if (view.gameMode !== 'COVER_CONTROL') throw new RangeError('Cover Control percept required');
      return embodied.act(view, dt);
    },
    settings: () => ({ ...embodied.settings(), controller: 'cover-integrated-mind-v1', seed,
      scope: 'engineered ring/threat/search workspace integration; session-only route cache; tactical score learning disabled' }),
  };
}
