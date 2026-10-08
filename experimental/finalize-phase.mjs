// No controllers: keep watchdog active while awaiting final I/O, drain the
// asynchronous supervisor, then enforce bounds immediately before atomic commit.
export async function finalizePhase({verifySource,preparePending,stopSupervisor,drainSupervisor,getFailure,checkBounds,commitPending}){
 await verifySource();
 const pending=await preparePending();
 stopSupervisor();await drainSupervisor();
 if(getFailure())throw getFailure();
 checkBounds();
 // Must be synchronous: no event-loop yield between guard and exclusive commit.
 commitPending(pending);
}
