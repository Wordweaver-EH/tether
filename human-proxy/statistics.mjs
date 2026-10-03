import {createHash} from 'node:crypto';
export function quantile(sorted,q){if(!sorted.length)return null;const p=(sorted.length-1)*q,i=Math.floor(p);return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*(p-i);}
export function classify(lower,upper){return lower>0?'counter-beats-ordinary':lower>=-1?'counter-neutralizes-within-margin':upper< -1?'ordinary-dominates-this-proxy':'inconclusive';}
export function summarizeStudy(bouts){
 if(bouts.length!==64)throw Error('primary requires exactly 64 bouts');
 const clusters=[];
 for(let c=0;c<32;c++){
  const pair=bouts.filter(b=>b.cluster===c);if(pair.length!==2||pair.some(b=>!['P1','P2'].includes(b.counterSeat))||new Set(pair.map(b=>b.counterSeat)).size!==2)throw Error('missing seat-paired cluster');
  for(const b of pair){if(b.elapsedSec!==300)throw Error('incorrect exposure');if(!Number.isSafeInteger(b.counterHits)||b.counterHits<0||!Number.isSafeInteger(b.ordinaryHits)||b.ordinaryHits<0||b.netHitsPerMin!==(b.counterHits-b.ordinaryHits)/5)throw Error('invalid physical hit rate');}
  clusters.push(pair.reduce((n,b)=>n+b.netHitsPerMin,0)/2);
 }
 const boot=[];
 for(let r=0;r<20000;r++){let sum=0;for(let i=0;i<32;i++){const bytes=createHash('sha256').update(JSON.stringify(['tether-human-proxy-bootstrap-v1',r,i])).digest();sum+=clusters[bytes.readUInt32BE(0)%32];}boot.push(sum/32);}
 boot.sort((a,b)=>a-b);const lower=quantile(boot,.025),upper=quantile(boot,.975),mean=clusters.reduce((a,b)=>a+b,0)/32;
 const group=rows=>({bouts:rows.length,counterHits:rows.reduce((n,b)=>n+b.counterHits,0),ordinaryHits:rows.reduce((n,b)=>n+b.ordinaryHits,0),minutes:rows.reduce((n,b)=>n+b.elapsedSec/60,0),counterGrossHitsPerMin:rows.reduce((n,b)=>n+b.counterHits,0)/rows.reduce((n,b)=>n+b.elapsedSec/60,0),ordinaryGrossHitsPerMin:rows.reduce((n,b)=>n+b.ordinaryHits,0)/rows.reduce((n,b)=>n+b.elapsedSec/60,0),meanNetHitsPerMin:rows.reduce((n,b)=>n+b.netHitsPerMin,0)/rows.length,win:rows.filter(b=>b.netHitsPerMin>0).length,tie:rows.filter(b=>b.netHitsPerMin===0).length,loss:rows.filter(b=>b.netHitsPerMin<0).length});
 return {unit:'net physical HITs/min',mean,clusterBootstrap95:[lower,upper],bootstrap:{unit:'paired seed cluster mean',clusters:32,resamples:20000,algorithm:'SHA256-addressed percentile, linear quantiles'},classification:classify(lower,upper),margin:1,clusterMeans:clusters,overall:group(bouts),bySeat:{P1:group(bouts.filter(b=>b.counterSeat==='P1')),P2:group(bouts.filter(b=>b.counterSeat==='P2'))}};
}
