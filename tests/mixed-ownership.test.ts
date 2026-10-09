// DECLARED / NOT RUN. Synthetic binding/channel/paint data only; no native
// registration, anatomy, physical contact, renderer or film acceptance implied.
import test from 'node:test';
import assert from 'node:assert/strict';
import type {Shot,Storyboard} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {ownershipBindingPartition} from '../packages/director/ownership-bindings.js';
import {ownershipBindingContext} from '../packages/director/ownership-binding-context.js';
import {mergeModelMotionFrames,type ModelMotionGroup} from '../packages/director/prop-motion.js';
import {ownershipPalmMasks} from '../packages/director/ownership-palm-mask.js';
import {ownershipPhaseAt} from '../packages/director/source-ownership-projection.js';
import type {SourceOwnership} from '../packages/director/source-ownership-schemas.js';
import {OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from '../packages/director/ownership-compile.js';

function partitionFixture():Shot{
  const props=[{id:'basket',origin:{x:100,y:20}},{id:'bowl',origin:{x:400,y:30}}];
  return {id:'mixed',startMs:1000,endMs:1500,cinematic:{leadCharacterId:'lila',
    performance:{props:structuredClone(props),sourceManipulation:{props}},
    actorScene:{primary:{id:'lila'},supporting:[{character:{id:'karo'},performance:{props:[{id:'basket'}],sourceManipulation:{props:[{id:'basket'}]}}}]},
    sourceOwnership:[{id:'shared-basket',partId:'basket-entity',grips:[{id:'giver',actorId:'lila',propId:'basket'},{id:'receiver',actorId:'karo',propId:'basket'}]}],
    propBindings:[{ownerId:'lila',propId:'basket',partId:'basket-entity'},{ownerId:'karo',propId:'basket',partId:'basket-entity'},{ownerId:'lila',propId:'bowl',partId:'bowl-entity'}]}} as unknown as Shot;
}

test('canonical grip aliases and independent source entities partition without choosing the first owner',()=>{
  const shot=partitionFixture(),before=hash(shot),p=ownershipBindingPartition(shot);
  assert.deepEqual(p.canonical.map(b=>[b.ownerId,b.propId,b.partId]),[['lila','basket','basket-entity'],['karo','basket','basket-entity']]);
  assert.deepEqual(p.local.map(b=>[b.ownerId,b.propId,b.partId]),[['lila','bowl','bowl-entity']]);assert.equal(hash(shot),before);
});

test('mixed partition rejects implicit/unsourced owners, stolen aliases and ambiguous independent entities',()=>{
  for(const change of [
    (s:Shot)=>{delete s.cinematic!.propBindings[2]!.ownerId;},
    (s:Shot)=>{delete s.cinematic!.performance.sourceManipulation;},
    (s:Shot)=>{s.cinematic!.propBindings[0]!.partId='other-entity';},
    (s:Shot)=>{s.cinematic!.propBindings[2]!.partId='basket-entity';},
    (s:Shot)=>{s.cinematic!.sourceOwnership![0]!.grips[1]!.actorId='lila';},
    (s:Shot)=>{s.cinematic!.propBindings.pop();},
  ]){const shot=partitionFixture();change(shot);assert.throws(()=>ownershipBindingPartition(shot));}
  const duplicate=partitionFixture();duplicate.cinematic!.performance.sourceManipulation!.props.push({id:'cup',origin:{x:400,y:30}});
  duplicate.cinematic!.propBindings.push({...duplicate.cinematic!.propBindings[2]!,propId:'cup'});
  assert.throws(()=>ownershipBindingPartition(duplicate),/independent entity has multiple owners/);
});

function closureFixture(){
  const shot=(id:string,startMs:number,endMs:number,owners:Array<[string,number,number]>,canonical=false)=>({id,startMs,endMs,cinematic:{performance:{},actorScene:{primary:null,supporting:owners.map(([id,startMs,endMs])=>({character:{id},performance:{sourceManipulation:{startMs,endMs}}}))},
    ...(canonical?{sourceOwnership:[{startMs:0,endMs:2000}]}:{})}} as unknown as Shot);
  const board={shots:[shot('a',0,1000,[],true),shot('b',1000,2000,[['late-b',1000,3000]]),shot('c',2000,3000,[['late-c',2000,4000]]),shot('d',3000,4000,[])]} as Storyboard;
  return {board,shot:board.shots[0]!};
}

test('mixed context follows later owners complete original spans to a finite full camera closure',()=>{
  const f=closureFixture(),before=hash(f);assert.deepEqual(ownershipBindingContext(f.shot,f.board).map(s=>s.id),['a','b','c','d']);assert.equal(hash(f),before);
});

test('mixed context rejects a foreign requested shot, duplicate camera IDs and invalid original clocks',()=>{
  const f=closureFixture(),foreign=structuredClone(f.shot);foreign.endMs--;
  assert.throws(()=>ownershipBindingContext(foreign,f.board),/exact complete storyboard/);
  f.board.shots.push(structuredClone(f.shot));assert.throws(()=>ownershipBindingContext(f.shot,f.board),/unique camera IDs/);
  const bad=closureFixture();bad.board.shots[1]!.cinematic!.actorScene!.supporting[0]!.performance.sourceManipulation!.endMs=NaN;
  assert.throws(()=>ownershipBindingContext(bad.shot,bad.board),/invalid complete original span/);
});

function groups():ModelMotionGroup[]{return [
  {partIds:['basket'],frames:[{timeMs:0,centers:{basket:{x:100,y:20}}},{timeMs:60,centers:{basket:{x:160,y:20}}},{timeMs:100,centers:{basket:{x:200,y:20}}}]},
  {partIds:['bowl'],frames:[{timeMs:0,centers:{bowl:{x:400,y:30}}},{timeMs:25,centers:{bowl:{x:450,y:30}}},{timeMs:100,centers:{bowl:{x:600,y:30}}}]},
];}

test('mixed centers merge on every retained canonical and independent keyframe without changing either source',()=>{
  const input=groups(),before=hash(input),frames=mergeModelMotionFrames(100,input);
  assert.deepEqual(frames.map(f=>f.timeMs),[0,25,60,100]);assert.deepEqual(frames[1]!.centers.basket,{x:125,y:20});assert.deepEqual(frames[2]!.centers.bowl,{x:520,y:30});
  assert.equal(hash(input),before);frames[0]!.centers.basket!.x=999;assert.equal(input[0]!.frames[0]!.centers.basket!.x,100);
});

test('mixed center merge rejects overlapping entities, missing channels and different clocks',()=>{
  const same=groups();same[1]!.partIds=['basket'];assert.throws(()=>mergeModelMotionFrames(100,same),/overwrite a canonical entity/);
  const missing=groups();delete missing[1]!.frames[1]!.centers.bowl;assert.throws(()=>mergeModelMotionFrames(100,missing),/bound canonical entity centers/);
  const clock=groups();clock[1]!.frames.at(-1)!.timeMs--;assert.throws(()=>mergeModelMotionFrames(100,clock),/canonical shot clock/);
  assert.throws(()=>mergeModelMotionFrames(100,[]),/explicit nonempty/);
  assert.throws(()=>mergeModelMotionFrames(100,[{partIds:[],frames:[]}]),/empty entity group/);
});

function maskFixture(){
  const shot=partitionFixture(),ref={kind:'narration' as const,segmentId:'cue',quote:'Lila gives Karo the basket.'};
  const transition=(id:string,timeMs:number,operation:SourceOwnership['transitions'][number]['operation'])=>({id,timeMs,operation,narrationAnchor:'cue',statement:ref.quote,sourceRefs:[ref]});
  const source:SourceOwnership={version:'source-ownership-1',id:'shared-basket',partId:'basket-entity',startMs:1000,endMs:1500,
    grips:[{id:'giver',actorId:'lila',sourceId:'lila-original',gestureId:'offer',propId:'basket',hand:'right',gripOffset:{x:0,y:0}},
      {id:'receiver',actorId:'karo',sourceId:'karo-original',gestureId:'take',propId:'basket',hand:'left',gripOffset:{x:0,y:0}}],
    phases:[{kind:'world',startMs:1000,endMs:1100,center:{x:100,y:20},rotationDeg:0},{kind:'held',startMs:1100,endMs:1200,gripId:'giver'},
      {kind:'shared',startMs:1200,endMs:1300,gripIds:['giver','receiver'],authorityGripId:'giver'},{kind:'held',startMs:1300,endMs:1400,gripId:'receiver'},
      {kind:'world',startMs:1400,endMs:1500,center:{x:100,y:20},rotationDeg:0}],
    transitions:[transition('pickup',1100,'pickup'),transition('join',1200,'join'),transition('transfer',1300,'handoff'),transition('place',1400,'place')]};
  shot.cinematic!.sourceOwnership=[source];
  return {shot,source,compiled:()=>new Map([[source.partId,compiled(shot,source)]])};
}

function compiled(shot:Shot,source:SourceOwnership):CompiledOwnership{
  const times=[...new Set([shot.startMs,shot.endMs,...source.phases.flatMap(p=>[p.startMs,p.endMs]).filter(t=>t>=shot.startMs&&t<=shot.endMs)])].sort((a,b)=>a-b);
  const paint={sourceId:source.id} as CompiledOwnership['paint'];
  return {version:OWNERSHIP_RENDER_VERSION,source,paint,paintHash:hash(paint),shotHash:hash(shot),sourceHash:'synthetic-not-a-canonical-board-binding',motionVerified:false,productionApproval:false,
    aliases:source.grips.map(g=>{const prefix=g.actorId==='lila'?'':`actor-${g.actorId}-`;return {actorId:g.actorId,propId:g.propId,hand:g.hand,svgId:`${prefix}prop-${g.propId}`,handSvgId:`${prefix}hand-${g.hand}`,slotSvgId:`${prefix}hand-${g.hand}-prop-slot`};}),
    bake:{version:'ownership-bake-1',startMs:shot.startMs,endMs:shot.endMs,gapLimitPx:.2,maxMeasuredGapPx:0,motionVerified:false,productionApproval:false,samples:times.map(timeMs=>{
      const phase=ownershipPhaseAt(source,timeMs);return {timeMs,center:{x:100,y:20},palms:Object.fromEntries(source.grips.map(g=>[g.id,{x:100,y:20}])),activeGripIds:phase.kind==='world'?[]:phase.kind==='held'?[phase.gripId]:phase.gripIds,
        ...(phase.kind==='world'?{}:{authorityGripId:phase.kind==='held'?phase.gripId:phase.authorityGripId})};
    })}};
}

test('canonical palm masks hide only original active grip intervals and restore independent prop painters after release',()=>{
  const f=maskFixture(),masks=ownershipPalmMasks(f.shot,f.compiled());
  assert.deepEqual(masks.find(m=>m.slotId==='hand-right-prop-slot')!.states,[{timeMs:1000,opacity:1},{timeMs:1100,opacity:0},{timeMs:1300,opacity:1}]);
  assert.deepEqual(masks.find(m=>m.slotId==='actor-karo-hand-left-prop-slot')!.states,[{timeMs:1000,opacity:1},{timeMs:1200,opacity:0},{timeMs:1400,opacity:1}]);
});

test('one hand mask aggregates successive canonical entities without last-writer unmasking at a shared boundary',()=>{
  const f=maskFixture(),other:SourceOwnership={...structuredClone(f.source),id:'other',partId:'cup-entity',grips:[{...f.source.grips[0]!,id:'cup-grip',propId:'cup',gestureId:'cup-carry'}],
    phases:[{kind:'world',startMs:1000,endMs:1300,center:{x:100,y:20},rotationDeg:0},{kind:'held',startMs:1300,endMs:1500,gripId:'cup-grip'}],
    transitions:[{...f.source.transitions[0]!,id:'cup-pickup',timeMs:1300}]};
  f.shot.cinematic!.sourceOwnership!.push(other);f.shot.cinematic!.performance.sourceManipulation!.props.push({id:'cup',origin:{x:100,y:20}});
  f.shot.cinematic!.propBindings.push({ownerId:'lila',propId:'cup',partId:'cup-entity',role:'illustrative-model',sourceRefs:[]});
  const map=new Map([[f.source.partId,compiled(f.shot,f.source)],[other.partId,compiled(f.shot,other)]]),mask=ownershipPalmMasks(f.shot,map).find(m=>m.slotId==='hand-right-prop-slot')!;
  assert.deepEqual(mask.states,[{timeMs:1000,opacity:1},{timeMs:1100,opacity:0}]);
});

test('camera cuts retain original mask occupancy and reject another persons painter alias',()=>{
  const f=maskFixture();f.shot.startMs=1250;f.shot.endMs=1350;
  const map=f.compiled(),masks=ownershipPalmMasks(f.shot,map);
  assert.deepEqual(masks.find(m=>m.slotId==='hand-right-prop-slot')!.states,[{timeMs:1250,opacity:0},{timeMs:1300,opacity:1}]);
  map.get(f.source.partId)!.aliases[0]!.slotSvgId='actor-karo-hand-left-prop-slot';
  assert.throws(()=>ownershipPalmMasks(f.shot,map),/own original person hand/);
});
