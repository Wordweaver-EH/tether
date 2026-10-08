// New maze world model and planner. No hidden world, ghost policy or condition.
import {ACTIONS,STEP_SEC,move,same,key,distance,walkable} from './world.mjs';
export function direction(from,to,fallback='E') {if(!to)return fallback;const dx=to.x-from.x,dy=to.y-from.y;return Math.abs(dx)>=Math.abs(dy)&&dx!==0?(dx>0?'E':'W'):dy!==0?(dy>0?'S':'N'):fallback;}
export function foodDistances(view) {
  const distances=new Map(),queue=[];for(const p of view.pellets){distances.set(key(p),0);queue.push(p);}
  for(let i=0;i<queue.length;i++){const p=queue[i],d=distances.get(key(p));for(const a of ACTIONS.slice(0,4)){const q=move(view.map,p,a);if(!distances.has(key(q))){distances.set(key(q),d+1);queue.push(q);}}}
  return distances;
}
// Linear, wall-stopping forecast, not knowledge of junction choice or chase mode.
export function ghostAt(view,belief,steps) {
  if(!belief || belief.confidence<=0)return null;
  let p={x:Math.round(belief.mean.x),y:Math.round(belief.mean.y)};
  if(!walkable(view.map,p))return null;
  const a=direction(p,{x:p.x+belief.velocity.x,y:p.y+belief.velocity.y},'WAIT');
  for(let i=0;i<steps;i++)p=move(view.map,p,a);return p;
}
export function plan(view,belief,goal,budget) {
  const food=foodDistances(view),pellets=new Set(view.pellets.map(key)),branches=[];
  // All 25 two-step branches share the same model and logical cost. Food BFS is
  // fixed public preprocessing, reported separately, not counted as one CPU op.
  for(const a of ACTIONS)for(const b of ACTIONS){
    if(!budget.spend('maze-branch',1))return {actions:['WAIT'],branches,complete:false,foodCells:food.size};
    let p={...view.own.position},score=0;const taken=new Set();let previousGhost=ghostAt(view,belief,0);
    for(const [i,action] of [a,b].entries()){
      const old=p;p=move(view.map,p,action);const g=ghostAt(view,belief,i+1);
      if(g){const gap=distance(p,g);score-= (goal==='Threat'?6:3)/(1+gap);if(same(p,g)||(previousGhost&&same(old,g)&&same(p,previousGhost)))score-=100;}
      if(pellets.has(key(p))&&!taken.has(key(p))){score+=goal==='Threat'?.5:3;taken.add(key(p));}
      score-=.2*(food.get(key(p))??0);if(same(old,p))score-=.15;previousGhost=g;
    }
    branches.push({actions:[a,b],score});
  }
  branches.sort((a,b)=>b.score-a.score);return {actions:branches[0].actions,branches,complete:true,foodCells:food.size};
}
