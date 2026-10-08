# Source-only dialogue acting review input
benchmarks/native-seat-tracer.ts; SHA256 93584e4dca31b3855d4f73485adfa1e21d27b28a6587beb909a5a0a470b7fd07
```ts
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
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import type {NativeHeadBank} from '../packages/animation/native-head-bank.js';
import {NATIVE_HEAD_SOURCE_VERSION} from '../packages/animation/native-head-track.js';
import {registeredBodyView} from '../packages/animation/body-view-art.js';
import {projectViewSourceGestures,type ViewSourceGesture} from '../packages/animation/view-source-gesture.js';
import {NativeDialogueSelectionSchema,nativeDialogueLayouts,nativeDialogueThinkingWindows,NATIVE_HEAD_SEAT_TRACER_VERSION,NATIVE_HEAD_SEAT_TRACER_SCOPE,type NativeDialogueSelection} from '../packages/topics/native-dialogue-candidates.js';

export const NATIVE_SEAT_TRACER_VERSION='native-seat-tracer-2';
export const NATIVE_SEAT_TRACER_SCOPE='unapproved-native-seat-motion-tracer';
export {NATIVE_HEAD_SEAT_TRACER_VERSION,NATIVE_HEAD_SEAT_TRACER_SCOPE} from '../packages/topics/native-dialogue-candidates.js';
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
function buildNativeSeatTracer(heads?:Record<NativeSeatActor,NativeHeadBank>,selection:NativeDialogueSelection={staging:'lila-left',acting:'rest'}){
  const config=ConfigSchema.parse({project:{name:'Native seat motion tracer',language:'en'},input:{mode:'srt'},presentation:{mode:'story-cinematic',character_mode:'actors',actor_renderer:'rig'},
    rendering:{draft:{width:1280,height:720,fps:60,quality:'looks'},final:{width:1280,height:720,fps:60,quality:'delivery'}},captions:{mode:'burned',font:'Arial',font_size:20}});
  const thinking=!!heads&&selection.acting==='listening-think';
  const first=thinking?'Lila and Karo sit down together. Lila talks while Karo listens and thinks.':'Lila and Karo sit down together. Lila talks while Karo listens.',
    last=thinking?'Karo replies while Lila considers his words. They stand and walk together.':'Karo replies. They stand and walk together.',text=first+' '+last;
  const narration=NarrationSchema.parse({mode:'srt',durationMs:NATIVE_SEAT_TRACER_DURATION_MS,segments:[{id:'lila-cue',startMs:0,endMs:3000,text:first},{id:'karo-cue',startMs:3000,endMs:7200,text:last}]});
  const refs=narration.segments.map(cue=>({kind:'narration' as const,segmentId:cue.id,quote:cue.text}));
  const templates=nativeDialogueLayouts[selection.staging].map(({actor,view,rootX})=>{
    const f=nativeSeatPhysicalActor(actor,view,.8,rootX),appearance={...f.profile.appearance};
    if(heads){
      // These overlays are registered on other painted heads. Keep the native
      // body/seat source, never attach old eyes/mouth/hair to the new head.
      delete appearance.bodySpeech;delete appearance.bodyEyes;delete appearance.bodyExpressions;delete appearance.bodySecondary;
      appearance.bodyHeadBank=heads[actor];
    }
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance,sourceRefs:refs});
    f.plan.profileHash=actorProfile(character).profileHash;
    const gestures:ViewSourceGesture[]=thinking?[{...nativeDialogueThinkingWindows[actor],action:'think',hand:registeredBodyView(character).nearHand}]:[];
    return {character,plan:f.plan,gestures};
  });
  const profile=actorProfile(templates[0]!.character),rig=buildRig(profile);
  const intent:SceneIntent={participants:templates.map(({character})=>({id:character.id,name:character.name,role:character.role,identity:character.identity,sourceRefs:refs})),action:text,objective:text,sourceRefs:refs,
    acting:templates.flatMap(({character})=>[{participantId:character.id,kind:'posture' as const,statement:first,sourceRefs:[refs[0]!]},{participantId:character.id,kind:'posture' as const,statement:last,sourceRefs:[refs[1]!]},{participantId:character.id,kind:'locomotion' as const,movement:'walk' as const,statement:last,sourceRefs:[refs[1]!]}])};
  if(thinking)for(const actor of ['karo','lila'] as const){const index=actor==='karo'?0:1;intent.acting!.push({participantId:actor,kind:'observation',statement:index?last:first,sourceRefs:[refs[index]!]});}
  const beat=BeatSchema.parse({id:'seat-beat',chapterId:'seat-chapter',startMs:0,endMs:7200,narrationText:text,meaning:'Two actors share a seated conversation, stand and walk.',visualGoal:'Preserve both physical runs through camera and lead changes.',importance:1,segmentIds:narration.segments.map(c=>c.id),
    explanationGoal:'Show physical support transfer and continuous movement.',narrationSegmentIds:narration.segments.map(c=>c.id),sourceRefs:refs,entities:[],relations:[],visualMethod:'event-sequence',hostIntent:'Lila and Karo are actors within this diagnostic story.',sceneIntent:intent});
  const shots=NATIVE_SEAT_TRACER_CUTS.slice(0,-1).map((startMs,i)=>{
    const endMs=NATIVE_SEAT_TRACER_CUTS[i+1]!,id='native-seat-canonical-'+i,segments=narration.segments.filter(cue=>cue.startMs<endMs&&cue.endMs>startMs).map(cue=>cue.id);
    const actors=templates.map(({character,plan,gestures})=>{
      const p=structuredClone(plan);p.id=id;p.durationMs=endMs-startMs;
      p.sourceBody={version:BODY_SOURCE_VERSION,id:character.id+'-complete-seat',startMs:0,endMs:7200,walks:p.walks,postures:p.postures,supports:p.supports,entryPosture:p.entryPosture};
      if(heads){const bank=heads[character.id as NativeSeatActor];
        p.sourceHead={version:NATIVE_HEAD_SOURCE_VERSION,id:character.id+'-complete-head',ownerId:character.id,bankFingerprint:bank.fingerprint,startMs:0,endMs:7200,samples:[{atMs:0,cell:bank.cells[0]!.id}]};
      }
      p.walks=[];p.jumps=[];p.postures=[];p.supports=[];delete p.entryPosture;
      p.gestures=projectViewSourceGestures(gestures,startMs,endMs,0,NATIVE_SEAT_TRACER_DURATION_MS);p.expressions=[];
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
  return {scope:heads?NATIVE_HEAD_SEAT_TRACER_SCOPE:NATIVE_SEAT_TRACER_SCOPE,version:heads?NATIVE_HEAD_SEAT_TRACER_VERSION:NATIVE_SEAT_TRACER_VERSION,productionAcceptance:false as const,finalExportAllowed:false as const,config,profile,rig,narration,board,beat};
}

/** Existing fixed-view source remains the default diagnostic. */
export function createNativeSeatTracer(){return buildNativeSeatTracer();}

/** Explicit opposing bank3 heads, using the same canonical body, cast, camera
 * and factory renderer as the old diagnostic. No selection in production.
 * Loading/builder/geometry execution is reserved for the user's test model. */
export async function createNativeHeadSeatTracer(repo:string,input:Partial<NativeDialogueSelection>={}){
  const selection=NativeDialogueSelectionSchema.parse(input),layout=nativeDialogueLayouts[selection.staging];
  const lila=await headFaceCandidate(repo,'lila',layout[0].view);
  const karo=await headFaceCandidate(repo,'karo',layout[1].view);
  const f=buildNativeSeatTracer({lila:lila.bank,karo:karo.bank},selection);
  f.config.project.name='Native opposing-head seated conversation';
  return {...f,dialogueSelection:selection,headSelection:([
    {actorId:'lila',view:layout[0].view,candidate:lila},
    {actorId:'karo',view:layout[1].view,candidate:karo},
  ] as const).map(({actorId,view,candidate})=>({actorId,view,definitionFile:candidate.definitionFile,definitionHash:candidate.definitionHash,bankFingerprint:candidate.bank.fingerprint,
    sourceFile:candidate.bank.source.file,sourceSHA256:candidate.bank.source.sha256,artApproved:false,motionVerified:false}))};
}

```
Binding source lines25-40; original SHA256 7c2248f42cdaa221d6c1da639d44040a6ba87d761710f50059e92778e2f396b8
```ts
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
```
CLI options excerpt; original SHA256 33a55778e5f7843cd9bfda7451a42e3bc3e588708e8143c2797ad75d647e7e57
```ts

const require=createRequire(import.meta.url),execFileAsync=promisify(execFile);
export function nativeSeatTracerOptions(args:string[]){
  const {values}=parseArgs({args,strict:true,allowPositionals:false,options:{validate:{type:'boolean'},frames:{type:'boolean'},render:{type:'boolean'},wav:{type:'string'},help:{type:'boolean'},'native-heads':{type:'boolean'},staging:{type:'string'},acting:{type:'string'}}});
  if(values.wav&&(!path.isAbsolute(values.wav)||path.extname(values.wav).toLowerCase()!=='.wav'))throw new Error('--wav requires an absolute path to an existing WAV file');
  const explicitDialogue=values.staging!==undefined||values.acting!==undefined;
  if(explicitDialogue&&!values['native-heads'])throw new Error('--staging/--acting require --native-heads; legacy tracer is unchanged');
  const dialogue=explicitDialogue?NativeDialogueSelectionSchema.parse({...(values.staging!==undefined?{staging:values.staging}:{}),...(values.acting!==undefined?{acting:values.acting}:{})}):undefined;
  return {validate:!!(values.validate||values.frames||values.render),frames:!!values.frames,render:!!values.render,wav:values.wav,help:!!values.help,...(values['native-heads']?{nativeHeads:true as const}:{}),...(dialogue?{dialogue}:{})};
}
export type NativeSeatTracerOptions=ReturnType<typeof nativeSeatTracerOptions>;

/** Exclusive fresh destination. No existing project or server is modified. */
export async function reserveNativeSeatTracerRoot(repo:string){
```
