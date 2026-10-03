// No controller import. Every fixture comes from createWorld() plus legal step() inputs.
export const neutral = () => ({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, throw: false, recall: false });
const command = (extra = {}) => ({ ...neutral(), ...extra });
const segment = (ticks, p1 = {}, p2 = {}) => ({ ticks, inputs: [command(p1), command(p2)] });

export const FIXTURES = Object.freeze([
  {
    id: 'near-clear-0', family: 'near-clear', variant: 0,
    state: 'HELD', lineOfSight: 'clear', distanceClass: 'near',
    description: 'Both bodies legally route around the narrow central corridor to (-1,-0.6) and (1,-0.6); neutral prefill',
    history: [segment(18, {moveY:-1}, {moveY:1}), segment(135,{moveX:1},{moveX:-1}), segment(36,{}, {moveY:-1}), segment(12,{aimX:1})],
    prefillOpponent: command(),
  },
  {
    id: 'near-clear-1', family: 'near-clear', variant: 1,
    state: 'HELD', lineOfSight: 'clear', distanceClass: 'near',
    description: 'Same legal route, opponent starts 0.6 units higher and moves north during prefill; facing aims at the prefill-start opponent',
    history: [segment(18,{moveY:-1},{moveY:1}), segment(135,{moveX:1},{moveX:-1}), segment(18,{}, {moveY:-1}), segment(12,{aimX:2,aimY:0.6})],
    prefillOpponent: command({moveY:1}),
  },
  {
    id: 'far-clear-0', family: 'far-clear', variant: 0,
    state: 'HELD', lineOfSight: 'clear', distanceClass: 'far',
    description: 'Ordinary starts and held spears, facing east through the point-spear-clear central corridor',
    history: [segment(1,{aimX:1})], prefillOpponent: command(),
  },
  {
    id: 'far-clear-1', family: 'far-clear', variant: 1,
    state: 'HELD', lineOfSight: 'clear', distanceClass: 'far',
    description: 'Own body moves south 0.6 units, opponent north 0.8 units; opponent continues north during prefill',
    history: [segment(18,{moveY:-1},{moveY:1}), segment(6,{}, {moveY:1}), segment(12,{aimX:11,aimY:1.4})],
    prefillOpponent: command({moveY:1}),
  },
  {
    id: 'obstructed-0', family: 'obstructed', variant: 0,
    state: 'HELD', lineOfSight: 'obstructed', distanceClass: 'far',
    description: 'Both bodies move north to y=2; obstacle A blocks their direct spear segment but Mode B has no occlusion',
    history: [segment(60,{moveY:1},{moveY:1}), segment(12,{aimX:1})], prefillOpponent: command(),
  },
  {
    id: 'obstructed-1', family: 'obstructed', variant: 1,
    state: 'HELD', lineOfSight: 'obstructed', distanceClass: 'far',
    description: 'At y=2 the opponent moves left to x=4, then south during prefill; obstacle A remains across the direct segment',
    history: [segment(60,{moveY:1},{moveY:1}), segment(45,{}, {moveX:-1}), segment(12,{aimX:1})],
    prefillOpponent: command({moveY:-1}),
  },
  {
    id: 'outbound-retrievable-0', family: 'outbound-retrievable', variant: 0,
    state: 'OUTBOUND', lineOfSight: 'obstructed', distanceClass: 'far',
    description: 'Opponent moves north to y=1; a single scripted eastward throw starts a pre-existing outbound trajectory',
    history: [segment(30,{aimX:1},{moveY:1}), segment(1,{throw:true})], prefillOpponent: command(),
  },
  {
    id: 'outbound-retrievable-1', family: 'outbound-retrievable', variant: 1,
    state: 'EMBEDDED', lineOfSight: 'clear', distanceClass: 'near',
    description: 'Own body moves north to y=2 and throws into A_W; opponent routes below both obstacles to (-4,2), then moves west during prefill; visible embedded spear remains at (-3,2)',
    history: [segment(60,{moveY:1}), segment(1,{throw:true}), segment(24), segment(114,{}, {moveY:-1}), segment(285,{}, {moveX:-1}), segment(174,{}, {moveY:1}), segment(12,{aimX:1})],
    prefillOpponent: command({moveX:-1}),
  },
]);

export function expandHistory(fixture) {
  return fixture.history.flatMap(({ticks, inputs}) => Array.from({length:ticks}, () => structuredClone(inputs)));
}
export function replayFixture(sim, fixture, onStep = () => {}) {
  const world = sim.createWorld();
  const history = expandHistory(fixture);
  const events = [];
  for (const inputs of history) {
    const found = sim.step(world, structuredClone(inputs));
    const stamped = found.map(event => ({...event, step:world.tick, timestamp:world.elapsedSec}));
    events.push(...stamped);
    onStep(world, inputs, stamped);
  }
  return {world, history, events};
}

export function schedule(count, seedStart, stage) {
  if (count % 16) throw new Error('Schedule count must be divisible by 16');
  return Array.from({length:count}, (_,index) => {
    // Rotate fixture assignment each eight-pair block. Alternating arm order is
    // balanced within each fixture over every sixteen opportunities.
    const fixtureIndex = (index % 8 + Math.floor(index / 8) % 2) % 8;
    return {stage, index, seed:seedStart+index, fixtureId:FIXTURES[fixtureIndex].id,
      order:index%2 ? ['S','N'] : ['N','S']};
  });
}

function intersectsBox(a,b,box) {
  let lo=0, hi=1;
  for (const axis of ['x','y']) {
    const delta=b[axis]-a[axis], min=box[axis==='x'?'minX':'minY'], max=box[axis==='x'?'maxX':'maxY'];
    if (delta===0) {if (a[axis]<min || a[axis]>max) return false; continue;}
    const enter=(min-a[axis])/delta, exit=(max-a[axis])/delta;
    lo=Math.max(lo,Math.min(enter,exit)); hi=Math.min(hi,Math.max(enter,exit));
    if (lo>hi) return false;
  }
  return true;
}
export function geometrySummary(world, view) {
  const a=world.players[0].position,b=world.players[1].position;
  return {tick:world.tick, own:a, opponent:b, opponentVelocity:world.players[1].velocity,
    facing:world.players[0].facing, spear:structuredClone(world.spears[0]),
    distance:Math.hypot(a.x-b.x,a.y-b.y),
    lineOfSight:world.experiment.OBSTACLES.some(box=>intersectsBox(a,b,box))?'obstructed':'clear',
    opponentVisible:!!view.opponent, ownSpearVisible:!!view.own.spear,
    scores:world.players.map(p=>p.score)};
}
export function assertLegalGeometry(world) {
  const radius=world.experiment.PLAYER_RADIUS, eps=1e-7, bounds=world.experiment.ARENA;
  for(const player of world.players) {
    const p=player.position;
    if (p.x<bounds.minX+radius-eps || p.x>bounds.maxX-radius+eps || p.y<bounds.minY+radius-eps || p.y>bounds.maxY-radius+eps) throw new Error(`Illegal body bounds at ${world.tick}`);
    for(const b of world.experiment.OBSTACLES) if(p.x>b.minX-radius+eps&&p.x<b.maxX+radius-eps&&p.y>b.minY-radius+eps&&p.y<b.maxY+radius-eps) throw new Error(`Illegal body/obstacle overlap at ${world.tick}`);
  }
  if (world.players.some(p=>p.score!==0)) throw new Error(`Unexpected history score at ${world.tick}`);
}
