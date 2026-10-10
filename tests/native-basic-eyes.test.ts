// DECLARED / NOT RUN. All fixture/schema/SVG/sampler/geometry calls are inside
// callbacks. These unit fixtures do not accept the complete video factory.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {BASIC_BODY_EYES_SELECTION,BASIC_EYE_VIEWS,bodyViewBasicEyesRegistration} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_UNREGISTERED_OPTIONS} from '../packages/animation/body-view-basic-capabilities.js';
import {registeredBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {bodyViewEyeCenter,registeredBodyViewEyes,bodyViewEyesSvg,bodyViewEyesState,bodyViewEyesMatrixError,bodyViewEyesRegistration} from '../packages/animation/body-view-eyes.js';
import {bodyCalibrationPlan,BODY_EYES_MODES} from '../packages/topics/body-workbench.js';
import {samplePerformance,nativeActorEyeAnchor,sourceActorEyeAnchor} from '../packages/animation/compiler.js';
import {VIEW_ACTOR_GAZE_VERSION,viewGazeTarget,ViewGazeTargetSchema} from '../packages/animation/view-gaze-target.js';
import {VIEW_ACTING_CLOCK_VERSION,type ViewActingClock} from '../packages/animation/view-acting-clock.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import type {Storyboard,Shot} from '../packages/core/schemas.js';

test('six eye registrations bind their own source pixels and profiles expose only the one visible eye',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const c=bodyViewBasicEyesRegistration[actor][view],bytes=readFileSync(c.file),meta=JSON.parse(readFileSync(c.file.replace('.png','.json'),'utf8'));
    assert.equal(hash(bytes),c.sourceHash);assert.equal(meta.sha256,c.sourceHash);
    assert.deepEqual(c.sourceSize,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
    assert.equal(meta.approved,false);assert.equal(meta.productionReady,false);assert.equal(c.eyes.length,view==='front'?2:1);
    assert.deepEqual(c.eyes.map(e=>e.slot),view==='front'?['screen-left','screen-right']:[view==='left'?'screen-left':'screen-right']);
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION),body=registeredBodyView(f.profile);
    assert.equal(body.sha256,c.sourceHash);assert.deepEqual([body.width,body.height],c.sourceSize);
    for(const old of Object.values(bodyViewEyesRegistration[actor]))assert.notEqual(old.sourceHash,c.sourceHash);
  }
});

test('raw/schema selection boundaries allow only own front/profile eyes and keep unavailable basic capabilities rejected',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION);
    assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));assert.equal(registeredBodyViewEyes(f.profile).sourceHash,registeredBodyView(f.profile).sha256);
    for(const key of BASIC_UNREGISTERED_OPTIONS)for(const value of [false,null,'selected',{},[]]){
      const raw={...f.profile,appearance:{...f.profile.appearance,[key]:value}} as unknown as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredBodyViewEyes(raw));
    }
    assert.throws(()=>registeredBodyViewEyes(f.profile,'0'.repeat(64)),/coordinates/);
    assert.throws(()=>HostProfileSchema.parse({...f.profile,appearance:{...f.profile.appearance,bodyEyes:'registered-eyes-v1'}}));
    for(const wrongView of ['back-left','back-right','three-quarter-left','three-quarter-right'] as const){
      const raw={...f.profile,appearance:{...f.profile.appearance,bodyView:wrongView}};
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyViewEyes(raw));
    }
  }
});

test('eye SVG retains its own raster and explicit visible slots without manufacturing a second profile eye or face warp',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION),c=bodyViewBasicEyesRegistration[actor][view];
    const source={sha256:c.sourceHash,width:c.sourceSize[0],height:c.sourceSize[1],url:'assets/rigs/'+c.sourceHash+'.png'},svg=bodyViewEyesSvg(profile,source);
    for(const eye of c.eyes)assert.ok(svg.includes(`id="view-eye-${eye.slot}-glyph"`));
    if(view!=='front')assert.ok(!svg.includes(`id="view-eye-${view==='left'?'screen-right':'screen-left'}-glyph"`));
    assert.match(svg,/id="view-eyes-layer" opacity="0"/);assert.doesNotMatch(svg,/scale\(-1|nose-|hair-|brow-/);
    const head=bodyViewHeadSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');assert.ok(head.includes(source.url));
    assert.match(head,/mask="url\(#view-eyes-source-mask\)"/);assert.equal((head.match(/id="view-eyes-source-erase"/g)??[]).length,1);
    assert.throws(()=>bodyViewEyesSvg(profile,{...source,url:'https://example.invalid/x.png'}),/Unapproved eye/);
    assert.throws(()=>bodyViewEyesSvg(profile,{...source,width:source.width+1}),/dimensions/);
  }
});

test('new native pupil/blink channels stay bounded, deterministic and limited to the registered visible eye slots',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const c=bodyViewBasicEyesRegistration[actor][view],before=structuredClone(c);
    assert.equal(bodyViewEyesState(c,{x:0,y:0},0).face['view-eyes-layer']!.opacity,0);
    for(const blink of [0,.4,.7,1])for(const look of [{x:0,y:0},{x:1,y:0},{x:-1,y:0},{x:0,y:1}]){
      const state=bodyViewEyesState(c,look,blink);assert.deepEqual(state,bodyViewEyesState(c,look,blink));
      assert.equal(Object.keys(state.face).length,2+c.eyes.length*2);
      assert.equal(state.face['view-eyes-source-erase']!.opacity,state.face['view-eyes-layer']!.opacity);
      for(const eye of c.eyes){const id='view-eye-'+eye.slot,m=state.face[id+'-glyph']!.attr!.transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        assert.equal(m[0],1);assert.ok(m[3]!>=.02&&m[3]!<=1);assert.ok(Math.abs(m[4]!)<=eye.shift.x);
        if(blink===1){assert.equal(state.face[id+'-glyph']!.opacity,0);assert.equal(state.face[id+'-lid']!.opacity,1);}
      }
      assert.equal(bodyViewEyesMatrixError(c,state.face,state.face,state.face,.5),0);
    }
    assert.deepEqual(c,before);assert.throws(()=>bodyViewEyesState(c,{x:2,y:0},0),/invalid bounded/);
  }
});

test('workbench/API mode requires explicit own-eye selection and keeps rear/speech/motion/turn selections unavailable',()=>{
  assert.ok(BODY_EYES_MODES.includes(BASIC_BODY_EYES_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    for(const look of ['rest','ahead','up','down'] as const){const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION,look);assert.equal(f.profile.appearance.bodyEyes,BASIC_BODY_EYES_SELECTION);}
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent','registered-eyes-v1'));
    for(const action of ['run','jump','head-turn'] as const)assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION));
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','registered-mouth-v1',BASIC_BODY_EYES_SELECTION));
  }
  for(const view of ['source','back-left','back-right','three-quarter-left','three-quarter-right'] as const)assert.throws(()=>bodyCalibrationPlan('lila','rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION));
});

test('front receives targets on both sides while own profile targets behind the fixed head still require an authored turn',()=>{
  const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION);
    for(const target of [{x:-100,y:200},{x:600,y:200}]){
      const plan={...f.plan,gazes:[{startMs:0,endMs:f.plan.durationMs,target}]},behind=view==='left'?target.x>210:view==='right'?target.x<210:false;
      if(behind)assert.throws(()=>samplePerformance(plan,f.profile,1771,silence),/behind the fixed native view/);
      else for(const time of [0,1771,2800,500,1771])assert.doesNotMatch(JSON.stringify(samplePerformance(plan,f.profile,time,silence)),/NaN|Infinity/);
    }
  }
});

test('own physical gaze anchor matches an independent projection of the rendered head with one or two visible eyes',()=>{
  const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EYE_VIEWS){
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BASIC_BODY_EYES_SELECTION),c=registeredBodyView(f.profile),eyes=registeredBodyViewEyes(f.profile);
    const source=viewGazeTarget({version:VIEW_ACTOR_GAZE_VERSION,actorId:actor,startMs:0,endMs:f.plan.durationMs,sourceIdentityHash:'a'.repeat(64),profile:f.profile,performance:f.plan});
    assert.doesNotThrow(()=>ViewGazeTargetSchema.parse(source));
    const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:actor,startMs:0,endMs:f.plan.durationMs,runStartMs:0,runEndMs:f.plan.durationMs,sourceIdentityHash:source.sourceIdentityHash,gazes:[],gestures:[],expressions:f.plan.expressions};
    const center={x:eyes.eyes.reduce((v,e)=>v+e.center.x,0)/eyes.eyes.length,y:eyes.eyes.reduce((v,e)=>v+e.center.y,0)/eyes.eyes.length};assert.deepEqual(bodyViewEyeCenter(eyes),center);
    for(const time of [0,2180,2700,2770,3999,2180]){
      const frame=samplePerformance(f.plan,f.profile,time,silence,undefined,clock),values=frame.transforms.head!.match(/-?\d+(?:\.\d+)?/g)!.map(Number),[x,y,angle,scale]=values as [number,number,number,number],r=angle*Math.PI/180;
      const px=(center.x-c.neck.x)*c.headScale*scale,py=(center.y-c.neck.y)*c.headScale*scale,expected={x:x+px*Math.cos(r)-py*Math.sin(r),y:y+px*Math.sin(r)+py*Math.cos(r)};
      for(const actual of [nativeActorEyeAnchor(f.plan,f.profile,time,clock),sourceActorEyeAnchor(source,time)])assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<.01);
    }
  }
});

test('minimal two-actor clock fixture preserves mutual own-profile gaze and fixed happy expression across a camera cut and role swap',()=>{
  // Clock-only unit fixture: no real video, narration, production or full-board acceptance.
  const templates=(['lila','karo'] as const).map(actor=>{
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,actor==='lila'?'right':'left','cutout','silent',BASIC_BODY_EYES_SELECTION);
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'story actor',kind:'stick-man',identity:'fictional',sourceRefs:[{kind:'narration',segmentId:'s1',quote:actor}],appearance:f.profile.appearance});
    const profile=actorProfile(character),plan={...f.plan,profileHash:profile.profileHash,root:{x:actor==='lila'?150:650,y:410},stage:{width:900,height:440,groundY:410}};
    return {character,profile,plan};
  });
  const shots=[0,2000].map((startMs,i)=>{
    const performers=templates.map(t=>({character:t.character,performance:{...t.plan,id:'basic-eye-cut-'+i,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}],gazes:[{startMs:0,endMs:2000,actorTarget:{id:t.character.id==='lila'?'karo':'lila',anchor:'eyes' as const}}]},actions:[],speakingSegmentIds:[]}));
    const primary=performers[i]!,other=performers[1-i]!;
    return {id:'basic-eye-cut-'+i,startMs,endMs:startMs+2000,host:{presence:'beside-model'},cinematic:{performance:primary.performance,actorScene:{primary:primary.character,supporting:[other],continuity:i?'continuous':'cut',speakingSegmentIds:[]}}} as unknown as Shot;
  });
  const board={shots} as Storyboard,silence={method:'segment-draft' as const,windowMs:20,intervals:[]},before=hash(board);
  for(const shot of shots)for(const t of templates){
    const owner=shot.cinematic!.actorScene!.primary!.id===t.character.id?shot.cinematic!.performance:shot.cinematic!.actorScene!.supporting[0]!.performance,clock=actorViewActingClock(board,shot,t.character.id)!;
    assert.equal(clock.actorTargets!.length,1);assert.deepEqual(clock.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);
    for(const time of [0,1771,2000,500,1771]){const frame=samplePerformance(owner,t.profile,time,silence,undefined,clock),target=sourceActorEyeAnchor(clock.actorTargets![0]!,shot.startMs+time);assert.ok(frame.actorGaze);assert.ok(Math.hypot(frame.actorGaze!.target.x-target.x,frame.actorGaze!.target.y-target.y)<1e-8);}
    const other=shots[shot===shots[0]?1:0]!,otherClock=actorViewActingClock(board,other,t.character.id)!;
    assert.equal(clock.sourceIdentityHash,otherClock.sourceIdentityHash);assert.equal(clock.actorTargets![0]!.fingerprint,otherClock.actorTargets![0]!.fingerprint);
  }
  assert.equal(hash(board),before);
});
