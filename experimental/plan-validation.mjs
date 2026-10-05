import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {sha256,parse} from './raw-stream.mjs';import {createResolvedWorld} from './world.mjs';
const expectedMind=[['mind-full',{}],['mind-no-novelty',{ablations:{noNoveltyHandoff:true}}],['mind-fixed-metacog',{ablations:{noMetacog:true},coordinationControls:{monitorControl:false},fixedTeacherSchedule:{every:1,phase:0}}],['mind-learning-frozen',{freezeLearning:true}],['mind-broadcast-cut',{coordinationControls:{deliver:{attention:false,planner:false,memory:false}}}]];
export async function validatePlan(lock){
 const load=async p=>parse(await readFile(p,'utf8')),design=await load(resolve(lock.prereg,'DESIGN.json'));
 if(design.qualifiedBaselineCommit!=='36398123d89881576443145b0b7826c8cf2203c9')throw new Error('qualified frozen baseline required');
 const manifestBytes=await readFile(resolve(lock.freeze,'PARAMETER-SNAPSHOT-MANIFEST.json'));
 if(sha256(manifestBytes)!==design.parameterSnapshotManifestSha256)throw new Error('parameter manifest hash mismatch');
 const manifest=parse(manifestBytes);for(const file of manifest.files)if(sha256(await readFile(resolve(lock.freeze,file.path)))!==file.sha256)throw new Error(`frozen artifact mismatch: ${file.path}`);
 const training=await load(resolve(lock.freeze,'TRAINING-RESULT.json')),trainingLock=await load(resolve(lock.freeze,'LOCK-COPY.json'));
 if(trainingLock.sourceFingerprint!==design.sourceFingerprint)throw new Error('frozen source identity mismatch');
 for(const file of trainingLock.files.filter(f=>f.key.startsWith('repo/')))if(sha256(await readFile(resolve(lock.repo,file.key.slice(5))))!==file.sha256)throw new Error(`frozen controller/engine source changed: ${file.key}`);
 const conditions=['default','arena-mirror-x','arena-new-obstacles','arena-new-obstacles-2','spear-minus25','spear-plus25','turn-minus25','turn-plus25','fov-minus20','fov-plus20','searched-style-1'];if(JSON.stringify(Object.keys(design.configHashes).sort())!==JSON.stringify(conditions.sort()))throw new Error('exact reviewed condition family required');
 if(design.arms.length!==8||new Set(design.arms.map(a=>a.id)).size!==8)throw new Error('exactly eight arms required');
 for(const [id,options] of expectedMind){const arm=design.arms.find(a=>a.id===id);if(arm?.kind!=='mind'||JSON.stringify(arm.mindOptions)!==JSON.stringify(options))throw new Error(`unapproved mechanism options: ${id}`);}
 for(const selected of training.selected){const arm=design.arms.find(a=>a.id===selected.arm);if(!arm||JSON.stringify(arm.vector)!==JSON.stringify(selected.vector)||arm.level!==selected.level||arm.kind!==(selected.arm==='conventional'?'param':'robust'))throw new Error('selected frozen baseline changed');}
 for(const [id,hash] of Object.entries(design.configHashes)){const bytes=await readFile(resolve(lock.prereg,'configs',id+'.json'));if(sha256(bytes)!==hash)throw new Error('design config hash mismatch');const config=parse(bytes);if(config.id!==id||config.mode!=='MODE_B'||config.qualifiedBaselineCommit!==design.qualifiedBaselineCommit)throw new Error('config identity mismatch');createResolvedWorld(config);}
 return design;
}
export async function validateTasks(lock,design,tasks,phase){
 validateTaskGrid(design,tasks,phase);
 const expected=phase==='pilot'?design.pilot:design.evaluation;
 if(!Array.isArray(tasks)||tasks.length!==expected.taskCount||new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error('task count/identity mismatch');
 const manifest=parse(await readFile(resolve(lock.freeze,'PARAMETER-SNAPSHOT-MANIFEST.json'))),pairs=new Map();
 const conditions=phase==='pilot'?design.pilot.conditions:Object.keys(design.configHashes);
 for(const t of tasks){
  if(!/^[a-zA-Z0-9_-]+$/.test(t.id)||t.phase!==phase||t.mode!=='MODE_B'||t.seconds!==expected.secondsPerBout||![0,1].includes(t.seat)||![0,1].includes(t.bout)||!conditions.includes(t.condition)||!design.arms.some(a=>a.id===t.arm))throw new Error('task outside reviewed scope');
  if(t.configSha256!==design.configHashes[t.condition])throw new Error('task/config identity mismatch');
  for(const key of ['controllerSeed','opponentSeed','episodeSeed'])if(!Number.isSafeInteger(t[key])||t[key]<1||t[key]>0xffffffff)throw new Error('invalid task seed');
  if(!Number.isInteger(t.snapshotIndex)||t.snapshotIndex<0||t.snapshotIndex>11)throw new Error('invalid snapshot index');
  const path=`snapshots/mind-${t.snapshotIndex}.json`,file=manifest.files.find(f=>f.path===path);
  if(design.arms.find(a=>a.id===t.arm).kind==='mind'&&(!file||file.sha256!==t.snapshotSha256||t.initialMemory!==(t.bout===0?path:'previous-bout-same-phase-cluster-condition-arm-seat')))throw new Error('task snapshot reference mismatch');
  if(!design.roster.includes(t.controlOpponent)||t.opponent!==(t.condition.startsWith('searched-style-')?t.condition:t.controlOpponent))throw new Error('task opponent mismatch');
  const key=JSON.stringify([t.cluster,t.seat,t.bout]),seeds=JSON.stringify([t.controllerSeed,t.opponentSeed,t.episodeSeed,t.snapshotIndex]);if(pairs.has(key)&&pairs.get(key)!==seeds)throw new Error('paired task seeds mismatch');pairs.set(key,seeds);
 }
 if(phase==='evaluation'){
  if(!lock.opponentFreeze)throw new Error('missing independently reviewed searched opponent freeze');
  const frozen=parse(await readFile(lock.opponentFreeze));if(frozen.status!=='REVIEWED_FROZEN'||frozen.qualifiedBaselineCommit!==design.qualifiedBaselineCommit||frozen.styles?.length!==1)throw new Error('opponent freeze not reviewed/qualified');
  for(const t of tasks.filter(t=>t.condition.startsWith('searched-style-'))){const style=frozen.styles.find(s=>s.id===t.opponent);if(!style||style.vector?.length!==21||style.vector.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('invalid searched opponent vector');}
 }
}

export function validateTaskGrid(design,tasks,phase){
 const clusters=phase==='pilot'?[['dev-a',0],['dev-b',5],['dev-c',10]]:Array.from({length:12},(_,i)=>[i,i]);
 const conditions=phase==='pilot'?['default','arena-mirror-x']:Object.keys(design.configHashes),expected=new Set();
 for(const [cluster] of clusters)for(const condition of conditions)for(const arm of design.arms)for(const seat of [0,1])for(const bout of [0,1])expected.add(JSON.stringify([cluster,condition,arm.id,seat,bout]));
 for(const t of tasks){
  const cluster=clusters.find(([id])=>id===t.cluster);if(!cluster||t.snapshotIndex!==cluster[1]||t.controlOpponent!==design.roster[t.snapshotIndex%4])throw new Error('cluster/snapshot/roster mapping mismatch');
  const key=JSON.stringify([t.cluster,t.condition,t.arm,t.seat,t.bout]);if(!expected.delete(key))throw new Error('duplicate or unexpected task cell');
 }
 if(expected.size)throw new Error('missing factorial task cells');
}
