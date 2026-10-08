// Experimental world adapter. The production engine and controller sources are unchanged.
import {CONSTANTS,createWorld,step,hashWorld,snapshotWorld,restoreWorld} from '../src/sim.js';
export {step,hashWorld,snapshotWorld,restoreWorld};
export {percept,isVisible} from './perception.mjs';
export const DEFAULT_CONFIG = Object.freeze({id:'default',spearSpeedScale:1,turnScale:1,fovDeltaDegrees:0,obstacles:CONSTANTS.experiment.OBSTACLES});
export function mirrorObstacles(boxes=DEFAULT_CONFIG.obstacles) {
  return boxes.map(b=>({...b,minX:-b.maxX,maxX:-b.minX}));
}
export function normalizeConfig(input={}) {
  const allowed=Object.keys(DEFAULT_CONFIG);
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('unsupported experimental config key');
  const c=structuredClone({...DEFAULT_CONFIG,...input});
  if(typeof c.id!=='string'||!c.id)throw new Error('config id required');
  for(const k of ['spearSpeedScale','turnScale'])if(![.75,1,1.25].includes(c[k]))throw new Error(`unsupported ${k}`);
  if(![-20,0,20].includes(c.fovDeltaDegrees))throw new Error('unsupported FOV shift');
  if(!Array.isArray(c.obstacles)||c.obstacles.length<2||c.obstacles.length>5)throw new Error('two to five obstacle boxes required');
  const E=CONSTANTS.experiment,ids=new Set();
  for(const b of c.obstacles){
    if(Object.keys(b).sort().join()!=='id,maxX,maxY,minX,minY'||typeof b.id!=='string'||ids.has(b.id))throw new Error('invalid obstacle fields/id');ids.add(b.id);
    if(!['minX','maxX','minY','maxY'].every(k=>Number.isFinite(b[k]))||b.minX>=b.maxX||b.minY>=b.maxY||b.minX<E.ARENA.minX||b.maxX>E.ARENA.maxX||b.minY<E.ARENA.minY||b.maxY>E.ARENA.maxY)throw new Error('invalid obstacle bounds');
    for(const {position:p} of E.STARTS)if(p.x>=b.minX-E.PLAYER_RADIUS&&p.x<=b.maxX+E.PLAYER_RADIUS&&p.y>=b.minY-E.PLAYER_RADIUS&&p.y<=b.maxY+E.PLAYER_RADIUS)throw new Error('obstacle overlaps spawn');
  }
  for(let i=0;i<c.obstacles.length;i++)for(let j=i+1;j<c.obstacles.length;j++){const a=c.obstacles[i],b=c.obstacles[j];if(a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY)throw new Error('overlapping obstacles');}
  return c;
}
export function createExperimentalWorld(input={}) {
  const c=normalizeConfig(input),world=createWorld();
  const nominal=c.spearSpeedScale===1&&c.turnScale===1&&c.fovDeltaDegrees===0&&JSON.stringify(c.obstacles)===JSON.stringify(DEFAULT_CONFIG.obstacles);
  if(nominal)return world; // Exact default serialization/hash parity, without experiment labels.
  world.experiment={...world.experiment,OBSTACLES:structuredClone(c.obstacles),OUTBOUND_SPEED:12*c.spearSpeedScale,RETURN_SPEED:12*c.spearSpeedScale,TURN_RATE_RAD:2*Math.PI*c.turnScale,FOV_HALF_ANGLE_RAD:Math.PI/3+c.fovDeltaDegrees*Math.PI/360};
  world.experimentOverrides={OBSTACLES:structuredClone(c.obstacles),OUTBOUND_SPEED:world.experiment.OUTBOUND_SPEED,RETURN_SPEED:world.experiment.RETURN_SPEED,TURN_RATE_RAD:world.experiment.TURN_RATE_RAD,FOV_HALF_ANGLE_RAD:world.experiment.FOV_HALF_ANGLE_RAD};
  return world;
}
export function createResolvedWorld(config) {
 const E=CONSTANTS.experiment,e=config.experiment;
 if(!e||JSON.stringify(config.technical)!==JSON.stringify(CONSTANTS.technical)||JSON.stringify(config.publicControllerRules)!==JSON.stringify({outboundSpeed:12,returnSpeed:12}))throw new Error('nominal interface constants required');
 if(Object.keys(e).sort().join()!==Object.keys(E).sort().join())throw new Error('experiment fields mismatch');
 for(const k of Object.keys(E).filter(k=>!['OBSTACLES','OUTBOUND_SPEED','RETURN_SPEED','TURN_RATE_RAD','FOV_HALF_ANGLE_RAD'].includes(k)))if(JSON.stringify(e[k])!==JSON.stringify(E[k]))throw new Error(`forbidden shift: ${k}`);
 const delta=[-20,0,20].find(d=>Math.abs(e.FOV_HALF_ANGLE_RAD-(Math.PI/3+d*Math.PI/360))<1e-14);
 if(delta===undefined||e.RETURN_SPEED!==e.OUTBOUND_SPEED)throw new Error('unsupported resolved physics');
 const world=createExperimentalWorld({id:config.id,obstacles:e.OBSTACLES,spearSpeedScale:e.OUTBOUND_SPEED/12,turnScale:e.TURN_RATE_RAD/(2*Math.PI),fovDeltaDegrees:delta});
 if(world.experimentOverrides){world.experiment=structuredClone(e);for(const k of Object.keys(world.experimentOverrides))world.experimentOverrides[k]=structuredClone(e[k]);}
 return world;
}
