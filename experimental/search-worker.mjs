import {writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {runTask} from './task.mjs';import {serialize,sha256} from './raw-stream.mjs';import {createBlockRawStream} from './block-stream.mjs';import {createProofReducer} from './proof-representation.mjs';
export function createSearchStream(path,maxBytes){const physical=createBlockRawStream(path,{maxBytes}),proof=createProofReducer();return {append(record){for(const row of proof.reduce(record))physical.append(row);},finish(){proof.assertComplete();return physical.finish();},abort(){return physical.abort();}};}
// Import is inert. Only the guarded parent's dedicated IPC process listens.
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.send)throw Error('search worker requires guarded parent IPC');
 process.once('message',payload=>{let stream;try{
  const t=payload.task,c=payload.provenance.candidate;if(t.phase!=='opponent-search'||t.condition!=='default'||t.seconds!==300||t.candidateSeat!==1-t.seat||!['mind-full','conventional'].includes(t.target)||c.parameterSha256!==sha256(payload.opponentSpec.vector)||t.parameterSha256!==c.parameterSha256)throw Error('search payload mismatch');
  stream=createSearchStream(payload.rawPath,payload.limits.maxRawBytesPerTask);const {result}=runTask(payload,stream);result.candidateSeat=t.candidateSeat;result.candidateIntegerNet=result.score[t.candidateSeat]-result.score[1-t.candidateSeat];if(!Number.isSafeInteger(result.candidateIntegerNet))throw Error('noninteger candidate net');const raw=stream.finish();
  writeFileSync(payload.resultPath,serialize({...result,raw})+'\n',{flag:'wx',mode:0o444});
  // No learned target memory is persisted or returned to another task.
  process.send({ok:true,terminalResourceUsage:process.resourceUsage(),result:{...result,raw}},()=>process.exit(0));
 }catch(error){const partialRaw=stream?.abort();process.send({ok:false,error:error.stack,partialRaw},()=>process.exit(1));}});
}
