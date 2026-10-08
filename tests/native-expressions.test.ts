// NOT RUN by implementation/review agents. User's model owns runtime acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {StoryboardSchema,type Shot} from '../packages/core/schemas.js';
import {Moods,type Mood} from '../packages/animation/schemas.js';
import {expressionPose} from '../packages/animation/expression-pose.js';
import {BODY_VIEW_EXPRESSIONS_SELECTION,bodyViewExpressionsSvg,bodyViewExpressionState,bodyViewExpressionPaths,bodyViewExpressionsDescription,registeredBodyViewExpressions} from '../packages/animation/body-view-expressions.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-art.js';
import {normalizeViewExpressions} from '../packages/animation/view-expression-track.js';
import {validateViewActingClock} from '../packages/animation/view-acting-clock.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {performanceScene} from '../packages/animation/scene.js';
import {bodyCalibrationPlan,bodyWorkbench} from '../packages/topics/body-workbench.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {creativeFixture} from './creative-fixture.js';
import {passiveActorFixtureEvents} from './native-actor-fixture.js';
import {temporary} from './support.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
const silence:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],mood:Mood='happy')=>bodyCalibrationPlan(actor,'rest',mood,undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest',BODY_VIEW_EXPRESSIONS_SELECTION);

test('native expressions require explicit complete appearance and leave legacy/default expression rejection intact',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS)for(const mood of Moods){
    const {profile,plan}=candidate(actor,view,mood);assert.doesNotThrow(()=>HostProfileSchema.parse(profile));assert.doesNotThrow(()=>ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'The participant reacts.'}]}));assert.doesNotThrow(()=>validatePerformance(plan,profile));
    for(const patch of [{bodyEyes:undefined},{bodySpeech:'registered-mouth-v1'},{artworkVersion:'forest-body-1'},{bodyView:undefined},{sourceColour:'original-rgb-v2'}])assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...profile.appearance,...patch}}).success,false);
  }
  const {profile}=candidate('karo','three-quarter-left');assert.throws(()=>registeredBodyViewExpressions(profile,'wrong-hash'),/native view image/);
  assert.throws(()=>bodyCalibrationPlan('karo','rest','angry',undefined,'three-quarter-left'),/registered expressions/);
  assert.throws(()=>bodyCalibrationPlan('karo','rest','happy',undefined,'source','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest',BODY_VIEW_EXPRESSIONS_SELECTION),/authored body view/);
});

test('all registered views retain native source resources and bounded separately namespaced brow/mouth art',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),c=bodyViewRegistrations[actor][view],source={sha256:c.sha256,width:c.width,height:c.height,url:'assets/rigs/'+c.sha256+'.png'},resolver=(_file:string,sha:string)=>'assets/rigs/'+sha+'.png';
    const art=bodyViewExpressionsSvg(profile,source,resolver),svg=namespaceRigSvg(performanceSvg(profile,'scene'),'actor-'+actor+'-');
    assert.match(art,/view-expression-brow-screen-left-erase/);assert.match(art,/view-expression-mouth-region/);assert.doesNotMatch(art,/scale\(-1|face-plane|head-projection|http/);
    assert.match(svg,new RegExp('id="actor-'+actor+'-view-expression-mouth-interior"'));const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    for(const resource of [...art.matchAll(/href="(assets\/rigs\/[^\"]+)"/g)].map(m=>m[1]))assert.ok(referenceHeadAssets(profile.appearance).some(a=>a.path===resource));
    assert.throws(()=>bodyViewExpressionsSvg(profile,{...source,width:c.width+1},resolver),/dimensions changed/);assert.throws(()=>bodyViewExpressionsSvg(profile,{...source,url:'https://example.com/head.png'},resolver),/Unapproved expression image/);
  }
});

test('closed emotion contours stay closed in silence and alter only registered expression art without warping native eyes/nose/head',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),registered=registeredBodyViewExpressions(profile),closed=new Set<string>();
    for(const mood of Moods){const pose=expressionPose(mood),state=bodyViewExpressionState(profile,pose,0),paths=bodyViewExpressionPaths(profile,pose,0);closed.add(paths['view-mouth-interior']!);
      assert.equal(state.face['view-mouth-layer']!.opacity,0);assert.ok(state.eyeClosure>=0&&state.eyeClosure<=.8);assert.equal(Object.keys(state.paths).length,3);
      for(const key of Object.keys(state.face))assert.ok(key==='view-mouth-layer'||key.startsWith('view-expression-'));
      assert.deepEqual(registered,registeredBodyViewExpressions(profile));assert.doesNotMatch(JSON.stringify(state),/NaN|Infinity|head-projection|nose/);
      const {plan}=candidate(actor,view,mood),frame=samplePerformance(plan,profile,1000,silence);assert.equal(frame.paths!['view-expression-mouth-interior'],paths['view-mouth-interior']);
    }
    assert.ok(closed.size>=4);assert.throws(()=>bodyViewExpressionState(profile,{...expressionPose('happy'),brow:NaN},0),/invalid native expression/);
  }
});

test('native expressions use the actual activity envelope, preserve zero/silence boundaries and deterministic random seek',()=>{
  const signal:SpeechActivity={method:'audio-rms',windowMs:20,audioHash:'expression-unchanged-audio',intervals:[{startMs:500,endMs:1400,level:.7},{startMs:1400,endMs:1800,level:0},{startMs:1800,endMs:2900,level:.8}]};
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view,'angry'),times=[0,500,700,1399,1400,1600,1800,2100,2900,4000],before=structuredClone({profile,plan,signal});
    const frames=times.map(at=>samplePerformance(plan,profile,at,signal));for(const i of [9,2,7,0,6,4,1,8,3,5])assert.deepEqual(samplePerformance(plan,profile,times[i]!,signal),frames[i]);
    for(const index of [0,1,4,5,6,8,9])assert.equal(frames[index]!.paths!['view-expression-mouth-interior'],samplePerformance(plan,profile,times[index]!,silence).paths!['view-expression-mouth-interior']);
    for(const index of [2,3,7])assert.notEqual(frames[index]!.paths!['view-expression-mouth-interior'],samplePerformance(plan,profile,times[index]!,silence).paths!['view-expression-mouth-interior']);
    assert.deepEqual({profile,plan,signal},before);
  }
});

async function pairedFixture(root:string){
  const base=await creativeFixture(root),definitions=(['lila','karo'] as const).map((actor,i)=>ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:candidate(actor,i?'three-quarter-left':'three-quarter-right').profile.appearance,sourceRefs:base.shot.sourceRefs}));
  const shots=[[0,2500],[2500,5000]].map(([startMs,endMs],index)=>{const shot=structuredClone(base.shot),c=shot.cinematic!;shot.id='native-expression-cut-'+index;shot.startMs=startMs!;shot.endMs=endMs!;c.shotId=shot.id;c.propBindings=[];c.artDirection=structuredClone(base.artDirection);
    shot.visualization!.events=passiveActorFixtureEvents(shot,base.narration);
    for(const layer of c.artDirection.layers)for(const frame of layer.keyframes)frame.atMs/=2;
    const tracks=definitions.map((character,i)=>{const plan=candidate(character.id as 'lila'|'karo',i?'three-quarter-left':'three-quarter-right').plan;plan.durationMs=2500;plan.stage={width:1280,height:720,groundY:540};plan.root={x:i?800:380,y:540};plan.scale=.8;
      plan.expressions=index?[{startMs:0,endMs:600,mood:'angry'},{startMs:600,endMs:2200,mood:'relieved'}]:[{startMs:100,endMs:2200,mood:'happy'},{startMs:2200,endMs:2500,mood:'angry'}];
      return {character,performance:plan,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:i?['cue']:[]};});
    const primary=tracks[index]!,support=tracks[1-index]!;c.performance=primary.performance;c.actorScene=ActorSceneSchema.parse({primary:primary.character,speakingSegmentIds:primary.speakingSegmentIds,continuity:index?'continuous':'cut',supporting:[support]});bindActorShot(shot,base.profile,base.rig);shot.host!.actions=primary.actions;
    c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};return shot;
  });return {...base,board:StoryboardSchema.parse({shots})};
}

test('canonical role swap keeps original emotion phase at the camera cut and binds sibling expression changes',async t=>{
  const f=await pairedFixture(await temporary(t)),before=structuredClone(f.board);
  for(const actor of ['lila','karo'] as const){
    const get=(index:number)=>{const shot=f.board.shots[index]!,scene=shot.cinematic!.actorScene!,a=scene.primary!.id===actor?{character:scene.primary!,performance:shot.cinematic!.performance}:scene.supporting.find(a=>a.character.id===actor)!;return {...a,clock:actorViewActingClock(f.board,shot,actor)!};};
    const a=get(0),b=get(1);assert.deepEqual(a.clock.expressions,normalizeViewExpressions([{startMs:100,endMs:2200,mood:'happy'},{startMs:2200,endMs:3100,mood:'angry'},{startMs:3100,endMs:4700,mood:'relieved'}]));
    const end=samplePerformance(a.performance,actorProfile(a.character),2500,silence,undefined,a.clock),start=samplePerformance(b.performance,actorProfile(b.character),0,silence,undefined,b.clock);
    assert.deepEqual(end.paths,start.paths);assert.deepEqual(end.face,start.face);assert.deepEqual(end.transforms,start.transforms);
    const wrong=structuredClone(b.clock);wrong.expressions![1]!.mood='sad';assert.throws(()=>validateViewActingClock(b.performance,wrong),/expression differs/);
    const missing=structuredClone(b.clock);delete missing.expressions;assert.throws(()=>samplePerformance(b.performance,actorProfile(b.character),0,silence,undefined,missing),/complete original run track/);
  }
  const shot=f.board.shots[0]!,binding=rigSpeechPublicationBinding(shot,f.narration,f.board),changed=structuredClone(f.board);changed.shots[1]!.cinematic!.performance.expressions[1]!.mood='sad';assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,changed,binding),/changed|stale|differs/);assert.deepEqual(f.board,before);
});

test('compiled scene uses expression path/group targets and exact existing image allowlist with no production claims',()=>{
  const {profile,plan}=candidate('karo','three-quarter-left','angry');plan.expressions=[{startMs:300,endMs:1800,mood:'angry'},{startMs:1800,endMs:3400,mood:'relieved'}];
  const scene=performanceScene(plan,profile,silence),report=scene.compiled.report as Record<string,unknown>;
  assert.equal((report.bodyExpressions as {selection:string}).selection,BODY_VIEW_EXPRESSIONS_SELECTION);assert.equal((report.bodyExpressions as {approved:boolean}).approved,false);assert.equal(report.phonemeLipSync,false);
  assert.match(scene.files.files.find(f=>f.path==='index.html')!.content,/view-expression-mouth-teeth-path/);const allowed=referenceHeadAssets(profile.appearance).map(a=>a.path);assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Shot,2000000,allowed,plan.stage),[]);
  assert.equal(bodyViewExpressionsDescription.productionReady,false);const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.readiness.productionReady,false);assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
});

test('workbench exposes the full mood contract and keeps the explicit selection across pose links',()=>{
  const html=bodyWorkbench('rest',1000,'sad','three-quarter-left','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest',BODY_VIEW_EXPRESSIONS_SELECTION);
  assert.match(html,/name="expressions"/);for(const mood of Moods)assert.match(html,new RegExp('value="'+mood+'"'));assert.match(html,/segment-draft/);assert.match(html,/chưa|ứng viên/);
  const a=candidate('karo','three-quarter-left'),b=bodyCalibrationPlan('karo','rest','happy',undefined,'three-quarter-left','cutout','registered-rest-mouth-v1','registered-eyes-v1');assert.notEqual(a.profile.profileHash,b.profile.profileHash);assert.notEqual(hash(a.profile.appearance),hash(b.profile.appearance));
  const navigation=bodyWorkbench('spear-thrust',1000,'happy','three-quarter-right','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest',BODY_VIEW_EXPRESSIONS_SELECTION);
  assert.match(navigation,/href="\?action=spear-thrust[^\"]*&amp;expressions=registered-expressions-v1"/);
});
