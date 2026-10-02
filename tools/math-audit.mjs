import { sqrt, hypot, sinCosTurn, MATH_VERSION } from '../src/deterministic-math.js';
let seed = 139;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const count = 100000;
let rootRelative = 0, normRelative = 0, trigAbsolute = 0, facingComponent = 0;
const rotation = sinCosTurn(Math.PI / 60);
for (let i = 0; i < count; i++) {
  const x = 2 ** (random() * 2040 - 1020), a = random() * 32 - 16, b = random() * 20 - 10;
  rootRelative = Math.max(rootRelative, Math.abs(sqrt(x) / Math.sqrt(x) - 1));
  normRelative = Math.max(normRelative, Math.abs(hypot(a, b) / Math.hypot(a, b) - 1));
  const t = random() * Math.PI, r = sinCosTurn(t);
  trigAbsolute = Math.max(trigAbsolute, Math.abs(r.sin - Math.sin(t)), Math.abs(r.cos - Math.cos(t)));
  const theta = random() * 2 * Math.PI, target = random() * 2 * Math.PI;
  const face = { x: Math.cos(theta), y: Math.sin(theta) }, aim = { x: Math.cos(target), y: Math.sin(target) };
  const cross = face.x * aim.y - face.y * aim.x, dot = face.x * aim.x + face.y * aim.y;
  const angle = Math.atan2(cross === 0 ? 0 : cross, dot), turn = Math.max(-Math.PI / 60, Math.min(Math.PI / 60, angle));
  let oldX = face.x * Math.cos(turn) - face.y * Math.sin(turn), oldY = face.x * Math.sin(turn) + face.y * Math.cos(turn);
  const oldNorm = Math.hypot(oldX, oldY); oldX /= oldNorm; oldY /= oldNorm;
  let newX = aim.x, newY = aim.y;
  if (dot < rotation.cos) {
    const sin = cross < 0 ? -rotation.sin : rotation.sin;
    newX = face.x * rotation.cos - face.y * sin; newY = face.x * sin + face.y * rotation.cos;
    const norm = hypot(newX, newY); newX /= norm; newY /= norm;
  }
  facingComponent = Math.max(facingComponent, Math.abs(newX - oldX), Math.abs(newY - oldY));
}
console.log(JSON.stringify({ mathVersion: MATH_VERSION, samples: count, seed: 139,
  maxSqrtRelativeErrorVsHost: rootRelative, maxHypotRelativeErrorVsHost: normRelative,
  maxTrigAbsoluteErrorVsHost: trigAbsolute, maxSingleTurnComponentErrorVsPriorAlgorithm: facingComponent,
  existingRuleTestAbsoluteTolerance: 1e-11, collisionEpsilon: 1e-9,
  note: 'Sampled comparison, not a proof of correct rounding. Replay relies on specified arithmetic rather than host agreement.' }, null, 2));
