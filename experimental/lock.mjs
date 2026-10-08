import {readFile,readdir,writeFile} from 'node:fs/promises';import {resolve,relative} from 'node:path';
import {sha256,parse} from './raw-stream.mjs';
export const json=async path=>parse(await readFile(path,'utf8'));
export async function walk(root){const out=[];for(const e of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=resolve(root,e.name);if(e.isDirectory())out.push(...await walk(path));else if(e.isFile())out.push(path);else throw new Error('nonregular lock input');}return out;}
export async function buildLock({repo,prereg,freeze,phase,opponentFreeze=null}){
 if(!['pilot','evaluation','opponent-search'].includes(phase))throw new Error('unknown phase');
 const files=[resolve(repo,'package.json'),...(await Promise.all(['src','benchmark','experimental'].map(x=>walk(resolve(repo,x))))).flat(),...await walk(prereg),...await walk(freeze)];
 if(opponentFreeze)files.push(opponentFreeze);
 const inputs=[];for(const path of [...new Set(files)].sort())inputs.push({path,sha256:sha256(await readFile(path))});
 return {schema:1,phase,status:'PREPARED_NOT_RELEASED',repo:resolve(repo),prereg:resolve(prereg),freeze:resolve(freeze),opponentFreeze,inputs};
}
export async function verifyLock(lock){
 if(lock.schema!==1||!Array.isArray(lock.inputs)||new Set(lock.inputs.map(x=>x.path)).size!==lock.inputs.length)throw new Error('invalid lock');
 for(const f of lock.inputs)if(sha256(await readFile(f.path))!==f.sha256)throw new Error(`locked input changed: ${f.path}`);
 const included=new Set(lock.inputs.map(f=>f.path));
 const required=[resolve(lock.repo,'package.json'),...(await Promise.all(['src','benchmark','experimental'].map(dir=>walk(resolve(lock.repo,dir))))).flat(),...await walk(lock.prereg),...await walk(lock.freeze),...(lock.opponentFreeze?[resolve(lock.opponentFreeze)]:[])];
 for(const path of required)if(!included.has(path))throw new Error(`unlocked runtime input: ${path}`);
 if(new Set(required).size!==included.size)throw new Error('lock contains unexpected or removed runtime input');
}
export async function consumeRelease(releasePath,lockPath,phase,out,workers){
 const release=await json(releasePath),lockBytes=await readFile(lockPath);const lock=JSON.parse(lockBytes);
 if(release.authorized!==true||release.phase!==phase||lock.phase!==phase||release.lockSha256!==sha256(lockBytes)||resolve(release.output)!==resolve(out)||release.workers!==workers)throw new Error('root release does not match exact phase, lock, output, worker count');
 if(!Number.isInteger(workers)||workers<1||workers>8)throw new Error('invalid worker count');
 for(const key of ['independentReview','gitCheckpoint']){const evidence=release[key];if(!evidence?.path||sha256(await readFile(evidence.path))!==evidence.sha256)throw new Error(`missing/changed ${key} evidence`);const doc=await json(evidence.path);if(key==='independentReview'&&doc.approved!==true)throw new Error('independent review is not approved');if(key==='gitCheckpoint'&&doc.status!=='VERIFIED')throw new Error('Git checkpoint not verified');if(doc.lockSha256!==release.lockSha256)throw new Error(`${key} does not attest exact lock`);}
 await verifyLock(lock);
 await writeFile(`${releasePath}.consumed.json`,JSON.stringify({at:new Date().toISOString(),phase,out,workers,lockSha256:release.lockSha256})+'\n',{flag:'wx',mode:0o444});return {lock,release};
}
