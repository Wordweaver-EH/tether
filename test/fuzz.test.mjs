import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS, createWorld, hashWorld, step } from '../src/sim.js';
import { percept } from '../src/perception.js';

const e = CONSTANTS.experiment;
const legal = new Set(['HELD', 'OUTBOUND', 'EMBEDDED', 'RETURNING']);
const close = (a, b) => Math.abs(a - b) <= 1e-8;

function checkGeometry(world) {
  const r = e.PLAYER_RADIUS;
  for (const p of world.players) {
    assert.ok(p.position.x >= e.ARENA.minX + r - 1e-8);
    assert.ok(p.position.x <= e.ARENA.maxX - r + 1e-8);
    assert.ok(p.position.y >= e.ARENA.minY + r - 1e-8);
    assert.ok(p.position.y <= e.ARENA.maxY - r + 1e-8);
    for (const box of e.OBSTACLES) {
      const inside = p.position.x > box.minX - r + 1e-8 &&
        p.position.x < box.maxX + r - 1e-8 &&
        p.position.y > box.minY - r + 1e-8 &&
        p.position.y < box.maxY + r - 1e-8;
      assert.equal(inside, false, `${p.id} entered ${box.id} at step ${world.tick}`);
    }
  }
}

function checkSpear(world, previous, events) {
  for (let i = 0; i < 2; i++) {
    const spear = world.spears[i];
    const owner = world.players[i];
    assert.ok(legal.has(spear.state));
    assert.equal(spear.owner, owner.id);
    assert.ok(close(Math.hypot(spear.direction.x, spear.direction.y), 1));
    if (spear.state === 'HELD') {
      assert.deepEqual(spear.position, owner.position);
      assert.equal(spear.embedSurfaceId, null);
      assert.equal(spear.recallTarget, null);
    } else if (spear.state === 'EMBEDDED') {
      assert.match(spear.embedSurfaceId, /^(WALL|A|B)_[NESW]$/);
      assert.equal(spear.recallTarget, null);
    } else if (spear.state === 'RETURNING') {
      assert.equal(spear.embedSurfaceId, null);
      assert.ok(spear.recallTarget);
    } else {
      assert.equal(spear.embedSurfaceId, null);
      assert.equal(spear.recallTarget, null);
    }
    const transitioned = events.some((event) => event.type === 'RECALL_START' &&
      event.owner === owner.id || event.type === 'SPEAR_NEUTRALIZED' &&
      event.spear_owner === owner.id || event.type === 'RESET');
    if (previous.spears[i].state === 'EMBEDDED' && !transitioned) {
      assert.equal(spear.state, 'EMBEDDED');
      assert.deepEqual(spear.position, previous.spears[i].position);
    }
  }
}

test('seeded 20k steps in each mode preserve collision, spear, and scoring invariants', () => {
  const finalHashes = [];
  for (const mode of ['MODE_A', 'MODE_B']) {
    const world = createWorld();
    let state = 0x327a91bf;
    const random = () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    };
    for (let i = 0; i < 20000; i++) {
      percept(world, 'P1', mode);
      percept(world, 'P2', mode);
      const inputs = [0, 1].map(() => ({
        moveX: random() * 2 - 1, moveY: random() * 2 - 1,
        aimX: random() * 2 - 1, aimY: random() * 2 - 1,
        throw: random() < 0.025, recall: random() < 0.025,
      }));
      const previous = {
        scores: world.players.map((p) => p.score),
        spears: world.spears.map((spear) => ({ state: spear.state,
          position: { ...spear.position } })),
      };
      const events = step(world, inputs);
      checkGeometry(world);
      checkSpear(world, previous, events);
      for (let j = 0; j < 2; j++) {
        const attacker = `P${j + 1}`;
        const hits = events.filter((event) => event.type === 'HIT' &&
          event.attacker === attacker).length;
        assert.equal(world.players[j].score - previous.scores[j], hits);
      }
    }
    finalHashes.push(hashWorld(world));
  }
  assert.equal(finalHashes[0], finalHashes[1]);
});
