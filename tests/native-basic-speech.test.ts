// DECLARED / NOT RUN. Every fixture/schema/compiler/sampler invocation is
// inside a callback. Audio/render/full-factory acceptance belongs to user QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {BASIC_BODY_SPEECH_SELECTION,BASIC_MOUTH_VIEWS,bodyViewBasicMouthRegistration} from '../packages/animation/body-view-basic-mouth-registration.js';
import {BASIC_BODY_EYES_SELECTION} from '../packages/animation/body-view-basic-eyes-registration.js';
import {registeredBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {registeredBodyViewMouth,bodyViewMouthRegistration,bodyViewMouthDescription,sampleBodyViewMouth,bodyViewMouthLevel} from '../packages/animation/body-view-mouth.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {bodyCalibrationPlan,BODY_MOUTH_MODES} from '../packages/topics/body-workbench.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {actorShotSpeech} from '../packages/actors/speech-clock.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {VIEW_ACTING_CLOCK_VERSION} from '../packages/animation/view-acting-clock.js';
import type {Narration,Shot,Storyboard} from '../packages/core/schemas.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';

test('six own mouth sources bind actual PNG bytes/canvas independently of detailed3/4 registrations',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const c=bodyViewBasicMouthRegistration[actor][view],bytes=readFileSync(c.file),meta=JSON.parse(readFileSync(c.file.replace('.png','.json'),'utf8'));
    assert.equal(hash(bytes),c.sourceHash);assert.equal(meta.sha256,c.sourceHash);assert.equal(meta.approved,false);
    assert.deepEqual(c.sourceSize,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION);
    assert.equal(registeredBodyViewMouth(profile,registeredBodyView(profile).sha256),c);
    assert.equal(c.resting,actor==='karo'?'closed-overlay':'source-closed');
    for(const legacy of Object.values(bodyViewMouthRegistration[actor]))assert.notEqual(legacy.sourceHash,c.sourceHash);
  }
});

test('own speech selection authorizes only its front/profile view and keeps rear/legacy/cast/motion boundaries closed',()=>{
  assert.ok(BODY_MOUTH_MODES.includes(BASIC_BODY_SPEECH_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION);
    assert.doesNotThrow(()=>HostProfileSchema.parse(profile));
    for(const bodySpeech of [false,null,'registered-mouth-v1','registered-rest-mouth-v1']){
      const raw={...profile,appearance:{...profile.appearance,bodySpeech}} as unknown as HostProfile;
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredBodyViewMouth(raw));
    }
    for(const wrongView of ['back-left','back-right','three-quarter-left','three-quarter-right'] as const){
      const raw={...profile,appearance:{...profile.appearance,bodyView:wrongView}};
      assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyViewMouth(raw));
    }
    assert.throws(()=>registeredBodyViewMouth(profile,'0'.repeat(64)),/coordinates/);
    for(const option of ['bodyMotion','bodySeat','bodySecondary','bodyManipulation','bodyExpressions','supportingModel','sourceColour'] as const){
      const raw={...profile,appearance:{...profile.appearance,[option]:'selected'}} as HostProfile;
      assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredBodyViewMouth(raw));
    }
    for(const action of ['walk','run','jump','head-turn','hunt-aim'] as const)assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION));
  }
});

test('mouth and eye source erasure coexist and namespace without duplicate IDs or a mask erasing the replacement',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const {profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION);
    const head=bodyViewHeadSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');
    assert.match(head,/<g mask="url\(#view-mouth-source-mask\)"><image[^>]+mask="url\(#view-eyes-source-mask\)"/);
    assert.equal((head.match(/id="view-mouth-source-erase"/g)??[]).length,1);
    assert.equal((head.match(/id="view-eyes-source-erase"/g)??[]).length,1);
    const pair=['a-','b-'].map(prefix=>namespaceRigSvg(head,prefix)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size);assert.doesNotMatch(pair,/url\(#view-(?:mouth|eyes)-|href="#view-mouth-/);
    assert.doesNotMatch(pair,/scale\(-1|head-face-plane|nose-/);
  }
});

test('silence restores Lila source smile and keeps Karo closed; speaker activity is pure under reverse/random seeks',()=>{
  const activity:SpeechActivity={method:'audio-rms',audioHash:'own-original-audio',windowMs:20,intervals:[{startMs:500,endMs:1000,level:.3},{startMs:1000,endMs:1600,level:.8},{startMs:1900,endMs:2400,level:0},{startMs:2700,endMs:3400,level:.5}]};
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION),before=hash({activity,plan,profile}),times=[0,499,500,900,1600,1900,2200,2800,3400,4000];
    const saved=times.map(time=>samplePerformance(plan,profile,time,activity));
    for(const i of [7,1,9,2,4,0,8,6,3,5])assert.deepEqual(samplePerformance(plan,profile,times[i]!,activity),saved[i]);
    for(const frame of saved){
      const amount=bodyViewMouthLevel(activity,frame.timeMs),rest=samplePerformance(plan,profile,frame.timeMs,{method:'segment-draft',windowMs:20,intervals:[]});
      assert.deepEqual(frame.transforms,rest.transforms);assert.equal(frame.face['view-mouth-layer']!.opacity,frame.face['view-mouth-source-erase']!.opacity);
      if(amount===0)assert.equal(frame.face['view-mouth-layer']!.opacity,actor==='karo'?1:0);
    }
    assert.equal(hash({activity,plan,profile}),before);
    assert.equal(sampleBodyViewMouth(profile,activity,900).face['view-mouth-layer'].opacity,1);
  }
});

test('default fixed-view rig rejects voice instead of silently dropping it; new compiler reports activity rather than phoneme lip-sync',()=>{
  const activity:SpeechActivity={method:'audio-rms',audioHash:'same-wav-hash',windowMs:20,intervals:[{startMs:500,endMs:2000,level:.6}]};
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view);assert.throws(()=>samplePerformance(plain.plan,plain.profile,900,activity),/needs-view-voice-animation/);
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION),compiled=compilePerformance(plan,profile,activity,'own-');
    assert.equal(compiled.frames.at(-1)!.timeMs,plan.durationMs);assert.match(compiled.js,/own-view-mouth-source-erase/);
    assert.equal(compiled.report.bodySpeech?.selection,BASIC_BODY_SPEECH_SELECTION);assert.equal(compiled.report.bodySpeech?.sourceAudioHash,activity.audioHash);
    assert.equal(compiled.report.phonemeLipSync,false);assert.equal(compiled.report.bodySpeech?.approved,false);
  }
});

test('whole cue speaker ownership keeps listening actor closed and never opens from the other role audio',()=>{
  const narration:Narration={mode:'wav',durationMs:6000,words:[],segments:[{id:'lila-line',startMs:500,endMs:2500,text:'Lila speaks.'},{id:'karo-line',startMs:2700,endMs:5500,text:'Karo replies.'}]};
  const audio:SpeechActivity={method:'audio-rms',audioHash:'original-wav',windowMs:20,intervals:[{startMs:400,endMs:2200,level:.6},{startMs:2300,endMs:3200,level:.7},{startMs:3400,endMs:5800,level:.8}]},before=hash({narration,audio});
  for(const actor of ['lila','karo'] as const){
    const cue=actor+'-line',input=actorShotSpeech(audio,narration,actor,[cue],1000,5000,[cue]),{profile}=bodyCalibrationPlan(actor,'rest','happy',undefined,actor==='lila'?'right':'left','cutout',BASIC_BODY_SPEECH_SELECTION);
    for(const at of [0,500,1300,1700,2400,3300,3999]){
      const own=sampleBodyViewMouth(profile,input.activity,at,input.sourceClock),absolute=1000+at,c=narration.segments.find(s=>s.id===cue)!;
      if(absolute<c.startMs||absolute>=c.endMs){assert.equal(bodyViewMouthLevel(input.activity,at,input.sourceClock),0);assert.equal(own.face['view-mouth-layer'].opacity,actor==='karo'?1:0);}
    }
    assert.equal(input.activity.audioHash,audio.audioHash);assert.equal(input.sourceClock.ownerId,actor);
  }
  assert.equal(hash({narration,audio}),before);
});

test('source activity crossing a camera cut preserves aperture/envelope and original happy clock on both sides of a role swap',()=>{
  const narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:1000,endMs:3000,text:'One continuous line.'}]},audio:SpeechActivity={method:'audio-rms',audioHash:'original',windowMs:20,intervals:[{startMs:1000,endMs:1800,level:.3},{startMs:1800,endMs:2300,level:.8},{startMs:2300,endMs:3000,level:.5}]};
  const templates=(['lila','karo'] as const).map(actor=>{
    const f=bodyCalibrationPlan(actor,'rest','happy',undefined,actor==='lila'?'right':'left','cutout',BASIC_BODY_SPEECH_SELECTION);
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'story actor',kind:'stick-man',identity:'fictional',sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}],appearance:f.profile.appearance}),profile=actorProfile(character);
    return {character,profile,plan:{...f.plan,profileHash:profile.profileHash}};
  });
  const shots=[0,2000].map((startMs,i)=>{const cast=templates.map(t=>({character:t.character,performance:{...t.plan,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}]},actions:[],speakingSegmentIds:t.character.id==='lila'?['line']:[]}));return {id:'own-speech-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:cast[i]!.speakingSegmentIds,supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  const board={shots} as Storyboard;
  for(const t of templates){
    const inputs=shots.map(s=>actorShotSpeech(audio,narration,t.character.id,t.character.id==='lila'?['line']:[],s.startMs,s.endMs,t.character.id==='lila'?['line']:[]));
    const clocks=shots.map(s=>actorViewActingClock(board,s,t.character.id)!);
    assert.equal(clocks[0]!.version,VIEW_ACTING_CLOCK_VERSION);assert.deepEqual(clocks[0]!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);
    const a=sampleBodyViewMouth(t.profile,inputs[0]!.activity,2000,inputs[0]!.sourceClock),b=sampleBodyViewMouth(t.profile,inputs[1]!.activity,0,inputs[1]!.sourceClock);assert.deepEqual(a,b);
  }
});

test('speech selection changes visual identity/fingerprint without modifying original cue or eye registration',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of BASIC_MOUTH_VIEWS){
    const plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view),mouth=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION),combined=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION);
    assert.notEqual(plain.profile.profileHash,mouth.profile.profileHash);assert.notEqual(mouth.profile.profileHash,combined.profile.profileHash);
    assert.equal(registeredBodyView(mouth.profile).sha256,registeredBodyView(combined.profile).sha256);
    assert.equal(bodyViewMouthDescription.ownBasicMouth.productionReady,false);assert.equal(bodyViewMouthDescription.phonemeLipSync,false);assert.equal(bodyViewMouthDescription.ownBasicMouth.rearSpeech,false);
  }
});
