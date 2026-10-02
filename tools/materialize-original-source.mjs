// Materialize the frozen comparison runtime from the pinned evidence commit.
// No network access, tracked duplicate, or fallback to the repaired controller.
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const evidenceCommit='c3b8814bb92e4086d273e2c525b722de4144a17a';
export function materializeOriginalSource() {
 const manifest=JSON.parse(readFileSync(resolve(root,'reports/provenance/source-manifest.json'),'utf8'));
 const dest=mkdtempSync(resolve(tmpdir(),'tether-original-'));
 try {
  for(const path of [...Object.keys(manifest.files),'package.json']) {
   const bytes=execFileSync('git',['show',`${evidenceCommit}:reference/v2-source/${path}`],{cwd:root,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
   if(path!=='package.json' && createHash('sha256').update(bytes).digest('hex')!==manifest.files[path])throw new Error(`Frozen source hash mismatch: ${path}`);
   const file=resolve(dest,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes);
  }
  return {path:dest,cleanup:()=>rmSync(dest,{recursive:true,force:true})};
 } catch(error) {
  rmSync(dest,{recursive:true,force:true});
  throw new Error('Original-v2 comparison source unavailable. Run git fetch origin data/tether-evidence-2026-10-02, or set ORIGINAL_SOURCE to the verified reference/v2-source directory in a data-branch checkout. '+error.message);
 }
}
