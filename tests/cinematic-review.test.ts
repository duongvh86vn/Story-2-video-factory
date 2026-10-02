import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import sharp from 'sharp';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Shot, type Narration, type AssetManifest } from '../packages/core/schemas.js';
import { hash, writeJson } from '../packages/core/utils.js';
import { ModelRouter } from '../packages/models/registry.js';
import { parseHostProfile } from '../packages/host/profile.js';
import { buildRig, hostSvg } from '../packages/host/rig.js';
import { rigMetrics } from '../packages/animation/rig.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import { planCamera, validateCamera } from '../packages/director/camera.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { renderExplainer } from '../library/shots/explainer.js';
import { getStyle } from '../library/styles/index.js';
import type { HostGeometry } from '../packages/host/controller.js';
import { secureSceneFiles } from '../packages/scenes/security.js';
import { reviewProject, createPreviews, eventPreviewTimes } from '../packages/review/index.js';
import { HyperFramesEngine } from '../packages/render/hyperframes.js';
import { temporary } from './support.js';

const activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Framing='wide'|'medium'|'face'|'contact'|'diagram';

// Scene source and hash fixtures only: never invoke a renderer, FFmpeg, TTS or snapshots.
async function fixture(t:TestContext,framing:Framing='medium',textOverride?:string){
  const root=await temporary(t),cinematic=framing!=='diagram';
  const config=ConfigSchema.parse({presentation:{mode:cinematic?'story-cinematic':'diagram'},host:{profile:'library/characters/STICK-MAN.md'},rendering:{final:{width:1280,height:720,fps:30}}});
  const router=new ModelRouter(config,root),profile=await parseHostProfile(root,config,router),rig=buildRig(profile);
  await writeJson(path.join(root,'work/host-profile.json'),profile);await writeJson(path.join(root,'work/host-rig.json'),rig);
  await fs.mkdir(path.dirname(path.join(root,rig.assetPath)),{recursive:true});await fs.writeFile(path.join(root,rig.assetPath),hostSvg(profile));
  await writeJson(path.join(root,rig.posePath),{profileId:profile.id,profileVersion:profile.version,rigHash:rig.rigHash,poses:rig.poses});
  const durationMs=framing==='face'||framing==='contact'?1600:4000;
  const text=textOverride??(framing==='face'?'Bất ngờ, người dẫn nhận ra hơi nước.':framing==='contact'?'Pít-tông chuyển động.':'Hơi nước đẩy pít-tông trong xi-lanh.');
  const narration:Narration={mode:'srt',durationMs,segments:[{id:'s1',startMs:0,endMs:durationMs,text}],words:[]};
  const story=StorySchema.parse({title:'Framing',story:text,style:{visual:'vector'}});
  const basic=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:durationMs,segmentIds:['s1'],narrationText:text,meaning:'cause',visualGoal:'show cause',importance:1});
  const visualMethod=framing==='face'?'question':framing==='contact'||framing==='diagram'?'mechanism':framing==='medium'?'breakdown':'comparison';
  const beat={...basic,...groundedExplanation(story,narration,[basic],profile).beats[0]!,visualMethod} as const;
  const diagram=explainerShot('shot1',0,durationMs,beat,narration,profile,rig);
  const shot=cinematic?directCinematicShot(diagram,beat,profile,config):diagram;
  if(shot.cinematic){
    const c=shot.cinematic,p=c.performance;
    // A valid 50% world-size host makes the obsolete unprojected 40% ceiling fail.
    p.scale=720*.5/rigMetrics(profile).height;
    const focus=framing==='face'?'face':framing==='contact'?'contact':'ensemble';
    const size=framing==='face'||framing==='contact'?'close':framing as 'wide'|'medium';
    c.camera=planCamera(p,profile,{framing:size,movement:'locked',focus,target:p.gestures.find(g=>g.action==='operate')?.target,parts:shot.visualization!.parts});
    if(size==='medium')c.camera.startScale=c.camera.endScale=1.1;
    shot.camera={shotSize:size,movement:'locked',angle:'eye-level'};
    validateCamera(shot,profile);
  }
  const generated=shot.cinematic?renderCinematic(shot,profile,rig,activity,config):renderExplainer(shot,profile,rig,activity,getStyle(config),1280,720);
  const files=secureSceneFiles(generated.files),dir=path.join(root,'scenes/shot1');await fs.mkdir(dir,{recursive:true});
  for(const file of files.files)await fs.writeFile(path.join(dir,file.path),file.content);
  await writeJson(path.join(dir,'scene.json'),{shotId:shot.id});
  const geometry=generated.geometry;
  await writeJson(path.join(root,'work/narration.json'),narration);await writeJson(path.join(root,'work/beats.json'),[beat]);
  await writeJson(path.join(root,'work/speech-activity.json'),activity);
  await writeJson(path.join(root,'work/voice-report.json'),{version:2,status:'needs-voice',source:'silent-draft',provider:null,voiceId:null,narrationHash:hash(narration),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'segment',cues:[],warnings:[]});
  for(const file of ['scenes/index.html','scenes/master.js','work/master.json','previews/host-preview-sheet.png']){
    await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'hash fixture; no rendered media');
  }
  const board={shots:[shot]},characters={characters:[]},assets:AssetManifest={assets:[{id:shot.assetNeeds[0]!.id,type:'image',path:rig.assetPath,source:'template',status:'approved',hash:hash(await fs.readFile(path.join(root,rig.assetPath))),shotIds:[shot.id]}]};
  async function seal(){
    await writeJson(path.join(dir,'host-geometry.json'),geometry);
    const fractions=[0,.25,.5,.75,1],frames=[],actions=[],sheetHashes:Record<string,string>={};
    for(const fraction of fractions){
      const relative=`previews/shot1/f${fraction}.png`;await fs.mkdir(path.dirname(path.join(root,relative)),{recursive:true});await fs.writeFile(path.join(root,relative),'snapshot hash fixture');
      frames.push({shotId:shot.id,fraction,timeMs:Math.min(Math.round(durationMs*fraction),durationMs-1),path:relative,hash:hash(Buffer.from('snapshot hash fixture'))});
    }
    const times=new Set<number>(),step=Math.ceil(1000/config.rendering.final.fps);
    for(const g of geometry.interactions)for(const time of [g.reachMs-step,g.reachMs,g.reachMs+step])times.add(Math.max(0,Math.min(durationMs-1,time)));
    for(const time of eventPreviewTimes(shot))times.add(time);
    assert.ok(times.size,'fixture must contain temporal target evidence');
    for(const timeMs of times){const relative=`previews/shot1/action-${timeMs}.png`;await fs.writeFile(path.join(root,relative),'action hash fixture');actions.push({shotId:shot.id,fraction:timeMs/durationMs,timeMs,path:relative,hash:hash(Buffer.from('action hash fixture'))});}
    for(const relative of ['previews/contact-sheet-global.jpg','previews/shot1/contact-sheet.jpg','previews/shot1/action-sheet.jpg']){
      await fs.writeFile(path.join(root,relative),'sheet hash fixture');sheetHashes[relative]=hash(Buffer.from('sheet hash fixture'));
    }
    const sourceNames=['index.html','style.css','scene.js','scene.json','host-geometry.json'];
    const sceneHash=hash(Buffer.concat(await Promise.all(sourceNames.map(file=>fs.readFile(path.join(dir,file))))));
    const masterHash=hash(Buffer.concat(await Promise.all(['scenes/index.html','scenes/master.js','work/master.json'].map(file=>fs.readFile(path.join(root,file))))));
    await writeJson(path.join(root,'previews/manifest.json'),{frames,actions,sceneHashes:{shot1:sceneHash},masterHash,global:'previews/contact-sheet-global.jpg',sheetHashes});
  }
  await seal();
  const review=(model:ModelRouter=router)=>reviewProject(root,config,model,board,story,characters,assets);
  return {root,config,shot,geometry,profile,rig,board,seal,review};
}

test('action-sheet evidence includes the later cold state, not only an early pointing pose',async t=>{
  const f=await fixture(t,'wide','Xi-lanh phải nóng, nhưng lại cần được làm nguội trong mỗi chu kỳ.');
  const png=await sharp({create:{width:128,height:72,channels:3,background:'#fff'}}).png().toBuffer();
  // Request coverage only; mocked pixels do not constitute visual acceptance.
  t.mock.method(HyperFramesEngine.prototype,'snapshots',async(request:{project:string;frames:{timeMs:number;output:string}[]})=>{
    const outputs=[];for(const frame of request.frames){const file=path.join(f.root,frame.output);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,png);outputs.push(file);}return outputs;
  });
  await createPreviews(f.root,f.config,f.board);
  const file=path.join(f.root,'previews/manifest.json'),manifest=JSON.parse(await fs.readFile(file,'utf8'));
  assert.ok(manifest.actions.some((frame:{timeMs:number})=>frame.timeMs===3000),'cold phase at 3 seconds must appear in the action sheet');
  manifest.actions=manifest.actions.filter((frame:{timeMs:number})=>frame.timeMs!==3000);await fs.writeFile(file,JSON.stringify(manifest));
  await assert.rejects(()=>f.review(),/event evidence/,'an incomplete state sheet cannot pass review by retaining early reach captures');
});

for(const framing of ['wide','medium','face','contact'] as const)test(`framing review accepts validated ${framing} without imposing the diagram world-height ceiling`,async t=>{
  const f=await fixture(t,framing),report=validateCamera(f.shot,f.profile);
  assert.ok(f.geometry.hostHeightRatio>.4,'exercise the obsolete size rejection');
  assert.equal(report.intentionalBodyCrop,framing==='face'||framing==='contact');
  const reviewed=await f.review();assert.equal(reviewed.pass,true,JSON.stringify(reviewed.issues));
  assert.match(reviewed.warnings.join(' '),/not been inspected/,'metadata review is not pixel acceptance');
});

test('cinematic framing preserves geometry/profile identity checks including forged world-height metadata',async t=>{
  const f=await fixture(t,'medium'),original=structuredClone(f.geometry);
  for(const change of [
    (g:HostGeometry)=>{g.rigHash='wrong';},(g:HostGeometry)=>{g.profileHash='wrong';},(g:HostGeometry)=>{g.hostHeightRatio=.6;},
  ]){
    Object.assign(f.geometry,structuredClone(original));change(f.geometry);await f.seal();
    assert.ok((await f.review()).issues.some(i=>i.type==='host-identity'&&i.severity==='high'));
  }
});

test('contact close still fails review for contact error or timing drift',async t=>{
  const f=await fixture(t,'contact'),g=f.geometry.interactions.find(g=>g.type==='operate-model')!;assert.ok(g);
  const original=structuredClone(g);
  for(const change of [(g:typeof original)=>{g.errorPx=3;},(g:typeof original)=>{g.contactMs=g.reachMs+1;}]){
    Object.assign(g,original);change(g);await f.seal();
    assert.ok((await f.review()).issues.some(i=>i.type==='host-contact'&&i.severity==='high'));
  }
});

test('cinematic framing keeps caption, narrative source, target and scene-source validation',async t=>{
  const f=await fixture(t,'medium'),original=structuredClone(f.shot);
  const changes=[
    (shot:Shot)=>{shot.captionRegion=undefined;},
    (shot:Shot)=>{shot.sourceRefs![0]!.quote='Invented claim absent from narration';shot.cinematic!.sourceRefs=shot.sourceRefs!;},
    (shot:Shot)=>{shot.host!.actions[0]!.target!.partId='missing-part';},
  ];
  for(const change of changes){
    Object.assign(f.shot,structuredClone(original));change(f.shot);
    let reviewed:Awaited<ReturnType<typeof f.review>>;
    try{reviewed=await f.review();}
    catch(error){assert.match(String(error),/source|target|part|specification|cinematic/i);continue;}
    assert.equal(reviewed.pass,false);assert.ok(reviewed.issues.some(i=>i.severity==='high'&&/host-plan|host-scene-integrity/.test(i.type)));
  }
  Object.assign(f.shot,original);
  await fs.appendFile(path.join(f.root,'scenes/shot1/index.html'),'<p>Injected source</p>');await f.seal();
  assert.ok((await f.review()).issues.some(i=>i.type==='host-scene-integrity'&&i.severity==='high'));
});

test('review refuses a medium camera that leaves the subtitle-safe ground region',async t=>{
  const f=await fixture(t,'medium');f.shot.cinematic!.camera.anchor.y-=130;
  await assert.rejects(f.review(),/camera.*subtitle|camera.*host height/);
});

test('review rejects oversized wide framing and cropped face/contact focus even when close body cropping is intentional',async t=>{
  const wide=await fixture(t,'wide');wide.shot.cinematic!.camera.startScale=wide.shot.cinematic!.camera.endScale=1.12;
  await assert.rejects(wide.review(),/wide host height must occupy 25–40%/);
  const face=await fixture(t,'face');face.shot.cinematic!.camera.anchor.x=1200;
  await assert.rejects(face.review(),/face close crops the face/);
  const contact=await fixture(t,'contact');contact.shot.cinematic!.camera.anchor.y-=130;
  await assert.rejects(contact.review(),/target\/hand is cropped/);
});

test('diagram review retains the original inclusive 25–40% height thresholds',async t=>{
  const f=await fixture(t,'diagram');
  for(const [ratio,invalid] of [[.25,false],[.4,false],[.249,true],[.401,true]] as const){
    f.geometry.hostHeightRatio=ratio;await f.seal();
    assert.equal((await f.review()).issues.some(i=>i.type==='host-identity'),invalid,String(ratio));
  }
});

test('vision framing context receives validated camera intent while retaining focus, caption and source scrutiny',async t=>{
  const f=await fixture(t,'face');let captured:unknown;
  const router={supportsVision:()=>true,review:async(request:unknown)=>{captured=request;return{text:JSON.stringify({pass:true,issues:[],warnings:[]})};}} as unknown as ModelRouter;
  await f.review(router);
  const request=captured as {system:string;context:{cameraReports:Array<{shotId:string;focus:string;intentionalBodyCrop:boolean}>}};
  assert.equal(request.context.cameraReports[0]!.shotId,f.shot.id);assert.equal(request.context.cameraReports[0]!.focus,'face');assert.equal(request.context.cameraReports[0]!.intentionalBodyCrop,true);
  assert.match(request.system,/intentional|deliberate/);assert.match(request.system,/focus|face/);assert.match(request.system,/caption|subtitle/);assert.match(request.system,/source/);
});
