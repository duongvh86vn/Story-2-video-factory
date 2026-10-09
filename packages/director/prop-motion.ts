import type {FrameState} from '../animation/compiler.js';

/** Shared scene channels name canonical entities, never actor-local prop IDs. */
export interface ModelMotionFrame {timeMs:number;centers:Record<string,{x:number;y:number}>;}
export type CompiledPropFrame=Pick<FrameState,'timeMs'|'props'>;
export interface CompiledModelSource {partId:string;ownerId:string;propId:string;frames:readonly CompiledPropFrame[];}

export function validateModelMotionFrames(frames:readonly ModelMotionFrame[],partIds:readonly string[],durationMs:number):void {
  const ids=[...new Set(partIds)];
  if(!Number.isFinite(durationMs)||durationMs<=0||!frames.length||frames[0]!.timeMs!==0||frames.at(-1)!.timeMs!==durationMs)throw new Error('Model motion needs the complete canonical shot clock');
  let previous=-1;
  for(const frame of frames){
    if(!Number.isFinite(frame.timeMs)||frame.timeMs<=previous)throw new Error('Model motion has an invalid canonical entity clock');
    previous=frame.timeMs;
    if(Object.keys(frame.centers).length!==ids.length||ids.some(id=>!Object.hasOwn(frame.centers,id)||![frame.centers[id]!.x,frame.centers[id]!.y].every(Number.isFinite)))
      throw new Error('Model motion lacks exactly the bound canonical entity centers');
  }
}

/** Union of real owners' adaptive keyframes. Read precisely the piecewise-linear
 * centers drawn by those owners; do not resample bones, faces or physics. An
 * explicit entity key prevents two people's same local name overwriting one
 * another. Shared ownership supplies its separate single canonical bake. */
export function compiledModelFrames(base:readonly CompiledPropFrame[],sources:readonly CompiledModelSource[]):ModelMotionFrame[]{
  const clock=(frames:readonly CompiledPropFrame[],end?:number)=>{
    if(!frames.length||frames[0]!.timeMs!==0||end!==undefined&&frames.at(-1)!.timeMs!==end)throw new Error('Model motion has a different compiled scene clock');
    let previous=-1;
    for(const frame of frames){if(!Number.isFinite(frame.timeMs)||frame.timeMs<=previous)throw new Error('Model motion has an invalid compiled clock');previous=frame.timeMs;}
    if(previous<=0)throw new Error('Model motion needs a positive complete shot clock');
    return previous;
  };
  const end=clock(base),times=new Set(base.map(f=>f.timeMs)),entities=new Set<string>();
  for(const source of sources){
    if(!source.partId||!source.ownerId||!source.propId||entities.has(source.partId))throw new Error('Model motion needs exactly one actual owner source per canonical entity');
    entities.add(source.partId);clock(source.frames,end);
    for(const frame of source.frames){
      const prop=Object.hasOwn(frame.props,source.propId)?frame.props[source.propId]:undefined;
      if(!prop||![prop.point.x,prop.point.y].every(Number.isFinite))throw new Error(`Model ${source.partId} owner ${source.ownerId} has missing or invalid compiled prop centers`);
      times.add(frame.timeMs);
    }
  }
  const bracket=(frames:readonly CompiledPropFrame[],time:number)=>{
    let low=0,high=frames.length-1;
    while(low<high){const middle=Math.floor((low+high)/2);if(frames[middle]!.timeMs<time)low=middle+1;else high=middle;}
    const right=frames[low]!,left=frames[Math.max(0,low-1)]!;
    return {left,right,weight:left.timeMs===right.timeMs?0:(time-left.timeMs)/(right.timeMs-left.timeMs)};
  };
  return [...times].sort((a,b)=>a-b).map(timeMs=>{
    const centers:ModelMotionFrame['centers']=Object.create(null);
    for(const source of sources){
      const {left,right,weight}=bracket(source.frames,timeMs),a=left.props[source.propId]!.point,b=right.props[source.propId]!.point;
      const point={x:a.x+(b.x-a.x)*weight,y:a.y+(b.y-a.y)*weight};
      if(![point.x,point.y].every(Number.isFinite))throw new Error(`Model ${source.partId} has invalid interpolated centers`);
      centers[source.partId]=point;
    }
    return {timeMs,centers};
  });
}
