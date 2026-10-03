// Offline deterministic physics validation. Never imports or calls a controller.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {createResolvedWorld,step,percept,hashWorld,snapshotWorld} from '../repo/experimental/world.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BASE=resolve(HERE,'..');
export const serialize=value=>JSON.stringify(value,(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?{$tetherNumber:String(v)}:v);
export const sha256=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:serialize(value)).digest('hex');
export const parse=text=>JSON.parse(text,(_k,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&Object.hasOwn(v,'$tetherNumber')?({NaN:NaN,Infinity:Infinity,'-Infinity':-Infinity}[v.$tetherNumber]??v):v);
const equal=(actual,expected,label)=>{if(!isDeepStrictEqual(actual,expected))throw new Error(`${label}: actual ${serialize(actual).slice(0,1500)} expected ${serialize(expected).slice(0,1500)}`);};
// Exact pure projection copied from frozen benchmark/interface.mjs; importing that
// module would transitively load agents. The source range is verified by runner.
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
export function verifyRaw(bytes,receipt){
 equal(sha256(bytes),receipt.fileSha256,'physical SHA256');equal(bytes.length,receipt.bytes,'physical bytes');
 const text=gunzipSync(bytes).toString('utf8');equal(sha256(text),receipt.sha256,'logical SHA256');equal(Buffer.byteLength(text),receipt.uncompressedBytes,'logical bytes');
 if(!text.endsWith('\n'))throw new Error('raw missing terminal newline');
 let previous='0'.repeat(64),sequence=0;const records=[];
 for(const line of text.slice(0,-1).split('\n')){const row=JSON.parse(line);equal(row.sequence,sequence,'row sequence');equal(row.previous,previous,'row previous digest');equal(row.digest,sha256(`${previous}\n${sequence}\n${JSON.stringify(row.record)}`),'row chained digest');previous=row.digest;sequence++;records.push(parse(line).record);}
 equal(sequence,receipt.rows,'row count');equal(previous,receipt.chainTail,'chain tail');
 return {records,integrity:{physicalSha256:sha256(bytes),physicalBytes:bytes.length,logicalSha256:sha256(text),logicalBytes:Buffer.byteLength(text),rows:sequence,chainTail:previous}};
}
const visibility=views=>views.map(v=>({opponent:!!v.opponent,opponentSpear:!!v.opponentSpear,ownSpear:!!v.own.spear}));
const empty=()=>({moveX:0,moveY:0,aimX:0,aimY:0,throw:false,recall:false});
export function replayRecords(records,result,{onCheckpoint=()=>{}}={}){
 const starts=records.filter(r=>r.type==='task-start'),completes=records.filter(r=>r.type==='task-complete');equal(starts.length,1,'single start');equal(completes.length,1,'single completion');equal(records[0],starts[0],'start first');equal(records.at(-1),completes[0],'completion last');
 const start=starts[0],task=start.task;equal(task.id,result.taskId,'task id');equal(task.seconds,30,'saved task seconds');equal(task.mode,'MODE_B','saved mode');
 const world=createResolvedWorld(start.config);equal(hashWorld(world),start.initialHash,'initial world hash');equal({players:world.players,spears:world.spears},start.initialTruth,'initial truth');
 const decisions=records.filter(r=>r.type==='decision'),events=records.filter(r=>r.type==='event');let di=0,ei=0,held=[empty(),empty()];const queue=[],checkpointHashes=[];
 const checkpoint=()=>{const snapshot=snapshotWorld(world),entry={tick:world.tick,time:world.elapsedSec,worldHash:hashWorld(world),snapshotSha256:sha256(snapshot),snapshot};checkpointHashes.push({tick:entry.tick,time:entry.time,worldHash:entry.worldHash,snapshotSha256:entry.snapshotSha256});onCheckpoint(entry);};
 checkpoint();
 for(let tick=0;tick<3600;tick++){
  equal(world.tick,tick,`world tick ${tick}`);equal(world.ended,false,`not ended ${tick}`);
  const views=['P1','P2'].map(id=>percept(world,id,task.mode));
  queue.push(structuredClone({tick,perceptHashes:views.map(v=>sha256(sensorPacket(v))),players:world.players,spears:world.spears,visibility:visibility(views)}));if(queue.length>19)queue.shift();
  let inputs=held.map(v=>({...v,throw:false,recall:false}));
  if(tick>=18&&(tick-18)%4===0){
   const d=decisions[di];if(!d)throw new Error(`missing decision ${di}`);equal(d.tick,tick,`decision ${di} tick`);equal(d.decisionIndex,di,`decision index ${di}`);equal(d.receiptTime,world.elapsedSec,`receiptTime ${di}`);equal(d.sensorTime,(tick-18)/120,`sensorTime ${di}`);
   equal(d.truth,{players:world.players,spears:world.spears},`receipt truth ${di}`);equal(d.sensorTruth,queue[0],`delayed truth, both packet hashes and visibility ${di}`);equal(d.currentVisibility,visibility(views),`current visibility ${di}`);
   equal(d.inputs.length,2,`both input seats ${di}`);inputs=structuredClone(d.inputs);held=inputs.map(v=>({...v,throw:false,recall:false}));di++;
  }
  for(const event of step(world,inputs)){const actual={type:'event',tick:world.tick,time:world.elapsedSec,event};equal(actual,events[ei],`physics event ${ei}`);ei++;}
  if(world.tick%120===0)checkpoint();
 }
 equal(di,896,'decision count');equal(di,decisions.length,'all decisions consumed');equal(ei,events.length,'all saved events consumed');equal(result.resources.decisionCount,di,'summary decision count');
 const terminal={score:world.players.map(p=>p.score),elapsedSec:world.elapsedSec,finalHash:hashWorld(world)};
 for(const [k,v] of Object.entries(terminal)){equal(v,result[k],`result ${k}`);equal(v,completes[0].result[k],`completion ${k}`);}
 equal(result.taskId,completes[0].result.taskId,'completion taskId');equal(world.tick,3600,'terminal tick');
 return {taskId:task.id,status:'PASS',ticks:3600,decisionsChecked:di,delayedTruthChecked:di,perceptHashesChecked:di*2,receiptTruthChecked:di,currentVisibilityChecked:di,eventsChecked:ei,checkpointCount:checkpointHashes.length,checkpoints:checkpointHashes,terminal,controllerCalls:0,newGameplayDecisions:0};
}
export function verifySources(){
 const manifest=JSON.parse(readFileSync(join(BASE,'PILOT-SOURCE-MANIFEST.json'),'utf8'));
 const required=['src/sim.js','src/deterministic-math.js','experimental/world.mjs','experimental/perception.mjs','experimental/task.mjs','benchmark/interface.mjs'];
 const files=required.map(path=>{const expected=manifest.files.find(f=>f.path===path);if(!expected)throw new Error(`source manifest missing ${path}`);const actual=sha256(readFileSync(join(BASE,'repo',path)));equal(actual,expected.sha256,`frozen source ${path}`);return {path,sha256:actual};});
 const interfaceText=readFileSync(join(BASE,'repo/benchmark/interface.mjs'),'utf8'),projection=interfaceText.slice(interfaceText.indexOf('export function sensorPacket('),interfaceText.indexOf('export function createInterface('));
 const verifierText=readFileSync(fileURLToPath(import.meta.url),'utf8');if(!verifierText.includes(projection))throw new Error('sensorPacket projection differs from frozen original');return files;
}
async function main(){
 const begun=new Date().toISOString(),sources=verifySources();
 const manifest=JSON.parse(readFileSync(join(BASE,'PILOT-ATTEMPT001-FILE-MANIFEST.json'),'utf8')),pilot=join(BASE,'pilot-attempt-001'),out=join(HERE,'physics-replay');mkdirSync(out,{recursive:true});mkdirSync(join(out,'tasks'),{recursive:true});mkdirSync(join(out,'checkpoints'),{recursive:true});
 const resultFiles=readdirSync(join(pilot,'results')).filter(f=>f.endsWith('.json')).sort();equal(resultFiles.length,181,'completed task inventory');const receipts=[];
 for(const file of resultFiles){const taskId=file.slice(0,-5),t0=performance.now();try{
  const resultBytes=readFileSync(join(pilot,'results',file)),rawName=`${taskId}.jsonl.gz`,rawBytes=readFileSync(join(pilot,'raw',rawName));
  for(const [path,bytes] of [[`results/${file}`,resultBytes],[`raw/${rawName}`,rawBytes]]){const entry=manifest.files.find(f=>f.path===path);if(!entry)throw new Error(`preserved manifest missing ${path}`);equal(bytes.length,entry.bytes,`${path} preserved size`);equal(sha256(bytes),entry.sha256,`${path} preserved SHA256`);}
  const result=parse(resultBytes.toString()),{records,integrity}=verifyRaw(rawBytes,result.raw),checkpoints=[];
  const receipt={...replayRecords(records,result,{onCheckpoint:c=>checkpoints.push(c)}),integrity,sourceFiles:sources,resultSha256:sha256(resultBytes),runtimeMs:performance.now()-t0};
  const cpText=checkpoints.map(serialize).join('\n')+'\n';writeFileSync(join(out,'checkpoints',`${taskId}.jsonl`),cpText);receipt.checkpointFile={path:`checkpoints/${taskId}.jsonl`,bytes:Buffer.byteLength(cpText),sha256:sha256(cpText)};
  writeFileSync(join(out,'tasks',file),JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);console.log(`${receipts.length}/181 PASS ${taskId} events=${receipt.eventsChecked}`);
 }catch(e){const receipt={taskId,status:'FAIL',error:e.stack};receipts.push(receipt);writeFileSync(join(out,'tasks',file),JSON.stringify(receipt,null,2)+'\n');console.error(`${receipts.length}/181 FAIL ${taskId}: ${e.message}`);}}
 const passed=receipts.filter(r=>r.status==='PASS'),sum=k=>passed.reduce((a,r)=>a+r[k],0);const report={schemaVersion:1,purpose:'Runtime-only independent offline saved-control physics validation. No controllers, training, selection, new gameplay, or policy conclusions.',status:passed.length===181?'PASS':'FAIL',begun,completed:new Date().toISOString(),sourceFiles:sources,verifierSha256:sha256(readFileSync(fileURLToPath(import.meta.url))),expectedCompletedTasks:181,passed:passed.length,failed:181-passed.length,totalTicks:sum('ticks'),decisionsChecked:sum('decisionsChecked'),receiptTruthChecked:sum('receiptTruthChecked'),delayedTruthChecked:sum('delayedTruthChecked'),perceptHashesChecked:sum('perceptHashesChecked'),eventsChecked:sum('eventsChecked'),checkpoints:sum('checkpointCount'),controllerCalls:0,newGameplayDecisions:0,checkpointSchedule:'tick 0 and every 120 ticks through terminal tick 3600, inclusive (31/task)',comparison:'Exact structural numeric equality; no tolerance. Each hash chain and both raw byte digests verified before replay. Exact event order, tick and elapsed time. Scores and finalHash checked against raw completion and external result.',tasks:receipts.map(({taskId,status,eventsChecked,terminal,error})=>({taskId,status,eventsChecked,terminal,error}))};
 writeFileSync(join(out,'REPORT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,tasks:undefined},null,2));if(report.status!=='PASS')process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
