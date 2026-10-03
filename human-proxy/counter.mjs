import {createSpearMemory} from '../src/agents/spear-memory.mjs';
export const SETTINGS=Object.freeze({version:1,latencySec:.25,decisionHz:30,heldDistance:5.25,awayDistance:4.5,radius:.35,playerSpeed:4,spearSpeed:12,awayMemorySec:.1,opponentMemorySec:.75});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),mul=(a,k)=>({x:a.x*k,y:a.y*k}),dot=(a,b)=>a.x*b.x+a.y*b.y;
const length=a=>Math.hypot(a.x,a.y),unit=a=>mul(a,1/(length(a)||1)),distance=(a,b)=>length(sub(a,b));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
// Straight segment clearance against known geometry, not an engine/world rollout.
export function clearTravel(p,d,maxTravel,arena,radius=.35){
 let limit=maxTravel;const b=arena.bounds;
 if(d.x>0)limit=Math.min(limit,(b.maxX-radius-p.x)/d.x);else if(d.x<0)limit=Math.min(limit,(b.minX+radius-p.x)/d.x);
 if(d.y>0)limit=Math.min(limit,(b.maxY-radius-p.y)/d.y);else if(d.y<0)limit=Math.min(limit,(b.minY+radius-p.y)/d.y);
 for(const box of arena.obstacles){let enter=-Infinity,exit=Infinity;
  for(const axis of ['x','y']){const lo=box[axis==='x'?'minX':'minY']-radius,hi=box[axis==='x'?'maxX':'maxY']+radius;
   if(Math.abs(d[axis])<1e-12){if(p[axis]<=lo||p[axis]>=hi){exit=-Infinity;break;}}
   else {const a=(lo-p[axis])/d[axis],z=(hi-p[axis])/d[axis];enter=Math.max(enter,Math.min(a,z));exit=Math.min(exit,Math.max(a,z));}}
  if(enter<=exit&&exit>1e-8&&enter>=-1e-8)limit=Math.min(limit,Math.max(0,enter));
 }
 return Math.max(0,limit);
}
function extrapolate(p,v,seconds,arena){const speed=length(v);if(!speed)return {...p};const d=unit(v);return add(p,mul(d,clearTravel(p,d,speed*seconds,arena)));}
function intercept(relative,velocity){const a=dot(velocity,velocity)-144,b=2*dot(relative,velocity),c=dot(relative,relative),disc=b*b-4*a*c;
 if(disc<0)return Math.min(length(relative)/12,.8);const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(t=>t>=0);return clamp(Math.min(...roots),0,.8);}
export function createHumanCounter({seed=1}={}){
 let memory=createSpearMemory(),lastOpponent=null,lastEnemySpear=null,lastScore=null,lastDiagnostic=null,lateralSign=(seed%2?1:-1),lastSwitch=-Infinity,lastMove={x:0,y:0};
 const totals={decisions:0,awayOpportunities:0,alignedOpportunities:0,throwCommands:0,recallCommands:0,threats:0,dodges:0,scoreResets:0};
 return {settings:()=>({...SETTINGS,seed}),diagnostics:()=>structuredClone(lastDiagnostic),totals:()=>({...totals}),
 commitCommand(command,view,receiptTime){memory.command(command,view,receiptTime);lastMove={x:command.moveX??0,y:command.moveY??0};},
 act(v,dt){if(dt!==1/30)throw new Error('counter requires external30Hz interface');
  const now=v.time.elapsedSec,score=`${v.scores.P1}:${v.scores.P2}`;
  if(lastScore!==null&&score!==lastScore){memory=createSpearMemory();lastOpponent=null;lastEnemySpear=null;lastMove={x:0,y:0};totals.scoreResets++;}lastScore=score;
  const ownSpear=memory.observe(v);
  if(v.opponent)lastOpponent={...structuredClone(v.opponent),at:now};
  if(v.opponentSpear)lastEnemySpear={...structuredClone(v.opponentSpear),at:now};
  const observed=lastOpponent&&now-lastOpponent.at<=SETTINGS.opponentMemorySec?lastOpponent:null;
  const me=extrapolate(v.own.position,v.own.velocity,.25,v.arena);
  const enemy=observed?extrapolate(observed.position,observed.velocity,.25+now-observed.at,v.arena):null;
  const toward=enemy?unit(sub(enemy,me)):v.own.facing,lateral={x:-toward.y,y:toward.x};
  // Visible or very recent evidence only. RETURNING/EMBEDDED may already have recycled.
  const es=lastEnemySpear&&now-lastEnemySpear.at<=SETTINGS.awayMemorySec?lastEnemySpear:null;
  const supportedAway=!!(v.opponent&&es&&es.state!=='HELD'&&['OUTBOUND','EMBEDDED','RETURNING'].includes(es.state)&&(es.state==='OUTBOUND'||distance(es.position,v.opponent.position)>12*(.25+now-es.at+.05)));
  const targetDistance=supportedAway?SETTINGS.awayDistance:SETTINGS.heldDistance;
  const d=enemy?distance(me,enemy):null;
  const input={moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:ownSpear.state==='EMBEDDED'};
  let aim=v.own.facing;
  if(enemy){const ev=observed.velocity,t=intercept(sub(enemy,me),ev);const target=extrapolate(enemy,ev,t,v.arena);aim=unit(sub(target,me));}
  else {const angle=Math.atan2(v.own.facing.y,v.own.facing.x)+.3;aim={x:Math.cos(angle),y:Math.sin(angle)};}
  input.aimX=aim.x;input.aimY=aim.y;
  const opportunity=supportedAway&&ownSpear.state==='HELD'&&!!v.opponent;
  const aligned=dot(v.own.facing,aim)>=Math.cos(.13);
  if(opportunity){totals.awayOpportunities++;if(aligned){totals.alignedOpportunities++;input.throw=true;}}
  // Choose a free lateral side before distance correction; switching has hysteresis.
  const left=clearTravel(me,lateral,1.5,v.arena),right=clearTravel(me,mul(lateral,-1),1.5,v.arena);
  const preferred=left>right+.25?1:right>left+.25?-1:lateralSign;
  if(preferred!==lateralSign&&(now-lastSwitch>.3||Math.max(left,right)-Math.min(left,right)>.8)){lateralSign=preferred;lastSwitch=now;}
  const radial=enemy?clamp((d-targetDistance)*1.5,-1,v.opponent?1:0):0;
  let desired=enemy?add(mul(toward,radial),mul(lateral,.7*lateralSign)):{x:-me.x*.2,y:-me.y*.2};
  let threat=null;
  if(v.opponentSpear&&['OUTBOUND','RETURNING'].includes(v.opponentSpear.state)){
   const s=v.opponentSpear,sd=unit(s.direction),sp=add(s.position,mul(sd,12*.25)),rel=sub(me,sp),along=dot(rel,sd),side=rel.x*sd.y-rel.y*sd.x;
   // The two-frame buffer catches imminent contact under stale body velocity.
   if(along>=-.4&&along<=12*.55&&Math.abs(side)<.8){
    totals.threats++;const perp={x:-sd.y,y:sd.x},a=clearTravel(me,perp,1.5,v.arena),b=clearTravel(me,mul(perp,-1),1.5,v.arena);
    const signed=dot(sub(me,sp),perp);const continuation=dot(lastMove,perp)||dot(mul(lateral,lateralSign),perp);let sign=Math.abs(signed)>.05?Math.sign(signed):(Math.sign(continuation)||lateralSign);
    if(a<b-.25)sign=-1;else if(b<a-.25)sign=1;
    desired=mul(perp,sign);threat={along,side,sign,available:sign===1?a:b};totals.dodges++;
   }
  }
  // Pick nearest unobstructed heading. No stateful search or opponent rollout.
  const wish=unit(desired);let best={score:-Infinity,d:{x:0,y:0}};
  for(let k=0;k<32;k++){const ang=k*Math.PI/16,u={x:Math.cos(ang),y:Math.sin(ang)},free=clearTravel(me,u,1,v.arena);if(free<.2)continue;
   const next=add(me,mul(u,free)),central=Math.min(next.x-v.arena.bounds.minX,v.arena.bounds.maxX-next.x,next.y-v.arena.bounds.minY,v.arena.bounds.maxY-next.y);
   const val=2*dot(u,wish)+.3*free+.04*Math.min(central,2);if(val>best.score)best={score:val,d:u};}
  input.moveX=best.d.x;input.moveY=best.d.y;
  totals.decisions++;if(input.throw)totals.throwCommands++;if(input.recall)totals.recallCommands++;
  lastDiagnostic={sensorTime:now,estimatedPosition:me,estimatedEnemy:enemy,distance:d,targetDistance,supportedAway,opportunity,aligned,ownSpearState:ownSpear.state,threat,lateralSign,command:{...input}};
  return input;
 }};
}
