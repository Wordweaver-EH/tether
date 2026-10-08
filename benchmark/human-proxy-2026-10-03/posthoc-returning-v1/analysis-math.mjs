// Standalone posthoc measurement helpers. No game/controller execution.
export function isVisible(position,facing,target){
 const dx=target.x-position.x,dy=target.y-position.y,ds=dx*dx+dy*dy;
 if(ds===0)return true;
 const projection=facing.x*dx+facing.y*dy;
 return projection>=0&&4*projection*projection>=(facing.x*facing.x+facing.y*facing.y)*ds;
}
export function firstReturningPacketTick(recallTick,lagTicks){
 // Perception is before commands/events in a tick; same-tick packet is EMBEDDED.
 return Math.ceil((recallTick+1)/4)*4+lagTicks;
}
export function packetCanActByImpact(receiptTick,impactTick){
 // The command is applied at tick start, before that tick's collision.
 return receiptTick<=impactTick;
}
export function advanceFacing(facing,command,hypot,rotation){
 const n=hypot(command.aimX,command.aimY);
 if(n<=.1)return {...facing};
 const aim={x:command.aimX/n,y:command.aimY/n};
 const cross=facing.x*aim.y-facing.y*aim.x;
 if(facing.x*aim.x+facing.y*aim.y>=rotation.cos)return aim;
 const s=cross<0?-rotation.sin:rotation.sin;
 const next={x:facing.x*rotation.cos-facing.y*s,y:facing.x*s+facing.y*rotation.cos};
 const length=hypot(next.x,next.y);return {x:next.x/length,y:next.y/length};
}
export function victimStateAtCollision(state,victim,attacker,events){
 // Neutralization precedes both spear sweeps. P1's sweep precedes P2's.
 // HIT records are appended only after both sweeps, so array position alone
 // cannot tell whether the victim's same-tick return completion was already done.
 let result=state;
 for(const e of events){
  if(e.type==='SPEAR_NEUTRALIZED'&&e.spear_owner===victim)result='HELD';
  if(victim==='P1'&&attacker==='P2'&&e.owner===victim){
   if(e.type==='EMBED')result='EMBEDDED';
   if(e.type==='RECALL_COMPLETE')result='HELD';
  }
 }
 return result;
}
