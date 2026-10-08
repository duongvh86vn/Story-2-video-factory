// Runtime declarations ONLY. No callbacks, fixtures, samplers or renderers run
// by implementation agents. The user's model records actual PASS/FAIL/media.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {NarrationSchema,StoryboardSchema,type Storyboard,type Shot,type Beat} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot,validateActorCast} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding,narrationCueOwners} from '../packages/actors/speech-clock.js';
import {BODY_SOURCE_VERSION,BodySourceSchema,type PerformancePlan} from '../packages/animation/schemas.js';
import {sourceBodyPlan,bodyRootAt} from '../packages/animation/view-source-body.js';
import {seatOccupancy,supportMotionTimes} from '../packages/animation/support.js';
import {sceneSeats,shotSeatOccupancy} from '../packages/stage/seats.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {BODY_VIEW_SEAT_SELECTION,nativeSeatDescription} from '../packages/animation/body-view-seat.js';
import {cameraHostBounds,planCamera,validateCamera,cameraMatrixAt,CAMERA_VIEWPORT} from '../packages/director/camera.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {fixedMotionFields,applyActingRepair} from '../packages/director/acting-repair.js';
import {eventPreviewTimes} from '../packages/review/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Actor='lila'|'karo';type View='three-quarter-left'|'three-quarter-right';
const defaultCuts=[0,615,1400,2400,3900,4500,5300,7200];
function physicalActor(actor:Actor,view:View,scale=1,rootX?:number){
  const f=bodyCalibrationPlan(actor,view==='three-quarter-left'?'sit-walk-left':'sit-walk-right','happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1','registered-locomotion-v1','registered-secondary-v1',BODY_VIEW_SEAT_SELECTION);
  const p=f.plan,oldX=p.root.x,oldY=p.root.y,newX=rootX??oldX,newY=rootX===undefined?oldY:540;p.scale=scale;p.root={x:newX,y:newY};if(rootX!==undefined)p.stage={width:1280,height:720,groundY:newY};
  for(const seat of p.supports??[]){seat.id=actor+'-log';seat.center={x:newX+(seat.center.x-oldX)*scale,y:newY+(seat.center.y-oldY)*scale};seat.width*=scale;if(seat.backHeight!==undefined)seat.backHeight*=scale;}
  for(const pose of p.postures??[])if(pose.supportId)pose.supportId=actor+'-log';
  for(const walk of p.walks){walk.fromX=newX+(walk.fromX-oldX)*scale;walk.toX=newX+(walk.toX-oldX)*scale;}
  return f;
}
function nativeRun(actor:Actor='lila',view:View='three-quarter-right',cuts=defaultCuts,scale=1){
  const prepared=physicalActor(actor,view,scale),base=prepared.plan,start=1000,end=start+base.durationMs;
  const narration=NarrationSchema.parse({mode:'wav',durationMs:end,segments:[{id:'cue',startMs:start,endMs:end,text:'The two actors sit, talk, stand and walk.'}]});
  const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:narration.segments[0]!.text}]});
  const profile=actorProfile(character);base.profileHash=profile.profileHash;
  const source={version:BODY_SOURCE_VERSION,id:actor+'-original-seat',startMs:start,endMs:end,walks:structuredClone(base.walks),postures:structuredClone(base.postures),entryPosture:structuredClone(base.entryPosture),supports:structuredClone(base.supports)};
  const shots=cuts.slice(0,-1).map((from,i)=>{const to=cuts[i+1]!,p=structuredClone(base);p.id=actor+'-seat-slice-'+i;p.durationMs=to-from;p.sourceBody=structuredClone(source);p.walks=[];p.jumps=[];p.postures=[];p.supports=[];delete p.entryPosture;p.gestures=[];p.gazes=[];p.expressions=[{startMs:0,endMs:p.durationMs,mood:'happy'}];
    return {id:p.id,startMs:start+from,endMs:start+to,narrationSegmentIds:['cue'],host:{presence:'beside-model'},cinematic:{performance:p,actorScene:ActorSceneSchema.parse({primary:character,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[]})}} as Shot;
  });return {profile,character,source,narration,shots,board:{shots} as Storyboard};
}
const physicalState=(frame:ReturnType<typeof samplePerformance>)=>{const {timeMs:_,...state}=frame;return state;};

test('source seats are bounded, explicit and compatible with old unsupported body sources',()=>{
  const f=nativeRun(),p=f.shots[0]!.cinematic!.performance;
  assert.equal(BodySourceSchema.safeParse({version:BODY_SOURCE_VERSION,id:'old',startMs:0,endMs:10,walks:[]}).success,true);
  assert.doesNotThrow(()=>validatePerformance(p,f.profile));assert.equal(nativeSeatDescription.productionReady,false);
  for(const kind of ['missing','duplicate','limit','nonseated'] as const){const source=structuredClone(f.source);
    if(kind==='missing')source.supports=[];if(kind==='duplicate')source.supports!.push(structuredClone(source.supports![0]!));if(kind==='limit')source.supports=Array.from({length:13},(_,i)=>({...source.supports![0]!,id:'seat-'+i}));if(kind==='nonseated')source.postures!.find(p=>p.pose==='stand')!.supportId='lila-log';
    assert.equal(BodySourceSchema.safeParse(source).success,false,kind);
  }
  assert.throws(()=>sourceBodyPlan({...p,supports:f.source.supports}),/conflicts with local supports/);
  assert.throws(()=>validatePerformance(p,{...f.profile,appearance:{...f.profile.appearance,bodySeat:undefined}}),/needs-view-seat/);
  const wrong=structuredClone(p);wrong.sourceBody!.supports![0]!.facing='left';assert.throws(()=>validatePerformance(wrong,f.profile),/face|direction/);
  const short=structuredClone(p);short.sourceBody!.postures![0]!.endMs=1000;assert.throws(()=>validatePerformance(short,f.profile),/1500ms/);
  const early=structuredClone(p);early.sourceBody!.walks[0]!.startMs=3500;assert.throws(()=>validatePerformance(early,f.profile),/standing body posture/);
});

test('sit preparation, held contact, rise, later gait and cloth/hair retain the complete original phase through camera cuts',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const scale of [.75,1,1.25]){
    const f=nativeRun(actor,view,undefined,scale),whole=nativeRun(actor,view,[0,7200],scale),w=whole.shots[0]!,wc=actorViewActingClock(whole.board,w,actor)!,before=structuredClone(f.board);
    for(const shot of f.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,actor)!;
      for(const t of [p.durationMs,0,p.durationMs*.17,p.durationMs*.83,p.durationMs/2,0]){
        const actual=samplePerformance(p,f.profile,t,silence,undefined,c),expected=samplePerformance(w.cinematic!.performance,whole.profile,t+shot.startMs-1000,silence,undefined,wc);
        assert.deepEqual(physicalState(actual),physicalState(expected));assert.doesNotMatch(JSON.stringify(actual),/NaN|Infinity/);
        if(actual.seatContact)assert.ok(actual.seatContact.errorPx<=.01);
        const m=rigMetrics(f.profile),numbers=(text:string)=>text.match(/-?\d+(?:\.\d+)?/g)!.map(Number),pelvis=numbers(actual.transforms.pelvis!),lean=numbers(actual.transforms.chest!)[2]!;
        for(const side of ['left','right'] as const){if(actual.stance[side])assert.equal(actual.feet[side].y,p.stage.groundY);const g=legGeometry(m,{x:pelvis[0]!,y:pelvis[1]!},actual.feet[side],side,p.scale,f.profile.appearance.bodyScale,lean),knee=numbers(actual.transforms['leg-'+side+'-lower']!);
          assert.ok(Math.abs(Math.hypot(knee[0]!-g.hip.x,knee[1]!-g.hip.y,actual.legProjection![side].kneeDepth)-g.bones.upper)<.02);assert.ok(Math.abs(Math.hypot(knee[0]!-g.ankle.x,knee[1]!-g.ankle.y,actual.legProjection![side].kneeDepth)-g.bones.lower)<.02);
        }
      }
    }
    for(let i=1;i<f.shots.length;i++){const a=f.shots[i-1]!,b=f.shots[i]!;assert.deepEqual(physicalState(samplePerformance(a.cinematic!.performance,f.profile,a.endMs-a.startMs,silence,undefined,actorViewActingClock(f.board,a,actor)!)),physicalState(samplePerformance(b.cinematic!.performance,f.profile,0,silence,undefined,actorViewActingClock(f.board,b,actor)!)));}
    assert.deepEqual(f.board,before);
  }
});

test('occupancy clips the original approach/hold/rise to local time and preserves exclusive world geometry',()=>{
  const f=nativeRun(),p=f.shots[0]!.cinematic!.performance;assert.deepEqual(seatOccupancy(sourceBodyPlan(p)),[{supportId:'lila-log',startMs:300,endMs:4500}]);
  for(const shot of f.shots){const expectedStart=Math.max(0,1300-shot.startMs),expectedEnd=Math.min(shot.endMs-shot.startMs,5500-shot.startMs);assert.deepEqual(shotSeatOccupancy(shot.cinematic!.performance,shot.startMs),expectedEnd>expectedStart?[{supportId:'lila-log',startMs:expectedStart,endMs:expectedEnd}]:[]);assert.equal(sceneSeats(shot).length,1);}
  const shot=structuredClone(f.shots[2]!),other=structuredClone(shot.cinematic!.performance),character={...f.character,id:'other'};shot.cinematic!.actorScene!.supporting=[{character,performance:other,actions:[],speakingSegmentIds:[]}];assert.throws(()=>sceneSeats(shot),/overlapping actor owners/);
  other.sourceBody!.supports![0]!.center.x+=1;assert.throws(()=>sceneSeats(shot),/world geometry/);other.sourceBody!.supports![0]!.center.x-=1;
  other.sourceBody!.postures=[{startMs:6000,endMs:7200,pose:'seated',supportId:'lila-log'}];assert.doesNotThrow(()=>sceneSeats(shot));
  const seated=structuredClone(f.shots[2]!.cinematic!.performance);seated.sourceBody!.entryPosture={pose:'seated',supportId:'lila-log'};seated.sourceBody!.postures=[];assert.deepEqual(shotSeatOccupancy(seated,f.shots[2]!.startMs),[{supportId:'lila-log',startMs:0,endMs:seated.durationMs}]);
});

test('source/support and sibling edits invalidate publication; missing/hidden/cut/local sources cannot synthesize continuity',()=>{
  const f=nativeRun(),shot=f.shots[2]!,p=shot.cinematic!.performance,binding=rigSpeechPublicationBinding(shot,f.narration,f.board)!;
  for(const field of ['seat','posture','sibling','hidden','missing','cut','root'] as const){const board=structuredClone(f.board),s=board.shots[2]!;
    if(field==='seat')for(const entry of board.shots)entry.cinematic!.performance.sourceBody!.supports![0]!.center.x+=1;
    if(field==='posture')for(const entry of board.shots)entry.cinematic!.performance.sourceBody!.postures![1]!.endMs+=1;
    if(field==='sibling')board.shots.at(-1)!.cinematic!.performance.sourceBody!.supports![0]!.width+=1;
    if(field==='hidden')s.host!.presence='absent';if(field==='missing')delete s.cinematic!.performance.sourceBody;if(field==='cut')s.cinematic!.actorScene!.continuity='cut';if(field==='root')s.cinematic!.performance.root.x+=1;
    assert.throws(()=>assertRigSpeechPublicationBinding(s,f.narration,board,binding),/changed before repair publication|needs-view-/);
  }
  assert.throws(()=>samplePerformance(p,f.profile,0,silence),/complete storyboard\/run context/);const clock=actorViewActingClock(f.board,shot,'lila')!;
  assert.throws(()=>samplePerformance(p,f.profile,0,silence,undefined,{...clock,bodyMotion:undefined}),/missing original body source/);
  const local=structuredClone(f.board);for(const s of local.shots){const physical=sourceBodyPlan(s.cinematic!.performance);delete s.cinematic!.performance.sourceBody;s.cinematic!.performance.supports=physical.supports;s.cinematic!.performance.entryPosture={pose:'seated',supportId:'lila-log'};}assert.throws(()=>actorViewActingClock(local,local.shots[1]!,'lila'),/needs-view-locomotion-cut/);
  assert.ok(fixedMotionFields.includes('sourceBody'));const changed=structuredClone(p);changed.sourceBody!.supports![0]!.width+=1;
  shot.cinematic!.artDirection={origin:'authored',brief:'Two actors on the original stage.',useEnvironment:false,palette:{background:'#225C32',surface:'#FFF3DB',ink:'#201A15',accent:'#F97316'},showHeading:false,layers:[],models:[]};assert.throws(()=>applyActingRepair(shot,{artDirection:shot.cinematic!.artDirection,primary:{performance:changed,actions:[]}}),/fixed performance field: sourceBody/);
});

test('baked support boundaries, reports and camera/preview refer to the original seat clock',()=>{
  const f=nativeRun('karo','three-quarter-right',[0,1800,3100,4500,7200]),shot=f.shots[2]!,p=shot.cinematic!.performance,c=actorViewActingClock(f.board,shot,'karo')!,compiled=compilePerformance(p,f.profile,silence,'actor-karo-',undefined,c);
  const boundaries=supportMotionTimes(sourceBodyPlan(p)).map(at=>at+1000-shot.startMs).filter(at=>at>=0&&at<=p.durationMs);
  for(const at of boundaries)assert.ok(compiled.frames.some(frame=>Math.abs(frame.timeMs-at)<.001));assert.deepEqual(compiled.report.seatSupports,f.source.supports);assert.equal(compiled.report.bodySeat!.supportTrackHash,hash({supports:f.source.supports,postures:f.source.postures,entryPosture:f.source.entryPosture??null}));assert.equal(compiled.report.bodySeat!.sourceBody!.id,f.source.id);assert.equal(compiled.report.bodySeat!.motionVerified,false);assert.ok(compiled.report.maxSeatContactErrorPx!<=.01);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  for(const at of boundaries)if(at<p.durationMs)assert.ok(eventPreviewTimes(shot).includes(Math.round(shot.startMs+at)));assert.throws(()=>cameraHostBounds(p,f.profile),/complete storyboard\/run context/);assert.doesNotThrow(()=>planCamera(p,f.profile,{framing:'wide',movement:'locked',actingClock:c}));
});

test('single-actor framing fits the whole source seat including its shadow and backrest',()=>{
  const f=nativeRun('lila','three-quarter-right',[0,7200]),shot=f.shots[0]!,p=shot.cinematic!.performance,seat=p.sourceBody!.supports![0]!,shift=640-seat.center.x;
  p.stage={width:1280,height:720,groundY:540};p.root.x+=shift;p.root.y=540;seat.center.x=640;seat.center.y+=130;seat.width=1200;seat.backHeight=80;for(const walk of p.sourceBody!.walks){walk.fromX+=shift;walk.toX+=shift;}
  const c=actorViewActingClock(f.board,shot,'lila')!;assert.doesNotThrow(()=>validatePerformance(p,f.profile));const camera=planCamera(p,f.profile,{framing:'wide',movement:'locked',actingClock:c});shot.cinematic!.camera=camera;shot.camera={shotSize:camera.framing,movement:camera.movement,angle:'eye-level'};
  assert.doesNotThrow(()=>validateCamera(shot,f.profile,c));
  for(const t of [0,p.durationMs]){const matrix=cameraMatrixAt(camera,p.stage,p.durationMs,t);assert.ok((seat.center.x-seat.width*.6-2)*matrix.scale+matrix.x>=1280*CAMERA_VIEWPORT.left-.001);assert.ok((seat.center.x+seat.width*.6+2)*matrix.scale+matrix.x<=1280*CAMERA_VIEWPORT.right+.001);}
});

async function canonicalPair(root:string){
  const seed=await creativeFixture(root);seed.config.presentation.character_mode='actors';const first='Lila and Karo sit down together. Lila talks while Karo listens.',last='Karo replies. They stand and walk together.',text=first+' '+last,narration=NarrationSchema.parse({mode:'script',durationMs:7200,segments:[{id:'lila-cue',startMs:0,endMs:3000,text:first},{id:'karo-cue',startMs:3000,endMs:7200,text:last}]});
  const refs=narration.segments.map(cue=>({kind:'narration' as const,segmentId:cue.id,quote:cue.text}));
  const templates=([['lila','three-quarter-right',380],['karo','three-quarter-left',850]] as const).map(([actor,view,rootX])=>{const f=physicalActor(actor,view,.8,rootX);return {character:ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance:f.profile.appearance,sourceRefs:refs}),plan:f.plan};});
  const intent={participants:templates.map(({character})=>({id:character.id,name:character.name,role:character.role,identity:character.identity,sourceRefs:refs})),action:text,objective:text,sourceRefs:refs,acting:templates.flatMap(({character})=>[
    {participantId:character.id,kind:'posture' as const,statement:first,sourceRefs:[refs[0]!]},{participantId:character.id,kind:'posture' as const,statement:last,sourceRefs:[refs[1]!]},{participantId:character.id,kind:'locomotion' as const,movement:'walk' as const,statement:last,sourceRefs:[refs[1]!]}
  ])};
  const cuts=[0,900,2400,3800,4800,7200],shots=cuts.slice(0,-1).map((startMs,i)=>{const endMs=cuts[i+1]!,shot=structuredClone(seed.shot),c=shot.cinematic!;shot.id='native-seat-canonical-'+i;shot.startMs=startMs;shot.endMs=endMs;shot.beatIds=['seat-beat'];shot.narrationSegmentIds=narration.segments.filter(cue=>cue.startMs<endMs&&cue.endMs>startMs).map(cue=>cue.id);shot.subject=shot.visualDescription=text;shot.sourceRefs=refs;shot.textOnScreen=null;shot.assetNeeds=[];shot.visualization={type:'event-sequence',modelId:'seated-actors',parts:[],relations:[],events:[],provenance:'visualization',fidelity:'conceptual',sceneIntent:intent};
    const actors=templates.map(({character,plan})=>{const p=structuredClone(plan);p.id=shot.id;p.durationMs=endMs-startMs;p.sourceBody={version:BODY_SOURCE_VERSION,id:character.id+'-complete-seat',startMs:0,endMs:7200,walks:p.walks,postures:p.postures,supports:p.supports,entryPosture:p.entryPosture};p.walks=[];p.jumps=[];p.postures=[];p.supports=[];delete p.entryPosture;p.expressions=[];return {character,performance:p,actions:[{type:'idle' as const,startMs,endMs}],speakingSegmentIds:shot.narrationSegmentIds!.filter(id=>id===character.id+'-cue')};});
    const lead=i%2,primary=actors[lead]!,other=actors[1-lead]!;c.shotId=shot.id;c.sourceRefs=refs;c.sceneIntent=intent;c.setting='camp';c.models=[];c.propBindings=[];delete c.attentionPartId;c.performance=primary.performance;c.actorScene=ActorSceneSchema.parse({primary:primary.character,speakingSegmentIds:primary.speakingSegmentIds,continuity:i?'continuous':'cut',supporting:[other]});c.continuity={entry:bodyRootAt(c.performance,startMs,0),exit:bodyRootAt(c.performance,startMs,c.performance.durationMs),facing:c.performance.facing!,carriedProps:[],models:[]};
    c.artDirection={origin:'authored',brief:'Two forest actors in a vivid green clearing. Physical seats and camera share the same world.',useEnvironment:false,palette:{background:'#53AFDE',surface:'#F2BF66',ink:'#24180D',accent:'#D57423'},showHeading:false,layers:[{id:'forest',plane:'background',role:'decoration',svg:'<rect width="1280" height="720" fill="#53AFDE"/><path d="M0 380Q200 280 410 350T850 340T1280 320V720H0Z" fill="#3F7D32"/><path d="M0 540Q600 495 1280 540V720H0Z" fill="#D5A259"/>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]}],models:[]};bindActorShot(shot,seed.profile,seed.rig);shot.host!.actions=primary.actions;return shot;
  });const board=StoryboardSchema.parse({shots});
  for(const shot of board.shots){const c=shot.cinematic!,scene=c.actorScene!,profile=actorProfile(scene.primary!);c.camera=planCamera(c.performance,profile,{framing:'wide',movement:'locked',actingClock:actorViewActingClock(board,shot,profile.id),supporting:scene.supporting.map(actor=>({performance:actor.performance,profile:actorProfile(actor.character),actingClock:actorViewActingClock(board,shot,actor.character.id)}))});shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};}
  return {...seed,narration,board,beat:{id:'seat-beat',startMs:0,endMs:7200,sceneIntent:intent} as Beat};
}

test('canonical objectless two-actor seated run retains original clocks through primary and speaking/listening changes',async t=>{
  const f=await canonicalPair(await temporary(t));assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));assert.doesNotThrow(()=>validateStoryActingCoverage(f.board,[f.beat],f.narration));assert.deepEqual([...narrationCueOwners(f.board,f.board.shots[0]!,f.narration)],[['lila',['lila-cue']],['karo',['karo-cue']]]);
  for(const shot of f.board.shots){assert.doesNotThrow(()=>validateCinematicShot(shot,f.profile,f.config,f.board));const c=shot.cinematic!,profile=actorProfile(c.actorScene!.primary!),clock=actorViewActingClock(f.board,shot,profile.id)!;assert.doesNotThrow(()=>validateCamera(shot,profile,clock));assert.equal(sceneSeats(shot).length,2);
    for(const matrix of [cameraMatrixAt(c.camera,c.performance.stage,c.performance.durationMs,0),cameraMatrixAt(c.camera,c.performance.stage,c.performance.durationMs,c.performance.durationMs)])for(const seat of sceneSeats(shot)){const bottom=(c.performance.stage.groundY+9)*matrix.scale+matrix.y;assert.ok(bottom<=720*CAMERA_VIEWPORT.bottom+.001);assert.ok((seat.center.y-(seat.backHeight??0)-2)*matrix.scale+matrix.y>=720*CAMERA_VIEWPORT.top-.001);}
    const result=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration,undefined,undefined,f.board),files=secureSceneFiles(result.files);assert.deepEqual(validateSceneFiles(files,shot,f.config.workflow.max_scene_bytes,actorRigResourcePaths(shot,f.profile),f.config.rendering.final),[]);assert.deepEqual(result.report.actors.map(actor=>actor.actorId).sort(),['karo','lila']);assert.ok('phonemeLipSync' in result.report);assert.equal(result.report.phonemeLipSync,false);const html=files.files.find(file=>file.path==='index.html')!.content;for(const id of ['lila-log','karo-log'])assert.equal(html.split('data-seat-id="'+id+'"').length-1,1);
  }
  const broken=structuredClone(f.board),shot=broken.shots[1]!;delete shot.cinematic!.artDirection;assert.throws(()=>validateCinematicShot(shot,f.profile,f.config,broken),/seated acting requires/);
});
