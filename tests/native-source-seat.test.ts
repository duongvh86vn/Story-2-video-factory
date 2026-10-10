// Runtime declarations ONLY. No callbacks, fixtures, samplers or renderers run
// by implementation agents. The user's model records actual PASS/FAIL/media.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {NarrationSchema,type Storyboard,type Shot} from '../packages/core/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,validateActorCast} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding,narrationCueOwners} from '../packages/actors/speech-clock.js';
import {BODY_SOURCE_VERSION,BodySourceSchema} from '../packages/animation/schemas.js';
import {sourceBodyPlan,bodyRootAt} from '../packages/animation/view-source-body.js';
import {seatOccupancy,supportMotionTimes} from '../packages/animation/support.js';
import {sceneSeats,shotSeatOccupancy} from '../packages/stage/seats.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {nativeSeatDescription} from '../packages/animation/body-view-seat.js';
import {cameraHostBounds,planCamera,validateCamera,cameraMatrixAt,CAMERA_VIEWPORT} from '../packages/director/camera.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {fixedMotionFields,applyActingRepair} from '../packages/director/acting-repair.js';
import {eventPreviewTimes} from '../packages/review/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {createNativeSeatTracer,nativeSeatPhysicalActor as physicalActor} from '../benchmarks/native-seat-tracer.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Actor='lila'|'karo';type View='three-quarter-left'|'three-quarter-right';
const defaultCuts=[0,615,1400,2400,3900,4500,5300,7200];
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

test('native seated rest arms retain their own cuff/palm bones and original phase through cuts and reverse seeks',()=>{
  const point=(value:string)=>{const numbers=value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);return {x:numbers[0]!,y:numbers[1]!};};
  const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const)for(const scale of [.75,1]){
    const f=nativeRun(actor,view,defaultCuts,scale),metrics=rigMetrics(f.profile);
    for(const [index,shot] of f.shots.entries()){
      const plan=shot.cinematic!.performance,clock=actorViewActingClock(f.board,shot,actor);
      for(const at of [0,plan.durationMs*.25,plan.durationMs*.5,plan.durationMs*.75,plan.durationMs]){
        const frame=samplePerformance(plan,f.profile,at,silence,undefined,clock);
        for(const hand of ['left','right'] as const){
          const shoulder=point(frame.transforms[`arm-${hand}-upper`]!),elbow=point(frame.transforms[`arm-${hand}-lower`]!),wrist=frame.wrists![hand];
          assert.ok(Math.abs(distance(shoulder,elbow)-metrics.arms![hand].upper*scale)<.01);
          assert.ok(Math.abs(distance(elbow,wrist)-metrics.arms![hand].lower*scale)<.01);
          assert.ok(Math.abs(distance(wrist,frame.hands[hand])-metrics.handAttachment![hand].length*scale)<.01);
        }
      }
      const at=plan.durationMs*.5,expected=samplePerformance(plan,f.profile,at,silence,undefined,clock);
      samplePerformance(plan,f.profile,plan.durationMs,silence,undefined,clock);samplePerformance(plan,f.profile,0,silence,undefined,clock);
      assert.deepEqual(samplePerformance(plan,f.profile,at,silence,undefined,clock).hands,expected.hands);
      if(index){
        const prior=f.shots[index-1]!,p=prior.cinematic!.performance;
        const before=samplePerformance(p,f.profile,p.durationMs,silence,undefined,actorViewActingClock(f.board,prior,actor));
        const after=samplePerformance(plan,f.profile,0,silence,undefined,clock);
        for(const hand of ['left','right'] as const){assert.ok(distance(before.hands[hand],after.hands[hand])<1e-6);assert.ok(distance(before.wrists![hand],after.wrists![hand])<1e-6);}
      }
    }
  }
});

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

test('canonical objectless two-actor seated run retains original clocks through primary and speaking/listening changes',()=>{
  const f=createNativeSeatTracer();assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));assert.doesNotThrow(()=>validateStoryActingCoverage(f.board,[f.beat],f.narration));assert.deepEqual([...narrationCueOwners(f.board,f.board.shots[0]!,f.narration)],[['lila',['lila-cue']],['karo',['karo-cue']]]);
  for(const shot of f.board.shots){assert.doesNotThrow(()=>validateCinematicShot(shot,f.profile,f.config,f.board));const c=shot.cinematic!,profile=actorProfile(c.actorScene!.primary!),clock=actorViewActingClock(f.board,shot,profile.id)!;assert.doesNotThrow(()=>validateCamera(shot,profile,clock));assert.equal(sceneSeats(shot).length,2);
    for(const matrix of [cameraMatrixAt(c.camera,c.performance.stage,c.performance.durationMs,0),cameraMatrixAt(c.camera,c.performance.stage,c.performance.durationMs,c.performance.durationMs)])for(const seat of sceneSeats(shot)){const bottom=(c.performance.stage.groundY+9)*matrix.scale+matrix.y;assert.ok(bottom<=720*CAMERA_VIEWPORT.bottom+.001);assert.ok((seat.center.y-(seat.backHeight??0)-2)*matrix.scale+matrix.y>=720*CAMERA_VIEWPORT.top-.001);}
    const result=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration,undefined,undefined,f.board),files=secureSceneFiles(result.files);assert.deepEqual(validateSceneFiles(files,shot,f.config.workflow.max_scene_bytes,actorRigResourcePaths(shot,f.profile),f.config.rendering.final),[]);assert.deepEqual(result.report.actors.map(actor=>actor.actorId).sort(),['karo','lila']);assert.ok('phonemeLipSync' in result.report);assert.equal(result.report.phonemeLipSync,false);const html=files.files.find(file=>file.path==='index.html')!.content;for(const id of ['lila-log','karo-log'])assert.equal(html.split('data-seat-id="'+id+'"').length-1,1);
  }
  const broken=structuredClone(f.board),shot=broken.shots[1]!;delete shot.cinematic!.artDirection;assert.throws(()=>validateCinematicShot(shot,f.profile,f.config,broken),/seated acting requires/);
});
