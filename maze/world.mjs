// New domain adapter. The controller never receives the world or ghost policy.
import {rng} from '../src/mind/math.mjs';
export const STEP_SEC = 0.5; // one tile/world-unit per step; speed 2 <= inherited bound 4
export const ACTIONS = Object.freeze(['N','E','S','W','WAIT']);
export const DELTA = Object.freeze({N:{x:0,y:-1},E:{x:1,y:0},S:{x:0,y:1},W:{x:-1,y:0},WAIT:{x:0,y:0}});
export const MAP = [
  '###########',
  '#.........#',
  '#.###.###.#',
  '#...#.....#',
  '#.#.#.#.#.#',
  '#.....#...#',
  '#.###.###.#',
  '#.........#',
  '###########',
];
export const key = p => `${p.x},${p.y}`;
export const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const same = (a,b) => a.x===b.x && a.y===b.y;
export function walkable(map,p) { return Number.isInteger(p.x)&&Number.isInteger(p.y)&&map[p.y]?.[p.x]!==undefined&&map[p.y][p.x]!=='#'; }
export function move(map,p,action) { const d=DELTA[action]; if(!d)throw new RangeError('unknown action');const q={x:p.x+d.x,y:p.y+d.y};return walkable(map,q)?q:{...p}; }
export function arena(map) {return {bounds:{minX:-0.5,minY:-0.5,maxX:map[0].length-0.5,maxY:map.length-0.5},obstacles:map.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'?[{minX:x-.5,maxX:x+.5,minY:y-.5,maxY:y+.5}]:[]))};}
export function lineOfSight(map,a,b) {
  if(a.x!==b.x && a.y!==b.y)return false;
  const d={x:Math.sign(b.x-a.x),y:Math.sign(b.y-a.y)};let p={...a};
  while(!same(p,b)){p={x:p.x+d.x,y:p.y+d.y};if(!walkable(map,p))return false;}return true;
}
export function createWorld({seed=991,condition='familiar',switchTick=24,map=MAP,maxTicks=64}={}) {
  if(!['familiar','switch'].includes(condition))throw new RangeError('unknown condition');
  const random=rng(seed);const pellets=new Set();map.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='.')pellets.add(`${x},${y}`);}));
  const world={map:[...map],player:{x:1,y:1},ghost:{x:4,y:1},ghostVelocity:{x:0,y:0},gaze:'E',tick:0,pellets,collected:0,dead:false,done:false,seed,condition,switchTick,maxTicks,ghostPrevious:null};
  pellets.delete(key(world.player));
  return {world,step(action){
    if(world.done)throw new Error('episode ended');
    if(!ACTIONS.includes(action.move)||!['N','E','S','W'].includes(action.gaze))throw new RangeError('invalid actuator request');
    const oldPlayer={...world.player},oldGhost={...world.ghost};
    world.player=move(map,oldPlayer,action.move);world.gaze=action.gaze;
    let choices=ACTIONS.slice(0,4).map(a=>({a,p:move(map,oldGhost,a)})).filter(x=>!same(x.p,oldGhost));
    // Familiar patrol avoids immediate reversal, with seeded choices at junctions.
    // The switch changes only ghost decisions, never positions or sensor labels.
    if(condition==='switch' && world.tick>=switchTick)choices.sort((a,b)=>distance(a.p,world.player)-distance(b.p,world.player));
    else {const forward=choices.filter(x=>!world.ghostPrevious||!same(x.p,world.ghostPrevious));if(forward.length)choices=forward;const offset=Math.floor(random()*choices.length);choices=[...choices.slice(offset),...choices.slice(0,offset)];}
    world.ghost=choices[0]?.p??oldGhost;world.ghostPrevious=oldGhost;
    world.ghostVelocity={x:(world.ghost.x-oldGhost.x)/STEP_SEC,y:(world.ghost.y-oldGhost.y)/STEP_SEC};
    world.dead=same(world.player,world.ghost)||(same(oldPlayer,world.ghost)&&same(world.player,oldGhost));
    if(!world.dead && pellets.delete(key(world.player)))world.collected++;
    world.tick++;world.done=world.dead||pellets.size===0||world.tick>=maxTicks;
    return {dead:world.dead,collected:world.collected,done:world.done};
  }};
}
export function observe(world) {
  const delta={x:world.ghost.x-world.player.x,y:world.ghost.y-world.player.y},facing=DELTA[world.gaze];
  const visible=lineOfSight(world.map,world.player,world.ghost)&&distance(world.player,world.ghost)<=6&&(distance(world.player,world.ghost)<=1||delta.x*facing.x+delta.y*facing.y>0);
  // Layout and remaining pellets are public. A single ghost is visible only on a
  // forward unobstructed row/column (or adjacent); observed velocity is available.
  return {tick:world.tick,time:{elapsedSec:world.tick*STEP_SEC},map:[...world.map],arena:arena(world.map),own:{position:{...world.player}},gaze:world.gaze,pellets:[...world.pellets].map(s=>{const[x,y]=s.split(',').map(Number);return{x,y};}),opponent:visible?{position:{...world.ghost},velocity:{...world.ghostVelocity}}:null};
}
export function render(world) {const rows=world.map.map(r=>[...r]);rows.forEach((r,y)=>r.forEach((c,x)=>{if(c!== '#')r[x]=world.pellets.has(`${x},${y}`)?'.':' ';}));rows[world.ghost.y][world.ghost.x]='G';rows[world.player.y][world.player.x]=world.dead?'X':'P';return rows.map(r=>r.join('')).join('\n');}
