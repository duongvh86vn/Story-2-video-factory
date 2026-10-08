import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_HEAD_SOURCE_VERSION,NativeHeadTrackSchema,type NativeHeadTrack,
  collectNativeHeadTracks,validateNativeHeadSource,nativeHeadCellAt,nativeHeadTrackTimes,
} from '../packages/animation/native-head-track.js';

// Synthetic declaration fixtures only. No bank, artwork, renderer, evaluator,
// media, or approval fixtures are imported or implied by these tests.
function source(updates:Partial<NativeHeadTrack>={}):NativeHeadTrack{
  return {version:NATIVE_HEAD_SOURCE_VERSION,id:'head-route',ownerId:'actor-a',bankFingerprint:'a'.repeat(64),
    startMs:1000,endMs:5000,samples:[
      {atMs:0,cell:'cell-a'},{atMs:700,cell:'cell-b'},
      {atMs:1900,cell:'cell-c'},{atMs:3000,cell:'cell-a'},
    ],...updates};
}
function entries(track=source()){
  return [
    {startMs:1000,endMs:1700,sourceHead:structuredClone(track)},
    {startMs:1700,endMs:3200,sourceHead:structuredClone(track)},
    {startMs:3200,endMs:5000,sourceHead:structuredClone(track)},
  ];
}
function plan(track=source()){
  return {leadCharacterId:'actor-a',durationMs:1500,sourceHead:track};
}
const phase=/needs-head-source-phase:/;

test('strict head source schema bounds version, identifiers, SHA64, duration, and discrete samples',()=>{
  assert.deepEqual(NativeHeadTrackSchema.parse(source()),source());
  const bad:unknown[]=[
    {...source(),version:'native-head-source-2'},
    {...source(),id:'../route'},{...source(),ownerId:'constructor'},
    {...source(),bankFingerprint:'a'.repeat(63)},
    {...source(),bankFingerprint:'a'.repeat(65)},
    {...source(),bankFingerprint:'a'.repeat(64)+'\n'},
    {...source(),bankFingerprint:'g'.repeat(64)},
    {...source(),bankFingerprint:'A'.repeat(64)},
    {...source(),startMs:-1},{...source(),startMs:1000.5},
    {...source(),endMs:5000.5},{...source(),endMs:Number.NaN},
    {...source(),endMs:Number.POSITIVE_INFINITY},
    {...source(),startMs:1000,endMs:1000},
    {...source(),startMs:1000,endMs:999},
    {...source(),endMs:301001},
    {...source(),startMs:2**53,endMs:2**53+4000},
    {...source(),samples:[]},
    {...source(),samples:[{atMs:1,cell:'cell-a'}]},
    {...source(),samples:[{atMs:0,cell:'bad/cell'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a',yaw:0}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:-1,cell:'cell-b'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:1.5,cell:'cell-b'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:4001,cell:'cell-b'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:700,cell:'cell-b'},{atMs:700,cell:'cell-c'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:700,cell:'cell-b'},{atMs:600,cell:'cell-c'}]},
    {...source(),samples:[{atMs:0,cell:'cell-a'},{atMs:700,cell:'cell-a'}]},
  ];
  for(const value of bad)assert.equal(NativeHeadTrackSchema.safeParse(value).success,false);
  for(const key of ['approved','registered','productionReady','yaw','pivot','selection','phonemeSync'])
    assert.equal(NativeHeadTrackSchema.safeParse({...source(),[key]:true}).success,false);
  const maximum=source({startMs:0,endMs:300000,
    samples:Array.from({length:600},(_,i)=>({atMs:i*500,cell:'cell-'+i}))});
  assert.doesNotThrow(()=>NativeHeadTrackSchema.parse(maximum));
  assert.equal(NativeHeadTrackSchema.safeParse({...maximum,samples:[...maximum.samples,{atMs:300000,cell:'last-cell'}]}).success,false);
  assert.doesNotThrow(()=>NativeHeadTrackSchema.parse(source({startMs:0,endMs:1,samples:[{atMs:0,cell:'only-cell'}]})));
});

test('collection is absent by default and detaches the identical full source from unordered complete entries',()=>{
  assert.equal(collectNativeHeadTracks([],Number.NaN,Number.NaN),undefined);
  assert.equal(collectNativeHeadTracks([{startMs:0,endMs:10}],0,10),undefined);
  const original=entries(),before=structuredClone(original);
  const result=collectNativeHeadTracks([original[2]!,original[0]!,original[1]!],1000,5000)!;
  assert.deepEqual(result,source());assert.deepEqual(original,before);
  assert.notEqual(result,original[0]!.sourceHead);
  assert.notEqual(result.samples,original[0]!.sourceHead.samples);
  assert.notEqual(result.samples[0],original[0]!.sourceHead.samples[0]);
  result.samples[0]!.cell='detached-result';
  assert.deepEqual(original,before);
  original[0]!.sourceHead.samples[1]!.cell='detached-input';
  assert.equal(result.samples[1]!.cell,'cell-b');
});

test('every entry must declare its full source with exactly complete continuous run coverage',()=>{
  const full=entries();
  const invalidEntries=[
    full.slice(0,2),full.slice(1),
    [full[0]!,full[0]!,full[1]!,full[2]!],
    [full[0]!,{...full[1]!,startMs:1701},full[2]!],
    [full[0]!,{...full[1]!,startMs:1699},full[2]!],
    [{...full[0]!,startMs:999},full[1]!,full[2]!],
    [full[0]!,full[1]!,{...full[2]!,endMs:5001}],
    [full[0]!,{...full[1]!,endMs:1700},full[2]!],
    [full[0]!,{...full[1]!,startMs:Number.NaN},full[2]!],
    [full[0]!,{...full[1]!,endMs:3200.5},full[2]!],
    [full[0]!,{...full[1]!,sourceHead:undefined},full[2]!],
  ];
  for(const value of invalidEntries)assert.throws(()=>collectNativeHeadTracks(value,1000,5000),phase);
  for(const [start,end] of [[-1,5000],[1000,1000],[1000,999],[1000.5,5000],[1000,Infinity],[NaN,5000]])
    assert.throws(()=>collectNativeHeadTracks(full,start!,end!),phase);
  assert.throws(()=>collectNativeHeadTracks(entries(source({startMs:0,endMs:5000})),1000,5000),phase);
  assert.throws(()=>collectNativeHeadTracks(entries(source({samples:[{atMs:0,cell:'cell-a'},{atMs:4001,cell:'cell-b'}]})),1000,5000),phase);
  assert.throws(()=>collectNativeHeadTracks(entries({...source(),approved:true} as NativeHeadTrack),1000,5000),phase);
  assert.throws(()=>collectNativeHeadTracks(entries(null as unknown as NativeHeadTrack),1000,5000),phase);
});

test('canonical full declaration hash ignores key order and binds identity, owner, bank, samples, and original span',()=>{
  const track=source();
  const reordered:NativeHeadTrack={samples:track.samples.map(s=>({cell:s.cell,atMs:s.atMs})),
    endMs:track.endMs,startMs:track.startMs,bankFingerprint:track.bankFingerprint,
    ownerId:track.ownerId,id:track.id,version:track.version};
  const full=entries();full[1]!.sourceHead=reordered;
  assert.deepEqual(collectNativeHeadTracks(full,1000,5000),track);
  assert.doesNotThrow(()=>validateNativeHeadSource(plan(track),reordered,1700,3200,1000,5000));
  const changed:NativeHeadTrack[]=[
    source({id:'other-route'}),source({ownerId:'actor-b'}),source({bankFingerprint:'b'.repeat(64)}),
    source({samples:track.samples.map((s,i)=>i===1?{...s,atMs:701}:s)}),
    source({samples:track.samples.map((s,i)=>i===1?{...s,cell:'other-cell'}:s)}),
    source({samples:track.samples.slice(0,-1)}),
    source({startMs:999}),source({endMs:5001}),
  ];
  for(const update of changed){
    const differing=entries();differing[1]!.sourceHead=update;
    assert.throws(()=>collectNativeHeadTracks(differing,1000,5000),phase);
    assert.throws(()=>validateNativeHeadSource(plan(track),update,1700,3200,1000,5000),phase);
  }
});

test('local binding requires declaration/context, exact owner, original run, and matching shot duration',()=>{
  const track=source(),local=plan(track);
  assert.doesNotThrow(()=>validateNativeHeadSource({leadCharacterId:'ordinary',durationMs:1,headTurns:[{}]},undefined,NaN,NaN,NaN,NaN));
  assert.doesNotThrow(()=>validateNativeHeadSource(local,structuredClone(track),1700,3200,1000,5000));
  assert.doesNotThrow(()=>validateNativeHeadSource({...local,headTurns:[]},track,1700,3200,1000,5000));
  assert.throws(()=>validateNativeHeadSource(local,undefined,1700,3200,1000,5000),phase);
  assert.throws(()=>validateNativeHeadSource({...local,sourceHead:undefined},track,1700,3200,1000,5000),phase);
  assert.throws(()=>validateNativeHeadSource({...local,leadCharacterId:'actor-b'},track,1700,3200,1000,5000),phase);
  const foreign=source({ownerId:'actor-b'});
  assert.throws(()=>validateNativeHeadSource(plan(foreign),foreign,1700,3200,1000,5000),phase);
  for(const durationMs of [0,-1,1499,1501,1500.5,NaN,Infinity])
    assert.throws(()=>validateNativeHeadSource({...local,durationMs},track,1700,3200,1000,5000),phase);
  for(const [start,end,runStart,runEnd] of [
    [999,3200,1000,5000],[1700,5001,1000,5000],
    [1700,1700,1000,5000],[1700,1699,1000,5000],
    [1700.5,3200.5,1000,5000],[NaN,3200,1000,5000],
    [1700,Infinity,1000,5000],[1700,3200,999,5000],
    [1700,3200,1000,5001],[1700,3200,1000,1000],
    [1700,3200,1000,NaN],
  ])assert.throws(()=>validateNativeHeadSource(local,track,start!,end!,runStart!,runEnd!),phase);
  const bad={...track,samples:[{atMs:1,cell:'cell-a'}]};
  assert.throws(()=>validateNativeHeadSource(plan(bad),track,1700,3200,1000,5000),phase);
  assert.throws(()=>validateNativeHeadSource(local,bad,1700,3200,1000,5000),phase);
});

test('source ownership rejects all nonempty local headTurns, including apparently matching directions',()=>{
  const track=source();
  for(const headTurns of [[{startMs:0,endMs:1500,direction:'cell-b'}],[{}],[null],['cell-b']])
    assert.throws(()=>validateNativeHeadSource({...plan(track),headTurns},track,1700,3200,1000,5000),/needs-head-source-phase:.*conflicts with local headTurns/);
  assert.throws(()=>validateNativeHeadSource({...plan(track),headTurns:null as unknown as readonly unknown[]},track,1700,3200,1000,5000),phase);
});

test('discrete cells hold on half-open intervals with absolute cell starts and full-source relative time',()=>{
  const track=source(),before=structuredClone(track);
  const expected:[number,string,number,number][]=[
    [0,'cell-a',0,1000],[699.5,'cell-a',0,1000],
    [700,'cell-b',1,1700],[1899.999,'cell-b',1,1700],
    [1900,'cell-c',2,2900],[2999.5,'cell-c',2,2900],
    [3000,'cell-a',3,4000],[4000,'cell-a',3,4000],
  ];
  for(const [time,cell,index,cellStartMs] of expected)
    assert.deepEqual(nativeHeadCellAt(track,1000,time,4000),{cell,index,sourceTimeMs:time,cellStartMs});
  assert.deepEqual(nativeHeadCellAt(track,2500,450,1800),{cell:'cell-c',index:2,sourceTimeMs:1950,cellStartMs:2900});
  assert.deepEqual(track,before);
  const endpoint=source({samples:[...track.samples,{atMs:4000,cell:'end-cell'}]});
  assert.equal(nativeHeadCellAt(endpoint,1000,3999.5,4000).cell,'cell-a');
  assert.deepEqual(nativeHeadCellAt(endpoint,1000,4000,4000),{cell:'end-cell',index:4,sourceTimeMs:4000,cellStartMs:5000});
});

test('every split preserves original cell identity at each cut and on both sides of the shot boundary',()=>{
  const track=source();
  for(const cut of [1,350,700,1200,1900,2500,3000,3999]){
    assert.deepEqual(nativeHeadCellAt(track,1000,cut,cut),nativeHeadCellAt(track,1000+cut,0,4000-cut));
    for(const t of [0,cut/2,cut-0.5,cut,cut+0.5,(cut+4000)/2,4000]){
      const whole=nativeHeadCellAt(track,1000,t,4000);
      const split=t<=cut?nativeHeadCellAt(track,1000,t,cut):nativeHeadCellAt(track,1000+cut,t-cut,4000-cut);
      assert.deepEqual(split,whole);
    }
    assert.deepEqual(collectNativeHeadTracks([
      {startMs:1000,endMs:1000+cut,sourceHead:track},
      {startMs:1000+cut,endMs:5000,sourceHead:structuredClone(track)},
    ],1000,5000),track);
  }
});

test('reverse and deterministic randomized seeks use authored interval expectations without playback state',()=>{
  const track=source(),before=structuredClone(track),times=[0,699.5,700,1899.5,1900,2999.5,3000,4000];
  let seed=73;
  for(let i=0;i<80;i++){seed=(seed*48271)%2147483647;times.push(seed%8001/2);}
  const expectations=times.map(t=>{
    const index=t<700?0:t<1900?1:t<3000?2:3;
    return {cell:['cell-a','cell-b','cell-c','cell-a'][index]!,index,sourceTimeMs:t,
      cellStartMs:[1000,1700,2900,4000][index]!};
  });
  const order=times.map((_,i)=>i).reverse();
  for(let i=order.length-1;i>0;i--){seed=(seed*48271)%2147483647;const j=seed%(i+1);[order[i],order[j]]=[order[j]!,order[i]!];}
  for(const indices of [times.map((_,i)=>i).reverse(),order,order])
    for(const index of indices)assert.deepEqual(nativeHeadCellAt(track,1000,times[index]!,4000),expectations[index]);
  assert.deepEqual(track,before);
});

test('seeks reject malformed sources, invalid shot windows, and nonfinite or out-of-window local times',()=>{
  const track=source();
  for(const localTimeMs of [-0.001,4000.001,NaN,Infinity,-Infinity])
    assert.throws(()=>nativeHeadCellAt(track,1000,localTimeMs,4000),phase);
  for(const [start,duration] of [[999,4000],[1001,4000],[5000,1],[1000,0],[1000,-1],[1000,4000.5],[1000.5,3999],[NaN,4000],[1000,Infinity],[2**53,1]])
    assert.throws(()=>nativeHeadCellAt(track,start!,0,duration!),phase);
  assert.throws(()=>nativeHeadCellAt(track,1700,1500.001,1500),phase);
  assert.throws(()=>nativeHeadCellAt(source({samples:[]}),1000,0,4000),phase);
  const single=source({samples:[{atMs:0,cell:'only-cell'}]});
  assert.equal(nativeHeadCellAt(single,1000,0,4000).cell,'only-cell');
  assert.equal(nativeHeadCellAt(single,1000,4000,4000).cell,'only-cell');
  const large=source({startMs:Number.MAX_SAFE_INTEGER-4000,endMs:Number.MAX_SAFE_INTEGER});
  assert.deepEqual(nativeHeadCellAt(large,large.startMs+500,199.5,3500),
    {cell:'cell-a',index:0,sourceTimeMs:699.5,cellStartMs:large.startMs});
});

test('track times are exact sorted global change times plus one source end, without seeks or cell evaluation',()=>{
  const track=source(),before=structuredClone(track);
  assert.deepEqual(nativeHeadTrackTimes(track),[1000,1700,2900,4000,5000]);
  assert.deepEqual(nativeHeadTrackTimes(source({samples:[{atMs:0,cell:'only-cell'}]})),[1000,5000]);
  assert.deepEqual(nativeHeadTrackTimes(source({samples:[...track.samples,{atMs:4000,cell:'end-cell'}]})),[1000,1700,2900,4000,5000]);
  const detached=nativeHeadTrackTimes(track);detached[0]=-1;
  assert.deepEqual(nativeHeadTrackTimes(track),[1000,1700,2900,4000,5000]);
  assert.deepEqual(track,before);
  assert.throws(()=>nativeHeadTrackTimes(source({samples:[{atMs:0,cell:'cell-a'},{atMs:700,cell:'cell-a'}]})),phase);
});
