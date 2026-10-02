import type { HostProfile } from '../host/schemas.js';
import { ANIMATION_VERSION, PerformancePlanSchema } from './schemas.js';
import { rigMetrics } from './rig.js';

export function benchmarkPlan(profile:HostProfile) {
  const m=rigMetrics(profile),scale=1.3,root={x:350,y:565},endX=580;
  const source={x:endX+(m.shoulderOffset+60)*scale,y:root.y+(m.shoulderY+35)*scale};
  const destination={x:endX+(m.shoulderOffset+18)*scale,y:root.y+(m.shoulderY+60)*scale};
  return PerformancePlanSchema.parse({version:22,compilerVersion:ANIMATION_VERSION,id:'acting-benchmark',leadCharacterId:profile.id,
    profileHash:profile.profileHash,kind:profile.kind,durationMs:10000,fps:30,stage:{width:1280,height:720,groundY:565},root,scale,
    walks:[{startMs:200,endMs:3300,fromX:350,toX:endX}],
    facing:'front',turns:[{startMs:3450,endMs:3850,direction:'right'},{startMs:8000,endMs:8400,direction:'front'}],
    gestures:[{id:'notice',action:'inspect',startMs:3450,endMs:4400,target:source},
      {id:'object',action:'pick-place',startMs:4500,endMs:7800,target:source,destination,propId:'sample',contactMs:5100,releaseMs:7350},
      {id:'explain',action:'address-viewer',startMs:8000,endMs:10000}],
    expressions:[{startMs:0,endMs:3400,mood:'curious'},{startMs:3500,endMs:4450,mood:'thinking'},
      {startMs:4500,endMs:7700,mood:'effort'},{startMs:7900,endMs:10000,mood:'understanding'}],
    gazes:[{startMs:3500,endMs:5200,target:source},{startMs:5200,endMs:7400,target:destination}],
    props:[{id:'sample',origin:source,destination}],
  });
}

/** Separate locomotion/attachment benchmark; it does not invent a narrated claim. */
export function carryBenchmarkPlan(profile:HostProfile) {
  const base=benchmarkPlan(profile),m=rigMetrics(profile),s=base.scale;
  const source={x:480+(m.shoulderOffset+50)*s,y:base.root.y+(m.shoulderY+35)*s};
  const destination={...source,x:source.x+140};
  return PerformancePlanSchema.parse({...base,
    walks:[{startMs:200,endMs:2000,fromX:base.root.x,toX:480},{startMs:4500,endMs:7000,fromX:480,toX:620}],
    turns:[{startMs:2200,endMs:2520,direction:'right'}],
    gestures:[{id:'notice',action:'think',startMs:2200,endMs:3000,target:source},
      {id:'transport',action:'carry',startMs:3200,endMs:9500,target:source,destination,propId:'sample',contactMs:3800,releaseMs:8800,carryOffset:{x:50,y:-15}}],
    expressions:[{startMs:0,endMs:2100,mood:'curious'},{startMs:2200,endMs:3100,mood:'thinking'},
      {startMs:3200,endMs:9400,mood:'effort'},{startMs:9500,endMs:10000,mood:'understanding'}],
    gazes:[{startMs:2200,endMs:4200,target:source},{startMs:7500,endMs:9000,target:destination}],
    props:[{id:'sample',origin:source,destination}],
  });
}
