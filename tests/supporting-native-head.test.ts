// DECLARED ONLY, NOT RUN. Geometry/runtime/render belongs to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {NativeHeadBankDefinitionSchema,NativeHeadBankSchema,nativeHeadBank} from '../packages/animation/native-head-bank.js';
import {nativeHeadIdentities} from '../packages/animation/native-head-identity.js';
import {registeredNativeHeadBank,validateNativeHeadBankTrack} from '../packages/animation/body-head-bank.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {SUPPORTING_FACE_CANDIDATES} from '../packages/topics/supporting-face-candidates.js';
import {HEAD_FACE_CANDIDATES} from '../packages/topics/head-face-candidates.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {headFaceCalibration,headFacePreviewRevision,headFacePreviewFile} from '../packages/topics/head-face-workbench.js';
import {applyTopicCast,supportingNativeTopicAppearance,topicAppearance} from '../packages/topics/prehistoric-life.js';
import {supportingActorImage,supportingActorManifest} from '../packages/topics/supporting-workbench.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('supporting version4 binds its own current primary/head/face while reusing only the compatible principal body',async()=>{
  for(const entry of SUPPORTING_FACE_CANDIDATES){
    const f=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view}),identity=nativeHeadIdentities[entry.actor];
    assert.equal(f.bank.version,'native-head-bank-4');assert.equal(f.bank.actor,entry.actor);
    assert.equal(f.profile.appearance.supportingModel,entry.actor);assert.equal(f.profile.appearance.characterVariant,identity.bodyTemplate);
    assert.deepEqual(f.bank.primary,identity.primary);assert.equal(f.bank.source.sha256,entry.sha256);
    assert.equal(f.bank.cells[0]!.face!.mouth.kind,'skin-strip');assert.equal(f.bank.cells[0]!.yawDeg,null);
    assert.deepEqual(f.bank.routes,[]);assert.equal(registeredNativeHeadBank(f.profile).fingerprint,f.bank.fingerprint);
    assert.equal(f.plan.sourceHead!.ownerId,f.profile.id);assert.notEqual(f.profile.id,entry.actor);
    const files=referenceHeadAssets(f.profile.appearance).map(r=>r.file);
    assert.ok(files.includes(identity.primary.file));assert.ok(files.includes('library/topics/prehistoric-life/head-cells/'+entry.headFile));
    assert.ok(!files.includes(nativeHeadIdentities[identity.bodyTemplate].primary.file));
    assert.deepEqual(referenceBodyAssets(f.profile.appearance),referenceBodyAssets({...topicAppearance(identity.bodyTemplate),artworkVersion:'forest-body-view-1',bodyView:entry.view}));
    assert.equal(f.bank.approved,false);assert.equal(f.bank.productionReady,false);assert.equal(f.bank.motionVerified,false);
  }
});

test('foreign primary, principal face, bearded history, incompatible body and stale fingerprint cannot impersonate a supporting head',async()=>{
  for(const entry of SUPPORTING_FACE_CANDIDATES){
    const raw=JSON.parse(await fs.readFile(path.join(repo,entry.file),'utf8'));
    const rejected=(mutate:(v:typeof raw)=>void)=>{const v=structuredClone(raw);mutate(v);assert.equal(NativeHeadBankDefinitionSchema.safeParse(v).success,false);};
    rejected(v=>{v.version='native-head-bank-3';});
    rejected(v=>{v.actor=nativeHeadIdentities[entry.actor].bodyTemplate;});
    rejected(v=>{v.primary=nativeHeadIdentities[nativeHeadIdentities[entry.actor].bodyTemplate].primary;});
    rejected(v=>{v.source.file='library/topics/prehistoric-life/head-cells/karo-head-left-dialogue-v1.png';});
    rejected(v=>{v.source.sha256='f2995c6f6289f9c6e3b33b872ae40f70daef58cc312f34d641bb6dbcecce83ca';});
    rejected(v=>{v.bodyViews[0].sourceHash='b'.repeat(64);});
    rejected(v=>{v.routes=[['happy','other']];});
    const {bank}=await headFaceCandidate(repo,entry.actor,entry.view);
    assert.equal(NativeHeadBankSchema.safeParse({...bank,fingerprint:'c'.repeat(64)}).success,false);
    const f=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view});
    for(const setting of [{supportingModel:undefined},{bodySpeech:'registered-rest-mouth-v1'},{bodyEyes:'registered-eyes-v1'},{bodySecondary:'registered-secondary-v1'},
      {supportingModel:entry.actor==='prehistoric-male-bald'?'prehistoric-female-haired':'prehistoric-male-bald'}])
      assert.equal(HostProfileSchema.safeParse({...f.profile,appearance:{...f.profile.appearance,...setting}}).success,false);
  }
});

test('topic normalization preserves explicit own head/view/motion and separate sourced person/speech ownership',async()=>{
  const entry=SUPPORTING_FACE_CANDIDATES[0],f=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view});
  const appearance=supportingNativeTopicAppearance({...f.profile.appearance,bodyMotion:'registered-locomotion-v1',bodySeat:'registered-seated-v1'});
  const person=(id:string,name:string)=>({id,name,role:'người trong truyện',identity:'illustrative',kind:'stick-man',sourceRefs:[{kind:'narration',segmentId:'cue-a',quote:'người trong truyện'}],appearance:structuredClone(appearance)});
  const a=person('villager-a','A'),b=person('villager-b','B'),scene={primary:a,speakingSegmentIds:['cue-a'],supporting:[{character:b,speakingSegmentIds:[]}]};
  const board={shots:[{id:'cast-a',cinematic:{actorScene:scene}}]} as unknown as Storyboard,before=hash(scene);
  applyTopicCast(board,ConfigSchema.parse({topic:{id:'prehistoric-life'}}));assert.equal(hash(scene),before);
  assert.notEqual(a.id,b.id);assert.equal(a.appearance.bodyHeadBank!.actor,b.appearance.bodyHeadBank!.actor);
  assert.throws(()=>supportingNativeTopicAppearance({...appearance,bodyHeadBank:undefined}),/requires|registration/);
  assert.throws(()=>supportingNativeTopicAppearance({...appearance,bodyView:'three-quarter-right'}),/body source|compatible/);
  const bad={...a,appearance:{...appearance,bodyHeadBank:undefined}};
  assert.throws(()=>applyTopicCast({shots:[{id:'bad',cinematic:{actorScene:{primary:bad,supporting:[]}}}]} as unknown as Storyboard,ConfigSchema.parse({topic:{id:'prehistoric-life'}})),/requires|registration/);
});

test('supporting mouth/eyes/hands retain complete original clock through full/sliced random and reverse seeks',async()=>{
  for(const entry of SUPPORTING_FACE_CANDIDATES)for(const action of ['rest','point','think'] as const){
    const full=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view,action,look:'ahead'}),slice=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view,action,look:'ahead',slice:'second-half'});
    assert.equal(full.clock.sourceIdentityHash,slice.clock.sourceIdentityHash);assert.deepEqual(full.plan.sourceHead,slice.plan.sourceHead);
    const at=(f:typeof full,t:number)=>samplePerformance(f.plan,f.profile,t,f.activity,f.sourceClock,f.clock);
    const wanted=new Map([2000,2150,2650,2800,3450,3999].map(t=>[t,at(full,t)]));
    for(const global of [3450,2000,3999,2800,2150,2650,2000]){
      const expected=wanted.get(global)!,actual=at(slice,global-2000);
      assert.deepEqual(actual.face,expected.face);assert.deepEqual(actual.paths,expected.paths);assert.deepEqual(actual.hands,expected.hands);assert.deepEqual(actual.transforms,expected.transforms);
    }
    assert.notEqual(headFacePreviewRevision(full),headFacePreviewRevision(slice));
    assert.throws(()=>validateNativeHeadBankTrack({...full.plan,sourceHead:{...full.plan.sourceHead!,ownerId:'other-person'}},full.profile),/actor\/bank|phase/);
    assert.throws(()=>validateNativeHeadBankTrack({...full.plan,sourceHead:{...full.plan.sourceHead!,samples:[{atMs:0,cell:'unregistered'}]}},full.profile),/unregistered/);
    assert.throws(()=>samplePerformance({...full.plan,turns:[{startMs:0,endMs:1000,direction:'left'}]},full.profile,0,full.activity,full.sourceClock,full.clock),/body-registration|turn/);
  }
});

test('missing supporting angles fail explicitly; cache bindings never borrow a principal or a different supporting person',async()=>{
  for(const entry of SUPPORTING_FACE_CANDIDATES){
    const missing=entry.view==='three-quarter-left'?'three-quarter-right':'three-quarter-left';
    await assert.rejects(headFaceCandidate(repo,entry.actor,missing),/needs-head-face-candidate/);
    const f=await headFaceCalibration(repo,{actor:entry.actor,view:entry.view});
    const other=await headFaceCalibration(repo,{actor:nativeHeadIdentities[entry.actor].bodyTemplate,view:entry.view});
    await assert.rejects(headFacePreviewFile(repo,f.selection,'index.html',headFacePreviewRevision(other)),/binding changed/);
    assert.equal(f.profile.appearance.bodyEyes,undefined);assert.equal(f.profile.appearance.bodySpeech,undefined);
  }
  assert.equal(supportingActorManifest().productionReady,false);assert.deepEqual(supportingActorManifest().nativeFaces.availableBanks,[]);
});

test('fixed supporting raw resources reject stale catalog bytes, path traversal and linked sources',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'supporting-head-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const entry=SUPPORTING_FACE_CANDIDATES[0],file='library/topics/prehistoric-life/head-cells/'+entry.headFile;
  const bytes=await fs.readFile(path.join(repo,file));assert.deepEqual(await supportingActorImage(repo,entry.headFile),bytes);
  await assert.rejects(supportingActorImage(repo,'../../.env'),/Unknown/);
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'wrong-bytes');
  await assert.rejects(supportingActorImage(root,entry.headFile),/changed/);
  await fs.unlink(path.join(root,file));await fs.symlink(path.join(repo,file),path.join(root,file),'file');
  await assert.rejects(supportingActorImage(root,entry.headFile),/Linked/);
});

test('principal version3 registrations keep their own original actor/primary and cannot be upgraded by relabeling to supporting version4',async()=>{
  for(const entry of HEAD_FACE_CANDIDATES.filter(c=>c.actor==='lila'||c.actor==='karo')){
    const raw=JSON.parse(await fs.readFile(path.join(repo,entry.file),'utf8'));
    const bank=nativeHeadBank(raw);assert.equal(bank.version,'native-head-bank-3');assert.equal(bank.actor,entry.actor);
    assert.deepEqual(bank.primary,nativeHeadIdentities[entry.actor].primary);
    assert.equal(NativeHeadBankDefinitionSchema.safeParse({...raw,version:'native-head-bank-4'}).success,false);
  }
});
