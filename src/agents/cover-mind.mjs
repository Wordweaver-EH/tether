import { createMind } from '../mind/index.mjs';
import { createCoverInterface } from './cover-interface.mjs';

// Existing mind, with the Cover baseline's exact browser-safe embodiment. It
// receives the same public percept and geometry. No ring strategy, target oracle,
// new memory mechanism, or persistent Duel profile is supplied by this adapter.
export function createCoverMind({ seed = 1, captureTrace = true } = {}) {
  const mind = createMind({ seed, difficulty: 'normal', benchmarkInterface: true,
    deferCommand: true, captureTrace });
  const embodied = createCoverInterface(mind, { seed });
  return { ...mind, ...embodied,
    act(view, dt = 1 / 120) {
      if (view.gameMode !== 'COVER_CONTROL') throw new RangeError('Cover Control percept required');
      return embodied.act(view, dt);
    },
    settings: () => ({ ...embodied.settings(), controller: 'cover-existing-mind-v1',
      seed, scope: 'existing hunt/search policy; ring objective untrained; session-only memory' }),
  };
}
