// DECLARED ONLY, NOT RUN. User's model owns runtime and full story acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostActionSchema,ManipulationActionRefSchema} from '../packages/host/schemas.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../packages/animation/native-contact-arm.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {projectManipulationAction,validateManipulationActionSlices} from '../packages/director/source-manipulation-actions.js';
import {validatePropBindings} from '../packages/director/props.js';
import type {Shot} from '../packages/core/schemas.js';
function fixture(hand:'left'|'right'='left'){
  const f=bodyCalibrationPlan('karo','carry','happy',hand,'three-quarter-left','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION,'rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);
  const source={version:MANIPULATION_SOURCE_VERSION,id:'authentic-contact',startMs:1000,endMs:5000,props:structuredClone(f.plan.props),gestures:structuredClone(f.plan.gestures)};
  const body={version:BODY_SOURCE_VERSION,id:'authentic-body',startMs:1000,endMs:5000,walks:structuredClone(f.plan.walks),jumps:structuredClone(f.plan.jumps??[])};
  const plan:PerformancePlan={...f.plan,expressions:[],gazes:[],walks:[],jumps:[],gestures:[],props:[],sourceBody:body,sourceManipulation:source};
  return {plan,source,g:source.gestures[0]!};
}
const target={modelId:'scene-model',partId:'food-basket',anchor:'center' as const};
test('original source/gesture reference requires explicit hand, original operation and sourced cue/model center',()=>{
  const f=fixture(),action=projectManipulationAction(f.plan,f.g.id,{shotStartMs:1000,target,narrationAnchor:'cue-a'});
  assert.equal(action.hand,'left');assert.deepEqual(action.sourceManipulation,{sourceId:f.source.id,gestureId:f.g.id});
  assert.equal(ManipulationActionRefSchema.safeParse({...action.sourceManipulation,ownerId:'foreign'}).success,false);
  for(const patch of [{hand:undefined},{narrationAnchor:undefined},{target:undefined},{type:'point'},{secondTarget:target},{target:{...target,anchor:'label'}}])assert.equal(HostActionSchema.safeParse({...action,...patch}).success,false);
  validateManipulationActionSlices(f.plan,[action],1000);
});
test('cuts before, at and after real contact retain original action time without a new contact at the later shot start',()=>{
  const f=fixture(),before=hash(f),contact=1000+f.g.contactMs!,cuts=[1000,contact,contact+1,5000];
  for(let i=0;i<cuts.length-1;i++){
    const start=cuts[i]!,end=cuts[i+1]!,plan={...f.plan,durationMs:end-start};
    const action=projectManipulationAction(plan,f.g.id,{shotStartMs:start,target,narrationAnchor:'cue-'+i});
    assert.equal(action.contactMs,i===1?contact:undefined);validateManipulationActionSlices(plan,[action],start);
    if(i===2)assert.throws(()=>validateManipulationActionSlices(plan,[{...action,contactMs:start}],start),/changed or restarted/);
  }assert.equal(hash(f),before);
});
test('missing, duplicated, foreign or shortened references and another action on the same hand cannot replace the original slice',()=>{
  const f=fixture(),action=projectManipulationAction(f.plan,f.g.id,{shotStartMs:1000,target,narrationAnchor:'cue-a'});
  assert.throws(()=>validateManipulationActionSlices(f.plan,[],1000),/exactly one/);
  assert.throws(()=>validateManipulationActionSlices(f.plan,[action,action],1000),/exactly one/);
  for(const patch of [{hand:'right' as const},{endMs:action.endMs-1},{sourceManipulation:{sourceId:'foreign',gestureId:f.g.id}},{sourceManipulation:{sourceId:f.source.id,gestureId:'foreign'}}])assert.throws(()=>validateManipulationActionSlices(f.plan,[{...action,...patch}],1000),/changed or restarted/);
  const point={type:'point' as const,startMs:action.startMs,endMs:action.endMs,hand:'left' as const,target,narrationAnchor:'cue-a'};
  assert.throws(()=>validateManipulationActionSlices(f.plan,[action,point],1000),/another shot-local action/);
  validateManipulationActionSlices(f.plan,[action,{...point,hand:'right'}],1000);
});
test('source reference and schema/projection never open the missing world/model/continuity production binding',()=>{
  const f=fixture(),action=projectManipulationAction(f.plan,f.g.id,{shotStartMs:1000,target,narrationAnchor:'cue-a'});
  assert.throws(()=>validateManipulationActionSlices({...f.plan,sourceManipulation:undefined},[action],1000),/no original/);
  assert.throws(()=>projectManipulationAction(f.plan,f.g.id,{shotStartMs:999,target,narrationAnchor:'cue-a'}),/outside/);
  assert.throws(()=>projectManipulationAction(f.plan,'unknown',{shotStartMs:1000,target,narrationAnchor:'cue-a'}),/missing original/);
  const isolated={id:'source-world-gate',host:{actions:[action]},cinematic:{performance:f.plan,actorScene:{supporting:[]}}} as unknown as Shot;
  assert.throws(()=>validatePropBindings(isolated),/needs-source-prop-binding/);
});
test('legacy unspecified non-idle owns right, unbound idle owns both, and adjacent half-open actions do not conflict',()=>{
  const f=fixture('right'),action=projectManipulationAction(f.plan,f.g.id,{shotStartMs:1000,target,narrationAnchor:'cue-a'});
  const point={type:'point' as const,startMs:action.startMs,endMs:action.endMs,target,narrationAnchor:'cue-a'};
  assert.throws(()=>validateManipulationActionSlices(f.plan,[action,point],1000),/another shot-local action/);
  assert.throws(()=>validateManipulationActionSlices(f.plan,[action,{type:'idle',startMs:action.startMs,endMs:action.endMs}],1000),/another shot-local action/);
  validateManipulationActionSlices(f.plan,[action,{...point,hand:'left'}],1000);
  validateManipulationActionSlices(f.plan,[action,{...point,startMs:action.endMs,endMs:action.endMs+1}],1000);
});
