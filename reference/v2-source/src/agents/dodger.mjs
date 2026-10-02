// Percept-only defensive controller. The caller supplies the delayed percept.
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = (a) => Math.hypot(a.x, a.y);
const unit = (a) => { const n = length(a) || 1; return { x: a.x / n, y: a.y / n }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createReactiveDodger({ strength = 1, recallAvoidance = 1 } = {}) {
  let enemyPosition = null, enemyVelocity = { x: 0, y: 0 };
  let embedded = null, lastSeenAt = -Infinity, lastSpearAt = -Infinity;
  let side = 1;
  return {
    movement(view) {
      const now = view.time.elapsedSec, me = view.own.position;
      if (view.opponent) {
        enemyPosition = { ...view.opponent.position };
        enemyVelocity = { ...view.opponent.velocity };
        lastSeenAt = now;
      }
      if (view.opponentSpear) {
        lastSpearAt = now;
        embedded = view.opponentSpear.state === 'EMBEDDED'
          ? { ...view.opponentSpear.position } : null;
      }
      const bounds = view.arena.bounds;
      const room = (p) => Math.min(p.x - bounds.minX, bounds.maxX - p.x,
        p.y - bounds.minY, bounds.maxY - p.y);
      const choose = (direction) => {
        const left = { x: -direction.y, y: direction.x };
        const test = (sign) => {
          const p = { x: me.x + sign * left.x * 0.8,
            y: me.y + sign * left.y * 0.8 };
          const blocked = view.arena.obstacles.some((o) =>
            p.x > o.minX - 0.45 && p.x < o.maxX + 0.45 &&
            p.y > o.minY - 0.45 && p.y < o.maxY + 0.45);
          return room(p) - (blocked ? 3 : 0);
        };
        if (test(side) < 0.65 && test(-side) > test(side) + 0.25) side = -side;
        return { x: side * left.x, y: side * left.y };
      };
      let output = { x: 0, y: 0 }, danger = 0, kind = null;
      const addThreat = (start, direction, reach, weight, label) => {
        const d = unit(direction), relative = sub(me, start);
        const along = dot(relative, d), lateral = Math.abs(cross(d, relative));
        if (along < -0.5 || along > reach + 0.8) return;
        const closeness = clamp((1.5 - lateral) / 1.5, 0, 1);
        const imminence = clamp((8 - along) / 8, 0.25, 1);
        const threat = weight * closeness * imminence;
        if (threat > danger) { danger = threat; output = choose(d); kind = label; }
      };
      const spear = view.opponentSpear;
      if (spear && (spear.state === 'OUTBOUND' || spear.state === 'RETURNING')) {
        addThreat(spear.position, spear.direction, 12, strength * 2.5, spear.state);
      }
      if (embedded && enemyPosition && now - lastSpearAt < 2.5 &&
          now - lastSeenAt < 2.5) {
        const predicted = { x: enemyPosition.x + enemyVelocity.x * Math.min(0.15, now - lastSeenAt),
          y: enemyPosition.y + enemyVelocity.y * Math.min(0.15, now - lastSeenAt) };
        const line = sub(predicted, embedded);
        addThreat(embedded, line, length(line), recallAvoidance * strength * 1.6,
          'POSSIBLE_RECALL');
      }
      // A visible held spear aimed along the body line is an imminent shot.
      if (view.opponent && (!spear || spear.state === 'HELD')) {
        const toward = sub(me, view.opponent.position);
        const range = length(toward);
        if (range < 12 && dot(unit(toward), view.opponent.facing) > 0.91)
          addThreat(view.opponent.position, view.opponent.facing, 12,
            strength * 1.4, 'AIMED_HELD');
      }
      return { vector: output, urgency: clamp(danger, 0, 1), kind,
        believedEmbedded: embedded ? { ...embedded } : null };
    },
  };
}

export function reactiveDodger({ strength = 1 } = {}) {
  const dodge = createReactiveDodger({ strength });
  const queue = [];
  return {
    act(view, dt) {
      queue.push(view);
      const delayed = queue.length > Math.round(0.15 / dt) ? queue.shift() : null;
      if (!delayed) return {};
      const { vector } = dodge.movement(delayed);
      const aim = delayed.opponent
        ? sub(delayed.opponent.position, delayed.own.position) : delayed.own.facing;
      return { moveX: vector.x, moveY: vector.y, aimX: aim.x, aimY: aim.y };
    },
  };
}
