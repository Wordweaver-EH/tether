import {createWorld,observe,render} from './world.mjs';
import {createMazeController} from './controller.mjs';
import {pathToFileURL} from 'node:url';
export function runEpisode(options={}) {
  const sim=createWorld(options),controller=createMazeController(options),rows=[];
  while(!sim.world.done){const percept=observe(sim.world),result=controller.step(percept);const outcome=sim.step(result.action);rows.push({tick:percept.tick,percept,...result,outcome:{...outcome}});}
  return {seed:sim.world.seed,condition:sim.world.condition,variant:options.variant??'full',collected:sim.world.collected,dead:sim.world.dead,ticks:sim.world.tick,remaining:sim.world.pellets.size,rows,final:render(sim.world)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const variant=process.argv[2]??'full',condition=process.argv[3]??'familiar';const result=runEpisode({variant,condition});console.log(result.final);console.log(JSON.stringify({...result,rows:undefined},null,2));
}
