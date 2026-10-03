import {createHash} from 'node:crypto';
import {fixtureWorld} from './calibration-workload.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const [repo,name,trialText]=process.argv.slice(2),trial=Number(trialText);
const {createWorld}=await import(pathToFileURL(resolve(repo,'src/sim.js')));
const {percept}=await import(pathToFileURL(resolve(repo,'src/perception.js')));
const {createBenchmarkController,createInterface}=await import(pathToFileURL(resolve(repo,'benchmark/interface.mjs')));
const {POLICY_SEEDS}=await import(pathToFileURL(resolve(repo,'src/agents/param.mjs')));
const fixtures=['central-held','obstacle-held','turning-visibility','embedded'];
if(!Number.isInteger(trial)||trial<0||trial>4||!['mind','param',...Array.from({length:6},(_,i)=>`robust-${i}`)].includes(name))throw Error('invalid calibration arm/trial');

for(const fixture of fixtures){
 const kind=name.startsWith('robust-')?'robust':name,level=kind==='robust'?Number(name.split('-')[1]):0;
 const setupCPU=process.cpuUsage(),setupStart=process.hrtime.bigint();
 const controller=createBenchmarkController(kind,{seed:1729,vector:POLICY_SEEDS.direct,level,mindOptions:{memorySnapshot:null,cognitionBudget:192,captureTrace:false,captureDiagnostics:true}});
 const wrapped=createInterface(controller,{episode:77129,seat:'P1',diagnostics:false,calibration:false});
 const setupWallNs=Number(process.hrtime.bigint()-setupStart),setupCpu=process.cpuUsage(setupCPU);
 process.stdout.write(JSON.stringify({name,trial,fixture,phase:'setup',wallNs:setupWallNs,cpuUserUs:setupCpu.user,cpuSystemUs:setupCpu.system})+'\n');let decision=0;
 for(let tick=0;tick<=18+119*4;tick++){
  const view=percept(fixtureWorld(createWorld,fixture,tick),'P1','MODE_B'),isDecision=tick>=18&&(tick-18)%4===0;
  if(!isDecision){wrapped.act(view,1/120);continue;}
  const cpuStart=process.cpuUsage(),start=process.hrtime.bigint();const command=wrapped.act(view,1/120);const wallNs=Number(process.hrtime.bigint()-start),cpu=process.cpuUsage(cpuStart);
  const delivered=percept(fixtureWorld(createWorld,fixture,tick-18),'P1','MODE_B');
  const deliveredPerceptSHA256=createHash('sha256').update(JSON.stringify(delivered)).digest('hex');
  const d=kind==='mind'?controller.lastDecision():null;
  const cognition=d?{tier:d.cognition.tier,branches:d.cognition.branches.length,branchTrials:d.cognition.branches.reduce((a,b)=>a+(b.trials??0),0),branchSteps:d.cognition.branches.reduce((a,b)=>a+(b.steps??0),0),realDeliberation:d.cognition.branches.some(b=>(b.trials??0)>0||(b.steps??0)>0),completedBranches:d.cognition.completedBranches,nominalSpent:d.cognition.budget.spent,planStatus:d.cognition.planStatus,situation:d.cognition.situation}:null;
  process.stdout.write(JSON.stringify({name,trial,fixture,phase:decision<20?'warmup':'measured',decision,tick,sensorTime:(tick-18)/120,receiptTime:tick/120,receiptOwnSpearState:view.own.spear?.state??null,deliveredOwnSpearState:delivered.own.spear?.state??null,deliveredOpponentVisible:!!delivered.opponent,deliveredPerceptSHA256,command,wallNs,cpuUserUs:cpu.user,cpuSystemUs:cpu.system,cognition,work:kind==='robust'?controller.diagnostics():null})+'\n');decision++;
 }
}
