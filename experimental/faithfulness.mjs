import {motorTransform,noiseSample} from '../benchmark/interface.mjs';import {serialize} from './raw-stream.mjs';
export function createFaithfulnessObserver({episode,seat}){
 let previousAngle=0,currentChecks=[];const counts={},mismatches=[];
 const nativeChecks=['workspace-focus','delivered-content','evidence-age-text','native-novelty','native-prediction','native-completion','pre-motor-report-command','pre-motor-diagnostic-command'];
 const mark=(name,key)=>{const row=counts[name]??={checked:0,mismatched:0,notApplicable:0,skippedMissingReport:0};row[key]++;currentChecks.push({name,status:key});};
 const check=(name,actual,expected,witness)=>{const row=counts[name]??={checked:0,mismatched:0,notApplicable:0,skippedMissingReport:0};row.checked++;const mismatch=serialize(actual)!==serialize(expected);currentChecks.push({name,status:mismatch?'mismatch':'pass'});if(mismatch){row.mismatched++;mismatches.push({name,actual,expected,...witness});}};
 return {observe({decision,diagnostic,report,proposed,actuator,committed,commitTime,receiptTime,receiptTick,sensorTick}){
  currentChecks=[];const before=mismatches.length,witness={decision,receiptTime};const transformed=motorTransform(proposed,previousAngle,noiseSample(episode,seat,decision));previousAngle=transformed.previousAngle;
  check('actual-motor-transform',actuator,transformed.command,witness);check('actual-command-commit',committed,actuator,witness);const expectedInterfaceTime=receiptTick/120;
  check('commit-timestamp',commitTime,expectedInterfaceTime,{...witness,receiptTick,simulatorClock:receiptTime,clockDifference:commitTime-receiptTime});
  check('exact-sensor-delay-ticks',receiptTick-sensorTick,18,witness);
  check('receipt-clock-roundoff-only',Math.abs(receiptTime-expectedInterfaceTime)<=4*Number.EPSILON*Math.max(1,Math.abs(expectedInterfaceTime)),true,{...witness,receiptTick,expectedInterfaceTime});
  if(diagnostic){
   check('actual-report-present',!!report,true,witness);
   if(report){const c=diagnostic.cognition,co=c.coordination,m=co.monitor,packet=co.deliveries?.report??null;
    check('workspace-focus',report.focus,diagnostic.focus,witness);check('delivered-content',report.content,packet,witness);
    if(!packet)mark('evidence-age-text','notApplicable');
    if(packet)check('evidence-age-text',report.reason,`${packet.entity}: ${packet.source} hypothesis; evidence age ${(diagnostic.time-packet.originalEvidenceTime).toFixed(3)}s`,witness);
    check('native-novelty',report.novelty,c.novelty,witness);
    check('native-prediction',report.prediction,{category:m.category,assessed:m.assessed,errorEWMA:m.errorEWMA,pending:m.pending,lastAssessment:m.lastAssessment,lastDisposition:m.lastDisposition},witness);
    check('native-completion',report.completion,{status:c.planStatus,bounds:c.branches.map(b=>({tactic:b.tactic,completion:b.completion??null}))},witness);
    check('pre-motor-report-command',report.emittedInput,proposed,witness);check('pre-motor-diagnostic-command',diagnostic.input,proposed,witness);
   }else for(const name of nativeChecks)mark(name,'skippedMissingReport');
  }else for(const name of ['actual-report-present',...nativeChecks])mark(name,'notApplicable');
  return {checks:currentChecks,sample:transformed.sample,sigma:transformed.sigma,mismatches:mismatches.slice(before)};
 },summary:()=>structuredClone({counts,mismatches})};
}
