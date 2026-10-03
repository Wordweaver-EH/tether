export function fixtureWorld(createWorld,kind,tick){
 const world=createWorld(),t=tick/120;
 world.tick=tick;world.elapsedSec=t;world.remainingSec=300-t;
 const p=world.players[0],q=world.players[1];
 p.position={x:-5,y:kind==='obstacle-held'?1:0};p.velocity={x:0,y:0};
 const theta=kind==='turning-visibility'?Math.PI*t:0;p.facing={x:Math.cos(theta),y:Math.sin(theta)};
 q.position={x:kind==='obstacle-held'?.5:4,y:.5*Math.sin(t)};q.velocity={x:0,y:.5*Math.cos(t)};q.facing={x:-1,y:0};
 world.spears[0].position={...p.position};world.spears[0].direction={...p.facing};
 world.spears[1].position={...q.position};world.spears[1].direction={...q.facing};
 if(kind==='embedded'){Object.assign(world.spears[0],{state:'EMBEDDED',position:{x:8,y:0},direction:{x:1,y:0},embedSurfaceId:'WALL_E',recallTarget:null});}
 return world;
}
export const decisionTicks=()=>Array.from({length:120},(_,i)=>18+4*i);
export const controllerOffsets=Object.freeze([0,2,4,6,1]);
