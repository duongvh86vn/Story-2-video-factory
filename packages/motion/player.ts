import {ActorMotionSchema, SpriteClipSchema, SPRITE_PLAYER_VERSION, type ActorMotion, type SpriteClip} from './schemas.js';
import {spriteClock as clock} from './clock.js';

const MAX_EVENTS=6000;

/** Parsing validates every frame before timing, geometry or output is used. */
function prepare(input:ActorMotion, inputClip:SpriteClip) {
  const clip=SpriteClipSchema.parse(inputClip), motion=ActorMotionSchema.parse(input);
  let nativeDurationMs=0;
  const offsets=motion.frames.map(frame=>{
    const offset=nativeDurationMs/clip.rate;
    nativeDurationMs+=frame.durationMs;
    return offset;
  });
  const period=nativeDurationMs/clip.rate;
  if(motion.playback.mode==='once' && clip.endMs-clip.startMs<period)
    throw new Error('Once sprite clip must span the entire native duration at the selected rate');
  const start=clock(clip.startMs/1000);
  const end=clock((motion.playback.mode==='once'?clip.startMs+period:clip.endMs)/1000);
  return {motion,clip,offsets,period,nativeDurationMs,start,end};
}
type Prepared=ReturnType<typeof prepare>;

// Quantize each absolute boundary, never the cycle duration before repeating it.
function boundary(p:Prepared, cycle:number, frame:number) {
  return clock((p.clip.startMs+cycle*p.period+p.offsets[frame]!)/1000);
}
function activeFrame(p:Prepared, seconds:number, inclusive=true):number {
  const reached=(time:number)=>inclusive?seconds>=time:seconds>time;
  let cycle=p.motion.playback.mode==='once'?0:Math.max(0,Math.floor((seconds-p.clip.startMs/1000)/(p.period/1000)));
  // Correct the estimate against quantized boundaries, including the left limit for hold.
  if(cycle>0 && !reached(boundary(p,cycle,0))) cycle--;
  if(p.motion.playback.mode==='loop' && reached(boundary(p,cycle+1,0))) cycle++;
  let frame=0;
  for(let i=1;i<p.offsets.length;i++) if(reached(boundary(p,cycle,i))) frame=i; else break;
  return frame;
}
function sampleClock(p:Prepared,seconds:number):number|null {
  if(seconds<p.start) return null;
  if(seconds<p.end) return activeFrame(p,seconds);
  if(p.motion.playback.end==='hide') return null;
  if(p.motion.playback.end==='first') return 0;
  return p.motion.playback.mode==='once'?p.motion.frames.length-1:activeFrame(p,p.end,false);
}
function sample(p:Prepared,timeMs:number):number|null {
  if(!Number.isFinite(timeMs)) throw new Error('Sprite sample clock must be finite');
  return sampleClock(p,clock(timeMs/1000));
}

export function sampleMotionFrame(motion:ActorMotion,clip:SpriteClip,timeMs:number):number|null {
  return sample(prepare(motion,clip),timeMs);
}

export function motionLandmarkAt(motion:ActorMotion,clip:SpriteClip,name:string,timeMs:number):{x:number;y:number}|null {
  const p=prepare(motion,clip);
  // Missing registration is an error even when the actor is currently hidden.
  if(!p.motion.frames.every(frame=>Object.hasOwn(frame.landmarks,name)))
    throw new Error(`Missing sprite landmark: ${name}`);
  const index=sample(p,timeMs);
  if(index===null) return null;
  const frame=p.motion.frames[index]!,point=frame.landmarks[name]!,placement=p.clip.placement;
  const x=(point.x-frame.anchor.x)*placement.scale,y=(point.y-frame.anchor.y)*placement.scale;
  const angle=placement.rotation*Math.PI/180;
  return {x:placement.x+x*Math.cos(angle)-y*Math.sin(angle),y:placement.y+x*Math.sin(angle)+y*Math.cos(angle)};
}

function localSheetUrl(value:string):string {
  // A deliberately narrow URL alphabet avoids encoding, query/fragment, HTML and scheme ambiguity.
  if(value.length>240 || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value)
    || value.split('/').some(part=>part==='.'||part==='..'))
    throw new Error('Sprite sheet URL must be a safe local relative path');
  return value;
}

/** Count changed visual boundaries before expanding any repeated cycles. */
function visualEdges(p:Prepared,nodes:number[]) {
  const edges:Array<{frame:number;count:number}>=[];
  for(let frame=0;frame<nodes.length;frame++) {
    if(frame===0 && p.motion.playback.mode==='once')continue;
    const previous=frame===0?nodes.at(-1):nodes[frame-1];
    if(previous===nodes[frame])continue;
    const firstCycle=frame===0?1:0;
    let count=p.motion.playback.mode==='once'?1:Math.max(0,Math.ceil((p.end-boundary(p,firstCycle,frame))/(p.period/1000)));
    if(p.motion.playback.mode==='loop'){
      if(count>0 && boundary(p,firstCycle+count-1,frame)>=p.end)count--;
      if(boundary(p,firstCycle+count,frame)<p.end)count++;
    }
    if(count>0)edges.push({frame,count});
  }
  return edges;
}

export function compileActorMotion(motion:ActorMotion,clip:SpriteClip,sheetUrl?:string) {
  const p=prepare(motion,clip), url=localSheetUrl(sheetUrl??`assets/${p.motion.sheet.hash}.png`);
  const unique=new Map<string,number>();
  const visuals:ActorMotion['frames']=[];
  const nodes=p.motion.frames.map(frame=>{
    const key=JSON.stringify([frame.rect,frame.anchor]);
    let index=unique.get(key);
    if(index===undefined){index=visuals.length;unique.set(key,index);visuals.push(frame);}
    return index;
  });
  const {start,end}=p;
  const entryFrame=sampleClock(p,start),entryNode=entryFrame===null?null:nodes[entryFrame]!;
  const endFrame=sampleClock(p,end),endNode=endFrame===null?null:nodes[endFrame]!;
  const lastNode=nodes[activeFrame(p,end,false)]!;

  // Each entry is a distinct visual boundary, with its repetition count computed in O(frames).
  // No cycle/event generation happens until the complete literal-call budget is checked.
  const edges=visualEdges(p,nodes);
  const terminalCalls=endNode===lastNode?0:endNode===null?1:2;
  const eventCount=visuals.length+(start>0 && entryNode!==null?1:0)+edges.reduce((sum,edge)=>sum+2*edge.count,0)+terminalCalls;
  if(eventCount>MAX_EVENTS) throw new Error(`Sprite timeline requires ${eventCount} events; maximum is ${MAX_EVENTS}`);

  const prefix=`sprite-${p.clip.id}`, nodeId=(index:number)=>`${prefix}-frame-${index}`;
  const selector=(index:number)=>`[data-composition-id="${p.clip.compositionId}"] [id="${nodeId(index)}"]`;
  const calls:string[]=[];
  function set(index:number,opacity:number,seconds:number) {
    calls.push(`tl.set(${JSON.stringify(selector(index))},{opacity:${opacity},immediateRender:${seconds===0?'true':'false'}},${seconds});`);
  }
  visuals.forEach((_,index)=>set(index,start===0 && index===entryNode?1:0,0));
  if(start>0 && entryNode!==null) set(entryNode,1,start);
  const events:Array<{time:number;from:number;to:number}>=[];
  for(const edge of edges) for(let i=0;i<edge.count;i++) {
    const cycle=i+(edge.frame===0?1:0);
    events.push({time:boundary(p,cycle,edge.frame),from:nodes[edge.frame===0?nodes.length-1:edge.frame-1]!,to:nodes[edge.frame]!});
  }
  events.sort((a,b)=>a.time-b.time);
  for(const event of events){set(event.from,0,event.time);set(event.to,1,event.time);}
  if(endNode!==lastNode){set(lastNode,0,end);if(endNode!==null)set(endNode,1,end);}

  const {x,y,scale,rotation}=p.clip.placement;
  const artwork=visuals.map((frame,index)=>{
    const {rect,anchor}=frame, cropId=`${prefix}-crop-${index}`;
    const opacity=start===0 && index===entryNode?1:0;
    return `<g id="${nodeId(index)}" opacity="${opacity}" transform="translate(${-anchor.x} ${-anchor.y})"><defs><clipPath id="${cropId}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="${rect.w}" height="${rect.h}"/></clipPath></defs><g clip-path="url(#${cropId})"><image href="${url}" x="${-rect.x}" y="${-rect.y}" width="${p.motion.sheet.width}" height="${p.motion.sheet.height}" preserveAspectRatio="none"/></g></g>`;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" overflow="visible"><g id="${prefix}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${artwork}</g></svg>`;
  return {svg,js:calls.join('\n'),report:{
    producer:SPRITE_PLAYER_VERSION,actorId:p.motion.actorId,fingerprint:p.motion.fingerprint,
    frameCount:p.motion.frames.length,eventCount,nativeDurationMs:p.nativeDurationMs,
    clipDurationMs:p.clip.endMs-p.clip.startMs,sourceLoop:p.motion.source.loop,playback:{...p.motion.playback},
    productionReady:false as const,speechSync:'none' as const,
    warnings:[...p.motion.review.warnings,'GSAP clock resolution: 0.0001 ms; input clocks and absolute entry/frame/end boundaries share this resolution.',
      'Candidate motion: identity, pose anatomy, fluidity and speech synchronization have not been approved.'],
  }};
}
