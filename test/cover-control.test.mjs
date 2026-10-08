import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hashWorld, snapshotWorld, restoreWorld } from '../src/sim.js';
import { percept } from '../src/perception.js';
import { hasLineOfSight } from '../src/visibility.js';
import { createSessionLogger, replayFromLog } from '../src/log.js';
import { parseLog } from '../replay/log-data.mjs';
import { createCoverAgent, controlRoute } from '../src/agents/cover-control.mjs';
import * as original from '../fixtures/robustness-original/src/sim.js';
import { percept as originalPercept } from '../fixtures/robustness-original/src/perception.js';
import { createSessionLogger as originalLogger } from '../fixtures/robustness-original/src/log.js';

const cover = () => createWorld({ gameMode: 'COVER_CONTROL' });
const advance = (w, ticks, actions = [{}, {}]) => { const events = []; for (let i=0;i<ticks;i++) events.push(...step(w,actions)); return events; };
function relocate(w, id, position) { const i=id==='P1'?0:1; w.players[i].position={...position}; w.spears[i].position={...position}; }

test('Cover is explicitly opt-in, and legacy world/percept/log bytes remain exact', () => {
  assert.throws(()=>createWorld({gameMode:'unknown'}),/gameMode/);
  for(const mode of ['MODE_A','MODE_B']) {
    const a=createWorld(),b=original.createWorld();
    const opts={mode,timestampStart:'fixed',seed:73};
    const la=createSessionLogger({...opts,world:a}),lb=originalLogger({...opts,world:b});
    assert.deepEqual(createWorld({gameMode:'DUEL'}),b);
    for(let i=0;i<600;i++) {
      const actions=[{moveX:i%160<80?1:-1,moveY:i%100<50?1:-1,aimX:1,aimY:i%40<20?0:1,throw:i%90===0,recall:i%90===45},
        {moveX:i%200<100?-1:1,aimX:-1,aimY:-0.3,throw:i%100===2,recall:i%100===52}];
      const ea=step(a,actions),eb=original.step(b,actions);
      assert.deepEqual(ea,eb);assert.deepEqual(a,b);assert.equal(hashWorld(a),original.hashWorld(b));
      assert.deepEqual(percept(a,'P1',mode),originalPercept(b,'P1',mode));
      la.recordStep(a,actions,ea);lb.recordStep(b,actions,eb);
    }
    assert.equal(la.toJSONL(),lb.toJSONL());
  }
});

test('closed cover blocks through sight and intermediate corner/face tangency symmetrically', () => {
  const boxes=[{minX:0,maxX:1,minY:0,maxY:1}];
  const cases=[[[ -1,.5],[2,.5],false], [[-1,1],[1,-1],false], [[-1,0],[2,0],false],
    [[-1,.5],[0,.5],true], [[-1,.5],[1,.5],false], [[-1,-.01],[2,-.01],true],
    [[0,.5],[-1,.5],true]];
  for(const [p,q,expected] of cases){const a={x:p[0],y:p[1]},b={x:q[0],y:q[1]};
    assert.equal(hasLineOfSight(a,b,boxes),expected);assert.equal(hasLineOfSight(b,a,boxes),expected);}
  const points=[];for(let x=-2;x<=2;x+=.4)for(let y=-2;y<=2;y+=.4)if(x<0||x>1||y<0||y>1)points.push({x,y});
  for(const a of points)for(const b of points)assert.equal(hasLineOfSight(a,b,boxes),hasLineOfSight(b,a,boxes));
});

test('Cover percept and renderer boundary hide bodies and independent spears; Mode A is full view', () => {
  const w=cover();relocate(w,'P1',{x:-5,y:0});relocate(w,'P2',{x:0,y:0});
  const b=percept(w,'P1','MODE_B');assert.equal(b.opponent,null);assert.equal(b.opponentSpear,null);assert.equal(b.cone.occlusion,true);
  const a=percept(w,'P1','MODE_A');assert.ok(a.opponent);assert.equal(a.cone.occlusion,false);
  w.spears[0].state='EMBEDDED';w.spears[0].position={x:-3.8,y:0};assert.ok(percept(w,'P1','MODE_B').own.spear);
  w.spears[0].position={x:-2.8,y:0};assert.equal(percept(w,'P1','MODE_B').own.spear,null);
  w.spears[1].state='OUTBOUND';w.spears[1].position={x:-4,y:0};assert.ok(percept(w,'P1','MODE_B').opponentSpear);
});

test('hidden exact state cannot alter percept/controller input; beacon is explicit public coarse data', () => {
  const a=cover(),b=cover();relocate(b,'P2',{x:5,y:1});b.players[1].facing={x:0,y:-1};
  assert.deepEqual(percept(a,'P1','MODE_B'),percept(b,'P1','MODE_B'));
  const aa=createCoverAgent({seed:7}),ab=createCoverAgent({seed:7});
  assert.deepEqual(aa.act(percept(a,'P1','MODE_B')),ab.act(percept(b,'P1','MODE_B')));
  relocate(a,'P2',{x:0,y:0});step(a,[{},{}]);
  const p=percept(a,'P1','MODE_B');assert.equal(p.opponent,null);assert.equal(p.objective.controller,'P2');
  assert.deepEqual(p.objective,percept(a,'P2','MODE_B').objective);
  p.objective.position.x=999;p.arena.obstacles[0].minX=999;assert.equal(a.experiment.OBJECTIVE.position.x,0);assert.equal(a.experiment.OBSTACLES[0].minX,-3.8);
});

test('both body-clear routes reach the one ring; south is longer and offers cover from the ring', () => {
  const w=cover(),r=w.experiment.PLAYER_RADIUS;
  const expanded=w.experiment.OBSTACLES.map(b=>({...b,minX:b.minX-r,maxX:b.maxX+r,minY:b.minY-r,maxY:b.maxY+r}));
  for(const id of ['P1','P2']) {
    const lengths={};
    for(const route of ['north','south']) {
      const path=[w.players[id==='P1'?0:1].position,...controlRoute(id,route)];let length=0;
      for(let i=1;i<path.length;i++){assert.ok(hasLineOfSight(path[i-1],path[i],expanded),`${id} ${route} ${i}`);length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);}
      lengths[route]=length;
      assert.ok(path.at(-1).x**2+path.at(-1).y**2<w.experiment.OBJECTIVE.radius**2);
    }
    assert.ok(lengths.south>lengths.north+2);
  }
  assert.equal(hasLineOfSight({x:-2.1,y:-1.7},{x:0,y:0},w.experiment.OBSTACLES),true);
  assert.equal(hasLineOfSight({x:-2.1,y:2.9},{x:0,y:0},w.experiment.OBSTACLES),false);
});

test('ring awards every 240 alone ticks without reset; contest, exit, and owner switch clear progress', () => {
  const w=cover();relocate(w,'P1',{x:-.5,y:0});
  assert.equal(advance(w,239).length,0);assert.equal(w.players[0].score,0);assert.equal(w.objective.holdTicks,239);
  const events=step(w,[{},{}]);assert.equal(events[0].type,'CONTROL_POINT');assert.equal(w.players[0].score,1);
  assert.equal(w.objective.holdTicks,0);assert.equal(w.players[0].position.x,-.5);
  advance(w,100);relocate(w,'P2',{x:.5,y:0});step(w,[{},{}]);assert.equal(w.objective.contested,true);assert.equal(w.objective.holdTicks,0);
  assert.equal(advance(w,300).length,0);assert.equal(w.players[1].score,0);
  relocate(w,'P1',{x:-5.5,y:0});step(w,[{},{}]);assert.equal(w.objective.controller,'P2');assert.equal(w.objective.holdTicks,1);
  relocate(w,'P2',{x:5.5,y:0});step(w,[{},{}]);assert.deepEqual(w.objective,{controller:null,contested:false,holdTicks:0});
});

test('a spear hit on the capture boundary awards only the hit and clears progress once', () => {
  const w=cover();relocate(w,'P1',{x:0,y:0});relocate(w,'P2',{x:2,y:0});
  advance(w,239);w.spears[1].state='OUTBOUND';w.spears[1].position={x:.4,y:0};w.spears[1].direction={x:-1,y:0};
  const events=step(w,[{},{}]);assert.equal(events.filter(e=>e.type==='HIT').length,1);
  assert.equal(events.filter(e=>e.type==='RESET').length,1);assert.equal(events.some(e=>e.type==='CONTROL_POINT'),false);
  assert.deepEqual(w.players.map(p=>p.score),[0,1]);assert.deepEqual(w.objective,{controller:null,contested:false,holdTicks:0});
});

test('both percept-only routes score, contest and recover from ordinary hit resets', () => {
  for(const route of ['north','south'])for(const id of ['P1','P2']) {
    const w=cover(),agent=createCoverAgent({route});const i=id==='P1'?0:1;
    for(let tick=0;tick<700;tick++){const actions=[{},{}];actions[i]=agent.act(percept(w,id,'MODE_B'));step(w,actions);}
    assert.ok(w.players[i].score>0,`${id} ${route}`);
    // Trigger a real returning hit, then verify controller traverses the route again.
    w.spears[1-i].state='RETURNING';w.spears[1-i].position={...w.players[i].position};
    w.spears[1-i].direction={x:1,y:0};w.spears[1-i].recallTarget={x:6,y:0};step(w,[{},{}]);
    const score=w.players[i].score;
    for(let tick=0;tick<700;tick++){const actions=[{},{}];actions[i]=agent.act(percept(w,id,'MODE_B'));step(w,actions);}
    assert.ok(w.players[i].score>score,`${id} ${route} reset recovery`);
  }
  const w=cover(),agents=[createCoverAgent({route:'north'}),createCoverAgent({route:'south'})];let hit=false;
  for(let i=0;i<1500;i++)hit ||= step(w,agents.map((a,i)=>a.act(percept(w,`P${i+1}`,'MODE_B')))).some(e=>e.type==='HIT');
  assert.ok(hit,'agents encounter and challenge each other at the ring');
});

test('Cover log and replay frame reconstruction round-trip geometry, public state, visibility and hash', () => {
  const w=cover(),agent=createCoverAgent({route:'south'}),logger=createSessionLogger({world:w,mode:'MODE_B',timestampStart:'fixed'});
  for(let i=0;i<700;i++){const actions=[agent.act(percept(w,'P1','MODE_B')),{}];logger.recordStep(w,actions,step(w,actions));}
  const replay=replayFromLog(logger.toJSONL());assert.deepEqual(replay.world,w);
  const parsed=parseLog(logger.toJSONL());assert.deepEqual(parsed.frames.at(-1).world,w);assert.ok(parsed.jumps.some(e=>e.type==='CONTROL_POINT'));
  const restored=restoreWorld(snapshotWorld(w));assert.equal(hashWorld(restored),hashWorld(w));
  advance(restored,30);advance(w,30);assert.deepEqual(restored,w);
  const altered=structuredClone(logger.records);delete altered[0].game_mode;assert.throws(()=>replayFromLog(altered),/constants/);
  const sampled=logger.records.find(r=>r.recordType==='SAMPLE');assert.equal(sampled.visibility_from_P1.opponent_visible,false);
});

test('Cover embodiment delays all percept fields 150ms, decides at 30Hz, and does not repeat button edges', async () => {
  const {createCoverInterface,COVER_INTERFACE,coverMotorTransform}=await import('../src/agents/cover-interface.mjs');
  const {motorTransform}=await import('../benchmark/interface.mjs');
  const calls=[];const controller={settings:()=>({}),act:(view,dt)=>{calls.push({view,dt});return {moveX:1,aimX:1,aimY:.2,throw:true,recall:true};}};
  const wrapped=createCoverInterface(controller,{seed:19}),w=cover();const output=[];
  for(let tick=0;tick<27;tick++){
    const view=percept(w,'P1','MODE_B');view.objective.holdTicks=tick;
    output.push(wrapped.act(view,1/120));step(w,[{},{}]);
  }
  assert.equal(output.slice(0,18).some(a=>Object.values(a).some(Boolean)),false);
  assert.deepEqual(calls.map(c=>c.view.time.elapsedSec),[0,4/120,8/120]);
  assert.deepEqual(calls.map(c=>c.view.objective.holdTicks),[0,4,8]);assert.ok(calls.every(c=>c.dt===1/30));
  assert.deepEqual(output.map((a,i)=>a.throw?i:null).filter(v=>v!==null),[18,22,26]);
  assert.equal(output[19].moveX,1);assert.equal(output[19].recall,false);
  assert.equal(COVER_INTERFACE.latencySec,.15);assert.equal(COVER_INTERFACE.decisionHz,30);
  for(const sample of [-2,0,1.2])for(const angle of [-2,0,2])assert.deepEqual(coverMotorTransform({aimX:.2,aimY:.8,throw:true},angle,sample),motorTransform({aimX:.2,aimY:.8,throw:true},angle,sample));
});

test('seeded Cover agents reproduce complete inputs and logs in both visibility modes', () => {
  for(const mode of ['MODE_A','MODE_B']) {
    function run(){const w=cover(),agents=[createCoverAgent({seed:37}),createCoverAgent({seed:12})];
      const logger=createSessionLogger({world:w,mode,timestampStart:'fixed',seed:37});
      for(let i=0;i<900;i++){const inputs=agents.map((a,j)=>a.act(percept(w,`P${j+1}`,mode),1/120));logger.recordStep(w,inputs,step(w,inputs));}
      return logger.toJSONL();}
    const a=run(),b=run();assert.equal(a,b);assert.ok(replayFromLog(a).verifiedSamples>1);
  }
});
