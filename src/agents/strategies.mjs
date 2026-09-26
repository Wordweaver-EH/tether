import { add, sub, unit, dot, distance, lineDistance, point, clamp } from '../mind/math.mjs';

const blank = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0,
  throw: false, recall: false });
const face = (input, from, target) => {
  const d = unit(sub(target, from)); input.aimX = d.x; input.aimY = d.y;
  return d;
};
const move = (input, from, target) => {
  if (distance(from, target) < 0.4) return;
  const d = unit(sub(target, from)); input.moveX = d.x; input.moveY = d.y;
};
const aligned = (facing, direction, tolerance = 0.1) => dot(facing, direction) > Math.cos(tolerance);

function script(kind) {
  let time = 0, embeddedAt = -Infinity, priorSpear = 'HELD';
  let lastSeen = null, previousShot = -Infinity;
  let knownEnemySpear = null;
  return {
    act(view, dt) {
      time += dt;
      const input = blank();
      const me = view.own.position, spear = view.own.spear;
      if (view.opponent) lastSeen = { ...view.opponent.position };
      if (spear.state !== priorSpear) {
        if (spear.state === 'EMBEDDED') embeddedAt = time;
        if (spear.state === 'OUTBOUND') previousShot = time;
        priorSpear = spear.state;
      }
      const seen = view.opponent?.position;
      const known = seen ?? lastSeen;
      const enemySpear = view.opponentSpear;
      if (enemySpear) knownEnemySpear = { state: enemySpear.state,
        position: { ...enemySpear.position } };
      else if (knownEnemySpear &&
          dot(view.own.facing, unit(sub(knownEnemySpear.position, me))) > Math.cos(view.cone.halfAngleRad))
        knownEnemySpear = null;
      const wall = point(me.x > 0 ? -7.95 : 7.95,
        clamp((known?.y ?? me.y) * 0.6, -4.6, 4.6));

      if (kind === 'spinner') {
        const theta = time * 2 * Math.PI;
        input.aimX = Math.cos(theta); input.aimY = Math.sin(theta);
        if (seen) {
          const d = unit(sub(seen, me));
          input.throw = spear.state === 'HELD' && aligned(view.own.facing, d, 0.07);
        }
        if (spear.state === 'EMBEDDED') input.recall = true;
        return input;
      }
      if (kind === 'camper') {
        const corner = point(me.x > 0 ? 7.25 : -7.25, me.y >= 0 ? 4.25 : -4.25);
        move(input, me, corner);
        if (seen) {
          const d = face(input, me, seen);
          input.throw = spear.state === 'HELD' && aligned(view.own.facing, d, 0.085);
        } else face(input, me, point(0, 0));
        if (spear.state === 'EMBEDDED' && time - embeddedAt > 1.8) input.recall = true;
        return input;
      }
      if (kind === 'spearRusher') {
        if (knownEnemySpear?.state === 'EMBEDDED') {
          move(input, me, knownEnemySpear.position);
          face(input, me, knownEnemySpear.position);
        } else if (known) {
          move(input, me, known); face(input, me, known);
        } else {
          const theta = time * 1.8; input.aimX = Math.cos(theta); input.aimY = Math.sin(theta);
          move(input, me, point(0, 0));
        }
        if (seen && spear.state === 'HELD') {
          const d = face(input, me, seen);
          input.throw = aligned(view.own.facing, d, 0.08);
        }
        if (spear.state === 'EMBEDDED' && time - embeddedAt > 0.9) input.recall = true;
        return input;
      }
      if (kind === 'directShooter') {
        if (seen) {
          const d = face(input, me, seen);
          move(input, me, add(seen, { x: me.x > seen.x ? 1.5 : -1.5, y: 0 }));
          input.throw = spear.state === 'HELD' && aligned(view.own.facing, d, 0.07);
        } else {
          const theta = time * 2.1;
          input.aimX = Math.cos(theta); input.aimY = Math.sin(theta);
          move(input, me, known ?? point(0, 0));
        }
        if (spear.state === 'EMBEDDED') input.recall = true;
        return input;
      }
      if (kind === 'immediateRecaller') {
        const target = seen ?? wall;
        const d = face(input, me, target);
        if (seen) move(input, me, seen);
        input.throw = spear.state === 'HELD' && aligned(view.own.facing, d, 0.11) &&
          time - previousShot > 0.2;
        if (spear.state === 'EMBEDDED') input.recall = true;
        return input;
      }
      if (kind === 'embedWaiter') {
        if (spear.state === 'HELD') {
          // A vertical geometry shot cannot pass through the spawn opponent.
          const embedWall = point(me.x, me.x > 0 ? -4.95 : 4.95);
          const d = face(input, me, embedWall);
          input.throw = aligned(view.own.facing, d, 0.08) && time - previousShot > 0.5;
        } else if (spear.state === 'EMBEDDED') {
          const target = known ? add(known, unit(sub(known, spear.position))) :
            point(me.x > 0 ? -1 : 1, me.y);
          move(input, me, target);
          if (known) face(input, me, known);
          const crossing = known ? lineDistance(known, spear.position, me) : null;
          input.recall = !!crossing && crossing.distance < 0.5 &&
            crossing.t > 0 && crossing.t < 1 && time - embeddedAt > 0.25;
          if (time - embeddedAt > 7) input.recall = true;
        } else if (known) face(input, me, known);
        return input;
      }
      throw new RangeError(`unknown strategy: ${kind}`);
    },
  };
}

export const immediateRecaller = () => script('immediateRecaller');
export const camper = () => script('camper');
export const spinner = () => script('spinner');
export const spearRusher = () => script('spearRusher');
export const directShooter = () => script('directShooter');
export const embedWaiter = () => script('embedWaiter');
export const STRATEGIES = { immediateRecaller, camper, spinner,
  spearRusher, directShooter, embedWaiter };
