// DECLARED / NOT RUN. Implementation agents only typecheck this file.
// Positive intake requires the user's real current QA ledger; SKIP is not PASS.
import test from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {temporary} from './support.js';
import {ConfigSchema} from '../packages/core/config.js';
import {SettingsPatchSchema} from '../packages/orchestrator/settings.js';
import {prepareCinematicEnvironments} from '../packages/stage/index.js';
import {hash} from '../packages/core/utils.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {TopicProductionReleaseSchema,readTopicProductionRelease,topicReleaseCodeFingerprint,TOPIC_RELEASE_CODE_ROOTS,certifiedTopicDefault,certifiedTopicAppearance,topicProductionReleaseDescription} from '../packages/topics/production-release.js';
import {PREHISTORIC_TOPIC_VERSION,prehistoricReadiness,requireTopicProductionReady,topicReadiness,topicNarrativeContext,applyTopicCast,validateCertifiedTopicCast} from '../packages/topics/prehistoric-life.js';

const cfg=(file?:string|null)=>ConfigSchema.parse({topic:{id:'prehistoric-life',production_release:file},presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1920,height:1080,fps:60}}});
function realLedger(t:TestContext){const file=process.env.STORY_FACTORY_QA_LEDGER;if(!file){t.skip('Supply a real current QA ledger; SKIP does not establish release acceptance');return null;}assert.ok(path.isAbsolute(file));return file;}
const board=(appearance:ReturnType<typeof certifiedTopicDefault>)=>({shots:[{id:'original-shot',cinematic:{actorScene:{primary:{id:'lila',name:'Original source name',role:'source participant',identity:'illustrative',kind:'stick-man',sourceRefs:[{kind:'narration',segmentId:'cue-original',quote:'original source'}],appearance},supporting:[],speakingSegmentIds:['cue-original']}}}]} as unknown as Storyboard);

test('unconfigured visual topic remains blocked; status never claims final production acceptance',()=>{
  assert.throws(()=>requireTopicProductionReady(cfg()),/needs-art-direction/);
  assert.equal(topicReadiness(cfg()).preflightReady,false);assert.equal(topicReadiness(cfg()).productionReady,false);
  assert.equal(prehistoricReadiness.productionReady,false);assert.equal(topicProductionReleaseDescription.productionApproval,false);
  assert.equal(topicProductionReleaseDescription.productionRig,null);assert.deepEqual(topicProductionReleaseDescription.availableBanks,[]);
});
test('disabled topic and clearing an optional ledger do not become an approval operation',()=>{
  const disabled=ConfigSchema.parse({});assert.equal(requireTopicProductionReady(disabled),null);
  assert.equal(topicReadiness(disabled).status,'not-selected');
  assert.equal(SettingsPatchSchema.parse({topic:{id:'prehistoric-life',production_release:null}}).topic?.production_release,null);
  assert.deepEqual(SettingsPatchSchema.parse({topic:{production_release:null}}).topic,{production_release:null});
  assert.throws(()=>requireTopicProductionReady(cfg(null)),/needs-art-direction/);
});
test('configuration requires an absolute local ledger path',()=>{
  for(const file of ['qa/release.json','https://example.invalid/qa.json','bad\0path'])assert.throws(()=>cfg(file));
});
test('missing, malformed, directory and oversized ledgers fail closed before provider work',async t=>{
  const temp=await temporary(t);assert.throws(()=>readTopicProductionRelease(path.join(temp,'missing.json'),PREHISTORIC_TOPIC_VERSION),/needs-art-direction/);
  assert.throws(()=>readTopicProductionRelease(temp,PREHISTORIC_TOPIC_VERSION),/needs-art-direction/);
  const file=path.join(temp,'invalid.json');await fs.writeFile(file,'{');assert.throws(()=>readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION),/needs-art-direction/);
  await fs.writeFile(file,' '.repeat(1024*1024+1));assert.throws(()=>readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION),/needs-art-direction/);
});
test('code authority includes core/pipeline/stage and prompts, using actual source bytes',async t=>{
  const temp=await temporary(t);for(const folder of TOPIC_RELEASE_CODE_ROOTS)await fs.mkdir(path.join(temp,folder),{recursive:true});
  const code=path.join(temp,'packages','probe.ts'),prompt=path.join(temp,'library/prompts','probe.md');
  await fs.writeFile(code,'// first\n');await fs.writeFile(prompt,'first\n');const first=topicReleaseCodeFingerprint(temp);
  await fs.writeFile(code,'// second\n');const second=topicReleaseCodeFingerprint(temp);assert.notEqual(second,first);
  await fs.writeFile(prompt,'second\n');assert.notEqual(topicReleaseCodeFingerprint(temp),second);
});
test('appearance/ledger changes keep narrative context; language/content/voice are separate cache authorities',()=>{
  const first=cfg(path.resolve('qa-a.json')),second=cfg(path.resolve('qa-b.json'));
  assert.equal(hash(topicNarrativeContext(first)),hash(topicNarrativeContext(second)));
  assert.notEqual(hash(first.topic),hash(second.topic));
});
test('actual current QA ledger binds reports, MP4/probe/source bytes and scoped defaults',t=>{
  const file=realLedger(t);if(!file)return;
  const verified=readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION);
  assert.ok(Object.isFrozen(verified));assert.ok(Object.isFrozen(verified.release));
  assert.equal(requireTopicProductionReady(cfg(file)),verified.fingerprint);
  const delivery=cfg(file);delivery.rendering.final.fps=30;assert.equal(requireTopicProductionReady(delivery),verified.fingerprint);
  assert.equal(topicReadiness(cfg(file)).preflightReady,true);assert.equal(topicReadiness(cfg(file)).productionReady,false);
  assert.deepEqual(certifiedTopicAppearance(verified,'lila',certifiedTopicDefault(verified,'lila')),certifiedTopicDefault(verified,'lila'));
  assert.throws(()=>certifiedTopicDefault({...verified},'lila'),/freshly verified/);
});
test('actual certified principal keeps original participant identity and cues; locked cast must match too',t=>{
  const file=realLedger(t);if(!file)return;const verified=readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION),b=board(certifiedTopicDefault(verified,'lila')),before=hash(b);
  applyTopicCast(b,cfg(file));assert.equal(hash(b),before);validateCertifiedTopicCast(b,cfg(file));
  const actor=b.shots[0]!.cinematic!.actorScene!.primary!;actor.appearance.strokeWidth+=.001;
  assert.throws(()=>validateCertifiedTopicCast(b,cfg(file)),/not certified/);
  assert.equal(actor.name,'Original source name');assert.deepEqual(b.shots[0]!.cinematic!.actorScene!.speakingSegmentIds,['cue-original']);
});
test('actual ledger cannot certify stale source, NOT RUN evidence or missing art/motion coverage',async t=>{
  const source=realLedger(t);if(!source)return;const temp=await temporary(t),current=JSON.parse(await fs.readFile(source,'utf8'));
  const stale=path.join(temp,'stale.json');await fs.writeFile(stale,JSON.stringify({...current,sourceVersion:'V1'}));assert.throws(()=>readTopicProductionRelease(stale,PREHISTORIC_TOPIC_VERSION),/current visual source/);
  const unrun=structuredClone(current);unrun.evidence[0].status='NOT RUN';assert.equal(TopicProductionReleaseSchema.safeParse(unrun).success,false);
  const unaccepted=structuredClone(current);unaccepted.acceptance.accepted=false;assert.equal(TopicProductionReleaseSchema.safeParse(unaccepted).success,false);
});
test('configured visual ledger does not certify an imported sprite catalogue or an absent QA file',()=>{
  const file=path.resolve('not-an-accepted-ledger.json'),sprite=cfg(file);sprite.presentation.actor_renderer='sprite';assert.throws(()=>requireTopicProductionReady(sprite),/sprite motion catalogue/);
  assert.throws(()=>requireTopicProductionReady(cfg(file)),/needs-art-direction/);
});
test('actual ledger scenery rejects missing, wrong lighting or unknown plate with no catalogue fallback',async t=>{
  const file=realLedger(t);if(!file)return;const temp=await temporary(t),verified=readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION),e=verified.release.environments[0]!;
  for(const lighting of [undefined,e.lighting==='day'?'night':'day']){
    const b={shots:[{id:'original-scene',assetNeeds:[],cinematic:{setting:e.setting,environmentAssetId:e.id,environmentLighting:lighting}}]} as unknown as Storyboard;
    await assert.rejects(prepareCinematicEnvironments(temp,b,new Set(),cfg(file)),/setting and environmentLighting/);
    assert.deepEqual(b.shots[0]!.assetNeeds,[]);
  }
  const b={shots:[{id:'original-scene',assetNeeds:[],cinematic:{setting:e.setting,environmentAssetId:'not-tested',environmentLighting:e.lighting}}]} as unknown as Storyboard;
  await assert.rejects(prepareCinematicEnvironments(temp,b,new Set(),cfg(file)),/needs-art-direction/);
});
test('actual ledger refuses changed source receipts; no accepted fixture or production asset is written',async t=>{
  const source=realLedger(t);if(!source)return;const temp=await temporary(t),current=JSON.parse(await fs.readFile(source,'utf8'));current.assets[0].sha256='0'.repeat(64);
  const file=path.join(temp,'rejected.json');await fs.writeFile(file,JSON.stringify(current));assert.throws(()=>readTopicProductionRelease(file,PREHISTORIC_TOPIC_VERSION),/bytes changed/);
});
