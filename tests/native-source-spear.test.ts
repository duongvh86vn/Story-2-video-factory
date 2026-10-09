import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import type {Shot} from '../packages/core/schemas.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_SOURCE_VERSION,SPEAR_SOURCE_VERSION,SpearSourceSchema,type SpearSource,type PerformancePlan} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,type ViewActingClock,validateViewActingClock} from '../packages/animation/view-acting-clock.js';
import {collectViewSourceSpear,performanceSpears,spearSourcePlan,sourceSpearTime,validateSpearSourcePlan} from '../packages/animation/view-source-spear.js';
import {performanceProps} from '../packages/animation/view-source-manipulation.js';
import {compilePerformance,samplePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {validatePropBindings,modelEntryParts,modelExitParts} from '../packages/director/props.js';
import {fixedMotionFields} from '../packages/director/acting-repair.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
// Factories are declared, never evaluated at module load. All callbacks are
// handed to the user's tester; source build/typecheck does not execute them.
function fixture(actor:'lila'|'karo',action:'spear-hold'|'spear-thrust'|'spear-lunge'='spear-thrust'){
  const f=bodyCalibrationPlan(actor,action,'happy','right','three-quarter-right','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION);
  const source:SpearSource={version:SPEAR_SOURCE_VERSION,id:'original-tool-run',ownerId:f.plan.leadCharacterId,startMs:1000,endMs:5000,
    props:f.plan.props.map(p=>{assert.ok(p.kind==='spear'&&p.length&&p.attachedTo&&p.gripOffset&&p.gripOffset.y===0);return {id:p.id,kind:'spear',length:p.length,attachedTo:p.attachedTo,origin:{...p.origin},gripOffset:{x:p.gripOffset.x,y:0}};}),
    spears:f.plan.spears!.map(s=>{assert.ok(s.elbowPoles);return {id:s.id,propId:s.propId,startMs:0,endMs:4000,hand:s.hand,twoHand:s.twoHands,action:s.action,grip:{...s.grip},aim:{...s.aim},secondaryOffset:s.secondaryOffset,
      elbowPoles:s.hand==='right'?{right:s.elbowPoles.primary,left:s.elbowPoles.secondary}:{left:s.elbowPoles.primary,right:s.elbowPoles.secondary},readyMs:s.readyMs,contactMs:s.contactMs,recoverMs:s.recoverMs};}),
    ...(f.plan.lunge?{lunge:structuredClone(f.plan.lunge)}:{})};
  const body={version:BODY_SOURCE_VERSION,id:'original-body-run',startMs:1000,endMs:5000,walks:structuredClone(f.plan.walks),jumps:structuredClone(f.plan.jumps??[]),postures:structuredClone(f.plan.postures??[])};
  const plan:PerformancePlan={...f.plan,props:[],spears:[],lunge:undefined,walks:[],jumps:[],postures:[],gestures:[],gazes:[],expressions:[],sourceBody:body,sourceSpear:source};
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:plan.leadCharacterId,startMs:1000,endMs:5000,runStartMs:1000,runEndMs:5000,sourceIdentityHash:hash({source,body}),gazes:[],gestures:[],bodyMotion:body,spearMotion:source};
  return {...f,plan,source,body,clock};
}
function slice(f:ReturnType<typeof fixture>,from:number,to:number){return {plan:{...f.plan,durationMs:to-from},clock:{...f.clock,startMs:1000+from,endMs:1000+to}};}

test('original spear owns explicit safe clocks, one entry-attached shaft, wooden grips and a complete positive thrust hold',()=>{
  const f=fixture('karo'),before=hash(f);SpearSourceSchema.parse(f.source);validateSpearSourcePlan(f.plan);
  const changed=structuredClone(f.source);changed.spears[0]!.recoverMs=changed.spears[0]!.contactMs;
  assert.equal(SpearSourceSchema.safeParse(changed).success,false);
  changed.spears[0]!.recoverMs=f.source.spears[0]!.recoverMs;changed.props[0]!.gripOffset.x=changed.props[0]!.length/2;
  assert.equal(SpearSourceSchema.safeParse(changed).success,false);
  assert.equal(SpearSourceSchema.safeParse({...f.source,startMs:Number.MAX_SAFE_INTEGER+1}).success,false);
  assert.equal(SpearSourceSchema.safeParse({...f.source,spears:[...f.source.spears,...f.source.spears]}).success,false);
  assert.equal(hash(f),before);
});

test('original source rejects false actor, missing body, local tool replacement and owned-hand commands',()=>{
  const f=fixture('lila');
  assert.throws(()=>validateSpearSourcePlan({...f.plan,sourceSpear:{...f.source,ownerId:'another-person'}}),/owner differs/);
  assert.throws(()=>validateSpearSourcePlan({...f.plan,sourceBody:undefined}),/sourceBody is required/);
  assert.throws(()=>validateSpearSourcePlan({...f.plan,props:f.source.props}),/local props/);
  assert.throws(()=>validateSpearSourcePlan({...f.plan,gestures:[{id:'steal-hand',hand:'left',action:'point',startMs:0,endMs:4000,target:{x:100,y:100}}]}),/owns an original spear hand/);
  assert.ok(fixedMotionFields.includes('sourceSpear'));
});

test('one-hand hold permits free-hand gestures but rejects collisions with companion original manipulation',()=>{
  const f=fixture('karo','spear-hold');f.source.spears[0]!.twoHand=false;
  const free={...f.plan,gestures:[{id:'free-hand',hand:'left' as const,action:'think' as const,startMs:0,endMs:4000}]};validateSpearSourcePlan(free);
  const generic={version:'native-source-manipulation-1' as const,id:'generic-run',startMs:1000,endMs:5000,props:[],gestures:[{id:'operate',hand:'left' as const,elbowPole:'rest' as const,action:'operate' as const,startMs:0,endMs:4000,contactMs:1000,target:{x:200,y:200}}]};
  validateSpearSourcePlan({...f.plan,sourceManipulation:generic});
  assert.throws(()=>validateSpearSourcePlan({...f.plan,sourceManipulation:{...generic,gestures:generic.gestures.map(g=>({...g,hand:'right'}))}}),/owns an original spear hand/);
  assert.throws(()=>validateSpearSourcePlan({...f.plan,sourceManipulation:{...generic,startMs:999}}),/original body clock/);
});

test('collection requires complete identical actor/body/shaft definitions through every camera slice',()=>{
  const f=fixture('karo'),entries=[{ownerId:f.plan.leadCharacterId,startMs:1000,endMs:2700,sourceBody:f.body,sourceSpear:f.source},{ownerId:f.plan.leadCharacterId,startMs:2700,endMs:5000,sourceBody:f.body,sourceSpear:f.source}],before=hash(entries);
  assert.deepEqual(collectViewSourceSpear(entries,1000,5000),f.source);
  assert.throws(()=>collectViewSourceSpear([entries[0]!],1000,5000),/incomplete/);
  assert.throws(()=>collectViewSourceSpear([entries[0]!,{...entries[1]!,sourceSpear:undefined}],1000,5000),/lost/);
  assert.throws(()=>collectViewSourceSpear([entries[0]!,{...entries[1]!,startMs:2701}],1000,5000),/coverage/);
  assert.throws(()=>collectViewSourceSpear([entries[0]!,{...entries[1]!,ownerId:'foreign'}],1000,5000),/owner/);
  const changed=structuredClone(f.source);changed.spears[0]!.aim.x+=1;
  assert.throws(()=>collectViewSourceSpear([entries[0]!,{...entries[1]!,sourceSpear:changed}],1000,5000),/changed between slices/);
  assert.equal(hash(entries),before);
});

test('owned seek preserves fractional original phase and refuses missing, foreign, changed or out-of-window clocks',()=>{
  const f=fixture('lila'),piece=slice(f,700,1800);
  assert.equal(sourceSpearTime(piece.plan,piece.clock,100.25),800.25);
  assert.throws(()=>sourceSpearTime(piece.plan,undefined,0),/explicit owned shot clock/);
  assert.throws(()=>sourceSpearTime(piece.plan,piece.clock,NaN),/outside/);
  assert.throws(()=>sourceSpearTime(piece.plan,piece.clock,-.01),/outside/);
  assert.throws(()=>sourceSpearTime(piece.plan,{...piece.clock,ownerId:'foreign'},0),/actor or exact shot duration/);
  const changed=structuredClone(piece.clock);changed.spearMotion!.props[0]!.length+=1;
  assert.throws(()=>validateViewActingClock(piece.plan,changed),/differs from its complete owned run/);
});

test('full physical adapter retains shaft, both poles, original phases and body without recursion or caller edits',()=>{
  const f=fixture('karo','spear-lunge'),before=hash(f),full=spearSourcePlan(f.plan);
  assert.throws(()=>validateSpearSourcePlan({...f.plan,sourceBody:{...f.body,walks:[{startMs:0,endMs:4000,fromX:100,toX:150}]}}),/fixed entry stance/);
  assert.equal(full.sourceBody,undefined);assert.equal(full.sourceSpear,undefined);assert.equal(full.sourceManipulation,undefined);assert.equal(full.sourceHead,undefined);
  assert.equal(full.durationMs,4000);assert.deepEqual(full.props,f.source.props);assert.deepEqual(full.lunge,f.source.lunge);
  const track=performanceSpears(f.plan)[0]!;assert.equal(track.twoHands,true);assert.equal(track.elbowPoles!.primary,f.source.spears[0]!.elbowPoles.right);
  full.props[0]!.origin.x+=1;assert.equal(hash(f),before);assert.deepEqual(performanceProps(f.plan),f.source.props);
});

test('both actors preserve actual palms, shaft, legs and head through thrust and planted lunge cuts and reverse seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['spear-thrust','spear-lunge'] as const){
    const f=fixture(actor,action),before=hash(f);validatePerformance(f.plan,f.profile);validateViewActingClock(f.plan,f.clock);
    for(const [from,to] of [[0,700],[700,1800],[1800,2800],[2800,4000]]){const piece=slice(f,from!,to!);
      for(const local of [to!-from!,0,(to!-from!)/2,10.25,0]){
        const full=samplePerformance(f.plan,f.profile,from!+local,silence,undefined,f.clock),cut=samplePerformance(piece.plan,f.profile,local,silence,undefined,piece.clock);
        assert.deepEqual(cut.hands,full.hands);assert.deepEqual(cut.wrists,full.wrists);assert.deepEqual(cut.feet,full.feet);assert.deepEqual(cut.props,full.props);
        assert.deepEqual(cut.transforms,full.transforms);assert.deepEqual(cut.paths,full.paths);assert.equal(cut.contactError,full.contactError);
      }
    }assert.equal(hash(f),before);
  }
});

test('compiler bakes original thrust boundaries and records source identity instead of a local reset',()=>{
  const f=fixture('karo'),s=f.source.spears[0]!,from=s.readyMs!-10,to=s.contactMs!+10,piece=slice(f,from,to),before=hash(f);
  const compiled=compilePerformance(piece.plan,f.profile,silence,'',undefined,piece.clock);
  for(const t of [s.readyMs!,s.contactMs!])assert.ok(compiled.frames.some(frame=>frame.timeMs===t-from));
  assert.ok(compiled.frames.every(frame=>frame.props[s.propId]?.attached));
  assert.equal((compiled.report as {sourceSpear:{sourceHash:string}}).sourceSpear.sourceHash,hash(f.source));assert.equal(hash(f),before);
});

test('unbound original spear cannot obtain production entry, exit or ordinary prop approval through either actor role',()=>{
  const f=fixture('karo');
  for(const supporting of [false,true]){
    const shot={id:'pending-tool',cinematic:{performance:supporting?{...f.plan,sourceSpear:undefined}:f.plan,actorScene:{supporting:supporting?[{performance:f.plan}]:[]}}} as unknown as Shot;
    for(const check of [validatePropBindings,modelEntryParts,modelExitParts])assert.throws(()=>check(shot),/needs-source-prop-binding.*rotating entity\/model\/action\/cue/);
  }
});
