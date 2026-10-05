import {openSync,writeSync,fsyncSync,closeSync,chmodSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const serialize=value=>JSON.stringify(value,(_key,v)=>typeof v==='number'&&!Number.isFinite(v)?{$tetherNumber:String(v)}:v);
export const parse=value=>JSON.parse(value,(_key,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&Object.hasOwn(v,'$tetherNumber')?({'NaN':NaN,'Infinity':Infinity,'-Infinity':-Infinity}[v.$tetherNumber]??v):v);
export const sha256=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:serialize(value)).digest('hex');
// Exclusive task stream plus chained row digests; a partial stream is never a success.
export function createRawStream(path,{maxBytes=Infinity,gzip=false}={}) {
 const fd=openSync(path,'wx');let previous='0'.repeat(64),sequence=0,bytes=0,closed=false;const full=createHash('sha256'),physical=createHash('sha256');let pending=[],uncompressedBytes=0,persistedRows=0;
 const writeBuffer=buffer=>{if(bytes+buffer.length>maxBytes)throw new Error('raw stream byte ceiling exceeded');let offset=0;while(offset<buffer.length){const written=writeSync(fd,buffer,offset,buffer.length-offset);if(written<=0)throw new Error('raw stream write made no progress');offset+=written;}bytes+=buffer.length;physical.update(buffer);};
 const flush=()=>{if(pending.length){writeBuffer(gzipSync(Buffer.concat(pending),{level:6}));persistedRows+=pending.length;pending=[];}};
 return {
  append(record){if(closed)throw new Error('stream closed');const payload=serialize(record);const digest=sha256(`${previous}\n${sequence}\n${payload}`);const line=serialize({sequence,previous,digest,record})+'\n';const buffer=Buffer.from(line);uncompressedBytes+=buffer.length;if(gzip){pending.push(buffer);if(pending.length>=256)flush();}else{writeBuffer(buffer);persistedRows++;}full.update(line);previous=digest;sequence++;},
  finish(){if(closed)throw new Error('stream already closed');flush();fsyncSync(fd);closeSync(fd);chmodSync(path,0o444);closed=true;return {rows:sequence,bytes,chainTail:previous,sha256:full.digest('hex'),...(gzip?{compression:'gzip-members-256-rows',uncompressedBytes,fileSha256:physical.digest('hex')}: {})};},
  abort(){if(!closed){try{flush();}catch{}fsyncSync(fd);closeSync(fd);chmodSync(path,0o444);closed=true;return {persistedRows,persistedBytes:bytes,bufferedRowsNotPersisted:pending.length,compression:gzip?'gzip-members-256-rows':'none'};}},
 };
}
export function verifyRawText(text) {
 let previous='0'.repeat(64),sequence=0;for(const line of text.trimEnd().split('\n')){
  const row=JSON.parse(line);if(row.sequence!==sequence||row.previous!==previous||row.digest!==sha256(`${previous}\n${sequence}\n${JSON.stringify(row.record)}`))throw new Error('raw stream chain mismatch');previous=row.digest;sequence++;
 }return {rows:sequence,bytes:Buffer.byteLength(text),chainTail:previous,sha256:sha256(text)};
}
