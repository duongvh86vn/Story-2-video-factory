import type {Shot} from '../core/schemas.js';
import type {ActorMotion,MotionPoint} from './schemas.js';
import {createSpriteStageSampler,spriteMotionKey,type SpriteActorSample} from './stage.js';
import {spriteSeconds} from './clock.js';
import {validateSpriteScenePlan} from './scene-validation.js';
import {CameraSchema} from '../director/schemas.js';
import {cameraMatrixAt,cameraPoint,cameraModelLabel,CAMERA_VIEWPORT,type CameraMatrix} from '../director/camera.js';
import {rendersModelLabel} from '../director/art-direction-schemas.js';

const MAX_SAMPLES=30000;
/** Match cameraTimeline's rounded matrix endpoints and AttrPlugin interior precision. */
export function spriteCameraMatrixAt(shot:Shot,timeMs:number):CameraMatrix{
  const c=shot.cinematic!,p=c.performance;
  const endpoints=[cameraMatrixAt(c.camera,p.stage,p.durationMs,0),cameraMatrixAt(c.camera,p.stage,p.durationMs,p.durationMs)]
    .map(matrix=>({scale:Number(matrix.scale.toFixed(6)),x:Number(matrix.x.toFixed(6)),y:Number(matrix.y.toFixed(6))}));
  const first=endpoints[0]!,last=endpoints[1]!,ratio=Math.max(0,Math.min(1,spriteSeconds(timeMs)/spriteSeconds(p.durationMs))),ease=(1-Math.cos(Math.PI*ratio))/2;
  const value=(key:keyof CameraMatrix)=>ratio===0?first[key]:ratio===1||first[key]===last[key]?last[key]:Math.round((first[key]+(last[key]-first[key])*ease)*10000)/10000;
  return {scale:value('scale'),x:value('x'),y:value('y')};
}

/** Sample all native frame boundaries (both sides), root/contact keys and output frame clock.
 * Candidate report is intentionally a sampled check, not a continuous-motion proof.
 */
export function validateSpriteCamera(shot:Shot,motions:ReadonlyMap<string,ActorMotion>){
  const plan=validateSpriteScenePlan(shot),c=shot.cinematic!,camera=CameraSchema.parse(c.camera),{width,height}=plan.stage;
  if(shot.camera.angle!=='eye-level')throw new Error(`${shot.id}: sprite camera supports eye-level 2D framing`);
  if(camera.anchor.x<0||camera.anchor.x>width||camera.anchor.y<0||camera.anchor.y>height)throw new Error(`${shot.id}: sprite camera anchor outside stage`);
  const delta=camera.endScale-camera.startScale;
  if(camera.movement==='push-in'&&delta<=0||camera.movement==='pull-out'&&delta>=0||['locked','pan-left','pan-right'].includes(camera.movement)&&delta!==0)
    throw new Error(`${shot.id}: sprite camera movement/scale mismatch`);
  const sample=createSpriteStageSampler(plan,motions),times=new Set<number>();
  function add(ms:number){
    const clock=spriteSeconds(ms)*1000;
    if(clock>=0&&spriteSeconds(clock)<spriteSeconds(plan.durationMs))times.add(clock);
    if(times.size>MAX_SAMPLES)throw new Error(`${shot.id}: sprite camera exceeds ${MAX_SAMPLES} declared samples`);
  }
  const boundary=(ms:number)=>{add(ms);add(ms-.0001);};
  add(0);add(plan.durationMs-.0001);
  for(let ms=0;ms<plan.durationMs;ms+=1000/c.performance.fps)add(ms);
  for(const actor of plan.actors)for(const clip of actor.clips){
    boundary(clip.startMs);boundary(clip.endMs);clip.root.forEach(key=>boundary(key.timeMs));
    const motion=motions.get(spriteMotionKey(clip.motionId,clip.fingerprint))!,period=motion.frames.reduce((sum,f)=>sum+f.durationMs,0)/clip.rate;
    const cycles=motion.playback.mode==='once'?1:Math.ceil((clip.endMs-clip.startMs)/period);
    // Cap work even when repeated equal artwork means few visual timeline calls.
    if(cycles*motion.frames.length>MAX_SAMPLES)throw new Error(`${shot.id}: sprite camera native frame sampling exceeds limit`);
    for(let cycle=0;cycle<cycles;cycle++){
      let offset=0;
      for(const frame of motion.frames){const at=clip.startMs+cycle*period+offset;if(at<clip.endMs)boundary(at);offset+=frame.durationMs/clip.rate;}
    }
    if(motion.playback.mode==='once')boundary(Math.min(clip.endMs,clip.startMs+period));
  }
  plan.contacts.forEach(contact=>boundary(contact.timeMs));
  const inView=(point:MotionPoint,matrix:CameraMatrix,pad=0)=>{
    const screen=cameraPoint(point,matrix);
    return screen.x-pad>=width*CAMERA_VIEWPORT.left-.01&&screen.x+pad<=width*CAMERA_VIEWPORT.right+.01&&screen.y-pad>=height*CAMERA_VIEWPORT.top-.01&&screen.y+pad<=height*CAMERA_VIEWPORT.bottom+.01;
  };
  const checkedActors=new Set<string>();
  const contactParts=new Set(plan.contacts.map(contact=>contact.targetId));
  for(const event of shot.visualization?.events??[])if(event.contactRequired&&contactParts.has(event.contactPartId??event.targetId)){
    contactParts.add(event.targetId);
    if(event.relationTo)contactParts.add(event.relationTo);
  }
  const ratios:Record<string,{min:number;max:number}>=Object.create(null);
  for(const time of times){
    const matrix=spriteCameraMatrixAt(shot,time),actors=sample(time);
    const checkBounds=(bounds:SpriteActorSample['bounds'],label:string)=>{
      if(!inView({x:bounds.left,y:bounds.top},matrix)||!inView({x:bounds.right,y:bounds.bottom},matrix))throw new Error(`${shot.id}: sprite camera crops ${label} at ${time} ms or crosses subtitle clearance`);
    };
    for(const actor of actors){
      checkedActors.add(actor.actorId);const ratio=(actor.bounds.bottom-actor.bounds.top)*matrix.scale/height,prior=ratios[actor.actorId];
      ratios[actor.actorId]={min:Math.min(prior?.min??ratio,ratio),max:Math.max(prior?.max??ratio,ratio)};
      if(camera.framing!=='close')checkBounds(actor.bounds,actor.actorId);
      else if(camera.focus==='face'&&actor.actorId===c.actorScene?.primary?.id){
        for(const key of ['face_left','face_right','face_top','face_bottom']){
          const point=actor.landmarks[key];if(!point)throw new Error(`${shot.id}: sprite face focus needs registered ${key}`);
          if(!inView(point,matrix))throw new Error(`${shot.id}: sprite face focus crops ${key}`);
        }
      }
    }
    for(const part of shot.visualization?.parts??[]){
      const required=camera.framing!=='close'||camera.focus==='object'||camera.focus==='contact'&&contactParts.has(part.id);
      if(!required)continue;
      checkBounds({left:(part.x-part.width*.56)*width,right:(part.x+part.width*.56)*width,top:(part.y-part.height*.6)*height,bottom:(part.y+part.height*.6)*height},part.id);
      if(rendersModelLabel(shot,part.id)){
        const label=cameraModelLabel(part,height,width);if(label.lines.length>4)throw new Error(`${shot.id}: sprite model label too long`);
        checkBounds({left:(part.x-part.width*.56)*width,right:(part.x+part.width*.56)*width,top:label.labelY-label.font,bottom:label.labelY+label.labelHeight},`${part.id} label`);
      }
    }
  }
  if(plan.actors.some(actor=>!checkedActors.has(actor.actorId)))throw new Error(`${shot.id}: sprite camera has an actor with no visible sampled artwork`);
  if(camera.framing==='close'){
    if(camera.focus==='object')throw new Error(`${shot.id}: object-only close cannot declare sprite actors`);
    if(camera.focus==='face'&&(!c.actorScene?.primary||plan.contacts.length))throw new Error(`${shot.id}: sprite face close requires a primary actor and no hidden contact`);
    if(camera.focus==='contact'){
      if(!plan.contacts.length)throw new Error(`${shot.id}: sprite contact close needs registered contact`);
      for(const contact of plan.contacts){
        const point=sample(contact.timeMs).find(actor=>actor.actorId===contact.actorId)?.landmarks[contact.landmark];
        if(!point||!inView(point,spriteCameraMatrixAt(shot,contact.timeMs),8))throw new Error(`${shot.id}: sprite contact close crops registered hand`);
      }
    }
  }
  return {producer:'sprite-camera-1',scope:'sampled-frame-bounds-and-registered-landmarks' as const,sampleCount:times.size,ratios,productionReady:false as const};
}
