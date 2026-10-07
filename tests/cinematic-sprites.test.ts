// Runtime delegated. All fixtures, IO, compiler calls and assertions are inside callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {temporary} from './support.js';
import {ConfigSchema} from '../packages/core/config.js';
import {ShotSchema,CharacterBibleSchema,StorySchema} from '../packages/core/schemas.js';
import {HostProfileSchema,HostActions} from '../packages/host/schemas.js';
import {buildRig} from '../packages/host/rig.js';
import {actorProfile} from '../packages/actors/model.js';
import {ANIMATION_VERSION} from '../packages/animation/schemas.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {stageModels} from '../packages/director/models.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {renderSpriteScene} from '../packages/motion/scene.js';
import {createSpriteStageSampler,spriteMotionKey} from '../packages/motion/stage.js';
import {loadSpriteSceneMotions,spriteSceneSheetBytes} from '../packages/motion/scene-source.js';
import {importActorMotion} from '../packages/motion/import.js';
import {assertNoCandidateSpriteActors,validateSpriteScenePlan} from '../packages/motion/scene-validation.js';
import {ruleReview} from '../packages/review/index.js';
import {validateSpriteCamera} from '../packages/motion/camera.js';
import {SPRITE_STAGE_VERSION} from '../packages/motion/stage-schemas.js';
import type {ActorMotion} from '../packages/motion/schemas.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {assertLockedSceneCompatibility} from '../packages/scenes/index.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {runQC} from '../packages/qc/index.js';
import {hash} from '../packages/core/utils.js';

function fixture(){
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
const activity=()=>({method:'segment-draft' as const,windowMs:20,intervals:[]});

test('canonical opt-in keeps world/camera/clock but does not emit a skeletal performer or fake rig metrics',()=>{
  const f=fixture(),before=JSON.stringify(f.shot),rendered=renderCinematic(f.shot,f.profile,f.rig,activity(),f.config,undefined,undefined,f.motions);
  const html=rendered.files.files.find(file=>file.path==='index.html')!.content;
  assert.match(html,/data-sprite-status="candidate"/);assert.match(html,/data-actor-id="lila"/);assert.match(html,/class="camera-rig"/);assert.match(html,/#277538/);
  assert.doesNotMatch(html,/id="performer"|arm-right-upper|id="mouth"/);assert.ok('kind' in rendered.geometry);
  assert.ok(!('rigHash' in rendered.geometry));assert.ok(!('maxContactError' in rendered.report));assert.equal(JSON.stringify(f.shot),before);
  const allowed=[`assets/${f.motion.sheet.hash}.png`];assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),f.shot,f.config.workflow.max_scene_bytes,allowed,f.config.rendering.final),[]);
});

test('seven-argument legacy API cannot silently ignore a sprite plan; normal rig shots keep existing branch',()=>{
  const f=fixture();assert.throws(()=>renderCinematic(f.shot,f.profile,f.rig,activity(),f.config),/needs-sprite-motion-context/);
  delete f.shot.cinematic!.spriteStage;
  const rigResult=renderCinematic(f.shot,f.profile,f.rig,activity(),f.config);
  assert.ok('rigHash' in rigResult.geometry);assert.match(rigResult.files.files[0]!.content,/id="performer"/);
});

test('explicit movement method rejects the other renderer instead of silently falling back',()=>{
  const f=fixture(),plan=f.shot.cinematic!.spriteStage;
  f.config.presentation.actor_renderer='rig';assert.throws(()=>renderCinematic(f.shot,f.profile,f.rig,activity(),f.config,undefined,undefined,f.motions),/rig selection/);
  f.config.presentation.actor_renderer='sprite';delete f.shot.cinematic!.spriteStage;
  assert.throws(()=>renderCinematic(f.shot,f.profile,f.rig,activity(),f.config),/cannot fall back/);
  f.shot.cinematic!.spriteStage=plan;
  assert.ok('kind' in renderCinematic(f.shot,f.profile,f.rig,activity(),f.config,undefined,undefined,f.motions).geometry);
});

test('two sprites share world clock with distinct source identity and actual frame bounds',()=>{
  const f=fixture(),c=f.shot.cinematic!,character=structuredClone(c.actorScene!.primary!);character.id='karo';character.name='Karo';
  const motion=structuredClone(f.motion);motion.id='karo-idle';motion.actorId='karo';f.motions.set(spriteMotionKey(motion.id,motion.fingerprint),motion);
  c.actorScene!.supporting=[{character,performance:{...structuredClone(c.performance),leadCharacterId:'karo'},actions:[],speakingSegmentIds:[]}];
  const clip=structuredClone(c.spriteStage!.actors[0]!.clips[0]!);clip.id='karo.clip';clip.motionId=motion.id;clip.placement.x=850;
  c.spriteStage!.actors.push({actorId:'karo',clips:[clip]});
  const rendered=renderSpriteScene(f.shot,f.profile,f.config,f.motions);
  assert.equal(rendered.geometry.motions.length,2);assert.deepEqual(rendered.report.actors.map(actor=>actor.actorId),['lila','karo']);
  assert.ok(rendered.report.camera.ratios.karo!.max>0);assert.equal(rendered.report.speechSync,'none');
});

test('sourcedAction coverage belongs to sprite clips, not unrelated skeletal walking tracks',()=>{
  const f=fixture(),c=f.shot.cinematic!,intent=c.sceneIntent!,narration={mode:'script' as const,durationMs:3000,segments:[{id:'s1',startMs:2000,endMs:3000,text:'Lila waits.'}],words:[]};
  const beat={id:'beat1',chapterId:'chapter1',startMs:2000,endMs:3000,narrationText:'Lila waits.',meaning:'Wait',visualGoal:'Show waiting',importance:1,segmentIds:['s1'],sceneIntent:intent};
  assert.doesNotThrow(()=>validateStoryActingCoverage({shots:[f.shot]},[beat],narration));
  c.spriteStage!.actors[0]!.clips[0]!.sourcedAction!.statement='An invented action';
  assert.throws(()=>validateStoryActingCoverage({shots:[f.shot]},[beat],narration),/needs-motion/);
  c.spriteStage!.actors[0]!.clips[0]!.sourcedAction!.statement='Lila waits.';c.spriteStage!.actors[0]!.clips[0]!.sourcedAction!.motionState='run';
  assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/different registered state/);
});

test('face camera needs real registered face points and ensemble camera rejects body/subtitle crop',()=>{
  const f=fixture(),c=f.shot.cinematic!;
  c.camera={framing:'close',focus:'face',movement:'locked',anchor:{x:300,y:400},startScale:2,endScale:2};f.shot.camera.shotSize='close';
  assert.doesNotThrow(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions));
  delete f.motion.frames[0]!.landmarks.face_left;assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/registered face_left/);
  c.camera={framing:'wide',movement:'locked',anchor:{x:640,y:400},startScale:1,endScale:1};f.shot.camera.shotSize='wide';c.spriteStage!.actors[0]!.clips[0]!.placement.y=700;
  assert.throws(()=>validateSpriteCamera(f.shot,f.motions),/crops.*subtitle clearance/);
});

test('unsupported speech, skeletal props and continuous sprite handoff block rather than use old rig',()=>{
  const f=fixture(),c=f.shot.cinematic!;c.actorScene!.speakingSegmentIds=['s1'];
  assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/needs-sprite-speech/);c.actorScene!.speakingSegmentIds=[];
  c.performance.props=[{id:'prop',origin:{x:300,y:500}}];assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/needs-sprite-props/);c.performance.props=[];
  c.actorScene!.continuity='continuous';assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/needs-sprite-continuity/);
});

test('world object response requires prior registered sprite hand contact, with measured geometry',()=>{
  const f=fixture(),c=f.shot.cinematic!,ref=f.shot.sourceRefs![0]!;
  f.shot.visualization!.parts=[{id:'basket',label:'basket',kind:'object',x:(300+1280*.08*.35)/1280,y:500/720,width:.08,height:.12,sourceRefs:[ref]}];
  c.attentionPartId='basket';c.models=stageModels(f.shot);
  f.shot.visualization!.events=[{type:'highlight',targetId:'basket',narrationAnchor:'s1',startMs:2500,endMs:2800,contactRequired:true,contactActorId:'lila',contactHands:['left'],motion:'none',sourceRefs:[ref]}];
  assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/no registered contact/);
  c.spriteStage!.contacts=[{id:'touch',actorId:'lila',clipId:'clip1',landmark:'hand_left',targetId:'basket',timeMs:400,effectMs:500,maxErrorPx:1,sourceRefs:[ref]}];
  const rendered=renderSpriteScene(f.shot,f.profile,f.config,f.motions);assert.ok(rendered.geometry.interactions[0]!.errorPx<1e-7);assert.equal(rendered.geometry.interactions[0]!.contactMs,2400);
  assert.match(rendered.files.files[0]!.content,/data-entity-id="basket"/);
  c.spriteStage!.contacts[0]!.timeMs=500;assert.throws(()=>renderSpriteScene(f.shot,f.profile,f.config,f.motions),/no registered contact/);
});

test('required two-hand contact must belong to one eligible actor, never one hand from each actor',()=>{
  const f=fixture(),c=f.shot.cinematic!,ref=f.shot.sourceRefs![0]!,character=structuredClone(c.actorScene!.primary!);
  character.id='karo';character.name='Karo';c.actorScene!.supporting=[{character,performance:{...structuredClone(c.performance),leadCharacterId:'karo'},actions:[],speakingSegmentIds:[]}];
  const clip=structuredClone(c.spriteStage!.actors[0]!.clips[0]!);clip.id='karo.clip';c.spriteStage!.actors.push({actorId:'karo',clips:[clip]});
  f.shot.visualization!.parts=[{id:'basket',label:'basket',kind:'object',x:.4,y:.5,width:.1,height:.1,sourceRefs:[ref]}];c.attentionPartId='basket';c.models=stageModels(f.shot);
  const event={type:'highlight' as const,targetId:'basket',narrationAnchor:'s1',startMs:2500,endMs:2800,contactRequired:true,contactHands:['left','right'] as Array<'left'|'right'>,motion:'none' as const,sourceRefs:[ref]};f.shot.visualization!.events=[event];
  c.spriteStage!.contacts=[{id:'left',actorId:'lila',clipId:'clip1',landmark:'hand_left',targetId:'basket',timeMs:300,effectMs:500,maxErrorPx:1,sourceRefs:[ref]},
    {id:'right',actorId:'karo',clipId:'karo.clip',landmark:'hand_right',targetId:'basket',timeMs:400,effectMs:500,maxErrorPx:1,sourceRefs:[ref]}];
  assert.throws(()=>validateSpriteScenePlan(f.shot),/no registered contact/);
  c.spriteStage!.contacts[1]!.actorId='lila';c.spriteStage!.contacts[1]!.clipId='clip1';assert.doesNotThrow(()=>validateSpriteScenePlan(f.shot));
  f.shot.visualization!.events[0]!.contactActorId='karo';assert.throws(()=>validateSpriteScenePlan(f.shot),/no registered contact/);
});

test('contact close keeps manipulated object, response object and labels visible over camera samples',()=>{
  const f=fixture(),c=f.shot.cinematic!,ref=f.shot.sourceRefs![0]!;
  const part={id:'basket',label:'basket',kind:'object' as const,x:(300+1280*.08*.35)/1280,y:500/720,width:.08,height:.12,sourceRefs:[ref]};
  f.shot.visualization!.parts=[part];c.attentionPartId='basket';c.models=stageModels(f.shot);
  c.spriteStage!.contacts=[{id:'touch',actorId:'lila',clipId:'clip1',landmark:'hand_left',targetId:'basket',timeMs:400,effectMs:500,maxErrorPx:1,sourceRefs:[ref]}];
  c.camera={framing:'close',focus:'contact',movement:'locked',anchor:{x:300,y:480},startScale:2,endScale:2};f.shot.camera.shotSize='close';
  assert.doesNotThrow(()=>validateSpriteCamera(f.shot,f.motions));
  part.width=.9;assert.throws(()=>validateSpriteCamera(f.shot,f.motions),/crops basket/);part.width=.08;
  c.camera.movement='push-in';c.camera.endScale=3.4;assert.throws(()=>validateSpriteCamera(f.shot,f.motions),/crops basket label/);
  c.camera.movement='locked';c.camera.endScale=2;
  f.shot.visualization!.parts.push({...part,id:'response',x:.9});c.models=stageModels(f.shot);
  f.shot.visualization!.events=[{type:'highlight',targetId:'response',contactPartId:'basket',narrationAnchor:'s1',startMs:2500,endMs:2800,contactRequired:true,motion:'none',sourceRefs:[ref]}];
  assert.throws(()=>validateSpriteCamera(f.shot,f.motions),/crops response/);
  f.shot.visualization!.relations=[{from:'basket',to:'response',kind:'transfer',sourceRefs:[ref]}];
  f.shot.visualization!.events=[{type:'flow',targetId:'basket',relationTo:'response',narrationAnchor:'s1',startMs:2500,endMs:2800,contactRequired:true,motion:'none',sourceRefs:[ref]}];
  assert.throws(()=>validateSpriteCamera(f.shot,f.motions),/crops response/);
});

test('sampler closure owns validated snapshots and cannot drift after callers mutate source',()=>{
  const f=fixture(),sample=createSpriteStageSampler(f.shot.cinematic!.spriteStage!,f.motions),before=sample(500);
  f.motion.frames[0]!.anchor.x=0;f.shot.cinematic!.spriteStage!.actors[0]!.clips[0]!.placement.x=900;
  assert.deepEqual(sample(500),before);
});

async function imported(root:string){
  const f=fixture(),input=path.join(root,'input');await fs.mkdir(input,{recursive:true});
  const bytes=await sharp({create:{width:20,height:20,channels:4,background:{r:255,g:120,b:10,alpha:.8}}}).png().toBuffer();
  const metadata=path.join(input,'idle.strip.json'),registration=path.join(input,'registration.json');
  await fs.writeFile(path.join(input,'idle.strip.png'),bytes);
  await fs.writeFile(metadata,JSON.stringify({frames:1,w:20,h:20,delay_ms:1000,loop:true}));
  await fs.writeFile(registration,JSON.stringify({version:'actor-motion-registration-1',id:'lila-idle',actorId:'lila',state:'idle',view:'right',referenceHash:'a'.repeat(64),playback:{mode:'loop',end:'hold'},anchor:{x:10,y:20},requiredLandmarks:[],landmarks:[f.motion.frames[0]!.landmarks],notes:[]}));
  const motion=await importActorMotion(root,metadata,registration);f.shot.cinematic!.spriteStage!.actors[0]!.clips[0]!.fingerprint=motion.fingerprint;
  return {...f,motion,bytes};
}

test('scene source loader and byte reader preserve imported PNG and immutable descriptor',async t=>{
  const root=await temporary(t),f=await imported(root),motions=await loadSpriteSceneMotions(root,f.shot),loaded=[...motions!.values()][0]!;
  assert.equal(hash(await spriteSceneSheetBytes(root,loaded)),hash(f.bytes));
  assert.deepEqual(await spriteSceneSheetBytes(root,loaded),f.bytes);
  assert.equal(loaded.fingerprint,f.motion.fingerprint);
  await fs.writeFile(path.join(root,loaded.sheet.path),Buffer.from('tampered PNG'));
  await assert.rejects(loadSpriteSceneMotions(root,f.shot));
});

test('rule review permits verified candidate sheet outside manifest but rejects changed staged pixels',async t=>{
  const root=await temporary(t),f=await imported(root),motions=await loadSpriteSceneMotions(root,f.shot),dir=path.join(root,'scenes/shot1');
  const rendered=renderSpriteScene(f.shot,f.profile,f.config,motions!),files=secureSceneFiles(rendered.files);await fs.mkdir(path.join(dir,'assets'),{recursive:true});
  for(const file of files.files)await fs.writeFile(path.join(dir,file.path),file.content);
  const staged=path.join(dir,'assets',`${f.motion.sheet.hash}.png`);await fs.writeFile(staged,f.bytes);
  const story=StorySchema.parse({title:'Waiting',story:'Lila waits.',style:{visual:'illustration'}}),characters=CharacterBibleSchema.parse({characters:[]});
  const issues=await ruleReview(root,f.config,{shots:[f.shot]},story,characters,{assets:[]});
  assert.ok(!issues.some(issue=>issue.type==='scene-contract'),JSON.stringify(issues));
  await fs.writeFile(staged,'changed pixels');const changed=await ruleReview(root,f.config,{shots:[f.shot]},story,characters,{assets:[]});
  assert.ok(changed.some(issue=>issue.type==='scene-contract'&&issue.severity==='high'));
  assert.equal(f.motion.review.productionReady,false);
});

test('locked sprite scene verifies staged image before input identity and never overwrites it',async t=>{
  const root=await temporary(t),f=await imported(root),dir=path.join(root,'scenes/shot1/assets');await fs.mkdir(dir,{recursive:true});
  for(const file of ['index.html','style.css','scene.js'])await fs.writeFile(path.join(root,'scenes/shot1',file),'retained');
  const staged=path.join(dir,`${f.motion.sheet.hash}.png`);await fs.writeFile(staged,'wrong staged pixels');
  await assert.rejects(assertLockedSceneCompatibility(root,f.config,{shots:[f.shot]},CharacterBibleSchema.parse({characters:[]}),{assets:[]},{locked:{shot1:true}}),/locked rig image changed or missing/);
  assert.equal(await fs.readFile(staged,'utf8'),'wrong staged pixels');assert.equal(await fs.readFile(path.join(root,'scenes/shot1/index.html'),'utf8'),'retained');
});

test('candidate final/QC guard is independent of a passing visual draft review',async t=>{
  const root=await temporary(t),f=fixture();assert.throws(()=>assertNoCandidateSpriteActors({shots:[f.shot]}),/needs-sprite-acceptance/);
  await assert.rejects(runQC(root,f.config,{mode:'script',durationMs:1000,segments:[{id:'s1',startMs:0,endMs:1000,text:'Lila waits.'}],words:[]},{shots:[f.shot]}),/needs-sprite-acceptance/);
  const dir=path.join(root,'scenes');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),'<div data-sprite-status="candidate"></div>');
  const engine=new HyperFramesEngine(f.config,root);let commands=0;
  (engine as unknown as {command:()=>Promise<never>}).command=async()=>{commands++;throw new Error('Unexpected render process');};
  await assert.rejects(engine.renderFinal(),/needs-sprite-acceptance/);assert.equal(commands,0);
});
