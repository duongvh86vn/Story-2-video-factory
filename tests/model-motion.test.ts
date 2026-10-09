// DECLARED / NOT RUN. Human tester owns callbacks, geometry and video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {compiledModelFrames,validateModelMotionFrames,type CompiledModelSource,type CompiledPropFrame} from '../packages/director/prop-motion.js';
import {propAliasIdentity,propPerformer} from '../packages/director/prop-owner.js';
import {cinematicRelations} from '../library/shots/cinematic-models.js';
import type {Shot} from '../packages/core/schemas.js';

const frame=(timeMs:number,x:number):CompiledPropFrame=>({timeMs,props:{shared:{point:{x,y:30},attached:true}}});
function sources():CompiledModelSource[]{return [
  {ownerId:'lila',partId:'lila-basket',propId:'shared',frames:[frame(0,100),frame(50,150),frame(100,200)]},
  {ownerId:'karo',partId:'karo-basket',propId:'shared',frames:[frame(0,400),frame(25,450),frame(100,600)]},
];}

test('two actor-local aliases yield independent canonical centers on the union of real frame times',()=>{
  const input=sources(),before=hash(input),frames=compiledModelFrames(input[0]!.frames,input);
  assert.deepEqual(frames.map(f=>f.timeMs),[0,25,50,100]);
  assert.deepEqual(frames[1]!.centers['lila-basket'],{x:125,y:30});assert.deepEqual(frames[1]!.centers['karo-basket'],{x:450,y:30});
  assert.deepEqual(frames[2]!.centers['karo-basket'],{x:500,y:30});
  validateModelMotionFrames(frames,input.map(s=>s.partId),100);assert.equal(hash(input),before);
  frames[0]!.centers['lila-basket']!.x=999;assert.equal(input[0]!.frames[0]!.props.shared!.point.x,100);
});

test('canonical entity cannot be overwritten by a second owner or omitted local-name metadata',()=>{
  const input=sources();assert.throws(()=>compiledModelFrames(input[0]!.frames,[input[0]!,{...input[1]!,partId:input[0]!.partId}]),/one actual owner/);
  assert.throws(()=>compiledModelFrames(input[0]!.frames,[{...input[1]!,ownerId:''}]),/actual owner/);
  assert.notEqual(propAliasIdentity('a-b','c'),propAliasIdentity('a','b-c'));
});

test('explicit legacy primary qualification matches omission and cannot name another person',()=>{
  const shot={id:'legacy',cinematic:{leadCharacterId:'actual-presenter',performance:{},propBindings:[]},host:{actions:[]}} as unknown as Shot;
  const binding={propId:'item',partId:'object',role:'illustrative-model' as const,sourceRefs:[]};
  assert.deepEqual(propPerformer(shot,binding),propPerformer(shot,{...binding,ownerId:'actual-presenter'}));
  assert.throws(()=>propPerformer(shot,{...binding,ownerId:'invented-person'}),/not one visible/);
});

test('missing, inherited or nonfinite local prop centers reject without borrowing the first actor',()=>{
  for(const mutate of [
    (s:CompiledModelSource)=>{delete s.frames[0]!.props.shared;},
    (s:CompiledModelSource)=>{s.frames[0]!.props=Object.create({shared:{point:{x:0,y:0},attached:true}});},
    (s:CompiledModelSource)=>{s.frames[0]!.props.shared!.point.x=NaN;},
  ]){const input=sources();mutate(input[1]!);assert.throws(()=>compiledModelFrames(input[0]!.frames,input),/missing or invalid/);}
});

test('truncated, unordered, duplicate, nonfinite and zero-span clocks cannot be clamped into another owner clock',()=>{
  for(const values of [[frame(1,0),frame(100,1)],[frame(0,0),frame(99,1)],[frame(0,0),frame(50,1),frame(25,2),frame(100,3)],[frame(0,0),frame(0,1),frame(100,2)],[frame(0,0),frame(NaN,1),frame(100,2)],[frame(0,0)]]){
    const input=sources();assert.throws(()=>compiledModelFrames(input[0]!.frames,[{...input[1]!,frames:values}]));
  }
  assert.throws(()=>compiledModelFrames([],[]));
});

test('canonical channel validator rejects missing/extra entities, bad center or wrong shot clock',()=>{
  for(const mutate of [
    (f:ReturnType<typeof compiledModelFrames>)=>{delete f[0]!.centers['karo-basket'];},
    (f:ReturnType<typeof compiledModelFrames>)=>{f[0]!.centers['other']={x:0,y:0};},
    (f:ReturnType<typeof compiledModelFrames>)=>{f[0]!.centers['karo-basket']!.y=Infinity;},
    (f:ReturnType<typeof compiledModelFrames>)=>{f.at(-1)!.timeMs--;},
  ]){const input=sources(),frames=compiledModelFrames(input[0]!.frames,input);mutate(frames);assert.throws(()=>validateModelMotionFrames(frames,input.map(s=>s.partId),100));}
});

test('dynamic relation consumes canonical entity channels; absent channels never silently draw a fixed relation',()=>{
  const input=sources(),frames=compiledModelFrames(input[0]!.frames,input),shot={id:'relation',startMs:0,endMs:100,
    cinematic:{propBindings:input.map(s=>({ownerId:s.ownerId,propId:s.propId,partId:s.partId}))},
    visualization:{parts:input.map((s,i)=>({id:s.partId,x:i?.6:.2,y:.3,width:.05,height:.05})),relations:[{from:input[0]!.partId,to:input[1]!.partId,kind:'compare'}],events:[]}} as unknown as Shot;
  const drawn=cinematicRelations(shot,1000,1000,frames);assert.ok(drawn.calls.length);assert.match(drawn.html,/relation-0-segment-0/);
  assert.throws(()=>cinematicRelations(shot,1000,1000),/actual compiled canonical/);
  const changed=structuredClone(frames);changed[1]!.centers['karo-basket']!.x+=10;
  assert.notEqual(hash(cinematicRelations(shot,1000,1000,changed).calls),hash(drawn.calls));
});
