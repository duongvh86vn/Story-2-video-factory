import type {Gaze} from '../packages/animation/schemas.js';
// NOT RUN by controller. Behavioral declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {NarrationSchema,StoryboardSchema,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {ActivitySchema,type SpeechActivity} from '../packages/voice/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {actorShotSpeech,rigSpeechInputIdentity,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {VIEW_ACTING_CLOCK_VERSION,ViewActingClockSchema,normalizeViewGazes,projectViewGazes,validateViewActingClock,sourceViewGazeAt,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {BODY_VIEW_EYES_SELECTION,bodyViewEyesMatrixError,registeredBodyViewEyes} from '../packages/animation/body-view-eyes.js';
import {BODY_VIEW_SPEECH_VERSION} from '../packages/animation/body-view-mouth.js';
import {registeredBodyView} from '../packages/animation/body-view-art.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {schemaLibrary} from '../library/schemas/index.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {creativeFixture} from './creative-fixture.js';
import {passiveActorFixtureEvents} from './native-actor-fixture.js';
import {temporary} from './support.js';

const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
/** Clock-only shots carry actual cast/performance data, not a whole directed scene. */
function clockFixture(primary:'lila'|'karo'='lila',view?:'three-quarter-left'|'three-quarter-right'){
  const narration=NarrationSchema.parse({mode:'wav',durationMs:7000,segments:[{id:'cue',startMs:0,endMs:7000,text:'Two forest actors share a story.'}],words:[]});
  const characters=(['lila','karo'] as const).map(actor=>{
    const mode=actor===primary?view??(actor==='lila'?'three-quarter-right':'three-quarter-left'):actor==='lila'?'three-quarter-right':'three-quarter-left';
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,mode,'cutout','silent',BODY_VIEW_EYES_SELECTION);
    return ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',identity:'illustrative',kind:'stick-man',sourceRefs:[{kind:'narration',segmentId:'cue',quote:narration.segments[0]!.text}],appearance:profile.appearance});
  });
  const shots=([ [1000,3000], [3000,5500] ] as const).map(([startMs,endMs],i)=>{
    const participants=characters.map(character=>{
      const definition=actorProfile(character),{plan}=bodyCalibrationPlan(character.id as 'lila'|'karo','rest','happy',undefined,character.appearance.bodyView!,'cutout','silent',BODY_VIEW_EYES_SELECTION);
      plan.id='attention-'+i;plan.leadCharacterId=character.id;plan.profileHash=definition.profileHash;plan.durationMs=endMs-startMs;plan.expressions[0]!.endMs=plan.durationMs;
      plan.stage={width:1280,height:720,groundY:540};plan.root={x:character.id==='lila'?380:800,y:540};plan.scale=.8;
      plan.gazes=[{startMs:0,endMs:plan.durationMs,target:{x:plan.root.x+(plan.facing==='left'?-160:160),y:380}}];
      return {character,performance:plan,actions:[],speakingSegmentIds:[]};
    });
    const lead=participants.find(a=>a.character.id===primary)!,supporting=participants.filter(a=>a!==lead);
    return {id:'attention-'+i,startMs,endMs,narrationSegmentIds:['cue'],cinematic:{performance:lead.performance,actorScene:ActorSceneSchema.parse({primary:lead.character,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting})}} as Shot;
  });
  return {narration,shots,board:{shots} as Storyboard};
}
const nativeState=(f:ReturnType<typeof samplePerformance>)=>({head:f.transforms.head,chest:f.transforms.chest,pelvis:f.transforms.pelvis,
  eyes:Object.fromEntries(Object.entries(f.face).filter(([id])=>id==='view-eyes-layer'||id.startsWith('view-eye-')))});

test('source gaze normalization preserves authored targets/ordering, merges exact adjacency and keeps gaps or target changes',()=>{
  const a={startMs:0,endMs:1000,target:{x:4,y:8}},b={startMs:1000,endMs:2000,target:{x:4,y:8}},before=structuredClone([b,a]);
  assert.deepEqual(normalizeViewGazes([b,a]),[{...a,endMs:2000}]);assert.deepEqual([b,a],before);
  assert.equal(normalizeViewGazes([a,{...b,startMs:1001}]).length,2);assert.equal(normalizeViewGazes([a,{...b,target:{x:4,y:9}}]).length,2);
  assert.deepEqual(projectViewGazes([{...a,endMs:3000}],1200,2200),[{...a,endMs:1000}]);
  assert.throws(()=>normalizeViewGazes([a,{...b,startMs:999}]),/overlapping/);assert.throws(()=>projectViewGazes([a],900,100),/projection span/);
});

test('renderer clock is strict, separate from persisted voice/performance, and matches exact actor/span/local gaze projection',()=>{
  const f=clockFixture(),s=f.shots[1]!,p=s.cinematic!.performance,c=actorViewActingClock(f.board,s,'lila')!;
  assert.equal(c.version,VIEW_ACTING_CLOCK_VERSION);assert.equal(schemaLibrary['view-acting-clock'],ViewActingClockSchema);assert.equal('actingClock' in ActivitySchema.shape,false);
  assert.doesNotThrow(()=>validateViewActingClock(p,c));assert.throws(()=>ViewActingClockSchema.parse({...c,guessed:true}));
  assert.throws(()=>validateViewActingClock(p,{...c,ownerId:'karo'}),/actor or shot span/);assert.throws(()=>validateViewActingClock(p,{...c,endMs:c.endMs-1}),/actor or shot span/);
  assert.throws(()=>validateViewActingClock(p,{...c,runStartMs:c.startMs+1}));assert.throws(()=>validateViewActingClock(p,{...c,gazes:[{...c.gazes[0]!,target:{x:999,y:0}}]}),/source projection/);
  assert.throws(()=>sourceViewGazeAt(c,Number.NaN),/seek outside/);assert.equal(sourceViewGazeAt(c,p.durationMs),undefined);
});

test('declared continuous native views share one original attention cue and deterministic breath at the exact cut/random seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const f=clockFixture(actor,view),a=f.shots[0]!,b=f.shots[1]!,p=a.cinematic!.performance,q=b.cinematic!.performance,profile=actorProfile(a.cinematic!.actorScene!.primary!);
    const ca=actorViewActingClock(f.board,a,actor)!,cb=actorViewActingClock(f.board,b,actor)!;
    assert.deepEqual(ca.gazes,[{startMs:1000,endMs:5500,target:fixedGazeTarget(p.gazes[0]!)}]);assert.equal(ca.sourceIdentityHash,cb.sourceIdentityHash);
    const first=samplePerformance(p,profile,p.durationMs,silence,undefined,ca),second=samplePerformance(q,profile,0,silence,undefined,cb);
    assert.deepEqual(nativeState(first),nativeState(second));assert.notEqual(second.transforms.head,samplePerformance(q,profile,0,silence).transforms.head,'local boundary reset is visible in the diagnostic');
    const whole={...p,durationMs:4500,gazes:[{...p.gazes[0]!,endMs:4500}],expressions:[{startMs:0,endMs:4500,mood:'happy' as const}]},cw={...ca,endMs:5500};
    for(const local of [2500,70,0,400,1250,2300])assert.deepEqual(nativeState(samplePerformance(q,profile,local,silence,undefined,cb)),nativeState(samplePerformance(whole,profile,local+2000,silence,undefined,cw)));
  }
});

test('explicit cuts, real gaze gaps and target changes retain their own boundaries rather than extending another actor cue',()=>{
  const f=clockFixture(),a=f.shots[0]!,b=f.shots[1]!;b.cinematic!.actorScene!.continuity='cut';
  const cut=actorViewActingClock(f.board,a,'lila')!;assert.equal(cut.runEndMs,a.endMs);assert.equal(cut.gazes[0]!.endMs,a.endMs);
  b.cinematic!.actorScene!.continuity='continuous';b.cinematic!.performance.gazes[0]!.startMs=100;
  let c=actorViewActingClock(f.board,a,'lila')!;assert.equal(c.gazes.length,2);assert.equal(sourceViewGazeAt(c,a.endMs-a.startMs),undefined);
  b.cinematic!.performance.gazes[0]!.startMs=0;fixedGazeTarget(b.cinematic!.performance.gazes[0]!).y+=40;c=actorViewActingClock(f.board,a,'lila')!;
  assert.equal(c.gazes.length,2);assert.notDeepEqual(fixedGazeTarget(c.gazes[0]!),fixedGazeTarget(c.gazes[1]!));
});

test('continuous run rejects incompatible time, cast/view/stage/scale/profile and malformed nonlocal tracks',()=>{
  for(const change of ['gap','view','cast','stage','scale','root','profile','outside'] as const){
    const f=clockFixture(),b=f.shots[1]!,p=b.cinematic!.performance;
    if(change==='gap'){b.startMs+=10;p.durationMs-=10;p.gazes[0]!.endMs-=10;}
    if(change==='view')b.cinematic!.actorScene!.primary!.appearance.bodyView='three-quarter-left';
    if(change==='cast')b.cinematic!.actorScene!.supporting=[];
    if(change==='stage')p.stage.width+=10;if(change==='scale')p.scale+=.1;if(change==='root')p.root.x+=10;if(change==='profile')p.profileHash='changed';
    if(change==='outside')p.gazes[0]!.endMs+=1;
    assert.throws(()=>actorViewActingClock(f.board,f.shots[0]!,'lila'),/needs-view-acting-phase/);
  }
  const f=clockFixture(),duplicate=structuredClone(f.shots[1]!);assert.throws(()=>actorViewActingClock({shots:[...f.shots,duplicate]},f.shots[0]!,'lila'),/duplicate storyboard/);
});

test('cache/repair binding follows neighboring attention/run inputs and actual repaired shot, with stable schema serialization',()=>{
  const f=clockFixture(),a=f.shots[0]!,binding=rigSpeechPublicationBinding(a,f.narration,f.board)!,initial=rigSpeechInputIdentity(a,f.narration,f.board)!;
  assert.equal(initial.viewActing.length,2);
  const sibling=structuredClone(f.shots[1]!);fixedGazeTarget(sibling.cinematic!.performance.gazes[0]!).y+=40;
  assert.notEqual(hash(initial),hash(rigSpeechInputIdentity(a,f.narration,{shots:[a,sibling]})));
  assert.throws(()=>assertRigSpeechPublicationBinding(a,f.narration,{shots:[a,sibling]},binding),/changed before repair publication/);
  const repaired=structuredClone(a);repaired.cinematic!.performance.gazes[0]!.startMs=100;const replacement=rigSpeechPublicationBinding(repaired,f.narration,f.board)!;
  assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(repaired,f.narration,f.board,replacement));assert.notEqual(binding.identityHash,replacement.identityHash);
  // Clock-only fixture omits unrelated full storyboard fields; canonical schema
  // round-trip is exercised by the full scene fixture below.
  const reordered=structuredClone(f.board);reordered.shots.reverse();assert.equal(hash(initial),hash(rigSpeechInputIdentity(a,f.narration,reordered)));
});

test('acting and speech context must name the same profile and source span; no implicit eyes or relaxation of production guards',()=>{
  const f=clockFixture(),b=f.shots[1]!,p=b.cinematic!.performance,profile=actorProfile(b.cinematic!.actorScene!.primary!),c=actorViewActingClock(f.board,b,'lila')!;
  const speech=actorShotSpeech(silence,f.narration,'lila',[],b.startMs,b.endMs,[]);
  assert.doesNotThrow(()=>samplePerformance(p,profile,0,speech.activity,speech.sourceClock,c));
  assert.throws(()=>samplePerformance(p,profile,0,speech.activity,{...speech.sourceClock,startMs:b.startMs-1,endMs:b.endMs-1},c),/clocks disagree/);
  assert.throws(()=>samplePerformance({...p,leadCharacterId:'karo'},profile,0,silence,undefined,{...c,ownerId:'karo'}),/actor profile mismatch/);
  const plain=bodyCalibrationPlan('lila','rest','happy',undefined,'three-quarter-right');plain.plan.durationMs=p.durationMs;plain.plan.gazes=[];
  assert.throws(()=>samplePerformance(plain.plan,plain.profile,0,silence,undefined,{...c,gazes:[]}),/select a registered/);
  const cfg=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(cfg)!.readiness.productionReady,false);assert.throws(()=>requireTopicProductionReady(cfg),/needs-art-direction/);
});

test('compiler carries source event/refinement/report/namespace state for gaze and blink without resetting the body cut',()=>{
  const f=clockFixture('karo'),s=f.shots[0]!,p=s.cinematic!.performance,profile=actorProfile(s.cinematic!.actorScene!.primary!),c=actorViewActingClock(f.board,s,'karo')!;
  const scene=performanceScene(p,profile,silence,undefined,undefined,undefined,undefined,c),compiled=scene.compiled;
  assert.ok(compiled.frames.some(frame=>frame.timeMs===140));assert.ok(compiled.frames.some(frame=>frame.timeMs===1250),'absolute Karo blink peak2250');
  assert.equal(compiled.report.viewActingPhase!.runEndMs,5500);assert.equal(compiled.report.viewActingPhase!.wholeBodyActionContinuous,false);assert.equal(compiled.report.viewActingPhase!.approved,false);
  assert.equal(compiled.report.bodyEyes!.blinkClock,'source absolute time');assert.equal(compiled.frames.at(-1)!.timeMs,p.durationMs);
  const eye=registeredBodyViewEyes(profile),physical=registeredBodyView(profile).headScale*p.scale*profile.appearance.headScale*profile.appearance.bodyScale;
  for(let i=1;i<compiled.frames.length;i++){const a=compiled.frames[i-1]!,b=compiled.frames[i]!,wanted=samplePerformance(p,profile,(a.timeMs+b.timeMs)/2,silence,undefined,c);
    assert.ok(bodyViewEyesMatrixError(eye,a.face,b.face,wanted.face,.5)*physical<=.2001);}
  assert.match(compilePerformance(p,profile,silence,'actor-karo-',undefined,c).js,/actor-karo-view-eye-screen-left-glyph/);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),s,2000000,referenceBodyAssets(profile.appearance).map(a=>a.path),p.stage),[]);
});

test('canonical paired performers use the same board-derived breath/gaze clock through primary/supporting role changes',async t=>{
  const f=clockFixture(),base=await creativeFixture(await temporary(t));
  const shots=f.shots.map((partial,i)=>{
    const s=structuredClone(base.shot),c=s.cinematic!;s.id=partial.id;c.shotId=s.id;s.startMs=partial.startMs;s.endMs=partial.endMs;s.narrationSegmentIds=['cue'];
    c.performance=structuredClone(partial.cinematic!.performance);c.actorScene=structuredClone(partial.cinematic!.actorScene!);
    // One owner for the whole cue; Karo remains a silent listening actor.
    c.actorScene.primary!.appearance.bodySpeech=BODY_VIEW_SPEECH_VERSION;c.actorScene.speakingSegmentIds=['cue'];
    if(i){const karo=c.actorScene.supporting[0]!,lila={character:c.actorScene.primary!,performance:c.performance,actions:[],speakingSegmentIds:['cue']};
      c.actorScene.primary=karo.character;c.performance=karo.performance;c.actorScene.speakingSegmentIds=[];c.actorScene.supporting=[lila];}
    s.visualization!.events=passiveActorFixtureEvents(s,f.narration);c.propBindings=[];c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};
    bindActorShot(s,base.profile,base.rig);c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};
    s.camera={...s.camera,shotSize:c.camera.framing,movement:c.camera.movement};s.host!.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];
    for(const actor of c.actorScene.supporting)actor.actions=[{type:'idle',startMs:s.startMs,endMs:s.endMs}];return s;
  });
  const board=StoryboardSchema.parse({shots}),signal={...silence,intervals:[{startMs:0,endMs:7000,level:.6}]};
  for(const shot of board.shots){
    const binding=rigSpeechPublicationBinding(shot,f.narration,board)!;
    assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(shot,NarrationSchema.parse(JSON.parse(JSON.stringify(f.narration))),StoryboardSchema.parse(JSON.parse(JSON.stringify(board))),binding));
    const rendered=renderCinematic(shot,base.profile,base.rig,signal,base.config,undefined,f.narration,undefined,undefined,board);
    if(!('actors' in rendered.report))throw new Error('Expected native rig reports');
    assert.equal(rendered.report.actors.length,2);for(const actor of rendered.report.actors){if(!('report' in actor))throw new Error('Expected compiled actor');assert.equal(actor.report.viewActingPhase!.runStartMs,1000);assert.equal(actor.report.viewActingPhase!.runEndMs,5500);}
    const html=rendered.files.files.find(file=>file.path==='index.html')!.content,ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
    const cast=[shot.cinematic!.actorScene!.primary!,...shot.cinematic!.actorScene!.supporting.map(a=>a.character)],assets=cast.flatMap(a=>referenceBodyAssets(a.appearance).map(asset=>asset.path));
    assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),shot,2000000,assets,base.config.rendering.final),[]);
  }
});

function fixedGazeTarget(gaze:Gaze){assert.ok('target' in gaze);return gaze.target;}
