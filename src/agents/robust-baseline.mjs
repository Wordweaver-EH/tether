// Conventional receding-horizon controller. Inputs are delayed percepts only.
// Fixed parameters and fixed hypothesis grids: no outcome learning or self-monitor.
import { createSpearMemory } from './spear-memory.mjs';
import { segmentCircleTime, segmentStaticTime } from '../mind/percept-contact.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,k)=>({x:a.x*k,y:a.y*k});
const len=a=>Math.hypot(a.x,a.y);
const unit=a=>len(a)>1e-12?mul(a,1/len(a)):{x:0,y:0};
const angle=a=>Math.atan2(a.y,a.x);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const vec=a=>({x:Math.cos(a),y:Math.sin(a)});
const copy=a=>({x:a.x,y:a.y});
// Levels share one objective and horizon. Extra work refines the same action and
// uncertainty space, rather than adding meaningless delays or spin padding.
export const CONVENTIONAL_LEVELS=Object.freeze([
  {aimCount:5,moveCount:5,hypotheses:3,steps:12},
  {aimCount:9,moveCount:9,hypotheses:5,steps:24},
  {aimCount:17,moveCount:9,hypotheses:9,steps:48},
  {aimCount:33,moveCount:17,hypotheses:17,steps:48},
  {aimCount:65,moveCount:33,hypotheses:33,steps:96},
].map(Object.freeze));
export const CONVENTIONAL_WEIGHTS=Object.freeze({hit:4,danger:5,range:.08,collision:.3,aim:.025,base:.0001});
function expandedArena(arena,radius){radius=Math.max(0,radius-1e-9);return {bounds:{minX:arena.bounds.minX+radius,maxX:arena.bounds.maxX-radius,minY:arena.bounds.minY+radius,maxY:arena.bounds.maxY-radius},obstacles:arena.obstacles.map(o=>({...o,minX:o.minX-radius,maxX:o.maxX+radius,minY:o.minY-radius,maxY:o.maxY+radius}))};}
function advanceBody(p,v,dt,arena){const q=add(p,mul(v,dt));return segmentStaticTime(p,q,arena)===null?{p:q,blocked:false}:{p,blocked:len(v)>0};}
function grid(n){return Array.from({length:n},(_,i)=>n===1?0:2*i/(n-1)-1);}
function distinct(xs,key){const seen=new Set();return xs.filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});}
export function createConventionalPlanner({level=0,horizonSec=1.2,weights={},preferredDistance=5,throwAlignment=.12,aimSpan=.35,uncertainty=.25,publicRules={}}={}){
  if(!Number.isInteger(level)||!CONVENTIONAL_LEVELS[level])throw new RangeError('unknown conventional compute level');
  const rules={playerSpeed:4,outboundSpeed:12,returnSpeed:12,turnRate:2*Math.PI,playerRadius:.35,...publicRules};
  if(Object.keys(publicRules).some(k=>!['playerSpeed','outboundSpeed','returnSpeed','turnRate','playerRadius'].includes(k)))throw new RangeError('unknown public rule');
  if(Object.values(rules).some(v=>!Number.isFinite(v)||v<=0))throw new RangeError('invalid public rules');
  if(!Number.isFinite(horizonSec)||horizonSec<=0||horizonSec>3||!Number.isFinite(preferredDistance)||preferredDistance<=0||!Number.isFinite(throwAlignment)||throwAlignment<=0||!Number.isFinite(aimSpan)||aimSpan<0||!Number.isFinite(uncertainty)||uncertainty<0)throw new RangeError('invalid planner configuration');
  const w={...CONVENTIONAL_WEIGHTS,...weights};
  if(Object.keys(weights).some(k=>!(k in CONVENTIONAL_WEIGHTS))||Object.values(w).some(v=>!Number.isFinite(v)||v<0))throw new RangeError('invalid utility weights');
  const shape=CONVENTIONAL_LEVELS[level],spearMemory=createSpearMemory({outboundSpeed:rules.outboundSpeed,returnSpeed:rules.returnSpeed});
  let seen=null,lastEnemySpear=null,lastStats=null,previousScore=null;
  function evaluate(view,ownSpear,enemySpear,hypothesis,candidate,bodyArena){
    const dt=horizonSec/shape.steps;
    let me=copy(view.own.position),enemy=copy(hypothesis.position),facing=angle(view.own.facing),own=null,threat=null;
    let held=ownSpear.state==='HELD',embedded=ownSpear.state==='EMBEDDED',hit=0,danger=0,collisions=0,steps=0,ownDone=false,threatDone=false;
    if(['OUTBOUND','RETURNING'].includes(ownSpear.state)&&ownSpear.position&&ownSpear.direction)own={p:copy(ownSpear.position),d:copy(ownSpear.direction),returning:ownSpear.state==='RETURNING',target:ownSpear.recallTarget};
    if(enemySpear&&['OUTBOUND','RETURNING'].includes(enemySpear.state)&&enemySpear.direction)threat={p:copy(enemySpear.position),d:copy(enemySpear.direction),returning:enemySpear.state==='RETURNING',target:enemySpear.recallTarget};
    const targetAngle=angle(candidate.aim);
    for(let i=0;i<shape.steps;i++){
      steps++;
      const priorMe=me,priorEnemy=enemy;
      facing+=clamp(delta(targetAngle,facing),-rules.turnRate*dt,rules.turnRate*dt);
      const m=advanceBody(me,mul(candidate.move,rules.playerSpeed),dt,bodyArena);me=m.p;collisions+=m.blocked?1:0;
      enemy=advanceBody(enemy,hypothesis.velocity,dt,bodyArena).p;
      if(held&&candidate.attack&&Math.abs(delta(targetAngle,facing))<=throwAlignment){own={p:add(priorMe,mul(vec(facing),.35)),d:vec(facing),returning:false,target:null};held=false;}
      if(embedded&&candidate.recallAt!==null&&i*dt>=candidate.recallAt){const direction=unit(sub(priorMe,ownSpear.position));own={p:copy(ownSpear.position),d:direction,returning:true,target:copy(priorMe)};embedded=false;}
      // A visible held/embedded enemy spear permits fixed prospective threat
      // hypotheses. The model never consults the actual opponent policy.
      if(!threat&&!threatDone&&enemySpear?.state==='EMBEDDED'&&i*dt>=hypothesis.threatDelay){threat={p:copy(enemySpear.position),d:unit(sub(priorEnemy,enemySpear.position)),returning:true,target:copy(priorEnemy)};}
      if(!threat&&!threatDone&&view.opponent&&(!enemySpear||enemySpear.state==='HELD')&&i*dt>=hypothesis.threatDelay){threat={p:add(priorEnemy,mul(unit(sub(priorMe,priorEnemy)),.35)),d:unit(sub(priorMe,priorEnemy)),returning:false,target:null};}
      function projectile(p,priorBody,body){
        let distance=(p.returning?rules.returnSpeed:rules.outboundSpeed)*dt;
        const remaining=p.target?len(sub(p.target,p.p)):Infinity;distance=Math.min(distance,remaining);
        const next=add(p.p,mul(p.d,distance));
        const contact=segmentCircleTime(sub(p.p,priorBody),sub(next,body),{x:0,y:0},rules.playerRadius);
        const wall=p.returning?null:segmentStaticTime(p.p,next,view.arena);
        const didHit=contact!==null&&(wall===null||contact<=wall+1e-9);
        const done=didHit||wall!==null||remaining<=distance;
        p.p=next;return {didHit,done};
      }
      if(own&&!ownDone){const r=projectile(own,priorEnemy,enemy);if(r.didHit)hit=1;ownDone=r.done;}
      if(threat&&!threatDone){const r=projectile(threat,priorMe,me);if(r.didHit)danger=1;threatDone=r.done;}
    }
    const rangeError=Math.abs(len(sub(enemy,me))-preferredDistance);
    return {value:w.hit*hit-w.danger*danger-w.range*rangeError-w.collision*collisions/shape.steps-w.aim*Math.abs(delta(targetAngle,angle(sub(enemy,me)))),steps,hit,danger};
  }
  return {
    settings:()=>({family:'fixed-percept-geometric-mpc-v1',level,shape:{...shape},horizonSec,weights:{...w},preferredDistance,throwAlignment,aimSpan,uncertainty,publicRules:{...rules}}),
    choose(view,proposed){
      const now=view.time.elapsedSec;
      const score=JSON.stringify(view.scores??null);
      if(previousScore!==null&&previousScore!==score){seen=null;lastEnemySpear=null;}
      previousScore=score;
      if(view.opponent)seen={position:copy(view.opponent.position),velocity:copy(view.opponent.velocity),at:now};
      if(view.opponentSpear)lastEnemySpear={...structuredClone(view.opponentSpear),at:now};
      const ownSpear=spearMemory.observe(view);
      if(!seen||now-seen.at>2.5){lastStats={candidates:0,hypotheses:0,completedTrajectories:0,integrationSteps:0,fallback:'no-recent-opponent'};return {...proposed};}
      const age=now-seen.at,mean=add(seen.position,mul(seen.velocity,Math.min(age,.4))),lateral=unit({x:-seen.velocity.y,y:seen.velocity.x});
      const axis=len(lateral)?lateral:{x:0,y:1};
      const hypotheses=grid(shape.hypotheses).map(z=>({position:add(mean,mul(axis,z*uncertainty*(1+age))),velocity:add(seen.velocity,mul(axis,z*uncertainty)),threatDelay:.3*(z+1)}));
      const baseAim=unit({x:proposed.aimX??0,y:proposed.aimY??0});
      const lead=sub(add(mean,mul(seen.velocity,Math.min(.6,len(sub(mean,view.own.position))/rules.outboundSpeed))),view.own.position);
      const aims=distinct([baseAim,...grid(shape.aimCount).map(z=>vec(angle(lead)+z*aimSpan))].filter(a=>len(a)>0),v=>`${v.x.toFixed(9)}:${v.y.toFixed(9)}`);
      const baseMove=unit({x:proposed.moveX??0,y:proposed.moveY??0});
      const moves=distinct([baseMove,{x:0,y:0},...Array.from({length:shape.moveCount-1},(_,i)=>vec(angle(sub(mean,view.own.position))+2*Math.PI*i/(shape.moveCount-1)))],v=>`${v.x.toFixed(9)}:${v.y.toFixed(9)}`);
      const recallChoices=ownSpear.state==='EMBEDDED'?[null,0,.3,.6]:[null];
      const attacks=ownSpear.state==='HELD'?[!!proposed.throw,!proposed.throw]:[false];
      const bodyArena=expandedArena(view.arena,rules.playerRadius),enemySpear=lastEnemySpear&&now-lastEnemySpear.at<=2?lastEnemySpear:null;
      let best=null,completed=0,totalSteps=0,candidateCount=0;
      for(const aim of aims)for(const move of moves)for(const recallAt of recallChoices)for(const attack of attacks){
        const candidate={aim,move,recallAt,attack};let value=0;
        for(const h of hypotheses){const r=evaluate(view,ownSpear,enemySpear,h,candidate,bodyArena);value+=r.value;totalSteps+=r.steps;completed++;}
        value/=hypotheses.length;
        // Infinitesimal declared tie preference retains the incumbent proposal.
        value-=w.base*(len(sub(move,baseMove))+len(sub(aim,baseAim)));
        candidateCount++;if(!best||value>best.value)best={...candidate,value};
      }
      const out={moveX:best.move.x,moveY:best.move.y,aimX:best.aim.x,aimY:best.aim.y,throw:best.attack&&Math.abs(delta(angle(best.aim),angle(view.own.facing)))<=throwAlignment,recall:best.recallAt===0};
      lastStats={candidates:candidateCount,hypotheses:hypotheses.length,completedTrajectories:completed,integrationSteps:totalSteps,selectedUtility:best.value,modelOnly:true};
      return out;
    },
    commitCommand:(input,view,commandTime)=>spearMemory.command(input,view,commandTime),
    diagnostics:()=>lastStats?structuredClone(lastStats):null,
  };
}
