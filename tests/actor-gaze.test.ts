// Declarations only. Runtime/pose/compiler execution belongs to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {hash,readJson,writeJson,writeAtomic,exists} from '../packages/core/utils.js';
import type {Shot,Storyboard} from '../packages/core/schemas.js';
import {GazeSchema,type PerformancePlan} from '../packages/animation/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile,validateActorCast} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {normalizeViewGazes,projectViewGazes,validateViewActingClock} from '../packages/animation/view-acting-clock.js';
import {ViewGazeTargetSchema,viewGazeTargetTimes} from '../packages/animation/view-gaze-target.js';
import {nativeActorEyeAnchor,sourceActorEyeAnchor,samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {registeredBodyView} from '../packages/animation/body-view-art.js';
import {registeredBodyViewEyes} from '../packages/animation/body-view-eyes.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {createNativeSeatTracer} from '../benchmarks/native-seat-tracer.js';
import {nativeSceneSourceGuard} from '../packages/scenes/source-publication.js';
import {publishSceneRevision,recoverCinematicArtworkTransactions} from '../packages/director/artwork-repair.js';
import {temporary} from './support.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function performer(shot:Shot,id:string){
  const c=shot.cinematic!,s=c.actorScene!;
  return s.primary?.id===id?{character:s.primary,performance:c.performance}:s.supporting.find(a=>a.character.id===id)!;
}
function pointNear(a:{x:number;y:number},b:{x:number;y:number},epsilon=.01){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=epsilon,JSON.stringify({a,b}));}
/** Independent projection through the actual rendered SVG head transform. */
function renderedEyes(frame:ReturnType<typeof samplePerformance>,profile:ReturnType<typeof actorProfile>){
  const values=frame.transforms.head!.match(/-?\d+(?:\.\d+)?/g)!.map(Number),[x,y,angle,scale]=values as [number,number,number,number];
  const c=registeredBodyView(profile),eyes=registeredBodyViewEyes(profile).eyes;
  const second=eyes[1];assert.ok(second,'this legacy3/4 fixture has two registered eyes');
  const px=((eyes[0].center.x+second.center.x)/2-c.neck.x)*c.headScale*scale;
  const py=((eyes[0].center.y+second.center.y)/2-c.neck.y)*c.headScale*scale,rad=angle*Math.PI/180;
  return {x:x+px*Math.cos(rad)-py*Math.sin(rad),y:y+px*Math.sin(rad)+py*Math.cos(rad)};
}

test('gaze accepts exactly one fixed point or explicit eye actor and preserves original projection',()=>{
  const a={startMs:0,endMs:900,actorTarget:{id:'karo',anchor:'eyes' as const}},b={...a,startMs:900,endMs:2400};
  assert.ok(GazeSchema.safeParse(a).success);assert.ok(GazeSchema.safeParse({startMs:0,endMs:900,target:{x:4,y:8}}).success);
  for(const value of [{...a,target:{x:4,y:8}},{startMs:0,endMs:900},{...a,actorTarget:{id:'karo',anchor:'root'}},{...a,actorTarget:{id:'karo',anchor:'eyes',fallback:{x:4,y:8}}}])assert.equal(GazeSchema.safeParse(value).success,false);
  assert.deepEqual(normalizeViewGazes([b,a]),[{...a,endMs:2400}]);assert.deepEqual(projectViewGazes([a,b],400,1400),[{...a,startMs:0,endMs:1000}]);
  assert.equal(normalizeViewGazes([a,{...b,actorTarget:{id:'lila',anchor:'eyes'}}]).length,2);
});

test('mutual targets use actual partner head/eye geometry and original seat/breath clock across cuts and reverse seeks',()=>{
  const f=createNativeSeatTracer(),before=hash(f.board),seen=new Map<string,Set<string>>();
  for(const shot of f.board.shots)for(const id of ['lila','karo']){
    const owner=performer(shot,id),profile=actorProfile(owner.character),clock=actorViewActingClock(f.board,shot,id)!;
    const other=id==='lila'?'karo':'lila',partner=performer(shot,other),partnerProfile=actorProfile(partner.character),partnerClock=actorViewActingClock(f.board,shot,other)!;
    assert.equal(clock.actorTargets!.length,1);const source=clock.actorTargets![0]!;
    assert.equal(source.actorId,other);assert.equal(source.startMs,0);assert.equal(source.endMs,7200);assert.deepEqual(source.performance.gazes,[]);assert.deepEqual(source.performance.gestures,[]);
    for(const at of [owner.performance.durationMs*.83,0,owner.performance.durationMs*.17,owner.performance.durationMs/2,0]){
      const actual=samplePerformance(owner.performance,profile,at,silence,undefined,clock),target=samplePerformance(partner.performance,partnerProfile,at,silence,undefined,partnerClock);
      assert.equal(actual.actorGaze?.targetActorId,other);pointNear(actual.actorGaze!.target,renderedEyes(target,partnerProfile));pointNear(actual.actorGaze!.origin,renderedEyes(actual,profile));
      pointNear(sourceActorEyeAnchor(source,shot.startMs+at),nativeActorEyeAnchor(partner.performance,partnerProfile,at,partnerClock),1e-8);
      const set=seen.get(other)??new Set<string>();set.add(JSON.stringify(actual.actorGaze!.target));seen.set(other,set);
      assert.doesNotMatch(JSON.stringify(actual),/NaN|Infinity/);
    }
  }
  assert.equal(hash(f.board),before);for(const set of seen.values())assert.ok(set.size>10,'target must move with the partner');
  for(let i=1;i<f.board.shots.length;i++)for(const id of ['lila','karo']){
    const a=f.board.shots[i-1]!,b=f.board.shots[i]!,ac=actorViewActingClock(f.board,a,id)!,bc=actorViewActingClock(f.board,b,id)!;
    assert.equal(ac.sourceIdentityHash,bc.sourceIdentityHash);assert.equal(ac.actorTargets![0]!.fingerprint,bc.actorTargets![0]!.fingerprint);
    pointNear(sourceActorEyeAnchor(ac.actorTargets![0]!,a.endMs),sourceActorEyeAnchor(bc.actorTargets![0]!,b.startMs),1e-8);
  }
});

test('slice fps and performance IDs do not invalidate identical original physical target identity',()=>{
  const f=createNativeSeatTracer();for(const [i,shot] of f.board.shots.entries())for(const id of ['lila','karo']){const p=performer(shot,id).performance;p.fps=i%2?24:30;p.id=id+'-metadata-'+i;}
  assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));
  for(const id of ['lila','karo'])assert.equal(new Set(f.board.shots.map(s=>actorViewActingClock(f.board,s,id)!.sourceIdentityHash)).size,1);
});

test('missing, self, hidden, wrong-world and unregistered target sources block binding',()=>{
  for(const fault of ['self','unknown','hidden','world','eyes','expressions','missing-sibling'] as const){
    const f=createNativeSeatTracer(),current=f.board.shots[0]!;
    if(fault==='self'||fault==='unknown')performer(current,'lila').performance.gazes[0]={startMs:0,endMs:current.endMs,actorTarget:{id:fault==='self'?'lila':'absent',anchor:'eyes'}};
    if(fault==='hidden')f.board.shots[1]!.host!.presence='absent';
    if(fault==='missing-sibling')f.board.shots[2]!.cinematic!.actorScene!.supporting=[];
    if(fault==='world')for(const shot of f.board.shots)performer(shot,'karo').performance.stage.width+=1;
    if(fault==='eyes'||fault==='expressions')for(const shot of f.board.shots){const a=performer(shot,'karo');if(fault==='eyes')delete a.character.appearance.bodyEyes;else delete a.character.appearance.bodyExpressions;a.performance.profileHash=actorProfile(a.character).profileHash;}
    assert.throws(()=>actorViewActingClock(f.board,current,'lila'),/needs-|native|registered|Gaze target/,fault);
  }
});

test('render context rejects missing/extra/tampered descriptors; fixed points retain no-context behavior and behind-view guard',()=>{
  const f=createNativeSeatTracer(),shot=f.board.shots[0]!,a=performer(shot,'lila'),profile=actorProfile(a.character),clock=actorViewActingClock(f.board,shot,'lila')!;
  assert.throws(()=>samplePerformance(a.performance,profile,300,silence),/needs-view-body-phase|needs-actor-gaze/);
  const absent=structuredClone(clock);delete absent.actorTargets;assert.throws(()=>validateViewActingClock(a.performance,absent),/missing or extra/);
  const duplicate=structuredClone(clock);duplicate.actorTargets!.push(structuredClone(duplicate.actorTargets![0]!));assert.throws(()=>validateViewActingClock(a.performance,duplicate),/duplicate/);
  const bad=structuredClone(clock.actorTargets![0]!);bad.performance.root.x+=1;assert.equal(ViewGazeTargetSchema.safeParse(bad).success,false);
  const hidden=structuredClone(clock.actorTargets![0]!);hidden.performance.gazes=[{startMs:0,endMs:1,target:{x:1,y:2}}];assert.equal(ViewGazeTargetSchema.safeParse(hidden).success,false);
  const p:PerformancePlan=structuredClone(a.performance);delete p.sourceBody;p.gazes=[{startMs:0,endMs:p.durationMs,target:{x:800,y:300}}];
  assert.doesNotThrow(()=>samplePerformance(p,profile,300,silence));p.gazes[0]={startMs:0,endMs:p.durationMs,target:{x:0,y:300}};
  assert.throws(()=>samplePerformance(p,profile,300,silence),/behind the fixed native view/);
});

test('partner physical source and expression changes invalidate already compiled publication identity',()=>{
  for(const change of ['body','expression'] as const){
    const f=createNativeSeatTracer(),shot=f.board.shots[0]!,binding=rigSpeechPublicationBinding(shot,f.narration,f.board),old=actorViewActingClock(f.board,shot,'lila')!.actorTargets![0]!.fingerprint;
    for(const s of f.board.shots){const p=performer(s,'karo').performance;if(change==='body')p.sourceBody!.walks[0]!.toX+=1;else p.expressions=[{startMs:0,endMs:p.durationMs,mood:'happy'}];}
    assert.notEqual(actorViewActingClock(f.board,shot,'lila')!.actorTargets![0]!.fingerprint,old);
    assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,f.board,binding),/source identity changed/);
  }
});

test('physical lunge target retains original thrust timing without resolving its arms or props',()=>{
  const pair=(['lila','karo'] as const).map(id=>{
    const prepared=bodyCalibrationPlan(id,id==='karo'?'spear-lunge':'rest','happy',undefined,'three-quarter-right','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1');
    const character=ActorDefinitionSchema.parse({id,name:id,role:'illustration',identity:'illustrative',kind:'stick-man',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'Both prepare.'}]}),profile=actorProfile(character),p=prepared.plan;
    p.profileHash=profile.profileHash;p.durationMs=4000;p.expressions=[{startMs:0,endMs:4000,mood:'happy'}];p.gazes=id==='lila'?[{startMs:0,endMs:4000,actorTarget:{id:'karo',anchor:'eyes'}}]:[];
    return {character,performance:p,actions:[],speakingSegmentIds:[]};
  });
  // Deliberately minimal clock-only shot; no scene/camera renderer fixture.
  const shot={id:'lunge-eyes',startMs:0,endMs:4000,cinematic:{performance:pair[0]!.performance,actorScene:{primary:pair[0]!.character,speakingSegmentIds:[],supporting:[pair[1]!],continuity:'cut'}}} as unknown as Shot,board={shots:[shot]} as Storyboard;
  const clock=actorViewActingClock(board,shot,'lila')!,target=clock.actorTargets![0]!,partner=pair[1]!,pc=actorViewActingClock(board,shot,'karo')!;
  assert.ok(target.lungeClock);assert.deepEqual(target.performance.spears,[]);assert.deepEqual(target.performance.props,[]);
  for(const at of [0,1200,1500,1800,3000,3999,1500])pointNear(sourceActorEyeAnchor(target,at),nativeActorEyeAnchor(partner.performance,actorProfile(partner.character),at,pc),1e-8);
  const bad=structuredClone(target);delete bad.lungeClock;assert.equal(ViewGazeTargetSchema.safeParse(bad).success,false);
});

test('full 96-character actor IDs bind and bake reports keep gaze and motion explicitly unapproved',()=>{
  const f=createNativeSeatTracer(),long='k'.repeat(96);
  for(const shot of f.board.shots){const a=performer(shot,'karo');a.character.id=long;a.performance.leadCharacterId=long;a.performance.profileHash=actorProfile(a.character).profileHash;performer(shot,'lila').performance.gazes[0]={startMs:0,endMs:shot.endMs-shot.startMs,actorTarget:{id:long,anchor:'eyes'}};}
  const shot=f.board.shots[0]!,a=performer(shot,'lila'),clock=actorViewActingClock(f.board,shot,'lila')!,target=clock.actorTargets![0]!;
  assert.equal(target.actorId,long);assert.equal(target.performance.id,long);assert.ok(viewGazeTargetTimes(target).includes(1800));
  const compiled=compilePerformance(a.performance,actorProfile(a.character),silence,undefined,undefined,clock),report=compiled.report as unknown as {bodyEyes:{targetSources:{actorId:string}[];motionVerified:boolean;opticalGazeVerified:boolean}};
  assert.equal(report.bodyEyes.targetSources[0]!.actorId,long);assert.equal(report.bodyEyes.motionVerified,false);assert.equal(report.bodyEyes.opticalGazeVerified,false);
});

test('normal publication checks disk target against the render snapshot before any accepted scene or journal write',async t=>{
  const root=await temporary(t),f=createNativeSeatTracer(),shot=f.board.shots[0]!,binding=rigSpeechPublicationBinding(shot,f.narration,f.board),guard=nativeSceneSourceGuard(root,shot,binding)!;
  await writeJson(path.join(root,'work/storyboard.json'),f.board);await writeJson(path.join(root,'work/narration.json'),f.narration);await guard();
  const changed=structuredClone(f.board);for(const s of changed.shots)performer(s,'karo').performance.sourceBody!.walks[0]!.toX+=1;
  await writeJson(path.join(root,'work/storyboard.json'),changed);
  const scene=`scenes/${shot.id}/index.html`,file=path.join(root,scene);await writeAtomic(file,'accepted previous scene');
  await assert.rejects(publishSceneRevision(root,new Map([[scene,'stale candidate']]),undefined,guard),/source identity changed|canonical shot changed/);
  assert.equal(await fs.readFile(file,'utf8'),'accepted previous scene');assert.equal(await exists(path.join(root,'work/artwork-transactions')),false);
});

test('source change after scene writes rolls back the full scene bundle and preserves the user storyboard edit',async t=>{
  const root=await temporary(t),f=createNativeSeatTracer(),shot=f.board.shots[0]!,guard=nativeSceneSourceGuard(root,shot,rigSpeechPublicationBinding(shot,f.narration,f.board))!;
  await writeJson(path.join(root,'work/storyboard.json'),f.board);await writeJson(path.join(root,'work/narration.json'),f.narration);
  const html=`scenes/${shot.id}/index.html`,report=`scenes/${shot.id}/performance-report.json`,transaction=path.join(root,'work/artwork-transactions/source-guard-test');
  await writeAtomic(path.join(root,html),'accepted scene');await writeAtomic(path.join(root,report),'accepted report');
  const changed=structuredClone(f.board);for(const s of changed.shots)performer(s,'karo').performance.expressions=[{startMs:0,endMs:s.endMs-s.startMs,mood:'happy'}];
  await assert.rejects(publishSceneRevision(root,new Map([[html,'new scene'],[report,'new report']]),transaction,async phase=>{
    if(phase==='after')await writeJson(path.join(root,'work/storyboard.json'),changed);await guard();
  }),/source identity changed|canonical shot changed/);
  assert.equal(await fs.readFile(path.join(root,html),'utf8'),'accepted scene');assert.equal(await fs.readFile(path.join(root,report),'utf8'),'accepted report');
  assert.equal(hash(await readJson(path.join(root,'work/storyboard.json'))),hash(changed));assert.equal((await readJson<{status:string}>(path.join(transaction,'journal.json'))).status,'rolled-back');
});

test('rollback never overwrites a concurrent edit to a file in the transaction and resume reports the conflict',async t=>{
  const root=await temporary(t),board='work/storyboard.json',html='scenes/candidate/index.html',transaction=path.join(root,'work/artwork-transactions/concurrent-edit-test');
  await writeAtomic(path.join(root,board),'previous board');await writeAtomic(path.join(root,html),'previous scene');
  await assert.rejects(publishSceneRevision(root,new Map([[board,'candidate board'],[html,'candidate scene']]),transaction,async phase=>{
    if(phase==='after'){await writeAtomic(path.join(root,board),'user edited board');throw new Error('source changed');}
  }),/preserved separate edits/);
  assert.equal(await fs.readFile(path.join(root,board),'utf8'),'user edited board');assert.equal(await fs.readFile(path.join(root,html),'utf8'),'previous scene');
  const journal=await readJson<{status:string;rollbackConflicts:string[]}>(path.join(transaction,'journal.json'));assert.equal(journal.status,'rollback-conflict');assert.deepEqual(journal.rollbackConflicts,[board]);
  await assert.rejects(recoverCinematicArtworkTransactions(root),/manual recovery required/);
});
