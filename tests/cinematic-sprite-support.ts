// Pure synthetic metadata fixture, invoked only inside delegated test callbacks.
import {ConfigSchema} from '../packages/core/config.js';
import {ShotSchema} from '../packages/core/schemas.js';
import {buildRig} from '../packages/host/rig.js';
import {actorProfile} from '../packages/actors/model.js';
import {ANIMATION_VERSION} from '../packages/animation/schemas.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {spriteMotionKey} from '../packages/motion/stage.js';
import {SPRITE_STAGE_VERSION} from '../packages/motion/stage-schemas.js';
import type {ActorMotion} from '../packages/motion/schemas.js';
export function cinematicSpriteFixture(){
  const digest='a'.repeat(64),ref={kind:'narration' as const,segmentId:'s1',quote:'Lila waits.'};
  const motion:ActorMotion={version:'actor-motion-1',id:'lila-idle',actorId:'lila',state:'idle',view:'right',fingerprint:digest,
    source:{kind:'sprite-gen-strip',metadataHash:digest,sheetHash:digest,registrationHash:digest,referenceHash:digest,loop:true},
    sheet:{path:'sheet.png',hash:digest,width:20,height:20},playback:{mode:'loop',end:'hold'},frames:[{rect:{x:0,y:0,w:20,h:20},durationMs:1000,anchor:{x:10,y:20},landmarks:{hand_left:{x:10,y:20},face_left:{x:2,y:6},face_right:{x:18,y:6},face_top:{x:10,y:2},face_bottom:{x:10,y:10}}}],review:{status:'candidate',productionReady:false,warnings:[]}};
  const identity={x:0,y:0,rotation:0,scale:1};
  const definition={id:'lila',name:'Lila',role:'waits',kind:'stick-man' as const,identity:'fictional' as const,sourceRefs:[ref],appearance:{outline:'#000000',shell:'#774020',screen:'#FFFFFF',accent:'#FF8800',badge:'#337722',headScale:1,bodyScale:1,strokeWidth:5}};
  const profile=actorProfile(definition),rig=buildRig(profile);
  const performance={version:22,compilerVersion:ANIMATION_VERSION,id:'shot1',leadCharacterId:'lila',profileHash:profile.profileHash,kind:'stick-man',durationMs:1000,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,walks:[],gestures:[],expressions:[],gazes:[],props:[]};
  const intent={participants:[{id:'lila',name:'Lila',role:'waits',identity:'fictional',sourceRefs:[ref]}],action:'Lila waits.',objective:'Wait',sourceRefs:[ref],acting:[{participantId:'lila',kind:'hold',statement:ref.quote,sourceRefs:[ref]}]};
  const shot=ShotSchema.parse({id:'shot1',startMs:2000,endMs:3000,beatIds:['beat1'],sceneType:'character-scene',subject:'Lila waits',visualDescription:'Waiting in a forest',camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},sourceRefs:[ref],narrationSegmentIds:['s1'],characters:['lila'],captionRegion:'bottom-safe',host:{id:profile.id,profileVersion:profile.version,rigHash:rig.rigHash,presence:'beside-model',actions:[{type:'idle',startMs:2000,endMs:3000}]},visualization:{type:'event-sequence',modelId:'world',parts:[],events:[],relations:[],provenance:'visualization',fidelity:'conceptual',sceneIntent:intent},cinematic:{version:22,producer:DIRECTION_VERSION,shotId:'shot1',leadCharacterId:'lila',motivation:'Wait',sourceRefs:[ref],setting:'forest',provenance:'illustration',actorScene:{primary:definition,speakingSegmentIds:[],supporting:[],continuity:'cut'},sceneIntent:intent,models:[],propBindings:[],continuity:{entry:{x:300,y:550},exit:{x:300,y:550},facing:'front',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',anchor:{x:640,y:400},startScale:1,endScale:1},performance,
    spriteStage:{version:1,producer:SPRITE_STAGE_VERSION,id:'shot1',durationMs:1000,stage:{width:1280,height:720},actors:[{actorId:'lila',clips:[{id:'clip1',compositionId:'shot1',motionId:motion.id,fingerprint:digest,startMs:0,endMs:1000,rate:1,placement:{x:300,y:500,scale:8,rotation:0},root:[{timeMs:0,transform:identity,ease:'none'},{timeMs:1000,transform:identity,ease:'none'}],sourceRefs:[ref],sourcedAction:{kind:'hold',statement:ref.quote,motionState:'idle'}}]}],contacts:[]},
    artDirection:{origin:'authored',brief:'Forest in warm saturated color',useEnvironment:false,palette:{background:'#65AEDA',surface:'#FFCB79',ink:'#21150C',accent:'#FF7A00'},showHeading:false,models:[],layers:[{id:'forest',plane:'background',coordinateSpace:'world',role:'decoration',svg:'<rect width="1280" height="720" fill="#277538"/>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]}]}}});
  const config=ConfigSchema.parse({content:{mode:'narrated-explainer'},presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1280,height:720,fps:30}}});
  return {shot,profile,rig,config,motion,motions:new Map([[spriteMotionKey(motion.id,digest),motion]])};
}
