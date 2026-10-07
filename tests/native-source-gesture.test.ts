// NOT RUN by controller. Runtime declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import {NarrationSchema,StoryboardSchema,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechInputIdentity,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {GestureSourceSpanSchema,type Gesture} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,ViewActingClockSchema,validateViewActingClock} from '../packages/animation/view-acting-clock.js';
import {viewSourceGestureDefinition,validateViewGesturePiece,collectViewSourceGestures,sourceViewGestureAt} from '../packages/animation/view-source-gesture.js';
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
import type {SpeechActivity} from '../packages/voice/schemas.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';
import {modelExitParts} from '../packages/director/props.js';
import {createCreativeStoryboard} from '../packages/director/creative.js';
import {repairCinematicArtwork} from '../packages/director/artwork-repair.js';
import {ModelRouter} from '../packages/models/registry.js';

const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
function fixture(actor:'lila'|'karo'='lila',action:'point'|'think'='point',hand:'left'|'right'='right',view:'three-quarter-left'|'three-quarter-right'='three-quarter-right',cut=2800){
  const narration=NarrationSchema.parse({mode:'wav',durationMs:7000,segments:[{id:'cue',startMs:0,endMs:7000,text:'Two forest actors consider a story together.'}]});
  const prepared=bodyCalibrationPlan(actor,action,'happy',hand,view,'cutout','silent',BODY_VIEW_EYES_SELECTION),base=prepared.plan,original=base.gestures[0]!;
  const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:narration.segments[0]!.text}]});
  const profile=actorProfile(character),span={id:'shared-hand-command',startMs:1300,endMs:4600,reachMs:2100,recoverMs:4100};
  const shots=([[1000,cut],[cut,5000]] as const).map(([startMs,endMs],i)=>{
    const p=structuredClone(base);p.id='source-hand-'+i;p.profileHash=profile.profileHash;p.durationMs=endMs-startMs;p.expressions[0]!.endMs=p.durationMs;
    p.gestures=[{...structuredClone(original),id:p.id+'.local',startMs:Math.max(span.startMs,startMs)-startMs,endMs:Math.min(span.endMs,endMs)-startMs,sourceSpan:{...span}}];
    return {id:p.id,startMs,endMs,narrationSegmentIds:['cue'],cinematic:{performance:p,actorScene:ActorSceneSchema.parse({primary:character,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[]})}} as Shot;
  });
  return {narration,profile,shots,board:{shots} as Storyboard,span};
}
const state=(f:ReturnType<typeof samplePerformance>)=>({head:f.transforms.head,chest:f.transforms.chest,hands:f.hands,wrists:f.wrists,
  arms:Object.fromEntries(Object.entries(f.transforms).filter(([id])=>id.startsWith('arm-')||id.startsWith('hand-'))),
  paths:Object.fromEntries(Object.entries(f.paths??{}).filter(([id])=>id.startsWith('ink-arm-'))),
  layers:Object.fromEntries(Object.entries(f.face).filter(([id])=>id.includes('-slot')||id==='view-eyes-layer'||id.startsWith('view-eye-'))),geometry:f.armGeometry});

test('source span is strict original motion timing, with complete ordered approach/hold/recovery and no implicit ID inference',()=>{
  assert.equal(schemaLibrary['gesture-source-span'],GestureSourceSpanSchema);
  assert.doesNotThrow(()=>GestureSourceSpanSchema.parse({id:'command',startMs:1000,endMs:5000}));
  for(const span of [{id:'x',startMs:5,endMs:5},{id:'x',startMs:5,endMs:20,reachMs:5},{id:'x',startMs:5,endMs:20,reachMs:12,recoverMs:11},{id:'x',startMs:5,endMs:20,recoverMs:20}])assert.throws(()=>GestureSourceSpanSchema.parse(span));
  assert.throws(()=>GestureSourceSpanSchema.parse({id:'x',startMs:0,endMs:1000,inferContinuity:true}));
  const f=fixture(),g=f.shots[0]!.cinematic!.performance.gestures[0]!,source=viewSourceGestureDefinition(g);
  assert.equal(source.id,f.span.id);assert.notEqual(source.id,g.id);assert.equal(source.reachMs,2100);assert.equal(source.hand,'right');
  assert.throws(()=>viewSourceGestureDefinition({...g,sourceSpan:undefined}),/explicit source/);
});

test('all exact source pieces bind one physical hand/action/target/pole/window; real missing/duplicate fragments fail',()=>{
  const f=fixture(),entries=f.shots.map(s=>({startMs:s.startMs,endMs:s.endMs,gestures:s.cinematic!.performance.gestures})),before=structuredClone(entries);
  const commands=collectViewSourceGestures(entries,1000,5000);assert.equal(commands.length,1);assert.deepEqual(entries,before);
  assert.equal(validateViewGesturePiece(entries[1]!.gestures[0]!,2800,5000).id,f.span.id);
  assert.throws(()=>collectViewSourceGestures(entries.slice(0,1),1000,5000),/coverage is incomplete/);
  assert.throws(()=>collectViewSourceGestures([entries[0]!,entries[0]!,entries[1]!],1000,5000),/missing\/duplicated/);
  const wrong=structuredClone(entries);wrong[1]!.gestures[0]!.startMs+=1;assert.throws(()=>collectViewSourceGestures(wrong,1000,5000),/source span projection/);
  for(const change of ['hand','action','target','pole','window'] as const){const changed=structuredClone(entries),g=changed[1]!.gestures[0]!;
    if(change==='hand')g.hand='left';if(change==='action')g.action='think';if(change==='target')g.target!.x+=1;if(change==='pole')g.elbowPole='reach';if(change==='window')g.sourceSpan!.reachMs=g.sourceSpan!.reachMs!+1;
    assert.throws(()=>collectViewSourceGestures(changed,1000,5000),/changed hand\/action\/target\/pole\/window/);
  }
});

test('approach, hold and recovery cuts preserve both actor/view/hand trajectories and painter slots against a complete original clip',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['point','think'] as const)for(const hand of ['left','right'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const cut of [1600,2800,4450]){
    const f=fixture(actor,action,hand,view,cut),a=f.shots[0]!,b=f.shots[1]!,p=a.cinematic!.performance,q=b.cinematic!.performance;
    const ca=actorViewActingClock(f.board,a,actor)!,cb=actorViewActingClock(f.board,b,actor)!;
    assert.equal(ca.version,VIEW_ACTING_CLOCK_VERSION);assert.deepEqual(ca.gestures,cb.gestures);
    assert.deepEqual(state(samplePerformance(p,f.profile,p.durationMs,silence,undefined,ca)),state(samplePerformance(q,f.profile,0,silence,undefined,cb)));
    const whole=structuredClone(a);whole.id='whole';whole.endMs=5000;whole.cinematic!.performance.id='whole';whole.cinematic!.performance.durationMs=4000;whole.cinematic!.performance.expressions[0]!.endMs=4000;
    whole.cinematic!.performance.gestures[0]!.endMs=3600;const cw=actorViewActingClock({shots:[whole]},whole,actor)!;
    for(const local of [0,Math.min(150,q.durationMs),q.durationMs/2,q.durationMs])assert.deepEqual(state(samplePerformance(q,f.profile,local,silence,undefined,cb)),state(samplePerformance(whole.cinematic!.performance,f.profile,local+b.startMs-1000,silence,undefined,cw)));
  }
});

test('seeking source trajectories out of order is deterministic and the nonowned hand keeps its actual body rest state',()=>{
  const f=fixture('karo','think','left','three-quarter-left'),b=f.shots[1]!,p=b.cinematic!.performance,c=actorViewActingClock(f.board,b,'karo')!;
  const saved=[0,100,400,800,1800,2200].map(t=>state(samplePerformance(p,f.profile,t,silence,undefined,c)));
  for(const i of [5,0,4,1,3,2])assert.deepEqual(state(samplePerformance(p,f.profile,[0,100,400,800,1800,2200][i]!,silence,undefined,c)),saved[i]);
  const plain={...p,gestures:[]},bare={...c,gestures:[]},withGesture=samplePerformance(p,f.profile,400,silence,undefined,c),rest=samplePerformance(plain,f.profile,400,silence,undefined,bare);
  assert.deepEqual(withGesture.hands.right,rest.hands.right);assert.equal(withGesture.face['hand-left-front-slot']!.opacity,1);
  assert.equal(sourceViewGestureAt(c.gestures,4600,'left'),undefined);
  assert.throws(()=>sourceViewGestureAt(c.gestures,Number.NaN,'left'),/invalid source time\/hand/);
});

test('ordinary adjacent gestures never become a source command and explicit cuts cannot carry an incomplete declared span',()=>{
  const f=fixture();for(const s of f.shots)delete s.cinematic!.performance.gestures[0]!.sourceSpan;
  const a=f.shots[0]!,b=f.shots[1]!,c=actorViewActingClock(f.board,b,'lila')!;assert.deepEqual(c.gestures,[]);
  const before=samplePerformance(a.cinematic!.performance,f.profile,a.endMs-a.startMs,silence,undefined,actorViewActingClock(f.board,a,'lila'));
  const after=samplePerformance(b.cinematic!.performance,f.profile,0,silence,undefined,c);assert.deepEqual(before.hands,after.hands);
  const declared=fixture();declared.shots[1]!.cinematic!.actorScene!.continuity='cut';assert.throws(()=>actorViewActingClock(declared.board,declared.shots[0]!,'lila'),/coverage is incomplete/);
});

test('missing/stale context, incompatible profiles and contact/prop timing cannot silently approximate a source gesture',()=>{
  const f=fixture(),b=f.shots[1]!,p=b.cinematic!.performance,g=p.gestures[0]!,c=actorViewActingClock(f.board,b,'lila')!;
  assert.throws(()=>samplePerformance(p,f.profile,0,silence),/complete storyboard\/run context/);assert.throws(()=>compilePerformance(p,f.profile,silence),/complete storyboard\/run context/);
  assert.throws(()=>validateViewActingClock(p,{...c,gestures:[]}),/differs from local declaration/);
  assert.throws(()=>ViewActingClockSchema.parse({...c,gestures:undefined}));
  for(const field of ['contactMs','releaseMs','propId','destination'] as const){const bad={...g,[field]:field==='propId'?'prop':field==='destination'?{x:1,y:2}:30};assert.throws(()=>viewSourceGestureDefinition(bad),/contact\/prop clock/);}
  assert.throws(()=>samplePerformance({...p,props:[{id:'prop',origin:{x:10,y:10}}]},f.profile,0,silence,undefined,c),/prop\/spear geometry/);
  const source=bodyCalibrationPlan('lila','point','happy');source.plan.gestures[0]!.sourceSpan={...f.span};assert.throws(()=>samplePerformance(source.plan,source.profile,0,silence),/selected current native/);
});

test('overlapping source commands or an ordinary clip on the same owned hand fail, while the other hand can be independent',()=>{
  const f=fixture(),a=f.shots[0]!,p=a.cinematic!.performance,c=actorViewActingClock(f.board,a,'lila')!,other={...p.gestures[0]!,id:'ordinary',sourceSpan:undefined,startMs:900,endMs:1200};
  assert.throws(()=>validateViewActingClock({...p,gestures:[...p.gestures,other]},c),/ordinary clip conflicts/);
  assert.doesNotThrow(()=>validateViewActingClock({...p,gestures:[...p.gestures,{...other,hand:'left'}]},c));
  assert.throws(()=>validateViewActingClock(p,{...c,gestures:[...c.gestures,{...c.gestures[0]!,id:'other-command',startMs:2000}]}),/source hand track overlaps/);
  const nonlocal=structuredClone(f.shots[1]!);nonlocal.cinematic!.performance.gestures.push({...other,startMs:100,endMs:300});
  assert.throws(()=>actorViewActingClock({shots:[a,nonlocal]},a,'lila'),/ordinary clip conflicts/);
});

test('cache/repair input identity includes nonlocal command timing and actual replacement, with no discarded old approval',()=>{
  const f=fixture(),a=f.shots[0]!,binding=rigSpeechPublicationBinding(a,f.narration,f.board)!,initial=rigSpeechInputIdentity(a,f.narration,f.board)!;
  const altered=structuredClone(f.board);for(const s of altered.shots){const span=s.cinematic!.performance.gestures[0]!.sourceSpan!;span.reachMs=span.reachMs!+50;}
  const changed=altered.shots[0]!;assert.notEqual(hash(initial),hash(rigSpeechInputIdentity(changed,f.narration,altered)));assert.throws(()=>assertRigSpeechPublicationBinding(changed,f.narration,altered,binding),/changed before repair publication/);
  const sibling=structuredClone(f.shots[1]!);const siblingSpan=sibling.cinematic!.performance.gestures[0]!.sourceSpan!;siblingSpan.recoverMs=siblingSpan.recoverMs!-50;
  assert.throws(()=>assertRigSpeechPublicationBinding(a,f.narration,{shots:[a,sibling]},binding),/changed hand\/action\/target\/pole\/window/);
  assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(a,f.narration,f.board,binding));
});

test('compiler source grid/refinement and namespaced ink/hand layers use original gesture phases without fake contact',()=>{
  const f=fixture('lila','think','right','three-quarter-right',1600),b=f.shots[1]!,p=b.cinematic!.performance,c=actorViewActingClock(f.board,b,'lila')!;
  const result=performanceScene(p,f.profile,silence,undefined,undefined,undefined,undefined,c),compiled=result.compiled;
  for(const at of [500,2500,3000])assert.ok(compiled.frames.some(frame=>frame.timeMs===at));
  assert.equal(compiled.report.viewActingPhase!.gestureCount,1);assert.equal(compiled.report.viewActingPhase!.wholeBodyActionContinuous,false);assert.equal(compiled.report.viewActingPhase!.approved,false);
  assert.match(compilePerformance(p,f.profile,silence,'actor-lila-',undefined,c).js,/actor-lila-ink-arm-right-front-slot/);
  const eye=registeredBodyViewEyes(f.profile),physical=registeredBodyView(f.profile).headScale*p.scale*f.profile.appearance.headScale*f.profile.appearance.bodyScale;
  for(let i=1;i<compiled.frames.length;i++){const a=compiled.frames[i-1]!,b=compiled.frames[i]!,mid=samplePerformance(p,f.profile,(a.timeMs+b.timeMs)/2,silence,undefined,c);assert.ok(bodyViewEyesMatrixError(eye,a.face,b.face,mid.face,.5)*physical<=.2001);}
  assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),b,2000000,referenceBodyAssets(f.profile.appearance).map(a=>a.path),p.stage),[]);
});

async function canonicalFixture(root:string,complete=false){
  const f=fixture('lila','point','right','three-quarter-right',1600),base=await creativeFixture(root);
  if(complete){
    f.narration=NarrationSchema.parse(base.narration);
    const first=f.shots[0]!,p=first.cinematic!.performance;first.startMs=0;p.durationMs=first.endMs;p.expressions[0]!.endMs=p.durationMs;p.gestures[0]!.startMs=f.span.startMs;
    for(const s of f.shots)s.cinematic!.actorScene!.primary!.sourceRefs=structuredClone(base.shot.sourceRefs!);
  }
  const shots=f.shots.map((partial,i)=>{
    const s=structuredClone(base.shot),c=s.cinematic!;s.id=partial.id;c.shotId=s.id;s.startMs=partial.startMs;s.endMs=partial.endMs;s.narrationSegmentIds=['cue'];c.performance=structuredClone(partial.cinematic!.performance);c.actorScene=structuredClone(partial.cinematic!.actorScene!);
    c.actorScene.primary!.appearance.bodySpeech=BODY_VIEW_SPEECH_VERSION;c.actorScene.speakingSegmentIds=['cue'];
    const {profile:karo,plan:kp}=bodyCalibrationPlan('karo','rest','happy',undefined,'three-quarter-left','cutout','silent',BODY_VIEW_EYES_SELECTION);
    const character=ActorDefinitionSchema.parse({...c.actorScene.primary!,id:'karo',name:'karo',appearance:karo.appearance});kp.durationMs=s.endMs-s.startMs;kp.expressions[0]!.endMs=kp.durationMs;
    c.performance.stage=kp.stage={width:1280,height:720,groundY:540};c.performance.root={x:380,y:540};c.performance.scale=.8;kp.root={x:800,y:540};kp.scale=.8;
    const g=c.performance.gestures[0]!,part=s.visualization!.parts[0]!;g.target={x:380+(g.target!.x-210)*.8,y:540+(g.target!.y-410)*.8};
    part.x=g.target.x/1280;part.y=g.target.y/720;
    const lilaActions=[{type:'point' as const,hand:'right' as const,startMs:g.startMs+s.startMs,endMs:g.endMs+s.startMs,narrationAnchor:'cue',target:{modelId:s.visualization!.modelId,partId:part.id,anchor:'center' as const}}];
    const idle=[{type:'idle' as const,startMs:s.startMs,endMs:s.endMs}];
    c.actorScene.supporting=[{character,performance:kp,actions:idle,speakingSegmentIds:[]}];s.host!.actions=lilaActions;
    if(i){const lila={character:c.actorScene.primary!,performance:c.performance,actions:lilaActions,speakingSegmentIds:['cue']};c.actorScene.primary=character;c.performance=kp;c.actorScene.speakingSegmentIds=[];c.actorScene.supporting=[lila];s.host!.actions=idle;}
    s.visualization!.events=[];c.propBindings=[];c.artDirection=structuredClone(base.artDirection);
    for(const layer of c.artDirection.layers)for(const frame of layer.keyframes)frame.atMs=frame.atMs*c.performance.durationMs/5000;
    c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};bindActorShot(s,base.profile,base.rig);
    c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[],models:modelExitParts(s).map(part=>({partId:part.id,x:part.x,y:part.y,width:part.width,height:part.height}))};s.camera={...s.camera,shotSize:c.camera.framing,movement:c.camera.movement};return s;
  });
  return {...base,root,narration:f.narration,board:StoryboardSchema.parse({shots})};
}

test('canonical paired source gestures preserve a speaking actor across primary/supporting switch and report original target timing',async t=>{
  const f=await canonicalFixture(await temporary(t)),board=f.board,signal={...silence,intervals:[{startMs:0,endMs:7000,level:.6}]};
  for(const shot of board.shots){const binding=rigSpeechPublicationBinding(shot,f.narration,board)!;assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(shot,f.narration,StoryboardSchema.parse(JSON.parse(JSON.stringify(board))),binding));
    const rendered=renderCinematic(shot,f.profile,f.rig,signal,f.config,undefined,f.narration,undefined,undefined,board);
    const interaction=rendered.geometry.interactions.find(a=>a.actorId==='lila')!;if(!('sourceGesture' in interaction))throw new Error('Expected native source keypose evidence');
    assert.equal(interaction.sourceGesture!.originalReachMs,2100);assert.equal(interaction.sourceGesture!.contactVerified,false);assert.equal(interaction.sourceGesture!.samplePhase,shot.startMs===1000?'approach':'hold');assert.equal(interaction.contactMs,undefined);
    if(!('actors' in rendered.report))throw new Error('Expected rig actors');const lila=rendered.report.actors.find(a=>a.actorId==='lila')!;if(!('report' in lila))throw new Error('Expected compiled report');assert.equal(lila.report.viewActingPhase!.gestureCount,1);
    const cast=[shot.cinematic!.actorScene!.primary!,...shot.cinematic!.actorScene!.supporting.map(a=>a.character)],assets=cast.flatMap(a=>referenceBodyAssets(a.appearance).map(p=>p.path));assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),shot,2000000,assets,f.config.rendering.final),[]);
  }
});

test('creative normalization keeps complete native source context, registered image resources and cast continuity across primary swap [P2]',async t=>{
  // Structural renderer fixture, not a story/theme or three-input acceptance.
  const f=await canonicalFixture(await temporary(t),true);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const router=new ModelRouter(f.config,f.root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse(f.board);};
  const context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
  const directed=await createCreativeStoryboard(f.root,f.config,router,context,f.board,[]);
  assert.equal(calls,1);assert.equal(directed.shots[1]!.cinematic!.actorScene!.primary!.id,'karo');
  assert.equal(actorViewActingClock(directed,directed.shots[1]!,'lila')!.gestures[0]!.reachMs,2100);
  const moved=structuredClone(directed);moved.shots[1]!.cinematic!.actorScene!.supporting[0]!.performance.root.x+=20;
  router.structured=async(_role,_request,schema)=>schema.parse(moved);
  await assert.rejects(()=>createCreativeStoryboard(f.root,f.config,router,context,moved,[]),/actor lila jumps position|invalid continuous cast\/view\/stage/);
});

test('artwork repair and rejected/completed replay use the full current source board without a new provider call or stale sibling binding [P2]',async t=>{
  const f=await canonicalFixture(await temporary(t),true);f.config.models.storyboard.provider='gateway';
  await writeJson(path.join(f.root,'work/narration.json'),f.narration);await writeJson(path.join(f.root,'work/beats.json'),[f.beat]);await writeJson(path.join(f.root,'work/storyboard.json'),f.board);
  const shot=f.board.shots[0]!,router=new ModelRouter(f.config,f.root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse({artDirection:shot.cinematic!.artDirection});};
  const first=await repairCinematicArtwork(f.root,f.config,router,shot,['fixture source diagnostic'],f.board);assert.equal(calls,1);
  const receipt=await readJson<Record<string,unknown>>(first.attemptFile);assert.ok((receipt.binding as Record<string,unknown>).sourcePhase);
  await writeJson(first.attemptFile,{...receipt,status:'domain-rejected'});
  const replay=await repairCinematicArtwork(f.root,f.config,router,shot,['fixture source diagnostic']);assert.equal(calls,1);assert.deepEqual(replay.shot,first.shot);
  const replayReceipt=await readJson<Record<string,unknown>>(replay.attemptFile);await writeJson(replay.attemptFile,{...replayReceipt,status:'commit-failed',runtimeValidation:'passed'});
  const completed=await repairCinematicArtwork(f.root,f.config,router,shot,['fixture source diagnostic'],f.board);assert.equal(calls,1);assert.equal(completed.attemptFile,replay.attemptFile);
  const changed=structuredClone(f.board);changed.shots[1]!.cinematic!.actorScene!.supporting[0]!.performance.gazes=[{startMs:100,endMs:300,target:{x:600,y:400}}];
  const refreshed=await repairCinematicArtwork(f.root,f.config,router,shot,['fixture source diagnostic'],changed);assert.equal(calls,2);
  const freshReceipt=await readJson<Record<string,unknown>>(refreshed.attemptFile);assert.notEqual(hash((receipt.binding as Record<string,unknown>).sourcePhase),hash((freshReceipt.binding as Record<string,unknown>).sourcePhase));
});

test('native source gesture readiness remains unapproved and full input/video production gates stay active',()=>{
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.readiness.productionReady,false);assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
});
