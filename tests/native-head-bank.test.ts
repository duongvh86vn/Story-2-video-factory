// NOT RUN. Synthetic engineering registrations, not real/accepted actor art.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {nativeHeadBank,NativeHeadBankSchema,type NativeHeadBank} from '../packages/animation/native-head-bank.js';
import {nativeHeadBankCell,nativeHeadBankCellAtGlobal,nativeHeadBankFace,nativeHeadBankSvg,nativeHeadCellPoint,validateNativeHeadBankTrack} from '../packages/animation/body-head-bank.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-registration.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {HUNT_ANIMATION_VERSION,PerformancePlanSchema,type PerformancePlan} from '../packages/animation/schemas.js';
import {VIEW_ACTING_CLOCK_VERSION,ViewActingClockSchema,validateViewActingClock} from '../packages/animation/view-acting-clock.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {validateNativeHeadPng} from '../packages/animation/native-head-resources.js';
import {samplePerformance} from '../packages/animation/compiler.js';
import {VIEW_ACTOR_GAZE_VERSION,viewGazeTarget} from '../packages/animation/view-gaze-target.js';
import sharp from 'sharp';

function bank():NativeHeadBank{return nativeHeadBank({version:'native-head-bank-1',id:'synthetic-head-bank',actor:'lila',
  source:{file:'library/topics/prehistoric-life/head-turn-studies/lila-head-turn-v4.png',sha256:'b'.repeat(64),width:400,height:200},
  primary:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce'},
  bodyViews:[{view:'three-quarter-right',sourceHash:bodyViewRegistrations.lila['three-quarter-right'].sha256}],unitScale:.3,
  cells:[0,200].map((x,i)=>({id:'cell-'+i,crop:{x,y:0,width:200,height:200},neck:{x:x+100,y:180},neckTop:{x:x+100,y:150},chin:{x:x+105,y:145},eyeTarget:{x:x+110,y:100},skull:{x:x+40,y:30,width:120,height:110},yawDeg:10-i*5,seam:[{x:x+90,y:150},{x:x+110,y:150},{x:x+100,y:180}],restMood:'happy'})),
  routes:[['cell-0','cell-1'],['cell-1','cell-0']],capabilities:{speech:false,directionalEyes:false,expressions:false,secondary:false},
  status:'engineering-source-registration',approved:false,productionReady:false,motionVerified:false});}
function profile(b=bank()):HostProfile{const base=topicPreviewProfile('lila');return HostProfileSchema.parse({...base,appearance:{...base.appearance,artworkVersion:'forest-body-view-1',bodyView:'three-quarter-right',bodyHeadBank:b},profileHash:hash(b)});}
function fixture(){
  const b=bank(),p=profile(b),head={version:'native-head-source-1' as const,id:'head-route',ownerId:p.id,bankFingerprint:b.fingerprint,startMs:1000,endMs:3000,samples:[{atMs:0,cell:'cell-0'},{atMs:900,cell:'cell-1'}]};
  const plan:PerformancePlan=PerformancePlanSchema.parse({version:22,compilerVersion:HUNT_ANIMATION_VERSION,id:'shot-b',profileHash:p.profileHash,kind:'stick-man',leadCharacterId:p.id,durationMs:1000,fps:60,stage:{width:1280,height:720,groundY:630},root:{x:400,y:630},scale:1,facing:'right',headView:'three-quarter-right',walks:[],gestures:[],gazes:[],expressions:[],props:[],sourceHead:head});
  const clock=ViewActingClockSchema.parse({version:VIEW_ACTING_CLOCK_VERSION,ownerId:p.id,startMs:2000,endMs:3000,runStartMs:1000,runEndMs:3000,sourceIdentityHash:'a'.repeat(64),gazes:[],gestures:[],expressions:[],headMotion:head});
  return {b,p,plan,clock};
}
test('held art, false compatibility, forged geometry fingerprint and fixed-view overlays cannot enter a bank',()=>{
  const b=bank();const {fingerprint,...definition}=b;
  assert.equal(fingerprint,hash(definition));
  for(const sha256 of ['fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87','1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0','9946191d25bdb10c9729ba77e7112d66f4171a1dcec6b6ab55fdf05a794fdb21'])assert.throws(()=>nativeHeadBank({...definition,source:{...b.source,sha256}}),/Held/);
  for(const v of ['v2','v3'])assert.throws(()=>nativeHeadBank({...definition,source:{...b.source,file:b.source.file.replace('v4',v)}}),/Held/);
  assert.throws(()=>nativeHeadBank({...definition,bodyViews:[{...b.bodyViews[0]!,sourceHash:'c'.repeat(64)}]}),/compatibility/);
  assert.throws(()=>NativeHeadBankSchema.parse({...b,cells:b.cells.map(c=>({...c,chin:{...c.chin,x:c.chin.x+1}}))}),/fingerprint/);
  const p=profile(b);assert.throws(()=>HostProfileSchema.parse({...p,appearance:{...p.appearance,bodyEyes:'registered-eyes-v1'}}),/fixed-view/);
});
test('a camera slice and original gesture history select the same owned head cell without a local turn reset',()=>{
  const {p,plan,clock}=fixture();validateViewActingClock(plan,clock);
  assert.equal(nativeHeadBankCell(plan,p,0,clock).cell.id,'cell-1');
  assert.equal(nativeHeadBankCellAtGlobal(plan,p,1899.99,clock).cell.id,'cell-0');
  assert.equal(nativeHeadBankCellAtGlobal(plan,p,1900,clock).cell.id,'cell-1');
  assert.equal(nativeHeadBankCell(plan,p,1000,clock).cell.id,'cell-1');
  assert.throws(()=>nativeHeadBankCell(plan,p,0),/complete storyboard/);
  assert.throws(()=>nativeHeadBankCellAtGlobal(plan,p,999,clock),/outside/);
  assert.throws(()=>validateViewActingClock({...plan,sourceHead:{...plan.sourceHead!,bankFingerprint:'d'.repeat(64)}},clock),/differs/);
  assert.throws(()=>nativeHeadBankCell(plan,p,0,{...clock,ownerId:'another-actor'}),/owner/);
  assert.throws(()=>nativeHeadBankCell(plan,p,0,{...clock,startMs:1900}),/projection/);
  assert.throws(()=>nativeHeadBankCell(plan,p,0,{...clock,runStartMs:1100}),/exactly span/);
});
test('unknown routes and unsupported observer gaze or emotional art fail instead of borrowing fixed face layers',()=>{
  const {p,plan,clock}=fixture();assert.throws(()=>validateNativeHeadBankTrack({...plan,sourceHead:{...plan.sourceHead!,samples:[{atMs:0,cell:'missing'}]}},p),/unregistered/);
  assert.throws(()=>validateNativeHeadBankTrack({...plan,gazes:[{startMs:0,endMs:700,target:{x:100,y:100}}]},p),/needs-head-turn-eyes/);
  assert.throws(()=>validateNativeHeadBankTrack({...plan,expressions:[{startMs:0,endMs:700,mood:'angry'}]},p),/needs-head-turn-expression/);
  assert.throws(()=>samplePerformance(plan,p,0,{method:'audio-rms',windowMs:20,intervals:[{startMs:0,endMs:300,level:.7}]},undefined,clock),/needs-head-turn-voice/);
  const firstClock={...clock,startMs:1000,endMs:2000};
  assert.throws(()=>nativeHeadBankCell({...plan,gestures:[{id:'think-a',action:'think',startMs:0,endMs:1000,hand:'left'}]},p,0,firstClock),/needs-head-turn-interaction/);
  const target=viewGazeTarget({version:VIEW_ACTOR_GAZE_VERSION,actorId:p.id,startMs:1000,endMs:3000,sourceIdentityHash:'a'.repeat(64),profile:p,performance:{...plan,durationMs:2000}});
  const {sourceHead:ignored,...observer}=plan;
  const {headMotion:ignoredHead,...observerClock}=clock;
  const gaze={actorTarget:{id:p.id,anchor:'eyes' as const}};
  assert.throws(()=>validateViewActingClock({...observer,leadCharacterId:'observer',gazes:[{...gaze,startMs:0,endMs:100}]},{...observerClock,ownerId:'observer',gazes:[{...gaze,startMs:1100,endMs:2100}],actorTargets:[target]}),/needs-head-turn-interaction/);
});
test('source eye/chin transforms preserve uniform neck geometry and SVG draws one discrete cell',()=>{
  const b=bank(),p=profile(b),cell=b.cells[0]!;
  assert.deepEqual(nativeHeadCellPoint(b,cell,cell.neck),{x:0,y:0});
  assert.deepEqual(nativeHeadCellPoint(b,cell,cell.neckTop),{x:0,y:-9});
  const eye=nativeHeadCellPoint(b,cell,cell.eyeTarget);assert.equal(eye.x,3);assert.equal(eye.y,-24);
  const face=nativeHeadBankFace(b,'cell-1');assert.equal(face['head-view-bank-0']!.opacity,0);assert.equal(face['head-view-bank-1']!.opacity,1);
  const svg=nativeHeadBankSvg(p,(_file,sha)=>'assets/rigs/'+sha+'.png');assert.equal((svg.match(/<image /g)??[]).length,1);
  assert.ok(!svg.includes('mouth-talk')&&!svg.includes('eye-left')&&!svg.includes('scale(-'));
});
test('registered PNG framing rejects stale dimensions, non-RGBA and animated/truncated source bytes',async()=>{
  const bytes=await sharp({create:{width:10,height:12,channels:4,background:{r:100,g:80,b:20,alpha:0}}}).png().toBuffer();
  validateNativeHeadPng(bytes,10,12);
  assert.throws(()=>validateNativeHeadPng(bytes,11,12),/dimensions/);
  const rgb=Buffer.from(bytes);rgb[25]=2;assert.throws(()=>validateNativeHeadPng(rgb,10,12),/dimensions/);
  assert.throws(()=>validateNativeHeadPng(bytes.subarray(0,bytes.length-5),10,12),/Truncated|end/);
  const apng=Buffer.concat([bytes.subarray(0,33),Buffer.from([0,0,0,0,97,99,84,76,0,0,0,0]),bytes.subarray(33)]);assert.throws(()=>validateNativeHeadPng(apng,10,12),/animated/);
});
