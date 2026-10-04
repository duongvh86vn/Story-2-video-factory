import type {Shot,Narration,Storyboard} from '../core/schemas.js';
import type {SourceRefSchema} from '../explainer/schemas.js';
import type {z} from 'zod';
import {hash} from '../core/utils.js';
import {HostProfileSchema,HostActions,type HostProfile,type HostRig} from '../host/schemas.js';
import {buildRig} from '../host/rig.js';
import {HOST_COMPILER_VERSION} from '../host/profile.js';
import {artworkSvg} from '../director/art-direction.js';
import type {ActorDefinition} from './schemas.js';
import type {SpeechActivity} from '../voice/schemas.js';
import {postureAt} from '../animation/compiler.js';
import {sameSeatSupport} from '../animation/support.js';
import {validateSceneIntent} from '../explainer/plan.js';

export function actorProfile(character:ActorDefinition,_base?:HostProfile):HostProfile{
  for(const [i,layer] of (character.costume??[]).entries())artworkSvg(layer.svg,`actor.${character.id}.${i}`);
  const definition={id:character.id,version:1,kind:character.kind,role:'story-actor' as const,name:character.name,
    description:`${character.role}; ${character.identity}; stylized illustration`,appearance:character.appearance,costume:character.costume,
    actions:[...HostActions],immutable:['cast identity','face design','costume baseline','rig proportions'],
    compilerVersion:HOST_COMPILER_VERSION,sourcePath:'work/actor-cast.json'};
  return HostProfileSchema.parse({...definition,profileHash:hash(definition)});
}
export function shotPerformer(shot:Shot,base:HostProfile,rig:HostRig):{profile:HostProfile;rig:HostRig}{
  const actor=shot.cinematic?.actorScene?.primary;
  if(!actor)return {profile:base,rig};
  const profile=actorProfile(actor,base);return {profile,rig:buildRig(profile)};
}
/** Derived renderer identity follows the cast definition, never the seed presenter. */
export function bindActorShot(shot:Shot,base:HostProfile,rig:HostRig):void{
  const scene=shot.cinematic?.actorScene;if(!scene)return;
  const performer=shotPerformer(shot,base,rig),c=shot.cinematic!,p=c.performance;
  c.leadCharacterId=performer.profile.id;p.leadCharacterId=performer.profile.id;
  p.profileHash=performer.profile.profileHash;p.kind=performer.profile.kind;p.id=shot.id;
  shot.host={...shot.host!,id:performer.profile.id,profileVersion:performer.profile.version,rigHash:performer.rig.rigHash,
    presence:scene.primary?'beside-model':'absent'};
  for(const actor of scene.supporting){const definition=actorProfile(actor.character);actor.performance.profileHash=definition.profileHash;
    actor.performance.leadCharacterId=definition.id;actor.performance.kind=definition.kind;actor.performance.id=shot.id;}
}
export function actorSpeech(activity:SpeechActivity,narration:Narration|undefined,segments:string[],startMs:number,endMs:number):SpeechActivity{
  const windows=narration?.segments.filter(s=>segments.includes(s.id))??[];
  return {...activity,intervals:activity.intervals.flatMap(interval=>windows.flatMap(window=>{
    const start=Math.max(interval.startMs,window.startMs,startMs),end=Math.min(interval.endMs,window.endMs,endMs);
    return end>start?[{...interval,startMs:start,endMs:end}]:[];
  }))};
}
export function actorActions(shot:Shot){
  const scene=shot.cinematic?.actorScene;
  return [...(scene?.primary===null?[]:shot.host?.actions??[]),...(scene?.supporting.flatMap(a=>a.actions)??[])];
}
export function validateActorCast(board:Storyboard,narration:Narration,sourceRefs:z.infer<typeof SourceRefSchema>[]=[]):void{
  const identities=new Map<string,string>();
  for(const shot of board.shots){const scene=shot.cinematic?.actorScene;if(!scene)continue;
    const actors=[...(scene.primary?[{character:scene.primary,speakingSegmentIds:scene.speakingSegmentIds}]:[]),...scene.supporting];
    if(new Set(actors.map(a=>a.character.id)).size!==actors.length)throw new Error(`${shot.id}: duplicate cast actor`);
    for(const actor of actors){
      const {character}=actor,current=hash(character),prior=identities.get(character.id);
      if(!character.name.trim()||!character.role.trim())throw new Error(`${shot.id}: actor name and role must contain source identity text`);
      if(prior&&prior!==current)throw new Error(`${shot.id}: actor ${character.id} changed identity`);identities.set(character.id,current);
      for(const ref of character.sourceRefs){
        const segment=narration.segments.find(s=>s.id===ref.segmentId);
        const valid=ref.kind==='source'?sourceRefs.some(r=>r.kind==='source'&&hash(r)===hash(ref))
          :!!segment&&!!ref.quote.trim()&&segment.text.normalize('NFC').includes(ref.quote.normalize('NFC'));
        if(!valid)throw new Error(`${shot.id}: actor ${character.id} has unverifiable source evidence`);
      }
      if(['historical','fictional'].includes(character.identity)&&!character.sourceRefs.some(r=>r.kind==='narration'&&r.quote.normalize('NFC').toLocaleLowerCase().includes(character.name.normalize('NFC').toLocaleLowerCase())))throw new Error(`${shot.id}: named actor ${character.name} lacks exact narration identity`);
      if(['historical','fictional'].includes(character.identity)&&!character.sourceRefs.some(r=>r.kind==='narration'&&r.quote.normalize('NFC').toLocaleLowerCase().includes(character.role.trim().normalize('NFC').toLocaleLowerCase())))throw new Error(`${shot.id}: ${character.identity} actor ${character.name} role must be a literal excerpt of verified narration evidence`);
      if(actor.speakingSegmentIds.some(id=>!shot.narrationSegmentIds?.includes(id)))throw new Error(`${shot.id}: actor speech is outside this shot's narration anchors`);
    }
  }
  for(const [index,shot] of board.shots.entries()){
    const scene=shot.cinematic?.actorScene,prior=board.shots[index-1]?.cinematic?.actorScene;
    if(!scene||scene.continuity!=='continuous'||!prior)continue;
    const performances=(s:Shot)=>new Map([...(s.cinematic!.actorScene!.primary?[{id:s.cinematic!.actorScene!.primary!.id,p:s.cinematic!.performance}]:[]),
      ...s.cinematic!.actorScene!.supporting.map(a=>({id:a.character.id,p:a.performance}))].map(a=>[a.id,a.p]));
    const before=performances(board.shots[index-1]!),after=performances(shot);
    if(hash([...before.keys()].sort())!==hash([...after.keys()].sort()))throw new Error(`${shot.id}: continuous scene changed its cast; use a cut`);
    for(const [id,p] of after){const old=before.get(id)!;
      const exit={x:old.walks.at(-1)?.toX??old.root.x,y:old.stage.groundY};
      const facing=old.turns?.at(-1)?.direction??old.facing??'front';
      if(hash(exit)!==hash(p.root)||old.scale!==p.scale||facing!==(p.facing??'front'))throw new Error(`${shot.id}: actor ${id} jumps position, facing or scale in continuous action`);
      if(hash(postureAt(old,old.durationMs))!==hash(postureAt(p,0)))throw new Error(`${shot.id}: actor ${id} changes body posture at a continuous cut; preserve entryPosture or use a cut`);
      for(const seatId of Object.keys(postureAt(old,old.durationMs).seatWeights??{})){
        if(!sameSeatSupport(old.supports?.find(s=>s.id===seatId),p.supports?.find(s=>s.id===seatId)))throw new Error(`${shot.id}: actor ${id} changes seat geometry at a continuous cut`);
      }
      if(old.props.length||p.props.length)throw new Error(`${shot.id}: continuous actor props require a supported handoff; use an explicit cut`);
    }
  }
}
export function seedActorStoryboard(board:Storyboard,base:HostProfile,rig:HostRig,narration:Narration):Storyboard{
  const result=structuredClone(board);
  for(const shot of result.shots){if(!shot.cinematic)continue;
    const c=shot.cinematic,intent=c.sceneIntent;
    if(intent)validateSceneIntent(intent,narration,shot.sourceRefs??[],shot.narrationSegmentIds??[]);
    seedActorShot(shot,base,rig);
  }
  return result;
}
/** Builds an editable cast seed; final narration/source validation remains mandatory. */
export function seedActorShot(shot:Shot,base:HostProfile,rig:HostRig):void{
    const c=shot.cinematic! ,intent=c.sceneIntent;
    // Already directed cast is authoritative; a seed conversion must not redesign it.
    if(c.actorScene){bindActorShot(shot,base,rig);return;}
    const characters=(intent?.participants??[]).map(participant=>({id:participant.id,name:participant.name,role:participant.role,
      identity:participant.identity,kind:base.kind,sourceRefs:participant.sourceRefs,appearance:base.appearance} satisfies ActorDefinition));
    c.actorScene={primary:characters[0]??null,speakingSegmentIds:[],continuity:'cut',supporting:characters.slice(1).map((character,i)=>{
      const performance=structuredClone(c.performance);
      performance.root={x:performance.stage.width*(.24+.48*(i+1)/(characters.length-1)),y:performance.stage.groundY};
      performance.walks=[];performance.turns=[];performance.gestures=[];performance.gazes=[];performance.props=[];
      performance.entryPosture=undefined;performance.postures=[];performance.supports=[];
      return {character,performance,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:[]};
    })};
    if(!characters.length){
      // A mechanism/cutaway without a sourced participant is not a universal researcher.
      shot.host!.actions=[{type:'idle',startMs:shot.startMs,endMs:shot.endMs}];
      c.performance.walks=[];c.performance.turns=[];c.performance.gestures=[];c.performance.gazes=[];c.performance.props=[];
      c.propBindings=[];c.continuity.exit={...c.performance.root};c.continuity.facing=c.performance.facing??'front';
    }
    bindActorShot(shot,base,rig);
}
