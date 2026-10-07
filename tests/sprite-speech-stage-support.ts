// Candidate metadata only. No real character artwork or acoustic speaker proof.
import {cinematicSpriteFixture} from './cinematic-sprite-support.js';
import {speechClockFixture} from './sprite-speech-support.js';
import {spriteMotionKey} from '../packages/motion/stage.js';
import {spriteSpeechKey} from '../packages/motion/speech-schemas.js';
import {bindActorShot} from '../packages/actors/model.js';

export function spriteSpeechStageFixture(two=false){
  const f=cinematicSpriteFixture(),voice=speechClockFixture(),c=f.shot.cinematic!,plan=c.spriteStage!,clip=plan.actors[0]!.clips[0]!;
  const ref={kind:'narration' as const,segmentId:'s1',quote:'Lila speaks.'};
  f.shot.sourceRefs=[ref];c.sourceRefs=[ref];f.shot.narrationSegmentIds=['s1'];
  c.actorScene!.primary!.sourceRefs=[ref];c.actorScene!.primary!.role='speaks';c.actorScene!.speakingSegmentIds=['s1'];
  c.sceneIntent!.action=ref.quote;c.sceneIntent!.sourceRefs=[ref];c.sceneIntent!.participants[0]!.sourceRefs=[ref];c.sceneIntent!.participants[0]!.role='speaks';
  c.sceneIntent!.acting=[{participantId:'lila',kind:'speech',statement:ref.quote,sourceRefs:[ref]}];
  f.shot.visualization!.sceneIntent=structuredClone(c.sceneIntent!);
  clip.motionId=voice.motion.id;clip.fingerprint=voice.motion.fingerprint;clip.placement={x:300,y:550,scale:4,rotation:0};
  clip.sourceRefs=[ref];clip.sourcedAction={kind:'hold',statement:ref.quote,motionState:'idle'};
  clip.speech={variantId:voice.variant.id,fingerprint:voice.variant.fingerprint,segmentIds:['s1']};
  const motions=new Map([[spriteMotionKey(voice.motion.id,voice.motion.fingerprint),voice.motion]]),variants=new Map([[spriteSpeechKey(voice.variant.id,voice.variant.fingerprint),voice.variant]]);
  const narration={mode:'script' as const,durationMs:3000,segments:[{id:'s1',startMs:2000,endMs:two?2500:3000,text:ref.quote}],words:[]};
  const activity={method:'audio-rms' as const,audioHash:'e'.repeat(64),windowMs:20,intervals:[{startMs:2000,endMs:2250,level:.6},{startMs:2400,endMs:2550,level:.5},{startMs:2750,endMs:2950,level:.5}]};
  if(two){
    const otherRef={kind:'narration' as const,segmentId:'s2',quote:'Karo speaks.'},character=structuredClone(c.actorScene!.primary!);
    character.id='karo';character.name='Karo';character.sourceRefs=[otherRef];
    c.actorScene!.supporting=[{character,performance:{...structuredClone(c.performance),leadCharacterId:'karo'},actions:[],speakingSegmentIds:['s2']}];
    f.shot.sourceRefs.push(otherRef);c.sourceRefs.push(otherRef);f.shot.narrationSegmentIds.push('s2');
    c.sceneIntent!.participants.push({id:'karo',name:'Karo',role:'speaks',identity:'fictional',sourceRefs:[otherRef]});
    c.sceneIntent!.acting!.push({participantId:'karo',kind:'speech',statement:otherRef.quote,sourceRefs:[otherRef]});
    c.sceneIntent!.sourceRefs.push(otherRef);f.shot.visualization!.sceneIntent=structuredClone(c.sceneIntent!);
    narration.segments.push({id:'s2',startMs:2500,endMs:3000,text:otherRef.quote});
    const otherMotion={...structuredClone(voice.motion),id:'karo-idle',actorId:'karo'},otherVariant={...structuredClone(voice.variant),id:'karo-open',actorId:'karo',motionId:otherMotion.id,fingerprint:'f'.repeat(64)};
    motions.set(spriteMotionKey(otherMotion.id,otherMotion.fingerprint),otherMotion);variants.set(spriteSpeechKey(otherVariant.id,otherVariant.fingerprint),otherVariant);
    const otherClip=structuredClone(clip);otherClip.id='karo.clip';otherClip.motionId=otherMotion.id;otherClip.placement.x=850;otherClip.sourceRefs=[otherRef];otherClip.sourcedAction!.statement=otherRef.quote;
    otherClip.speech={variantId:otherVariant.id,fingerprint:otherVariant.fingerprint,segmentIds:['s2']};plan.actors.push({actorId:'karo',clips:[otherClip]});
  }
  bindActorShot(f.shot,f.profile,f.rig);
  return {...f,plan,clip,motions,variants,narration,activity,context:{variants,narration,activity,shotStartMs:f.shot.startMs}};
}
