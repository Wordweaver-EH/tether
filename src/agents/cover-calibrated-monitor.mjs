import {createCalibratedChecker,CHECKING_PRIORS} from '../mind/calibrated-checking.mjs';
// Cover-specific reset inference. A score alone is ambiguous because of ring
// awards. Require an impossible own-body displacement into the public spawn.
export function observableCoverReset(previous,view) {
  if(!previous)return false;
  const dt=view.time.elapsedSec-previous.time.elapsedSec;
  const p=view.own.position,q=previous.own.position;
  const spawnX=view.viewerId==='P1'?-5.5:5.5;
  const scoreChanged=view.scores.P1!==previous.scores.P1||view.scores.P2!==previous.scores.P2;
  return dt>0&&scoreChanged&&Math.hypot(p.x-spawnX,p.y)<.15&&Math.hypot(p.x-q.x,p.y-q.y)>4*dt+.1;
}
export function createCoverCalibratedMonitor({model,schedule=null}) {
  const checker=createCalibratedChecker(model);let previous=null,tick=0,last=null;
  const times=schedule===null?null:new Set(schedule);
  if(times&&(times.size!==schedule.length||schedule.some(t=>!Number.isInteger(t)||t<0)))throw Error('invalid check schedule');
  return {update(view){
    if(view.gameMode!=='COVER_CONTROL')throw Error('Cover Control percept required');
    const knownReset=observableCoverReset(previous,view),time=view.time.elapsedSec;
    const observation=view.opponent?{time,position:{...view.opponent.position},velocity:{...view.opponent.velocity}}:null;
    const state=checker.update({time,observation,knownReset});
    const scheduled=times?.has(tick)??false;
    last={...state,tick,proposedPulse:state.pulse,scheduled,
      request:(times?scheduled:state.pulse)?{reacquire:true,replan:true,reason:times?'fixed-monitor-schedule':state.reason,entity:'opponent',target:state.target}:null};
    previous=structuredClone(view);tick++;return structuredClone(last);
  },state:()=>structuredClone(last),settings:()=>({model:checker.model(),schedule,resetRule:'score-change + own impossible spawn displacement',priors:CHECKING_PRIORS})};
}
