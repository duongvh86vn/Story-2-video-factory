// DECLARED / NOT RUN. User model owns parser/normalizer/rig/runtime/film QA.
// No factory, schema instance or production validator is called at module scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ConfigSchema} from '../packages/core/config.js';
import type {ActorDefinition} from '../packages/actors/schemas.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {topicActorModel,topicCastModels} from '../packages/topics/cast-model.js';
import {applyTopicCast,validateCertifiedTopicCast,topicAppearance,supportingTopicAppearance,topicContext,PREHISTORIC_TOPIC_VERSION} from '../packages/topics/prehistoric-life.js';
import {readTopicProductionRelease,certifiedTopicDefault} from '../packages/topics/production-release.js';

function person(id:string,appearance:ActorDefinition['appearance']):ActorDefinition{
  return {id,name:'Input name '+id,role:'input story participant',identity:'illustrative',kind:'stick-man',appearance,
    sourceRefs:[{kind:'narration',segmentId:'cue-'+id,quote:'Original utterance from '+id}]};
}
function paired(a:ActorDefinition,b:ActorDefinition):Storyboard{
  return {shots:[0,1].map(i=>{const primary=i?b:a,support=i?a:b;
    return {id:'original-'+i,startMs:i*1000,endMs:(i+1)*1000,cinematic:{actorScene:{primary:structuredClone(primary),speakingSegmentIds:['cue-'+primary.id],supporting:[{character:structuredClone(support),speakingSegmentIds:['cue-'+support.id],performance:{leadCharacterId:support.id,sourceHead:{ownerId:support.id,startMs:0,endMs:2000}}}]},performance:{leadCharacterId:primary.id,sourceHead:{ownerId:primary.id,startMs:0,endMs:2000}}}};
  })} as unknown as Storyboard;
}
const config=()=>ConfigSchema.parse({topic:{id:'prehistoric-life'}});

test('custom source-person IDs and utterance owners survive visual normalization and primary/supporting camera swaps',()=>{
  const b=paired(person('mina-source',topicAppearance('lila')),person('toma-source',topicAppearance('karo'))),before=hash(b);
  applyTopicCast(b,config());assert.equal(hash(b),before);
  assert.deepEqual(topicCastModels(b).map(r=>[r.character.id,r.model]),[['mina-source','lila'],['toma-source','karo'],['toma-source','karo'],['mina-source','lila']]);
});

test('different source people may share artwork without sharing IDs, names or speaker cues',()=>{
  const b=paired(person('parent-source',topicAppearance('karo')),person('friend-source',topicAppearance('karo'))),before=hash(b);
  applyTopicCast(b,config());assert.equal(hash(b),before);
  assert.deepEqual(topicCastModels(b).map(r=>r.model),['karo','karo','karo','karo']);
});

test('supporting male/female visual models retain their own face identity when either person is camera primary',()=>{
  const b=paired(person('villager-man',supportingTopicAppearance('prehistoric-male-bald')),person('villager-woman',supportingTopicAppearance('prehistoric-female-haired'))),before=hash(b);
  applyTopicCast(b,config());assert.equal(hash(b),before);
  assert.deepEqual(topicCastModels(b).map(r=>r.model),['prehistoric-male-bald','prehistoric-female-haired','prehistoric-female-haired','prehistoric-male-bald']);
});

test('a custom person without explicit visual selection is not assigned from name, gender or camera position',()=>{
  const actor=person('woman-called-Lila',topicAppearance('lila'));delete actor.appearance.characterVariant;
  assert.throws(()=>topicActorModel(actor),/requires an explicit visual/);
  const b=paired(person('mina-source',topicAppearance('lila')),actor),before=hash(b);
  assert.throws(()=>applyTopicCast(b,config()),/requires an explicit visual/);assert.equal(hash(b),before);
  actor.appearance.supportingModel='foreign-model' as ActorDefinition['appearance']['supportingModel'];
  assert.throws(()=>topicActorModel(actor),/unknown supporting visual model/);
});

test('a later scene changing the same person model rejects the entire cast before any appearance update',()=>{
  const b=paired(person('mina-source',topicAppearance('lila')),person('toma-source',topicAppearance('karo')));
  b.shots[1]!.cinematic!.actorScene!.primary!.appearance=topicAppearance('lila');
  const before=hash(b);assert.throws(()=>applyTopicCast(b,config()),/changed its own visual model/);assert.equal(hash(b),before);
});

test('two visible cast slots cannot alias the same source person',()=>{
  const a=person('same-source-person',topicAppearance('karo')),b=paired(a,a),before=hash(b);
  assert.throws(()=>applyTopicCast(b,config()),/two visible cast slots/);assert.equal(hash(b),before);
});

test('legacy principal IDs keep their old model meaning and the authoring contract labels model records explicitly',()=>{
  const l=person('lila',topicAppearance('lila')),k=person('karo',topicAppearance('karo'));
  delete l.appearance.characterVariant;assert.equal(topicActorModel(l),'lila');
  assert.equal(topicActorModel(k),'karo');
  assert.throws(()=>topicActorModel({...k,appearance:topicAppearance('lila')}),/another actor\/model/);
  assert.throws(()=>topicActorModel({...l,appearance:supportingTopicAppearance('prehistoric-female-haired')}),/cannot select a supporting/);
  const context=topicContext(config())!;assert.ok(context.cast.every(c=>c.scope==='visual-model-only'&&c.id===c.modelId));
  assert.ok(context.acting.includes('Preserve each sourced participant ID'));
});

test('actual current QA ledger certifies custom source IDs by their own artwork and validates locked appearances without mutation',t=>{
  const file=process.env.STORY_FACTORY_QA_LEDGER;if(!file){t.skip('Supply a real current ledger; SKIP is not acceptance');return;}
  assert.ok(path.isAbsolute(file));const verified=readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION);
  const b=paired(person('mina-source',certifiedTopicDefault(verified,'lila')),person('toma-source',certifiedTopicDefault(verified,'karo'))),before=structuredClone(b),cfg=ConfigSchema.parse({topic:{id:'prehistoric-life',production_release:file}});
  validateCertifiedTopicCast(b,cfg);applyTopicCast(b,cfg);assert.deepEqual(b,before);
  b.shots[1]!.cinematic!.actorScene!.supporting[0]!.character.appearance.strokeWidth+=.001;
  assert.throws(()=>validateCertifiedTopicCast(b,cfg),/not certified/);
});
