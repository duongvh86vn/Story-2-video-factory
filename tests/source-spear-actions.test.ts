// DECLARED / NOT RUN. The user's tester alone may invoke these callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {originalSpearFixture} from './helpers/original-spear-fixture.js';
import type {Beat,Shot} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {HostActionSchema} from '../packages/host/schemas.js';
import {validateSpearActionClock,spearActionSlice} from '../packages/director/source-spear-action-clock.js';
import {cinematicActionGroups} from '../packages/director/actions.js';
import {sourceSpearInteractionGeometry,validateSourceSpearActions,sourceSpearReaction} from '../packages/director/source-spear-interactions.js';
import {SourceWorldSchema} from '../packages/director/source-world-schemas.js';
import {projectSourceWorldEvents,validateSourceWorld} from '../packages/director/source-world.js';
import {sampleSourceWorldPhase} from '../packages/director/source-world-phase.js';
import {validateSourceInteractionGeometry,interactionPreviewTimes} from '../packages/director/source-interactions.js';
import {hasSourceSpearActing} from '../packages/director/story-coverage.js';
import {validateSourceSpearProductionBinding} from '../packages/director/props.js';

function person(shot:Shot){return sourceActor(shot,'karo-person');}
function tool(shot:Shot){return person(shot).actions.find(a=>a.sourceSpear)!;}
function withReaction(){
  const f=originalSpearFixture('thrust'),a=tool(f.board.shots[0]!);
  const world=SourceWorldSchema.parse({version:'source-world-timeline-1',id:'forest-reaction',startMs:0,endMs:4000,events:[{id:'target-response',type:'part-motion',targetId:'target',narrationAnchor:'cue',startMs:1900,endMs:2500,motion:'translate',contactRequired:true,contactActorId:'karo-person',contactEffector:'spear-tip',spearContact:{actorId:'karo-person',...a.sourceSpear},sourceRefs:f.narration.segments.map(s=>({kind:'narration',segmentId:s.id,quote:s.text}))}]});
  for(const shot of f.board.shots){shot.cinematic!.sourceWorld=structuredClone(world);shot.visualization!.events=projectSourceWorldEvents(world,shot.startMs,shot.endMs);}
  return {...f,world};
}

test('original hold owns both palms without a fabricated contact or a local generic gesture',()=>{
  const f=originalSpearFixture(),before=hash(f);
  for(const shot of f.board.shots){const o=person(shot);validateSpearActionClock(o.performance,o.actions,shot.startMs);
    const group=cinematicActionGroups(o.actions,o.performance,shot.startMs)[0]!;
    assert.equal(group.action.type,'hold-tool');assert.equal(group.action.contactMs,undefined);assert.deepEqual(group.gestures,[]);assert.equal(group.sourceSpear!.startMs,0);assert.equal(group.sourceSpear!.endMs,4000);
    assert.equal(HostActionSchema.safeParse({...group.action,contactMs:shot.startMs}).success,false);
  }assert.equal(hash(f),before);
});
test('contact exactly at a cut belongs only to that half-open slice; recovery inherits the original event',()=>{
  const f=originalSpearFixture('thrust'),contacts=f.board.shots.flatMap(s=>tool(s).contactMs===undefined?[]:[tool(s).contactMs]);assert.deepEqual(contacts,[1800]);
  for(const shot of f.board.shots){const o=person(shot),group=cinematicActionGroups(o.actions,o.performance,shot.startMs)[0]!;
    assert.equal(group.sourceSpear!.contactMs,1800);assert.equal(group.sourceSpear!.recoverMs,2200);
    assert.equal(group.action.contactMs,shot.startMs===1800?1800:undefined);
  }
});
test('unsafe clocks, primary/secondary hand conflicts, foreign references and clock restarts reject',()=>{
  const mutations:Array<(o:ReturnType<typeof person>)=>void>=[
    o=>{o.performance.sourceSpear!.startMs=Number.MAX_SAFE_INTEGER+1;},o=>{o.actions[0]!.sourceSpear!.trackId='foreign';},
    o=>{o.actions[0]!.startMs+=1;},o=>{o.actions.push({type:'react',hand:'left',startMs:0,endMs:400});},
    o=>{o.actions.push({type:'idle',startMs:0,endMs:400});},o=>{o.performance.sourceSpear!.spears[0]!.readyMs=1800;},
    o=>{o.actions.push({type:'react',hand:'left',startMs:NaN,endMs:400});},o=>{o.actions[0]!.endMs=o.actions[0]!.startMs;},
  ];
  for(const change of mutations){const f=originalSpearFixture('thrust'),s=f.board.shots[0]!,o=person(s);change(o);assert.throws(()=>validateSpearActionClock(o.performance,o.actions,s.startMs));}
  const f=originalSpearFixture('thrust'),o=person(f.board.shots[0]!);assert.throws(()=>spearActionSlice(o.performance,o.performance.sourceSpear!.spears[0]!,NaN));
});
test('actual tip uses the independent original target while later samples retain only a strike-point reference',()=>{
  const f=originalSpearFixture('thrust'),before=hash(f);
  for(const s of f.board.shots){validateSourceSpearActions(s,f.board,f.narration);const row=sourceSpearInteractionGeometry(s,'karo-person',tool(s),f.board,f.narration),r=row.sourceSpear!;
    assert.equal(r.originalContact!.shotId,f.board.shots.find(s=>s.startMs===1800)!.id);assert.ok(r.originalContact!.errorPx<=1);
    assert.deepEqual(r.gripHands,['left','right']);assert.equal(r.sampleTargetBasis,'original-contact-point');assert.equal(r.inheritedContact,s.startMs>1800);
    assert.equal(r.contactVerified,false);assert.equal(r.motionVerified,false);assert.equal(r.productionApproval,false);
    assert.throws(()=>validateSourceSpearProductionBinding(s),/needs-source-prop-binding/);
  }assert.equal(hash(f),before);
});
test('changed cue, sibling target or independent aim fails rather than retargeting the story',()=>{
  const mutations:Array<(f:ReturnType<typeof originalSpearFixture>)=>void>=[
    f=>{tool(f.board.shots[2]!).narrationAnchor='foreign';},f=>{tool(f.board.shots[2]!).target!.partId='lila-spear';},
    f=>{for(const s of f.board.shots)person(s).performance.sourceSpear!.spears[0]!.aim.x-=5;},
    f=>{f.narration.segments[0]!.text='A different story.';},
    f=>{for(const s of f.board.shots){tool(s).target!.anchor='handle';}},
  ];for(const mutate of mutations){const f=originalSpearFixture('thrust');mutate(f);assert.throws(()=>sourceSpearInteractionGeometry(f.board.shots[0]!,'karo-person',tool(f.board.shots[0]!),f.board,f.narration));}
});
test('tip-driven original world reaction follows contact across cuts without a palm/control or recovery re-contact',()=>{
  const f=withReaction(),before=hash(f);
  for(const s of f.board.shots){validateSourceWorld(s,f.board,f.narration);const record=sourceSpearReaction(s,f.world.events[0]!,f.board,f.narration).record;assert.equal(record.contactMs,1800);}
  assert.equal(sampleSourceWorldPhase(f.world,f.board.shots[0]!.visualization!.parts,1000,2000).models.target!.control,0);
  assert.ok(sampleSourceWorldPhase(f.world,f.board.shots[0]!.visualization!.parts,1000,2250).models.target!.x>0);
  assert.equal(hash(f),before);
  for(const mutation of [(e:typeof f.world.events[number])=>{e.startMs=1800;},(e:typeof f.world.events[number])=>{e.contactHands=['left','right'];},(e:typeof f.world.events[number])=>{e.spearContact!.actorId='lila-person';}]){
    const e=structuredClone(f.world.events[0]!);mutation(e);assert.throws(()=>sourceSpearReaction(f.board.shots[0]!,e,f.board,f.narration));
  }
});
test('review recomputes source geometry and samples true ready/contact/recovery phases, including reverse inspection',()=>{
  const f=originalSpearFixture('thrust');
  for(const s of [...f.board.shots].reverse()){
    const people=[s.cinematic!.actorScene!.primary!.id,...s.cinematic!.actorScene!.supporting.map(a=>a.character.id)];
    const rows=people.map(id=>sourceSpearInteractionGeometry(s,id,sourceActor(s,id).actions[0]!,f.board,f.narration));
    validateSourceInteractionGeometry(s,f.board,f.narration,rows);const times=interactionPreviewTimes(s,rows,16.67);assert.ok(times.every(t=>t>=s.startMs&&t<s.endMs));
    if(s.startMs===1800)assert.ok(times.includes(1800));if(s.startMs===2200)assert.ok(times.includes(2200));
    const forged=structuredClone(rows);forged[0]!.sourceSpear!.tip.x+=2;assert.throws(()=>validateSourceInteractionGeometry(s,f.board,f.narration,forged));
    assert.throws(()=>validateSourceInteractionGeometry(s,f.board,f.narration,[]));
  }
});
test('narrated tool holding and thrusting require actual original action coverage, not passive actor presence',()=>{
  const f=originalSpearFixture('thrust'),s=f.board.shots[0]!,expected=s.cinematic!.sceneIntent!.acting!.find(a=>a.participantId==='karo-person')!,beat={startMs:0,endMs:4000} as Beat;
  assert.equal(hasSourceSpearActing(expected,person(s).actions,s,beat,f.narration,f.board),true);
  assert.equal(hasSourceSpearActing(expected,[{type:'idle',startMs:s.startMs,endMs:s.endMs}],s,beat,f.narration,f.board),false);
  assert.equal(hasSourceSpearActing({...expected,operation:'hold-tool'},person(s).actions,s,beat,f.narration,f.board),false);
});
