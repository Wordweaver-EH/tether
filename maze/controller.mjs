// Domain integration of UNCHANGED Tether computation, not createMind transfer.
import {createWorkspace} from '../src/mind/workspace.mjs';
import {createCoordination,COORDINATION_NOMINAL_UNITS} from '../src/mind/coordination.mjs';
import {createBudget} from '../src/mind/cognition.mjs';
import {legalPoint} from '../src/mind/math.mjs';
import {plan,direction} from './planner.mjs';
import {distance,STEP_SEC} from './world.mjs';
export const VARIANTS=Object.freeze(['full','contentCut','memoryOff','monitorOff','fixed','conventional']);
export function createMazeController({variant='full',researchControls={},noWorkspace=false}={}) {
  if(!VARIANTS.includes(variant))throw new RangeError('unknown variant');
  const switches=variant==='contentCut'?{deliver:{attention:false,planner:false}}:variant==='memoryOff'?{memoryRead:false}:variant==='monitorOff'?{monitorControl:false}:variant==='fixed'?{monitorControl:false,fixedMonitorSchedule:{every:4,phase:0}}:{};
  const coordination=createCoordination({researchControls:{...switches,...researchControls}}),workspace=createWorkspace({noWorkspace});
  let queue=[],lastFocus=null,lastSeen=null;
  return {step(view){
    const now=view.time.elapsedSec,budget=createBudget(64);budget.spend('control',8);budget.spend('coordination',COORDINATION_NOMINAL_UNITS);
    if(view.opponent)lastSeen={...structuredClone(view.opponent),time:now};
    let local={mean:view.opponent?{...view.opponent.position}:{...view.own.position},velocity:view.opponent?{...view.opponent.velocity}:{x:0,y:0},confidence:view.opponent?1:0,covariance:{xx:0,yy:0},particles:[view.opponent?{...view.opponent.position}:{...view.own.position}]};
    // Minimal local sensor trace: one-second static last sighting. Episodic
    // recall can replace it with the original velocity-projected hypothesis.
    if(!view.opponent && lastSeen && now-lastSeen.time<=1)local={...local,mean:{...lastSeen.position},confidence:.25,particles:[{...lastSeen.position}]};
    const conventional=variant==='conventional';
    const started=conventional?{belief:local,request:null}:coordination.begin(view,local,now);
    let working=started.belief;
    if(conventional && lastSeen && now-lastSeen.time<=1){working={...local,mean:legalPoint({x:lastSeen.position.x+lastSeen.velocity.x*(now-lastSeen.time),y:lastSeen.position.y+lastSeen.velocity.y*(now-lastSeen.time)},view.arena),velocity:lastSeen.velocity,confidence:1};local=working;}
    const known=working.confidence>0,gap=known?distance(view.own.position,working.mean):Infinity;
    const hypothesis=known?{entity:'opponent',mean:{...working.mean},velocity:{...working.velocity},uncertainty:{status:'known',radius:working.contentProvenance?.uncertaintyRadius??0}}:null;
    const candidates={
      Forage:{content:'collect remaining pellets',salience:.6,wants:{move:'Forage'}},
      Threat:{content:'avoid the perceived ghost',salience:known?Math.max(.1,1-gap/10):0,wants:{move:'Threat'},hypothesis},
      Inspect:{content:'reacquire a remembered ghost',salience:known && !view.opponent && gap<6 ? .62 : 0,wants:{gaze:'inspect'},hypothesis},
    };
    // No maze reward is passed off as combat affect. Fixed neutral appraisal.
    let chosen=conventional?null:workspace.choose(candidates,now,{});
    if(conventional){const focus=gap<4?'Threat':'Forage';chosen={focus,broadcast:candidates[focus],outputs:candidates[focus].wants,ignition:focus!==lastFocus};}
    if(!conventional)coordination.broadcast(chosen,view,working,now);
    const baseSchedule=[{item:'opponent',target:view.opponent?{...view.opponent.position}:null,priority:.4,due:!!view.opponent}];
    const schedule=conventional?baseSchedule:coordination.attend(baseSchedule,working.mean);
    // Current visible observation is the local fallback. A recalled selected
    // hypothesis reaches planning through its actual content-delivery gate.
    const planning=conventional?local:coordination.plan(local,now,view.arena);
    const request=conventional?view.tick%4===0:!!started.request?.replan;
    const invalidated=request&&queue.length>0?[...queue]:null;
    if(request||chosen.focus!==lastFocus)queue=[];
    let calculation=null;
    if(!queue.length){calculation=plan(view,planning,chosen.outputs.move??'Forage',budget);queue=[...calculation.actions];}
    const move=queue.shift()??'WAIT';
    let gaze=direction(view.own.position,{x:view.own.position.x+(move==='E'?1:move==='W'?-1:0),y:view.own.position.y+(move==='S'?1:move==='N'?-1:0)},view.gaze);
    const attention=schedule.find(x=>x.due&&x.target);if(attention)gaze=direction(view.own.position,attention.target,gaze);
    const action={move,gaze};
    const trace=conventional?{active:false,reason:'conventional-bypass',packet:null,recalled:null,request:null}:coordination.finish({chosen,cognition:{novelty:null,planStatus:calculation?(calculation.complete?'maze-two-step-complete':'maze-incomplete'):'cached',branches:[]},input:action,now,pendingRecallPlan:queue.length?{actions:[...queue]}:null,invalidatedRecallPlan:invalidated});
    lastFocus=chosen.focus;
    return {action,diagnostic:{focus:chosen.focus,workspace:chosen,coordination:trace,budget:budget.report(),planningMean:planning.confidence>0?planning.mean:null,workingMean:known?working.mean:null,calculation,invalidated,request,stepSec:STEP_SEC}};
  }};
}
