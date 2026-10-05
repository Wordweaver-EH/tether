import {readFileSync,writeFileSync} from 'node:fs';
import {runTask} from './task.mjs';import {serialize} from './raw-stream.mjs';import {createBlockRawStream} from './block-stream.mjs';import {createProofReducer} from './proof-representation.mjs';
if(!process.send)throw new Error('worker requires guarded parent IPC');
process.once('message',payload=>{
 let stream;try{
  const physical=createBlockRawStream(payload.rawPath,{maxBytes:payload.limits.maxRawBytesPerTask}),proof=createProofReducer();stream={append(record){for(const row of proof.reduce(record))physical.append(row);},finish(){proof.assertComplete();return physical.finish();},abort(){return physical.abort();}};const {result,memorySnapshot}=runTask(payload,stream);const raw=stream.finish();result.resources.processLifetimeCpu=process.cpuUsage();
  writeFileSync(payload.resultPath,serialize({...result,raw})+'\n',{flag:'wx',mode:0o444});
  if(memorySnapshot)writeFileSync(payload.memoryPath,serialize(memorySnapshot)+'\n',{flag:'wx',mode:0o444});
  process.send({ok:true,terminalResourceUsage:process.resourceUsage(),result:{...result,raw},memoryPath:memorySnapshot?payload.memoryPath:null},()=>process.exit(0));
 }catch(error){const partialRaw=stream?.abort();process.send({ok:false,error:error.stack,partialRaw},()=>process.exit(1));}
});
