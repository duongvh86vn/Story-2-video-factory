// Runtime declarations for the user's test model. NOT RUN by implementation agents.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {NarrationSchema,StoryboardSchema,type Beat,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot,validateActorCast} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechInputIdentity,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {BODY_SOURCE_VERSION,BodySourceSchema,type PerformancePlan} from '../packages/animation/schemas.js';
import {sourceBodyPlan,bodyRootAt} from '../packages/animation/view-source-body.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {samplePerformance,compilePerformance,validatePerformance,bodyPoseAnchors} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan,type BodyAction} from '../packages/topics/body-workbench.js';
import {cameraHostBounds,planCamera,validateCamera} from '../packages/director/camera.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {validateExplainerStoryboard} from '../packages/explainer/storyboard.js';
import {eventPreviewTimes} from '../packages/review/index.js';
import {fixedMotionFields,applyActingRepair} from '../packages/director/acting-repair.js';
import {creativeActingBrief} from '../packages/director/acting-brief.js';
import {createCreativeStoryboard} from '../packages/director/creative.js';
import {ModelRouter} from '../packages/models/registry.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {schemaLibrary} from '../library/schemas/index.js';
import {creativeFixture} from './creative-fixture.js';
import {passiveActorFixtureEvents} from './native-actor-fixture.js';
import {temporary} from './support.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:'three-quarter-left'|'three-quarter-right',action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1',BODY_VIEW_LOCOMOTION_SELECTION);
function nativeRun(actor:'lila'|'karo'='lila',view:'three-quarter-left'|'three-quarter-right'='three-quarter-right',action:BodyAction='walk',cuts=[1000,2050,3200,5000],scale=1){
  const prepared=candidate(actor,view,action),base=prepared.plan;
  const narration=NarrationSchema.parse({mode:'wav',durationMs:5000,segments:[{id:'cue',startMs:1000,endMs:5000,text:'Two forest actors move together.'}]});
  const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:narration.segments[0]!.text}]});
  const profile=actorProfile(character);base.profileHash=profile.profileHash;base.scale=scale;
  const sourceBody={version:BODY_SOURCE_VERSION,id:actor+'-original-body',startMs:1000,endMs:5000,walks:structuredClone(base.walks),jumps:structuredClone(base.jumps),postures:structuredClone(base.postures),entryPosture:structuredClone(base.entryPosture)};
  const shots=cuts.slice(0,-1).map((startMs,i)=>{const endMs=cuts[i+1]!,p=structuredClone(base);p.id=actor+'-slice-'+i;p.durationMs=endMs-startMs;p.walks=[];p.jumps=[];p.postures=[];delete p.entryPosture;p.sourceBody=structuredClone(sourceBody);p.gestures=[];p.gazes=[];p.expressions=[{startMs:0,endMs:p.durationMs,mood:'happy'}];
    return {id:p.id,startMs,endMs,narrationSegmentIds:['cue'],host:{presence:'beside-model'},cinematic:{performance:p,actorScene:ActorSceneSchema.parse({primary:character,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[]})}} as Shot;
  });
  return {profile,character,sourceBody,narration,shots,board:{shots} as Storyboard};
}
const state=(frame:ReturnType<typeof samplePerformance>)=>{const {timeMs:_,...physical}=frame;return physical;};

test('shared source body is an explicit contract and never selects a native profile or approves artwork',()=>{
  assert.equal(schemaLibrary['body-source'],BodySourceSchema);const f=nativeRun(),p=f.shots[0]!.cinematic!.performance;
  assert.doesNotThrow(()=>validatePerformance(p,f.profile));
  const sourceProfile=bodyCalibrationPlan('lila','rest','happy');assert.throws(()=>validatePerformance({...p,profileHash:sourceProfile.profile.profileHash},sourceProfile.profile),/selected current native locomotion/);
  const wrong=structuredClone(p);wrong.sourceBody!.walks[0]!.toX=wrong.sourceBody!.walks[0]!.fromX-25;assert.throws(()=>validatePerformance(wrong,f.profile),/travel must follow/);
  const short=structuredClone(p);short.sourceBody!.walks[0]!.endMs=short.sourceBody!.walks[0]!.startMs+1;assert.throws(()=>validatePerformance(short,f.profile),/window too short/);
  assert.ok(fixedMotionFields.includes('sourceBody'));const brief=creativeActingBrief([],f.narration,f.profile);assert.equal(brief.nativeLocomotion.sourceBody.version,BODY_SOURCE_VERSION);assert.equal(brief.nativeLocomotion.candidate.productionReady,false);
});

test('walking camera slices preserve the complete original body, feet, arms, face and cloth through deterministic seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const scale of [.75,1,1.25]){
    const action=view==='three-quarter-left'?'walk-left':'walk',f=nativeRun(actor,view,action,undefined,scale),whole=nativeRun(actor,view,action,[1000,5000],scale),w=whole.shots[0]!,wp=w.cinematic!.performance,wc=actorViewActingClock(whole.board,w,actor)!;
    const before=structuredClone(f.board);
    for(const shot of f.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,actor)!;
      for(const t of [p.durationMs,0,p.durationMs*.17,p.durationMs*.8,p.durationMs*.5,0]){
        const actual=samplePerformance(p,f.profile,t,silence,undefined,c),original=samplePerformance(wp,whole.profile,t+shot.startMs-1000,silence,undefined,wc);
        assert.deepEqual(state(actual),state(original));assert.deepEqual(actual.root,bodyRootAt(p,shot.startMs,t));assert.doesNotMatch(JSON.stringify(actual),/NaN|Infinity/);
      }
    }
    for(let i=1;i<f.shots.length;i++){const a=f.shots[i-1]!,b=f.shots[i]!,ca=actorViewActingClock(f.board,a,actor)!,cb=actorViewActingClock(f.board,b,actor)!;assert.deepEqual(state(samplePerformance(a.cinematic!.performance,f.profile,a.endMs-a.startMs,silence,undefined,ca)),state(samplePerformance(b.cinematic!.performance,f.profile,0,silence,undefined,cb)));}
    assert.deepEqual(f.board,before);
  }
});

test('run cuts retain original flight and running arm phase rather than starting a new contact cycle',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const action=view==='three-quarter-left'?'run-left':'run',f=nativeRun(actor,view,action,[1000,1800,2300,5000]),whole=nativeRun(actor,view,action,[1000,5000]),w=whole.shots[0]!,wc=actorViewActingClock(whole.board,w,actor)!;let flight=false;
    for(const shot of f.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,actor)!;
      for(let t=0;t<=p.durationMs;t+=25){const frame=samplePerformance(p,f.profile,t,silence,undefined,c);if(!frame.stance.left&&!frame.stance.right)flight=true;assert.deepEqual(state(frame),state(samplePerformance(w.cinematic!.performance,whole.profile,t+shot.startMs-1000,silence,undefined,wc)));}
    }assert.ok(flight);
  }
});

test('jump takeoff, apex, landing and crouch recovery retain the original source phase through cuts',()=>{
  for(const action of ['jump','crouch'] as const)for(const actor of ['lila','karo'] as const){const f=nativeRun(actor,'three-quarter-right',action,[1000,1850,2175,2500,5000]),whole=nativeRun(actor,'three-quarter-right',action,[1000,5000]),w=whole.shots[0]!,wc=actorViewActingClock(whole.board,w,actor)!;
    for(const shot of f.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,actor)!;for(const t of [0,.01,p.durationMs/2,p.durationMs-.01,p.durationMs])assert.deepEqual(state(samplePerformance(p,f.profile,t,silence,undefined,c)),state(samplePerformance(w.cinematic!.performance,whole.profile,t+shot.startMs-1000,silence,undefined,wc)));}
    if(action==='jump'){const shot=f.shots[2]!,c=actorViewActingClock(f.board,shot,actor)!;assert.deepEqual(samplePerformance(shot.cinematic!.performance,f.profile,0,silence,undefined,c).stance,{left:false,right:false});}
  }
});

test('a source hand gesture uses its original body entry while a run crosses a camera cut',()=>{
  const f=nativeRun('karo','three-quarter-left','run-left',[1000,2200,3400,5000]),whole=nativeRun('karo','three-quarter-left','run-left',[1000,5000]),span={id:'original-think',startMs:1400,endMs:4400,reachMs:2000,recoverMs:3900};
  for(const board of [f.board,whole.board])for(const shot of board.shots){const start=Math.max(span.startMs,shot.startMs),end=Math.min(span.endMs,shot.endMs);shot.cinematic!.performance.gestures=end>start?[{id:shot.id+'-hand',action:'think',hand:'left',startMs:start-shot.startMs,endMs:end-shot.startMs,sourceSpan:{...span}}]:[];}
  const w=whole.shots[0]!,wc=actorViewActingClock(whole.board,w,'karo')!;
  for(const shot of f.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,'karo')!;for(const t of [0,p.durationMs/2,p.durationMs])assert.deepEqual(state(samplePerformance(p,f.profile,t,silence,undefined,c)),state(samplePerformance(w.cinematic!.performance,whole.profile,t+shot.startMs-1000,silence,undefined,wc)));}
});

test('missing, stale, hidden, changed or explicitly cut source runs fail without synthesizing local motion',()=>{
  const f=nativeRun(),shot=f.shots[1]!,p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,'lila')!;
  for(const run of [()=>samplePerformance(p,f.profile,0,silence),()=>compilePerformance(p,f.profile,silence),()=>bodyPoseAnchors(p,f.profile,0),()=>cameraHostBounds(p,f.profile)])assert.throws(run,/complete storyboard\/run context/);
  assert.throws(()=>samplePerformance(p,f.profile,0,silence,undefined,{...c,bodyMotion:undefined}),/missing original body source/);
  for(const field of ['missing','changed','cut','root','hidden'] as const){const board=structuredClone(f.board),s=board.shots[1]!;
    if(field==='missing')delete s.cinematic!.performance.sourceBody;if(field==='changed')s.cinematic!.performance.sourceBody!.walks[0]!.toX+=1;if(field==='cut')s.cinematic!.actorScene!.continuity='cut';if(field==='root')s.cinematic!.performance.root.x+=1;if(field==='hidden')s.host!.presence='absent';
    assert.throws(()=>actorViewActingClock(board,board.shots[0]!,'lila'),/needs-view-body-phase|needs-view-acting-phase/);
  }
  const local=structuredClone(f.board);for(const s of local.shots){delete s.cinematic!.performance.sourceBody;s.cinematic!.performance.walks=[{startMs:0,endMs:s.endMs-s.startMs,fromX:210,toX:220}];}assert.throws(()=>actorViewActingClock(local,local.shots[1]!,'lila'),/needs-view-locomotion-cut/);
});

test('canonical source identity and repair publication include every original physical track outside the current shot',()=>{
  const f=nativeRun(),shot=f.shots[0]!,before=rigSpeechInputIdentity(shot,f.narration,f.board),binding=rigSpeechPublicationBinding(shot,f.narration,f.board),changed=structuredClone(f.board);
  for(const s of changed.shots)s.cinematic!.performance.sourceBody!.walks[0]!.toX+=5;
  assert.notEqual(hash(before),hash(rigSpeechInputIdentity(changed.shots[0]!,f.narration,changed)));assert.throws(()=>assertRigSpeechPublicationBinding(changed.shots[0]!,f.narration,changed,binding),/changed before repair publication/);
  const sibling=structuredClone(f.board);sibling.shots[2]!.cinematic!.performance.sourceBody!.walks[0]!.endMs-=1;assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,sibling,binding),/source definition changed/);
  assert.equal(hash(f.narration),hash(structuredClone(f.narration)));
});

test('camera and preview checks inspect the current source slice including the original jump apex',()=>{
  const f=nativeRun('lila','three-quarter-right','jump',[1000,2000,2500,5000]),shot=f.shots[1]!,p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,'lila')!,bounds=cameraHostBounds(p,f.profile,c);
  for(const t of [0,175,500]){const frame=samplePerformance(p,f.profile,t,silence,undefined,c);for(const point of [...Object.values(frame.feet),...Object.values(frame.hands)])assert.ok(point.x>=bounds.body.left-.001&&point.x<=bounds.body.right+.001&&point.y>=bounds.body.top-.001&&point.y<=bounds.body.bottom+.001);}
  assert.ok(eventPreviewTimes(shot).includes(2175));assert.throws(()=>planCamera(p,f.profile,{framing:'wide',movement:'locked'}),/complete storyboard\/run context/);
  assert.doesNotThrow(()=>planCamera(p,f.profile,{framing:'wide',movement:'locked',actingClock:c}));
  const compiled=compilePerformance(p,f.profile,silence,'actor-lila-',undefined,c);assert.ok(compiled.frames.some(frame=>Math.abs(frame.timeMs-175)<.001));assert.equal(compiled.report.bodyMotion!.sourceBody!.id,f.sourceBody.id);assert.equal(compiled.report.bodyMotion!.motionVerified,false);assert.equal(compiled.report.viewActingPhase!.wholeBodyActionContinuous,true);assert.equal(compiled.report.viewActingPhase!.approved,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
});

async function canonicalPair(root:string){
  const f=await creativeFixture(root),definitions=(['lila','karo'] as const).map((actor,i)=>ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:candidate(actor,i?'three-quarter-left':'three-quarter-right').profile.appearance,sourceRefs:f.shot.sourceRefs}));
  const shots=[[0,2000],[2000,5000]].map(([startMs,endMs],i)=>{const shot=structuredClone(f.shot),c=shot.cinematic!;shot.id='source-body-canonical-'+i;shot.startMs=startMs!;shot.endMs=endMs!;c.shotId=shot.id;c.propBindings=[];shot.visualization!.events=passiveActorFixtureEvents(shot,f.narration);
    const tracks=definitions.map((character,j)=>{const p=candidate(character.id as 'lila'|'karo',j?'three-quarter-left':'three-quarter-right').plan;p.id=shot.id;p.durationMs=shot.endMs-shot.startMs;p.stage={width:1280,height:720,groundY:540};p.root={x:j?800:380,y:540};p.scale=.8;p.expressions=[];p.sourceBody={version:BODY_SOURCE_VERSION,id:character.id+'-full-path',startMs:0,endMs:5000,walks:[{startMs:300,endMs:3600,fromX:p.root.x,toX:p.root.x+(j?-45:45)}]};return {character,performance:p,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:[]};});
    c.performance=tracks[i]!.performance;c.actorScene=ActorSceneSchema.parse({primary:tracks[i]!.character,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[tracks[1-i]!]});bindActorShot(shot,f.profile,f.rig);shot.host!.actions=tracks[i]!.actions;c.continuity={...c.continuity,entry:bodyRootAt(c.performance,shot.startMs,0),exit:bodyRootAt(c.performance,shot.startMs,c.performance.durationMs),facing:c.performance.facing??'front',carriedProps:[]};return shot;
  });
  const board=StoryboardSchema.parse({shots});
  for(const shot of board.shots){const c=shot.cinematic!,scene=c.actorScene!,profile=actorProfile(scene.primary!);c.camera=planCamera(c.performance,profile,{framing:'wide',movement:'locked',parts:shot.visualization!.parts,actingClock:actorViewActingClock(board,shot,profile.id),supporting:scene.supporting.map(actor=>({performance:actor.performance,profile:actorProfile(actor.character),actingClock:actorViewActingClock(board,shot,actor.character.id)}))});shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};}
  return {...f,board};
}

test('complete canonical two-actor run survives role swap, fragment diagnostics, rendering and security limits',async t=>{
  const f=await canonicalPair(await temporary(t)),board=f.board;
  assert.doesNotThrow(()=>validateActorCast(board,f.narration));
  for(const shot of board.shots){assert.doesNotThrow(()=>validateCinematicShot(shot,f.profile,f.config,board));assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[shot]},f.narration,[f.beat],f.profile,f.rig,{...f.config,presentation:{...f.config.presentation,require_meaningful_host_action_per_beat:false}},{fragment:true,sourceBoard:board}));
    const profile=actorProfile(shot.cinematic!.actorScene!.primary!),clock=actorViewActingClock(board,shot,profile.id)!;assert.doesNotThrow(()=>validateCamera(shot,profile,clock));
    const result=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration,undefined,undefined,board),files=secureSceneFiles(result.files);assert.deepEqual(validateSceneFiles(files,shot,f.config.workflow.max_scene_bytes,actorRigResourcePaths(shot,f.profile),f.config.rendering.final),[]);assert.deepEqual(result.report.actors.map(actor=>actor.actorId).sort(),['karo','lila']);assert.ok('phonemeLipSync' in result.report);assert.equal(result.report.phonemeLipSync,false);
  }
  const changed=structuredClone(board.shots[1]!);changed.cinematic!.performance.sourceBody!.walks[0]!.toX-=1;assert.throws(()=>validateExplainerStoryboard({shots:[changed]},f.narration,[f.beat],f.profile,f.rig,f.config,{fragment:true,sourceBoard:board}),/source definition changed/);
});

test('source motion coverage requires the actual original flight clock and cannot be satisfied by a wrong movement or hidden source',()=>{
  const f=nativeRun('lila','three-quarter-right','jump',[1000,1900,2300,5000]),text=f.narration.segments[0]!.text,ref={kind:'narration' as const,segmentId:'cue',quote:text};
  const beat={id:'movement-beat',startMs:1000,endMs:5000,sceneIntent:{participants:[{id:'lila',name:'lila',role:'illustration',identity:'illustrative',sourceRefs:[ref]}],acting:[{participantId:'lila',kind:'locomotion',movement:'jump',statement:text,sourceRefs:[ref]}]}} as Beat;
  for(const shot of f.shots)shot.beatIds=[beat.id];assert.doesNotThrow(()=>validateStoryActingCoverage(f.board,[beat],f.narration));
  const wrong=structuredClone(beat);wrong.sceneIntent!.acting![0]!.movement='run';assert.throws(()=>validateStoryActingCoverage(f.board,[wrong],f.narration),/no locomotion/);
  const outside=structuredClone(f.narration);outside.segments[0]!.startMs=2100;outside.segments[0]!.endMs=2400;assert.throws(()=>validateStoryActingCoverage(f.board,[beat],outside),/no locomotion/);
  const hidden=structuredClone(f.board);hidden.shots[1]!.host!.presence='absent';assert.throws(()=>validateStoryActingCoverage(hidden,[beat],f.narration),/source body actor is hidden/);
});

test('acting repair cannot rewrite the original source body while repairing a local reaction',()=>{
  assert.ok(fixedMotionFields.includes('sourceBody'));
  const f=nativeRun(),shot=f.shots[0]!,p=shot.cinematic!.performance;shot.cinematic!.artDirection={origin:'authored',brief:'Source-bound actor scene.',useEnvironment:false,palette:{background:'#1E542D',surface:'#FFF3DB',ink:'#201A15',accent:'#F97316'},showHeading:false,layers:[],models:[]};
  const changed=structuredClone(p);changed.sourceBody!.walks[0]!.toX+=1;changed.expressions=[{startMs:0,endMs:changed.durationMs,mood:'curious'}];
  assert.throws(()=>applyActingRepair(shot,{artDirection:shot.cinematic!.artDirection,primary:{performance:changed,actions:[]}}),/fixed performance field: sourceBody/);
  const before=structuredClone(p);sourceBodyPlan(p);assert.deepEqual(p,before);
});

test('an invalid original body declaration does not hide unrelated artwork diagnostics in the same creative response',async t=>{
  const root=await temporary(t),f=await canonicalPair(root),rejected=structuredClone(f.board),first=rejected.shots[0]!,second=rejected.shots[1]!;
  first.cinematic!.performance.walks=[{startMs:100,endMs:1500,fromX:380,toX:390}];first.cinematic!.artDirection=structuredClone(f.artDirection);
  const unrelated=structuredClone(f.shot);unrelated.id=second.id;unrelated.startMs=second.startMs;unrelated.endMs=second.endMs;unrelated.cinematic!.shotId=unrelated.id;unrelated.cinematic!.performance.id=unrelated.id;unrelated.cinematic!.performance.durationMs=unrelated.endMs-unrelated.startMs;unrelated.cinematic!.artDirection=structuredClone(f.artDirection);unrelated.cinematic!.artDirection!.layers[0]!.svg='<pattern/>';rejected.shots[1]=unrelated;
  f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;const router=new ModelRouter(f.config,root);let calls=0;
  router.structured=async(_role,_request,schema)=>{calls++;return schema.parse(rejected);};
  await assert.rejects(()=>createCreativeStoryboard(root,f.config,router,{story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig},f.board,[]),(error:unknown)=>{
    assert.ok(error instanceof Error);assert.match(error.message,/Creative storyboard validation failed/);assert.match(error.message,/source body conflicts with local walks/);assert.match(error.message,/unsupported\/executable tag pattern/);return true;
  });assert.equal(calls,1);
});
