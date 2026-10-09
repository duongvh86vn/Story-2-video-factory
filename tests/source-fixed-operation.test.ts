// DECLARED ONLY, NOT RUN. Human's model owns runtime, geometry and film checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import type {Beat} from '../packages/core/schemas.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {sourceFixedOperation} from '../packages/director/source-fixed-operation.js';
import {sourceInteractionDescriptor,sourceInteractionGeometry,validateSourceInteractionGeometry,interactionPreviewTimes} from '../packages/director/source-interactions.js';
import {SourceWorldSchema,type SourceWorldEvent} from '../packages/director/source-world-schemas.js';
import {SOURCE_WORLD_VERSION} from '../packages/director/source-world-reference.js';
import {projectSourceWorldEvents,validateSourceWorld} from '../packages/director/source-world.js';
import {validateActorContinuity} from '../packages/actors/model.js';
import {validatePerformanceContinuity} from '../packages/director/continuity.js';
import {validateCinematicEdit} from '../apps/server/cinematic.js';
import {validatePropBindings} from '../packages/director/props.js';
import {hasSourceManipulationActing} from '../packages/director/story-coverage.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

function fixture(anchor:'center'|'handle'='center',cuts=[1000,2300,4100,5000]){return sourceInteractionFixture(false,cuts,anchor);}
function owner(f:ReturnType<typeof fixture>,index=0,id='lila-person'){return sourceActor(f.board.shots[index]!,id);}
function descriptor(f:ReturnType<typeof fixture>,index=0,id='lila-person'){
  return sourceInteractionDescriptor(f.board.shots[index]!,id,owner(f,index,id).actions[0]!,f.board,f.narration);
}
function world(f:ReturnType<typeof fixture>,events:SourceWorldEvent[]){
  const timeline=SourceWorldSchema.parse({version:SOURCE_WORLD_VERSION,id:'fixed-original-world',startMs:1000,endMs:5000,events});
  for(const s of f.board.shots){s.cinematic!.sourceWorld=structuredClone(timeline);s.visualization!.events=projectSourceWorldEvents(timeline,s.startMs,s.endMs);}
}
function passive(f:ReturnType<typeof fixture>,id:string,startMs:number,endMs:number,motion:SourceWorldEvent['motion']='none'):SourceWorldEvent{
  return {id,type:motion==='none'?'reveal':'part-motion',targetId:'stone',startMs,endMs,motion,contactRequired:false,narrationAnchor:'cue',sourceRefs:[f.ref]};
}

test('fixed center/explicit handle keep each actual person and original contact/recovery through lead swaps',()=>{
  for(const anchor of ['center','handle'] as const){const f=fixture(anchor),before=hash(f);
    for(let i=0;i<3;i++)for(const id of ['lila-person','karo-person']){
      const d=descriptor(f,i,id);assert.equal(d.actorId,id);assert.equal(d.targetKind,'fixed-model');assert.equal(d.propId,undefined);
      assert.equal(d.operation,'operate');assert.equal(d.contactMs,2000);assert.equal(d.recoveryMs,3800);
      if(i===1){assert.equal(d.entryPhase,'held');assert.equal(d.inheritedContact,true);assert.equal(owner(f,i,id).actions[0]!.contactMs,undefined);}
      if(i===2)assert.equal(d.entryPhase,'recovery');
    }
    assert.equal(hash(f),before);
  }
});

test('fixed geometry measures own palm against authored anchor, keeps real original contact and releases during recovery',()=>{
  for(const anchor of ['center','handle'] as const){const f=fixture(anchor),before=hash(f);
    for(let i=0;i<3;i++){const shot=f.board.shots[i]!,records=['lila-person','karo-person'].map(id=>sourceInteractionGeometry(shot,id,owner(f,i,id).actions[0]!,f.board,f.narration));
      validateSourceInteractionGeometry(shot,f.board,f.narration,records);
      for(const r of records){assert.ok(r.sourceManipulation!.originalContact.errorPx<=1);assert.ok(r.sourceManipulation!.originalContact.constraintErrorPx<=1);
        assert.equal(r.sourceManipulation!.originalContact.shotId,f.board.shots[0]!.id);assert.equal(r.sourceManipulation!.contactVerified,false);assert.equal(r.sourceManipulation!.motionVerified,false);
        if(i===1){assert.ok(r.errorPx<=1);assert.ok(r.sourceManipulation!.gripConstraintErrorPx!<=1);}
        if(i===2){assert.equal(r.sourceManipulation!.phase,'recovery');assert.equal(r.sourceManipulation!.gripConstraintErrorPx,undefined);assert.equal(r.contactMs,undefined);}
      }
      const changed=structuredClone(records);changed[0]!.sourceManipulation!.originalContact.target.x+=10;
      assert.throws(()=>validateSourceInteractionGeometry(shot,f.board,f.narration,changed),/canonical original/);
    }assert.equal(hash(f),before);
  }
});

test('unknown handles, changed grip, label targets and the other person hand cannot supply fixed contact',()=>{
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{delete f.board.shots[0]!.cinematic!.artDirection!.models[0]!.handleAnchor;},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models[0]!.handleAnchor!.x+=.1;},
    f=>{owner(f).actions[0]!.target!.anchor='label';},
    f=>{owner(f).actions[0]!.hand='left';},
    f=>{owner(f).actions[0]!.target!.partId='clay-panel';},
  ];
  for(const mutate of mutations){const f=fixture('handle');mutate(f);assert.throws(()=>descriptor(f));}
  const missing=fixture();missing.board.shots[0]!.host=undefined;
  assert.throws(()=>validateSourceInteractionGeometry(missing.board.shots[0]!,missing.board,missing.narration,[]),/own action record/);
  const empty=fixture();for(const s of empty.board.shots){s.host!.actions=[];s.cinematic!.actorScene!.supporting.forEach(a=>{a.actions=[];});}
  assert.throws(()=>validateSourceInteractionGeometry(empty.board.shots[0]!,empty.board,empty.narration,[]),/source-action/);
});

test('fixed operation needs complete person/model/art/stage/cue history and full sourced contact statement',()=>{
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{f.board.shots.splice(1,1);},f=>{f.board.shots[1]!.cinematic!.artDirection!.models[0]!.svg='<circle r="8"/>';},
    f=>{f.board.shots[1]!.visualization!.parts[0]!.x+=.01;},f=>{owner(f,1).performance.stage.width+=1;},
    f=>{f.narration.segments[0]!.text='An unrelated sentence.';},f=>{f.narration.segments[0]!.endMs=3000;},
    f=>{for(const s of f.board.shots)s.cinematic!.sceneIntent!.acting=[];},
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>descriptor(f));}
  const f=fixture();assert.throws(()=>sourceFixedOperation(f.board.shots[0]!,'lila-person',owner(f).actions[0]!,undefined,f.narration),/authoritative/);
  assert.throws(()=>sourceFixedOperation(f.board.shots[0]!,'foreign',owner(f).actions[0]!,f.board,f.narration),/visible person/);
});

test('fixed target preserves visibility and checks rotation history from before original contact',()=>{
  const visible=fixture();world(visible,[passive(visible,'reveal',1500,1700)]);assert.doesNotThrow(()=>descriptor(visible,1));
  const hidden=fixture();world(hidden,[passive(hidden,'late-reveal',2100,2200)]);assert.throws(()=>descriptor(hidden),/not visible/);
  const rotated=fixture();world(rotated,[passive(rotated,'prior-rotation',1400,1800,'rotate')]);assert.throws(()=>descriptor(rotated,1),/prior rotation/);
  const translated=fixture();world(translated,[passive(translated,'moving-grip',1900,2500,'translate')]);assert.throws(()=>descriptor(translated),/cannot move/);
  const restored=fixture();world(restored,[passive(restored,'earlier-round-trip',1400,1800,'translate')]);assert.doesNotThrow(()=>descriptor(restored,1));
  const local=fixture();local.board.shots[1]!.visualization!.events=[passive(local,'local-reset',2400,2600)];assert.throws(()=>descriptor(local,1),/complete original world history/);
});

test('implicit flow rotation and stale original event projections cannot keep a fixed anchor',()=>{
  const f=fixture();for(const s of f.board.shots)s.visualization!.parts[0]!.kind='gear';
  world(f,[{...passive(f,'flow',1400,1800),type:'flow',targetId:'clay-panel',relationTo:'stone'}]);
  assert.throws(()=>descriptor(f,1),/implicit flow rotation/);
  const changed=fixture();world(changed,[passive(changed,'reveal',1500,1700)]);changed.board.shots[0]!.visualization!.events[0]!.startMs+=1;
  assert.throws(()=>descriptor(changed),/exact original world projections/);
});

test('original fixed reaction follows actual contact and finishes before canonical recovery',()=>{
  const f=fixture(),d=descriptor(f),g=owner(f).performance.sourceManipulation!.gestures[0]!;
  const event:SourceWorldEvent={id:'contact-response',type:'highlight',targetId:'stone',startMs:d.contactMs+1,endMs:d.recoveryMs!,motion:'none',contactRequired:true,contactActorId:'lila-person',contactHands:['right'],narrationAnchor:'cue',sourceRefs:[f.ref],contacts:[{actorId:'lila-person',sourceId:d.sourceId,gestureId:g.id}]};
  world(f,[event]);for(const s of f.board.shots)assert.doesNotThrow(()=>validateSourceWorld(s,f.board,f.narration));
  world(f,[{...event,endMs:d.recoveryMs!+1}]);assert.throws(()=>validateSourceWorld(f.board.shots[0]!,f.board,f.narration),/held contact before recovery/);
});

test('contact/recovery evidence belongs to the exact camera boundary and inherited contact supplies sourced coverage',()=>{
  const f=fixture('center',[1000,2000,3800,5000]),all:number[]=[];
  for(let i=0;i<3;i++){const s=f.board.shots[i]!,r=sourceInteractionGeometry(s,'lila-person',owner(f,i).actions[0]!,f.board,f.narration);
    const times=interactionPreviewTimes(s,[r],17);assert.ok(times.every(t=>t>=s.startMs&&t<s.endMs));all.push(...times);
  }
  for(const at of [1983,2000,2017,3783,3800,3817])assert.ok(all.includes(at));
  assert.equal(owner(f,1).actions[0]!.contactMs,2000);assert.equal(owner(f,2).actions[0]!.contactMs,undefined);
  const s=f.board.shots[1]!,expected=s.cinematic!.sceneIntent!.acting![0]!,beat={id:'beat',startMs:s.startMs,endMs:s.endMs,sceneIntent:s.cinematic!.sceneIntent} as Beat;
  assert.equal(hasSourceManipulationActing(expected,owner(f,1).actions,s,beat,f.narration,f.board),true);
});

test('continuity follows persons through role swaps and declared roots must match the current primary path',()=>{
  const f=fixture();assert.doesNotThrow(()=>validateActorContinuity(f.board));for(const s of f.board.shots)assert.doesNotThrow(()=>validatePerformanceContinuity(s));
  for(const mutate of [
    (v:ReturnType<typeof fixture>)=>{owner(v,1).performance.root.x+=1;},
    (v:ReturnType<typeof fixture>)=>{owner(v,1).performance.stage.groundY+=1;},
    (v:ReturnType<typeof fixture>)=>{v.board.shots[0]!.cinematic!.actorScene!.continuity='continuous';},
    (v:ReturnType<typeof fixture>)=>{v.board.shots[1]!.startMs+=1;},
    (v:ReturnType<typeof fixture>)=>{owner(v,1).character.name='Another person';},
  ]){const changed=fixture();mutate(changed);assert.throws(()=>validateActorContinuity(changed.board));}
  f.board.shots[1]!.cinematic!.continuity.entry.x+=1;assert.throws(()=>validatePerformanceContinuity(f.board.shots[1]!),/continuity disagrees/);
});

test('API retains production gates; sibling fixed artwork/grip/cue edits invalidate publication while preserving narration',()=>{
  const f=fixture('handle'),s=f.board.shots[1]!,voice=hash(f.narration),before=descriptor(f,1),binding=rigSpeechPublicationBinding(s,f.narration,f.board);
  assert.throws(()=>validatePropBindings(s,f.board,f.narration),/needs-source-prop-binding/);
  assert.throws(()=>validateCinematicEdit(f.board,f.config,undefined,f.narration),/needs-source-prop-binding/);
  const changed=structuredClone(f.board);changed.shots[2]!.cinematic!.artDirection!.models[0]!.handleAnchor!.x+=.1;
  assert.throws(()=>assertRigSpeechPublicationBinding(s,f.narration,changed,binding));
  assert.equal(hash(f.narration),voice);assert.equal(before.targetKind,'fixed-model');assert.equal(before.propId,undefined);
});

test('API local continuity accepts role swaps by person and rejects forged primary roots or actual person teleports',()=>{
  // Isolate API continuity from the still-pending original source production
  // gate. This engineering board is not a replacement for the sourced film.
  const f=fixture();
  for(const s of f.board.shots){const c=s.cinematic!;
    for(const id of ['lila-person','karo-person']){const o=sourceActor(s,id);delete o.performance.sourceBody;delete o.performance.sourceManipulation;
      o.actions.splice(0,o.actions.length,{type:'idle',startMs:s.startMs,endMs:s.endMs});}
    c.continuity.models=s.visualization!.parts.map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));
  }
  assert.doesNotThrow(()=>validateCinematicEdit(f.board,f.config));
  const forged=structuredClone(f.board);forged.shots[1]!.cinematic!.continuity.entry.x+=10;
  assert.throws(()=>validateCinematicEdit(forged,f.config),/continuity disagrees/);
  const teleport=structuredClone(f.board);sourceActor(teleport.shots[1]!,'lila-person').performance.root.x+=10;
  assert.throws(()=>validateCinematicEdit(teleport,f.config),/continuous|position/);
  const legacy=structuredClone(f.board);for(const s of legacy.shots)delete s.cinematic!.actorScene;
  assert.throws(()=>validateCinematicEdit(legacy,f.config),/continuity must continue/);
});
