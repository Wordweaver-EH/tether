// Domain-independent, training-only motion fitting and bounded online checking.
// This is a learned predictor, not a learned action policy or general cognition.
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const copy = x => structuredClone(x);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const CHECKING_PRIORS = Object.freeze({dueSec:.3,expirySec:1,quantile:.9,
  residualFloor:.05,cooldownSec:1,checkWindowSec:.4,maxPulsesPerAbsence:2,
  missingFloorSec:.5,missingCeilingSec:3,minFitSamples:20,minCalibrationSamples:20});
export function empiricalQuantile(xs,q) {
  if(!xs.length||xs.some(x=>!Number.isFinite(x)||x<0)||!(q>0&&q<=1))throw Error('invalid quantile samples');
  return [...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.ceil((xs.length+1)*q)-1)];
}
export function predictMotion(model,forecast,time) {
  const h=time-forecast.time;
  return {x:forecast.position.x+model.velocityGain*forecast.velocity.x*h,
    y:forecast.position.y+model.velocityGain*forecast.velocity.y*h};
}
// Fit and calibration sequences must be disjoint before this function is called.
// Samples carry only observed displacement and velocity, never hidden truth.
export function fitMotionModel(fit,calibration,missingDurations) {
  const P=CHECKING_PRIORS;
  if(fit.length<P.minFitSamples||calibration.length<P.minCalibrationSamples)throw Error('insufficient training observations');
  for(const s of [...fit,...calibration])if(!point(s.position)||!point(s.velocity)||!point(s.observed)||!Number.isFinite(s.horizon)||s.horizon<P.dueSec-1e-8||s.horizon>P.expirySec+1e-8)throw Error('invalid training sample');
  let numerator=0,denominator=0;
  for(const s of fit)for(const a of ['x','y']){const x=s.velocity[a]*s.horizon;numerator+=x*(s.observed[a]-s.position[a]);denominator+=x*x;}
  // Nonnegative shrinkage bounded by a declared physical extrapolation prior.
  const velocityGain=denominator?Math.max(0,Math.min(1.5,numerator/denominator)):0;
  const model={version:1,velocityGain};
  const residuals=calibration.map(s=>distance(predictMotion(model,{...s,time:0},s.horizon),s.observed)/s.horizon);
  return Object.freeze({...model,residualRateThreshold:Math.max(P.residualFloor,empiricalQuantile(residuals,P.quantile)),
    missingAfterSec:Math.max(P.missingFloorSec,Math.min(P.missingCeilingSec,missingDurations.length?empiricalQuantile(missingDurations,P.quantile):P.missingCeilingSec)),
    fitSamples:fit.length,calibrationSamples:calibration.length,missingSamples:missingDurations.length,
    calibrationCoverage:residuals.filter(x=>x<=Math.max(P.residualFloor,empiricalQuantile(residuals,P.quantile))).length/residuals.length,
    priors:copy(P)});
}
export function createCalibratedChecker(model) {
  if(model?.version!==1||!Number.isFinite(model.velocityGain)||model.velocityGain<0||model.velocityGain>1.5||!Number.isFinite(model.residualRateThreshold)||model.residualRateThreshold<=0||!Number.isFinite(model.missingAfterSec)||model.missingAfterSec<=0)throw Error('invalid frozen model');
  const frozen=copy(model),P=CHECKING_PRIORS;
  let pending=null,lastObservation=null,lastTime=-1,lastPulse=-Infinity,absencePulses=0,episode=0,last=null;
  let checkingUntil=-Infinity,unresolved=false;
  return Object.freeze({
    update({time,observation=null,knownReset=false}) {
      if(!Number.isFinite(time)||time<0||time<=lastTime)throw Error('non-increasing sensor time');lastTime=time;
      if(observation&&(!point(observation.position)||!point(observation.velocity)||observation.time!==time))throw Error('invalid observation');
      let assessment=null,censored=null,reason=null;
      if(knownReset){censored=pending?'known-reset':null;pending=null;lastObservation=null;absencePulses=0;unresolved=false;checkingUntil=-Infinity;episode++;}
      if(pending&&time>pending.time+P.expirySec+1e-8){censored='expired-no-evidence';pending=null;}
      if(pending&&observation&&time>=pending.time+P.dueSec-1e-8){
        const predicted=predictMotion(frozen,pending,time),error=distance(predicted,observation.position);
        assessment={issuedAt:pending.time,assessmentTime:time,horizon:time-pending.time,predicted,observed:copy(observation.position),error,errorRate:error/(time-pending.time),large:error/(time-pending.time)>frozen.residualRateThreshold};
        pending=null;unresolved=assessment.large;
        if(assessment.large)reason='fresh-calibrated-error';else checkingUntil=-Infinity;
      }
      if(observation){lastObservation=copy(observation);absencePulses=0;if(!pending)pending=copy(observation);}
      const stale=lastObservation?time-lastObservation.time:null;
      if(!observation&&stale!==null&&stale>=frozen.missingAfterSec&&absencePulses<P.maxPulsesPerAbsence)reason='overdue-observation';
      const pulse=!!reason&&time-lastPulse>=P.cooldownSec-1e-8;
      if(pulse){lastPulse=time;checkingUntil=time+P.checkWindowSec;unresolved=true;if(!observation)absencePulses++;}
      last={time,episode,knownReset,censored,assessment,stalenessSec:stale,pulse,reason:pulse?reason:null,
        category:unresolved?'unresolved':assessment&&!assessment.large?'low-error':lastObservation?'familiar':'unknown',
        checking:time<checkingUntil,absencePulses,
        target:lastObservation?predictMotion(frozen,lastObservation,time):null,
        pending:copy(pending)};
      return copy(last);
    },state:()=>copy(last),model:()=>copy(frozen)
  });
}
