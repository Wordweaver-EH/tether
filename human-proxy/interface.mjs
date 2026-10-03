import {sensorPacket,motorTransform,noiseSample,INTERFACE} from '../benchmark/interface.mjs';
const empty=()=>({moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:false});
// Owns all latency, cadence and motor noise. Counter has no internal queue.
export function createHumanInterface(controller,{episode,seat,diagnostics=false}={}){
 if(!Number.isSafeInteger(episode)||!['P1','P2'].includes(seat))throw new TypeError('episode and seat required');
 let tick=0,decision=0,previousAngle=0,held=empty();const queue=[],records=[];
 return {act(view,dt){
  if(dt!==1/120||Math.abs(view.time.elapsedSec-tick/120)>1e-7||view.viewerId!==seat)throw new Error('consecutive 120Hz frames required');
  queue.push(sensorPacket(view));let result={...held,throw:false,recall:false};
  if(tick>=30){const delayed=queue.shift();if((tick-30)%4===0){
   const proposed=controller.act(delayed,1/30);const tx=motorTransform(proposed,previousAngle,noiseSample(episode,seat,decision));
   controller.commitCommand?.(tx.command,delayed,tick/120);previousAngle=tx.previousAngle;result=tx.command;held={...result,throw:false,recall:false};
   if(diagnostics)records.push({decision,receiptTime:tick/120,sensorTime:delayed.time.elapsedSec,sample:tx.sample,sigma:tx.sigma,command:structuredClone(result),diagnostic:controller.diagnostics?.()??null});decision++;
  }} tick++;return result;
 },records:()=>structuredClone(records),metadata:()=>({...INTERFACE,latencySec:.25,latencyTicks:30,episode,seat}),controller};
}
