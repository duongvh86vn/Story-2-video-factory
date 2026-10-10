// Runtime declarations for the user's test model. All callbacks/fixtures NOT RUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ActorDefinitionSchema,ActorSceneSchema} from '../packages/actors/schemas.js';
import {NarrationSchema,StoryboardSchema,type Shot,type Storyboard} from '../packages/core/schemas.js';
import {ConfigSchema} from '../packages/core/config.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorViewActingClock,actorUsesViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding,shotUsesSourceSpeechClock} from '../packages/actors/speech-clock.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {bodyCalibrationPlan,bodyWorkbench,type BodyAction} from '../packages/topics/body-workbench.js';
import {BODY_SOURCE_VERSION} from '../packages/animation/schemas.js';
import {projectViewExpressions} from '../packages/animation/view-expression-track.js';
import {REGISTERED_BODY_VIEWS,registeredDetailedBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_SECONDARY_SELECTION,registeredNativeSecondary,nativeSecondaryPieces,nativeSecondaryState,nativeSecondaryBounds,nativeSecondaryMatrixError,nativeSecondaryDescription} from '../packages/animation/body-view-secondary.js';
import {bodyViewEyesRegistration} from '../packages/animation/body-view-eyes.js';
import {bodyViewMouthRegistration} from '../packages/animation/body-view-mouth.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {performanceSvg} from '../packages/animation/rig.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {performanceScene} from '../packages/animation/scene.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {cameraHostBounds,planCamera} from '../packages/director/camera.js';
import {creativeActingBrief} from '../packages/director/acting-brief.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {schemaLibrary} from '../library/schemas/index.js';
import {creativeFixture} from './creative-fixture.js';
import {passiveActorFixtureEvents} from './native-actor-fixture.js';
import {temporary} from './support.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1','registered-locomotion-v1',BODY_VIEW_SECONDARY_SELECTION);
const withoutSecondary=(face:Record<string,unknown>)=>Object.fromEntries(Object.entries(face).filter(([id])=>!id.startsWith('view-secondary-')));
function run(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],cuts=[1000,2050,3200,5000],scale=1,action:BodyAction=view==='three-quarter-left'?'walk-left':'walk'){
  const prepared=candidate(actor,view,action),base=prepared.plan,character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'The two participants move together.'}]}),profile=actorProfile(character);
  base.profileHash=profile.profileHash;base.scale=scale;
  const sourceBody={version:BODY_SOURCE_VERSION,id:actor+'-body',startMs:1000,endMs:5000,walks:structuredClone(base.walks),jumps:structuredClone(base.jumps),postures:structuredClone(base.postures)};
  const expressions=[{startMs:1000,endMs:2100,mood:'happy' as const},{startMs:2100,endMs:3350,mood:'surprised' as const},{startMs:3350,endMs:5000,mood:'happy' as const}];
  const shots=cuts.slice(0,-1).map((startMs,i)=>{const endMs=cuts[i+1]!,p=structuredClone(base);p.id=actor+'-secondary-'+i;p.durationMs=endMs-startMs;p.walks=[];p.jumps=[];p.postures=[];delete p.entryPosture;p.sourceBody=structuredClone(sourceBody);p.gestures=[];p.gazes=[];p.expressions=projectViewExpressions(expressions,startMs,endMs);
    return {id:p.id,startMs,endMs,narrationSegmentIds:['cue'],host:{presence:'beside-model'},cinematic:{performance:p,actorScene:ActorSceneSchema.parse({primary:character,speakingSegmentIds:[],supporting:[],continuity:i?'continuous':'cut'})}} as Shot;
  });return {profile,character,shots,board:{shots} as Storyboard};
}

test('secondary selection is explicit in shared profiles, no production or default-art approval',()=>{
  assert.equal(schemaLibrary['host-profile'],HostProfileSchema);
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const f=candidate(actor,view);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));assert.doesNotThrow(()=>validatePerformance(f.plan,f.profile));
    const legacy=bodyCalibrationPlan(actor,'rest','happy',undefined,view);assert.equal(legacy.profile.appearance.bodySecondary,undefined);assert.doesNotMatch(performanceSvg(legacy.profile,'scene'),/id="view-secondary-/);
    for(const patch of [{artworkVersion:'forest-body-1'},{bodyView:undefined},{characterVariant:undefined},{sourceColour:'original-rgb-v2'}])assert.equal(HostProfileSchema.safeParse({...f.profile,appearance:{...f.profile.appearance,...patch}}).success,false);
    assert.notEqual(f.profile.profileHash,legacy.profile.profileHash);
  }
  assert.equal(nativeSecondaryDescription.approved,false);assert.equal(nativeSecondaryDescription.productionReady,false);
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);assert.equal(topicContext(config)!.bodyMotion.nativeSecondary.fingerprint,nativeSecondaryDescription.fingerprint);
  assert.throws(()=>bodyCalibrationPlan('lila','rest','happy',undefined,'source','cutout','silent','native','rest','native','rigid',BODY_VIEW_SECONDARY_SELECTION),/needs-view-secondary/);
});

test('each independent region binds its image and stays outside native eye and mouth ROIs',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const {profile}=candidate(actor,view),c=registeredDetailedBodyView(profile),registration=registeredNativeSecondary(profile,c);
    assert.equal(registration.sha256,c.sha256);assert.throws(()=>registeredNativeSecondary(profile,{...c,sha256:'0'.repeat(64)}),/registration differs/);assert.throws(()=>registeredNativeSecondary(profile,{...c,width:c.width+1}),/registration differs/);
    const protectedRegions:Array<{x:number;y:number;width:number;height:number}>=[...bodyViewEyesRegistration[actor][view].eyes.map(e=>e.bounds),bodyViewMouthRegistration[actor][view].bounds];
    protectedRegions.push({x:c.neck.x-24,y:c.neck.y-24,width:48,height:48});
    for(const r of registration.regions)for(const box of protectedRegions)assert.ok(r.right<=box.x||r.left>=box.x+box.width||r.bottom<=box.y||r.top>=box.y+box.height);
    const svg=performanceSvg(profile,'scene'),ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(svg,/view-secondary-static-mask/);assert.match(namespaceRigSvg(svg,actor+'-'),new RegExp('id="'+actor+'-view-secondary-crest-11"'));
    const head=bodyViewHeadSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');assert.match(head,/source-head-clip/);assert.doesNotMatch(head,/scale\(-1/);assert.equal(nativeSecondaryPieces(profile,c).length,24);
  }
});

test('shared texture vertices, attachment seams and bounded positive-area deformation hold in all four views',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){const {profile}=candidate(actor,view),c=registeredDetailedBodyView(profile),before=structuredClone(c);
    for(const control of [{x:0,y:0,angle:0},{x:32,y:0,angle:8},{x:-32,y:0,angle:-8},{x:0,y:32,angle:8}]){
      const state=nativeSecondaryState(profile,c,control),vertices=new Map<string,string>();assert.ok(state.influence>=0&&state.influence<=1);
      for(const piece of state.pieces){const region=nativeSecondaryPieces(profile,c).find(p=>p.id===piece.id)!.region;assert.ok(piece.areaRatio>=.4-1e-9);
        piece.from.forEach((p,i)=>{const target=piece.target[i]!,key=region.id+':'+p.x+','+p.y,value=JSON.stringify(target);if(vertices.has(key))assert.equal(value,vertices.get(key));else vertices.set(key,value);
          if(p.x===region.left||p.x===region.right||p.y===(region.pin==='top'?region.top:region.bottom))assert.deepEqual(target,p);
          assert.ok(Math.hypot(target.x-p.x,target.y-p.y)<=region.maxDisplacement+1e-9);if(!control.x&&!control.y&&!control.angle)assert.deepEqual(target,p);
        });
      }
    }assert.deepEqual(c,before);
    for(const control of [{x:NaN,y:0,angle:0},{x:33,y:0,angle:0},{x:0,y:0,angle:9}])assert.throws(()=>nativeSecondaryState(profile,c,control),/needs-view-secondary/);
    assert.throws(()=>nativeSecondaryState(profile,c,{} as {x:number;y:number;angle:number}),/complete finite/);
  }
});

test('bounds include mapped mesh vertices and interpolation checks native texture distance',()=>{
  const {profile}=candidate('lila','three-quarter-right'),c=registeredDetailedBodyView(profile),a=nativeSecondaryState(profile,c,{x:0,y:0,angle:0}),b=nativeSecondaryState(profile,c,{x:20,y:0,angle:6}),bounds=nativeSecondaryBounds(profile,c,b.face);
  for(const p of b.pieces.flatMap(p=>p.target)){assert.ok(p.x>=bounds.left-1e-4&&p.x<=bounds.right+1e-4);assert.ok(p.y>=bounds.top-1e-4&&p.y<=bounds.bottom+1e-4);}
  assert.equal(nativeSecondaryMatrixError(profile,c,a.face,a.face,a.face,.5),0);assert.ok(nativeSecondaryMatrixError(profile,c,a.face,a.face,b.face,.5)>1);
  assert.throws(()=>nativeSecondaryBounds(profile,c,{}),/missing baked/);const bad=structuredClone(b.face);bad[Object.keys(bad)[0]!]!.attr.transform='matrix(1 0 0 1 NaN 0)';assert.throws(()=>nativeSecondaryBounds(profile,c,bad),/invalid baked/);
  assert.throws(()=>nativeSecondaryMatrixError(profile,c,a.face,b.face,b.face,NaN),/interpolation progress/);
});

test('secondary motion leaves body, contact and facial feature state unchanged under random/reverse seek',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS)for(const action of [view==='three-quarter-left'?'walk-left':'walk','jump'] as BodyAction[]){const {profile,plan}=candidate(actor,view,action),rigid=structuredClone(profile);delete rigid.appearance.bodySecondary;const before=structuredClone({profile,plan});let moved=false;
    for(const at of [4000,0,1175,800,2200,0,3500]){const frame=samplePerformance(plan,profile,at,silence),plain=samplePerformance(plan,rigid,at,silence);assert.deepEqual(frame.transforms,plain.transforms);assert.deepEqual(frame.hands,plain.hands);assert.deepEqual(frame.feet,plain.feet);assert.deepEqual(withoutSecondary(frame.face),plain.face);assert.deepEqual(frame, samplePerformance(plan,profile,at,silence));
      moved ||= Object.entries(frame.face).some(([id,v])=>id.startsWith('view-secondary-')&&v.attr?.transform.startsWith('matrix(')&&v.attr.transform!=='matrix(1 0 0 1 0 0)');
    }assert.ok(moved);assert.deepEqual({profile,plan},before);
  }
});

test('original head/body/expression history survives cuts and source jumps without restarting the filter',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS)for(const scale of [.75,1,1.25])for(const action of [view==='three-quarter-left'?'walk-left':'walk','jump'] as BodyAction[]){const sliced=run(actor,view,undefined,scale,action),whole=run(actor,view,[1000,5000],scale,action),original=whole.shots[0]!,clock=actorViewActingClock(whole.board,original,actor)!;
    for(const shot of sliced.shots){const p=shot.cinematic!.performance,c=actorViewActingClock(sliced.board,shot,actor)!;
      for(const at of [p.durationMs,0,40,p.durationMs*.5,0,159]){const frame=samplePerformance(p,sliced.profile,at,silence,undefined,c),expected=samplePerformance(original.cinematic!.performance,whole.profile,at+shot.startMs-1000,silence,undefined,clock);assert.deepEqual(frame.face,expected.face);assert.deepEqual(frame.transforms,expected.transforms);}
    }
  }
});

test('silent secondary-only actors participate in canonical source identity and reject changed siblings',()=>{
  const f=run('lila','three-quarter-right',[1000,3000,5000],1,'rest');for(const shot of f.shots){const a=shot.cinematic!.actorScene!.primary!;for(const key of ['bodySpeech','bodyEyes','bodyExpressions','bodyMotion'] as const)delete a.appearance[key];shot.cinematic!.performance.profileHash=actorProfile(a).profileHash;delete shot.cinematic!.performance.sourceBody;shot.cinematic!.performance.expressions=[{startMs:0,endMs:2000,mood:'happy'}];}
  assert.ok(actorUsesViewActingClock(f.shots[0]!.cinematic!.actorScene!.primary!));assert.ok(shotUsesSourceSpeechClock(f.shots[0]!));const clock=actorViewActingClock(f.board,f.shots[1]!,'lila')!;assert.equal(clock.runStartMs,1000);assert.equal(clock.runEndMs,5000);
  const narration=NarrationSchema.parse({mode:'wav',durationMs:5000,segments:[{id:'cue',startMs:1000,endMs:5000,text:'The two participants move together.'}]}),binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board),changed=structuredClone(f.board);delete changed.shots[1]!.cinematic!.actorScene!.primary!.appearance.bodySecondary;
  assert.throws(()=>assertRigSpeechPublicationBinding(f.shots[0]!,narration,changed,binding),/changed|differs|continuous native actor/);
});

test('shot-local lunge cannot restart secondary head history across a declared camera run',()=>{
  const prepared=bodyCalibrationPlan('karo','spear-lunge','happy',undefined,'three-quarter-right','cutout','silent','native','rest','native','rigid',BODY_VIEW_SECONDARY_SELECTION),character=ActorDefinitionSchema.parse({id:'karo',name:'Karo',kind:'stick-man',role:'illustration',identity:'illustrative',appearance:prepared.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'He braces and pushes the spear.'}]}),profile=actorProfile(character);
  const shots=[0,4000].map((startMs,i)=>{const performance=structuredClone(prepared.plan);performance.id='secondary-lunge-'+i;performance.profileHash=profile.profileHash;return {id:performance.id,startMs,endMs:startMs+4000,cinematic:{performance,actorScene:ActorSceneSchema.parse({primary:character,supporting:[],speakingSegmentIds:[],continuity:i?'continuous':'cut'})}} as Shot;});
  assert.doesNotThrow(()=>actorViewActingClock({shots:[shots[0]!]},shots[0]!,'karo'));
  assert.throws(()=>actorViewActingClock({shots},shots[1]!,'karo'),/needs-view-secondary-phase:.*lunge/);
  shots[1]!.cinematic!.actorScene!.continuity='cut';assert.equal(actorViewActingClock({shots},shots[1]!,'karo')!.runStartMs,4000);
});

test('compiler, camera and scene resource/security caps include the moving texture candidate',()=>{
  const f=run('karo','three-quarter-left'),shot=f.shots[1]!,p=shot.cinematic!.performance,clock=actorViewActingClock(f.board,shot,'karo')!,compiled=compilePerformance(p,f.profile,silence,'actor-karo-',undefined,clock);assert.match(compiled.js,/actor-karo-view-secondary-beard-11/);assert.equal(compiled.report.bodySecondary!.approved,false);assert.equal(compiled.report.bodySecondary!.motionVerified,false);assert.equal(compiled.report.phonemeLipSync,false);
  const camera=cameraHostBounds(p,f.profile,clock);for(const at of [0,40,500,p.durationMs]){const frame=samplePerformance(p,f.profile,at,silence,undefined,clock),c=registeredDetailedBodyView(f.profile),bounds=nativeSecondaryBounds(f.profile,c,frame.face),v=frame.transforms.head!.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)!.map(Number),angle=v[2]!*Math.PI/180;
    for(const x of [bounds.left,bounds.right])for(const y of [bounds.top,bounds.bottom]){const dx=(x-c.neck.x)*c.headScale*v[3]!,dy=(y-c.neck.y)*c.headScale*v[3]!,px=v[0]!+dx*Math.cos(angle)-dy*Math.sin(angle),py=v[1]!+dx*Math.sin(angle)+dy*Math.cos(angle);assert.ok(px>=camera.head.left-1e-4&&px<=camera.head.right+1e-4);assert.ok(py>=camera.head.top-1e-4&&py<=camera.head.bottom+1e-4);}
  }
  const local=candidate('karo','three-quarter-left','walk-left'),scene=performanceScene(local.plan,local.profile,silence),allowed=referenceHeadAssets(local.profile.appearance).map(a=>a.path);assert.deepEqual(validateSceneFiles(secureSceneFiles(scene.files),{id:local.plan.id,startMs:0,endMs:4000} as Shot,2000000,allowed,local.plan.stage),[]);
});

test('canonical actor role swaps bind independent native secondary resources and original clocks',async t=>{
  const f=await creativeFixture(await temporary(t)),definitions=(['lila','karo'] as const).map((id,i)=>ActorDefinitionSchema.parse({id,name:id,kind:'stick-man',role:'illustration',identity:'illustrative',appearance:candidate(id,i?'three-quarter-left':'three-quarter-right').profile.appearance,sourceRefs:f.shot.sourceRefs}));
  const shots=[[0,2500],[2500,5000]].map(([startMs,endMs],i)=>{const shot=structuredClone(f.shot),c=shot.cinematic!;shot.id='secondary-pair-'+i;shot.startMs=startMs!;shot.endMs=endMs!;c.shotId=shot.id;c.propBindings=[];shot.visualization!.events=passiveActorFixtureEvents(shot,f.narration);
    const tracks=definitions.map((character,index)=>{const p=candidate(character.id as 'lila'|'karo',index?'three-quarter-left':'three-quarter-right').plan;p.id=shot.id;p.durationMs=2500;p.stage={width:1280,height:720,groundY:540};p.root={x:index?800:380,y:540};p.scale=.8;p.expressions=[];return {character,performance:p,actions:[{type:'idle' as const,startMs:shot.startMs,endMs:shot.endMs}],speakingSegmentIds:[]};});
    c.performance=tracks[i]!.performance;c.actorScene=ActorSceneSchema.parse({primary:tracks[i]!.character,speakingSegmentIds:[],supporting:[tracks[1-i]!],continuity:i?'continuous':'cut'});bindActorShot(shot,f.profile,f.rig);shot.host!.actions=tracks[i]!.actions;c.continuity={...c.continuity,entry:{...c.performance.root},exit:{...c.performance.root},facing:c.performance.facing??'front',carriedProps:[]};return shot;
  }),board=StoryboardSchema.parse({shots});
  for(const shot of board.shots){const c=shot.cinematic!,a=c.actorScene!,primary=actorProfile(a.primary!),clock=actorViewActingClock(board,shot,a.primary!.id);c.camera=planCamera(c.performance,primary,{framing:'wide',movement:'push-in',focus:'ensemble',parts:shot.visualization!.parts,actingClock:clock,supporting:a.supporting.map(s=>({performance:s.performance,profile:actorProfile(s.character),actingClock:actorViewActingClock(board,shot,s.character.id)}))});}
  const shot=board.shots[1]!,rendered=renderCinematic(shot,f.profile,f.rig,silence,f.config,undefined,f.narration,undefined,undefined,board);assert.match(rendered.files.files.find(file=>file.path==='scene.js')!.content,/actor-lila-view-secondary-tail-11/);assert.match(rendered.files.files.find(file=>file.path==='scene.js')!.content,/actor-karo-view-secondary-beard-11/);
  assert.deepEqual(rendered.report.actors.map(a=>a.actorId).sort(),['karo','lila']);assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),shot,f.config.workflow.max_scene_bytes,actorRigResourcePaths(shot,f.profile),f.config.rendering.final),[]);assert.ok('phonemeLipSync' in rendered.report);assert.equal(rendered.report.phonemeLipSync,false);
});

test('diagnostic form and model brief preserve explicit selection without changing narration or final gates',()=>{
  const {profile}=candidate('lila','three-quarter-right','walk'),html=bodyWorkbench('walk',800,'happy','three-quarter-right','cutout','registered-rest-mouth-v1','registered-eyes-v1','rest','registered-expressions-v1','registered-locomotion-v1',BODY_VIEW_SECONDARY_SELECTION);assert.match(html,/name="secondary"/);assert.match(html,/&amp;secondary=registered-secondary-v1"/);assert.match(html,/segment-draft/);
  const narration=NarrationSchema.parse({mode:'script',durationMs:4000,segments:[]}),before=hash(narration),brief=creativeActingBrief([],narration,profile);assert.equal(brief.nativeSecondary.selected,true);assert.equal(brief.nativeSecondary.candidate.approved,false);assert.equal(hash(narration),before);
});
