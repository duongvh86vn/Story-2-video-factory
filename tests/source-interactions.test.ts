// DECLARED ONLY, NOT RUN. Human's model owns runtime/geometry/film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import type {Beat} from '../packages/core/schemas.js';
import {cinematicActionGroups} from '../packages/director/actions.js';
import {sourceInteractionDescriptor,sourceInteractionGeometry,validateSourceInteractionGeometry,interactionPreviewTimes} from '../packages/director/source-interactions.js';
import {sourceBoundPropFrame} from '../packages/director/source-prop-binding.js';
import {hasSourceManipulationActing,validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {validatePropBindings} from '../packages/director/props.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {sourceInteractionFixture as fixture} from './fixtures/source-interaction-fixture.js';

function owners(f:ReturnType<typeof fixture>,index:number){
  const shot=f.board.shots[index]!,scene=shot.cinematic!.actorScene!;
  return [{id:scene.primary!.id,plan:shot.cinematic!.performance,actions:shot.host!.actions},...scene.supporting.map(a=>({id:a.character.id,plan:a.performance,actions:a.actions}))];
}
function records(f:ReturnType<typeof fixture>,index:number){
  const shot=f.board.shots[index]!;
  return owners(f,index).flatMap(o=>o.actions.map(a=>sourceInteractionGeometry(shot,o.id,a,f.board,f.narration)));
}

test('source action groups keep original gestures/contact and exact local references through two-person lead swaps',()=>{
  const f=fixture(),before=hash(f);
  for(let i=0;i<3;i++)for(const o of owners(f,i)){
    const shot=f.board.shots[i]!,groups=cinematicActionGroups(o.actions,o.plan,shot.startMs),source=o.plan.sourceManipulation!;
    assert.equal(groups.length,1);assert.equal(o.plan.gestures.length,0);
    assert.deepEqual(groups[0]!.gestures,[source.gestures[0]]);
    assert.equal(groups[0]!.sourceManipulation!.contactMs,source.startMs+source.gestures[0]!.contactMs!);
    if(i)assert.equal(groups[0]!.action.contactMs,undefined);
  }
  assert.equal(hash(f),before);
});

test('descriptor binds actual story person/entity/cue and inherited phase without manufacturing a cut contact',()=>{
  const f=fixture(),before=hash(f);
  for(let i=0;i<3;i++)for(const o of owners(f,i)){
    const d=sourceInteractionDescriptor(f.board.shots[i]!,o.id,o.actions[0]!,f.board,f.narration);
    assert.equal(d.actorId,o.id);assert.equal(d.propId,o.plan.sourceManipulation!.props[0]!.id);assert.equal(d.narrationAnchor,'cue');
    assert.equal(d.inheritedContact,d.contactMs<d.sliceStartMs);
    if(i===1){assert.equal(d.entryPhase,'held');assert.ok(d.contactMs<f.board.shots[i]!.startMs);}
  }
  assert.equal(hash(f),before);
});

test('interaction report samples actual original contact and current physical prop center for both people',()=>{
  const f=fixture(),before=hash(f);
  for(let i=0;i<3;i++){
    const shot=f.board.shots[i]!,geometry=records(f,i);validateSourceInteractionGeometry(shot,f.board,f.narration,geometry);
    for(const report of geometry){
      const r=report.sourceManipulation!,binding=shot.cinematic!.propBindings.find(b=>b.ownerId===report.actorId)!;
      const frame=sourceBoundPropFrame(shot,binding,r.sampleMs-shot.startMs,f.board);
      assert.deepEqual(r.modelCenter,frame.state.point);assert.ok(r.originalContact.errorPx<=1);assert.ok(r.originalContact.constraintErrorPx<=1);
      assert.equal(r.originalContact.sampleMs,r.contactMs);assert.equal(r.contactVerified,false);assert.equal(r.motionVerified,false);
      if(r.inheritedContact)assert.equal(report.contactMs,undefined);
    }
  }
  assert.equal(hash(f),before);
});

test('released drop uses the real flight center while keeping original contact evidence, never forcing hand contact after release',()=>{
  const f=fixture(true),i=2,shot=f.board.shots[i]!,geometry=records(f,i),karo=geometry.find(r=>r.actorId==='karo-person')!,source=karo.sourceManipulation!;
  validateSourceInteractionGeometry(shot,f.board,f.narration,geometry);
  assert.equal(source.phase,'released');assert.ok(source.releaseMs!<source.sampleMs);assert.equal(karo.contactMs,undefined);
  const physical=sourceBoundPropFrame(shot,shot.cinematic!.propBindings.find(b=>b.ownerId==='karo-person')!,0,f.board);
  assert.deepEqual(source.modelCenter,physical.state.point);assert.notDeepEqual(source.modelCenter,physical.owner.prop.destination);
});

test('missing/duplicated/tampered source geometry or a forged inherited-contact exemption is rejected by canonical recomputation',()=>{
  const f=fixture(),shot=f.board.shots[1]!,valid=records(f,1);
  for(const mutate of [
    (a:typeof valid)=>{a.pop();},(a:typeof valid)=>{a.push(structuredClone(a[0]!));},
    (a:typeof valid)=>{a[0]!.sourceManipulation!.originalContact.errorPx+=9;},
    (a:typeof valid)=>{a[0]!.sourceManipulation!.sourceId='foreign';},
    (a:typeof valid)=>{a[0]!.contactMs=shot.startMs;},
    (a:typeof valid)=>{a[0]!.target.x+=5;}
  ]){const changed=structuredClone(valid);mutate(changed);assert.throws(()=>validateSourceInteractionGeometry(shot,f.board,f.narration,changed),/canonical original/);}
  const unrelated=structuredClone(shot);unrelated.host!.actions=[];unrelated.cinematic!.actorScene!.supporting.forEach(a=>a.actions=[]);
  assert.throws(()=>validateSourceInteractionGeometry(unrelated,{shots:[unrelated]},f.narration,valid));
});

test('real before/contact/after evidence belongs to actual camera slices even when the contact is exactly at a cut',()=>{
  const first=fixture(),g=first.full[0]!.sourceManipulation.gestures[0]!,contact=1000+g.contactMs!,f=fixture(false,[1000,contact,contact+1,5000]),all:number[]=[];
  for(let i=0;i<3;i++){
    const shot=f.board.shots[i]!,times=interactionPreviewTimes(shot,records(f,i),17);
    assert.ok(times.every(t=>t>=shot.startMs&&t<shot.endMs));all.push(...times);
  }
  for(const at of [contact-17,contact,contact+17])assert.ok(all.includes(at));
  assert.equal(owners(f,1)[0]!.actions[0]!.contactMs,contact);
  assert.equal(owners(f,2)[0]!.actions[0]!.contactMs,undefined);
});

test('acting coverage accepts sourced inherited carry/drop in a later beat and rejects changed obligations',()=>{
  for(const drop of [false,true]){
    const f=fixture(drop),shot=f.board.shots[drop?2:1]!,intent=shot.cinematic!.sceneIntent!,beat={id:'beat',startMs:shot.startMs,endMs:shot.endMs,sceneIntent:intent} as Beat;
    validateStoryActingCoverage(f.board,[beat],f.narration);
    for(const expected of intent.acting!){
      const o=owners(f,drop?2:1).find(o=>o.id===expected.participantId)!;
      assert.equal(hasSourceManipulationActing(expected,o.actions,shot,beat,f.narration,f.board),true);
      assert.equal(hasSourceManipulationActing({...expected,targetIds:['foreign']},o.actions,shot,beat,f.narration,f.board),false);
      assert.equal(hasSourceManipulationActing({...expected,statement:'An unrelated complete sentence.'},o.actions,shot,beat,f.narration,f.board),false);
    }
  }
});

test('complete source context and narration remain required; source candidates retain production/art gates and legacy local groups',()=>{
  const f=fixture(),shot=f.board.shots[1]!,o=owners(f,1)[0]!,before=hash(f.narration);
  assert.throws(()=>sourceInteractionDescriptor(shot,o.id,o.actions[0]!,undefined,f.narration),/authoritative complete/);
  assert.throws(()=>sourceInteractionDescriptor(shot,'foreign',o.actions[0]!,f.board,f.narration),/visible person/);
  const changed=structuredClone(f.board);changed.shots[2]!.cinematic!.artDirection!.models[0]!.svg='<circle r="8"/>';
  const publication=rigSpeechPublicationBinding(shot,f.narration,f.board);assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,changed,publication));
  assert.throws(()=>validatePropBindings(shot,f.board,f.narration),/needs-source-prop-binding/);assert.equal(hash(f.narration),before);
  const local={...o.plan,sourceBody:undefined,sourceManipulation:undefined,durationMs:1000,gestures:[{id:'local-point',action:'point' as const,startMs:0,endMs:1000,hand:'right' as const,target:{x:300,y:150}}]};
  const groups=cinematicActionGroups([{type:'point',startMs:1000,endMs:2000,hand:'right',target:{modelId:'local-model',partId:'local-part',anchor:'center'}}],local,1000);
  assert.equal(groups.length,1);assert.equal(groups[0]!.sourceManipulation,undefined);assert.equal(groups[0]!.gestures[0]!.id,'local-point');
});
