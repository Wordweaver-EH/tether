import {createCoverAgent,controlRoute} from '../../src/agents/cover-control.mjs';
import {createCoverInterface} from '../../src/agents/cover-interface.mjs';
import {createReactiveDodger} from '../../src/agents/dodger.mjs';
export const OPPONENT_SPLITS=Object.freeze({train:['stationary','orbit'],development:['weave'],evaluation:['reactiveOrbit','reactiveFlank']});
// Fixed prospective family split. Every input is an ordinary legal percept.
export function createValueOpponent({seed,family}){
 if(!Object.values(OPPONENT_SPLITS).flat().includes(family))throw Error('unknown opponent family');
 if(family==='stationary')return createCoverAgent({seed,route:(seed>>>1)%2?'north':'south'});
 const dodger=createReactiveDodger(),reactive=family.startsWith('reactive');let waypoint=0,previous=null,arrived=false;
 const controller={settings:()=>({seed,family}),act(v){
  const p=v.own.position,t=v.time.elapsedSec,side=v.viewerId==='P1'?-1:1;
  if(previous&&Math.hypot(p.x-side*5.5,p.y)<.15&&Math.hypot(p.x-previous.x,p.y-previous.y)>1){waypoint=0;arrived=false;}previous={...p};
  const path=controlRoute(v.viewerId,(seed>>>1)%2?'north':'south');
  while(waypoint<path.length-1&&Math.hypot(p.x-path[waypoint].x,p.y-path[waypoint].y)<.25)waypoint++;
  if(waypoint===path.length-1&&Math.hypot(p.x-path[waypoint].x,p.y-path[waypoint].y)<.4)arrived=true;
  let target=path[waypoint];
  if(arrived){const phase=t*(family==='weave'?1.7:1.1)+(seed%7);const radius=family==='reactiveFlank'?(Math.floor(t/5)%2?1.3:.55):.65;target={x:radius*Math.cos(phase),y:(family==='weave'?.35:radius)*Math.sin(phase)};}
  let move={x:target.x-p.x,y:target.y-p.y};
  if(reactive){const dodge=dodger.movement(v).vector;if(Math.hypot(dodge.x??0,dodge.y??0)>.1)move=dodge;}
  const e=v.opponent,aim=e?{x:e.position.x+e.velocity.x*.1-p.x,y:e.position.y+e.velocity.y*.1-p.y}:move;
  const n=Math.hypot(aim.x,aim.y)||1,aligned=(aim.x*v.own.facing.x+aim.y*v.own.facing.y)/n>.98;
  return {moveX:move.x,moveY:move.y,aimX:aim.x||-side,aimY:aim.y,throw:!!e&&v.own.spear?.state==='HELD'&&aligned,recall:!v.own.spear||v.own.spear.state==='EMBEDDED'};
 }};
 return createCoverInterface(controller,{seed});
}
