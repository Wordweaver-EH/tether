import {sha256,serialize} from './raw-stream.mjs';
const copyFields=(source,keys)=>{const out={};if(source)for(const key of keys)if(Object.hasOwn(source,key))out[key]=source[key];return out;};
export function learningSupport(memory){return Object.fromEntries(Object.entries(memory?.learning?.table??{}).map(([key,tactics])=>[key,Object.fromEntries(Object.entries(tactics).map(([tactic,row])=>[tactic,row.n]))]));}
export function createCompactor({initialSupport=null}={}){
 let task=null,support=structuredClone(initialSupport??{});const dictionaries=new Map(),issues=new Set(),outcomes=new Set();
 const pendingId=p=>sha256([task.id,task.seat,p.key,p.tactic,p.time,Math.round(p.time*120)]);
 return {transform(record){
  const rows=[],definitions=[];
  const ref=(kind,value)=>{if(value===undefined)return undefined;if(value===null)return null;const contentHash=sha256([kind,value]);if(!dictionaries.has(contentHash)){const id=dictionaries.size;dictionaries.set(contentHash,id);definitions.push({id,kind,contentHash,value});}return dictionaries.get(contentHash);};
  if(record.type==='task-start'){task=record.task;if(record.initialLearningSupport)support=structuredClone(record.initialLearningSupport);return [{...record,schemaVersion:2,initialLearningSupport:support,retention:'compact-v2; full environment reconstructible from both-seat actual commands; internal rollout trajectories omitted'}];}
  if(record.type!=='decision')return [record];
  if(!task)throw new Error('task-start required before decisions');
  const d=record.diagnostic,c=d?.cognition,co=c?.coordination;
  const native=c?{serial:d.serial,focus:d.focus,situation:c.situation,issuedTactic:c.tactic,habit:c.habit,novelty:c.novelty,budget:c.budget,...copyFields(c,['tier','automatic','noveltyRequested','noveltyForced','monitorForced','handoffBlocked','planStatus','completedBranches','issuedLearningTier','fixedTeacher']),branchCompletion:c.branches.map(b=>copyFields(b,['tactic','completion'])),...(Object.hasOwn(c,'selectedBranch')?{selectedBranch:c.selectedBranch===null?null:copyFields(c.selectedBranch,['tactic','completion'])}:{}),...copyFields(d,['pendingRecallPlan'])}:null;
  // Native observe occurs before native record within one decision; preserve that order.
  if(c?.outcome){const id=pendingId(c.outcome);if(!outcomes.has(id)){outcomes.add(id);const {key,tactic}=c.outcome;support[key]??={};support[key][tactic]=(support[key][tactic]??0)+1;rows.push({type:'native-outcome',id,taskId:task.id,seat:task.seat,decisionIndex:record.decisionIndex,receiptTick:record.tick,value:c.outcome});}}
  let pendingRef=null;
  if(record.nativePending){const p=record.nativePending;pendingRef=pendingId(p);if(!issues.has(pendingRef)){issues.add(pendingRef);const situationPriorN=Object.values(support[p.key]??{}).reduce((a,b)=>a+b,0),tacticPriorN=support[p.key]?.[p.tactic]??0;rows.push({type:'native-pending-issue',id:pendingRef,taskId:task.id,seat:task.seat,issueSensorTick:Math.round(p.time*120),receiptTick:record.tick,receiptTime:record.receiptTime,value:p,support:{origin:'evaluator-derived-genuine-outcome-ledger',situationPriorN,tacticPriorN,situationColdStart:situationPriorN===0,tacticColdStart:tacticPriorN===0}});}}
  const coordination=co?{
   ...copyFields(co,['active','revision','time','request','proposedRequest','contentIntervened','reportDelivered','pendingRecallPlan','invalidatedRecallPlan','work','accounting']),
   packet:ref('packet',co.packet),deliveries:Object.fromEntries(Object.entries(co.deliveries??{}).map(([key,value])=>[key,ref('packet',value)])),receivers:co.receivers,
   forecastIssue:ref('forecast-issue',co.forecastIssue),assessment:ref('assessment',co.assessment),
   monitor:co.monitor?{...copyFields(co.monitor,['category','assessed','errorEWMA','request']),pending:ref('c2-pending',co.monitor.pending),...copyFields(co.monitor,['lastObservation']),lastAssessment:ref('c2-assessment',co.monitor.lastAssessment),lastDisposition:ref('c2-disposition',co.monitor.lastDisposition)}:co.monitor
  }:null;
  const row={type:'decision',schemaVersion:2,definitions,tick:record.tick,receiptTick:record.tick,sensorTick:record.sensorTick??record.sensorTruth.tick,decisionIndex:record.decisionIndex,simulatorReceiptTime:record.receiptTime,interfaceReceiptTime:record.tick/120,sensorTime:record.sensorTime,
   ...copyFields(record,['commitTime','commitTimeOrigin']),inputs:record.inputs,preMotorCommand:record.preMotorCommand,committedCommand:record.committedCommand,
   perceptHashes:record.perceptHashes??record.sensorTruth.perceptHashes,visibility:record.sensorVisibility??record.sensorTruth.visibility,
   motor:copyFields(record.invariants,['sample','sigma']),faithfulness:copyFields(record.invariants,['checks','mismatches','legacyUnavailableChecks','checkOrigin']),actualReportSha256:record.report===null?null:sha256(record.report),comparedFieldsSha256:sha256(faithfulnessProjection(record)),
   mismatchWitnesses:record.invariants.mismatches?.length?{report:record.report,diagnostic:record.diagnostic,preMotorCommand:record.preMotorCommand,inputs:record.inputs,committedCommand:record.committedCommand,...copyFields(record,['commitTime'])}:null,
   native,coordination,nativePendingRef:pendingRef,planner:c?null:record.diagnostic,focalInterfaceMs:record.focalInterfaceMs,
   ...copyFields(record,['sourceInvariantMismatches'])};
  rows.push(row);return rows;
 }};
}

export function faithfulnessProjection(record){
 const d=record.diagnostic,c=d?.cognition,co=c?.coordination;
 return {commands:{preMotor:record.preMotorCommand,actual:record.inputs,committed:record.committedCommand,commitTimePresent:Object.hasOwn(record,'commitTime'),...copyFields(record,['commitTime'])},clocks:{receiptTick:record.tick,receiptTime:record.receiptTime,sensorTick:record.sensorTick??record.sensorTruth?.tick,sensorTime:record.sensorTime},native:c?{focus:d.focus,novelty:c.novelty,completion:{status:c.planStatus,bounds:c.branches.map(b=>({tactic:b.tactic,completion:b.completion??null}))},...copyFields(co?.deliveries,['report']),prediction:copyFields(co?.monitor,['category','assessed','errorEWMA','pending','lastAssessment','lastDisposition']),preMotor:d.input}:null};
}
