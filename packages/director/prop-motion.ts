import type {FrameState} from '../animation/compiler.js';
export type PropMotionFrame=Pick<FrameState,'timeMs'|'props'>;

/** Relations share the union of the real owners' adaptive keyframes. Reusing
 * the lead frames loses a supporting actor's pickup/release/landing boundaries.
 * Read the same piecewise-linear baked centers that the scene timelines draw;
 * this is not a new physical sampler or a second clock. */
export function compiledPropFrames(base:FrameState[],sources:ReadonlyMap<string,FrameState[]>):PropMotionFrame[]{
  if(!sources.size)return base;
  if(!base.length||base[0]!.timeMs!==0)throw new Error('Prop motion needs a complete shot clock');
  const end=base.at(-1)!.timeMs,times=new Set(base.map(f=>f.timeMs));
  for(const [id,frames] of sources){
    if(!frames.length||frames[0]!.timeMs!==0||frames.at(-1)!.timeMs!==end)throw new Error(`Prop ${id} has a different compiled scene clock`);
    let previous=-1;
    for(const frame of frames){
      const prop=frame.props[id];
      if(!Number.isFinite(frame.timeMs)||frame.timeMs<=previous||!prop||![prop.point.x,prop.point.y].every(Number.isFinite))throw new Error(`Prop ${id} has missing or invalid compiled centers`);
      previous=frame.timeMs;times.add(frame.timeMs);
    }
  }
  const bracket=(frames:FrameState[],time:number)=>{
    let low=0,high=frames.length-1;
    while(low<high){const middle=Math.floor((low+high)/2);if(frames[middle]!.timeMs<time)low=middle+1;else high=middle;}
    const right=frames[low]!,left=frames[Math.max(0,low-1)]!;
    return {left,right,weight:left.timeMs===right.timeMs?0:(time-left.timeMs)/(right.timeMs-left.timeMs)};
  };
  return [...times].sort((a,b)=>a-b).map(timeMs=>{
    const props:FrameState['props']={};
    for(const [id,frames] of sources){
      const {left,right,weight}=bracket(frames,timeMs),a=left.props[id]!,b=right.props[id]!;
      props[id]={...(weight===1?b:a),point:{x:a.point.x+(b.point.x-a.point.x)*weight,y:a.point.y+(b.point.y-a.point.y)*weight}};
    }
    // Never present interpolated prop centers as resampled actor bones/faces.
    return {timeMs,props};
  });
}
