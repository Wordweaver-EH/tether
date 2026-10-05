// Post-search administrative freeze only; never runs controllers or searches.
import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {json} from './lock.mjs';import {sha256} from './raw-stream.mjs';import {BASELINE,vector} from './search-core.mjs';
export async function prepareReviewedFreeze({resultPath,reviewPath,gitReceiptPath,out}){
 const bytes=await readFile(resultPath),result=JSON.parse(bytes),resultSha256=sha256(bytes);
 if(result.status!=='COMPLETE_NEEDS_INDEPENDENT_REVIEW_AND_GIT'||result.qualifiedBaselineCommit!==BASELINE||result.styles?.length!==1)throw Error('complete eligible search required');vector(result.styles[0].vector);
 const manifestBytes=await readFile(result.manifest.path);if(sha256(manifestBytes)!==result.manifest.sha256)throw Error('search manifest changed');
 const manifest=JSON.parse(manifestBytes),style=result.styles[0],candidate=manifest.candidates?.find(c=>c.id===style.candidateId);
 if(manifest.candidates?.length!==128||manifest.tasks?.length!==512||manifest.results?.length!==512||!candidate?.mutated||style.id!=='searched-style-1'||sha256(style.vector)!==style.parameterSha256||JSON.stringify(candidate.vector)!==JSON.stringify(style.vector)||candidate.totalNet!==style.totalIntegerNet)throw Error('complete manifest and exact selected vector binding required');
 const review=await json(reviewPath),git=await json(gitReceiptPath);
 if(review.approved!==true||review.phase!=='opponent-search-saved-data'||review.resultSha256!==resultSha256||review.manifestSha256!==result.manifest.sha256)throw Error('independent saved-data review does not attest exact results');
 if(git.status!=='VERIFIED'||git.resultSha256!==resultSha256||git.manifestSha256!==result.manifest.sha256||!(/^[a-f0-9]{40}$/.test(git.commit??''))||!git.remote)throw Error('verified Git receipt does not attest exact results');
 const reference=async path=>({path:resolve(path),sha256:sha256(await readFile(path))});
 const frozen={schema:1,status:'REVIEWED_FROZEN',qualifiedBaselineCommit:BASELINE,styles:result.styles,sourceFingerprint:result.sourceFingerprint,seedSha256:result.seedSha256,lockSha256:result.lockSha256,manifest:result.manifest,searchResult:await reference(resultPath),independentReview:await reference(reviewPath),gitPublicationReceipt:await reference(gitReceiptPath)};
 await writeFile(out,JSON.stringify(frozen,null,2)+'\n',{flag:'wx',mode:0o444});return frozen;
}
