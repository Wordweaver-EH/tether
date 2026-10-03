// Final sampler failure must win over success, including failures arriving during I/O.
export async function finalizeSearch({stopSampling,drainSampling,getFailure,prepare,checkBounds,publish}){
 stopSampling();await drainSampling();if(getFailure())throw getFailure();
 const prepared=await prepare();if(getFailure())throw getFailure();checkBounds();
 // publish must synchronously persist and check post-write bounds before returning.
 return publish(prepared);
}
