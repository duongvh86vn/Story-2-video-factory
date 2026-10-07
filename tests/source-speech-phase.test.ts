// NOT RUN by controller. Runtime declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {hash,writeJson,writeAtomic,exists,readJson} from '../packages/core/utils.js';
import {StoryboardSchema,NarrationSchema,type Narration,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {ActivitySchema,type SpeechActivity} from '../packages/voice/schemas.js';
import {SPEECH_SOURCE_CLOCK_VERSION,SpeechSourceClockSchema,projectSpeechActivity,windowSpeechActivity,validateSpeechSourceClock,speechSourceClockDescription,type SpeechSourceClock} from '../packages/animation/speech-clock.js';
import {actorShotSpeech,narrationCueOwners,rigSpeechInputIdentity,shotUsesSourceSpeechClock,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {BODY_VIEW_SPEECH_VERSION,bodyViewMouthLevel,bodyViewMouthDescription} from '../packages/animation/body-view-mouth.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {compilePerformance,samplePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {ActorDefinitionSchema,ActorSceneSchema,type ActorDefinition} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {schemaLibrary} from '../library/schemas/index.js';
import {persistCinematicArtworkRepair} from '../packages/director/artwork-repair.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';

const n:Narration=NarrationSchema.parse({mode:'wav',durationMs:7000,words:[],segments:[
  {id:'lila-line',startMs:1000,endMs:3600,text:'Lila: We can share this.'},
  {id:'karo-line',startMs:3800,endMs:6000,text:'Karo: Thank you.'}]});
const signal:SpeechActivity={method:'audio-rms',windowMs:20,audioHash:'unchanged-original-audio',intervals:[
  {startMs:500,endMs:2200,level:.4},{startMs:2200,endMs:3000,level:.9},
  {startMs:3000,endMs:3500,level:.5},{startMs:3850,endMs:6000,level:.7}]};
const candidate=(actor:'lila'|'karo',durationMs:number,view:'three-quarter-left'|'three-quarter-right'=actor==='lila'?'three-quarter-right':'three-quarter-left')=>{
  const result=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BODY_VIEW_SPEECH_VERSION);
  result.plan.durationMs=durationMs;result.plan.expressions[0]!.endMs=durationMs;return result;
};
const definition=(actor:'lila'|'karo',cueId:string):ActorDefinition=>{
  const cue=n.segments.find(s=>s.id===cueId)!,{profile}=candidate(actor,5000);
  return ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',sourceRefs:[{kind:'narration',segmentId:cue.id,quote:cue.text}],appearance:profile.appearance});
};
// Source-ownership/clock fixture only. Matching native performance spans are
// supplied for cache/repair attention binding; this is not a whole scene/story fixture.
const declaredShot=(id:string,startMs:number,endMs:number,primary:'lila'|'karo',primaryIds:string[],supportIds:string[]=[]):Shot=>{
  const other=primary==='lila'?'karo':'lila';
  const characters=[definition(primary,n.segments[0]!.id),definition(other,n.segments[1]!.id)],plans=characters.map(character=>{
    const p=candidate(character.id as 'lila'|'karo',endMs-startMs).plan;p.id=id;p.profileHash=actorProfile(character).profileHash;return p;
  });
  return {id,startMs,endMs,narrationSegmentIds:[...new Set([...primaryIds,...supportIds])],cinematic:{performance:plans[0],actorScene:{primary:characters[0],speakingSegmentIds:primaryIds,continuity:'cut',supporting:[{character:characters[1],performance:plans[1],speakingSegmentIds:supportIds}]}}} as Shot;
};
const clockFor=(a:SpeechActivity,startMs:number,endMs:number):SpeechSourceClock=>({version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:'lila',scope:'narration',cueIds:[],startMs,endMs,sourceActivityHash:hash(a),activity:windowSpeechActivity(a,startMs,endMs)});
const mouthState=(frame:ReturnType<typeof samplePerformance>)=>({paths:Object.fromEntries(Object.entries(frame.paths??{}).filter(([id])=>id.startsWith('view-mouth-'))),opacity:frame.face['view-mouth-layer']!.opacity!});

test('source context requires exact local projection, owner/span and metadata without changing persisted activity',()=>{
  const before=structuredClone({n,signal}),{activity,sourceClock}=actorShotSpeech(signal,n,'lila',['lila-line'],2000,3000,['lila-line']);
  assert.equal(activity.audioHash,signal.audioHash);assert.equal(sourceClock.activity.audioHash,signal.audioHash);
  assert.equal(sourceClock.scope,'storyboard-cues');assert.equal(sourceClock.startMs,2000);
  assert.doesNotThrow(()=>validateSpeechSourceClock(activity,sourceClock,'lila',1000));
  assert.throws(()=>validateSpeechSourceClock({...activity,audioHash:'changed'},sourceClock),/differs/);
  assert.throws(()=>validateSpeechSourceClock({...activity,windowMs:40},sourceClock),/differs/);
  assert.throws(()=>validateSpeechSourceClock({...activity,method:'segment-draft'},sourceClock),/differs/);
  assert.throws(()=>validateSpeechSourceClock(activity,sourceClock,'karo',1000),/owner or shot span/);
  assert.throws(()=>validateSpeechSourceClock(activity,sourceClock,'lila',999),/owner or shot span/);
  assert.throws(()=>SpeechSourceClockSchema.parse({...sourceClock,inferredSpeaker:true}));
  assert.equal(schemaLibrary['speech-source-clock'],SpeechSourceClockSchema);
  assert.equal('sourceClock' in ActivitySchema.shape,false);assert.deepEqual({n,signal},before);
});

test('same complete cue through two shots keeps the original mouth phase at the exact cut and random seeks',()=>{
  const before=structuredClone(signal),cut=2500;
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const full=actorShotSpeech(signal,n,actor,['lila-line'],1000,3600,['lila-line']);
    const first=actorShotSpeech(signal,n,actor,['lila-line'],1000,cut,['lila-line']);
    const second=actorShotSpeech(signal,n,actor,['lila-line'],cut,3600,['lila-line']);
    const whole=candidate(actor,2600,view),a=candidate(actor,1500,view),b=candidate(actor,1100,view);
    const wholeAtCut=mouthState(samplePerformance(whole.plan,whole.profile,cut-1000,full.activity,full.sourceClock));
    assert.deepEqual(mouthState(samplePerformance(a.plan,a.profile,1500,first.activity,first.sourceClock)),wholeAtCut);
    assert.deepEqual(mouthState(samplePerformance(b.plan,b.profile,0,second.activity,second.sourceClock)),wholeAtCut);
    assert.ok(wholeAtCut.opacity>0);assert.equal(bodyViewMouthLevel(first.activity,1500),0,'old clipped endpoint alone closes');
    for(const at of [2550,2499.99,3100,1000,3570,1800,2500]){
      const split=at<cut?first:second,start=at<cut?1000:cut;
      assert.equal(bodyViewMouthLevel(split.activity,at-start,split.sourceClock),bodyViewMouthLevel(full.activity,at-1000,full.sourceClock));
    }
  }
  assert.deepEqual(signal,before);
});

test('adjacent complete cues join only their declared same owner; speaker handoff does not borrow activity',()=>{
  const lines:Narration={mode:'script',durationMs:5000,words:[],segments:[{id:'one',startMs:500,endMs:2500,text:'One.'},{id:'two',startMs:2500,endMs:4500,text:'Two.'}]};
  const a:SpeechActivity={...signal,intervals:[{startMs:0,endMs:5000,level:.6}]};
  const sameBefore=actorShotSpeech(a,lines,'lila',['one'],500,2500,['one','two']);
  const sameAfter=actorShotSpeech(a,lines,'lila',['two'],2500,4500,['one','two']);
  assert.ok(bodyViewMouthLevel(sameBefore.activity,2000,sameBefore.sourceClock)>0);
  assert.equal(bodyViewMouthLevel(sameBefore.activity,2000,sameBefore.sourceClock),bodyViewMouthLevel(sameAfter.activity,0,sameAfter.sourceClock));
  const first=actorShotSpeech(a,lines,'lila',['one'],500,2500,['one']);
  const second=actorShotSpeech(a,lines,'karo',['two'],2500,4500,['two']);
  assert.equal(bodyViewMouthLevel(first.activity,2000,first.sourceClock),0);assert.equal(bodyViewMouthLevel(second.activity,0,second.sourceClock),0);
  const absent=actorShotSpeech(a,lines,'karo',[],500,2500,['two']);assert.deepEqual(absent.activity.intervals,[]);
  assert.equal(bodyViewMouthLevel(absent.activity,1500,absent.sourceClock),0);
});

test('whole storyboard ownership deduplicates appearances across primary/supporting roles and rejects guessed conflicts',()=>{
  const a=declaredShot('a',1000,2500,'lila',['lila-line']),b=declaredShot('b',2500,6000,'karo',['karo-line'],['lila-line']),board={shots:[a,b]};
  const owners=narrationCueOwners(board,a,n);assert.deepEqual(owners.get('lila'),['lila-line']);assert.deepEqual(owners.get('karo'),['karo-line']);
  const conflict=structuredClone(b);conflict.cinematic!.actorScene!.speakingSegmentIds.push('lila-line');
  assert.throws(()=>narrationCueOwners({shots:[a,conflict]},a,n),/conflicting actor owners/);
  const unknown=structuredClone(a);unknown.cinematic!.actorScene!.speakingSegmentIds=['unknown'];unknown.narrationSegmentIds=['unknown'];
  assert.throws(()=>narrationCueOwners(board,unknown,n),/unknown narration cue/);
  const detached=structuredClone(a);detached.narrationSegmentIds=[];assert.throws(()=>narrationCueOwners(board,detached,n),/outside shot anchors/);
});

test('repair current shot overrides only its matching board entry without mutating source or inferring absent cues',()=>{
  const a=declaredShot('a',1000,3600,'lila',['lila-line']),b=declaredShot('b',3800,6000,'karo',['karo-line']),board={shots:[a,b]},before=structuredClone(board);
  const repaired=structuredClone(a);repaired.cinematic!.actorScene!.speakingSegmentIds=[];repaired.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['lila-line'];
  const owners=narrationCueOwners(board,repaired,n);assert.equal(owners.get('lila'),undefined);assert.deepEqual(owners.get('karo'),['karo-line','lila-line']);
  assert.deepEqual(board,before);assert.throws(()=>actorShotSpeech(signal,n,'lila',['lila-line'],1000,3600,[]),/missing or unknown/);
  const fallback=actorShotSpeech(signal,n,'lila',['lila-line'],1000,2500);assert.equal(fallback.sourceClock.scope,'shot-cues');
  assert.deepEqual(fallback.sourceClock.cueIds,['lila-line']);assert.equal(speechSourceClockDescription(fallback.sourceClock).audioVerified,false);
});

test('bounded source halo is equivalent to complete-track sampling for centers, ramps, short intervals and distant gaps',()=>{
  const dense:SpeechActivity={...signal,intervals:Array.from({length:240},(_,i)=>({startMs:i*20,endMs:(i+1)*20,level:i%23===0?0:(i%9+1)/10})).concat([
    {startMs:5000,endMs:9000,level:.3},{startMs:9000,endMs:15000,level:.9},{startMs:17000,endMs:22000,level:.5}])};
  for(const [start,end] of [[451,717],[1531,1763],[4999,5010],[8999,9001],[14995,15100],[15900,16000],[17000,17035]]){
    const clock=clockFor(dense,start!,end!),local=projectSpeechActivity(dense,start!,end!);
    validateSpeechSourceClock(local,clock,'lila',end!-start!);assert.equal(clock.sourceActivityHash,hash(dense));
    for(const at of [0,.01,(end!-start!)*.17,(end!-start!)/2,end!-start!-.01,end!-start!])assert.equal(bodyViewMouthLevel(local,at,clock),bodyViewMouthLevel(dense,start!+at));
    assert.ok(clock.activity.intervals.length<dense.intervals.length);
    for(const c of clock.activity.intervals)assert.ok(dense.intervals.some(original=>hash(original)===hash(c)),'never clip halo samples');
  }
});

test('source gap and zero are retained at cut endpoints and throughout local intervals',()=>{
  const a:SpeechActivity={...signal,intervals:[{startMs:1000,endMs:2000,level:.8},{startMs:2000,endMs:2300,level:0},{startMs:2600,endMs:4000,level:.6}]};
  const lines:Narration={mode:'wav',durationMs:5000,words:[],segments:[{id:'one',startMs:500,endMs:4500,text:'Unchanged line.'}]};
  const before=structuredClone({a,lines});
  for(const [start,end] of [[1500,2000],[2000,2500],[2300,2700]]){
    const own=actorShotSpeech(a,lines,'lila',['one'],start!,end!,['one']);
    for(const absolute of [2000,2150,2300,2500])if(absolute>=start!&&absolute<=end!)assert.equal(bodyViewMouthLevel(own.activity,absolute-start!,own.sourceClock),0);
  }
  assert.deepEqual({a,lines},before);
});

test('malformed source outside the shot, stale local data, duplicate cues and invalid source spans fail closed',()=>{
  const own=actorShotSpeech(signal,n,'lila',['lila-line'],2000,3000,['lila-line']),{profile,plan}=candidate('lila',1000);
  const bad={...signal,intervals:[...signal.intervals,{startMs:6500,endMs:6400,level:0}]};
  assert.throws(()=>actorShotSpeech(bad,n,'lila',['lila-line'],2000,3000,['lila-line']));
  assert.throws(()=>actorShotSpeech(signal,undefined,'lila',['lila-line'],2000,3000),/requires narration/);
  assert.throws(()=>actorShotSpeech(signal,n,'lila',['unknown'],2000,3000),/missing or unknown/);
  assert.throws(()=>compilePerformance(plan,profile,{...own.activity,intervals:[]},'',own.sourceClock),/differs/);
  assert.throws(()=>samplePerformance(plan,profile,500,own.activity,{...own.sourceClock,ownerId:'karo'}),/owner or shot span/);
  assert.throws(()=>bodyViewMouthLevel(own.activity,0,{...own.sourceClock,cueIds:['lila-line','lila-line']}),/duplicate/);
  for(const [start,end] of [[-1,100],[0,0],[10,5],[.5,100],[0,Infinity]]){
    assert.throws(()=>windowSpeechActivity(signal,start!,end!),/invalid shot clock/);assert.throws(()=>projectSpeechActivity(signal,start!,end!),/invalid shot clock/);
  }
});

test('compiled source phase keeps endpoint mouth state, namespaced curves, duration and candidate/resource contracts',()=>{
  for(const actor of ['lila','karo'] as const){
    const own=actorShotSpeech(signal,n,actor,['lila-line'],1000,2500,['lila-line']),{profile,plan}=candidate(actor,1500);
    const scene=performanceScene(plan,profile,own.activity,undefined,undefined,undefined,own.sourceClock),compiled=scene.compiled;
    assert.deepEqual(mouthState(compiled.frames.at(-1)!),mouthState(samplePerformance(plan,profile,1500,own.activity,own.sourceClock)));
    assert.ok(compiled.frames.at(-1)!.face['view-mouth-layer']!.opacity!>0);assert.equal(compiled.frames.at(-1)!.timeMs,1500);
    assert.equal(compiled.report.bodySpeech!.sourcePhase!.version,SPEECH_SOURCE_CLOCK_VERSION);assert.equal(compiled.report.bodySpeech!.sourcePhase!.scope,'storyboard-cues');
    assert.equal(compiled.report.bodySpeech!.sourcePhase!.sourceActivityHash,own.sourceClock.sourceActivityHash);
    assert.equal(compiled.report.bodySpeech!.fingerprint,bodyViewMouthDescription.fingerprint);
    assert.equal(compiled.report.bodySpeech!.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.equal(compiled.report.bodySpeech!.approved,false);
    const prefixed=compilePerformance(plan,profile,own.activity,'actor-'+actor+'-',own.sourceClock);assert.match(prefixed.js,new RegExp('actor-'+actor+'-view-mouth-interior'));
    const shot={id:plan.id,startMs:1000,endMs:2500} as Shot,assets=referenceBodyAssets(profile.appearance).map(a=>a.path);
    assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),shot,2000000,assets,plan.stage),[]);
  }
});

test('omitted context retains labelled local behavior and default silent authored views remain closed',()=>{
  const own=actorShotSpeech(signal,n,'lila',['lila-line'],1000,2500,['lila-line']),{profile,plan}=candidate('lila',1500);
  assert.equal(samplePerformance(plan,profile,1500,own.activity).face['view-mouth-layer']!.opacity,0);
  assert.ok(samplePerformance(plan,profile,1500,own.activity,own.sourceClock).face['view-mouth-layer']!.opacity!>0);
  assert.equal(compilePerformance(plan,profile,own.activity).report.bodySpeech!.sourcePhase,null);
  const plain=bodyCalibrationPlan('lila','rest','happy',undefined,'three-quarter-right');plain.plan.durationMs=1500;
  assert.throws(()=>samplePerformance(plain.plan,plain.profile,500,own.activity),/needs-view-voice-animation/);
});

test('derived rig speech identity changes for neighboring ownership and narration edits, only for selected mouth actors',()=>{
  const a=declaredShot('a',1000,3600,'lila',['lila-line']),b=declaredShot('b',3800,6000,'lila',['karo-line']),board={shots:[a,b]};
  const initial=rigSpeechInputIdentity(a,n,board)!;assert.deepEqual(initial.owners.find(o=>o.actorId==='lila')!.cueIds,['karo-line','lila-line']);
  const changed=structuredClone(b);changed.cinematic!.actorScene!.speakingSegmentIds=[];changed.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['karo-line'];
  assert.notEqual(hash(initial),hash(rigSpeechInputIdentity(a,n,{shots:[a,changed]})));
  for(const edit of ['clock','text'] as const){const other=structuredClone(n);if(edit==='clock')other.segments[1]!.startMs+=20;else other.segments[1]!.text+=' Preserved new content.';
    assert.notEqual(hash(initial),hash(rigSpeechInputIdentity(a,other,board)));}
  const legacy=structuredClone(a);for(const actor of [legacy.cinematic!.actorScene!.primary!,...legacy.cinematic!.actorScene!.supporting.map(s=>s.character)])delete actor.appearance.bodySpeech;
  assert.equal(shotUsesSourceSpeechClock(legacy),false);assert.equal(rigSpeechInputIdentity(legacy,n,{shots:[legacy,b]}),undefined);
  // This checks the pure identity dependency, not cache/resume/lock publication runtime.
});

test('repair acceptance rejects changed nonlocal ownership/narration and requires the rendering binding',()=>{
  const a=declaredShot('a',1000,3600,'lila',['lila-line']),b=declaredShot('b',3800,6000,'lila',['karo-line']),board={shots:[a,b]};
  const binding=rigSpeechPublicationBinding(a,n,board)!;assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(a,n,board,binding));
  const sibling=structuredClone(b);sibling.cinematic!.actorScene!.speakingSegmentIds=[];sibling.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['karo-line'];
  assert.throws(()=>assertRigSpeechPublicationBinding(a,n,{shots:[a,sibling]},binding),/changed before repair publication/);
  const clockEdit=structuredClone(n);clockEdit.segments[0]!.endMs-=20;assert.throws(()=>assertRigSpeechPublicationBinding(a,clockEdit,board,binding),/changed before repair publication/);
  assert.throws(()=>assertRigSpeechPublicationBinding(a,n,board),/changed before repair publication/);
  const repaired=structuredClone(a);repaired.cinematic!.actorScene!.speakingSegmentIds=[];repaired.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['lila-line'];
  const repairBinding=rigSpeechPublicationBinding(repaired,n,board)!;assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(repaired,n,board,repairBinding));
});

test('disk repair acceptance preserves accepted files when a sibling cue owner changes after scene rendering [P2 regression]',async t=>{
  const root=await temporary(t),f=await creativeFixture(root);
  // Complete schema fixtures reach the real read/acceptance boundary. They do
  // not request a model, browser or full story/factual/render acceptance here.
  const shots=[[1000,3600,'lila-line'],[3800,6000,'karo-line']].map(([start,end,cue],i)=>{
    const s=structuredClone(f.shot),c=s.cinematic!;s.id='publication-'+i;c.shotId=s.id;s.startMs=start as number;s.endMs=end as number;s.narrationSegmentIds=[cue as string];
    s.visualization!.events=[];c.propBindings=[];
    const plans=(['lila','karo'] as const).map((actor,index)=>{const {plan}=candidate(actor,s.endMs-s.startMs);plan.stage={width:1280,height:720,groundY:540};plan.root={x:index?800:380,y:540};plan.scale=.8;return plan;});
    c.performance=plans[0]!;c.actorScene=ActorSceneSchema.parse({primary:definition('lila','lila-line'),speakingSegmentIds:[cue],supporting:[{character:definition('karo','karo-line'),performance:plans[1],actions:[],speakingSegmentIds:[]}]});
    bindActorShot(s,f.profile,f.rig);return s;
  });
  const board=StoryboardSchema.parse({shots}),previous=board.shots[0]!,repaired=structuredClone(previous),binding=rigSpeechPublicationBinding(repaired,n,board)!;
  const changed=structuredClone(board);changed.shots[1]!.cinematic!.actorScene!.speakingSegmentIds=[];changed.shots[1]!.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['karo-line'];
  const attempt=path.join(root,'work/attempts/candidate.json'),record=path.join(root,'scenes',previous.id,'scene.json'),html=path.join(root,'scenes',previous.id,'index.html');
  await writeJson(path.join(root,'work/storyboard.json'),board);await writeJson(path.join(root,'work/narration.json'),n);await writeJson(path.join(root,'work/beats.json'),[f.beat]);
  const readBackNarration=await readJson(path.join(root,'work/narration.json'),NarrationSchema),readBackBoard=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
  assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(repaired,readBackNarration,readBackBoard,binding),'unchanged disk identity must match before the sibling edit');
  assert.equal(hash(rigSpeechPublicationBinding(repaired,readBackNarration,readBackBoard)),hash(binding));
  await writeJson(path.join(root,'work/storyboard.json'),changed);
  await writeJson(attempt,{status:'domain-validated',result:repaired});await writeJson(record,{validated:true,inputHash:'accepted-old-input'});await writeAtomic(html,'accepted prior scene');
  const protectedFiles=[path.join(root,'work/storyboard.json'),path.join(root,'work/narration.json'),path.join(root,'work/beats.json'),attempt,record,html];
  const before=await Promise.all(protectedFiles.map(file=>fs.readFile(file,'utf8')));
  await assert.rejects(persistCinematicArtworkRepair(root,f.config,previous,repaired,attempt,new Map([[`scenes/${previous.id}/index.html`,'replacement candidate']]),binding),/needs-speech-phase: storyboard\/narration source identity changed/);
  assert.deepEqual(await Promise.all(protectedFiles.map(file=>fs.readFile(file,'utf8'))),before);
  assert.equal(await exists(path.join(root,'work/artwork-transactions')),false,'reject before staging accepted files');
});

test('canonical paired scenes use the same board phase for primary/supporting actors and preserve local resources',async t=>{
  // Reuses an engineering stage only as a structural renderer fixture. This is
  // not a factual story test, theme restriction or three-input acceptance claim.
  const f=await creativeFixture(await temporary(t)),definitions=[definition('lila','lila-line'),definition('karo','karo-line')];
  const shots=[[1000,2500],[2500,6000]].map(([start,end],i)=>{
    const s=structuredClone(f.shot),c=s.cinematic!;s.id='source-cut-'+i;c.shotId=s.id;s.startMs=start!;s.endMs=end!;
    s.narrationSegmentIds=i?['lila-line','karo-line']:['lila-line'];s.visualization!.events=[];c.propBindings=[];
    const plans=definitions.map((d,index)=>{
      const {plan}=candidate(d.id as 'lila'|'karo',end!-start!);plan.id=s.id;plan.stage={width:1280,height:720,groundY:540};plan.root={x:index?800:380,y:540};plan.scale=.8;return plan;
    });
    c.performance=plans[0]!;c.actorScene=ActorSceneSchema.parse({primary:definitions[0],speakingSegmentIds:['lila-line'],supporting:[{character:definitions[1],performance:plans[1],actions:[],speakingSegmentIds:i?['karo-line']:[]}]});
    c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};
    bindActorShot(s,f.profile,f.rig);c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};
    s.camera={...s.camera,shotSize:c.camera.framing,movement:c.camera.movement};s.host!.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];
    c.actorScene!.supporting[0]!.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];return s;
  });
  const board:Storyboard={shots},before=structuredClone({board,n,signal});
  const rendered=shots.map(s=>renderCinematic(s,f.profile,f.rig,signal,f.config,undefined,n,undefined,undefined,board));
  const allowed=definitions.flatMap(d=>referenceBodyAssets(actorProfile(d).appearance).map(a=>a.path));
  rendered.forEach((r,i)=>{
    assert.ok('actors' in r.report);if(!('actors' in r.report))throw new Error('Expected rig report');
    assert.deepEqual(r.report.actors.map(a=>a.actorId),['lila','karo']);
    for(const a of r.report.actors){assert.ok('report' in a);if(!('report' in a))throw new Error('Expected rig actor report');assert.equal(a.report.bodySpeech!.sourcePhase!.scope,'storyboard-cues');assert.equal(a.report.bodySpeech!.sourcePhase!.offsetMs,shots[i]!.startMs);assert.equal(a.report.bodySpeech!.sourceAudioHash,signal.audioHash);assert.equal(a.report.bodySpeech!.audioVerified,false);}
    const html=r.files.files.find(x=>x.path==='index.html')!.content,ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size);assert.match(html,/id="actor-karo-view-mouth-layer"/);
    assert.deepEqual(validateSceneFiles(secureSceneFiles(r.files),shots[i]!,2000000,allowed,f.config.rendering.final),[]);
  });
  assert.deepEqual({board,n,signal},before);
});
