// Preflight I/O only. No bout runner, training, selection, or held-out evaluation.
import {createHash} from 'node:crypto';
import {createMind} from '../src/mind/index.mjs';
import {createRobustBaselineAgent} from '../src/agents/robust-baseline-agent.mjs';
import {createParamAgent} from '../src/agents/param.mjs';
export const INTERFACE = Object.freeze({version:1, simulationHz:120, decisionHz:30,
  latencySec:0.15, latencyTicks:18, decisionTicks:4, baseAimNoise:0.034,
  speedAimNoise:0.0075, maxAimSigma:0.18, outboundSpeed:12, returnSpeed:12});
const empty = () => ({moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:false});
const copy = value => structuredClone(value);
// Stateless counter-addressed samples: no policy branch can consume another sample.
export function noiseSample(episode, seat, decision) {
  if (!Number.isSafeInteger(decision) || decision < 0) throw new RangeError('decision index');
  const bytes = createHash('sha256').update(JSON.stringify(['tether-motor-v1',episode,seat,decision])).digest();
  const u = (bytes.readUInt32BE(0)+0.5)/0x100000000;
  const v = (bytes.readUInt32BE(4)+0.5)/0x100000000;
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
export function motorTransform(command, previousAngle, sample) {
  const result = {...empty(), ...command};
  if (!Math.hypot(result.aimX,result.aimY)) return {command:result,previousAngle,sigma:0,sample};
  const angle = Math.atan2(result.aimY,result.aimX);
  const delta = Math.atan2(Math.sin(angle-previousAngle),Math.cos(angle-previousAngle));
  const sigma = Math.min(INTERFACE.maxAimSigma,INTERFACE.baseAimNoise+INTERFACE.speedAimNoise*Math.abs(delta)*INTERFACE.decisionHz);
  result.aimX = Math.cos(angle+sample*sigma); result.aimY = Math.sin(angle+sample*sigma);
  return {command:result,previousAngle:angle,sigma,sample};
}
// Only the perception.js data contract crosses this boundary; logger truth is not an argument.
export function sensorPacket(view) {
  const vector = v => v === null ? null : ({x:v.x,y:v.y});
  const body = v => v === null ? null : ({position:vector(v.position),facing:vector(v.facing),velocity:vector(v.velocity)});
  const bounds = v => ({minX:v.minX,maxX:v.maxX,minY:v.minY,maxY:v.maxY});
  const spear = v => v === null ? null : Object.fromEntries(Object.entries(v).filter(([key])=>[
    'state','position','direction','embedSurfaceId','recallTarget'].includes(key)).map(([k,v])=>[k,['position','direction','recallTarget'].includes(k)?vector(v):v]));
  return {viewerId:view.viewerId,mode:view.mode,own:{...body(view.own),spear:spear(view.own.spear)},
    scores:{P1:view.scores.P1,P2:view.scores.P2},time:{elapsedSec:view.time.elapsedSec,remainingSec:view.time.remainingSec,ended:view.time.ended},
    arena:{bounds:bounds(view.arena.bounds),obstacles:view.arena.obstacles.map(v=>({id:v.id,...bounds(v)}))},
    opponent:body(view.opponent),opponentSpear:spear(view.opponentSpear),
    cone:{halfAngleRad:view.cone.halfAngleRad,totalAngleRad:view.cone.totalAngleRad,origin:vector(view.cone.origin),facing:vector(view.cone.facing),occlusion:view.cone.occlusion,maxDistance:view.cone.maxDistance}};
}
export function createInterface(controller, {episode,seat,diagnostics=false,calibration=false} = {}) {
  if (!['P1','P2'].includes(seat) || !Number.isSafeInteger(episode)) throw new TypeError('episode integer and seat required');
  let tick=0, decision=0, previousAngle=0, held=empty();
  if (![false,true,'native','shadow'].includes(calibration)) throw new Error('calibration must be native or shadow');
  const queue=[], records=[], logger=calibration==='shadow'?createCalibrationLogger():calibration?createNativeCalibrationLogger():null;
  if (calibration && !controller.lastDecision) throw new Error('calibration requires pre-action mind diagnostics');
  return {
    act(view,dt) {
      if (dt !== 1/120 || Math.abs(view.time.elapsedSec-tick/120)>1e-7 || view.viewerId!==seat) throw new Error('interface requires consecutive 120 Hz episode frames from time zero');
      queue.push(sensorPacket(view));
      let result= {...held,throw:false,recall:false};
      if (tick>=18) {
        const delayed=queue.shift();
        if ((tick-18)%4===0) {
          if (calibration==='shadow') logger.observe(delayed);
          const command=controller.act(delayed,1/30);
          if (logger) {
            const diagnostic=controller.lastDecision();
            if (!diagnostic || diagnostic.time!==delayed.time.elapsedSec) throw new Error('calibration requires captureDiagnostics:true');
            if (calibration==='shadow') logger.record(delayed,diagnostic,command,tick/120);
            else logger.capture(controller.cognition().pendingOutcome,diagnostic.cognition.outcome,tick/120);
          }
          const transformed=motorTransform(command,previousAngle,noiseSample(episode,seat,decision));
          controller.commitCommand?.(transformed.command,delayed,tick/120);
          previousAngle=transformed.previousAngle; result=transformed.command; held={...result,throw:false,recall:false};
          if(diagnostics) records.push({decision,receiptTime:tick/120,sensorTime:delayed.time.elapsedSec,
            sample:transformed.sample,sigma:transformed.sigma,command:copy(result),decisionDiagnostic:controller.lastDecision?.()??null});
          decision++;
        }
      }
      tick++; return result;
    },
    records:()=>copy(records),
    calibrationRecords:()=>logger?.records()??[],
    finishCalibration:()=>logger?.finish()??[],
    metadata:()=>({...INTERFACE,episode,seat}),
  };
}
export function createBenchmarkController(kind, {vector,seed=1,mindOptions={},level=0}={}) {
  if (kind==='robust') return createRobustBaselineAgent([...vector],{seed,level,publicRules:{outboundSpeed:12,returnSpeed:12}});
  if (kind==='param') {
    const frozen=Object.freeze([...vector]);
    return createParamAgent(frozen,{seed,benchmarkInterface:true,deferCommand:true,outboundSpeed:12,returnSpeed:12});
  }
  if(kind==='mind') {
    // A restricted constructor preserves identical public physics and normal settings.
    const allowed=['ablations','captureTrace','captureDiagnostics','freezeLearning','coordinationEnabled','coordinationControls','fixedTeacherSchedule','memorySnapshot','cognitionBudget'];
    if(Object.keys(mindOptions).some(k=>!allowed.includes(k))) throw new Error('unsupported benchmark mind option');
    return createMind({...mindOptions,seed,difficulty:'normal',benchmarkInterface:true,deferCommand:true,outboundSpeed:12,returnSpeed:12});
  }
  throw new Error('unsupported controller');
}
// Descriptive sparse-score failure calibration, never a physical-hit probability.
// Call observe before record at each received decision percept, matching createLearning.
export function createCalibrationLogger() {
  let pending=null; const records=[];
  return {
    observe(view) {
      if(!pending)return null;
      const now=view.time.elapsedSec, other=view.viewerId==='P1'?'P2':'P1';
      const reward=Math.max(-1,Math.min(1,(view.scores[view.viewerId]-pending.ownScore)-(view.scores[other]-pending.otherScore)));
      if(!reward && now-pending.time<1.5)return null;
      const row={...pending,resolvedTime:now,reward,actualFailure:reward>0?0:1,censored:false};
      records.push(row);pending=null;return copy(row);
    },
    record(view,diagnostic,command,receiptTime) {
      if(pending || !(command.throw||command.recall))return;
      const c=diagnostic.cognition,other=view.viewerId==='P1'?'P2':'P1';
      pending={origin:'evaluator-derived-shadow',primaryCalibration:false,key:c.situation,tactic:c.tactic,tier:c.issuedLearningTier,time:view.time.elapsedSec,
        receiptTime,ownScore:view.scores[view.viewerId],otherScore:view.scores[other],predictedFailure:c.predictedFailure};
    },
    finish(){if(pending){records.push({...pending,censored:true});pending=null;}return copy(records);},
    records:()=>copy(records),
  };
}

// Native primary rows are exact immutable copies of recorded pending forecasts.
export function createNativeCalibrationLogger() {
  let pending=null; const records=[];
  const identity = p => p && JSON.stringify([p.key,p.tactic,p.time]);
  return {
    capture(nativePending,nativeOutcome,receiptTime) {
      if(nativeOutcome) {
        if(identity(pending)!==identity(nativeOutcome) || !pending) throw new Error('native calibration outcome without matched pre-action record');
        if(nativeOutcome.predictedFailure!==pending.predictedFailure) throw new Error('native forecast changed');
        records.push({...copy(nativeOutcome),receiptTime:pending.receiptTime,resolvedReceiptTime:receiptTime,origin:'native-pending',primaryCalibration:true,censored:false});
        pending=null;
      }
      if(nativePending && identity(nativePending)!==identity(pending)) {
        if(pending)throw new Error('native pending replaced without outcome');
        pending={...copy(nativePending),receiptTime,origin:'native-pending',primaryCalibration:true};
      }
    },
    finish(){if(pending){records.push({...pending,censored:true});pending=null;}return copy(records);},
    records:()=>copy(records),
  };
}
