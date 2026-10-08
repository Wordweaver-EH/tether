import {createHash} from 'node:crypto';import {sha256,serialize} from './raw-stream.mjs';
export const PROOF_FIELDS={reportDigests:'actualReportSha256',comparedFieldDigests:'comparedFieldsSha256',perceptDigests:'perceptHashes'};
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
export function proofSeed(name,task){return serialize(['tether-proof-sequence-v1',name,task.id,task.seat])+'\n';}
export function proofEntry(record,value){return serialize(['entry',record.decisionIndex,record.receiptTick,record.sensorTick,true,value])+'\n';}
export function createProofReducer(){
 let task=null,count=0,definitions=0,complete=false;const hashes={},contents=new Set();
 return {reduce(record){
  if(complete)throw new Error('record after task completion');
  if(record.type==='task-start'){if(task)throw new Error('duplicate task start');task=record.task;if(!task?.id||![0,1].includes(task.seat))throw new Error('invalid proof task');for(const name of Object.keys(PROOF_FIELDS))hashes[name]=createHash('sha256').update(proofSeed(name,task));return [{...record,proofRepresentation:'ordered-task-and-block-v1'}];}
  if(!task)throw new Error('missing task start');
  if(record.type==='decision'){
   if(record.decisionIndex!==count||record.receiptTick!==18+4*count||record.sensorTick!==record.receiptTick-18)throw new Error('invalid proof decision order/timing');
   for(const[name,key]of Object.entries(PROOF_FIELDS)){if(!Object.hasOwn(record,key))throw new Error(`missing proof source ${key}`);const v=record[key];if(key==='actualReportSha256'?(v!==null&&!hex(v)):key==='perceptHashes'?(!Array.isArray(v)||v.length!==2||v.some(x=>!hex(x))):!hex(v))throw new Error('invalid proof value');hashes[name].update(proofEntry(record,v));}
   const defs=record.definitions.map(d=>{if(d.id!==definitions++)throw new Error('dictionary index gap/duplicate');const key=serialize([d.kind,d.value]);if(sha256(key)!==d.contentHash||contents.has(key))throw new Error('dictionary identity mismatch/duplicate');contents.add(key);const {contentHash,...value}=d;return value;});
   const {actualReportSha256,comparedFieldsSha256,perceptHashes,...rest}=record;count++;return [{...rest,definitions:defs}];
  }
  if(record.type==='task-complete'){
   const expected=Math.max(0,Math.floor((Math.round(task.seconds*120)-19)/4)+1);
   if(record.result?.taskId!==task.id||record.result.resources.decisionCount!==count||count!==expected)throw new Error('incomplete proof decision sequence');
   complete=true;const sequences=Object.fromEntries(Object.entries(hashes).map(([name,h])=>[name,{count,sha256:h.digest('hex')}]));
   return [{type:'observer-proof-sequences',format:'tether-observer-proof-v1',taskId:task.id,seat:task.seat,decisions:count,dictionaryDefinitions:definitions,sequences},record];
  }
  if(record.type==='observer-proof-sequences')throw new Error('source must not inject proof records');
  return [record];
 },assertComplete(){if(!complete)throw new Error('missing mandatory final observer proof');}};
}
export function validateProofStructure(records){
 const start=records[0],last=records.at(-1),proof=records.at(-2);if(start?.type!=='task-start'||last?.type!=='task-complete'||proof?.type!=='observer-proof-sequences')throw new Error('task/proof completion framing');
 if(start.proofRepresentation!=='ordered-task-and-block-v1'||proof.format!=='tether-observer-proof-v1'||records.filter(r=>r.type==='task-start').length!==1||records.filter(r=>r.type==='task-complete').length!==1)throw new Error('duplicate task or unsupported proof format');
 const task=start.task,decisions=records.filter(r=>r.type==='decision');if(records.filter(r=>r.type==='observer-proof-sequences').length!==1||proof.taskId!==task.id||proof.seat!==task.seat||proof.decisions!==decisions.length||last.result.taskId!==task.id||last.result.resources.decisionCount!==decisions.length)throw new Error('proof identity/count mismatch');
 const expected=Math.max(0,Math.floor((Math.round(task.seconds*120)-19)/4)+1);if(decisions.length!==expected)throw new Error('incomplete decisions');let definitions=0;const unique=new Set();
 for(const[dIndex,d]of decisions.entries()){
  if(d.decisionIndex!==dIndex||d.receiptTick!==18+4*dIndex||d.sensorTick!==d.receiptTick-18)throw new Error('decision order/delay mismatch');
  for(const key of Object.values(PROOF_FIELDS))if(Object.hasOwn(d,key))throw new Error('redundant proof unexpectedly retained');
  for(const def of d.definitions){const key=serialize([def.kind,def.value]);if(def.id!==definitions++||Object.hasOwn(def,'contentHash')||unique.has(key))throw new Error('dictionary index/identity mismatch');unique.add(key);}
  const co=d.coordination;if(co){const refs=[co.packet,...Object.values(co.deliveries??{}),co.forecastIssue,co.assessment,...['pending','lastAssessment','lastDisposition'].map(k=>co.monitor?.[k])];for(const id of refs)if(id!==null&&id!==undefined&&(!Number.isInteger(id)||id<0||id>=definitions))throw new Error('forward/missing dictionary reference');}
 }
 if(proof.dictionaryDefinitions!==definitions||Object.keys(proof.sequences).sort().join()!==Object.keys(PROOF_FIELDS).sort().join())throw new Error('proof definition/sequence set mismatch');for(const name of Object.keys(PROOF_FIELDS))if(proof.sequences[name].count!==decisions.length||!hex(proof.sequences[name].sha256))throw new Error('invalid commitment count/hash');return proof;
}
