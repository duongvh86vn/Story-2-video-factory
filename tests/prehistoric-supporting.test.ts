// NOT RUN. Runtime is delegated to the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {topicAppearance,supportingTopicAppearance,applyTopicCast,requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';
import {prehistoricSupportingModels} from '../packages/topics/supporting-models.js';
import {supportingHeadRegistration,supportingHeadSvg} from '../packages/animation/prehistoric-supporting-head.js';
import {cutoutHeadRegistration} from '../packages/animation/forest-cutout-head.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {supportingActorImage,supportingActorManifest,supportingActorWorkbench} from '../packages/topics/supporting-workbench.js';
import {actorVisualFingerprint,castDesignAdvisories} from '../packages/actors/design.js';

test('supporting templates keep their own head and exact matching main costume; foreign native registrations fail',()=>{
  for(const m of Object.values(prehistoricSupportingModels)){
    const appearance=supportingTopicAppearance(m.id),base=topicPreviewProfile(m.bodyTemplate),profile=HostProfileSchema.parse({...base,id:'villager-1',appearance});
    assert.equal(appearance.characterVariant,m.bodyTemplate);
    assert.equal(supportingHeadRegistration(profile).sha256,m.sha256);
    assert.equal(cutoutHeadRegistration(profile).file,m.file);
    const head=supportingHeadSvg(profile,file=>file),other=supportingHeadSvg({...profile,id:'villager-2'},file=>file);
    const clip=head.match(/<clipPath id="([^"]+)"/)![1]!;assert.match(head,new RegExp('url\\(#'+clip+'\\)'));assert.ok(!other.includes('id="'+clip+'"'));
    assert.deepEqual(referenceBodyAssets(appearance),referenceBodyAssets(topicAppearance(m.bodyTemplate)));
    assert.deepEqual(referenceHeadAssets(appearance),[{file:m.file,sha256:m.sha256,path:'assets/rigs/'+m.sha256+'.png'}]);
    assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...appearance,characterVariant:m.bodyTemplate==='karo'?'lila':'karo'}}).success,false);
    assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...appearance,artworkVersion:'forest-head-1'}}).success,false);
    for(const setting of [{bodyView:'three-quarter-right'},{sourceColour:'original-rgb-v2'},{bodySpeech:'registered-rest-mouth-v1'},{bodySecondary:'registered-secondary-v1'}])
      assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...appearance,...setting}}).success,false);
  }
});
test('multiple sourced extras may share a model without changing actor IDs, source names, roles or dialogue ownership',()=>{
  const make=(id:string,name:string,model:'prehistoric-male-bald'|'prehistoric-female-haired')=>({id,name,role:'người trong làng',identity:'illustrative',kind:'stick-man',sourceRefs:[{kind:'narration',segmentId:'cue',quote:'người trong làng'}],appearance:supportingTopicAppearance(model)});
  const a=make('hunter-a','A','prehistoric-male-bald'),b=make('hunter-b','B','prehistoric-male-bald'),c=make('gatherer-c','C','prehistoric-female-haired');
  const scene={primary:a,speakingSegmentIds:['cue'],supporting:[{character:b,speakingSegmentIds:[]},{character:c,speakingSegmentIds:[]}]};
  const board={shots:[{id:'shot-a',cinematic:{actorScene:scene}}]} as unknown as Storyboard,config=ConfigSchema.parse({topic:{id:'prehistoric-life'}}),before=JSON.stringify(scene);
  applyTopicCast(board,config);assert.equal(JSON.stringify(scene),before);
  assert.notEqual(a.id,b.id);assert.equal(a.appearance.supportingModel,b.appearance.supportingModel);
  const principal={...a,id:'karo'};scene.primary=principal;assert.throws(()=>applyTopicCast(board,config),/principal/);
  scene.primary={...a,appearance:topicAppearance('karo')};assert.throws(()=>applyTopicCast(board,config),/explicit supportingModel/);
});
test('raw model images and catalog dimensions/hash stay bound; no model or topic promotes production',async()=>{
  for(const m of Object.values(prehistoricSupportingModels)){
    const bytes=await fs.readFile(m.file),meta=JSON.parse(await fs.readFile(m.file.replace(/\.png$/,'.json'),'utf8'));
    assert.equal(hash(bytes),m.sha256);assert.equal(meta.sha256,m.sha256);assert.equal(meta.width,m.width);assert.equal(meta.height,m.height);
    assert.equal(meta.registered,false);assert.equal(meta.productionReady,false);
    assert.deepEqual(await supportingActorImage(process.cwd(),path.basename(m.file)),bytes);
  }
  assert.equal(supportingActorManifest().productionReady,false);
  assert.throws(()=>requireTopicProductionReady(ConfigSchema.parse({topic:{id:'prehistoric-life'}})),/needs-art-direction/);
  assert.match(supportingActorWorkbench(),/background:#fff7e5/);
});
test('supporting image endpoint rejects arbitrary paths and bytes that differ from catalog hash',async t=>{
  await assert.rejects(supportingActorImage(process.cwd(),'../../.env'),/Unknown/);
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'supporting-model-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const m=prehistoricSupportingModels['prehistoric-male-bald'];await fs.mkdir(path.dirname(path.join(root,m.file)),{recursive:true});await fs.writeFile(path.join(root,m.file),'not-an-image');
  await assert.rejects(supportingActorImage(root,path.basename(m.file)),/changed/);
});

test('clean-faced male revision supersedes beard source while female and original body costumes stay unchanged',async()=>{
  const male=prehistoricSupportingModels['prehistoric-male-bald'],female=prehistoricSupportingModels['prehistoric-female-haired'];
  assert.equal(male.hair,'bald');assert.equal(male.beard,'none');
  const meta=JSON.parse(await fs.readFile(male.file.replace(/\.png$/,'.json'),'utf8'));
  assert.equal(hash(await fs.readFile(meta.supersedes.file)),meta.supersedes.sha256);
  assert.notEqual(male.sha256,meta.supersedes.sha256);
  await assert.rejects(supportingActorImage(process.cwd(),path.basename(meta.supersedes.file)),/Unknown/);
  assert.equal(female.sha256,'4604e94be7e2857b8dd5e2ef575196f8f623d5138da114f3b17ab06e925bfae7');
  for(const model of [male,female]){
    const appearance=supportingTopicAppearance(model.id),profile=HostProfileSchema.parse({...topicPreviewProfile(model.bodyTemplate),id:'extra-'+model.bodyTemplate,appearance});
    const head=supportingHeadSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');
    assert.ok(head.includes(model.sha256));assert.ok(!head.includes(meta.supersedes.sha256));
    assert.deepEqual(referenceBodyAssets(appearance),referenceBodyAssets(topicAppearance(model.bodyTemplate)));
  }
  assert.ok(supportingActorWorkbench().includes('male-bald-v2.png'));
  assert.ok(!supportingActorWorkbench().includes('male-bald-v1.png'));
});

test('cast feedback distinguishes supporting heads from principals without redesigning intentional shared-model extras',()=>{
  const make=(id:string,appearance:ReturnType<typeof topicAppearance>)=>({id,name:id,role:'sourced role',identity:'illustrative' as const,kind:'stick-man' as const,sourceRefs:[{kind:'narration' as const,segmentId:'cue',quote:'sourced role'}],appearance});
  const karo=make('karo',topicAppearance('karo')),male=make('villager-a',supportingTopicAppearance('prehistoric-male-bald')),male2={...male,id:'villager-b',name:'B'};
  const lila=make('lila',topicAppearance('lila')),female=make('villager-c',supportingTopicAppearance('prehistoric-female-haired'));
  const board={shots:[{id:'cast-shot',cinematic:{actorScene:{primary:karo,supporting:[male,male2,lila,female].map(character=>({character}))}}}]} as unknown as Storyboard,before=hash(board);
  assert.notEqual(actorVisualFingerprint(karo),actorVisualFingerprint(male));assert.notEqual(actorVisualFingerprint(lila),actorVisualFingerprint(female));
  const issues=castDesignAdvisories(board);assert.equal(issues.length,1);assert.deepEqual(issues[0]!.actorIds,['villager-a','villager-b']);
  assert.equal(issues[0]!.severity,'medium');assert.match(issues[0]!.repair,/Deliberate resemblance/);assert.equal(hash(board),before);
});
