// NOT RUN: meaningful runtime declarations for the user's delegated test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {bodyCalibrationPlan,bodyWorkbench} from '../packages/topics/body-workbench.js';
import {SOURCE_COLOUR_VERSION,sourceColourSvg,sourceColourAssets,sourceColourCalibration,sourceColourDescription,usesSourceColour} from '../packages/animation/source-colour-art.js';
import {referenceBodyAssets,referenceBodyMetrics,forestBodyArt,referenceBodyDescription} from '../packages/animation/forest-body-art.js';
import {referenceHeadAssets,readReferenceHeadAsset,referenceHeadDescription} from '../packages/animation/forest-head-art.js';
import {cutoutHeadDescription} from '../packages/animation/forest-cutout-head.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import type {Shot} from '../packages/core/schemas.js';
const actors=['lila','karo'] as const;
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const urls=(file:string,sha:string)=>'assets/rigs/'+sha+'.png';

test('explicit original RGB selection requires source body/actor and preserves absent legacy selection',()=>{
  for(const actor of actors){
    const base=topicPreviewProfile(actor),appearance={...base.appearance,sourceColour:SOURCE_COLOUR_VERSION};
    assert.equal(usesSourceColour(base.appearance),false);assert.equal(sourceColourAssets(base.appearance).length,0);
    assert.equal(HostProfileSchema.parse({...base,appearance}).appearance.sourceColour,SOURCE_COLOUR_VERSION);
    for(const artworkVersion of [undefined,'forest-head-1','forest-body-view-1'] as const){
      const invalid={...appearance,artworkVersion,...(artworkVersion==='forest-body-view-1'?{bodyView:'three-quarter-right' as const}:{})};
      assert.throws(()=>HostProfileSchema.parse({...base,appearance:invalid}),/Original source colour/);
      assert.throws(()=>referenceHeadAssets(invalid),/needs-source-colour-profile/);
    }
    assert.throws(()=>HostProfileSchema.parse({...base,appearance:{...appearance,characterVariant:undefined}}),/Original source colour/);
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,'three-quarter-right',SOURCE_COLOUR_VERSION),/needs-source-colour-profile/);
    assert.throws(()=>bodyCalibrationPlan(actor,'spear-lunge','happy',undefined,'source',SOURCE_COLOUR_VERSION),/needs-source-colour-profile/);
  }
});

test('candidate head/body stage exact RGB and matte bytes with shared hashes and local resources',()=>{
  for(const actor of actors){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,'source',SOURCE_COLOUR_VERSION);
    const assets=sourceColourAssets(profile.appearance),source=sourceColourCalibration[actor];
    assert.deepEqual(assets.map(a=>a.sha256),[source.rgb.sha256,source.matte.sha256]);
    for(const asset of assets)assert.equal(hash(readReferenceHeadAsset(asset)),asset.sha256);
    assert.deepEqual(referenceHeadAssets(profile.appearance),assets);
    const body=referenceBodyAssets(profile.appearance);for(const asset of assets)assert.ok(body.some(b=>b.path===asset.path));
    assert.equal(body.length,3,'the existing seated reconstruction remains a separate candidate');
    assert.equal(new Set(body.map(a=>a.path)).size,body.length);
    const art=forestBodyArt(profile,'scene');for(const asset of assets)assert.ok(art.defs.includes('href="'+asset.path+'"'));
    assert.match(art.defs,/<g id="forest-body-source"><g mask=/);
    assert.equal(sourceColourDescription.productionReady,false);assert.equal(sourceColourDescription.approved,false);
    assert.equal(referenceBodyDescription().sourceColour.fingerprint,sourceColourDescription.fingerprint);
    assert.equal(cutoutHeadDescription().sourceColour.fingerprint,sourceColourDescription.fingerprint);
    assert.equal(referenceHeadDescription().bodyHead.sourceColour.fingerprint,sourceColourDescription.fingerprint);
  }
});

test('source-colour SVG keeps RGB immutable under bounded candidate masks and namespaces every local reference',()=>{
  const combined=actors.map(actor=>{
    const source=sourceColourCalibration[actor],art=sourceColourSvg(actor,'candidate',urls);
    assert.equal(art.width,source.rgb.width);assert.equal(art.height,source.rgb.height);
    assert.ok(art.defs.includes('width="'+source.rgb.width+'" height="'+source.rgb.height+'"'));
    assert.match(art.artwork,/<use href="#candidate-rgb"\/>/);
    assert.doesNotMatch(art.defs+art.artwork,/<script|<style|<animate|http:|https:/);
    assert.throws(()=>sourceColourSvg(actor,'bad"namespace',urls),/namespace/);
    for(const value of ['https://example.org/image.png','assets/unapproved.png','data:image/svg+xml,unsafe'])assert.throws(()=>sourceColourSvg(actor,'candidate',()=>value),/Unapproved/);
    return namespaceRigSvg('<defs>'+art.defs+'</defs>'+art.artwork,actor+'-');
  }).join('');
  const ids=[...combined.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]!);assert.equal(new Set(ids).size,ids.length);
  for(const match of combined.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g))assert.ok(ids.includes((match[1]??match[2])!));
  assert.ok(ids.includes('lila-candidate-rgb')&&ids.includes('karo-candidate-rgb'));
});

test('colour selection preserves physical metrics, authored clocks and random-access body state',()=>{
  for(const actor of actors)for(const action of ['rest','point','run','walk','jump','sit-right'] as const){
    const base=bodyCalibrationPlan(actor,action,'happy'),candidate=bodyCalibrationPlan(actor,action,'happy',undefined,'source',SOURCE_COLOUR_VERSION);
    assert.notEqual(candidate.profile.profileHash,base.profile.profileHash);
    assert.deepEqual(referenceBodyMetrics(candidate.profile),referenceBodyMetrics(base.profile));
    const {profileHash:baseHash,...basePlan}=base.plan,{profileHash:colourHash,...candidatePlan}=candidate.plan;
    assert.notEqual(baseHash,colourHash);assert.deepEqual(candidatePlan,basePlan);
    for(const at of [0,800,1600,2600,4000])assert.deepEqual(samplePerformance(candidate.plan,candidate.profile,at,silence),samplePerformance(base.plan,base.profile,at,silence));
  }
});

test('canonical candidate scene permits staged original/matte masks and rejects missing resources',()=>{
  for(const actor of actors){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,'source',SOURCE_COLOUR_VERSION);
    const assets=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(a=>a.path);
    const result=performanceScene(plan,profile,silence),files=secureSceneFiles(result.files);
    const shot={id:plan.id,startMs:0,endMs:plan.durationMs} as Shot;
    assert.deepEqual(validateSceneFiles(files,shot,500000,assets,{width:430,height:440}),[]);
    assert.ok(validateSceneFiles(files,shot,500000,[],{width:430,height:440}).some(error=>error.includes('Unapproved local resource')));
    assert.equal(result.compiled.report.bodyArtwork?.productionReady,false);
  }
});

test('workbench retains explicit colour choice in its form and pose links and blocks authored view combinations',()=>{
  const html=bodyWorkbench('walk',800,'happy','source',SOURCE_COLOUR_VERSION);
  assert.match(html,/name="colour"/);assert.match(html,/value="original-rgb-v2" selected/);
  for(const link of html.matchAll(/href="\?action=walk&amp;timeMs=[^"]+"/g))assert.ok(link[0].includes('&amp;colour='+SOURCE_COLOUR_VERSION));
  assert.match(html,/source-head-colour-rgb/);assert.match(html,/forest-body-colour-rgb/);
  const blocked=bodyWorkbench('rest',800,'happy','three-quarter-right',SOURCE_COLOUR_VERSION);
  assert.match(blocked,/needs-source-colour-profile/);assert.doesNotMatch(blocked,/source-head-colour-rgb/);
  assert.doesNotMatch(bodyWorkbench('rest',800,'happy'),/source-head-colour-rgb/);
});
