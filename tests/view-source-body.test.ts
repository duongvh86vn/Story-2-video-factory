// Source declarations only; not executed by this worker. No compiler/runtime imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMATION_VERSION,BODY_SOURCE_VERSION,BodySourceSchema,PerformancePlanSchema,type BodySource,type PerformancePlan} from '../packages/animation/schemas.js';
import {validateBodySourcePlan,sourceBodyPlan,bodyTrackOffsetMs,bodyRootAt,collectViewSourceBody,validateViewSourceBody} from '../packages/animation/view-source-body.js';

test('body source schema keeps complete relative tracks inside a strict original absolute interval',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'original-body',startMs:1000,endMs:7000,
    walks:[{startMs:100,endMs:4500,fromX:300,toX:620,gait:'run'}],
    jumps:[{startMs:3000,endMs:4500,takeoffMs:3300,landingMs:4100,height:26,tuck:.2}],
    postures:[{startMs:5000,endMs:5600,pose:'crouch',intensity:.3}],entryPosture:{pose:'stand'}};
  assert.equal(BODY_SOURCE_VERSION,'native-source-body-1');
  assert.deepEqual(BodySourceSchema.parse(source),source);
  for(const invalid of [
    {...source,version:'native-source-body-0'}, {...source,id:'../source'},
    {...source,startMs:1000.5}, {...source,endMs:7000.5}, {...source,startMs:-1},
    {...source,endMs:1000}, {...source,endMs:999}, {...source,endMs:Infinity},
    {...source,walks:undefined}, {...source,inferContinuity:true}, {...source,owner:'primary'},
    {...source,walks:[{...source.walks[0]!,endMs:6001}]},
    {...source,walks:[{...source.walks[0]!,endMs:100}]},
    {...source,walks:[{...source.walks[0]!,startMs:.5}]},
    {...source,walks:[{...source.walks[0]!,startMs:-1}]},
    {...source,walks:[source.walks[0]!,{startMs:4400,endMs:5000,fromX:620,toX:650}]},
    {...source,walks:[{...source.walks[0]!,localClip:true}]},
    {...source,jumps:[{...source.jumps![0]!,endMs:6001}]},
    {...source,postures:[{...source.postures![0]!,endMs:6001}]},
  ])assert.equal(BodySourceSchema.safeParse(invalid).success,false);
  assert.doesNotThrow(()=>BodySourceSchema.parse({...source,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]}));
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-a',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  assert.deepEqual(PerformancePlanSchema.parse(plan).sourceBody,source);
  assert.equal(PerformancePlanSchema.safeParse({...plan,sourceBody:{...source,slice:true}}).success,false);
  assert.equal(PerformancePlanSchema.safeParse({...plan,sourceBody:undefined}).success,true);
});

test('source mode rejects each local physical owner and support-bearing source posture',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-a',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const conflicts:Partial<PerformancePlan>[]=[
    {walks:[{startMs:0,endMs:1800,fromX:300,toX:396}]},
    {jumps:[{startMs:0,endMs:1500,takeoffMs:300,landingMs:1200,height:26}]},
    {postures:[{startMs:0,endMs:600,pose:'crouch'}]}, {entryPosture:{pose:'stand'}},
    {supports:[{id:'seat',kind:'seat',center:{x:400,y:480},width:90,facing:'right'}]},
    {props:[{id:'tool',origin:{x:400,y:500}}]},
    {spears:[{id:'hold',propId:'spear',hand:'right',action:'hold',startMs:0,endMs:1800,grip:{x:400,y:350},aim:{x:600,y:350},twoHands:true,secondaryOffset:-40}]},
    {lunge:{version:'forest-planted-lunge-1',spearId:'hold',soles:{left:{x:300,y:550},right:{x:350,y:550}},kneePoles:{left:1,right:-1},advanceX:10,dropY:5,entryLeanDeg:0,contactLeanDeg:10}},
    {turns:[{startMs:0,endMs:600,direction:'right'}]}, {headTurns:[{startMs:0,endMs:600,direction:'front'}]},
  ];
  for(const conflict of conflicts){
    const candidate={...plan,...conflict};
    assert.throws(()=>validateBodySourcePlan(candidate),/^Error: needs-view-body-phase:/);
    assert.throws(()=>sourceBodyPlan(candidate),/^Error: needs-view-body-phase:/);
    assert.throws(()=>validateViewSourceBody(candidate,source,1000,2800,1000,7000),/^Error: needs-view-body-phase:/);
  }
  for(const supported of [
    {...source,entryPosture:{pose:'seated' as const,supportId:'seat'}},
    {...source,postures:[{startMs:0,endMs:800,pose:'stand' as const,supportId:'seat'}]},
  ])assert.throws(()=>validateBodySourcePlan({...plan,sourceBody:supported}),/needs-view-body-phase:.*support/);
  assert.doesNotThrow(()=>validateBodySourcePlan({...plan,jumps:[],postures:[],supports:[],spears:[],turns:[],headTurns:[],facing:'right',headView:'three-quarter-right'}));
  assert.throws(()=>validateBodySourcePlan({...plan,durationMs:6001}),/needs-view-body-phase:.*shorter/);
  assert.throws(()=>validateBodySourcePlan({...plan,durationMs:1800.5}),/needs-view-body-phase:/);
  assert.throws(()=>validateBodySourcePlan({...plan,durationMs:0}),/needs-view-body-phase:/);
  assert.doesNotThrow(()=>validateBodySourcePlan({...plan,durationMs:6000}));
});

test('physical source plan retains the full original definition and all nonattention plan metadata',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'original-body',startMs:1000,endMs:7000,
    walks:[{startMs:100,endMs:4500,fromX:300,toX:620,gait:'run'}],
    jumps:[{startMs:3000,endMs:4500,takeoffMs:3300,landingMs:4100,height:26,tuck:.2}],
    postures:[{startMs:5000,endMs:5600,pose:'crouch',intensity:.3}],entryPosture:{pose:'lean',leanDeg:5}};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-middle',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:48,stage:{width:1600,height:900,groundY:700},root:{x:300,y:700},scale:1.2,facing:'right',headView:'three-quarter-right',
    sourceBody:source,walks:[],jumps:[],postures:[],props:[],supports:[],spears:[],turns:[],headTurns:[],
    gestures:[{id:'local-point',action:'point',hand:'left',startMs:100,endMs:1600,target:{x:600,y:400}}],
    gazes:[{startMs:0,endMs:1800,target:{x:650,y:350}}],expressions:[{startMs:0,endMs:1800,mood:'happy'}]};
  const before=structuredClone(plan);
  Object.freeze(plan);Object.freeze(source);Object.freeze(source.walks);Object.freeze(source.walks[0]);
  Object.freeze(source.jumps);Object.freeze(source.jumps![0]);Object.freeze(source.postures);Object.freeze(source.entryPosture);
  const whole=sourceBodyPlan(plan);
  assert.notStrictEqual(whole,plan);
  assert.deepEqual(whole,{...before,sourceBody:undefined,durationMs:6000,walks:source.walks,jumps:source.jumps,postures:source.postures,entryPosture:source.entryPosture,gestures:[],gazes:[],expressions:[]});
  assert.deepEqual(plan,before);
  assert.equal(whole.walks[0]!.startMs,100);assert.equal(whole.walks[0]!.endMs,4500);
  assert.equal(whole.jumps![0]!.takeoffMs,3300);assert.equal(whole.jumps![0]!.landingMs,4100);
  assert.equal(whole.postures![0]!.endMs,5600);
  assert.strictEqual(whole.walks,source.walks);assert.strictEqual(whole.walks[0],source.walks[0]);
  assert.strictEqual(whole.jumps,source.jumps);assert.strictEqual(whole.postures,source.postures);assert.strictEqual(whole.entryPosture,source.entryPosture);
  assert.deepEqual(plan,before);
  assert.strictEqual(sourceBodyPlan({...plan,sourceBody:undefined}).sourceBody,undefined);
});

test('absent source keeps legacy plan identity and never infers continuity from matching physical clips',()=>{
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'legacy',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    walks:[{startMs:0,endMs:1800,fromX:300,toX:400}],entryPosture:{pose:'stand'},turns:[{startMs:0,endMs:600,direction:'right'}],
    gestures:[],gazes:[],expressions:[],props:[{id:'legacy-tool',origin:{x:300,y:500}}]};
  const before=structuredClone(plan);
  assert.doesNotThrow(()=>validateBodySourcePlan(plan));
  assert.strictEqual(sourceBodyPlan(plan),plan);
  assert.equal(collectViewSourceBody([{startMs:1000,endMs:2800},{startMs:2800,endMs:4600}],1000,4600),undefined);
  assert.equal(collectViewSourceBody([],1000,4600),undefined);
  assert.doesNotThrow(()=>validateViewSourceBody(plan,undefined,1000,2800,1000,4600));
  assert.deepEqual(plan,before);
});

test('collection accepts complete replicated source in reverse shot order without mutating declarations',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,
    walks:[{startMs:0,endMs:6000,fromX:300,toX:620,gait:'run'}],entryPosture:{pose:'stand'}};
  const reordered:BodySource={entryPosture:{pose:'stand'},walks:[{gait:'run',toX:620,fromX:300,endMs:6000,startMs:0}],endMs:7000,startMs:1000,id:'body',version:BODY_SOURCE_VERSION};
  const entries=[{startMs:1000,endMs:2800,sourceBody:source},{startMs:2800,endMs:4600,sourceBody:reordered},{startMs:4600,endMs:7000,sourceBody:structuredClone(source)}];
  const before=structuredClone(entries),reverse=[entries[2]!,entries[1]!,entries[0]!];
  Object.freeze(entries);Object.freeze(reverse);for(const entry of entries)Object.freeze(entry);
  const forward=collectViewSourceBody(entries,1000,7000),backward=collectViewSourceBody(reverse,1000,7000);
  assert.deepEqual(forward,source);assert.deepEqual(backward,source);assert.deepEqual(forward,backward);
  assert.deepEqual(entries,before);assert.deepEqual(reverse,[before[2],before[1],before[0]]);
  assert.notStrictEqual(forward,source);assert.notStrictEqual(forward!.walks,source.walks);
  forward!.walks[0]!.toX=900;assert.deepEqual(entries,before);
});

test('collection rejects incomplete, missing, duplicate, overlapping and gapped coverage',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const entries=[{startMs:1000,endMs:2800,sourceBody:source},{startMs:2800,endMs:4600,sourceBody:source},{startMs:4600,endMs:7000,sourceBody:source}];
  assert.throws(()=>collectViewSourceBody(entries.slice(0,2),1000,7000),/needs-view-body-phase:.*incomplete/);
  assert.throws(()=>collectViewSourceBody(entries.slice(1),1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([entries[0]!,entries[2]!],1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([entries[0]!,{...entries[1]!,sourceBody:undefined},entries[2]!],1000,7000),/needs-view-body-phase:.*missing.*declaration/);
  assert.throws(()=>collectViewSourceBody([...entries,entries[1]!],1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([entries[0]!,{...entries[1]!,startMs:2799},entries[2]!],1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([entries[0]!,{...entries[1]!,startMs:2801},entries[2]!],1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([{...entries[0]!,startMs:999},entries[1]!,entries[2]!],1000,7000),/needs-view-body-phase:.*coverage/);
  assert.throws(()=>collectViewSourceBody([entries[0]!,entries[1]!,{...entries[2]!,endMs:7001}],1000,7000),/needs-view-body-phase:.*coverage/);
});

test('every full body field participates in equality, including sibling motion outside the local shot',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'original-body',startMs:1000,endMs:7000,
    walks:[{startMs:100,endMs:4500,fromX:300,toX:620,gait:'run'}],
    jumps:[{startMs:3000,endMs:4500,takeoffMs:3300,landingMs:4100,height:26,tuck:.2}],
    postures:[{startMs:5000,endMs:5600,pose:'crouch',intensity:.3}],entryPosture:{pose:'stand'}};
  const changes:BodySource[]=[
    {...source,id:'other-original'},
    {...source,walks:[{...source.walks[0]!,fromX:301}]},
    {...source,walks:[{...source.walks[0]!,toX:621}]},
    {...source,walks:[{...source.walks[0]!,gait:'walk'}]},
    {...source,walks:[{...source.walks[0]!,endMs:4501}]},
    {...source,jumps:[{...source.jumps![0]!,height:27}]},
    {...source,jumps:[{...source.jumps![0]!,takeoffMs:3301}]},
    {...source,jumps:[{...source.jumps![0]!,landingMs:4101}]},
    {...source,jumps:[{...source.jumps![0]!,tuck:.3}]},
    {...source,postures:[{...source.postures![0]!,intensity:.4}]},
    {...source,entryPosture:{pose:'crouch',intensity:.2}},
    {...source,jumps:undefined}, {...source,postures:[]}, {...source,entryPosture:undefined},
  ];
  for(const changed of changes){
    const entries=[{startMs:1000,endMs:2800,sourceBody:source},{startMs:2800,endMs:7000,sourceBody:changed}];
    assert.throws(()=>collectViewSourceBody(entries,1000,7000),/needs-view-body-phase:.*definition changed/);
    assert.throws(()=>collectViewSourceBody([...entries].reverse(),1000,7000),/needs-view-body-phase:.*definition changed/);
  }
  const empty:BodySource={version:BODY_SOURCE_VERSION,id:'empty-body',startMs:1000,endMs:7000,walks:[]};
  assert.throws(()=>collectViewSourceBody([{startMs:1000,endMs:2800,sourceBody:empty},{startMs:2800,endMs:7000,sourceBody:{...empty,jumps:[]}}],1000,7000),/needs-view-body-phase:.*definition changed/);
});

test('source collection requires exact integer shot/run bounds and never trims an original span',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const entries=[{startMs:1000,endMs:2800,sourceBody:source},{startMs:2800,endMs:7000,sourceBody:source}];
  for(const [runStart,runEnd] of [[1000.5,7000],[1000,7000.5],[-1,7000],[1000,1000],[1000,999],[NaN,7000],[1000,Infinity],[999,7000],[1000,7001]]){
    assert.throws(()=>collectViewSourceBody(entries,runStart!,runEnd!),/needs-view-body-phase:/);
  }
  for(const [startMs,endMs] of [[1000.5,2800],[1000,2800.5],[-1,2800],[1000,1000],[1000,999],[NaN,2800],[1000,Infinity]]){
    assert.throws(()=>collectViewSourceBody([{startMs:startMs!,endMs:endMs!,sourceBody:source},entries[1]!],1000,7000),/needs-view-body-phase:.*shot span/);
  }
  assert.throws(()=>collectViewSourceBody([{...entries[0]!,sourceBody:{...source,startMs:999}},entries[1]!],1000,7000),/needs-view-body-phase:.*exactly span/);
});

test('view binding requires both matching source context and the exact local duration/projection',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-middle',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:structuredClone(source),walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const before=structuredClone(plan);
  assert.doesNotThrow(()=>validateViewSourceBody(plan,source,2800,4600,1000,7000));
  assert.doesNotThrow(()=>validateViewSourceBody({...plan,durationMs:6000},source,1000,7000,1000,7000));
  assert.throws(()=>validateViewSourceBody(plan,undefined,2800,4600,1000,7000),/needs-view-body-phase:.*missing/);
  assert.throws(()=>validateViewSourceBody({...plan,sourceBody:undefined},source,2800,4600,1000,7000),/needs-view-body-phase:.*missing/);
  assert.throws(()=>validateViewSourceBody(plan,{...source,id:'other'},2800,4600,1000,7000),/needs-view-body-phase:.*differs.*context/);
  assert.throws(()=>validateViewSourceBody(plan,{...source,walks:[{...source.walks[0]!,toX:621}]},2800,4600,1000,7000),/needs-view-body-phase:.*differs.*context/);
  assert.throws(()=>validateViewSourceBody({...plan,durationMs:1799},source,2800,4600,1000,7000),/needs-view-body-phase:.*projection/);
  for(const [startMs,endMs] of [[2800.5,4600.5],[999,2799],[5201,7001],[4600,2800],[2800,2800],[NaN,4600],[2800,Infinity]]){
    assert.throws(()=>validateViewSourceBody(plan,source,startMs!,endMs!,1000,7000),/needs-view-body-phase:.*projection/);
  }
  for(const [runStart,runEnd] of [[1000.5,7000],[1000,7000.5],[-1,7000],[1000,1000],[999,7000],[1000,7001],[NaN,7000],[1000,Infinity]]){
    assert.throws(()=>validateViewSourceBody(plan,source,2800,4600,runStart!,runEnd!),/needs-view-body-phase:.*continuous run/);
  }
  assert.deepEqual(plan,before);assert.deepEqual(source,before.sourceBody);
});

test('explicit cuts cannot carry, shorten or splice a declaration from a larger continuous run',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'original-body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-after-cut',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:4200,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  assert.throws(()=>collectViewSourceBody([{startMs:1000,endMs:2800,sourceBody:source}],1000,2800),/needs-view-body-phase:.*cuts cannot splice/);
  assert.throws(()=>collectViewSourceBody([{startMs:2800,endMs:7000,sourceBody:source}],2800,7000),/needs-view-body-phase:.*cuts cannot splice/);
  assert.throws(()=>validateViewSourceBody(plan,source,2800,7000,2800,7000),/needs-view-body-phase:.*cuts cannot splice/);
  const first:BodySource={...source,endMs:2800,walks:[{startMs:0,endMs:1800,fromX:300,toX:396}]};
  const second:BodySource={...source,startMs:2800,walks:[{startMs:0,endMs:4200,fromX:396,toX:620}]};
  assert.throws(()=>collectViewSourceBody([{startMs:1000,endMs:2800,sourceBody:first},{startMs:2800,endMs:7000,sourceBody:second}],1000,7000),/needs-view-body-phase:.*exactly span/);
  assert.throws(()=>validateViewSourceBody({...plan,sourceBody:second},source,2800,7000,1000,7000),/needs-view-body-phase:.*differs.*context/);
});

test('binding strictness is owner-neutral and uses explicit source content rather than actor/shot IDs',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'unrelated-original-id',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const primary:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'primary-shot',leadCharacterId:'primary-actor',profileHash:'primary-profile',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const supporting:PerformancePlan={...primary,id:'support-shot',leadCharacterId:'supporting-actor',profileHash:'supporting-profile'};
  for(const plan of [primary,supporting]){
    assert.doesNotThrow(()=>validateBodySourcePlan(plan));
    assert.doesNotThrow(()=>validateViewSourceBody(plan,source,1000,2800,1000,7000));
    assert.throws(()=>validateViewSourceBody({...plan,sourceBody:{...source,id:plan.leadCharacterId}},source,1000,2800,1000,7000),/needs-view-body-phase:.*differs.*context/);
    assert.throws(()=>validateViewSourceBody({...plan,sourceBody:undefined},source,1000,2800,1000,7000),/needs-view-body-phase:.*missing/);
    assert.throws(()=>validateBodySourcePlan({...plan,walks:[{startMs:0,endMs:1800,fromX:300,toX:396}]}),/needs-view-body-phase:.*local walks/);
  }
});

test('invalid source declarations and context consistently report the body phase prefix',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-a',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  for(const invalid of [null,{...source,version:'wrong'},{...source,infer:true},{...source,startMs:.5},{...source,walks:[{...source.walks[0]!,endMs:6001}]}]){
    const candidate=invalid as unknown as BodySource;
    assert.throws(()=>validateBodySourcePlan({...plan,sourceBody:candidate}),/^Error: needs-view-body-phase:/);
    assert.throws(()=>sourceBodyPlan({...plan,sourceBody:candidate}),/^Error: needs-view-body-phase:/);
    assert.throws(()=>collectViewSourceBody([{startMs:1000,endMs:7000,sourceBody:candidate}],1000,7000),/^Error: needs-view-body-phase:/);
    assert.throws(()=>validateViewSourceBody(plan,candidate,1000,2800,1000,7000),/^Error: needs-view-body-phase:/);
  }
});

test('body offsets and roots preserve original entry, middle and exit positions across camera shots',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body-path',startMs:1000,endMs:9000,
    walks:[{startMs:1000,endMs:5000,fromX:100,toX:500}]};
  const first:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'first',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:3000,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:100,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const middle:PerformancePlan={...first,id:'middle',durationMs:2000},last:PerformancePlan={...first,id:'last'};
  const before=structuredClone(source);
  assert.equal(bodyTrackOffsetMs(first,1000),0);
  assert.equal(bodyTrackOffsetMs(middle,4000),-3000);
  assert.equal(bodyTrackOffsetMs(last,6000),-5000);
  assert.deepEqual(bodyRootAt(first,1000,0),{x:100,y:550});
  assert.deepEqual(bodyRootAt(first,1000,1500),{x:117.1875,y:550});
  assert.deepEqual(bodyRootAt(first,1000,3000),{x:300,y:550});
  assert.deepEqual(bodyRootAt(middle,4000,0),{x:300,y:550});
  assert.deepEqual(bodyRootAt(middle,4000,1000),{x:437.5,y:550});
  assert.deepEqual(bodyRootAt(middle,4000,2000),{x:500,y:550});
  assert.deepEqual(bodyRootAt(last,6000,0),{x:500,y:550});
  assert.deepEqual(bodyRootAt(last,6000,1500),{x:500,y:550});
  assert.deepEqual(bodyRootAt(last,6000,3000),{x:500,y:550});
  assert.deepEqual(bodyRootAt(first,1000,first.durationMs),bodyRootAt(middle,4000,0));
  assert.deepEqual(bodyRootAt(middle,4000,middle.durationMs),bodyRootAt(last,6000,0));
  const complete:PerformancePlan={...first,id:'complete',durationMs:8000};
  for(const timeMs of [0,137.5,1000,1999.5,2000])assert.deepEqual(bodyRootAt(middle,4000,timeMs),bodyRootAt(complete,1000,timeMs+3000));
  assert.deepEqual(source,before);
  assert.strictEqual(sourceBodyPlan(middle).walks,source.walks);
});

test('full source path differs from restarting the cubic between camera-sliced endpoints',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'full-path',startMs:1000,endMs:5000,walks:[{startMs:0,endMs:4000,fromX:100,toX:500}]};
  const cameraShot:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'middle-camera',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:2000,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:100,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const whole:PerformancePlan={...cameraShot,id:'whole-path',durationMs:4000};
  const sliced:PerformancePlan={...cameraShot,sourceBody:undefined,walks:[{startMs:0,endMs:2000,fromX:162.5,toX:437.5}]};
  assert.equal(bodyTrackOffsetMs(cameraShot,2000),-1000);
  assert.deepEqual(bodyRootAt(cameraShot,2000,0),{x:162.5,y:550});
  assert.deepEqual(bodyRootAt(cameraShot,2000,500),{x:226.5625,y:550});
  assert.deepEqual(bodyRootAt(cameraShot,2000,1000),{x:300,y:550});
  assert.deepEqual(bodyRootAt(cameraShot,2000,2000),{x:437.5,y:550});
  assert.deepEqual(bodyRootAt(sliced,2000,500),{x:205.46875,y:550});
  assert.notDeepEqual(bodyRootAt(cameraShot,2000,500),bodyRootAt(sliced,2000,500));
  for(const timeMs of [0,137.5,500,1000,1999.5,2000])assert.deepEqual(bodyRootAt(cameraShot,2000,timeMs),bodyRootAt(whole,1000,timeMs+1000));
  assert.deepEqual(source.walks,[{startMs:0,endMs:4000,fromX:100,toX:500}]);
});

test('body root keeps original root and chronological destination holds before, between and after full tracks',()=>{
  const walks:PerformancePlan['walks']=[{startMs:2000,endMs:3000,fromX:250,toX:450},{startMs:500,endMs:1500,fromX:100,toX:250}];
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'gapped-path',startMs:1000,endMs:5000,walks,
    jumps:[{startMs:2000,endMs:3000,takeoffMs:2200,landingMs:2800,height:30}],postures:[{startMs:3200,endMs:3800,pose:'crouch'}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'whole-path',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:4000,fps:30,stage:{width:1280,height:720,groundY:600},root:{x:80,y:600},scale:1.5,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  const original=structuredClone(plan),physical=sourceBodyPlan(plan);
  Object.freeze(walks);for(const walk of walks)Object.freeze(walk);
  for(const [timeMs,x] of [[0,80],[499,80],[500,100],[1000,175],[1500,250],[1750,250],[2000,250],[2500,350],[3000,450],[4000,450]]){
    assert.deepEqual(bodyRootAt(plan,1000,timeMs!),{x:x!,y:600});
    assert.deepEqual(bodyRootAt(physical,1000,timeMs!),{x:x!,y:600});
  }
  assert.equal(bodyTrackOffsetMs(physical,1000),0);
  assert.deepEqual(plan,original);
  assert.deepEqual(bodyRootAt({...plan,sourceBody:{...source,walks:[]}},1000,2000),{x:80,y:600});
});

test('body offset and root reject invalid shot spans, uncovered shots and nonfinite/outside local times',()=>{
  const source:BodySource={version:BODY_SOURCE_VERSION,id:'body',startMs:1000,endMs:7000,walks:[{startMs:0,endMs:6000,fromX:300,toX:620}]};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'shot-a',leadCharacterId:'actor-a',profileHash:'profile-a',kind:'stick-man',
    durationMs:1800,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:300,y:550},scale:1,
    sourceBody:source,walks:[],gestures:[],gazes:[],expressions:[],props:[]};
  for(const startMs of [NaN,Infinity,-Infinity,-1,1000.5]){
    assert.throws(()=>bodyTrackOffsetMs(plan,startMs),/needs-view-body-phase:.*shot span/);
    assert.throws(()=>bodyRootAt(plan,startMs,0),/needs-view-body-phase:.*shot span/);
    assert.throws(()=>bodyTrackOffsetMs({...plan,sourceBody:undefined},startMs),/needs-view-body-phase:.*shot span/);
  }
  for(const durationMs of [NaN,Infinity,-1,0,1800.5])assert.throws(()=>bodyTrackOffsetMs({...plan,durationMs},1000),/needs-view-body-phase:.*shot span/);
  for(const startMs of [0,999,5201,7000]){
    assert.throws(()=>bodyTrackOffsetMs(plan,startMs),/needs-view-body-phase:.*coverage/);
    assert.throws(()=>bodyRootAt(plan,startMs,0),/needs-view-body-phase:.*coverage/);
  }
  for(const timeMs of [NaN,Infinity,-Infinity,-.001,1800.001]){
    assert.throws(()=>bodyRootAt(plan,1000,timeMs),/needs-view-body-phase:.*local shot/);
    assert.throws(()=>bodyRootAt({...plan,sourceBody:undefined},1000,timeMs),/needs-view-body-phase:.*local shot/);
  }
  assert.doesNotThrow(()=>bodyRootAt(plan,5200,1800));
  assert.equal(bodyTrackOffsetMs({...plan,sourceBody:undefined},0),0);
  assert.equal(bodyTrackOffsetMs({...plan,sourceBody:undefined},7000),0);
  assert.throws(()=>bodyTrackOffsetMs({...plan,walks:[{startMs:0,endMs:1800,fromX:300,toX:396}]},1000),/needs-view-body-phase:.*local walks/);
  assert.throws(()=>bodyRootAt({...plan,sourceBody:{...source,walks:[{...source.walks[0]!,endMs:6001}]}},1000,0),/needs-view-body-phase:.*invalid original/);
});
