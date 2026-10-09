// DECLARED ONLY / NOT RUN. Synthetic records prove no physical or film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {ownershipPhaseAt} from '../packages/director/source-ownership-projection.js';
import type {SourceOwnership} from '../packages/director/source-ownership-schemas.js';
import {OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from '../packages/director/ownership-compile.js';
import {ownershipBakeAt,ownershipBakeCenterBounds,ownershipBakeSnapshot} from '../packages/director/ownership-bake-query.js';
import {renderOwnershipLayer,ownershipRelationFrames} from '../library/shots/ownership-layer.js';
import {ownershipScene} from '../packages/director/ownership-scene.js';
import {modelEntryParts,modelExitParts} from '../packages/director/props.js';
import {interactionPreviewTimes,type SourceInteractionRecord} from '../packages/director/source-interactions.js';

function fixture(){
  const ref={kind:'narration' as const,segmentId:'cue',quote:'Mina gives Orin the basket.'};
  const transition=(id:string,timeMs:number,operation:SourceOwnership['transitions'][number]['operation'])=>({id,timeMs,operation,narrationAnchor:'cue',statement:ref.quote,sourceRefs:[ref]});
  const source:SourceOwnership={version:'source-ownership-1',id:'basket-original',partId:'basket',startMs:1000,endMs:1800,
    grips:[{id:'giver',actorId:'mina',sourceId:'mina-original',gestureId:'offer',propId:'mina-grip',hand:'right',gripOffset:{x:0,y:0}},
      {id:'receiver',actorId:'orin',sourceId:'orin-original',gestureId:'receive',propId:'orin-grip',hand:'left',gripOffset:{x:0,y:0}}],
    phases:[{kind:'world',startMs:1000,endMs:1100,center:{x:100,y:300},rotationDeg:0},{kind:'held',startMs:1100,endMs:1200,gripId:'giver'},
      {kind:'shared',startMs:1200,endMs:1400,gripIds:['giver','receiver'],authorityGripId:'giver'},{kind:'held',startMs:1400,endMs:1600,gripId:'receiver'},
      {kind:'world',startMs:1600,endMs:1800,center:{x:300,y:300},rotationDeg:0}],
    transitions:[transition('pickup',1100,'pickup'),transition('join',1200,'join'),transition('transfer',1400,'handoff'),transition('place',1600,'place')]};
  const paint={version:'ownership-paint-1' as const,sourceId:source.id,entityPlane:'in-front-of-actors' as const,sourceRefs:[ref],grips:source.grips.map(g=>({gripId:g.id,depth:'after-entity' as const,anchor:{x:.5,y:.5}}))};
  const shot={id:'slice',startMs:1000,endMs:1800,visualization:{parts:[{id:'basket',x:.1,y:.3,width:.1,height:.1}]},cinematic:{sourceOwnership:[source],ownershipPaint:[paint],performance:{stage:{width:1000,height:1000}}}} as unknown as Shot;
  const board:Storyboard={shots:[shot]},narration={segments:[{id:'cue',text:ref.quote,startMs:1000,endMs:1800}]} as Narration;
  const samples=[1000,1100,1200,1300,1400,1600,1800].map(timeMs=>{
    const phase=ownershipPhaseAt(source,timeMs),activeGripIds=phase.kind==='world'?[]:phase.kind==='held'?[phase.gripId]:phase.gripIds;
    return {timeMs,center:{x:timeMs/10,y:timeMs===1300?400:300},palms:Object.fromEntries(source.grips.map((g,i)=>[g.id,{x:timeMs/10+i*20,y:300}])),activeGripIds,
      ...(phase.kind==='world'?{}:{authorityGripId:phase.kind==='held'?phase.gripId:phase.authorityGripId})};
  });
  const item:CompiledOwnership={version:OWNERSHIP_RENDER_VERSION,source,paint,aliases:[],shotHash:hash(shot),sourceHash:hash({source,original:board,voice:narration}),paintHash:hash(paint),motionVerified:false,productionApproval:false,
    bake:{version:'ownership-bake-1',startMs:1000,endMs:1800,samples,maxMeasuredGapPx:0,gapLimitPx:.2,motionVerified:false,productionApproval:false}};
  return {source,shot,board,narration,item,compiled:new Map([['basket',item]])};
}

test('drawn queries interpolate every palm and keep discrete ownership at exact boundaries and reverse seeks',()=>{
  const f=fixture();
  const middle=ownershipBakeAt(f.item,1250);
  assert.deepEqual(middle.center,{x:125,y:350});assert.deepEqual({...middle.palms},{giver:{x:125,y:300},receiver:{x:145,y:300}});
  assert.equal(Object.getPrototypeOf(middle.palms),null);
  for(const [time,active] of [[1800,[]],[1400,['receiver']],[1200,['giver','receiver']],[1199,['giver']],[1000,[]]] as const)assert.deepEqual(ownershipBakeAt(f.item,time).activeGripIds,active);
  middle.center.x=999;middle.palms.giver!.x=999;assert.equal(ownershipBakeAt(f.item,1250).center.x,125);assert.equal(ownershipBakeAt(f.item,1250).palms.giver!.x,125);
});

test('camera center envelope includes every retained extremum rather than one owner or only endpoints',()=>{
  const f=fixture();assert.deepEqual(ownershipBakeCenterBounds(f.item),{left:100,right:180,top:300,bottom:400});
});

test('query rejects nonfinite or out-of-bake global time without clamping',()=>{
  const f=fixture();for(const time of [999,1801,NaN,Infinity,-Infinity])assert.throws(()=>ownershipBakeAt(f.item,time),/needs-source-prop-binding/);
});

test('missing endpoints, duplicate times, bad phase metadata and nonfinite geometry fail closed',()=>{
  for(const change of [
    (item:CompiledOwnership)=>{item.bake.samples.shift();},
    (item:CompiledOwnership)=>{item.bake.samples[1]!.timeMs=item.bake.samples[0]!.timeMs;},
    (item:CompiledOwnership)=>{item.bake.samples[2]!.activeGripIds=['giver'];},
    (item:CompiledOwnership)=>{item.bake.samples[2]!.authorityGripId='receiver';},
    (item:CompiledOwnership)=>{item.bake.samples[0]!.center.x=Infinity;},
    (item:CompiledOwnership)=>{item.bake.maxMeasuredGapPx=.3;},
  ]){const f=fixture();change(f.item);assert.throws(()=>ownershipBakeAt(f.item,1250),/needs-source-prop-binding/);assert.throws(()=>ownershipBakeCenterBounds(f.item),/needs-source-prop-binding/);}
});

test('dynamic palm accessors are never invoked and changed caller data is revalidated',()=>{
  const f=fixture();ownershipBakeAt(f.item,1250);let invoked=false;
  Object.defineProperty(f.item.bake.samples[1]!.palms,'giver',{enumerable:true,get(){invoked=true;return {x:0,y:0};}});
  assert.throws(()=>ownershipBakeAt(f.item,1250),/needs-source-prop-binding/);assert.equal(invoked,false);
});

test('supplied scene observations reject changed complete narration, paint and camera revision',()=>{
  const f=fixture();assert.equal(ownershipScene(f.shot,f.board,f.narration,f.compiled),f.compiled);
  const changedVoice=structuredClone(f.narration);changedVoice.segments[0]!.text+=' Changed.';
  assert.throws(()=>ownershipScene(f.shot,f.board,changedVoice,f.compiled),/needs-source-prop-binding/);
  const changedBoard=structuredClone(f.board);changedBoard.shots[0]!.cinematic!.ownershipPaint![0]!.entityPlane='behind-actors';
  assert.throws(()=>ownershipScene(changedBoard.shots[0]!,changedBoard,f.narration,f.compiled),/needs-source-prop-binding/);
  assert.throws(()=>ownershipScene(f.shot,undefined,f.narration,f.compiled),/needs-source-prop-binding/);
});

test('model entry and exit read one drawn canonical center, not an arbitrary first binding',()=>{
  const f=fixture();assert.equal(modelEntryParts(f.shot,f.board,f.narration,f.compiled)[0]!.x,.1);assert.equal(modelExitParts(f.shot,f.board,f.narration,f.compiled)[0]!.x,.18);
});

test('review evidence includes shared authority boundaries without inventing contact at a cut',()=>{
  const source={contactMs:1100,releaseMs:1600,ownership:{transitionTimesMs:[1200,1400,1600]}} as SourceInteractionRecord;
  assert.deepEqual(interactionPreviewTimes({startMs:1200,endMs:1500},[{reachMs:1300,sourceManipulation:source}],10),[1200,1210,1300,1390,1400,1410,1499]);
});

test('consumer snapshots copy source phases, centers and every palm without changing the caller',()=>{
  const f=fixture(),snapshot=ownershipBakeSnapshot(f.item);
  snapshot.source.grips[0]!.actorId='changed';snapshot.source.phases[0]!.startMs++;
  snapshot.samples[0]!.center.x=999;snapshot.samples[0]!.palms.giver!.x=999;
  assert.equal(f.source.grips[0]!.actorId,'mina');assert.equal(f.source.phases[0]!.startMs,1000);
  assert.equal(f.item.bake.samples[0]!.center.x,100);assert.equal(f.item.bake.samples[0]!.palms.giver!.x,100);
  f.item.bake.samples[0]!.center.x=101;
  assert.equal(ownershipBakeSnapshot(f.item).samples[0]!.center.x,101);
  assert.equal(snapshot.samples[0]!.center.x,999);
});

test('renderer and relation consumers reject the same damaged bake as observations before artwork work',()=>{
  for(const change of [
    (item:CompiledOwnership)=>{item.bake.samples.pop();},
    (item:CompiledOwnership)=>{item.bake.samples[1]!.timeMs=item.bake.samples[0]!.timeMs;},
    (item:CompiledOwnership)=>{item.bake.samples.splice(2,1);},
    (item:CompiledOwnership)=>{item.bake.samples[2]!.activeGripIds=['giver'];},
    (item:CompiledOwnership)=>{item.bake.samples[2]!.authorityGripId='receiver';},
    (item:CompiledOwnership)=>{item.bake.samples[0]!.center.x=NaN;},
    (item:CompiledOwnership)=>{delete item.bake.samples[0]!.palms.receiver;},
  ]){
    const f=fixture();change(f.item);let artworkCalls=0;
    assert.throws(()=>ownershipBakeCenterBounds(f.item),/needs-source-prop-binding/);
    assert.throws(()=>ownershipRelationFrames(f.shot,f.compiled),/needs-source-prop-binding/);
    assert.throws(()=>renderOwnershipLayer(f.shot,f.compiled,()=>{artworkCalls++;return '';}),/needs-source-prop-binding/);
    assert.equal(artworkCalls,0);
  }
});

test('renderer and relations reject palm accessors without invoking them',()=>{
  const f=fixture();let getterCalls=0;
  Object.defineProperty(f.item.bake.samples[1]!.palms,'giver',{enumerable:true,get(){getterCalls++;return {x:0,y:0};}});
  assert.throws(()=>ownershipRelationFrames(f.shot,f.compiled),/needs-source-prop-binding/);
  assert.throws(()=>renderOwnershipLayer(f.shot,f.compiled,()=>''),/needs-source-prop-binding/);
  assert.equal(getterCalls,0);
});

test('renderer rejects a changed depth plan even if the original paint receipt is retained',()=>{
  for(const change of [
    (item:CompiledOwnership)=>{item.paint.entityPlane='behind-actors';},
    (item:CompiledOwnership)=>{item.paint.grips[1]!.gripId=item.paint.grips[0]!.gripId;},
  ]){
    const f=fixture();f.item.paint=structuredClone(f.item.paint);change(f.item);
    assert.throws(()=>renderOwnershipLayer(f.shot,f.compiled,()=>''),/different canonical revision/);
  }
});

test('relation frames are bound to the canonical shot revision and retain the exact bake centers',()=>{
  const f=fixture(),frames=ownershipRelationFrames(f.shot,f.compiled);
  assert.deepEqual(frames.map(frame=>frame.timeMs),f.item.bake.samples.map(sample=>sample.timeMs-f.shot.startMs));
  for(const [index,frame]of frames.entries())assert.deepEqual(frame.centers.basket,f.item.bake.samples[index]!.center);
  const changed=structuredClone(f.shot);changed.visualization!.parts[0]!.x=.2;
  assert.throws(()=>ownershipRelationFrames(changed,f.compiled),/revision\/clock differs/);
  assert.throws(()=>ownershipRelationFrames(f.shot,new Map()),/require every canonical entity/);
  const unrelated=fixture();unrelated.source.grips[0]!.actorId='unrelated';unrelated.item.shotHash=hash(f.shot);
  assert.throws(()=>ownershipRelationFrames(f.shot,unrelated.compiled),/revision\/clock differs/);
});
