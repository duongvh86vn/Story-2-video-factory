// DECLARED ONLY, NOT RUN. Runtime, camera geometry and video belong to the user's test model.
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {promises as fs} from 'node:fs';
import {ConfigSchema} from '../packages/core/config.js';
import type {Storyboard} from '../packages/core/schemas.js';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import type {HostRig} from '../packages/host/schemas.js';
import type {ModelRouter} from '../packages/models/registry.js';
import {ModelError,type ModelRequest} from '../packages/models/adapter.js';
import {jsonSchemaFor} from '../packages/models/adapter.js';
import {planningCacheIdentity,reuseAcceptedPlanning} from '../packages/story/planning-cache.js';
import {CameraDirectionSchema,CAMERA_DIRECTION_VERSION,type CameraDirection} from '../packages/director/camera-direction-schemas.js';
import {applyCameraDirection,assertCameraOnlyChange,directCameraStoryboard} from '../packages/director/camera-direction.js';
import {currentCameraDirectionReport} from '../packages/director/camera-direction-report.js';
import {repairCinematicCameras} from '../packages/director/camera-repair.js';
import {SettingsPatchSchema} from '../packages/orchestrator/settings.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

async function temporary(t:TestContext){const root=await fs.mkdtemp(path.join(os.tmpdir(),'camera-direction-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
function plan(board:Storyboard,locked:string[]=[]):CameraDirection{return {version:CAMERA_DIRECTION_VERSION,shots:board.shots.filter(s=>!locked.includes(s.id)).map(s=>({shotId:s.id,
  camera:{...s.cinematic!.camera,anchor:{...s.cinematic!.camera.anchor,x:490},designIntent:'Hold the original two-person action axis; keep contact and listener readable.'},
  purpose:'interaction',rationale:'The source action is shared; avoid hiding the second owner.',continuity:'Same original stage and screen direction across this camera cut.'}))};}
function harness(){const f=sourceInteractionFixture(),requests:ModelRequest[]=[];let calls=0,validated=0;
  f.config.models.camera={...f.config.models.camera,provider:'gateway',model:'camera-unit-test'};f.config.retry.structured_output=0;
  const router={isMock:()=>false,usageSummary:()=>({calls}),structured:async(_role:unknown,input:ModelRequest)=>{calls++;requests.push(input);return plan(f.board);}} as unknown as ModelRouter;
  const context={narration:f.narration,beats:[],profile:f.profiles[0]!,rig:{rigHash:'candidate-rig'} as HostRig,origin:'model' as const,
    validate:(board:Storyboard)=>{validated++;assertCameraOnlyChange(f.board,board,[]);return board;}};
  return {...f,requests,router,context,getCalls:()=>calls,getValidated:()=>validated};
}

test('camera inherits director without shared mutable settings, supports explicit routing and reset',()=>{
  const director={provider:'gateway',model:'named-director',base_url:'http://127.0.0.1:20128/v1'};
  const inherited=ConfigSchema.parse({models:{storyboard:director}});assert.deepEqual(inherited.models.camera,inherited.models.storyboard);
  inherited.models.camera.temperature=.1;assert.notEqual(inherited.models.camera.temperature,inherited.models.storyboard.temperature);
  const explicit=ConfigSchema.parse({models:{storyboard:director,camera:{provider:'gateway',model:'named-camera'}}});assert.equal(explicit.models.camera.model,'named-camera');
  const reset=ConfigSchema.parse({models:{storyboard:director,camera:null}});assert.equal(reset.models.camera.model,'named-director');
  assert.deepEqual(SettingsPatchSchema.parse({models:{camera:null},presentation:{camera_agent:false}}).models,{camera:null});
});

test('camera plan changes only unlocked cameras and preserves all original source clocks, owners and cues',()=>{
  const f=sourceInteractionFixture(),before=hash(f.board),lock=f.board.shots[1]!,p=plan(f.board,[lock.id]);
  const result=applyCameraDirection(f.board,p,[lock]);assert.equal(hash(f.board),before);assert.deepEqual(result.shots[1],lock);
  assert.equal(result.shots[0]!.camera.angle,'eye-level');assert.equal(result.shots[0]!.cinematic!.camera.anchor.x,490);
  for(let i=0;i<result.shots.length;i++){
    assert.deepEqual(result.shots[i]!.cinematic!.performance,f.board.shots[i]!.cinematic!.performance);
    assert.deepEqual(result.shots[i]!.cinematic!.actorScene,f.board.shots[i]!.cinematic!.actorScene);
    assert.deepEqual(result.shots[i]!.host,f.board.shots[i]!.host);assert.deepEqual(result.shots[i]!.visualization,f.board.shots[i]!.visualization);
  }
});

test('unknown/locked/duplicate/missing shots, new actor fields and unsupported camera fields are rejected',()=>{
  const f=sourceInteractionFixture();
  const invalid=[{...plan(f.board),shots:plan(f.board).shots.slice(1)},
    {...plan(f.board),shots:[...plan(f.board).shots,plan(f.board).shots[0]!]},
    {...plan(f.board),shots:plan(f.board).shots.map((s,i)=>i? s:{...s,shotId:'unknown-shot'})}];
  for(const p of invalid)assert.throws(()=>applyCameraDirection(f.board,p,[]));
  assert.throws(()=>applyCameraDirection(f.board,plan(f.board),[f.board.shots[0]!]));
  assert.throws(()=>CameraDirectionSchema.parse({...plan(f.board),actors:[]}));
  assert.throws(()=>CameraDirectionSchema.parse({...plan(f.board),shots:[{...plan(f.board).shots[0],camera:{...plan(f.board).shots[0]!.camera,angle:'overhead'}}]}));
});

test('domain normalizer cannot edit an original grip, floor, narration cut or approved camera',()=>{
  const f=sourceInteractionFixture();
  for(const mutation of [(b:Storyboard)=>{b.shots[0]!.cinematic!.performance.stage.groundY--;},
    (b:Storyboard)=>{b.shots[0]!.endMs--;},
    (b:Storyboard)=>{b.shots[0]!.cinematic!.performance.sourceManipulation!.gestures[0]!.hand='left';}]){
    const changed=structuredClone(f.board);mutation(changed);assert.throws(()=>assertCameraOnlyChange(f.board,changed,[]),/cannot change/);
  }
  const changed=structuredClone(f.board);changed.shots[0]!.cinematic!.camera.anchor.x--;
  assert.throws(()=>assertCameraOnlyChange(f.board,changed,[f.board.shots[0]!]),/lock changed/);
});

test('camera request receives complete original board and validation result never approves art or motion',async t=>{
  const f=harness(),root=await temporary(t),before=hash(f.board);const result=await directCameraStoryboard(root,f.config,f.router,f.board,[],f.context);
  assert.equal(f.getCalls(),1);assert.equal(f.getValidated(),1);assert.equal(hash(f.board),before);
  assert.deepEqual((f.requests[0]!.context as {storyboard:Storyboard}).storyboard,f.board);
  const report=await readJson<Record<string,unknown>>(path.join(root,'work/camera-direction-report.json'));
  assert.equal(report.storyboardHash,hash(result));assert.equal(report.providerCalled,true);assert.equal(report.visualAcceptance,false);
  assert.equal(report.motionVerified,false);assert.equal(report.productionApproval,false);
});

test('authored/offline/disabled/all-locked paths retain existing cameras with no provider request',async t=>{
  for(const mode of ['authored','offline','disabled','all-locked'] as const){const f=harness(),root=await temporary(t);
    if(mode==='disabled')f.config.presentation.camera_agent=false;
    const result=await directCameraStoryboard(root,f.config,f.router,f.board,mode==='all-locked'?f.board.shots:[],{...f.context,origin:mode==='authored'||mode==='offline'?mode:'model'});
    assert.equal(hash(result),hash(f.board));assert.equal(f.getCalls(),0);
    const report=await readJson<Record<string,unknown>>(path.join(root,'work/camera-direction-report.json'));assert.equal(report.providerCalled,false);
  }
});

test('camera domain or provider budget error blocks acceptance while preserving original director data',async t=>{
  for(const mode of ['domain','budget'] as const){const f=harness(),root=await temporary(t),before=hash(f.board);
    if(mode==='budget')f.router.structured=async()=>{throw new ModelError('call_budget','Human test budget exhausted');};
    await assert.rejects(()=>directCameraStoryboard(root,f.config,f.router,f.board,[],{...f.context,validate:()=>{throw new Error('needs-view: actual actor source is missing');}}),/needs-view|budget/);
    assert.equal(hash(f.board),before);const report=await readJson<Record<string,unknown>>(path.join(root,'work/camera-direction-report.json'));
    assert.equal(report.status,'needs-camera-direction');assert.equal(report.productionApproval,false);
  }
});

test('bare edited camera aggregate/receipt without provider and journal proof cannot authorize reuse',async t=>{
  const f=harness(),root=await temporary(t);
  await writeJson(path.join(root,'work/camera-direction-cache.json'),{storyboard:f.board,accepted:true});
  await writeJson(path.join(root,'work/attempts/camera-direction/forged/01.json'),{status:'accepted',response:plan(f.board),result:f.board});
  await directCameraStoryboard(root,f.config,f.router,f.board,[],f.context);assert.equal(f.getCalls(),1);
});

test('camera receipt requires exact generation settings even with a complete provider/journal proof',async t=>{
  const f=harness(),root=await temporary(t),value=plan(f.board),result=applyCameraDirection(f.board,value,[]);
  const request:ModelRequest={system:'Camera-only unit contract',prompt:'Keep source and locks',context:{storyboard:f.board}},binding={source:hash(f.board)};
  const schema=jsonSchemaFor(CameraDirectionSchema),settings=f.config.models.camera;
  const requestHash=hash({role:'camera',operation:'structured',input:request,schema,routing:[{provider:settings.provider,model:settings.model,base_url:settings.base_url}]}),text=JSON.stringify(value);
  const start={version:1,event:'started',id:'camera-request',callId:'camera-test-call',requestHash,timestamp:'2026-10-09T00:00:00Z',role:'camera',routedRole:'camera',provider:settings.provider,model:settings.model,operation:'structured',attempt:1,promptHash:hash(request),status:'pending'};
  const completion={...start,event:'completed',status:'success',responseHash:hash(text)};
  await fs.mkdir(path.join(root,'logs'),{recursive:true});await fs.writeFile(path.join(root,'logs/model-calls.jsonl'),JSON.stringify(start)+'\n'+JSON.stringify(completion)+'\n');
  await writeJson(path.join(root,'work/model-attempts/camera-test-call.json'),{...completion,request,schema,response:{text}});
  const receipt={status:'accepted',request,binding,response:value,result};const file=path.join(root,'work/attempts/camera-direction/proof/01.json');
  const reuse=()=>reuseAcceptedPlanning(root,f.config,'camera','camera-direction',request,CameraDirectionSchema,p=>applyCameraDirection(f.board,p,[]),binding);
  await writeJson(file,receipt);assert.equal(await reuse(),undefined);
  await writeJson(file,{...receipt,cacheIdentity:planningCacheIdentity(f.config,'camera',request,CameraDirectionSchema,binding),baseRequestHash:hash(request)});
  assert.deepEqual((await reuse())?.result,result);
  f.config.models.camera.temperature+=.1;assert.equal(await reuse(),undefined);
});

test('storyboard revision keeps old camera rationale historical and exports current canonical cameras',()=>{
  const f=sourceInteractionFixture(),oldHash=hash(f.board),direction=plan(f.board);
  const previous={version:CAMERA_DIRECTION_VERSION,status:'domain-validated',storyboardHash:oldHash,direction,agentDecisionCurrent:true,providerCalled:true};
  const retained=currentCameraDirectionReport(f.board,previous);assert.equal(retained.status,'domain-validated');assert.equal(retained.productionApproval,false);
  const changed=structuredClone(f.board);changed.shots[0]!.cinematic!.artDirection!.brief+=' Updated story art.';
  const refreshed=currentCameraDirectionReport(changed,previous);assert.equal(refreshed.status,'canonical-revised');assert.equal(refreshed.storyboardHash,hash(changed));
  assert.equal(refreshed.priorDirectedStoryboardHash,oldHash);assert.deepEqual(refreshed.priorDirection,direction);assert.equal(refreshed.direction,undefined);
  assert.equal(refreshed.agentDecisionCurrent,false);assert.equal(refreshed.providerCalled,false);assert.equal(refreshed.visualAcceptance,false);
});

test('repair feedback changes request identity and only selected unlocked cameras can change',async t=>{
  const f=harness(),root=await temporary(t),protectedShot=f.board.shots[1]!,feedback=[{shotId:f.board.shots[0]!.id,type:'camera-layout',severity:'high' as const,description:'Listener head cropped in the previous draft',repair:'Widen this camera'}];
  f.router.structured=(async(_role:unknown,input:ModelRequest)=>{f.requests.push(input);return plan(f.board,[protectedShot.id]);}) as ModelRouter['structured'];
  await writeJson(path.join(root,'work/camera-direction-report.json'),{status:'previous-draft',storyboardHash:hash(f.board)});
  const result=await directCameraStoryboard(root,f.config,f.router,f.board,[protectedShot],{...f.context,repairFeedback:feedback},{reportPath:'work/artwork-transactions/human-test/work/camera-direction-report.json'});
  assert.deepEqual(result.shots[1],protectedShot);assertCameraOnlyChange(f.board,result,[protectedShot]);
  assert.deepEqual((f.requests[0]!.context as {reviewFeedback:unknown}).reviewFeedback,feedback);
  assert.equal((f.requests[0]!.context as {task:string}).task,'camera-repair');
  const accepted=await readJson<Record<string,unknown>>(path.join(root,'work/camera-direction-report.json'));assert.equal(accepted.status,'previous-draft');
  const staged=await readJson<Record<string,unknown>>(path.join(root,'work/artwork-transactions/human-test/work/camera-direction-report.json'));
  assert.equal(staged.task,'camera-repair');assert.equal(staged.feedbackHash,hash(feedback));assert.equal(staged.productionApproval,false);
});

test('camera repair source defects block before provider and unchanged non-camera feedback is retained',async t=>{
  const f=harness(),root=await temporary(t),nonCamera=[{shotId:f.board.shots[0]!.id,type:'actor-identity',severity:'high' as const,description:'Original costume changed',repair:'Restore original source'}];
  const untouched=await repairCinematicCameras(root,f.config,f.router,f.board,nonCamera);assert.deepEqual(untouched.remainingIssues,nonCamera);assert.deepEqual(untouched.shotIds,[]);
  const camera={...nonCamera[0]!,type:'camera-layout'},source={...nonCamera[0]!,type:'camera-source'};
  await assert.rejects(()=>repairCinematicCameras(root,f.config,f.router,f.board,[source]),/needs-camera-source/);assert.equal(f.getCalls(),0);
  await assert.rejects(()=>repairCinematicCameras(root,f.config,f.router,f.board,[camera,source]),/needs-camera-source/);assert.equal(f.getCalls(),0);
  f.config.presentation.camera_agent=false;
  await assert.rejects(()=>repairCinematicCameras(root,f.config,f.router,f.board,[camera]),/enabled real camera agent/);assert.equal(f.getCalls(),0);
});

test('camera-only guard retains every top-level canonical field outside cameras',()=>{
  const f=sourceInteractionFixture(),changed=structuredClone(f.board) as Storyboard&{canonicalSource?:string};
  changed.canonicalSource='an unrelated replacement source';
  assert.throws(()=>assertCameraOnlyChange(f.board,changed,[]),/cannot change/);
});
