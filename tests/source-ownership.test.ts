// DECLARED ONLY, NOT RUN. The human test model owns runtime and film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
import {SourceOwnershipSchema,type SourceOwnership} from '../packages/director/source-ownership-schemas.js';
import {ownershipPhaseAt,projectOwnershipPhases} from '../packages/director/source-ownership-projection.js';
import {sourcePropBindingIdentity} from '../packages/director/source-prop-identity.js';
import {validatePropBindings} from '../packages/director/props.js';

// Pure data is created only inside callbacks. No actor builder, compiler,
// geometry sampler, renderer, provider, audio or video runs at module import.
function fixture():SourceOwnership {
  const text='Mina offers the basket to Orin, who takes it and sets it down.';
  const boundary=(id:string,timeMs:number,operation:SourceOwnership['transitions'][number]['operation'])=>({id,timeMs,operation,narrationAnchor:'cue',statement:text,sourceRefs:[{kind:'narration' as const,segmentId:'cue',quote:text}]});
  return {version:'source-ownership-1',id:'basket-ownership',partId:'basket',startMs:1000,endMs:6000,
    grips:[{id:'giver',actorId:'mina',sourceId:'mina-original',gestureId:'offer',propId:'mina-basket-grip',hand:'right',gripOffset:{x:-18,y:0}},
      {id:'receiver',actorId:'orin',sourceId:'orin-original',gestureId:'receive',propId:'orin-basket-grip',hand:'left',gripOffset:{x:18,y:0}}],
    phases:[{kind:'world',startMs:1000,endMs:1600,center:{x:500,y:430},rotationDeg:0},
      {kind:'held',startMs:1600,endMs:2500,gripId:'giver'},
      {kind:'shared',startMs:2500,endMs:3200,gripIds:['giver','receiver'],authorityGripId:'giver'},
      {kind:'shared',startMs:3200,endMs:3500,gripIds:['giver','receiver'],authorityGripId:'receiver'},
      {kind:'held',startMs:3500,endMs:4700,gripId:'receiver'},
      {kind:'world',startMs:4700,endMs:6000,center:{x:720,y:470},rotationDeg:0}],
    transitions:[boundary('pickup',1600,'pickup'),boundary('join',2500,'join'),boundary('transfer',3200,'handoff'),boundary('release',3500,'release'),boundary('place',4700,'place')]};
}

test('canonical handoff requires actual shared overlap and explicit world authority',()=>{
  const source=fixture();assert.deepEqual(SourceOwnershipSchema.parse(source),source);
  assert.equal(source.grips[0]!.actorId,'mina');assert.equal(source.grips[1]!.actorId,'orin');
  assert.equal('productionApproval' in source,false);
});

test('half-open seeks and terminal/reverse queries retain original phase',()=>{
  const source=fixture();
  for(const [time,index] of [[1000,0],[1599.75,0],[1600,1],[2500,2],[3200,3],[3500,4],[4700,5],[6000,5],[2500,2],[1000,0]])
    assert.deepEqual(ownershipPhaseAt(source,time!),source.phases[index!]);
  for(const time of [999,6001,NaN,Infinity])assert.throws(()=>ownershipPhaseAt(source,time));
});

test('camera intersection retains global phase and does not restart shared contact',()=>{
  const source=fixture(),windows=projectOwnershipPhases(source,2800,3400);
  assert.deepEqual(windows.map(w=>[w.phaseIndex,w.startMs,w.endMs,w.authorityGripId]),[[2,2800,3200,'giver'],[3,3200,3400,'receiver']]);
  assert.deepEqual(windows[0]!.phase,source.phases[2]);
  assert.equal(windows[0]!.sourceStartMs,1000);assert.equal(windows[0]!.sourceEndMs,6000);
  assert.equal('contactMs' in windows[0]!,false);
  for(const [start,end] of [[999,3400],[1000,6001],[3200,3200],[3400,3200],[NaN,3400]])assert.throws(()=>projectOwnershipPhases(source,start!,end!));
});

test('gaps, overlaps, zero spans and nonfinite world anchors cannot be filled implicitly',()=>{
  for(const mutate of [
    (s:SourceOwnership)=>{s.phases[2]!.startMs++;},
    (s:SourceOwnership)=>{s.phases[2]!.startMs--;},
    (s:SourceOwnership)=>{s.phases[2]!.endMs=s.phases[2]!.startMs;},
    (s:SourceOwnership)=>{s.phases.at(-1)!.endMs--;},
    (s:SourceOwnership)=>{if(s.phases[0]!.kind==='world')s.phases[0]!.center.x=Infinity;},
  ]){const source=fixture();mutate(source);assert.equal(SourceOwnershipSchema.safeParse(source).success,false);}
});

test('an exclusive-owner swap or world/shared shortcut is not a handoff',()=>{
  const swap=fixture();swap.phases.splice(2,2,{kind:'held',startMs:2500,endMs:3500,gripId:'receiver'});swap.transitions.splice(2,2);swap.transitions[1]!.operation='handoff';
  assert.equal(SourceOwnershipSchema.safeParse(swap).success,false);
  const shortcut=fixture();shortcut.phases.splice(1,1);shortcut.phases[0]!.endMs=2500;shortcut.transitions.splice(0,1);
  assert.equal(SourceOwnershipSchema.safeParse(shortcut).success,false);
});

test('shared contact cannot infer authority or duplicate one person',()=>{
  const authority=fixture();if(authority.phases[2]!.kind==='shared')authority.phases[2]!.authorityGripId='missing';
  assert.equal(SourceOwnershipSchema.safeParse(authority).success,false);
  const person=fixture();person.grips[1]!.actorId=person.grips[0]!.actorId;
  assert.equal(SourceOwnershipSchema.safeParse(person).success,false);
  const same=fixture();if(same.phases[2]!.kind==='shared')same.phases[2]!.gripIds=['giver','giver'];
  assert.equal(SourceOwnershipSchema.safeParse(same).success,false);
});

test('physical aliases cannot duplicate, remain unused or reacquire after release',()=>{
  const duplicate=fixture();duplicate.grips[1]!.actorId=duplicate.grips[0]!.actorId;duplicate.grips[1]!.propId=duplicate.grips[0]!.propId;
  assert.equal(SourceOwnershipSchema.safeParse(duplicate).success,false);
  const unused=fixture();unused.grips.push({...unused.grips[0]!,id:'unused',propId:'unused-prop'});
  assert.equal(SourceOwnershipSchema.safeParse(unused).success,false);
  const reacquire=fixture();reacquire.grips=[reacquire.grips[0]!];
  reacquire.phases=[reacquire.phases[0]!,reacquire.phases[1]!,{kind:'world',startMs:2500,endMs:3500,center:{x:510,y:430},rotationDeg:0},
    {kind:'held',startMs:3500,endMs:4700,gripId:'giver'},reacquire.phases[5]!];
  reacquire.transitions=[reacquire.transitions[0]!,{...reacquire.transitions[1]!,operation:'place'},
    {...reacquire.transitions[3]!,operation:'pickup'},reacquire.transitions[4]!];
  assert.equal(SourceOwnershipSchema.safeParse(reacquire).success,false);
});

test('boundaries retain exact clock, operation and narration evidence',()=>{
  for(const mutate of [
    (s:SourceOwnership)=>{s.transitions[2]!.timeMs++;},
    (s:SourceOwnership)=>{s.transitions[2]!.operation='pickup';},
    (s:SourceOwnership)=>{s.transitions[2]!.sourceRefs=[];},
    (s:SourceOwnership)=>{s.transitions[2]!.narrationAnchor=' ';},
    (s:SourceOwnership)=>{s.transitions.pop();},
  ]){const source=fixture();mutate(source);assert.equal(SourceOwnershipSchema.safeParse(source).success,false);}
});

test('ownership edits in another camera slice invalidate structural source identity',()=>{
  // Minimal raw hash data, intentionally not a production storyboard fixture.
  const source=fixture(),shot={id:'one',startMs:1000,endMs:3200,cinematic:{sourceOwnership:[source]}} as unknown as Shot;
  const next={id:'two',startMs:3200,endMs:6000,cinematic:{sourceOwnership:[structuredClone(source)]}} as unknown as Shot;
  const board={shots:[shot,next]} as unknown as Storyboard,narration={segments:[]} as unknown as Narration;
  const before=sourcePropBindingIdentity(shot,board,narration)!;
  next.cinematic!.sourceOwnership![0]!.grips[1]!.hand='right';
  assert.notEqual(sourcePropBindingIdentity(shot,board,narration)!.fingerprint,before.fingerprint);
  assert.equal(before.approved,false);assert.equal(before.motionVerified,false);
});

test('production path cannot silently ignore candidate ownership without canonical context',()=>{
  const shot={id:'candidate',cinematic:{sourceOwnership:[fixture()]}} as unknown as Shot;
  assert.throws(()=>validatePropBindings(shot),/needs-source-prop-binding.*complete storyboard and original narration/);
});
