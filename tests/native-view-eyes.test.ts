import {registeredDetailedBodyView} from '../packages/animation/body-view-art.js';
import type {Gaze} from '../packages/animation/schemas.js';
// NOT RUN by controller. Runtime declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {BODY_VIEW_EYES_SELECTION,bodyViewEyesRegistration,bodyViewEyesDescription,registeredBodyViewEyes,bodyViewEyesSvg,bodyViewEyesState,bodyViewEyesMatrixError} from '../packages/animation/body-view-eyes.js';
import {BODY_VIEW_SPEECH_VERSION} from '../packages/animation/body-view-mouth.js';
import {bodyViewRegistrations,bodyViewDescription} from '../packages/animation/body-view-art.js';
import {bodyCalibrationPlan,bodyCalibrationSvg,bodyWorkbench} from '../packages/topics/body-workbench.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {performanceScene} from '../packages/animation/scene.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {actorShotSpeech,rigSpeechInputIdentity,assertRigSpeechPublicationBinding,rigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {NarrationSchema,type Shot,type Storyboard} from '../packages/core/schemas.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';
import {buildServer} from '../apps/server/index.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';

const silence:SpeechActivity={method:'audio-rms',windowMs:20,audioHash:'unchanged-source-audio',intervals:[]};
const candidate=(actor:'lila'|'karo',view:'three-quarter-left'|'three-quarter-right'=actor==='lila'?'three-quarter-right':'three-quarter-left')=>bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent',BODY_VIEW_EYES_SELECTION);
const eyeFace=(f:ReturnType<typeof samplePerformance>)=>Object.fromEntries(Object.entries(f.face).filter(([id])=>id.startsWith('view-eye')));
const numbers=(text:string)=>text.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

test('eye candidate binds exact native PNG bytes/dimensions and shared schema; defaults/source cannot silently select it',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const {profile}=candidate(actor,view),c=registeredBodyViewEyes(profile),asset=bodyViewRegistrations[actor][view],bytes=readReferenceHeadAsset(asset);
    assert.equal(hash(bytes),c.sourceHash);assert.deepEqual(c.sourceSize,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
    assert.doesNotThrow(()=>HostProfileSchema.parse(profile));assert.equal(c,bodyViewEyesRegistration[actor][view]);
    assert.throws(()=>registeredBodyViewEyes(profile,'changed'),/do not match/);
    assert.throws(()=>HostProfileSchema.parse({...profile,appearance:{...profile.appearance,bodyView:undefined}}),/Registered eyes|registered view/);
    assert.throws(()=>bodyCalibrationPlan(actor,'rest','happy',undefined,'source','cutout','silent',BODY_VIEW_EYES_SELECTION),/needs-view-eyes/);
    const plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view);assert.equal(plain.profile.appearance.bodyEyes,undefined);
    assert.notEqual(profile.profileHash,plain.profile.profileHash);assert.equal(bodyViewDescription.eyesCandidate.fingerprint,bodyViewEyesDescription.fingerprint);
  }
});

test('native eye resource/clip/slots use only the original image and preserve independent left/right registration',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const {profile}=candidate(actor,view),c=registeredBodyViewEyes(profile),source={sha256:c.sourceHash,width:c.sourceSize[0],height:c.sourceSize[1],url:'assets/rigs/'+c.sourceHash+'.png'},svg=bodyViewEyesSvg(profile,source);
    assert.match(svg,/id="view-eyes-layer" opacity="0"/);assert.match(svg,/screen-left-glyph-clip/);assert.match(svg,/screen-right-region/);
    assert.doesNotMatch(svg,/nose-|brow-|hair-|scale\(-1/);assert.throws(()=>bodyViewEyesSvg(profile,{...source,url:'https://example.com/a.png'}),/Unapproved eye/);
    assert.throws(()=>bodyViewEyesSvg(profile,{...source,width:source.width+1}),/dimensions/);
    assert.throws(()=>bodyViewEyesSvg(profile,{...source,url:'" onload="bad'}),/Unapproved eye/);
    assert.equal(bodyViewEyesSvg({...profile,appearance:{...profile.appearance,bodyEyes:undefined}},source),'');
  }
  assert.notEqual(bodyViewEyesRegistration.karo['three-quarter-left'].sourceHash,bodyViewEyesRegistration.karo['three-quarter-right'].sourceHash);
  assert.match(bodyViewEyesRegistration.karo['three-quarter-left'].eyes[0].region,/325 378/,'eye/nose contact has explicit protected diagonal');
});

test('pure eye transforms preserve native centers, bound look and use closed lids instead of moving the whole face',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const c=bodyViewEyesRegistration[actor][view],before=structuredClone(c),rest=bodyViewEyesState(c,{x:0,y:0},0);
    assert.equal(rest.face['view-eyes-layer']!.opacity,0);
    for(const blink of [0,.25,.55,1])for(const look of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
      const state=bodyViewEyesState(c,look,blink),again=bodyViewEyesState(c,look,blink);assert.deepEqual(state,again);
      for(const [i,e] of c.eyes.entries()){const id='view-eye-'+(i?'screen-right':'screen-left'),m=numbers(state.face[id+'-glyph']!.attr!.transform);
        assert.equal(m[0],1);assert.ok(m[3]!>=.02&&m[3]!<=1);
        assert.ok(Math.abs(m[4]!)<=e.shift.x);assert.ok(Math.abs(m[3]!*e.center.y+m[5]!-e.center.y-look.y*e.shift.y)<.002);
        if(blink===1){assert.equal(state.face[id+'-glyph']!.opacity,0);assert.equal(state.face[id+'-lid']!.opacity,1);}
      }
    }
    assert.deepEqual(c,before);
    for(const [look,blink] of [[{x:2,y:0},0],[{x:0,y:Number.NaN},0],[{x:0,y:0},-1],[{x:0,y:0},1.1]] as const)assert.throws(()=>bodyViewEyesState(c,look,blink),/invalid bounded/);
    const open=bodyViewEyesState(c,{x:0,y:0},0),half=bodyViewEyesState(c,{x:0,y:0},.45),closed=bodyViewEyesState(c,{x:0,y:0},.9);
    assert.ok(bodyViewEyesMatrixError(c,open.face,closed.face,half.face,.5)<.001,'matrix bound measures visible anchor, not raw cy translation');
    assert.throws(()=>bodyViewEyesMatrixError(c,open.face,closed.face,half.face,Number.NaN),/invalid interpolation/);
  }
});

test('only explicit eye selection permits front-hemisphere gaze; expression/turn/motion/source voice gates remain',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const {profile,plan}=candidate(actor,view),forward=view==='three-quarter-left'?-1:1;
    plan.gazes=[{startMs:300,endMs:3600,target:{x:210+forward*150,y:100}}];assert.doesNotThrow(()=>samplePerformance(plan,profile,900,silence));
    const plain=bodyCalibrationPlan(actor,'rest','happy',undefined,view);plain.plan.gazes=structuredClone(plan.gazes);
    assert.throws(()=>samplePerformance(plain.plan,plain.profile,900,silence),/needs-view-gaze/);
    fixedGazeTarget(plan.gazes[0]!).x=210-forward*150;assert.throws(()=>samplePerformance(plan,profile,900,silence),/behind the fixed native view/);plan.gazes=[];
    assert.throws(()=>samplePerformance({...plan,expressions:[{startMs:0,endMs:4000,mood:'angry'}]},profile,900,silence),/needs-view-expression/);
    assert.throws(()=>samplePerformance({...plan,walks:[{startMs:0,endMs:2000,fromX:210,toX:250}]},profile,900,silence),/needs-view-motion/);
    assert.throws(()=>samplePerformance(plan,profile,900,{...silence,intervals:[{startMs:500,endMs:1000,level:.5}]}),/needs-view-voice-animation/);
  }
});

test('head-local pupil direction follows the native eye origin and is invariant to translating actor and target together',()=>{
  for(const actor of ['lila','karo'] as const){
    const {profile,plan}=candidate(actor),c=registeredDetailedBodyView(profile),eyes=registeredBodyViewEyes(profile),forward=c.view==='three-quarter-left'?-1:1;
    plan.gazes=[{startMs:0,endMs:3500,target:{x:210+forward*160,y:120}}];const at=900,f=samplePerformance(plan,profile,at,silence),head=numbers(f.transforms.head!);
    const angle=head[2]!*Math.PI/180,scale=head[3]!,center={x:(eyes.eyes[0].center.x+eyes.eyes[1].center.x)/2,y:(eyes.eyes[0].center.y+eyes.eyes[1].center.y)/2};
    const native={x:(center.x-c.neck.x)*c.headScale*scale,y:(center.y-c.neck.y)*c.headScale*scale},origin={x:head[0]!+Math.cos(angle)*native.x-Math.sin(angle)*native.y,y:head[1]!+Math.sin(angle)*native.x+Math.cos(angle)*native.y};
    const delta={x:fixedGazeTarget(plan.gazes[0]!).x-origin.x,y:fixedGazeTarget(plan.gazes[0]!).y-origin.y},m=numbers(f.face['view-eye-screen-left-glyph']!.attr!.transform as string),look={x:m[4]!/eyes.eyes[0].shift.x,y:m[5]!/eyes.eyes[0].shift.y};
    const local={x:Math.cos(angle)*delta.x+Math.sin(angle)*delta.y,y:-Math.sin(angle)*delta.x+Math.cos(angle)*delta.y},length=Math.hypot(local.x,local.y);
    assert.ok(Math.abs(look.x-local.x/length)<.002);assert.ok(Math.abs(look.y-local.y/length)<.002);
    const moved=structuredClone(plan);moved.root.x+=30;moved.root.y+=10;moved.stage.groundY+=10;fixedGazeTarget(moved.gazes[0]!).x+=30;fixedGazeTarget(moved.gazes[0]!).y+=10;
    assert.deepEqual(eyeFace(samplePerformance(moved,profile,at,silence)),eyeFace(f));
  }
});

test('silent eye actor uses source offset across a cut and pure random seeks without requiring a speech mouth',()=>{
  const n=NarrationSchema.parse({mode:'wav',durationMs:5000,segments:[{id:'other',startMs:0,endMs:5000,text:'Another actor speaks.'}],words:[]});
  const a=actorShotSpeech(silence,n,'karo',[],0,2250,[]),b=actorShotSpeech(silence,n,'karo',[],2250,5000,[]),first=candidate('karo'),second=candidate('karo');
  first.plan.durationMs=2250;first.plan.expressions[0]!.endMs=2250;second.plan.durationMs=2750;second.plan.expressions[0]!.endMs=2750;
  const before=samplePerformance(first.plan,first.profile,2250,a.activity,a.sourceClock),after=samplePerformance(second.plan,second.profile,0,b.activity,b.sourceClock);
  assert.deepEqual(eyeFace(before),eyeFace(after));assert.equal(after.face['view-eye-screen-left-lid']!.opacity,1);
  assert.equal(samplePerformance(second.plan,second.profile,0,b.activity).face['view-eyes-layer']!.opacity,0,'local diagnostic is not source phase');
  const saved=[0,70,300,500,1500].map(at=>eyeFace(samplePerformance(second.plan,second.profile,at,b.activity,b.sourceClock)));
  for(const i of [4,1,3,0,2])assert.deepEqual(eyeFace(samplePerformance(second.plan,second.profile,[0,70,300,500,1500][i]!,b.activity,b.sourceClock)),saved[i]);
  assert.throws(()=>samplePerformance(second.plan,second.profile,70,b.activity,{...b.sourceClock,ownerId:'lila'}),/owner or shot span/);
});

test('compiler keeps continuous eye matrices/lids, source events, namespace/resource security and candidate reports',()=>{
  const {profile,plan}=candidate('karo'),n=NarrationSchema.parse({mode:'wav',durationMs:5000,segments:[{id:'other',startMs:0,endMs:5000,text:'Other.'}]});
  const own=actorShotSpeech(silence,n,'karo',[],1000,5000,[]),scene=performanceScene(plan,profile,own.activity,undefined,undefined,undefined,own.sourceClock),compiled=scene.compiled;
  assert.equal(compiled.frames.at(-1)!.timeMs,4000);assert.ok(compiled.frames.some(f=>f.timeMs===1250),'source blink peak2250ms');
  assert.equal(compiled.report.bodyEyes!.blinkClock,'source absolute time');assert.equal(compiled.report.bodyEyes!.sourcePhase!.ownerId,'karo');assert.equal(compiled.report.bodyEyes!.opticalGazeVerified,false);assert.equal(compiled.report.bodyEyes!.approved,false);
  assert.equal(compiled.report.bodySpeech,undefined);assert.match(compiled.js,/view-eye-screen-left-glyph/);assert.match(compiled.js,/matrix\(1 0 0/);
  const c=registeredBodyViewEyes(profile),physical=bodyViewRegistrations.karo['three-quarter-left'].headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale;
  for(let i=1;i<compiled.frames.length;i++){const a=compiled.frames[i-1]!,b=compiled.frames[i]!,at=(a.timeMs+b.timeMs)/2,wanted=samplePerformance(plan,profile,at,own.activity,own.sourceClock);
    assert.ok(bodyViewEyesMatrixError(c,a.face,b.face,wanted.face,.5)*physical<=.2001,'native eye midpoint error at '+at);}
  assert.match(compilePerformance(plan,profile,own.activity,'actor-karo-',own.sourceClock).js,/actor-karo-view-eye-screen-right-lid/);
  const assets=referenceBodyAssets(profile.appearance).map(a=>a.path),shot={id:plan.id,startMs:1000,endMs:5000} as Shot;
  assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),shot,2000000,assets,plan.stage),[]);
});

test('canonical paired actor source paths include a silent eye actor in ownership identity and preserve resource IDs',async t=>{
  const f=await creativeFixture(await temporary(t)),s=f.shot,c=s.cinematic!,n=NarrationSchema.parse({mode:'wav',durationMs:5000,segments:[{id:'cue',startMs:0,endMs:5000,text:'Lila talks while Karo listens.'}]});
  s.visualization!.events=[];c.propBindings=[];
  const definitions=(['lila','karo'] as const).map((actor,i)=>{
    const {profile,plan}=bodyCalibrationPlan(actor,'rest','happy',undefined,i?'three-quarter-left':'three-quarter-right','cutout',i?'silent':BODY_VIEW_SPEECH_VERSION,BODY_VIEW_EYES_SELECTION);
    plan.durationMs=5000;plan.expressions[0]!.endMs=5000;plan.stage={width:1280,height:720,groundY:540};plan.root={x:i?800:380,y:540};plan.scale=.8;
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',sourceRefs:[{kind:'narration',segmentId:'cue',quote:n.segments[0]!.text}],appearance:profile.appearance});return {plan,character};
  });
  c.performance=definitions[0]!.plan;c.actorScene=ActorSceneSchema.parse({primary:definitions[0]!.character,speakingSegmentIds:['cue'],supporting:[{character:definitions[1]!.character,performance:definitions[1]!.plan,actions:[],speakingSegmentIds:[]}]});
  c.camera={...c.camera,focus:'ensemble',framing:'wide',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360}};bindActorShot(s,f.profile,f.rig);
  c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};s.camera={...s.camera,shotSize:c.camera.framing,movement:c.camera.movement};
  s.host!.actions=[{type:'idle',startMs:0,endMs:5000}];c.actorScene!.supporting[0]!.actions=[{type:'idle',startMs:0,endMs:5000}];
  const board:Storyboard={shots:[s]},identity=rigSpeechInputIdentity(s,n,board)!;assert.deepEqual(identity.owners.find(o=>o.actorId==='karo')!.cueIds,[]);
  assert.doesNotThrow(()=>assertRigSpeechPublicationBinding(s,n,board,rigSpeechPublicationBinding(s,n,board)));
  const signal={...silence,intervals:[{startMs:0,endMs:5000,level:.6}]},rendered=renderCinematic(s,f.profile,f.rig,signal,f.config,undefined,n,undefined,undefined,board);
  if(!('actors' in rendered.report))throw new Error('Expected rig report');
  for(const actor of rendered.report.actors){if(!('report' in actor))throw new Error('Expected actor report');assert.equal(actor.report.bodyEyes!.sourcePhase!.scope,'storyboard-cues');if(actor.actorId==='karo')assert.equal(actor.report.bodySpeech,undefined);}
  const html=rendered.files.files.find(file=>file.path==='index.html')!.content,ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.match(html,/actor-karo-view-eyes-layer/);
  const assets=definitions.flatMap(d=>referenceBodyAssets(actorProfile(d.character).appearance).map(a=>a.path));assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),s,2000000,assets,f.config.rendering.final),[]);
});

test('workbench/API retain explicit eye/look modes and source/default errors without claiming episode playback',async t=>{
  const html=bodyWorkbench('rest',2250,'happy','three-quarter-left','cutout','silent',BODY_VIEW_EYES_SELECTION,'ahead');assert.match(html,/name="eyes"/);assert.match(html,/registered-eyes-v1" selected/);assert.match(html,/name="look"/);assert.match(html,/view-eye-screen-left-glyph/);
  const svg=bodyCalibrationSvg('karo','rest',2250,'happy',{view:'three-quarter-left',eyes:BODY_VIEW_EYES_SELECTION,look:'ahead'});assert.match(svg,/karo-calibration-view-eye-screen-right-region/);assert.match(svg,/data-eyes-artwork/);
  const linked=bodyWorkbench('spear-thrust',2250,'happy','three-quarter-right','cutout','silent',BODY_VIEW_EYES_SELECTION,'ahead');assert.match(linked,/&amp;eyes=registered-eyes-v1&amp;look=ahead/);
  const app=await buildServer({projectsRoot:await temporary(t),logger:false});t.after(()=>app.close());
  const r=await app.inject({url:'/api/topics/prehistoric-life/body?action=rest&timeMs=2250&mood=happy&view=three-quarter-left&eyes=registered-eyes-v1&look=ahead'});assert.equal(r.statusCode,200);assert.match(r.body,/view-eye-screen-left-glyph/);
  assert.equal((await app.inject({url:'/api/topics/prehistoric-life/body?eyes=bad'})).statusCode,422);
  assert.match((await app.inject({url:'/api/topics/prehistoric-life/body?eyes=registered-eyes-v1&view=source'})).body,/needs-view-eyes/);
});

test('eye readiness stays candidate-only and does not approve source identity/acting/audio or the three-input product',()=>{
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.readiness.productionReady,false);assert.equal(bodyViewEyesDescription.approved,false);
  assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
});

function fixedGazeTarget(gaze:Gaze){assert.ok('target' in gaze);return gaze.target;}
