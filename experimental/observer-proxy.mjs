// Retain only already-returned native snapshots. No replacement/reordered calls.
export function createObservedController(controller){
 const observed={proposed:null,committed:null,commitTime:null,lastDecision:null,cognition:null};
 const proxy={...controller,act(...args){const result=controller.act(...args);observed.proposed=result;return result;},commitCommand(...args){const result=controller.commitCommand?.(...args);observed.committed=args[0];observed.commitTime=args[2];return result;}};
 for(const method of ['lastDecision','cognition'])if(typeof controller[method]==='function')proxy[method]=(...args)=>{const result=controller[method](...args);observed[method]=result;return result;};
 return {proxy,observed};
}
