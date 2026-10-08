import {createHash} from 'node:crypto';
export const ID='tether-default-training-v1';
export const ROSTER=['directShooter','immediateRecaller','embedWaiter','spearRusher'];
export const ARMS=['conventional','conventional-useful-2x','conventional-useful-4x'];
export const PLAN=Object.freeze({id:ID,mode:'MODE_B',simHz:120,decisionHz:30,latencySec:.15,
  generations:8,candidatesPerGeneration:16,mutationSigma:.16,finalists:8,selectionSeeds:4,
  screeningSeconds:45,selectionSeconds:300,mindSeconds:300,mindClusters:12,mindBoutsPerCluster:32,
  workersMaximum:8,roster:ROSTER,arms:ARMS});
export function seed(...parts){return createHash('sha256').update(JSON.stringify([ID,...parts])).digest().readUInt32BE(0)||1;}
export function randomSource(value){let x=value>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
export function mutate(vector,s){const r=randomSource(s);return vector.map(v=>Math.max(0,Math.min(1,v+.16*(r()+r()+r()+r()-2))));}
export function compareVectors(a,b){for(let k=0;k<a.length;k++){if(a[k]!==b[k])return a[k]-b[k];}return 0;}
export function rankCandidates(a,b){return b.score-a.score||compareVectors(a.vector,b.vector)||a.id.localeCompare(b.id);}
export function candidatesForGeneration(arm,generation,initial,previous=[]){
  if(!ARMS.includes(arm)||!Number.isInteger(generation)||generation<0||generation>=8)throw new Error('invalid arm/generation');
  if(initial.length!==5||initial.some(x=>x.vector.length!==21||x.vector.some(v=>!Number.isFinite(v)||v<0||v>1)))throw new Error('five valid initial vectors required');
  const parents=generation? [...previous].sort(rankCandidates).slice(0,4):initial;
  if(generation&&parents.length!==4)throw new Error('previous generation top four required');
  return Array.from({length:16},(_,slot)=>{const inherited=generation===0&&slot<5;
    const parent=parents[(generation?slot:inherited?slot:slot-5)%parents.length];
    return {id:`${arm}-g${generation}-c${slot}`,arm,generation,slot,parent:parent.id??parent.name,
      mutationSeed:inherited?null:seed('mutation',arm,generation,slot),
      vector:inherited?[...parent.vector]:mutate(parent.vector,seed('mutation',arm,generation,slot))};});
}
export function candidateTasks(candidate,phase='screen'){
  if(!['screen','selection'].includes(phase))throw new Error('invalid phase');
  const values=phase==='screen'?[candidate.generation]:[0,1,2,3];
  return values.flatMap(k=>ROSTER.flatMap((opponent,oi)=>[0,1].map(seat=>({
    id:`${phase}-${candidate.id}-k${k}-o${oi}-s${seat}`,phase,kind:'candidate',candidateId:candidate.id,
    arm:candidate.arm,vector:candidate.vector,opponent,seat,mode:'MODE_B',
    seconds:phase==='screen'?PLAN.screeningSeconds:PLAN.selectionSeconds,
    controllerSeed:seed(phase,k,oi,seat,'controller'),worldSeed:seed(phase,k,oi,seat,'world'),
    episodeSeed:seed(phase,k,oi,seat,'motor'),opponentSeed:seed(phase,k,oi,seat,'opponent')}))));
}
export function mindTasks(cluster){
  if(!Number.isInteger(cluster)||cluster<0||cluster>=12)throw new Error('cluster');
  return Array.from({length:32},(_,index)=>{const repetition=Math.floor(index/8),within=index%8;
    const opponentIndex=(Math.floor(within/2)+cluster+repetition)%4,seat=(within+cluster+repetition)%2;
    return{id:`mind-c${cluster}-b${index}`,phase:'mind-training',kind:'mind',cluster,index,
      opponent:ROSTER[opponentIndex],seat,mode:'MODE_B',seconds:300,
      controllerSeed:seed('mind',cluster,index,'controller'),worldSeed:seed('mind',cluster,index,'world'),
      episodeSeed:seed('mind',cluster,index,'motor'),opponentSeed:seed('mind',cluster,index,'opponent')};});
}
export function seedManifest(){return{plan:PLAN,mutationSeeds:ARMS.flatMap(arm=>Array.from({length:8},(_,g)=>Array.from({length:16},(_,slot)=>({arm,generation:g,slot,seed:seed('mutation',arm,g,slot)}))).flat()),
  screenSeeds:Array.from({length:8},(_,generation)=>candidateTasks({id:'seed-template',arm:'shared',vector:[],generation})),
  selectionSeeds:candidateTasks({id:'seed-template',arm:'shared',vector:[],generation:0},'selection'),mind: Array.from({length:12},(_,i)=>mindTasks(i))};}
