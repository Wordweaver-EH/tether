import {controlRoute} from './cover-control.mjs';
import {createCoverInterface} from './cover-interface.mjs';
import {observableCoverReset} from './cover-calibrated-monitor.mjs';
import {createCalibratedChecker} from '../mind/calibrated-checking.mjs';
import {hasLineOfSight} from '../visibility.js';
export const VALUE_EMBODIMENT=Object.freeze({decisionHz:30,windowTicks:96,passiveTicks:30,checkTicks:12,checkEmbargoTicks:3,reconsiderEmbargoTicks:6,planTicks:24,computePrice:.0005});
export const VALUE_FEATURES=Object.freeze(['known','age','uncertainty','distance','angularGap','speed','ownHeld','ownOutbound','objectiveDistance','routineMoving','previousCheck','previousReconsider','planRemaining']);
const cap=(x,m=1)=>Math.max(-m,Math.min(m,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=p=>{const n=Math.hypot(p.x,p.y)||1;return{x:p.x/n,y:p.y/n}};
const copy=x=>structuredClone(x);
// Only this adapter knows Tether geometry. Core receives a bounded vector.
export function valueFeatures({belief,time,own,routine,previousAction,planRemaining}){
 const age=belief?Math.max(0,time-belief.time):5,p=belief?.position;
 const dx=p?p.x-own.position.x:0,dy=p?p.y-own.position.y:0,n=Math.hypot(dx,dy);
 const cosine=n?(dx*own.facing.x+dy*own.facing.y)/n:1;
 return [Number(!!belief),cap(age/5),cap((.1+age*(1+Math.hypot(belief?.velocity.x??0,belief?.velocity.y??0)))/10),cap(n/15),(1-cap(cosine))/2,cap(Math.hypot(belief?.velocity.x??0,belief?.velocity.y??0)/4),Number(own.spear?.state==='HELD'),Number(own.spear?.state==='OUTBOUND'),cap(Math.hypot(own.position.x,own.position.y)/10),Number(Math.hypot(routine.x,routine.y)>.01),Number(previousAction==='check'),Number(previousAction==='reconsider'),cap(planRemaining/24)];
}
function safe(p,arena){const r=.36,b=arena.bounds;return p.x>b.minX+r&&p.x<b.maxX-r&&p.y>b.minY+r&&p.y<b.maxY-r&&!arena.obstacles.some(o=>p.x>o.minX-r&&p.x<o.maxX+r&&p.y>o.minY-r&&p.y<o.maxY+r);}
// Bounded real computation, using belief only. Same declared movement/threat
// priors in every arm. Candidate trajectories are not actual simulator forks.
export function reconsiderMove({own,belief,routine,arena,time}){
 const base=unit(routine),candidates=[base,{x:0,y:0},...Array.from({length:8},(_,j)=>({x:Math.cos(j*Math.PI/4),y:Math.sin(j*Math.PI/4)}))];
 let best=null,work=0;
 const trajectories=candidates.map((direction,index)=>{let value=0,valid=true;
  for(let k=1;k<=12;k++){work++;const h=k/20,p={x:own.position.x+direction.x*4*h,y:own.position.y+direction.y*4*h};
   if(!safe(p,arena)){valid=false;value-=100;continue;}
   value-=.04*Math.hypot(p.x,p.y);
   // Prefer following the routine off-ring; estimated opponent firing line
   // incurs a smooth risk only while its memory is reasonably fresh.
   value+=.05*(direction.x*base.x+direction.y*base.y);
   if(belief&&time-belief.time<2){const e=belief.position,f=belief.facing,dx=p.x-e.x,dy=p.y-e.y,along=dx*f.x+dy*f.y,lateral=Math.abs(dx*f.y-dy*f.x);if(along>0&&along<7)value-=Math.max(0,1-lateral/.9)*.18;}
  }
  const result={index,direction,value,valid};if(!best||value>best.value)best=result;return result;});
 return {move:copy(best.direction),work,trajectories,changed:dist(best.direction,base)>1e-9};
}
export function createValueController({selectAction,variant='learned',monitorModel=null,windows=20}={}){
 if(typeof selectAction!=='function'&&variant!=='monitor')throw Error('action selector required');
 const E=VALUE_EMBODIMENT,monitor=monitorModel?createCalibratedChecker(monitorModel):null;
 let tick=0,belief=null,previous=null,waypoint=0,action='continue',checkUntil=-1,embargoUntil=-1,planUntil=-1,plan=null,pending=null,monitorPending=false,last=null;
 const completed=[],trace=[];
 const score=v=>v.scores[v.viewerId]-v.scores[v.viewerId==='P1'?'P2':'P1'];
 return {settings:()=>({controller:'cover-checking-value-restricted-processing-v1',variant,embodiment:E,features:VALUE_FEATURES,windows}),
  completed:()=>copy(completed),trace:()=>copy(trace),lastDecision:()=>copy(last),
  act(view){
   if(view.gameMode!=='COVER_CONTROL')throw Error('Cover percept required');
   const time=view.time.elapsedSec,reset=observableCoverReset(previous,view);
   if(reset){belief=null;waypoint=0;plan=null;planUntil=-1;monitorPending=false;}
   const path=controlRoute(view.viewerId,'north'),own=view.own;
   while(waypoint<path.length-1&&dist(own.position,path[waypoint])<.23)waypoint++;
   const target=path[waypoint],routine=dist(own.position,target)>.16?{x:target.x-own.position.x,y:target.y-own.position.y}:{x:0,y:0};
   // Observation delivery is intact. This explicit experimental gate controls
   // costly processing into the deliberative cache, not physical visibility.
   const passive=tick%E.passiveTicks===0||variant==='ordinaryRefresh';
   let acquired=false,observation=null;
   function acquire(){acquired=true;if(view.opponent){belief={...copy(view.opponent),time};observation={time,position:copy(view.opponent.position),velocity:copy(view.opponent.velocity)};}}
   if(passive||tick<checkUntil)acquire();
   if(monitor){const m=monitor.update({time,observation,knownReset:reset});monitorPending||=m.pulse;}
   let intervention=null;
   if(tick%E.windowTicks===0){
    if(pending){const taskReward=score(view)-pending.startScore;completed.push({...pending,endTime:time,taskReward,reward:taskReward-E.computePrice*pending.extraWork});pending=null;}
    if(tick/E.windowTicks<windows){
     const features=valueFeatures({belief,time,own,routine,previousAction:action,planRemaining:Math.max(0,planUntil-tick)});
     const selected=variant==='monitor'?{action:monitorPending?'check':'continue',propensity:1}:selectAction(features,{window:tick/E.windowTicks,time});
     if(!['continue','check','reconsider'].includes(selected.action))throw Error('invalid action');
     action=selected.action;monitorPending=false;
     pending={window:tick/E.windowTicks,startTime:time,startScore:score(view),features:copy(features),action,propensity:selected.propensity??1,extraWork:0,embargoTicks:0,acquisitions:0,reconsiderCompleted:false,planChanged:false,commandChangedTicks:0,resetCount:0};
     intervention={action,time,features:copy(features)};
     if(action==='check'){checkUntil=tick+E.checkTicks;embargoUntil=tick+E.checkEmbargoTicks;if(!acquired)acquire();}
     if(action==='reconsider'){const result=reconsiderMove({own,belief,routine,arena:view.arena,time});plan=result.move;planUntil=tick+E.planTicks;embargoUntil=tick+E.reconsiderEmbargoTicks;pending.extraWork+=result.work;pending.reconsiderCompleted=true;pending.planChanged=result.changed;intervention.planner=result;}
    }else action='continue';
   }
   if(pending){pending.resetCount+=Number(reset);if(acquired&&!passive){pending.extraWork++;pending.acquisitions++;}}
   const age=belief?Math.max(0,time-belief.time):Infinity;
   const aimTarget=belief?{x:belief.position.x+belief.velocity.x*Math.min(age+.15,.65),y:belief.position.y+belief.velocity.y*Math.min(age+.15,.65)}:null;
   const aim=aimTarget?{x:aimTarget.x-own.position.x,y:aimTarget.y-own.position.y}:{x:Math.cos(time*2),y:Math.sin(time*2)};
   const n=Math.hypot(aim.x,aim.y)||1,aligned=(aim.x*own.facing.x+aim.y*own.facing.y)/n>.985;
   const baseMove=unit(routine),move=tick<planUntil&&plan?plan:baseMove;
   const command={moveX:move.x,moveY:move.y,aimX:aim.x,aimY:aim.y,throw:!!aimTarget&&age<1.5&&own.spear?.state==='HELD'&&aligned&&hasLineOfSight(own.position,aimTarget,view.arena.obstacles),recall:!own.spear||own.spear.state==='EMBEDDED'};
   if(pending&&tick>=embargoUntil&&dist(move,baseMove)>1e-9)pending.commandChangedTicks++;
   const embargo=tick<embargoUntil;if(embargo){command.moveX=0;command.moveY=0;command.throw=false;if(pending)pending.embargoTicks++;}
   last={tick,time,action,passive,acquired,observationTime:observation?.time??null,belief:copy(belief),embargo,reset,intervention,command:copy(command)};
   trace.push(copy(last));previous={time:copy(view.time),own:{position:copy(own.position)},viewerId:view.viewerId,scores:copy(view.scores)};tick++;return command;
  }};
}
export function createValueAgent(options){const controller=createValueController(options);return {...controller,...createCoverInterface(controller,{seed:options.seed??1})};}
