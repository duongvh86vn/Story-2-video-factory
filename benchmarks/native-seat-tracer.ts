/** Candidate diagnostic only. Calling this builder evaluates native plans/camera;
 * implementation agents must not invoke it while runtime tests are delegated. */
import {ConfigSchema} from '../packages/core/config.js';
import {BeatSchema,NarrationSchema,ShotSchema,StoryboardSchema} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {BODY_SOURCE_VERSION} from '../packages/animation/schemas.js';
import {BODY_VIEW_SEAT_SELECTION} from '../packages/animation/body-view-seat.js';
import {bodyRootAt} from '../packages/animation/view-source-body.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {buildRig} from '../packages/host/rig.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {planCamera} from '../packages/director/camera.js';
import type {ArtDirection} from '../packages/director/art-direction-schemas.js';
import type {SceneIntent} from '../packages/explainer/schemas.js';

export const NATIVE_SEAT_TRACER_VERSION='native-seat-tracer-2';
export const NATIVE_SEAT_TRACER_SCOPE='unapproved-native-seat-motion-tracer';
export const NATIVE_SEAT_TRACER_CUTS=[0,900,2400,3800,4800,7200] as const;
export const NATIVE_SEAT_TRACER_DURATION_MS=7200;
export type NativeSeatActor='lila'|'karo';
export type NativeSeatView='three-quarter-left'|'three-quarter-right';

/** Same original physical run for assertions and the media exporter. */
export function nativeSeatPhysicalActor(actor:NativeSeatActor,view:NativeSeatView,scale=1,rootX?:number){
  const f=bodyCalibrationPlan(actor,view==='three-quarter-left'?'sit-walk-left':'sit-walk-right','happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1','registered-locomotion-v1','registered-secondary-v1',BODY_VIEW_SEAT_SELECTION);
  const p=f.plan,oldX=p.root.x,oldY=p.root.y,newX=rootX??oldX,newY=rootX===undefined?oldY:540;
  p.scale=scale;p.root={x:newX,y:newY};if(rootX!==undefined)p.stage={width:1280,height:720,groundY:newY};
  for(const seat of p.supports??[]){seat.id=actor+'-log';seat.center={x:newX+(seat.center.x-oldX)*scale,y:newY+(seat.center.y-oldY)*scale};seat.width*=scale;if(seat.backHeight!==undefined)seat.backHeight*=scale;}
  for(const pose of p.postures??[])if(pose.supportId)pose.supportId=actor+'-log';
  for(const walk of p.walks){walk.fromX=newX+(walk.fromX-oldX)*scale;walk.toX=newX+(walk.toX-oldX)*scale;}
  return f;
}

function forestDirection():ArtDirection{
  const keyframes=[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}];
  return {origin:'authored',brief:'Two forest actors facing each other in a vivid green clearing. The same two physical seats remain in world space through every camera cut. Diagnostic illustration; reference and video quality have not been accepted.',useEnvironment:false,
    palette:{background:'#53AFDE',surface:'#F2BF66',ink:'#24180D',accent:'#D57423'},showHeading:false,models:[],layers:[
      {id:'sky',plane:'background',coordinateSpace:'frame',role:'decoration',keyframes,svg:'<defs><linearGradient id="sky-light" x2="0" y2="1"><stop stop-color="#43A3D9"/><stop offset="1" stop-color="#B8E5EB"/></linearGradient></defs><rect width="1280" height="720" fill="url(#sky-light)"/><circle cx="1030" cy="120" r="65" fill="#FFD77A"/><path d="M130 145Q150 105 180 137Q210 86 246 136Q300 110 330 155H120Z" fill="#EFF8EE"/><path d="M700 195Q730 152 760 174Q788 132 821 175Q850 152 884 199H690Z" fill="#D5F0ED"/><path d="M0 370L180 230L350 365L530 210L740 378L950 245L1280 390V720H0Z" fill="#629FA9"/>'},
      {id:'clearing',plane:'background',coordinateSpace:'world',role:'decoration',keyframes,svg:'<path d="M0 370Q150 285 330 360T700 350T1030 350T1280 320V720H0Z" fill="#3F7D32"/><path d="M0 482Q200 370 430 457T870 448T1280 458V720H0Z" fill="#619338"/><path d="M0 540Q600 495 1280 540V720H0Z" fill="#D5A259"/><path d="M0 600Q470 550 1280 630V720H0Z" fill="#E6B76A"/>'},
      {id:'trees',plane:'midground',role:'decoration',keyframes,svg:'<path d="M60 540L85 240L122 220L136 540Z" fill="#80502D" stroke="#392819" stroke-width="4"/><path d="M109 365L25 268M112 310L202 244" stroke="#694021" stroke-width="18" stroke-linecap="round"/><path d="M0 178Q44 105 104 164Q150 92 211 179Q249 206 218 255Q126 294 10 249Z" fill="#285E2F" stroke="#234A26" stroke-width="4"/><path d="M1170 540L1153 280L1190 263L1214 540Z" fill="#8C5731" stroke="#392819" stroke-width="4"/><path d="M1177 367L1103 295M1180 344L1251 265" stroke="#71472A" stroke-width="16" stroke-linecap="round"/><path d="M1060 218Q1075 166 1130 181Q1177 128 1234 173Q1270 149 1280 195V287Q1150 321 1060 270Z" fill="#397337" stroke="#28552B" stroke-width="4"/>'},
      {id:'near-leaves',plane:'foreground',role:'decoration',keyframes,svg:'<path d="M0 640Q50 610 89 627Q59 660 11 653M10 684Q70 652 110 676Q76 707 10 707M1184 678Q1210 637 1280 643V680Q1221 703 1184 678Z" fill="#2D6533" stroke="#234828" stroke-width="3"/>'},
    ]};
}

/** Fixed cue clock is a labelled silent SRT draft, not invented script/TTS timing.
 * No model, provider, server, fixture bootstrap or file writes are performed here. */
export function createNativeSeatTracer(){
  const config=ConfigSchema.parse({project:{name:'Native seat motion tracer',language:'en'},input:{mode:'srt'},presentation:{mode:'story-cinematic',character_mode:'actors',actor_renderer:'rig'},
    rendering:{draft:{width:1280,height:720,fps:60,quality:'looks'},final:{width:1280,height:720,fps:60,quality:'delivery'}},captions:{mode:'burned',font:'Arial',font_size:20}});
  const first='Lila and Karo sit down together. Lila talks while Karo listens.',last='Karo replies. They stand and walk together.',text=first+' '+last;
  const narration=NarrationSchema.parse({mode:'srt',durationMs:NATIVE_SEAT_TRACER_DURATION_MS,segments:[{id:'lila-cue',startMs:0,endMs:3000,text:first},{id:'karo-cue',startMs:3000,endMs:7200,text:last}]});
  const refs=narration.segments.map(cue=>({kind:'narration' as const,segmentId:cue.id,quote:cue.text}));
  const templates=([['lila','three-quarter-right',380],['karo','three-quarter-left',850]] as const).map(([actor,view,rootX])=>{
    const f=nativeSeatPhysicalActor(actor,view,.8,rootX),character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance:f.profile.appearance,sourceRefs:refs});
    f.plan.profileHash=actorProfile(character).profileHash;return {character,plan:f.plan};
  });
  const profile=actorProfile(templates[0]!.character),rig=buildRig(profile);
  const intent:SceneIntent={participants:templates.map(({character})=>({id:character.id,name:character.name,role:character.role,identity:character.identity,sourceRefs:refs})),action:text,objective:text,sourceRefs:refs,
    acting:templates.flatMap(({character})=>[{participantId:character.id,kind:'posture' as const,statement:first,sourceRefs:[refs[0]!]},{participantId:character.id,kind:'posture' as const,statement:last,sourceRefs:[refs[1]!]},{participantId:character.id,kind:'locomotion' as const,movement:'walk' as const,statement:last,sourceRefs:[refs[1]!]}])};
  const beat=BeatSchema.parse({id:'seat-beat',chapterId:'seat-chapter',startMs:0,endMs:7200,narrationText:text,meaning:'Two actors share a seated conversation, stand and walk.',visualGoal:'Preserve both physical runs through camera and lead changes.',importance:1,segmentIds:narration.segments.map(c=>c.id),
    explanationGoal:'Show physical support transfer and continuous movement.',narrationSegmentIds:narration.segments.map(c=>c.id),sourceRefs:refs,entities:[],relations:[],visualMethod:'event-sequence',hostIntent:'Lila and Karo are actors within this diagnostic story.',sceneIntent:intent});
  const shots=NATIVE_SEAT_TRACER_CUTS.slice(0,-1).map((startMs,i)=>{
    const endMs=NATIVE_SEAT_TRACER_CUTS[i+1]!,id='native-seat-canonical-'+i,segments=narration.segments.filter(cue=>cue.startMs<endMs&&cue.endMs>startMs).map(cue=>cue.id);
    const actors=templates.map(({character,plan})=>{
      const p=structuredClone(plan);p.id=id;p.durationMs=endMs-startMs;
      p.sourceBody={version:BODY_SOURCE_VERSION,id:character.id+'-complete-seat',startMs:0,endMs:7200,walks:p.walks,postures:p.postures,supports:p.supports,entryPosture:p.entryPosture};
      p.walks=[];p.jumps=[];p.postures=[];p.supports=[];delete p.entryPosture;p.gestures=[];p.expressions=[];
      p.gazes=[{startMs:0,endMs:p.durationMs,actorTarget:{id:character.id==='lila'?'karo':'lila',anchor:'eyes'}}];
      return {character,performance:p,actions:[{type:'idle' as const,startMs,endMs}],speakingSegmentIds:segments.filter(cue=>cue===character.id+'-cue')};
    });
    const primary=actors[i%2]!,other=actors[1-i%2]!,p=primary.performance;
    const shot=ShotSchema.parse({id,startMs,endMs,beatIds:[beat.id],sceneType:'character-scene',subject:text,visualDescription:text,characters:actors.map(a=>a.character.id),camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},
      narrationSegmentIds:segments,explanationGoal:beat.explanationGoal,sourceRefs:refs,captionRegion:'bottom-safe',
      host:{id:primary.character.id,profileVersion:1,rigHash:rig.rigHash,presence:'beside-model',actions:primary.actions},
      visualization:{type:'event-sequence',modelId:'seated-actors',parts:[],relations:[],events:[],provenance:'visualization',fidelity:'conceptual',sceneIntent:intent},
      cinematic:{version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:primary.character.id,motivation:'Keep the original seated performance through camera cuts.',sourceRefs:refs,sceneIntent:intent,setting:'camp',provenance:'illustration',models:[],propBindings:[],
        performance:p,actorScene:ActorSceneSchema.parse({primary:primary.character,speakingSegmentIds:primary.speakingSegmentIds,continuity:i?'continuous':'cut',supporting:[other]}),
        continuity:{entry:bodyRootAt(p,startMs,0),exit:bodyRootAt(p,startMs,p.durationMs),facing:p.facing!,carriedProps:[],models:[]},
        camera:{framing:'wide',movement:'locked',anchor:{x:640,y:360},startScale:1,endScale:1},artDirection:forestDirection()}});
    bindActorShot(shot,profile,rig);return shot;
  });
  const board=StoryboardSchema.parse({shots});
  for(const shot of board.shots){
    const c=shot.cinematic!,scene=c.actorScene!,lead=actorProfile(scene.primary!);
    c.camera=planCamera(c.performance,lead,{framing:'wide',movement:'locked',actingClock:actorViewActingClock(board,shot,lead.id),supporting:scene.supporting.map(actor=>({performance:actor.performance,profile:actorProfile(actor.character),actingClock:actorViewActingClock(board,shot,actor.character.id)}))});
    shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};
  }
  return {scope:NATIVE_SEAT_TRACER_SCOPE,version:NATIVE_SEAT_TRACER_VERSION,productionAcceptance:false as const,finalExportAllowed:false as const,config,profile,rig,narration,board,beat};
}
