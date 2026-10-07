// Bounded target-content coordination. No simulator, evaluator, or hidden-state imports.
import {createContentPacket,overrideContentPacket,deliverContentPacket} from './content-broadcast.mjs';
import {createTargetMemory} from './target-memory.mjs';
import {createPredictionMonitor} from './prediction-monitor.mjs';
import {legalPoint} from './math.mjs';

export const COORDINATION_NOMINAL_UNITS = 16;
export const TARGET_CONTENT_VALIDITY_SEC = 1;
const clone = value => structuredClone(value);
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

function controls(input={}) {
  const allowed=['deliver','memoryWrite','memoryRead','monitorFeedback','monitorControl','reportEnabled','contentOverride','fixedMonitorSchedule'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw new TypeError('invalid coordination controls');
  for(const key of allowed.filter(k=>!['deliver','contentOverride','fixedMonitorSchedule'].includes(k)))if(input[key]!==undefined&&typeof input[key]!=='boolean')throw new TypeError('coordination switches must be booleans');
  const fixed=input.fixedMonitorSchedule??null;
  if(fixed !== null && (typeof fixed!=='object' || Array.isArray(fixed) || input.monitorControl!==false || Object.keys(fixed).some(k=>!['every','phase'].includes(k)) ||
    !Number.isInteger(fixed.every)||fixed.every<1||fixed.every>1000||!Number.isInteger(fixed.phase)||fixed.phase<0||fixed.phase>=fixed.every))
    throw new TypeError('fixed monitor schedule requires disabled monitor control and valid every/phase');
  const deliver=input.deliver??{};
  if(!deliver||typeof deliver!=='object'||Array.isArray(deliver)||Object.keys(deliver).some(k=>!['attention','memory','planner','report'].includes(k)||typeof deliver[k]!=='boolean'))throw new TypeError('invalid recipient switches');
  const replacement=input.contentOverride??null;
  if(replacement && (typeof replacement!=='object'||Array.isArray(replacement)||Object.keys(replacement).some(k=>!['mean','velocity','entity','uncertainty'].includes(k))))throw new TypeError('invalid content intervention');
  return clone({deliver,memoryWrite:input.memoryWrite!==false,memoryRead:input.memoryRead!==false,
    monitorFeedback:input.monitorFeedback!==false,monitorControl:input.monitorControl!==false,
    reportEnabled:input.reportEnabled!==false,contentOverride:replacement,fixedMonitorSchedule:fixed});
}

/** A read hypothesis, not an observation update to the persistent particle filter. */
export function projectContentBelief(local,packet,now,arena) {
  if(!packet||packet.entity!=='opponent'||!finitePoint(packet.mean)||!finitePoint(packet.velocity))return local;
  const elapsed=now-packet.hypothesisTime;
  const mean=legalPoint({x:packet.mean.x+packet.velocity.x*elapsed,y:packet.mean.y+packet.velocity.y*elapsed},arena);
  const radius=packet.uncertainty.radius;
  if(local.contentProvenance?.revision===packet.revision && local.contentProvenance?.uncertaintyRadius===radius && local.mean.x===mean.x && local.mean.y===mean.y && local.velocity.x===packet.velocity.x && local.velocity.y===packet.velocity.y)return local;
  const localRadius=Math.sqrt(Math.max(0,(local.covariance?.xx??0)+(local.covariance?.yy??0)));
  const spread=radius===null?1:Math.max(1,radius/Math.max(.05,localRadius));
  const particles=local.particles.map(p=>legalPoint({x:mean.x+(p.x-local.mean.x)*spread,y:mean.y+(p.y-local.mean.y)*spread},arena));
  const confidence=packet.source==='observed'?local.confidence:Math.min(local.confidence,radius===null?0:1/(1+radius));
  return {...local,mean,velocity:{...packet.velocity},particles,confidence,
    contentProvenance:{revision:packet.revision,source:packet.source,evidenceId:packet.evidenceId,uncertaintyRadius:radius,
      originalEvidenceTime:packet.originalEvidenceTime,hypothesisTime:now,ageSec:now-packet.originalEvidenceTime}};
}

export function coordinateAttention(base,packet,monitorRequest,localTarget) {
  const monitorSchedule=base.map(item=>({...item,target:item.target?{...item.target}:null}));
  if(monitorRequest?.reacquire) {
    const item=monitorSchedule.find(item=>item.item==='opponent');
    if(item){item.target=finitePoint(localTarget)?{...localTarget}:item.target;item.priority=1;item.due=!!item.target;item.reason=monitorRequest.reason==='fixed-monitor-schedule'?'fixed-monitor-schedule':'prediction-monitor';}
  }
  const proposed=monitorSchedule.map(item=>({...item,target:item.target?{...item.target}:null}));
  if(packet) {
    const item=proposed.find(item=>item.item===packet.entity);
    if(item) {
      item.target={...packet.mean};item.contentRevision=packet.revision;
      // A recalled/predicted selected target is an inspection request, not fresh visibility.
      if(packet.source!=='observed'){item.priority=Math.max(item.priority,.85);item.due=true;item.reason='selected-unobserved-content';}
    }
  }
  return {local:monitorSchedule,proposed};
}

export function createCoordination({reliabilitySnapshot=null,readOnly=false,researchControls={}}={}) {
  let config=controls(researchControls),revision=0,evidenceSequence=0,lastEvidence=null,lastPacket=null,lastCycle=null;
  const targetMemory=createTargetMemory(null,{readOnly}); // Episode-local; elapsed clocks reset across bouts.
  const monitor=createPredictionMonitor(reliabilitySnapshot,{readOnly});
  const reports=[];
  function begin(view,belief,now,{active=true,reason=null}={}) {
    revision++;
    if(!active) {lastCycle={active:false,reason,revision,time:now,packet:null,request:null,work:{reservedUnits:0}};return {belief,request:null};}
    let observation=null;
    if(view.opponent && (!lastEvidence||now>lastEvidence.time)) {
      observation={evidenceId:++evidenceSequence,entity:'opponent',position:{...view.opponent.position},time:now,source:'observed'};
      lastEvidence={...observation,velocity:{...view.opponent.velocity}};
    }
    const assessment=monitor.settle(observation,now,{commitFeedback:config.monitorFeedback});
    const proposedRequest=monitor.request();
    const fixed=config.fixedMonitorSchedule;
    const scheduled=fixed && (revision-1)%fixed.every===fixed.phase;
    const request=config.monitorControl?proposedRequest:scheduled?
      {reacquire:true,replan:true,reason:'fixed-monitor-schedule',entity:'opponent',revision}:null;
    // Compute the read regardless of its delivery switch; never reimport cross-bout coordinates.
    const recalled=targetMemory.recall('opponent',now,{enabled:config.memoryRead&&!view.opponent,revision});
    const workingBelief=recalled?projectContentBelief(belief,recalled,now,view.arena):belief;
    lastCycle={active:true,revision,time:now,packet:null,assessment,proposedRequest,request,
      recalled,receivers:{},contentIntervened:false,work:{reservedUnits:COORDINATION_NOMINAL_UNITS,
        monitorSettles:1,memoryReads:1,memoryWrites:0,packetBuilds:0,attentionProjections:0,plannerProjections:0,forecastIssues:0,reportBuilds:0},
      accounting:'declared nominal work reservation; not a full operation audit'};
    return {belief:workingBelief,request};
  }
  function broadcast(chosen,view,belief,now) {
    if(!lastCycle?.active)return null;
    let packet=null;
    // This milestone shares opponent hypotheses. Other selected referents retain local routes.
    const hypothesis=chosen.broadcast?.hypothesis;
    const targetSelected=hypothesis?.entity==='opponent' && finitePoint(hypothesis.mean) && finitePoint(hypothesis.velocity);
    const radius=targetSelected?hypothesis.uncertainty.radius:null;
    if(targetSelected && view.opponent && lastEvidence?.time===now) {
      packet=createContentPacket({revision,focus:chosen.focus,entity:'opponent',mean:hypothesis.mean,velocity:hypothesis.velocity,
        hypothesisTime:now,originalEvidenceTime:now,issuedAt:now,evidenceId:lastEvidence.evidenceId,source:'observed',
        uncertainty:{status:'known',radius},validUntil:now+TARGET_CONTENT_VALIDITY_SEC},now);
    } else if(targetSelected && lastCycle.recalled) {
      packet=createContentPacket({...lastCycle.recalled,revision,focus:chosen.focus,mean:hypothesis.mean,velocity:hypothesis.velocity},now);
    } else if(targetSelected && lastPacket?.entity==='opponent' && lastPacket.validUntil>=now) {
      const uncertainty=lastPacket.uncertainty.status==='unknown'?lastPacket.uncertainty:
        {status:'known',radius:Math.max(radius,lastPacket.uncertainty.radius)};
      packet=createContentPacket({...lastPacket,revision,focus:chosen.focus,source:'predicted',mean:hypothesis.mean,velocity:hypothesis.velocity,
        hypothesisTime:now,issuedAt:now,ageSec:now-lastPacket.originalEvidenceTime,uncertainty,
        lineage:{rootEvidenceId:lastPacket.evidenceId,parentRevision:lastPacket.revision}},now);
    }
    lastCycle.work.packetBuilds++;
    if(packet && config.contentOverride) {
      const replaced=overrideContentPacket(packet,{...packet,...config.contentOverride},now);
      lastCycle.contentIntervened=!!replaced;packet=replaced;
    }
    const deliveries=deliverContentPacket(packet,now,config.deliver);
    lastCycle.packet=packet;lastCycle.deliveries=deliveries;
    lastCycle.receivers.memory=targetMemory.remember(packet,{now,enabled:config.memoryWrite&&!!deliveries.memory});
    lastCycle.work.memoryWrites++;
    lastCycle.forecastIssue=packet?.entity==='opponent'?monitor.issue(packet,now):{issued:false,reason:'no-selected-target'};
    lastCycle.work.forecastIssues++;
    if(packet)lastPacket=packet;
    return packet;
  }
  function attend(schedule,localTarget) {
    if(!lastCycle?.active)return schedule;
    const projected=coordinateAttention(schedule,lastCycle.packet,lastCycle.request,localTarget);
    const delivered=!!lastCycle.deliveries.attention;
    const result=delivered?projected.proposed:projected.local;
    lastCycle.receivers.attention={delivered,contentRevision:delivered?lastCycle.packet.revision:null,
      proposed:projected.proposed,used:result};lastCycle.work.attentionProjections++;
    return result;
  }
  function plan(local,now,arena) {
    if(!lastCycle?.active)return local;
    const projected=projectContentBelief(local,lastCycle.packet,now,arena);
    const delivered=!!lastCycle.deliveries.planner;
    const result=delivered?projected:local;
    lastCycle.receivers.planner={delivered,contentRevision:delivered?lastCycle.packet.revision:null,
      proposedMean:{...projected.mean},usedMean:{...result.mean},source:delivered?lastCycle.packet.source:'local',particles:result.particles.length};
    lastCycle.work.plannerProjections++;
    return result;
  }
  function finish({chosen,cognition,input,now,pendingRecallPlan,invalidatedRecallPlan=null}) {
    const state=monitor.state();
    if(!lastCycle)lastCycle={active:false,reason:'not-run',packet:null,time:now};
    lastCycle.monitor=state;lastCycle.pendingRecallPlan=clone(pendingRecallPlan);lastCycle.invalidatedRecallPlan=clone(invalidatedRecallPlan);
    const packet=lastCycle.deliveries?.report??null;
    const report={time:now,focus:chosen.focus,content:packet?clone(packet):null,
      reason:packet?`${packet.entity}: ${packet.source} hypothesis; evidence age ${(now-packet.originalEvidenceTime).toFixed(3)}s`:'No delivered shared target hypothesis; local control may remain active',
      prediction:{category:state.category,assessed:state.assessed,errorEWMA:state.errorEWMA,pending:state.pending,lastAssessment:state.lastAssessment,lastDisposition:state.lastDisposition},
      novelty:cognition.novelty,completion:{status:cognition.planStatus,bounds:cognition.branches.map(b=>({tactic:b.tactic,completion:b.completion??null}))},
      request:lastCycle.request??null,proposedRequest:lastCycle.proposedRequest??null,
      emittedInput:{...input},contentIntervened:lastCycle.contentIntervened??false,
      coordinationActive:lastCycle.active,scope:'functional state report, not a claim of experience'};
    if(lastCycle.work)lastCycle.work.reportBuilds=(lastCycle.work.reportBuilds??0)+1;
    if(config.reportEnabled){reports.push(report);if(reports.length>64)reports.shift();}
    lastCycle.reportDelivered=config.reportEnabled;lastCycle.receivers??={};lastCycle.receivers.report={delivered:!!packet&&config.reportEnabled};
    return clone(lastCycle);
  }
  return {begin,broadcast,attend,plan,finish,
    setControls:input=>{config=controls(input);},settings:()=>clone(config),
    snapshot:()=>monitor.snapshot(),
    state:()=>clone({cycle:lastCycle,targetMemory:targetMemory.snapshot(),monitor:monitor.state()}),
    report:time=>clone(time===undefined?reports.at(-1)??null:reports.findLast(r=>r.time<=time)??null)};
}
