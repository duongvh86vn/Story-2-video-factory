import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import {z} from 'zod';
import sharp from 'sharp';
import * as core from '../packages/orchestrator/index.js';
import {loadState,saveState} from '../packages/orchestrator/state-machine.js';
import {loadConfig} from '../packages/core/config.js';
import {BeatSchema,StorySchema,NarrationSchema,StoryboardSchema,type Storyboard,type AssetManifest} from '../packages/core/schemas.js';
import {Id} from '../packages/core/identifiers.js';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import {compileHost} from '../packages/host/index.js';
import {buildRig} from '../packages/host/rig.js';
import {ModelRouter} from '../packages/models/registry.js';
import {validateStructured,StructuredOutputError} from '../packages/models/adapter.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorDefinitions,actorLockKey,assertActorLocks} from '../packages/actors/locks.js';
import {ActorCastManifestSchema,actorAssetHashes,exportActorAssets} from '../packages/actors/assets.js';
import {groundedExplanation} from '../packages/explainer/plan.js';
import {explainerShot,writeHostTimeline,validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {directCinematicShot,writeCinematicPlans} from '../packages/director/index.js';
import {CameraSchema,DIRECTION_VERSION} from '../packages/director/schemas.js';
import {createStoryboard,readStoryboardForDirection} from '../packages/storyboard/director.js';
import {buildServer} from '../apps/server/index.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {ruleReview} from '../packages/review/index.js';
import {temporary} from './support.js';
import {validatePropBindings} from '../packages/director/props.js';
import {compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {rigMetrics} from '../packages/animation/rig.js';

async function owned(t:TestContext){
  const evidence=process.env.ACTOR_STUDIO_TEST_EVIDENCE;
  if(!evidence)return temporary(t);
  await fs.mkdir(evidence,{recursive:true});return fs.mkdtemp(path.join(evidence,'studio-'));
}
async function fixture(t:TestContext){
  const projectsRoot=await owned(t),root=await core.createProject('fixture',{root:projectsRoot});
  const settingsFile=path.join(root,'project.yaml'),settings=YAML.parse(await fs.readFile(settingsFile,'utf8'));
  settings.presentation={mode:'story-cinematic',character_mode:'actors'};settings.host={profile:'library/characters/STICK-MAN.md'};
  settings.input={mode:'srt'};settings.voice={source:'input',tts_provider:'none'};settings.asr={allow_downloads:false};settings.captions={mode:'none'};
  settings.models=Object.fromEntries(['planner','storyboard','coder','repair','visual_review','fallback'].map(role=>[role,{provider:'mock',model:'mock'}]));
  settings.rendering={final:{width:1280,height:720,fps:30}};settings.retry={structured_output:0,scene_repair:0};
  await fs.writeFile(settingsFile,YAML.stringify(settings));const config=await loadConfig(root),router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
  const text='James Watt và Joseph Black quan sát. Hơi nước đẩy pít-tông trong xi-lanh.';
  const narration=NarrationSchema.parse({mode:'srt',durationMs:10000,audioPath:'input/narration.wav',words:[],segments:[{id:'cue1',startMs:0,endMs:5000,text},{id:'cue2',startMs:5000,endMs:10000,text}]});
  const story=StorySchema.parse({title:'Actor studio',story:text+' '+text,style:{visual:''}});
  const bases=narration.segments.map((s,i)=>BeatSchema.parse({id:'b'+(i+1),chapterId:'ch1',startMs:s.startMs,endMs:s.endMs,segmentIds:[s.id],narrationText:s.text,meaning:'cause',visualGoal:'show mechanism',importance:1}));
  const explanation=groundedExplanation(story,narration,bases,profile),beats=bases.map((b,i)=>({...b,...explanation.beats[i]!}));
  const character=(id:string,name:string,color:string)=>ActorDefinitionSchema.parse({id,name,role:'quan sát',kind:'stick-man',identity:'historical',sourceRefs:[{kind:'narration',segmentId:'cue1',quote:text}],appearance:profile.appearance,costume:[{joint:'chest',svg:'<rect x="-22" y="-75" width="44" height="70" fill="'+color+'"/>'}]});
  const watt=character('watt','James Watt','#a82030'),black=character('black','Joseph Black','#2040a8');
  const shots=beats.map((beat,i)=>{
    const shot=directCinematicShot(explainerShot('ch1.s00'+(i+1),beat.startMs,beat.endMs,beat,narration,profile,rig),beat,profile,config);
    const performance=structuredClone(shot.cinematic!.performance);performance.root={x:250,y:performance.stage.groundY};performance.walks=[];performance.props=[];performance.gazes=[];performance.gestures=[{id:'support-react',action:'react',startMs:0,endMs:5000}];
    shot.cinematic!.actorScene=ActorSceneSchema.parse({primary:i?black:watt,continuity:'cut',speakingSegmentIds:[],supporting:[{character:i?watt:black,performance,actions:[{type:'react',startMs:beat.startMs,endMs:beat.endMs,narrationAnchor:'cue'+(i+1)}],speakingSegmentIds:[]}]});
    bindActorShot(shot,profile,rig);return shot;
  });
  const board=StoryboardSchema.parse({shots}),characters={characters:[]},chapters=[{id:'ch1',startMs:0,endMs:10000,title:'Mechanism',summary:text,narrativePurpose:'explain',segmentIds:['cue1','cue2']}];
  validateExplainerStoryboard(board,narration,beats,profile,rig,config);
  const wav=Buffer.alloc(44+20000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(1000,24);wav.writeUInt32LE(2000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(20000,40);await fs.writeFile(path.join(root,'input/narration.wav'),wav);
  await fs.writeFile(path.join(root,'input/narration.srt'),'1\n00:00:00,000 --> 00:00:05,000\n'+text+'\n\n2\n00:00:05,000 --> 00:00:10,000\n'+text+'\n');
  const manifest:AssetManifest={assets:await Promise.all(shots.map(async s=>{const need=s.assetNeeds.find(n=>n.required&&n.localPath===rig.assetPath)!;return {id:need.id,type:'image' as const,path:rig.assetPath,hash:hash(await fs.readFile(path.join(root,rig.assetPath))),source:'code' as const,status:'approved' as const,shotIds:[s.id]};}))};
  for(const [name,data] of Object.entries({story,narration,'voiced-narration':narration,beats,chapters,'character-bible':characters,storyboard:board,timeline:{durationMs:narration.durationMs,segments:narration.segments,words:[]},'input-document':{mode:'srt'},'explanation-plan':explanation,'asset-manifest':manifest,'speech-activity':{method:'audio-rms',windowMs:20,intervals:[]},'voice-report':{version:2,status:'ready',source:'input',provider:null,voiceId:null,narrationHash:hash(narration),audioPath:narration.audioPath,audioHash:hash(wav),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'audio-activity',cues:[],warnings:[]}}))await writeJson(path.join(root,'work',name+'.json'),data);
  await fs.writeFile(path.join(root,'work/storyboard.md'),'Actor studio fixture');await writeCinematicPlans(root,board);await writeHostTimeline(root,board,narration,profile,rig);
  await writeJson(path.join(root,'work/environment-provenance.json'),{version:22,environments:[]});
  // The fixture owns a storyboard but no accepted scene bundle. Keep its
  // checkpoint before SCENES_READY so public edits are not misclassified as
  // a renderer migration from missing scene artifacts.
  const state=await loadState(root);state.state='STORYBOARDED';state.specVersion=4;state.approvals={storyboard:true,characters:true,host:true,hostHash:rig.rigHash};await saveState(root,state);
  const app=await buildServer({projectsRoot,coordinator:core});t.after(()=>app.close());
  const url='/api/projects/fixture/artifacts/storyboard.json';
  const doc=async()=>{const r=await app.inject({url});assert.equal(r.statusCode,200,r.body);return r.json<{data:Storyboard;revision:string}>();};
  const putActor=async(character:typeof watt,revision?:string)=>app.inject({method:'PUT',url:'/api/projects/fixture/actors/'+character.id,payload:{character,revision:revision??(await doc()).revision}});
  const edit=async(change:(b:Storyboard)=>void)=>{const d=await doc();change(d.data);return app.inject({method:'PUT',url,payload:{data:d.data,revision:d.revision}});};
  return {projectsRoot,root,config,router,profile,rig,board,narration,beats,story,characters,chapters,watt,black,manifest,app,url,doc,putActor,edit};
}
const altered=(character:ReturnType<typeof ActorDefinitionSchema.parse>)=>({...structuredClone(character),costume:[{joint:'chest' as const,svg:'<rect x="-22" y="-75" width="44" height="70" fill="#20a830"/>'}]});
async function lock(f:Awaited<ReturnType<typeof fixture>>,key:string){const state=await loadState(f.root);state.locked[key]=true;await saveState(f.root,state);}
const castFile=(root:string)=>path.join(root,'work/actor-cast.json');

test('cast manifest binds real actor, preview, poses and profile files and resolving rig paths',async t=>{
  const f=await fixture(t),cast=await readJson(castFile(f.root),ActorCastManifestSchema),persisted=await readJson(path.join(f.root,'work/storyboard.json'),StoryboardSchema);assert.equal(cast.storyboardHash,hash(persisted));assert.equal(cast.actors.length,2);
  assert.equal((await readJson<{storyboardHash:string}>(path.join(f.root,'work/actor-timeline.json'))).storyboardHash,hash(persisted));
  const hashes=await actorAssetHashes(f.root);assert.equal(Object.keys(hashes).length,8);
  for(const a of cast.actors){
    assert.equal(a.lockKey,actorLockKey(a.character.id));assert.equal(a.rig.assetPath,a.assetPath);assert.equal(a.rig.posePath,a.posePath);
    for(const [file,expected] of [[a.assetPath,a.assetHash],[a.previewPath,a.previewHash],[a.posePath,a.poseHash],[a.profilePath,a.profileFileHash]])assert.equal(hash(await fs.readFile(path.join(f.root,file!))),expected);
    assert.deepEqual(await readJson(path.join(f.root,a.posePath)),a.rig.poses);assert.deepEqual(await readJson(path.join(f.root,a.profilePath)),a.profile);
    assert.equal(a.rig.rigHash,buildRig(actorProfile(a.character)).rigHash);assert.ok((await sharp(await fs.readFile(path.join(f.root,a.previewPath))).metadata()).width!>100);
  }
});
test('exported cast files survive copying output as a standalone directory',async t=>{
  const f=await fixture(t);await exportActorAssets(f.root);await fs.copyFile(castFile(f.root),path.join(f.root,'output/actor-cast.json'));
  const destination=path.join(await owned(t),'copied-output');await fs.cp(path.join(f.root,'output'),destination,{recursive:true});
  const cast=await readJson(path.join(destination,'actor-cast.json'),ActorCastManifestSchema);
  for(const a of cast.actors){for(const [file,expected] of [[a.assetPath,a.assetHash],[a.previewPath,a.previewHash],[a.posePath,a.poseHash],[a.profilePath,a.profileFileHash]])assert.equal(hash(await fs.readFile(path.join(destination,file!))),expected);assert.deepEqual(await readJson(path.join(destination,a.rig.posePath)),a.rig.poses);}
});
for(const item of ['assetPath','previewPath','posePath','profilePath'] as const)for(const damage of ['tamper','missing'] as const)test(`export rejects ${damage} of ${item}`,async t=>{
  const f=await fixture(t),cast=await readJson(castFile(f.root),ActorCastManifestSchema),file=path.join(f.root,cast.actors[0]![item]);
  if(damage==='missing')await fs.unlink(file);else await fs.appendFile(file,'TAMPER');
  await assert.rejects(exportActorAssets(f.root),/changed after approval|ENOENT|not exist/);
});
test('max-96-character actor ID yields a stable permitted and distinct lock key',()=>{
  const id='a'.repeat(96),key=actorLockKey(id);assert.doesNotThrow(()=>Id.parse(id));assert.doesNotThrow(()=>Id.parse(key));assert.ok(key.length<=96);assert.equal(key,actorLockKey(id));assert.notEqual(key,actorLockKey(id.slice(0,-1)+'b'));
});
test('per-actor lock API accepts a maximum-length actor ID hash key',async t=>{
  const f=await fixture(t),id='a'.repeat(96);for(const shot of f.board.shots){const scene=shot.cinematic!.actorScene!;if(scene.primary!.id==='watt')scene.primary!.id=id;for(const a of scene.supporting)if(a.character.id==='watt')a.character.id=id;}
  await writeJson(path.join(f.root,'work/storyboard.json'),f.board);
  const key=actorLockKey(id),r=await f.app.inject({method:'PATCH',url:'/api/projects/fixture/locks',payload:{locked:{[key]:true}}});assert.equal(r.statusCode,200,r.body);assert.equal((await loadState(f.root)).locked[key],true);
});
for(const editKind of ['raw-identity','raw-removal','actor-route'] as const)test(`per-actor lock rejects ${editKind} and preserves board`,async t=>{
  const f=await fixture(t);await lock(f,actorLockKey('watt'));const before=await fs.readFile(path.join(f.root,'work/storyboard.json'));
  const result=editKind==='actor-route'?await f.putActor(altered(f.watt)):await f.edit(board=>{for(const s of board.shots){const scene=s.cinematic!.actorScene!;if(scene.primary!.id==='watt')scene.primary=editKind==='raw-removal'?null:altered(scene.primary!);for(const a of scene.supporting)if(a.character.id==='watt')a.character=altered(a.character);if(editKind==='raw-removal')scene.supporting=scene.supporting.filter(a=>a.character.id!=='watt');}});
  assert.equal(result.statusCode,423,result.body);assert.equal(result.json().error.code,'LOCKED');assert.deepEqual(await fs.readFile(path.join(f.root,'work/storyboard.json')),before);
});
test('actor identity lock allows only staging changes without identity edits',async t=>{
  const f=await fixture(t);await lock(f,actorLockKey('watt'));const before=hash(actorDefinitions(f.board));const r=await f.edit(board=>{board.shots[0]!.cinematic!.performance.expressions[0]!.mood='thinking';});
  assert.equal(r.statusCode,200,r.body);assert.equal(hash(actorDefinitions((await f.doc()).data)),before);assert.equal((await loadState(f.root)).locked[actorLockKey('watt')],true);
});
test('actor route updates every primary/supporting occurrence and derived rig identities',async t=>{
  const f=await fixture(t),changed=altered(f.watt),r=await f.putActor(changed);assert.equal(r.statusCode,200,r.body);
  const p=actorProfile(changed),rig=buildRig(p),board=(await f.doc()).data;let count=0;
  for(const s of board.shots){const scene=s.cinematic!.actorScene!;if(scene.primary!.id==='watt'){count++;assert.deepEqual(scene.primary,changed);assert.equal(s.host!.id,'watt');assert.equal(s.host!.rigHash,rig.rigHash);assert.equal(s.cinematic!.performance.profileHash,p.profileHash);assert.equal(s.cinematic!.leadCharacterId,'watt');}
    for(const a of scene.supporting)if(a.character.id==='watt'){count++;assert.deepEqual(a.character,changed);assert.equal(a.performance.profileHash,p.profileHash);assert.equal(a.performance.leadCharacterId,'watt');}}
  assert.equal(count,2);const cast=await readJson(castFile(f.root),ActorCastManifestSchema);assert.equal(cast.actors.find(a=>a.character.id==='watt')!.profile.profileHash,p.profileHash);
});
test('stale actor revision rejects without replacing current identity',async t=>{
  const f=await fixture(t),old=(await f.doc()).revision;const first=await f.putActor(altered(f.watt),old);assert.equal(first.statusCode,200,first.body);
  const before=await fs.readFile(path.join(f.root,'work/storyboard.json')),r=await f.putActor(f.watt,old);assert.equal(r.statusCode,409,r.body);assert.equal(r.json().error.code,'REVISION_CONFLICT');assert.deepEqual(await fs.readFile(path.join(f.root,'work/storyboard.json')),before);
});
test('busy project rejects actor edit without touching canonical or cast assets',async t=>{
  const f=await fixture(t),before=await fs.readFile(castFile(f.root));await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));
  const r=await f.putActor(altered(f.watt));assert.equal(r.statusCode,409,r.body);assert.equal(r.json().error.code,'PROJECT_BUSY');assert.deepEqual(await fs.readFile(castFile(f.root)),before);
});
for(const key of ['storyboard','ch1.s001','shot:ch1.s002'] as const)test(`actor edit respects ${key} global/shot lock`,async t=>{
  const f=await fixture(t);await lock(f,key);const r=await f.putActor(altered(f.watt));assert.equal(r.statusCode,423,r.body);assert.equal(r.json().error.code,'LOCKED');
});
for(const field of ['quote','name','role'] as const)test(`actor edit rejects unsourced ${field} and preserves valid source clock`,async t=>{
  const f=await fixture(t),changed=structuredClone(f.watt);if(field==='quote')changed.sourceRefs[0]!.quote='Forged biography';else if(field==='name')changed.name='Napoleon';else changed.role='quan sát và Hoàng đế';
  const before=await fs.readFile(path.join(f.root,'work/storyboard.json')),r=await f.putActor(changed);assert.equal(r.statusCode,422,r.body);assert.deepEqual(await fs.readFile(path.join(f.root,'work/storyboard.json')),before);
});
test('obsolete raw-board actor identity locks remain visible when direction data migrates',async t=>{
  const f=await fixture(t),raw=structuredClone(f.board);for(const s of raw.shots)s.cinematic!.producer='story-direction-2.2.20' as typeof DIRECTION_VERSION;
  const key=actorLockKey('watt');await writeJson(path.join(f.root,'work/storyboard.json'),raw);const migrated=await readStoryboardForDirection(path.join(f.root,'work/storyboard.json'),{[key]:true});
  assert.equal(migrated.shots[0]!.cinematic,undefined);assert.deepEqual(actorDefinitions(raw).find(a=>a.id==='watt'),f.watt);assert.throws(()=>assertActorLocks(raw,migrated,{[key]:true}),/Unlock actor/);
});
test('SOURCE21 replanning retains actor locked from obsolete raw board through mock model context',async t=>{
  const f=await fixture(t),raw=structuredClone(f.board);for(const s of raw.shots)s.cinematic!.producer='story-direction-2.2.20' as typeof DIRECTION_VERSION;
  await writeJson(path.join(f.root,'work/storyboard.json'),raw);await lock(f,actorLockKey('watt'));f.config.models.storyboard.provider='gateway';const router=new ModelRouter(f.config,f.root);
  const candidate=structuredClone(f.board);for(const s of candidate.shots)s.cinematic!.artDirection={origin:'model',brief:'A deterministic cast-preserving illustration for migration.',useEnvironment:false,palette:{background:'#142d40',surface:'#eaf3f5',ink:'#142d40',accent:'#f7be52'},showHeading:false,layers:[],models:[]};
  let context:unknown;t.mock.method(router,'structured',async (_role:unknown,input:{context?:unknown},schema:z.ZodTypeAny)=>{context=input.context;return schema.parse(candidate);});
  const next=await createStoryboard(f.root,f.config,router,f.story,f.narration,f.characters,f.chapters,f.beats);
  assert.equal(hash(actorDefinitions(next).find(a=>a.id==='watt')),hash(f.watt));assert.equal((await loadState(f.root)).locked[actorLockKey('watt')],true);assert.equal(hash((context as {lockedActors:unknown[]}).lockedActors[0]),hash(f.watt));
});
test('saved actor resumes scenes, preserving exact narration/audio while replacing actor visuals',async t=>{
  const f=await fixture(t);let validations=0;t.mock.method(HyperFramesEngine.prototype,'validate',async()=>{validations++;return {pass:true,errors:[],diagnostics:[{mock:'browser'}]};});
  assert.equal(f.characters.characters.length,0);for(const s of f.board.shots)s.characters=['watt','black'];
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('No network provider permitted in deterministic resume fixture');});
  // This manually constructed fixture owns authored scenery. State must describe
  // that contract before entering ASSETS_READY, rather than imply a curated
  // environment has already been prepared and approved.
  for(const s of f.board.shots)s.cinematic!.artDirection={origin:'authored',brief:'Deterministic actor studio backdrop.',useEnvironment:false,palette:{background:'#142d40',surface:'#eaf3f5',ink:'#142d40',accent:'#f7be52'},showHeading:false,layers:[],models:[]};
  await writeJson(path.join(f.root,'work/storyboard.json'),f.board);await writeCinematicPlans(f.root,f.board);
  await core.runPipeline(f.root,{until:'ASSETS_READY'});let state=await loadState(f.root);state.approvals.host=true;state.approvals.hostHash=f.rig.rigHash;await saveState(f.root,state);
  await core.runPipeline(f.root,{until:'SCENES_READY'});
  const audio=await fs.readFile(path.join(f.root,'input/narration.wav')),narration=await fs.readFile(path.join(f.root,'work/narration.json')),voice=await fs.readFile(path.join(f.root,'work/voiced-narration.json')),oldScene=hash(await fs.readFile(path.join(f.root,'scenes/ch1.s001/index.html')));
  const changed=altered(f.watt),save=await f.putActor(changed);assert.equal(save.statusCode,200,save.body);assert.equal((await loadState(f.root)).state,'STORYBOARDED');
  const resumed=await core.runPipeline(f.root,{until:'SCENES_READY'});assert.equal(resumed.state,'SCENES_READY');assert.ok(validations>=6);assert.notEqual(hash(await fs.readFile(path.join(f.root,'scenes/ch1.s001/index.html'))),oldScene);
  const manifest=await readJson<AssetManifest>(path.join(f.root,'work/asset-manifest.json')),current=(await f.doc()).data;
  for(const id of ['watt','black'])for(const shot of current.shots){const asset=manifest.assets.find(a=>a.characterId===id&&a.shotIds.includes(shot.id));assert.ok(asset);assert.equal(asset.status,'approved');assert.equal(asset.hash,hash(await fs.readFile(path.join(f.root,asset.path))));}
  assert.equal((await ruleReview(f.root,f.config,current,f.story,f.characters,manifest)).filter(i=>i.type==='character-continuity').length,0);
  assert.deepEqual(await fs.readFile(path.join(f.root,'input/narration.wav')),audio);assert.deepEqual(await fs.readFile(path.join(f.root,'work/narration.json')),narration);assert.deepEqual(await fs.readFile(path.join(f.root,'work/voiced-narration.json')),voice);
  const report=await readJson<{shots:{actors:{actorId:string;profileHash:string}[]}[]}>(path.join(f.root,'work/performance-report.json'));assert.equal(report.shots[0]!.actors.find(a=>a.actorId==='watt')!.profileHash,actorProfile(changed).profileHash);
});

const hints=['Close framing requires intentional face, contact or object focus.','Wide/medium framing must use ensemble focus.','Actor name must contain text','Actor role must contain text'];
for(const hint of hints)test('structured feedback exposes exactly useful static hint: '+hint,()=>{
  const schema=z.object({value:z.string().refine(()=>false,hint)});assert.throws(()=>validateStructured({text:'{"value":"secret-value"}'},schema),(error:unknown)=>error instanceof StructuredOutputError&&error.feedback==='value: custom ('+hint+')'&&!error.feedback.includes('secret-value'));
});
test('real camera and actor-schema failures supply the approved actionable static feedback',async t=>{
  assert.throws(()=>validateStructured({text:JSON.stringify({framing:'close',movement:'locked',anchor:{x:0,y:0},startScale:2,endScale:2})},CameraSchema),(e:unknown)=>e instanceof StructuredOutputError&&e.feedback.includes(hints[0]!));
  assert.throws(()=>validateStructured({text:JSON.stringify({framing:'wide',focus:'face',movement:'locked',anchor:{x:0,y:0},startScale:1,endScale:1})},CameraSchema),(e:unknown)=>e instanceof StructuredOutputError&&e.feedback.includes(hints[1]!));
  const f=await fixture(t);for(const field of ['name','role'] as const){const actor={...f.watt,[field]:'   '};assert.throws(()=>validateStructured({text:JSON.stringify(actor)},ActorDefinitionSchema),(e:unknown)=>e instanceof StructuredOutputError&&e.feedback.includes(field==='name'?hints[2]!:hints[3]!));}
});

test('historical shot cast IDs absent from the legacy bible are accepted by the actor API',async t=>{
  const f=await fixture(t);assert.equal(f.characters.characters.length,0);
  const raw=await f.edit(board=>{for(const s of board.shots)s.characters=['watt','black'];});assert.equal(raw.statusCode,200,raw.body);
  const edited=await f.putActor(altered(f.watt));assert.equal(edited.statusCode,200,edited.body);assert.deepEqual((await f.doc()).data.shots[0]!.characters,['watt','black']);
});
test('actor cast rigs reject legacy character-image asset requests',async t=>{
  const f=await fixture(t),r=await f.edit(board=>{board.shots[0]!.characters=['watt'];board.shots[0]!.assetNeeds.push({id:'legacy-watt',type:'character',characterId:'watt',description:'A forbidden legacy image request for the sourced actor',required:false});});
  assert.equal(r.statusCode,422,r.body);assert.match(r.json().error.message,/actorScene|legacy character/);
});

async function propFixture(t:TestContext){
  const f=await fixture(t),shot=structuredClone(f.board.shots[0]!),c=shot.cinematic!,p=c.performance,profile=actorProfile(c.actorScene!.primary!),part=shot.visualization!.parts.find(part=>part.kind==='piston')!;
  assert.ok(part,'prop fixture manipulates the literal sourced piston');
  const origin={x:part.x*p.stage.width,y:part.y*p.stage.height},destination={x:origin.x-20,y:origin.y};
  p.scale=1;p.root={x:origin.x-rigMetrics(profile).shoulderOffset-55,y:p.stage.groundY};p.walks=[];p.turns=[];p.facing='front';p.gazes=[];
  p.props=[{id:'actor-model',origin,destination}];p.gestures=[{id:'pick-model',action:'pick-place',startMs:0,endMs:5000,contactMs:1000,releaseMs:4000,propId:'actor-model',target:{...origin},destination:{...destination}}];
  const gesture=p.gestures[0]!;gesture.hand='right';
  // This controlled placement replaces the seed pointing choreography. Its one
  // primary owner uses the same contact schedule as the new gesture. Keep the
  // contact accessor shared so the existing bad-contact case reaches the motion
  // validator; owner-specific negatives below deliberately detach that schedule.
  shot.host!.actions=[{type:'operate-model',hand:'right',startMs:shot.startMs+gesture.startMs,endMs:shot.startMs+gesture.endMs,
    get contactMs(){return shot.startMs+gesture.contactMs!;},narrationAnchor:'cue1',
    target:{modelId:shot.visualization!.modelId,partId:part.id,anchor:'center'}}];
  c.propBindings=[{propId:'actor-model',partId:part.id,role:'illustrative-model',sourceRefs:part.sourceRefs}];
  c.artDirection={origin:'authored',brief:'Sourced actor places a conceptual piston on the physical stage.',useEnvironment:false,palette:{background:'#142d40',surface:'#eaf3f5',ink:'#142d40',accent:'#f7be52'},showHeading:false,layers:[],models:[]};
  return {...f,shot,p,profile,part};
}
for(const defect of ['missing','wrong-hand','wrong-clock','wrong-contact','wrong-part','supporting-only','duplicate'] as const)test(`actor pick-place owner rejects ${defect}`,async t=>{
  const f=await propFixture(t),owner={...f.shot.host!.actions[0]!,target:{...f.shot.host!.actions[0]!.target!}};
  // Materialize the shared clock before independently corrupting ownership.
  f.shot.host!.actions=[owner];
  if(defect==='missing')f.shot.host!.actions=[];
  if(defect==='wrong-hand')owner.hand='left';
  if(defect==='wrong-clock')owner.endMs--;
  if(defect==='wrong-contact')owner.contactMs!--;
  if(defect==='wrong-part')owner.target!.partId='not-the-sourced-piston';
  if(defect==='supporting-only'){
    f.shot.host!.actions=[];f.shot.cinematic!.actorScene!.supporting[0]!.actions=[owner];
  }
  if(defect==='duplicate')f.shot.host!.actions.push({...owner});
  assert.throws(()=>validatePropBindings(f.shot),/hand owner|matching hand\/action owner/);
});
for(const origin of ['authored','model'] as const)test(`primary actor sourced pick-place accepts ${origin} direction and real contact geometry`,async t=>{
  const f=await propFixture(t);f.shot.cinematic!.artDirection!.origin=origin;assert.doesNotThrow(()=>validatePropBindings(f.shot));
  const compiled=compilePerformance(f.p,f.profile,{method:'audio-rms',windowMs:20,intervals:[]});assert.ok(compiled.report.maxContactError<1);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
});
for(const damage of ['unsourced','offstage','wrong-origin','wrong-target','bad-contact','legacy','offline','missing-direction'] as const)test(`actor pick-place rejects ${damage}`,async t=>{
  const f=await propFixture(t),c=f.shot.cinematic!;
  if(damage==='unsourced')c.propBindings[0]!.sourceRefs=[{kind:'narration',segmentId:'cue1',quote:'Forged prop'}];
  if(damage==='offstage'){f.p.props[0]!.destination!.x=-1;f.p.gestures[0]!.destination!.x=-1;}
  if(damage==='wrong-origin')f.p.props[0]!.origin.x+=.02;
  if(damage==='wrong-target')f.p.gestures[0]!.target!.x+=.02;
  if(damage==='bad-contact')f.p.gestures[0]!.contactMs=0;
  if(damage==='legacy')delete c.actorScene;
  if(damage==='offline')c.artDirection!.origin='offline';
  if(damage==='missing-direction')delete c.artDirection;
  assert.throws(()=>{validatePropBindings(f.shot);validatePerformance(f.p,f.profile);},/source|evidence|stage|anchor|target|contact|direction|pickup/);
});
test('arbitrary and near-whitelisted secret-bearing custom messages remain absent from feedback/error',()=>{
  for(const message of ['Bearer independent-super-secret',hints[0]+' TOKEN=independent-super-secret','Actor role must contain text\nprivate=independent-super-secret']){
    const schema=z.object({value:z.string().refine(()=>false,message)});assert.throws(()=>validateStructured({text:'{"value":"independent-super-secret"}'},schema),(e:unknown)=>e instanceof StructuredOutputError&&e.feedback==='value: custom'&&!e.message.includes('independent-super-secret'));
  }
});

