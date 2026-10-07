import {ActorMotionSchema,type ActorMotion,type MotionPoint,type SpritePlacement,type SpriteClip} from './schemas.js';
import {compileActorMotion,createActorMotionSampler,motionLandmarkAt} from './player.js';
import {spriteSeconds} from './clock.js';
import {SpriteStageSchema,SPRITE_STAGE_VERSION,type SpriteStage,type SpriteStageClip} from './stage-schemas.js';

const MAX_STAGE_EVENTS=12000;
export const spriteMotionKey=(id:string,fingerprint:string)=>`${id}:${fingerprint}`;

function prepare(planInput:SpriteStage,motions:ReadonlyMap<string,ActorMotion>){
  const plan=SpriteStageSchema.parse(planInput);
  const actors=plan.actors.map(actor=>({actorId:actor.actorId,clips:actor.clips.map(clip=>{
    const source=motions.get(spriteMotionKey(clip.motionId,clip.fingerprint));
    if(!source)throw new Error(`Missing sprite motion: ${clip.motionId}/${clip.fingerprint}`);
    const motion=ActorMotionSchema.parse(source);
    if(motion.id!==clip.motionId || motion.fingerprint!==clip.fingerprint || motion.actorId!==actor.actorId)
      throw new Error(`Sprite motion identity mismatch: ${actor.actorId}/${clip.id}`);
    if(clip.sourcedAction && clip.sourcedAction.motionState!==motion.state)throw new Error(`Sprite sourced action uses a different registered state: ${clip.id}`);
    // Project across the strict player boundary; stage-only fields stay here.
    const playbackClip:SpriteClip={id:clip.id,compositionId:clip.compositionId,startMs:clip.startMs,endMs:clip.endMs,rate:clip.rate,placement:clip.placement};
    const sampleFrame=createActorMotionSampler(motion,playbackClip);
    return {clip,motion,playbackClip,sampleFrame};
  })}));
  return {plan,actors};
}
type PreparedStage=ReturnType<typeof prepare>;

function rootAt(clip:SpriteStageClip,seconds:number):SpritePlacement {
  const keys=clip.root;
  if(seconds<=spriteSeconds(keys[0]!.timeMs))return {...keys[0]!.transform};
  for(let i=1;i<keys.length;i++){
    const next=keys[i]!,previous=keys[i-1]!,end=spriteSeconds(next.timeMs);
    if(seconds<=end){
      const start=spriteSeconds(previous.timeMs),linear=(seconds-start)/(end-start);
      const progress=next.ease==='sine.inOut'?(1-Math.cos(Math.PI*linear))/2:linear;
      // GSAP AttrPlugin's complex-string renderer rounds changed interpolated
      // numbers to four decimals, while preserving exact endpoint/static strings.
      const value=(key:keyof SpritePlacement)=>{
        const before=previous.transform[key],after=next.transform[key];
        if(progress===0)return before;
        if(progress===1 || before===after)return after;
        return Math.round((before+(after-before)*progress)*10000)/10000;
      };
      return {x:value('x'),y:value('y'),scale:value('scale'),rotation:value('rotation')};
    }
  }
  return {...keys.at(-1)!.transform};
}
function transformPoint(point:MotionPoint,transform:SpritePlacement):MotionPoint {
  const angle=transform.rotation*Math.PI/180,x=point.x*transform.scale,y=point.y*transform.scale;
  return {x:transform.x+x*Math.cos(angle)-y*Math.sin(angle),y:transform.y+x*Math.sin(angle)+y*Math.cos(angle)};
}

export interface SpriteActorSample {
  actorId:string;clipId:string;motionId:string;fingerprint:string;view:ActorMotion['view'];frameIndex:number;
  root:SpritePlacement;
  /** Conservative rectangle of the source frame, including transparent margins. */
  bounds:{left:number;right:number;top:number;bottom:number};
  landmarks:Record<string,MotionPoint>;
}
function samplePrepared(prepared:PreparedStage,timeMs:number):SpriteActorSample[]{
  const seconds=spriteSeconds(timeMs),samples:SpriteActorSample[]=[];
  if(seconds<0 || seconds>=spriteSeconds(prepared.plan.durationMs))return samples;
  for(const actor of prepared.actors)for(const {clip,motion,sampleFrame} of actor.clips){
    if(seconds<spriteSeconds(clip.startMs) || seconds>=spriteSeconds(clip.endMs))continue;
    const frameIndex=sampleFrame(timeMs);
    if(frameIndex===null)continue;
    const frame=motion.frames[frameIndex]!,root=rootAt(clip,seconds);
    const world=(point:MotionPoint)=>transformPoint(transformPoint({x:point.x-frame.anchor.x,y:point.y-frame.anchor.y},clip.placement),root);
    const corners=[world({x:0,y:0}),world({x:frame.rect.w,y:0}),world({x:0,y:frame.rect.h}),world({x:frame.rect.w,y:frame.rect.h})];
    const landmarks=Object.fromEntries(Object.entries(frame.landmarks).map(([name,point])=>[name,world(point)]));
    samples.push({actorId:actor.actorId,clipId:clip.id,motionId:motion.id,fingerprint:motion.fingerprint,view:motion.view,frameIndex,root,
      bounds:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))},landmarks});
  }
  return samples;
}

export function sampleSpriteStage(plan:SpriteStage,motions:ReadonlyMap<string,ActorMotion>,timeMs:number):SpriteActorSample[]{
  return samplePrepared(prepare(plan,motions),timeMs);
}
export function createSpriteStageSampler(plan:SpriteStage,motions:ReadonlyMap<string,ActorMotion>):(timeMs:number)=>SpriteActorSample[]{
  const prepared=prepare(plan,motions);
  return timeMs=>samplePrepared(prepared,timeMs);
}
const rootTransform=(root:SpritePlacement)=>`translate(${root.x} ${root.y}) rotate(${root.rotation}) scale(${root.scale})`;

export function compileSpriteStage(planInput:SpriteStage,motions:ReadonlyMap<string,ActorMotion>,targets:ReadonlyMap<string,MotionPoint>=new Map()){
  const prepared=prepare(planInput,motions),{plan}=prepared;
  const contacts=plan.contacts.map(contact=>{
    const target=targets.get(contact.targetId);
    if(!target || !Number.isFinite(target.x) || !Number.isFinite(target.y))throw new Error(`Missing/invalid scene target: ${contact.targetId}`);
    const actor=prepared.actors.find(actor=>actor.actorId===contact.actorId)!;
    const binding=actor.clips.find(({clip})=>clip.id===contact.clipId)!;
    const point=motionLandmarkAt(binding.motion,binding.playbackClip,contact.landmark,contact.timeMs);
    // All frames require registration; visibility must also match the outer scene slot.
    if(point===null || !samplePrepared(prepared,contact.timeMs).some(sample=>sample.actorId===contact.actorId && sample.clipId===contact.clipId))
      throw new Error(`Hidden sprite contact: ${contact.id}`);
    const measured=transformPoint(point,rootAt(binding.clip,spriteSeconds(contact.timeMs)));
    const errorPx=Math.hypot(measured.x-target.x,measured.y-target.y);
    if(errorPx>contact.maxErrorPx)throw new Error(`Sprite contact exceeds tolerance: ${contact.id} (${errorPx} px)`);
    return {...contact,target:{...target},measured,errorPx};
  });

  let eventCount=0;
  const calls:string[]=[],actors:string[]=[],clipReports:Array<ReturnType<typeof compileActorMotion>['report'] & {clipId:string;motionId:string;sourceRefs:SpriteStageClip['sourceRefs'];dom:{slotId:string;rootId:string;artworkId:string}}> = [];
  let slotNumber=0;
  const selector=(id:string)=>JSON.stringify(`[data-composition-id="${plan.id}"] [id="${id}"]`);
  for(const actor of prepared.actors){
    const slots:string[]=[];
    for(const {clip,motion,playbackClip} of actor.clips){
      // Ordinal namespaces are internal and disjoint by role. Raw public IDs
      // such as "slot-c" or "c-frame-0" cannot collide with generated node IDs.
      const ordinal=slotNumber++,playerId=`stage.motion.${ordinal}`;
      const slotId=`sprite-stage-slot-${ordinal}`,rootId=`sprite-stage-root-${ordinal}`,artworkId=`sprite-${playerId}`;
      const compiled=compileActorMotion(motion,{...playbackClip,id:playerId}),start=spriteSeconds(clip.startMs),end=spriteSeconds(clip.endMs);
      const wrapperCalls=1+(start>0?1:0)+1,rootCalls=clip.root.length;
      eventCount+=compiled.report.eventCount+wrapperCalls+rootCalls;
      if(eventCount>MAX_STAGE_EVENTS)throw new Error(`Sprite stage exceeds ${MAX_STAGE_EVENTS} timeline calls`);
      const first=clip.root[0]!.transform;
      calls.push(`tl.set(${selector(slotId)},{opacity:${start===0?1:0},immediateRender:true},0);`);
      if(start>0)calls.push(`tl.set(${selector(slotId)},{opacity:1,immediateRender:false},${start});`);
      calls.push(`tl.set(${selector(slotId)},{opacity:0,immediateRender:false},${end});`);
      calls.push(`tl.set(${selector(rootId)},${JSON.stringify({attr:{transform:rootTransform(first)},immediateRender:true})},0);`);
      for(let i=1;i<clip.root.length;i++){
        const key=clip.root[i]!,at=spriteSeconds(clip.root[i-1]!.timeMs),duration=spriteSeconds(key.timeMs)-at;
        calls.push(`tl.to(${selector(rootId)},${JSON.stringify({attr:{transform:rootTransform(key.transform)},duration,ease:key.ease,immediateRender:false})},${at});`);
      }
      calls.push(compiled.js);
      const artwork=compiled.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
      slots.push(`<g id="${slotId}" data-clip-id="${clip.id}" opacity="${start===0?1:0}"><g id="${rootId}" transform="${rootTransform(first)}">${artwork}</g></g>`);
      clipReports.push({...compiled.report,clipId:clip.id,motionId:motion.id,sourceRefs:clip.sourceRefs,dom:{slotId,rootId,artworkId}});
    }
    actors.push(`<g data-actor-id="${actor.actorId}">${slots.join('')}</g>`);
  }
  return {svg:actors.join(''),js:calls.join('\n'),report:{producer:SPRITE_STAGE_VERSION,compositionId:plan.id,durationMs:plan.durationMs,eventCount,
    actors:prepared.actors.map(actor=>({actorId:actor.actorId,clipIds:actor.clips.map(({clip})=>clip.id)})),clips:clipReports,contacts,
    productionReady:false as const,speechSync:'none' as const,contactCoverage:'declared-points-only' as const,
    boundsKind:'source-frame-rectangle' as const,rootPrecision:'GSAP-AttrPlugin-4-decimals' as const,warnings:['Candidate actor fragment; scene camera, anatomy, identity, fluidity, foot support and speech remain unaccepted.','Caller must pad the shared timeline to the full scene duration. No independent timer or timeline is created.']}};
}
export type SpriteStageCompilation=ReturnType<typeof compileSpriteStage>;
