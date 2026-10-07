import test from 'node:test';
import assert from 'node:assert/strict';
import {headProjectionTriangles,projectHeadPoint,projectedHeadState,projectedFeatureTransform,headProjectionMatrixError} from '../packages/animation/forest-head-projection.js';
import {referenceHeadAssets,referenceHeadDescription} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles,validateSceneScript} from '../packages/scenes/security.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
function fixture(actor:'lila'|'karo'){
  const profile=topicPreviewProfile(actor);
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'projected-'+actor,leadCharacterId:actor,profileHash:profile.profileHash,
    kind:'stick-man',durationMs:2000,fps:60,stage:{width:430,height:440,groundY:410},root:{x:210,y:410},scale:1,
    headView:'three-quarter-left',headTurns:[{startMs:300,endMs:1500,direction:'three-quarter-right'}],walks:[],gestures:[],props:[],gazes:[],expressions:[]};
  return {profile,plan};
}
test('projection has positive UV orientation, a pinned neck and a strict angle limit',()=>{
  for(const actor of ['lila','karo'] as const){
    const texture=referenceHeadDescription().assets[actor].front;
    assert.equal(headProjectionTriangles(actor).length,60);
    for(const yaw of [-1,-.7,-.33846,0,.33846,.7,1]){
      assert.doesNotThrow(()=>projectedHeadState(actor,texture,yaw));
      const neck={x:0,y:actor==='lila'?32:72};assert.deepEqual(projectHeadPoint(actor,neck,yaw),neck);
      const point={x:20,y:0};assert.ok(Math.hypot(projectHeadPoint(actor,point,yaw+.0001<=1?yaw+.0001:yaw-.0001).x-projectHeadPoint(actor,point,yaw).x)<.02);
    }
    assert.throws(()=>projectHeadPoint(actor,{x:0,y:0},1.1),/needs-head-view/);
    assert.throws(()=>projectHeadPoint(actor,{x:0,y:0},NaN),/needs-head-view/);
  }
});
test('scene contract permits literal finite mesh matrices/polygons without widening resource access',()=>{
  const prefix='const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["mesh"]=tl;';
  const script=(attr:Record<string,string>)=>prefix+'tl.set("[data-composition-id=\\"mesh\\"] [id=\\"surface\\"]",'+JSON.stringify({attr})+',0);';
  assert.deepEqual(validateSceneScript(script({transform:'matrix(.15 0 0 .15 -99.75 -87.75)'}),'mesh'),[]);
  assert.deepEqual(validateSceneScript(script({d:'M0 0L10 0L0 10Z'}),'mesh'),[]);
  for(const transform of ['matrix(1 0 0 1 0)','matrix(1 0 0 1 NaN 0)','matrix(1 0 0 1 100001 0)','matrix(1 0 0 1 0 0) url(https://example.org)'])assert.ok(validateSceneScript(script({transform}),'mesh').length);
  for(const d of ['M0 0L10 0Z','M0 0L10 0L0 InfinityZ','M0 0L100001 0L0 10Z'])assert.ok(validateSceneScript(script({d}),'mesh').length);
  assert.ok(validateSceneScript(script({href:'https://example.org/payload.svg'}),'mesh').length);
});
test('body head moves through one painted surface, including former view-switch thresholds',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile,plan}=fixture(actor),times=[0,300,500,700,899.9,900,900.1,1100,1300,1500,2000];
    for(const time of times){
      const face=samplePerformance(plan,profile,time,silence).face;
      assert.equal(face['head-view-front']!.opacity,1);
      assert.equal(face['head-view-three-quarter-left']!.opacity,0);assert.equal(face['head-view-three-quarter-right']!.opacity,0);
      assert.equal(face['mouth-talk-front']!.opacity,0);
      assert.ok(face['head-anchor-eye-left']!.attr?.transform);
    }
    const mid=samplePerformance(plan,profile,700,silence);samplePerformance(plan,profile,1300,silence);
    assert.deepEqual(samplePerformance(plan,profile,700,silence),mid);
    assert.notDeepEqual(samplePerformance(plan,profile,699,silence).face['head-projection-paint-30'],mid.face['head-projection-paint-30']);
  }
});
test('texture vertex error catches an unsafe tween even when coefficient errors are small',()=>{
  const actor='karo',texture=referenceHeadDescription().assets[actor].front;
  const a=projectedHeadState(actor,texture,-1),b=projectedHeadState(actor,texture,1),actual=projectedHeadState(actor,texture,0);
  assert.ok(headProjectionMatrixError(actor,a,b,actual,.5)>1);
  assert.equal(headProjectionMatrixError(actor,actual,actual,actual,.5),0);
});
test('glyph centers coincide with rendered UV triangles and a far eye stays a clean oval',()=>{
  const numbers=(matrix:string)=>matrix.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)!.map(Number);
  for(const actor of ['lila','karo'] as const){
    const texture=referenceHeadDescription().assets[actor].front;
    for(const yaw of [-1,-.6,0,.6,1])for(const eye of texture.eyes){
      const state=projectedHeadState(actor,texture,yaw),glyph=numbers(projectedFeatureTransform(actor,texture,eye,yaw,'eye'));
      assert.ok(glyph[0]!>=.78&&glyph[0]!<=1.12);assert.equal(glyph[2],0);assert.equal(glyph[3],1);
      let matched=false;
      for(const [i,points] of headProjectionTriangles(actor).entries()){
        const [a,b,c]=points as [{x:number;y:number},{x:number;y:number},{x:number;y:number}],det=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        const u=((eye.x-a.x)*(c.y-a.y)-(eye.y-a.y)*(c.x-a.x))/det,v=((b.x-a.x)*(eye.y-a.y)-(b.y-a.y)*(eye.x-a.x))/det;
        if(u<0||v<0||u+v>1)continue;
        const m=numbers(String(state['head-projection-paint-'+i]!.attr!.transform));
        assert.ok(Math.abs(m[0]!*eye.x+m[2]!*eye.y+m[4]!-glyph[4]!)<.0002);
        assert.ok(Math.abs(m[1]!*eye.x+m[3]!*eye.y+m[5]!-glyph[5]!)<.0002);matched=true;break;
      }assert.equal(matched,true);
    }
  }
});
test('projected actor scene remains hash-staged, namespaced, declarative and within 2 MB',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile,plan}=fixture(actor),scene=performanceScene(plan,profile,silence),allowed=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(a=>a.path);
    const html=scene.files.files.find(f=>f.path==='index.html')!.content;
    assert.equal(scene.compiled.report.headArtwork?.turnRendering,'continuous-front-projection-32deg');
    assert.ok(!html.includes('data:image'));
    assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),{id:plan.id,startMs:0,endMs:2000} as Parameters<typeof validateSceneFiles>[1],2000000,allowed,plan.stage),[]);
  }
});
