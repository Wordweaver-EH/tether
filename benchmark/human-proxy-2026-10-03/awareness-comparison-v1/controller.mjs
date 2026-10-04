// Only canonical delayed percepts enter here. Evaluator truth stays in run.mjs.
import {createHumanCounter} from '../repo/human-proxy/counter.mjs';
import {createAwareness} from './frozen-awareness.mjs';
const clone = x => structuredClone(x);
export function arbitrate(base, assessment, arm) {
  if (!['unchanged', 'awareness'].includes(arm)) throw new RangeError('unknown arm');
  const scan = arm === 'awareness' && assessment.warning;
  const command = {...base};
  if (scan) {
    command.aimX = assessment.proposal.scanAim.x;
    command.aimY = assessment.proposal.scanAim.y;
    command.throw = false;
    if (assessment.proposal.movement) {
      command.moveX = assessment.proposal.movement.x;
      command.moveY = assessment.proposal.movement.y;
    }
  }
  const delta = Math.atan2(command.aimY, command.aimX) - Math.atan2(base.aimY, base.aimX);
  return {command, scan, movementOverride: scan && !!assessment.proposal.movement,
    withheldThrow: scan && !!base.throw,
    scanAimDisplacementRad: scan ? Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) : 0};
}
export function createComparisonCounter({seed = 1, arm} = {}) {
  if (!['unchanged', 'awareness'].includes(arm)) throw new RangeError('unknown arm');
  const base = createHumanCounter({seed}), awareness = createAwareness();
  let latest = null;
  return {
    act(packet, dt) {
      const baseCommand = base.act(packet, dt);
      const assessment = awareness.observe(packet, packet.time.elapsedSec + .25);
      const decision = arbitrate(baseCommand, assessment, arm);
      latest = {arm, base: base.diagnostics(), baseCommand: clone(baseCommand),
        assessment, ...decision,
        visibility: {opponent: packet.opponent !== null, enemySpear: packet.opponentSpear !== null,
          enemySpearState: packet.opponentSpear?.state ?? null}};
      return {...decision.command};
    },
    commitCommand(command, packet, receiptTime) {
      base.commitCommand(command, packet, receiptTime);
      awareness.commitMovement({x: command.moveX, y: command.moveY});
    },
    diagnostics: () => clone(latest),
    totals: () => base.totals(),
  };
}
