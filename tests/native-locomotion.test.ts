// NOT RUN by implementation agents. Runtime acceptance belongs to user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {StoryboardSchema,type Shot} from '../packages/core/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {shotUsesSourceSpeechClock,rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_LOCOMOTION_SELECTION,registeredNativeCloth,nativeClothTriangles,nativeClothState,nativeClothSvg,nativeClothMatrixError,nativeClothDescription} from '../packages/animation/body-view-cloth.js';
import {clothTriangleArea} from '../packages/animation/view-cloth-geometry.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {rigMetrics,performanceSvg} from '../packages/animation/rig.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {performanceScene} from '../packages/animation/scene.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {bodyCalibrationPlan,bodyWorkbench,type BodyAction} from '../packages/topics/body-workbench.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {creativeActingBrief} from '../packages/director/acting-brief.js';
import {creativeFixture} from './creative-fixture.js';
import {temporary} from './support.js';
import {passiveActorFixtureEvents} from './native-actor-fixture.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1',BODY_VIEW_LOCOMOTION_SELECTION);
const values=(text:string)=>text.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)!.map(Number);

test('native motion is explicit across shared appearance contracts, default rigid views retain their guard',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view);assert.doesNotThrow(()=>HostProfileSchema.parse(profile));
    assert.doesNotThrow(()=>ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'The two participants walk.'}]}));
    for(const patch of [{artworkVersion:'forest-body-1'},{bodyView:undefined},{characterVariant:undefined},{sourceColour:'original-rgb-v2'}])assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...profile.appearance,...patch}}).success,false);
    const action=view==='three-quarter-left'?'walk-left':'walk';assert.throws(()=>bodyCalibrationPlan(actor,action,'happy',undefined,view),/needs-view-motion/);
    assert.notEqual(profile.profileHash,bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1').profile.profileHash);
  }
  assert.throws(()=>bodyCalibrationPlan('lila','walk','happy',undefined,'source','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION),/registered native body view/);
});

test('each garment binds exact native image, positive cage and isolated local SVG resources',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=bodyViewRegistrations[actor][view],binding=registeredNativeCloth(profile,source),triangles=nativeClothTriangles(profile,source);
    assert.equal(binding.sha256,source.sha256);assert.equal(triangles.length,12);for(const triangle of triangles)assert.ok(clothTriangleArea(triangle)>0);
    assert.throws(()=>registeredNativeCloth(profile,{...source,sha256:'0'.repeat(64)}),/image registration differs/);
    assert.throws(()=>registeredNativeCloth(profile,{...source,width:source.width+1}),/image registration differs/);
    const svg=performanceSvg(profile,'scene'),namespaced=namespaceRigSvg(svg,'actor-'+actor+'-');assert.match(svg,/view-cloth-triangle-11/);assert.match(namespaced,new RegExp('id="actor-'+actor+'-view-cloth-triangle-11"'));
    assert.doesNotMatch(nativeClothSvg(profile,source).artwork,/<image|http|scale\(-/);const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  }
});

test('shared native cloth pins belt, clamps authored controls, preserves positive areas and caller data',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=bodyViewRegistrations[actor][view],before=structuredClone({profile,source}),binding=registeredNativeCloth(profile,source);
    const rest=nativeClothState(profile,source,{left:0,right:0});for(const piece of rest.pieces)assert.deepEqual(piece.target,piece.from);
    for(const control of [{left:18,right:-18},{left:-18,right:18},{left:1000,right:1000}]){
      const state=nativeClothState(profile,source,control);assert.ok(state.influence>=0&&state.influence<=1);assert.notDeepEqual(state.face,rest.face);
      for(const piece of state.pieces){assert.ok(piece.areaRatio>=.25-1e-9);for(const [i,p] of piece.from.entries())if(p.y===binding.waist)assert.deepEqual(piece.target[i],p);}
      assert.equal(nativeClothMatrixError(profile,source,state.face,state.face,state.face,.37),0);
    }
    assert.throws(()=>nativeClothState(profile,source,{left:NaN,right:0}),/nonfinite thigh/);assert.deepEqual({profile,source},before);
  }
});

test('native forward walk keeps stance soles planted and XYZ source bones constant through deterministic seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view,view==='three-quarter-left'?'walk-left':'walk'),m=rigMetrics(profile),before=structuredClone({profile,plan});
    let prior=samplePerformance(plan,profile,0,silence),swing=false,cloth=false;
    for(let time=10;time<=4000;time+=10){const frame=samplePerformance(plan,profile,time,silence),pelvis=values(frame.transforms.pelvis!),lean=values(frame.transforms.chest!)[2]!;
      assert.ok(frame.stance.left||frame.stance.right);assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);
      for(const side of ['left','right'] as const){
        const g=legGeometry(m,{x:pelvis[0]!,y:pelvis[1]!},frame.feet[side],side,plan.scale,profile.appearance.bodyScale,lean),upper=values(frame.transforms['leg-'+side+'-upper']!),lower=values(frame.transforms['leg-'+side+'-lower']!),depth=frame.legProjection![side].kneeDepth;
        const ankle={x:lower[0]!-Math.sin(lower[2]!*Math.PI/180)*m.legs![side].lower*lower[4]!,y:lower[1]!+Math.cos(lower[2]!*Math.PI/180)*m.legs![side].lower*lower[4]!};
        assert.ok(Math.abs(Math.hypot(lower[0]!-upper[0]!,lower[1]!-upper[1]!,depth)-g.bones.upper)<.002);assert.ok(Math.abs(Math.hypot(ankle.x-lower[0]!,ankle.y-lower[1]!,depth)-g.bones.lower)<.002);assert.ok(Math.hypot(ankle.x-g.ankle.x,ankle.y-g.ankle.y)<.002);
        if(prior.stance[side]&&frame.stance[side])assert.deepEqual(frame.feet[side],prior.feet[side],'support sole slid');if(!frame.stance[side])swing=true;
      }
      if(frame.face['view-cloth-triangle-8']!.attr!.transform!==prior.face['view-cloth-triangle-8']!.attr!.transform)cloth=true;prior=frame;
    }
    assert.ok(swing&&cloth);const wanted=samplePerformance(plan,profile,1050,silence);for(const time of [4000,500,0,3600,1777,300])samplePerformance(plan,profile,time,silence);assert.deepEqual(samplePerformance(plan,profile,1050,silence),wanted);assert.deepEqual({profile,plan},before);
  }
});

test('native run has real flight and settles two soles while arm chains and cloth remain finite',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const {profile,plan}=candidate(actor,view,view==='three-quarter-left'?'run-left':'run');let flight=false;
    for(let time=0;time<=4000;time+=10){const frame=samplePerformance(plan,profile,time,silence);if(!frame.stance.left&&!frame.stance.right)flight=true;assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);assert.ok(frame.armGeometry?.left&&frame.armGeometry.right);assert.ok(frame.face['view-cloth-triangle-11']);}
    assert.ok(flight);const end=samplePerformance(plan,profile,4000,silence);assert.deepEqual(end.stance,{left:true,right:true});assert.equal(end.feet.left.y,plan.root.y);assert.equal(end.feet.right.y,plan.root.y);
  }
});

test('native jump uses grounded anticipation/landing, original mouth activity and recoverable body posture',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const {profile,plan}=candidate(actor,view,'jump'),signal={method:'audio-rms' as const,windowMs:20,audioHash:'unchanged-source-audio',intervals:[{startMs:700,endMs:1400,level:.7}]};
    for(const time of [0,400,849.99,1500,2000,4000]){const frame=samplePerformance(plan,profile,time,silence);assert.deepEqual(frame.stance,{left:true,right:true});assert.equal(frame.feet.left.y,plan.root.y);assert.equal(frame.feet.right.y,plan.root.y);}
    const mid=samplePerformance(plan,profile,1175,signal);assert.deepEqual(mid.stance,{left:false,right:false});assert.ok(mid.feet.left.y<plan.root.y);assert.notEqual(mid.paths!['view-expression-mouth-interior'],samplePerformance(plan,profile,1175,silence).paths!['view-expression-mouth-interior']);
    const crouch=candidate(actor,view,'crouch');assert.ok(samplePerformance(crouch.plan,crouch.profile,1600,silence).bodyPosture.pelvisDropRatio>0);assert.equal(samplePerformance(crouch.plan,crouch.profile,4000,silence).bodyPosture.pelvisDropRatio,0);
  }
});

test('new motion does not unlock opposite views, backward gait, seats, head turns or unsupported prop operations',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const {profile,plan}=candidate(actor,view,view==='three-quarter-left'?'walk-left':'walk');
    const backward=structuredClone(plan);backward.walks[0]!.toX=backward.walks[0]!.fromX+(view==='three-quarter-left'?20:-20);assert.throws(()=>validatePerformance(backward,profile),/travel must follow/);
    const turn=structuredClone(plan);turn.headTurns=[{startMs:300,endMs:800,direction:'front'}];assert.throws(()=>validatePerformance(turn,profile),/needs-head-view/);
    const seat=structuredClone(plan);seat.entryPosture={pose:'seated',supportId:'log'};assert.throws(()=>validatePerformance(seat,profile),/needs-view-seat/);
    const operation=structuredClone(plan);operation.gestures=[{id:'operate',action:'operate',startMs:500,endMs:2000,hand:'left',target:{x:200,y:300},contactMs:900}];assert.throws(()=>validatePerformance(operation,profile),/native gesture/);
  }
});

async function pairedBoard(root:string){
  const f=await creativeFixture(root),definitions=(['lila','karo'] as const).map((actor,i)=>ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:candidate(actor,i?'three-quarter-left':'three-quarter-right').profile.appearance,sourceRefs:f.shot.sourceRefs}));
  const shots=[[0,2500],[2500,5000]].map(([startMs,endMs],index)=>{const shot=structuredClone(f.shot),c=shot.cinematic!;shot.id='native-motion-cut-'+index;shot.startMs=startMs!;shot.endMs=endMs!;c.shotId=shot.id;c.propBindings=[];shot.visualization!.events=passiveActorFixtureEvents(shot,f.narration);
    const tracks=definitions.map((character,i)=>{const performance=candidate(character.id as 'lila'|'karo',i?'three-quarter-left':'three-quarter-right').plan;performance.id=shot.id;performance.durationMs=2500;performance.stage={width:1280,height:720,groundY:540};performance.root={x:i?800:380,y:540};performance.scale=.8;performance.expressions=[];return {character,performance,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:[]};});
    c.performance=tracks[index]!.performance;c.actorScene=ActorSceneSchema.parse({primary:tracks[index]!.character,speakingSegmentIds:[],continuity:index?'continuous':'cut',supporting:[tracks[1-index]!]});bindActorShot(shot,f.profile,f.rig);shot.host!.actions=tracks[index]!.actions;c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};return shot;
  });return {...f,board:StoryboardSchema.parse({shots})};
}

test('canonical two-actor role swap keeps static native run clock; cut through locomotion rejects instead of restarting feet',async t=>{
  const f=await pairedBoard(await temporary(t)),shot=f.board.shots[0]!;assert.ok(shotUsesSourceSpeechClock(shot));
  for(const actor of ['lila','karo'] as const){const a=actorViewActingClock(f.board,shot,actor)!;assert.equal(a.runEndMs,5000);
    const track=(s:Shot)=>s.cinematic!.actorScene!.primary!.id===actor?{character:s.cinematic!.actorScene!.primary!,performance:s.cinematic!.performance}:s.cinematic!.actorScene!.supporting.find(a=>a.character.id===actor)!;
    const left=track(shot),rightShot=f.board.shots[1]!,right=track(rightShot),end=samplePerformance(left.performance,actorProfile(left.character),2500,silence,undefined,a),start=samplePerformance(right.performance,actorProfile(right.character),0,silence,undefined,actorViewActingClock(f.board,rightShot,actor));assert.deepEqual(end.face,start.face);assert.deepEqual(end.transforms,start.transforms);
  }
  const binding=rigSpeechPublicationBinding(shot,f.narration,f.board),changed=structuredClone(f.board);changed.shots[1]!.cinematic!.performance.walks=[{startMs:300,endMs:1800,fromX:800,toX:780}];
  assert.throws(()=>actorViewActingClock(changed,changed.shots[1]!,'karo'),/needs-view-locomotion-cut/);assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,changed,binding),/needs-view-locomotion-cut|changed|differs/);
  changed.shots[1]!.cinematic!.actorScene!.continuity='cut';assert.equal(actorViewActingClock(changed,changed.shots[1]!,'karo')!.runStartMs,2500);
  const silentOnly=structuredClone(f.board);for(const s of silentOnly.shots)for(const a of [s.cinematic!.actorScene!.primary!,...s.cinematic!.actorScene!.supporting.map(a=>a.character)]){delete a.appearance.bodyEyes;delete a.appearance.bodySpeech;delete a.appearance.bodyExpressions;}
  assert.ok(shotUsesSourceSpeechClock(silentOnly.shots[0]!));assert.ok(rigSpeechPublicationBinding(silentOnly.shots[0]!,f.narration,silentOnly));
});

test('common native scene emits cloth targets and exact assets within existing security/size gates',()=>{
  const {profile,plan}=candidate('karo','three-quarter-left','walk-left'),before=structuredClone({profile,plan}),compiled=compilePerformance(plan,profile,silence,'actor-karo-');assert.match(compiled.js,/actor-karo-view-cloth-triangle-11/);assert.equal(compiled.report.bodyMotion!.approved,false);assert.equal(compiled.report.bodyMotion!.selection,BODY_VIEW_LOCOMOTION_SELECTION);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  const result=performanceScene(plan,profile,silence),allowed=referenceHeadAssets(profile.appearance).map(a=>a.path);assert.deepEqual(validateSceneFiles(secureSceneFiles(result.files),{id:plan.id,startMs:0,endMs:plan.durationMs} as Shot,2000000,allowed,plan.stage),[]);assert.deepEqual({profile,plan},before);
});

test('preview, model brief and production gate expose the same optional motion without treating it as approval',()=>{
  const {profile,plan}=candidate('lila','three-quarter-right','walk'),html=bodyWorkbench('walk',800,'happy','three-quarter-right','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1',BODY_VIEW_LOCOMOTION_SELECTION);
  assert.match(html,/name="motion"/);assert.match(html,/href="\?action=walk[^\"]*&amp;motion=registered-locomotion-v1&amp;expressions=registered-expressions-v1"/);assert.match(html,/segment-draft/);
  const brief=creativeActingBrief([],{mode:'script',durationMs:4000,words:[],segments:[]},profile);assert.equal(brief.nativeLocomotion.selected,true);assert.equal(brief.nativeLocomotion.candidate.approved,false);
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.bodyMotion.nativeCandidate.fingerprint,nativeClothDescription.fingerprint);assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);assert.equal(nativeClothDescription.productionReady,false);assert.equal(hash(plan),hash(structuredClone(plan)));
});
