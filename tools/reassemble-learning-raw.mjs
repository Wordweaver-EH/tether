// Transport-only reconstruction; no simulations or statistical reanalysis.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=resolve(root,'reports/raw-learning');
const manifest=JSON.parse(readFileSync(resolve(dir,'transport-manifest.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const combined=createHash('sha256');let rows=0,bytes=0;
for(const part of manifest.parts){
 const slices=part.transportPieces.map(piece=>{
  const b=readFileSync(resolve(dir,piece.file));
  if(b.length!==piece.bytes||hash(b)!==piece.sha256)throw Error('Slice mismatch: '+piece.file);
  return b;
 });
 const gzip=Buffer.concat(slices);
 if(gzip.length!==part.gzipBytes||hash(gzip)!==part.gzipSha256)throw Error('Gzip mismatch: '+part.file);
 const raw=gunzipSync(gzip);let lines=0;for(const byte of raw)if(byte===10)lines++;
 if(raw.length!==part.rawBytes||hash(raw)!==part.rawSha256||lines!==part.rows)throw Error('Raw mismatch: '+part.file);
 combined.update(raw);bytes+=raw.length;rows+=lines;
 const dest=resolve(dir,part.file);
 if(existsSync(dest)){if(hash(readFileSync(dest))!==part.gzipSha256)throw Error('Refusing to overwrite different file: '+dest);}
 else writeFileSync(dest,gzip,{flag:'wx'});
 console.log('Verified '+part.file+': '+lines+' rows');
}
const sha256=combined.digest('hex');
if(bytes!==manifest.rawBytes||rows!==manifest.rows||sha256!==manifest.rawSha256)throw Error('Combined raw mismatch');
console.log(JSON.stringify({bytes,rows,sha256}));
