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
