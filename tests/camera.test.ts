import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { cameraMatrixAt, cameraPoint, planCamera, validateCamera, CAMERA_VIEWPORT } from '../packages/director/camera.js';
import { CameraSchema } from '../packages/director/schemas.js';
import { samplePerformance } from '../packages/animation/compiler.js';
import { rigMetrics } from '../packages/animation/rig.js';
import { secureSceneFiles, validateSceneFiles, validateSceneScript } from '../packages/scenes/security.js';

const activity={method:'audio-rms' as const,windowMs:20,intervals:[]};
const require=createRequire(import.meta.url),{gsap}=require('gsap/dist/gsap.js') as typeof import('gsap');
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(actual:number,expected:number,tolerance=.001)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);

async function fixture(t: Parameters<typeof temporary>[0], method: 'mechanism' | 'breakdown' | 'comparison' | 'question' = 'mechanism', durationMs=4000, text='Hơi nước đẩy pít-tông trong xi-lanh.', kind:'stick-man'|'mini-robot'='stick-man') {
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs,segments:[{id:'s1',startMs:0,endMs:durationMs,text}],words:[]};
  const story=StorySchema.parse({title:'Camera',story:text,style:{visual:'vector'}});
  const basic=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:durationMs,segmentIds:['s1'],narrationText:text,meaning:'cause',visualGoal:'show cause',importance:1});
  const beat={...basic,...groundedExplanation(story,narration,[basic],profile).beats[0]!,visualMethod:method};
  const input=explainerShot('shot1',0,durationMs,beat,narration,profile,rig),shot=directCinematicShot(input,beat,profile,config);
  return {shot,input,profile,rig,config,narration};
}

// Defect: every shot remains wide regardless of the action's explanatory purpose.
test('director uses medium for sustained mechanism/breakdown and wide for comparison or a short beat',async t=>{
  for(const method of ['mechanism','breakdown'] as const){const{shot,input}=await fixture(t,method);assert.equal(shot.cinematic!.camera.framing,'medium');assert.equal(shot.startMs,input.startMs);assert.equal(shot.endMs,input.endMs);assert.deepEqual(shot.sourceRefs,input.sourceRefs);}
  assert.equal((await fixture(t,'comparison')).shot.cinematic!.camera.framing,'wide');
  assert.equal((await fixture(t,'mechanism',1000)).shot.cinematic!.camera.framing,'wide');
});

// Defect: an explicit narrated discovery receives the same distant framing as any other beat.
test('director selects a face close only for a brief narrated discovery without contact',async t=>{
  const {shot}=await fixture(t,'question',1600,'Bất ngờ, người dẫn nhận ra hơi nước trong xi-lanh.');
  assert.equal(shot.cinematic!.camera.framing,'close');
  assert.equal((shot.cinematic!.camera as {focus?:string}).focus,'face');
  assert.equal((await fixture(t,'question',1600)).shot.cinematic!.camera.framing,'wide');
});

// Defect: the world ground stays fixed while the performer and objects move under the camera.
test('production camera contains the world ground, performer and objects and excludes the heading',async t=>{
  const {shot,profile,rig,config}=await fixture(t);
  const html=renderCinematic(shot,profile,rig,{method:'audio-rms',windowMs:20,intervals:[]},config).files.files.find(f=>f.path==='index.html')!.content;
  const group=html.indexOf('<g class="camera-rig"'),ground=html.indexOf(`M0 ${shot.cinematic!.performance.stage.groundY}H`),performer=html.indexOf('id="performer"');
  assert.ok(group>=0&&ground>group&&performer>ground,'world ground and performer must share the camera layer');
  assert.match(html,/clipPath/);assert.ok(html.lastIndexOf('Quan sát cách hoạt động')>html.lastIndexOf('</g>'));
});

test('contact close shows the manipulated object and keeps the hand on its world target for both rigs',async t=>{
  for(const kind of ['stick-man','mini-robot'] as const){
    for(const duration of [1600,4000]){
      const {shot,profile}=await fixture(t,'mechanism',duration,duration===1600?'Pít-tông chuyển động.':undefined,kind),c=shot.cinematic!,p=c.performance;
      assert.equal(c.camera.framing,duration===1600?'close':'medium');
      if(duration===1600)assert.equal(c.camera.focus,'contact');
      const g=p.gestures.find(g=>g.action==='operate')!;assert.ok(g?.contactMs!==undefined);
      for(const time of [g.contactMs,g.contactMs+40]){
        const frame=samplePerformance(p,profile,time,activity),matrix=cameraMatrixAt(c.camera,p.stage,p.durationMs,time);
        const hand=cameraPoint(frame.hands.right,matrix),target=cameraPoint(g.target!,matrix);
        assert.ok(distance(hand,target)<.05,`${kind} loses world contact after camera transform`);
        near(distance(hand,target),distance(frame.hands.right,g.target!)*matrix.scale);
      }
    }
  }
});

test('camera host bounds account for approved headScale/bodyScale and visible antenna rather than nominal body height',async t=>{
  for(const kind of ['stick-man','mini-robot'] as const){
    const {shot,profile}=await fixture(t,'question',1600,undefined,kind),c=shot.cinematic!,p=c.performance;
    profile.appearance.headScale=1.25;profile.appearance.bodyScale=.75;
    p.scale=720*.38/rigMetrics(profile).height;
    c.camera=planCamera(p,profile,{framing:'wide',movement:'locked',parts:shot.visualization!.parts});
    const bounds=validateCamera(shot,profile);
    assert.ok(c.camera.startScale<1,'large approved head/antenna needs a smaller wide scale');
    assert.ok(bounds.screenHostHeightRatio.start<=.4);
    for(const time of [0,700,1599]){
      const f=samplePerformance(p,profile,time,activity),match=/translate\(([-\d.]+) ([-\d.]+)\)/.exec(f.transforms.head!)!;
      const headTop=Number(match[2])-(kind==='mini-robot'?68:40)*p.scale*profile.appearance.headScale;
      const visibleRatio=(p.stage.groundY+6*p.scale-headTop)*c.camera.startScale/720;
      assert.ok(visibleRatio<=.4,`${kind} visible host is ${visibleRatio*100}% tall`);
    }
  }
});

test('camera allowlist rejects arbitrary transforms, nonfinite values, missing close intent and wrong framing scales',async t=>{
  const {shot}=await fixture(t),camera=shot.cinematic!.camera;
  for(const invalid of [{...camera,rotation:12},{...camera,anchor:{...camera.anchor,x:Infinity}},{...camera,startScale:'1.25'},
    {...camera,startScale:2},{...camera,framing:'wide',startScale:1.25},{...camera,framing:'close',startScale:2.4,endScale:2.4,focus:undefined}]){
    assert.equal(CameraSchema.safeParse(invalid).success,false);
  }
  assert.throws(()=>cameraMatrixAt(camera,{width:1280,height:720},0,0),/positive/);
  assert.throws(()=>cameraMatrixAt(camera,{width:1280,height:720},4000,NaN),/finite/);
});

test('production camera refuses a legacy angle that its 2D framing cannot render',async t=>{
  const {shot,profile}=await fixture(t);shot.camera.angle='top-down';
  assert.throws(()=>validateCamera(shot,profile),/eye-level.*supported|supports only eye-level/);
});

test('camera errors identify oversized wide framing, subtitle ground, heading crop and hidden contact',async t=>{
  const {shot,profile}=await fixture(t),c=shot.cinematic!,p=c.performance;
  c.camera={...c.camera,framing:'wide',movement:'locked',focus:'ensemble',startScale:1.1,endScale:1.1};
  assert.throws(()=>validateCamera(shot,profile),/wide host height must occupy 25–40%/);
  c.camera=planCamera(p,profile,{framing:'medium',movement:'locked',parts:shot.visualization!.parts});
  c.camera.anchor.y-=100;assert.throws(()=>validateCamera(shot,profile),/feet\/visual ground.*subtitle/);
  c.camera.anchor.y+=300;assert.throws(()=>validateCamera(shot,profile),/head.*heading/);
  c.camera=planCamera(p,profile,{framing:'close',movement:'locked',focus:'face'});
  assert.throws(()=>validateCamera(shot,profile),/face close would hide contact/);
  const {shot:face,profile:faceProfile}=await fixture(t,'question',1600,'Bất ngờ, người dẫn nhận ra hơi nước.');
  face.cinematic!.camera.anchor.x=1200;assert.throws(()=>validateCamera(face,faceProfile),/face close crops the face/);
});

// A world-space label can fit before zooming and still be clipped by the subtitle-safe viewport.
test('camera rejects a zoomed contact label that would be clipped while allowing the same world label in wide',async t=>{
  const {shot,profile}=await fixture(t,'mechanism',1600,'Pít-tông chuyển động.');
  const part=shot.visualization!.parts[0]!;
  part.label='Pít-tông chuyển động đẩy lực sang bộ phận tiếp theo trong mô hình minh họa';
  assert.throws(()=>validateCamera(shot,profile),/label.*safe|label.*subtitle/);
  shot.cinematic!.camera=planCamera(shot.cinematic!.performance,profile,{framing:'wide',movement:'locked',parts:shot.visualization!.parts});
  assert.doesNotThrow(()=>validateCamera(shot,profile));
});

test('medium and discovery cameras protect visible ground and face geometry including the robot antenna',async t=>{
  for(const kind of ['stick-man','mini-robot'] as const){
    const {shot,profile}=await fixture(t,'mechanism',4000,undefined,kind),c=shot.cinematic!,p=c.performance,m=rigMetrics(profile);
    for(const time of [0,500,1100,2000,3999,4000]){
      const frame=samplePerformance(p,profile,time,activity),matrix=cameraMatrixAt(c.camera,p.stage,p.durationMs,time);
      assert.ok(m.height*p.scale*matrix.scale/p.stage.height>=.4&&m.height*p.scale*matrix.scale/p.stage.height<=.65);
      for(const side of ['left','right'] as const){const foot=cameraPoint(frame.feet[side],matrix);assert.ok(foot.y+6*p.scale*matrix.scale<=p.stage.height*CAMERA_VIEWPORT.bottom);}
    }
    const face=await fixture(t,'question',1600,'Bất ngờ, người dẫn nhận ra hơi nước.',kind),fc=face.shot.cinematic!;
    for(const time of [0,250,700,1100,1599,1600]){
      const frame=samplePerformance(fc.performance,face.profile,time,activity),match=/translate\(([-\d.]+) ([-\d.]+)\)/.exec(frame.transforms.head!)!;
      const matrix=cameraMatrixAt(fc.camera,fc.performance.stage,fc.performance.durationMs,time),head=cameraPoint({x:Number(match[1]),y:Number(match[2])},matrix);
      const radius=(kind==='mini-robot'?68:40)*fc.performance.scale*matrix.scale;
      assert.ok(head.y-radius>=720*CAMERA_VIEWPORT.top&&head.y+radius<=720*CAMERA_VIEWPORT.bottom,'visible head/antenna must fit in close');
    }
  }
});

// Read only literal camera tween data from production output; never execute scene source.
function cameraProbe(source:string,id:string){
  assert.deepEqual(validateSceneScript(source,id),[]);
  const file=ts.createSourceFile('scene.js',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  const state={transform:''},timeline=gsap.timeline({paused:true});let count=0;
  const literal=(node:ts.Expression):unknown=>{
    if(ts.isStringLiteral(node))return node.text;if(ts.isNumericLiteral(node))return Number(node.text);
    if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
    if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(p=>{
      assert.ok(ts.isPropertyAssignment(p)&&(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)));
      return [p.name.text,literal(p.initializer)];
    }));
    throw new Error('Camera probe accepts only numeric/string/object literals.');
  };
  for(const statement of file.statements){
    if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))continue;
    const call=statement.expression,target=call.arguments[0];
    if(target&&ts.isObjectLiteralExpression(target)&&target.properties.length===0){
      const vars=literal(call.arguments[1]!) as {duration:number};timeline.to({},{duration:vars.duration},literal(call.arguments[2]!) as number);continue;
    }
    if(!target||!ts.isStringLiteral(target)||target.text!==`[data-composition-id="${id}"] .camera-rig`)continue;
    assert.ok(ts.isPropertyAccessExpression(call.expression));
    const vars=literal(call.arguments[1]!) as {attr:{transform:string};duration?:number;ease?:string;immediateRender?:boolean};
    const at=literal(call.arguments[2]!) as number;
    if(call.expression.name.text==='set')timeline.set(state,{transform:vars.attr.transform,immediateRender:vars.immediateRender},at);
    else {assert.equal(call.expression.name.text,'to');timeline.to(state,{transform:vars.attr.transform,duration:vars.duration,ease:vars.ease},at);}
    count++;
  }
  assert.ok(count>=1);gsap.ticker.sleep();
  return {timeline,state};
}

test('production camera timeline seeks independently in both directions without changing the narrative clock',async t=>{
  const {shot,profile,rig,config}=await fixture(t),p=shot.cinematic!.performance,before=structuredClone(p);
  for(const movement of ['push-in','pull-out','pan-left','pan-right','locked'] as const){
    shot.cinematic!.camera=planCamera(p,profile,{framing:'medium',movement,parts:shot.visualization!.parts});shot.camera.movement=movement;
    const {files}=renderCinematic(shot,profile,rig,activity,config);
    assert.deepEqual(validateSceneFiles(secureSceneFiles(files),shot,config.workflow.max_scene_bytes,[],config.rendering.final),[]);
    const {timeline,state}=cameraProbe(files.files.find(f=>f.path==='scene.js')!.content,shot.id);
    near(timeline.duration(),p.durationMs/1000);
    for(const time of [0,4000,1000,3000,0,2300,500,4000,0]){
      timeline.seek(time/1000,false);
      const match=/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(state.transform)!;assert.ok(match);
      const expected=cameraMatrixAt(shot.cinematic!.camera,p.stage,p.durationMs,time);
      near(Number(match[1]),expected.x);near(Number(match[2]),expected.y);near(Number(match[3]),expected.scale);
    }
    timeline.kill();
  }
  assert.deepEqual(p,before);
});

test('sourced props share the performer camera layer and approved environment uses the identical affine endpoints',async t=>{
  const {shot,profile,rig,config}=await fixture(t,'mechanism',6000,'Ta nhấc pin lên rồi đặt pin sang bên phải.'),p=shot.cinematic!.performance;
  const {files}=renderCinematic(shot,profile,rig,activity,config,'assets/environment.png');
  const html=files.files.find(f=>f.path==='index.html')!.content,js=files.files.find(f=>f.path==='scene.js')!.content;
  const group=html.indexOf('<g class="camera-rig"'),prop=html.indexOf('id="prop-model-prop-0"');
  assert.ok(prop>group&&prop<html.lastIndexOf('</g>'));
  const environmentCalls=js.split('\n').filter(line=>line.includes(' .environment'));
  assert.equal(environmentCalls.length,2);
  for(const [i,call] of environmentCalls.entries()){
    const match=/,(\{.*\}),0\);/.exec(call)!;assert.ok(match);
    const value=JSON.parse(match[1]!),expected=cameraMatrixAt(shot.cinematic!.camera,p.stage,p.durationMs,i===0?0:p.durationMs);
    near(value.x,expected.x);near(value.y,expected.y);near(value.scale,expected.scale);
  }
  assert.deepEqual(validateSceneFiles(secureSceneFiles(files),shot,config.workflow.max_scene_bytes,['assets/environment.png'],config.rendering.final),[]);
});
