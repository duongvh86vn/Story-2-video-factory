// DECLARED ONLY, NOT RUN. Human tester owns geometry, runtime and film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {ShotSchema,type Shot,type Storyboard,type Narration} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechInputIdentity} from '../packages/actors/speech-clock.js';
import {ConfigSchema} from '../packages/core/config.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../packages/animation/native-contact-arm.js';
import {samplePhysicalPerformance} from '../packages/animation/compiler.js';
import {projectManipulationAction} from '../packages/director/source-manipulation-actions.js';
import {sourceBoundPropFrame,validateSourcePropBindings} from '../packages/director/source-prop-binding.js';
import {sourcePropBindingIdentity} from '../packages/director/source-prop-identity.js';
import {boundProp,modelEntryParts,modelExitParts,validatePropBindings} from '../packages/director/props.js';
import {stageModels} from '../packages/director/models.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {validateModelContinuity,directCinematicShot} from '../packages/director/index.js';
import {validateCinematicEdit} from '../apps/server/cinematic.js';
import type {Beat} from '../packages/core/schemas.js';

/** Full original actors and objects, constructed only within test callbacks.
 * Calibration timings are test data, not a prescribed production story. */
import {sourceInteractionFixture as fixture} from './fixtures/source-interaction-fixture.js';

test('complete original person/entity/art/evidence binding survives two actual owners and primary/supporting camera swaps',()=>{
  const f=fixture(),before=hash(f);
  for(const shot of f.board.shots){validateSourcePropBindings(shot,f.board,f.narration);assert.equal(boundProp(shot,shot.cinematic!.propBindings[1]!).id,'karo-person');}
  assert.equal(hash(f),before);
});
test('entry/exit uses actual carried/placed geometry at original source time, never the final destination for a held object',()=>{
  const f=fixture(),before=hash(f);
  for(const shot of f.board.shots)for(const binding of shot.cinematic!.propBindings){
    for(const time of [0,shot.endMs-shot.startMs]){const at=sourceBoundPropFrame(shot,binding,time,f.board),global=shot.startMs+time;
      const complete=structuredClone(shot);const full=f.full.find(p=>p.leadCharacterId===binding.ownerId)!;
      const originalClock={...at.clock,startMs:1000,endMs:5000};
      const original=samplePhysicalPerformance(full,actorProfile(at.owner.character!),global-1000,originalClock);
      assert.deepEqual(at.state,original.props[binding.propId]);
      const parts=time?modelExitParts(shot,f.board):modelEntryParts(shot,f.board),part=parts.find(p=>p.id===binding.partId)!;
      assert.equal(part.x,at.state.point.x/full.stage.width);assert.equal(part.y,at.state.point.y/full.stage.height);assert.equal(hash(complete),hash(shot));
    }
  }
  const shot=f.board.shots[1]!,binding=shot.cinematic!.propBindings[1]!,frame=sourceBoundPropFrame(shot,binding,0,f.board);
  assert.equal(frame.state.attached,true);assert.notDeepEqual(frame.state.point,frame.owner.prop.destination);
  for(let i=1;i<3;i++)validateModelContinuity(f.board.shots[i-1],f.board.shots[i]!,f.board);
  assert.equal(hash(f),before);
});
test('drop flight and landing in a later camera slice keep actual original release geometry',()=>{
  const f=fixture(true),shot=f.board.shots[2]!,binding=shot.cinematic!.propBindings[1]!;
  validateSourcePropBindings(shot,f.board,f.narration);
  const a=sourceBoundPropFrame(shot,binding,0,f.board),b=sourceBoundPropFrame(shot,binding,shot.endMs-shot.startMs,f.board);
  assert.equal(a.state.attached,false);assert.notDeepEqual(a.state.point,a.owner.prop.destination);assert.deepEqual(b.state.point,b.owner.prop.destination);
  assert.equal(modelEntryParts(shot,f.board).find(p=>p.id==='bowl')!.y,a.state.point.y/440);
});
test('missing source slice, implicit/foreign owner, changed entity/art/source/size/target or ambiguous props cannot pass original binding',()=>{
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{f.board.shots.splice(1,1);},f=>{delete f.board.shots[1]!.cinematic!.propBindings[1]!.ownerId;},
    f=>{f.board.shots[1]!.cinematic!.propBindings[1]!.ownerId='foreign-person';},
    f=>{f.board.shots[1]!.visualization!.parts[1]!.width+=.01;},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models[1]!.svg='<circle r="10" fill="#FFFFFF"/>';},
    f=>{f.board.shots[1]!.cinematic!.propBindings[1]!.sourceRefs=[{...f.ref,quote:'invented bowl'}];},
    f=>{f.board.shots[1]!.host!.actions[0]!.target!.partId='basket';},
    f=>{f.board.shots[1]!.cinematic!.propBindings.push(structuredClone(f.board.shots[1]!.cinematic!.propBindings[0]!));},
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>validateSourcePropBindings(f.board.shots[0]!,f.board,f.narration));}
  const f=fixture();assert.throws(()=>sourceBoundPropFrame(f.board.shots[0]!,f.board.shots[0]!.cinematic!.propBindings[0]!,0,undefined),/complete storyboard/);
});
test('binding requires the actual complete original narration statement and contact/release clock, not a replacement cue or rewritten line',()=>{
  for(const mutate of [ (f:ReturnType<typeof fixture>)=>{f.narration.segments[0]!.text='An unrelated forest scene.';},(f:ReturnType<typeof fixture>)=>{f.narration.segments[0]!.startMs=2500;},(f:ReturnType<typeof fixture>)=>{f.narration.segments[0]!.endMs=3000;},(f:ReturnType<typeof fixture>)=>{f.board.shots[1]!.host!.actions[0]!.narrationAnchor='invented';},(f:ReturnType<typeof fixture>)=>{for(const shot of f.board.shots)shot.cinematic!.sceneIntent!.acting=[];} ]){
    const f=fixture();mutate(f);assert.throws(()=>validateSourcePropBindings(f.board.shots[0]!,f.board,f.narration));
  }
});
test('sibling model/role/cue/art/action edits change the source visual cache identity while preserving narration bytes',()=>{
  const f=fixture(),shot=f.board.shots[0]!,original=sourcePropBindingIdentity(shot,f.board,f.narration),voiceHash=hash(f.narration);
  const changed=structuredClone(f.board);changed.shots[2]!.cinematic!.artDirection!.models[1]!.svg='<circle r="11"/>';
  assert.notEqual(sourcePropBindingIdentity(shot,changed,f.narration)!.fingerprint,original!.fingerprint);
  assert.notDeepEqual(rigSpeechInputIdentity(shot,f.narration,changed),rigSpeechInputIdentity(shot,f.narration,f.board));
  assert.equal(hash(f.narration),voiceHash);assert.equal(original!.scope,'structural-cache-input-only');assert.equal(original!.approved,false);
});
test('real source clock and binding candidates still cannot bypass unfinished world/effect/interaction/coverage production or offline reseeding',()=>{
  const f=fixture(),shot=f.board.shots[0]!,before=hash(f);validateSourcePropBindings(shot,f.board,f.narration);
  assert.throws(()=>validatePropBindings(shot,f.board,f.narration),/source event\/effect\/interaction\/coverage/);
  assert.throws(()=>validateCinematicEdit(f.board,f.config,undefined,f.narration),/needs-source-prop-binding/);
  assert.throws(()=>directCinematicShot(shot,{} as Beat,f.profiles[0]!,f.config),/cannot be replaced by an offline/);
  assert.ok(actorViewActingClock(f.board,shot,'karo-person')!.manipulationMotion);assert.equal(hash(f),before);
});
