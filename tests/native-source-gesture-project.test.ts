// DECLARED ONLY, NOT RUN. Execution is delegated to the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {projectViewSourceGestures,viewSourceGestureDefinition,validateViewGesturePiece,collectViewSourceGestures,type ViewSourceGesture} from '../packages/animation/view-source-gesture.js';

const track:ViewSourceGesture[]=[
  {id:'left-point',action:'point',hand:'left',target:{x:100,y:200},elbowPole:undefined,startMs:300,reachMs:700,recoverMs:1300,endMs:1700},
  {id:'right-think',action:'think',hand:'right',target:undefined,elbowPole:undefined,startMs:1300,reachMs:2000,recoverMs:2800,endMs:3200},
  {id:'left-think',action:'think',hand:'left',target:undefined,elbowPole:undefined,startMs:2200,reachMs:2700,recoverMs:3800,endMs:4200},
];
test('projection conserves complete original hand ownership and timings through five camera slices',()=>{
  const cuts=[0,900,2400,3800,4800,7200],before=hash(track);
  const entries=cuts.slice(0,-1).map((startMs,i)=>({startMs,endMs:cuts[i+1]!,gestures:projectViewSourceGestures(track,startMs,cuts[i+1]!,0,7200)}));
  assert.deepEqual(collectViewSourceGestures(entries,0,7200),track);
  for(const original of track){
    let covered=0;
    for(const entry of entries)for(const piece of entry.gestures.filter(g=>g.sourceSpan!.id===original.id)){
      assert.deepEqual(validateViewGesturePiece(piece,entry.startMs,entry.endMs),original);
      assert.equal(piece.startMs+entry.startMs,Math.max(original.startMs,entry.startMs));
      assert.equal(piece.endMs+entry.startMs,Math.min(original.endMs,entry.endMs));
      covered+=piece.endMs-piece.startMs;
    }
    assert.equal(covered,original.endMs-original.startMs);
  }
  assert.equal(hash(track),before);assert.deepEqual(entries.at(-1)!.gestures,[]);
});
test('fractional existing default ramps round-trip by omission without rounding at a cut',()=>{
  const source=viewSourceGestureDefinition({id:'short-think',action:'think',hand:'left',startMs:300,endMs:1303,sourceSpan:{id:'short-think',startMs:300,endMs:1303}});
  assert.ok(!Number.isInteger(source.reachMs));assert.ok(!Number.isInteger(source.recoverMs));
  const piece=projectViewSourceGestures([source],800,1100,0,2000)[0]!;
  assert.equal(piece.sourceSpan!.reachMs,undefined);assert.equal(piece.sourceSpan!.recoverMs,undefined);
  assert.deepEqual(viewSourceGestureDefinition(piece),source);
  assert.throws(()=>projectViewSourceGestures([{...source,reachMs:source.reachMs+.01}],0,100,0,2000),/cannot be represented/);
});
test('invalid original commands and clocks cannot be concealed by an empty local slice',()=>{
  for(const [start,end,runStart,runEnd] of [[-1,100,0,7200],[0,0,0,7200],[0,100,200,7200],[0,7201,0,7200],[0,100,0,0],[.5,100,0,7200],[0,100,0,NaN]])
    assert.throws(()=>projectViewSourceGestures([],start!,end!,runStart!,runEnd!),/projection clock/);
  for(const commands of [[track[0]!,{...track[0]!,id:'other'}],[track[0]!,{...track[1]!,id:track[0]!.id}],[{...track[0]!,target:undefined}],[{...track[0]!,endMs:8000}]])
    assert.throws(()=>projectViewSourceGestures(commands,6000,7000,0,7200));
});
test('local edits do not mutate another slice or the authored target/source span',()=>{
  const before=hash(track),a=projectViewSourceGestures(track,0,900,0,7200)[0]!,b=projectViewSourceGestures(track,900,2400,0,7200)[0]!;
  a.target!.x+=10;a.sourceSpan!.reachMs=701;
  assert.equal(b.target!.x,100);assert.equal(b.sourceSpan!.reachMs,700);assert.equal(hash(track),before);
});
