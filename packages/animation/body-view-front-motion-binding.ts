import type {PerformancePlan,Point} from './schemas.js';
import type {RigMetrics} from './rig.js';

export const FRONT_BODY_MOTION_SELECTION='registered-front-motion-v1' as const;
export const FRONT_BODY_CLOTH_VERSION='native-front-cloth-1';
export const isFrontMotionView=(view:unknown):view is 'front'=>view==='front';
/** Own source-canvas belt/hem cages. Manual authoring, not measured anatomy,
 * fabric or art/motion approval. Upper clothing/belt and original ink remain. */
export const frontClothBindings={
  lila:{file:'library/topics/prehistoric-life/body-views/lila-front-v1.png',sha256:'f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce',width:939,height:1675,left:300,right:720,waist:948,bottom:1305,split:490},
  karo:{file:'library/topics/prehistoric-life/body-views/karo-front-v1.png',sha256:'51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e',width:1024,height:1536,left:320,right:725,waist:948,bottom:1180,split:512},
} as const;

/** Lateral open-close steps in the authored frontal drawing, not forward
 * walking with an invented yaw. The leading sole opens in travel direction;
 * the trailing sole then closes to its own stance offset. Both finish a pair
 * at the same root clock. Swing/support/IK/ink stay in the canonical compiler. */
export function frontalSidestepSchedule(walk:PerformancePlan['walks'][number],m:RigMetrics,scale:number,rootAt:(timeMs:number)=>Point){
  if(walk.gait!=='sidestep'||![walk.fromX,walk.toX,walk.startMs,walk.endMs,scale].every(Number.isFinite)||scale<=0||walk.endMs<=walk.startMs||walk.fromX===walk.toX)throw new Error('needs-front-motion: sidestep requires a positive original clock and nonzero lateral travel');
  const length=Math.max(8,m.upperLeg*.32)*scale,pairs=Math.max(1,Math.ceil(Math.abs(walk.toX-walk.fromX)/length));
  if(pairs>64)throw new Error('needs-front-motion: lateral source requires too many step pairs');
  const steps=pairs*2,span=(walk.endMs-walk.startMs)/steps,leading=walk.toX>walk.fromX?'right' as const:'left' as const;
  return Array.from({length:steps},(_,i)=>{
    const startMs=walk.startMs+i*span,endMs=i===steps-1?walk.endMs:walk.startMs+(i+1)*span,side=i%2?(leading==='left'?'right' as const:'left' as const):leading;
    const pairEnd=walk.startMs+(Math.floor(i/2)+1)*span*2,center=i>=steps-2?walk.toX:rootAt(pairEnd).x;
    return {i,startMs,endMs,side,landing:center+(m.footOffsets?.[side]??(side==='left'?-m.stance:m.stance))*scale};
  });
}
