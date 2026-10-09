// DECLARED ONLY, NOT RUN. Runtime/geometry/renderer/video belong to the human tester.
import test from 'node:test';
import assert from 'node:assert/strict';
import type {Shot} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import type {SourceOwnership} from '../packages/director/source-ownership-schemas.js';
import {ownershipPhaseAt} from '../packages/director/source-ownership-projection.js';
import {bakeOwnership,type OwnershipBakeSample} from '../packages/director/ownership-bake.js';
import {OwnershipPaintSchema} from '../packages/director/ownership-paint-schemas.js';
import {ownershipEntityId,ownershipPalmId,ownershipGlyph} from '../packages/director/ownership-reference.js';
import {suppressOwnershipCopies,ownershipRelationFrames,type OwnershipLayer} from '../library/shots/ownership-layer.js';
import {OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from '../packages/director/ownership-compile.js';

// Synthetic geometry exercises serializer/interpolation invariants only. This
// is not a native actor, physics fixture, production scene or approved artwork.
function source():SourceOwnership {return {version:'source-ownership-1',id:'original',partId:'basket',startMs:1000,endMs:1300,
  grips:[{id:'grip',actorId:'person',sourceId:'body',gestureId:'carry',propId:'basket-grip',hand:'left',gripOffset:{x:0,y:0}}],
  phases:[{kind:'held',startMs:1000,endMs:1300,gripId:'grip'}],transitions:[]};}
function resolver(original:SourceOwnership,point:(time:number)=>{x:number;y:number}){
  return (timeMs:number):OwnershipBakeSample=>{
    const phase=ownershipPhaseAt(original,timeMs),active=phase.kind==='world'?[]:phase.kind==='held'?[phase.gripId]:phase.gripIds;
    return {timeMs,center:point(timeMs),palms:Object.fromEntries(original.grips.map(g=>[g.id,point(timeMs)])),activeGripIds:active,
      ...(phase.kind==='world'?{}:{authorityGripId:phase.kind==='held'?phase.gripId:phase.authorityGripId})};
  };
}

test('common fps grid stays anchored to original source across a camera cut',()=>{
  const original=source(),resolve=resolver(original,t=>({x:t-1000,y:20}));
  const baked=bakeOwnership(original,1073,1197,60,[1000,1150,1300],resolve);
  assert.deepEqual(baked.samples.map(s=>s.timeMs),[1073,1000+5*1000/60,1100,1000+7*1000/60,1000+8*1000/60,1150,1000+10*1000/60,1000+11*1000/60,1197]);
  assert.equal(baked.motionVerified,false);assert.equal(baked.productionApproval,false);assert.ok(baked.maxMeasuredGapPx<1e-9);
});

test('nonlinear center and palms are refined against actual callback samples',()=>{
  const original=source(),calls:number[]=[],raw=resolver(original,t=>({x:25,y:((t-1000)/100)**2*100}));
  const baked=bakeOwnership(original,1000,1300,1,[],t=>{calls.push(t);return raw(t);});
  assert.ok(baked.samples.length>2);assert.ok(baked.maxMeasuredGapPx<=.2);assert.equal(new Set(calls).size,calls.length);
  for(const sample of baked.samples)assert.equal(sample.center.y,((sample.timeMs-1000)/100)**2*100);
});

test('resolver cannot shift time, drop palms, invent authority or insert nonfinite coordinates',()=>{
  for(const change of [
    (s:OwnershipBakeSample)=>{s.timeMs++;},
    (s:OwnershipBakeSample)=>{s.palms={};},
    (s:OwnershipBakeSample)=>{s.authorityGripId='other';},
    (s:OwnershipBakeSample)=>{s.activeGripIds=['grip','grip'];},
    (s:OwnershipBakeSample)=>{s.center.x=Infinity;},
  ]){const original=source(),raw=resolver(original,t=>({x:t,y:0}));assert.throws(()=>bakeOwnership(original,1000,1300,60,[],t=>{const value=raw(t);change(value);return value;}),/needs-source-prop-binding/);}
});

test('accessor palm properties are rejected without invoking the accessor',()=>{
  const original=source(),raw=resolver(original,t=>({x:t,y:0}));let getters=0;
  assert.throws(()=>bakeOwnership(original,1000,1300,60,[],t=>{
    const value=raw(t);Object.defineProperty(value.palms,'grip',{enumerable:true,get(){getters++;return {x:0,y:0};}});return value;
  }),/own enumerable data property/);
  assert.equal(getters,0);
});

test('invalid breakpoints are rejected before filtering or asking the resolver',()=>{
  let calls=0;const original=source(),raw=resolver(original,t=>({x:t,y:0}));
  assert.throws(()=>bakeOwnership(original,1100,1200,60,[999],t=>{calls++;return raw(t);}));
  assert.equal(calls,0);
  assert.throws(()=>bakeOwnership(original,1100,1200,121,[],raw));
});

test('a discontinuous center cannot be smoothed into an accepted bake',()=>{
  const original=source(),raw=resolver(original,t=>({x:t<1150?0:100,y:0}));
  assert.throws(()=>bakeOwnership(original,1000,1300,1,[],raw),/needs-source-prop-binding/);
});

test('depth and authored viewport grip must be supplied explicitly',()=>{
  const ref={kind:'narration',segmentId:'cue',quote:'The two people hold the basket.'};
  const paint={version:'ownership-paint-1',sourceId:'original',entityPlane:'in-front-of-actors',grips:[{gripId:'grip',depth:'after-entity',anchor:{x:.5,y:.5}}],sourceRefs:[ref]};
  assert.deepEqual(OwnershipPaintSchema.parse(paint),paint);
  assert.equal(OwnershipPaintSchema.safeParse({...paint,grips:[{gripId:'grip'}]}).success,false);
  assert.equal(OwnershipPaintSchema.safeParse({...paint,grips:[{...paint.grips[0],anchor:{x:2,y:.5}}]}).success,false);
});

test('painter tuple namespaces and entity lookup stay unambiguous',()=>{
  assert.notEqual(ownershipPalmId('a-b','c'),ownershipPalmId('a','b-c'));
  const shot={id:'one',cinematic:{sourceOwnership:[source()]}} as unknown as Shot;
  assert.equal(ownershipGlyph(shot,'basket'),ownershipEntityId('original'));assert.equal(ownershipGlyph(shot,'absent'),undefined);
  shot.cinematic!.sourceOwnership!.push(source());assert.throws(()=>ownershipGlyph(shot,'basket'));
});

test('only generated alias paint is suppressed; original hand and free slots remain',()=>{
  const shot={id:'one'} as Shot,layer:OwnershipLayer={beforeActors:'',afterActors:'',calls:[],entities:[],aliasIds:['prop-grip'],slotIds:['hand-left-prop-slot'],motionVerified:false,productionApproval:false};
  const html='<defs><g id="hand-left"><path d="M0 0H1"/></g></defs><g id="hand-left-back-slot"><use href="#hand-left"/></g><g id="prop-grip"><rect width="24" height="22"/></g><g id="hand-left-prop-slot" opacity="0"><use href="#hand-left"/></g>';
  const result=suppressOwnershipCopies(shot,html,layer);
  assert.ok(result.includes('<g id="hand-left"><path'));assert.ok(result.includes('id="hand-left-back-slot"><use'));
  assert.equal(result.includes('<rect'),false);assert.equal((result.match(/data-canonical-empty-alias/g)??[]).length,2);
  assert.throws(()=>suppressOwnershipCopies(shot,html+html,layer));
  assert.throws(()=>suppressOwnershipCopies(shot,html.replace('<rect width="24" height="22"/>','<g><rect/></g>'),layer));
});

test('relations use one canonical entity channel independent of repeated local grip names',()=>{
  const original=source(),bake=bakeOwnership(original,1000,1300,60,[],resolver(original,t=>({x:t,y:30}))),shot={id:'one',startMs:1000,endMs:1300,cinematic:{sourceOwnership:[original]}} as unknown as Shot;
  const item={version:OWNERSHIP_RENDER_VERSION,source:original,bake,paint:{sourceId:original.id},shotHash:hash(shot),motionVerified:false,productionApproval:false,aliases:[{actorId:'person-a',propId:'shared-name'},{actorId:'person-b',propId:'shared-name'}]} as unknown as CompiledOwnership;
  const frames=ownershipRelationFrames(shot,new Map([['basket',item]]));
  assert.equal(frames[0]!.timeMs,0);assert.equal(frames.at(-1)!.timeMs,300);
  for(const frame of frames)assert.deepEqual(Object.keys(frame.centers),['basket']);
  assert.equal(hash(frames[0]!.centers.basket),hash({x:1000,y:30}));
});
