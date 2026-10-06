import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {topicAppearance,prehistoricReadiness} from '../packages/topics/prehistoric-life.js';
import {FOREST_HEAD_VIEWS,referenceHeadAssets,readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {samplePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {secureSceneFiles,validateSceneFiles,validateSceneScript} from '../packages/scenes/security.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function fixture(mood:'neutral'|'angry'|'sad'|'afraid'|'surprised'='neutral',actor:'lila'|'karo'='lila'){
  const profile=HostProfileSchema.parse({id:actor,version:1,kind:'stick-man',role:'story-actor',name:actor,description:'Reference head fixture.',
    appearance:{...topicAppearance(actor),artworkVersion:'forest-head-1'},actions:['idle'],immutable:['identity'],profileHash:'fixture-'+actor,compilerVersion:'fixture',sourcePath:'reference'});
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'face-fixture',leadCharacterId:profile.id,profileHash:profile.profileHash,
    kind:'stick-man',durationMs:4000,fps:30,stage:{width:640,height:480,groundY:420},root:{x:320,y:420},scale:1,
    headView:'three-quarter-right',walks:[],gestures:[],props:[],gazes:[],expressions:[{startMs:0,endMs:4000,mood}]};
  return {profile,plan};
}
test('source rig resources are hash-bound local files and production stays gated',()=>{
  const {profile}=fixture(),assets=referenceHeadAssets(profile.appearance);
  assert.equal(assets.length,4);
  for(const asset of assets){assert.equal(hash(readReferenceHeadAsset(asset)),asset.sha256);assert.match(asset.path,/^assets\/rigs\/[a-f0-9]{64}\.png$/);}
  assert.throws(()=>readReferenceHeadAsset({...assets[0]!,sha256:'0'.repeat(64)}),/changed/);
  assert.equal(prehistoricReadiness.productionReady,false);
});
test('unsupported head angles fail instead of silently using a front circle',()=>{
  const {profile,plan}=fixture();
  for(const view of ['left','right','back','back-left','back-right'] as const)
    assert.throws(()=>validatePerformance({...plan,headView:view},profile),/needs-head-view/);
  for(const view of FOREST_HEAD_VIEWS)assert.doesNotThrow(()=>validatePerformance({...plan,headView:view},profile));
});
test('source eyebrows convey anger and sadness with opposite inner-end slopes',()=>{
  const angry=fixture('angry'),sad=fixture('sad');
  const angryFace=samplePerformance(angry.plan,angry.profile,600,silence).face;
  const sadFace=samplePerformance(sad.plan,sad.profile,600,silence).face;
  assert.ok(angryFace['brow-left-three-quarter-right']!.rotation!>0);
  assert.ok(angryFace['brow-right-three-quarter-right']!.rotation!<0);
  assert.ok(sadFace['brow-left-three-quarter-right']!.rotation!<0);
  assert.equal(angryFace['mouth-rest-three-quarter-right']!.opacity,0);
  assert.equal(angryFace['mouth-frown-three-quarter-right']!.opacity,1);
});
test('face seek is stateless and a silent actor cannot use its speaking mouth',()=>{
  const {profile,plan}=fixture();
  const first=samplePerformance(plan,profile,2770,silence);
  samplePerformance(plan,profile,3600,{...silence,intervals:[{startMs:3000,endMs:4000,level:.8}]});
  assert.deepEqual(samplePerformance(plan,profile,2770,silence),first);
  assert.ok(first.face['eye-left-three-quarter-right']!.scaleY!<.1);
  assert.equal(first.face['mouth-talk-three-quarter-right']!.opacity,0);
  const voice=samplePerformance(plan,profile,600,{...silence,intervals:[{startMs:200,endMs:1000,level:.6}]});
  assert.equal(voice.face['mouth-talk-three-quarter-right']!.opacity,1);
});
test('an angry or sad speaker keeps its tense mouth rather than reverting to a grin',()=>{
  for(const actor of ['lila','karo'] as const)for(const mood of ['angry','sad'] as const){
    const {profile,plan}=fixture(mood,actor);
    const voice=samplePerformance(plan,profile,600,{...silence,intervals:[{startMs:200,endMs:1000,level:.6}]}).face;
    assert.equal(voice['mouth-talk-three-quarter-right']!.opacity,0);
    assert.equal(voice['mouth-talk-tense-three-quarter-right']!.opacity,1);
    const quiet=samplePerformance(plan,profile,1200,silence).face;
    assert.equal(quiet['mouth-talk-tense-three-quarter-right']!.opacity,0);
    assert.ok(quiet['mouth-frown-three-quarter-right']!.opacity!>0);
  }
});
test('an opposing head turn shows the authored front view and remains seekable',()=>{
  const {profile,plan}=fixture();plan.headView='three-quarter-left';
  plan.headTurns=[{startMs:300,endMs:1500,direction:'three-quarter-right'}];
  const middle=samplePerformance(plan,profile,900,silence);
  assert.equal(middle.face['head-view-front']!.opacity,1);
  assert.equal(middle.face['head-view-three-quarter-left']!.opacity,0);
  assert.equal(middle.face['head-view-three-quarter-right']!.opacity,0);
  assert.equal(samplePerformance(plan,profile,0,silence).face['head-view-three-quarter-left']!.opacity,1);
  assert.equal(samplePerformance(plan,profile,1800,silence).face['head-view-three-quarter-right']!.opacity,1);
  assert.deepEqual(samplePerformance(plan,profile,900,silence),middle);
});
test('a surprised or afraid speaker keeps a rounded mouth without a smile layer',()=>{
  for(const actor of ['lila','karo'] as const)for(const mood of ['afraid','surprised'] as const){
    const {profile,plan}=fixture(mood,actor);
    const voice=samplePerformance(plan,profile,600,{...silence,intervals:[{startMs:200,endMs:1000,level:.6}]}).face;
    assert.equal(voice['mouth-talk-three-quarter-right']!.opacity,0);
    assert.equal(voice['mouth-talk-round-three-quarter-right']!.opacity,1);
    assert.equal(voice['mouth-smile-three-quarter-right']!.opacity,0);
    assert.equal(samplePerformance(plan,profile,1200,silence).face['mouth-talk-round-three-quarter-right']!.opacity,0);
  }
});
test('two actors namespace masks, use references and controls together',()=>{
  const svg='<g data-actor-id="lila"><defs><image id="source" href="assets/rigs/a.png"/><clipPath id="crop"/></defs><g id="eye" clip-path="url(#crop)"><use href="#source"/></g></g>';
  const result=namespaceRigSvg(svg,'actor-karo-');
  assert.match(result,/data-actor-id="lila"/);
  assert.match(result,/id="actor-karo-eye"/);assert.match(result,/url\(#actor-karo-crop\)/);assert.match(result,/href="#actor-karo-source"/);
  assert.match(result,/href="assets\/rigs\/a.png"/);
});
test('compiled reference-head scene fits the declarative contract with staged images',()=>{
  const {profile,plan}=fixture('angry'),result=performanceScene(plan,profile,silence);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],
    2000000,referenceHeadAssets(profile.appearance).map(asset=>asset.path),plan.stage),[]);
  assert.equal(result.compiled.report.headArtwork?.turnRendering,'stepped-authored-views-with-front');
  assert.equal(result.compiled.report.headArtwork?.fullBodyReplacement,false);
  assert.ok(!result.files.files.find(file=>file.path==='index.html')!.content.includes('data:image'));
});
test('scene extension never allows image URL tweening, external use or embedded bitmap bypass',()=>{
  const {profile,plan}=fixture(),result=performanceScene(plan,profile,silence);
  const js='const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["face-fixture"]=tl;'
    +'tl.set("[data-composition-id=\\"face-fixture\\"] [id=\\"eye\\"]",{attr:{href:"https://example.org/payload.svg"}},0);';
  assert.ok(validateSceneScript(js,plan.id).length>0);
  const files={...result.files,files:result.files.files.map(file=>file.path==='index.html'?{...file,content:file.content.replace(/href="#forest-source-face"/,'href="https://example.org/payload.svg"')}:file)};
  assert.ok(validateSceneFiles(files,{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],2000000).some(error=>/SVG use/.test(error)));
  assert.ok(!performanceSvg({...profile,appearance:{...profile.appearance,artworkVersion:undefined}}).includes('data-head-artwork='));
});
