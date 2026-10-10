// DECLARED / NOT RUN. All schemas, fixtures, compiler and samplers below run
// only inside callbacks. User QA owns artistic/audio/motion/film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION,BASIC_EXPRESSION_VIEWS,bodyViewBasicExpressionRegistration} from '../packages/animation/body-view-basic-expression-registration.js';
import {BASIC_BODY_EYES_SELECTION} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION} from '../packages/animation/body-view-basic-mouth-registration.js';
import {registeredBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {bodyViewExpressionState,bodyViewExpressionsDescription,registeredBodyViewExpressions,bodyViewExpressionsSvg} from '../packages/animation/body-view-expressions.js';
import {bodyViewMouthLevel,sampleBodyViewMouth} from '../packages/animation/body-view-mouth.js';
import {expressionPose} from '../packages/animation/expression-pose.js';
import {Moods} from '../packages/animation/schemas.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {BODY_EXPRESSION_MODES,bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {actorShotSpeech} from '../packages/actors/speech-clock.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {normalizeViewExpressions} from '../packages/animation/view-expression-track.js';
import type {Narration,Shot,Storyboard} from '../packages/core/schemas.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';

test('six exact own expression sources have two front brows or one visible profile brow, never detailed3/4 cues',()=>{
  let count=0;
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EXPRESSION_VIEWS){
    const c=bodyViewBasicExpressionRegistration[actor][view],bytes=readFileSync(c.file);
    assert.equal(hash(bytes),c.sourceHash);assert.deepEqual(c.sourceSize,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
    assert.equal(c.brows.length,view==='front'?2:1);count+=c.brows.length;
    assert.deepEqual(c.brows.map(b=>b.slot),view==='front'?['screen-left','screen-right']:[view==='left'?'screen-left':'screen-right']);
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION);
    const bound=registeredBodyViewExpressions(profile,registeredBodyView(profile).sha256);
    assert.equal(bound.ownBasic,true);assert.equal(bound.sourceHash,c.sourceHash);assert.equal(bound.brows,c.brows);
  }
  assert.equal(count,8);
});

test('schema and raw accessors require the exact expression/eye/mouth/view combination and reject all unavailable basic features',()=>{
  assert.ok(BODY_EXPRESSION_MODES.includes(BASIC_BODY_EXPRESSIONS_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EXPRESSION_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION);
    assert.doesNotThrow(()=>HostProfileSchema.parse(profile));
    for(const patch of [{bodyEyes:undefined},{bodySpeech:undefined},{bodyEyes:'registered-eyes-v1'},{bodySpeech:'registered-rest-mouth-v1'},...['back-left','back-right','three-quarter-left','three-quarter-right'].map(bodyView=>({bodyView})),...[false,null,'registered-expressions-v1'].map(bodyExpressions=>({bodyExpressions}))]){
      const raw={...profile,appearance:{...profile.appearance,...patch}} as unknown as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyViewExpressions(raw));
    }
    for(const option of ['bodyMotion','bodySeat','bodySecondary','bodyManipulation','bodyHeadBank','supportingModel','sourceColour']){
      const raw={...profile,appearance:{...profile.appearance,[option]:'selected'}} as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyViewExpressions(raw));assert.throws(()=>registeredBodyView(raw));
    }
    assert.throws(()=>registeredBodyViewExpressions(profile,'0'.repeat(64)));
    for(const characterVariant of ['other',null,false]){const raw={...profile,appearance:{...profile.appearance,characterVariant}} as unknown as HostProfile;assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyViewExpressions(raw),/capability/);}
    for(const action of ['walk','run','jump','head-turn','hunt-aim'] as const)assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION));
  }
  const legacy=bodyCalibrationPlan('karo','rest','happy',undefined,'three-quarter-right','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1');
  assert.throws(()=>registeredBodyViewExpressions({...legacy.profile,appearance:{...legacy.profile.appearance,bodyExpressions:BASIC_BODY_EXPRESSIONS_SELECTION}}));
});

test('three independent feature masks affect base source only and per-actor namespace remains unique',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EXPRESSION_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION),c=registeredBodyView(profile),resolver=(_file:string,sha:string)=>'assets/rigs/'+sha+'.png';
    const svg=bodyViewHeadSvg(profile,resolver);
    assert.match(svg,/<g mask="url\(#view-expression-source-mask\)"><g mask="url\(#view-mouth-source-mask\)"><image[^>]+mask="url\(#view-eyes-source-mask\)"/);
    const pair=['first-','second-'].map(prefix=>namespaceRigSvg(svg,prefix)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size);assert.doesNotMatch(pair,/url\(#view-|href="#view-|scale\(-1|head-face-plane/);
    const art=bodyViewExpressionsSvg(profile,{sha256:c.sha256,width:c.width,height:c.height,url:resolver(c.file,c.sha256)});
    assert.match(art,new RegExp('id="view-expression-brow-'+(view==='right'?'screen-right':'screen-left')+'"'));
    if(view!=='front')assert.doesNotMatch(art,new RegExp('id="view-expression-brow-'+(view==='right'?'screen-left':'screen-right')+'"'));
    assert.throws(()=>bodyViewExpressionsSvg(profile,{sha256:c.sha256,width:c.width+1,height:c.height,url:resolver(c.file,c.sha256)}),/dimensions/);
    assert.throws(()=>bodyViewExpressionsSvg(profile,{sha256:c.sha256,width:c.width,height:c.height,url:'https://example.com/art.png'}),/Unapproved/);
  }
});

test('all moods own closed emotional contours in silence, erase source mouth and move only bounded visible brow slots',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EXPRESSION_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION),contours=new Set<string>();
    for(const mood of Moods){
      const state=bodyViewExpressionState(profile,expressionPose(mood),0);contours.add(state.paths['view-expression-mouth-interior']!);
      assert.equal(state.face['view-mouth-layer']!.opacity,0);assert.equal(state.face['view-mouth-source-erase']!.opacity,1);assert.equal(state.face['view-expression-layer']!.opacity,1);
      assert.ok(state.eyeClosure>=0&&state.eyeClosure<=.8);assert.equal(Object.keys(state.paths).length,3);
      for(const b of bodyViewBasicExpressionRegistration[actor][view].brows){const f=state.face['view-expression-brow-'+b.slot]!;assert.ok(f.y!>=-18&&f.y!<=14);assert.ok(f.rotation!>=-24&&f.rotation!<=24);}
      assert.doesNotMatch(JSON.stringify(state),/NaN|Infinity|head-projection|nose/);
    }
    assert.ok(contours.size>=3);assert.throws(()=>bodyViewExpressionState(profile,{...expressionPose('happy'),brow:NaN},0));
  }
});

test('expression and activity seeks are deterministic without changing native head/body geometry or original source input',()=>{
  const activity:SpeechActivity={method:'audio-rms',audioHash:'original-audio',windowMs:20,intervals:[{startMs:500,endMs:2100,level:.7}]};
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_EXPRESSION_VIEWS){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','angry',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION);
    plan.expressions=[{startMs:0,endMs:900,mood:'curious'},{startMs:900,endMs:2400,mood:'angry'},{startMs:2400,endMs:4000,mood:'relieved'}];
    const before=hash({profile,plan,activity}),times=[0,500,899,900,1200,2100,2399,2400,3300,4000],saved=times.map(at=>samplePerformance(plan,profile,at,activity));
    for(const index of [8,2,5,0,9,4,1,7,3,6])assert.deepEqual(samplePerformance(plan,profile,times[index]!,activity),saved[index]);
    for(const frame of saved){const silent=samplePerformance(plan,profile,frame.timeMs,{method:'segment-draft',windowMs:20,intervals:[]});assert.deepEqual(frame.transforms,silent.transforms);assert.equal(frame.face['view-mouth-source-erase']!.opacity,1);}
    assert.equal(hash({profile,plan,activity}),before);
  }
});

test('a listening actor reacts while speech aperture stays owned by its original whole cue',()=>{
  const narration:Narration={mode:'wav',durationMs:6000,words:[],segments:[{id:'lila-line',startMs:500,endMs:2500,text:'Lila speaks.'},{id:'karo-line',startMs:2700,endMs:5500,text:'Karo replies.'}]},audio:SpeechActivity={method:'audio-rms',audioHash:'original-wav',windowMs:20,intervals:[{startMs:400,endMs:5800,level:.7}]};
  for(const actor of ['lila','karo'] as const){
    const cue=actor+'-line',input=actorShotSpeech(audio,narration,actor,[cue],1000,5000,[cue]),{profile}=bodyCalibrationPlan(actor,'rest','concerned',undefined,actor==='lila'?'right':'left','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION);
    for(const at of [0,1300,1700,2400,3999]){
      const amount=bodyViewMouthLevel(input.activity,at,input.sourceClock),state=bodyViewExpressionState(profile,expressionPose('concerned'),amount),c=narration.segments.find(s=>s.id===cue)!;
      if(1000+at<c.startMs||1000+at>=c.endMs){assert.equal(amount,0);assert.deepEqual(state.paths,bodyViewExpressionState(profile,expressionPose('concerned'),0).paths);}
      assert.equal(state.face['view-expression-layer']!.opacity,1);assert.equal(input.sourceClock.ownerId,actor);
    }
  }
});

test('continuous camera slices and role swap retain the complete original expression clock and speech envelope',()=>{
  const templates=(['lila','karo'] as const).map(actor=>{const f=bodyCalibrationPlan(actor,'rest','curious',undefined,actor==='lila'?'right':'left','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION),character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'story actor',kind:'stick-man',identity:'fictional',sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}],appearance:f.profile.appearance}),profile=actorProfile(character);return {character,profile,plan:{...f.plan,profileHash:profile.profileHash}};});
  const shots=[0,2000].map((startMs,i)=>{const expressions=i?[{startMs:0,endMs:1200,mood:'angry' as const},{startMs:1200,endMs:2000,mood:'relieved' as const}]:[{startMs:0,endMs:1400,mood:'curious' as const},{startMs:1400,endMs:2000,mood:'angry' as const}],cast=templates.map(t=>({character:t.character,performance:{...t.plan,durationMs:2000,expressions},actions:[],speakingSegmentIds:t.character.id==='lila'?['line']:[]}));return {id:'own-expression-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:cast[i]!.speakingSegmentIds,supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  const board={shots} as Storyboard,narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:1000,endMs:3000,text:'Continuous line.'}]},audio:SpeechActivity={method:'audio-rms',audioHash:'original',windowMs:20,intervals:[{startMs:1000,endMs:3000,level:.6}]};
  for(const t of templates){
    const clocks=shots.map(s=>actorViewActingClock(board,s,t.character.id)!);assert.deepEqual(clocks[0]!.expressions,normalizeViewExpressions([{startMs:0,endMs:1400,mood:'curious'},{startMs:1400,endMs:3200,mood:'angry'},{startMs:3200,endMs:4000,mood:'relieved'}]));assert.deepEqual(clocks[0]!.expressions,clocks[1]!.expressions);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);
    const inputs=shots.map(s=>actorShotSpeech(audio,narration,t.character.id,t.character.id==='lila'?['line']:[],s.startMs,s.endMs,t.character.id==='lila'?['line']:[]));
    assert.deepEqual(sampleBodyViewMouth(t.profile,inputs[0]!.activity,2000,inputs[0]!.sourceClock),sampleBodyViewMouth(t.profile,inputs[1]!.activity,0,inputs[1]!.sourceClock));
  }
});

test('compiler reports exact own expression selection and clock mode without artistic or production acceptance',()=>{
  const f=bodyCalibrationPlan('lila','rest','sad',undefined,'front','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION),plain=bodyCalibrationPlan('lila','rest','happy',undefined,'front','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION);
  assert.notEqual(f.profile.profileHash,plain.profile.profileHash);assert.throws(()=>bodyCalibrationPlan('lila','rest','sad',undefined,'front'));
  const compiled=compilePerformance(f.plan,f.profile,{method:'segment-draft',windowMs:20,intervals:[]},'own-');
  assert.equal(compiled.report.bodyExpressions?.selection,BASIC_BODY_EXPRESSIONS_SELECTION);assert.equal(compiled.report.bodyExpressions?.clock,'shot-local diagnostic expressions');assert.match(compiled.js,/own-view-expression-mouth-interior/);
  assert.equal(compiled.report.bodyExpressions?.approved,false);assert.equal(compiled.report.bodyExpressions?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);
  assert.equal(bodyViewExpressionsDescription.ownBasicExpressions.visibleBrowCount,8);assert.equal(bodyViewExpressionsDescription.ownBasicExpressions.productionReady,false);assert.equal(bodyViewExpressionsDescription.ownBasicExpressions.rearExpressions,false);
});
