// DECLARED ONLY, NOT RUN. User's test model owns geometry/renderer execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeHeadSeatTracer,createNativeSeatTracer,NATIVE_HEAD_SEAT_TRACER_SCOPE,NATIVE_HEAD_SEAT_TRACER_VERSION} from '../benchmarks/native-seat-tracer.js';
import {actorProfile,validateActorCast} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {actorShotSpeech,narrationCueOwners,rigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {nativeHeadCellPoint,nativeHeadBankCellAtGlobal} from '../packages/animation/body-head-bank.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {sceneSeats} from '../packages/stage/seats.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {hash} from '../packages/core/utils.js';
import type {Shot} from '../packages/core/schemas.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
import {NATIVE_DIALOGUE_STAGINGS,nativeDialogueLayouts,nativeDialogueThinkingWindows,nativeDialogueThinkingWrist} from '../packages/topics/native-dialogue-candidates.js';
import {registeredDetailedBodyView,bodyViewAsset} from '../packages/animation/body-view-art.js';
import {projectViewSourceGestures} from '../packages/animation/view-source-gesture.js';

type Fixture=Awaited<ReturnType<typeof createNativeHeadSeatTracer>>;
type Actor='lila'|'karo';
// Synthetic activity is test data only, never diagnostic WAV or TTS evidence.
const activity:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[{startMs:100,endMs:2950,level:.7},{startMs:3250,endMs:7100,level:.7}]};
function context(f:Fixture,shot:Shot,id:Actor){
  const c=shot.cinematic!,s=c.actorScene!;
  const actor=s.primary!.id===id?{character:s.primary!,performance:c.performance,speakingSegmentIds:s.speakingSegmentIds}:s.supporting.find(a=>a.character.id===id)!;
  const profile=actorProfile(actor.character),owners=narrationCueOwners(f.board,shot,f.narration);
  return {profile,plan:actor.performance,clock:actorViewActingClock(f.board,shot,id)!,speech:actorShotSpeech(activity,f.narration,id,actor.speakingSegmentIds,shot.startMs,shot.endMs,owners.get(id)??[])};
}
function frame(f:Fixture,shot:Shot,id:Actor,globalMs:number){
  const c=context(f,shot,id);return samplePerformance(c.plan,c.profile,globalMs-shot.startMs,c.speech.activity,c.speech.sourceClock,c.clock);
}
function renderedEyePoint(f:Fixture,shot:Shot,id:Actor,state:ReturnType<typeof frame>){
  const {profile}=context(f,shot,id),bank=profile.appearance.bodyHeadBank!,cell=bank.cells[0]!;
  const p=nativeHeadCellPoint(bank,cell,cell.eyeTarget),values=state.transforms.head!.match(/-?\d+(?:\.\d+)?/g)!.map(Number),[x,y,angle,scale]=values as [number,number,number,number],rad=angle*Math.PI/180;
  return {x:x+scale*(p.x*Math.cos(rad)-p.y*Math.sin(rad)),y:y+scale*(p.x*Math.sin(rad)+p.y*Math.cos(rad))};
}
/** Independent complete-run evaluator control; not a second renderer. */
function wholeRun(f:Fixture):Fixture{
  const shot=structuredClone(f.board.shots[0]!);shot.endMs=7200;shot.narrationSegmentIds=f.narration.segments.map(s=>s.id);
  const c=shot.cinematic!,s=c.actorScene!;
  const all=[{character:s.primary!,performance:c.performance},...s.supporting];
  for(const actor of all){const id=actor.character.id as Actor,clock=context(f,f.board.shots[0]!,id).clock,p=actor.performance;
    p.durationMs=7200;p.gazes=[{startMs:0,endMs:7200,actorTarget:{id:id==='lila'?'karo':'lila',anchor:'eyes'}}];
    p.gestures=projectViewSourceGestures(clock.gestures,0,7200,0,7200);
  }
  s.speakingSegmentIds=['lila-cue'];s.supporting[0]!.speakingSegmentIds=['karo-cue'];
  return {...f,board:{shots:[shot]}};
}

test('opposing native heads share the canonical seat run while old fixed-view overlays remain the default',async()=>{
  const f=await createNativeHeadSeatTracer(process.cwd()),old=createNativeSeatTracer();
  assert.equal(f.scope,NATIVE_HEAD_SEAT_TRACER_SCOPE);assert.equal(f.version,NATIVE_HEAD_SEAT_TRACER_VERSION);
  assert.equal(f.productionAcceptance,false);assert.equal(f.finalExportAllowed,false);
  assert.deepEqual(f.headSelection.map(h=>[h.actorId,h.view]),[['lila','three-quarter-right'],['karo','three-quarter-left']]);
  assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));assert.doesNotThrow(()=>validateStoryActingCoverage(f.board,[f.beat],f.narration));
  for(const [i,shot] of f.board.shots.entries())for(const id of ['lila','karo'] as const){
    const c=context(f,shot,id),bank=c.profile.appearance.bodyHeadBank!,selection=f.headSelection.find(h=>h.actorId===id)!;
    assert.equal(bank.fingerprint,selection.bankFingerprint);assert.equal(bank.source.file,selection.sourceFile);
    assert.equal(c.clock.headMotion!.ownerId,id);assert.equal(c.clock.headMotion!.startMs,0);assert.equal(c.clock.headMotion!.endMs,7200);
    assert.deepEqual(c.plan.sourceHead,c.clock.headMotion);assert.deepEqual(c.plan.sourceBody,context({...f,board:old.board},old.board.shots[i]!,id).plan.sourceBody);
    for(const key of ['bodySpeech','bodyEyes','bodyExpressions','bodySecondary'] as const)assert.equal(c.profile.appearance[key],undefined);
    assert.equal(c.clock.actorTargets!.length,1);assert.equal(c.clock.actorTargets![0]!.actorId,id==='lila'?'karo':'lila');
    assert.ok(c.clock.actorTargets![0]!.performance.sourceHead);assert.equal(sceneSeats(shot).length,2);
    assert.equal(selection.artApproved,false);assert.equal(selection.motionVerified,false);
  }
  assert.equal(old.profile.appearance.bodyHeadBank,undefined);assert.equal(old.profile.appearance.bodySpeech,'registered-rest-mouth-v1');
});

test('actor-owned mouths and actual rendered eye targets survive cuts, lead swaps and reverse seeks',async()=>{
  const f=await createNativeHeadSeatTracer(process.cwd()),before=hash(f.board);
  for(const [index,shot] of f.board.shots.entries()){
    for(const globalMs of [shot.startMs,(shot.startMs+shot.endMs)/2,shot.endMs-1]){
      const lila=frame(f,shot,'lila',globalMs),karo=frame(f,shot,'karo',globalMs);
      for(const [from,to,targetId] of [[lila,karo,'karo'],[karo,lila,'lila']] as const){
        assert.equal(from.actorGaze!.targetActorId,targetId);const eyes=renderedEyePoint(f,shot,targetId,to);
        assert.ok(Math.hypot(from.actorGaze!.target.x-eyes.x,from.actorGaze!.target.y-eyes.y)<.01);
      }
    }
    for(const id of ['lila','karo'] as const){
      const times=[shot.endMs-1,shot.startMs,(shot.startMs+shot.endMs)/2],baseline=new Map(times.map(t=>[t,frame(f,shot,id,t)]));
      for(const t of [...times].reverse())assert.deepEqual(frame(f,shot,id,t),baseline.get(t));
      if(index){const left=f.board.shots[index-1]!,a=frame(f,left,id,shot.startMs),b=frame(f,shot,id,shot.startMs);
        assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.face,b.face);assert.deepEqual(a.actorGaze,b.actorGaze);
      }
    }
  }
  for(const [at,speaker,listener] of [[750,'lila','karo'],[3500,'karo','lila']] as const){
    const shot=f.board.shots.find(s=>s.startMs<=at&&s.endMs>at)!;
    assert.equal(frame(f,shot,speaker,at).face['native-face-0-mouth-generated']!.opacity,1);
    assert.equal(frame(f,shot,listener,at).face['native-face-0-mouth-generated']!.opacity,0);
  }
  assert.equal(hash(f.board),before);
});

test('factory renderer owns each native head resource and namespace inside the shared scene cap',async()=>{
  const f=await createNativeHeadSeatTracer(process.cwd());
  for(const shot of f.board.shots){
    const result=renderCinematic(shot,f.profile,f.rig,activity,f.config,undefined,f.narration,undefined,undefined,f.board),files=secureSceneFiles(result.files),allowed=actorRigResourcePaths(shot,f.profile);
    assert.deepEqual(validateSceneFiles(files,shot,f.config.workflow.max_scene_bytes,allowed,f.config.rendering.final),[]);
    assert.deepEqual(result.report.actors.map(a=>a.actorId).sort(),['karo','lila']);
    const html=files.files.find(file=>file.path==='index.html')!.content;
    for(const id of ['lila','karo'] as const){
      const c=context(f,shot,id),bank=c.profile.appearance.bodyHeadBank!;
      const resources=referenceHeadAssets(c.profile.appearance),body=bodyViewAsset(c.profile.appearance);
      assert.equal(resources.filter(resource=>resource.file===body.file&&resource.sha256===body.sha256).length,1);
      const heads=resources.filter(resource=>resource.file!==body.file);
      assert.ok(heads.length>0);
      assert.equal(heads.filter(resource=>resource.nativeHeadPrimary).length,1);
      for(const resource of resources)assert.ok(allowed.includes(resource.path));
      for(const resource of heads){
        assert.ok(!resource.file.includes('/body-views/'));
        assert.ok(resource.nativeHeadSource!==undefined||resource.nativeHeadPrimary===true);
        if(resource.nativeHeadSource){
          assert.equal(resource.nativeHeadSource.primary.sha256,bank.primary.sha256);
          assert.ok(html.includes(resource.path),resource.file+' head cells must be emitted in this actor scene');
        }else assert.equal(resource.sha256,bank.primary.sha256);
      }
      assert.ok(html.includes('data-head-bank="'+bank.fingerprint+'"'));
      assert.equal(html.split('data-seat-id="'+id+'-log"').length-1,1);
      const actorReport=result.report.actors.find(a=>a.actorId===id)!;assert.ok('report' in actorReport);
      const report=actorReport.report.nativeHeadBank!;
      assert.equal(report.capabilities.speech,true);assert.equal(report.productionReady,false);
    }
    assert.ok('phonemeLipSync' in result.report);assert.equal(result.report.phonemeLipSync,false);
  }
});

test('publication refuses changed head ownership, target source or a conflicting speaker',async()=>{
  const f=await createNativeHeadSeatTracer(process.cwd()),shot=f.board.shots[0]!,original=rigSpeechPublicationBinding(shot,f.narration,f.board);
  const other=f.board.shots[1]!.cinematic!.actorScene!.supporting.find(a=>a.character.id==='lila')!;
  const head=other.performance.sourceHead!;other.performance.sourceHead={...head,ownerId:'karo'};
  assert.throws(()=>rigSpeechPublicationBinding(shot,f.narration,f.board),/head.*owner|head source actor|head.*differs/);
  other.performance.sourceHead=head;
  const target=f.board.shots[2]!.cinematic!.actorScene!.supporting.find(a=>a.character.id==='karo')!;
  target.performance.root.x+=1;assert.throws(()=>rigSpeechPublicationBinding(shot,f.narration,f.board),/geometry|physical|source|continuous/);target.performance.root.x-=1;
  const supporting=shot.cinematic!.actorScene!.supporting[0]!;supporting.speakingSegmentIds=['lila-cue'];
  assert.throws(()=>rigSpeechPublicationBinding(shot,f.narration,f.board),/conflicting actor owners/);supporting.speakingSegmentIds=[];
  assert.deepEqual(rigSpeechPublicationBinding(shot,f.narration,f.board),original);
});

test('both screen layouts bind independent matching head/body sources and keep each sourced actor identity',async()=>{
  for(const staging of NATIVE_DIALOGUE_STAGINGS){
    const f=await createNativeHeadSeatTracer(process.cwd(),{staging}),layout=nativeDialogueLayouts[staging];
    assert.deepEqual(f.dialogueSelection,{staging,acting:'rest'});
    for(const shot of f.board.shots)for(const expected of layout){
      const c=context(f,shot,expected.actor),selected=f.headSelection.find(h=>h.actorId===expected.actor)!;
      assert.equal(c.plan.root.x,expected.rootX);assert.equal(c.plan.facing,expected.view==='three-quarter-left'?'left':'right');
      assert.equal(c.profile.id,expected.actor);assert.equal(c.profile.name,expected.actor);assert.equal(c.profile.appearance.bodyView,expected.view);
      assert.equal(selected.view,expected.view);assert.equal(selected.bankFingerprint,c.plan.sourceHead!.bankFingerprint);
      assert.equal(c.profile.appearance.bodyHeadBank!.bodyViews[0]!.sourceHash,registeredDetailedBodyView(c.profile).sha256);
    }
    assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));assert.doesNotThrow(()=>validateStoryActingCoverage(f.board,[f.beat],f.narration));
  }
  await assert.rejects(createNativeHeadSeatTracer(process.cwd(),{staging:'mirror'} as never));
  await assert.rejects(createNativeHeadSeatTracer(process.cwd(),{acting:'wave'} as never));
});

test('listener chin gestures use declared rig hands and full body/head/speech history across both layouts',async()=>{
  for(const staging of NATIVE_DIALOGUE_STAGINGS){
    const f=await createNativeHeadSeatTracer(process.cwd(),{staging,acting:'listening-think'}),whole=wholeRun(f),before=hash(f.board);
    assert.match(f.narration.segments[0]!.text,/Karo listens and thinks/);assert.match(f.narration.segments[1]!.text,/Lila considers/);
    for(const shot of f.board.shots)for(const id of ['lila','karo'] as const){
      if(id==='lila')assert.doesNotThrow(()=>validateCinematicShot(shot,f.profile,f.config,f.board,f.narration));
      const c=context(f,shot,id),window=nativeDialogueThinkingWindows[id],command=c.clock.gestures[0]!;
      assert.equal(c.clock.gestures.length,1);assert.equal(command.hand,registeredDetailedBodyView(c.profile).nearHand);
      assert.equal(command.wristCurlDeg,nativeDialogueThinkingWrist[id]);
      assert.deepEqual({id:command.id,startMs:command.startMs,reachMs:command.reachMs,recoverMs:command.recoverMs,endMs:command.endMs},window);
      const a=context(whole,whole.board.shots[0]!,id);assert.deepEqual(c.clock.gestures,a.clock.gestures);
      for(const globalMs of [shot.startMs,shot.startMs+.01,(shot.startMs+shot.endMs)/2,shot.endMs-.01,shot.endMs]){
        const sliced=frame(f,shot,id,globalMs),original=frame(whole,whole.board.shots[0]!,id,globalMs);
        for(const key of ['hands','wrists','armGeometry','transforms','paths','face','actorGaze'] as const)assert.deepEqual(sliced[key],original[key]);
      }
      const at=Math.max(shot.startMs,window.reachMs),until=Math.min(shot.endMs,window.recoverMs);
      if(at<=until){
        const state=frame(f,shot,id,at),{bank,cell}=nativeHeadBankCellAtGlobal(c.plan,c.profile,at,c.clock),chin=nativeHeadCellPoint(bank,cell,cell.chin);
        const n=(value:string)=>value.match(/-?\d+(?:\.\d+)?/g)!.map(Number),head=n(state.transforms.head!),angle=head[2]!*Math.PI/180;
        const expected={x:head[0]!+head[3]!*(chin.x*Math.cos(angle)-chin.y*Math.sin(angle)),y:head[1]!+head[3]!*(chin.x*Math.sin(angle)+chin.y*Math.cos(angle))};
        const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y),hand=command.hand,m=rigMetrics(c.profile),wrist=state.wrists![hand],palm=state.hands[hand];
        assert.ok(distance(palm,expected)<.005,'registered chin contact changed');
        assert.ok(state.armGeometry![hand]!.flexionDeg<=145.01);
        assert.ok(Math.abs(distance(wrist,palm)-m.handAttachment![hand].length*c.plan.scale)<.003);
        const drawn=n(state.transforms[`hand-${hand}`]!),a=drawn[2]!*Math.PI/180,o=m.handAttachment![hand].wristOffset,k=drawn[3]!;
        assert.ok(distance(wrist,{x:drawn[0]!+k*(o.x*Math.cos(a)-o.y*Math.sin(a)),y:drawn[1]!+k*(o.x*Math.sin(a)+o.y*Math.cos(a))})<.005,'source hand cuff detached');
      }
    }
    assert.equal(hash(f.board),before);
    const current=f.board.shots[0]!,broken=f.board.shots[2]!.cinematic!.actorScene!.supporting.find(a=>a.character.id==='karo')!.performance.gestures[0]!;
    broken.sourceSpan!.recoverMs!+=1;
    assert.throws(()=>rigSpeechPublicationBinding(current,f.narration,f.board),/source command changed|source gesture/);
  }
});
