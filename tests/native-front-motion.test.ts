// DECLARED / NOT RUN. User QA owns callbacks, fixtures, validators, compilation,
// source anatomy/art/motion, actual HTML5 playback and complete factory tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {FRONT_BODY_MOTION_SELECTION,frontClothBindings,frontalSidestepSchedule} from '../packages/animation/body-view-front-motion-binding.js';
import {BASIC_BODY_EYES_SELECTION} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION} from '../packages/animation/body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION} from '../packages/animation/body-view-basic-expression-registration.js';
import {FRONT_BODY_SECONDARY_SELECTION} from '../packages/animation/body-view-front-secondary-binding.js';
import {registeredBodyView,registeredDetailedBodyView,registeredLocomotionBodyView,bodyViewClothingSvg} from '../packages/animation/body-view-art.js';
import {registeredNativeCloth,nativeClothState,nativeClothTriangles,nativeClothMatrixError,nativeClothDescription} from '../packages/animation/body-view-cloth.js';
import {clothTriangleArea} from '../packages/animation/view-cloth-geometry.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {rigMetrics} from '../packages/animation/rig.js';
import {BODY_SOURCE_VERSION,HUNT_ANIMATION_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {bodyCalibrationPlan,BODY_MOTION_MODES,type BodyAction} from '../packages/topics/body-workbench.js';
import {requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',action:BodyAction='rest',secondary=false)=>bodyCalibrationPlan(actor,action,'happy','right','front','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION,FRONT_BODY_MOTION_SELECTION,secondary?FRONT_BODY_SECONDARY_SELECTION:'rigid');
function pairedBoard(){
  const actors=(['lila','karo'] as const).map((actor,i)=>{
    const f=candidate(actor,'rest',true),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character),root={x:i?800:300,y:500};
    const performance:PerformancePlan={...f.plan,profileHash:profile.profileHash,stage:{width:1280,height:720,groundY:500},root,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy'}],walks:[],sourceBody:{version:BODY_SOURCE_VERSION,id:'original-front-'+actor,startMs:0,endMs:4000,walks:[{startMs:300,endMs:3400,fromX:root.x,toX:root.x+(i?-40:40),gait:'sidestep'}]}};
    return {character,profile,performance};
  });
  const shots=[0,2000].map((startMs,i)=>{const cast=actors.map(a=>({character:a.character,performance:{...a.performance,id:'front-cut-'+i+'-'+a.character.id},actions:[],speakingSegmentIds:[]}));return {id:'front-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:[],supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  return {actors,shots,board:{shots} as Storyboard};
}

test('two own front cages preserve exact PNG/SHA/canvas and cannot use other-view cloth or geometry',()=>{
  assert.ok(BODY_MOTION_MODES.includes(FRONT_BODY_MOTION_SELECTION));
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),c=frontClothBindings[actor],bytes=readFileSync(c.file),source=registeredLocomotionBodyView(f.profile);
    assert.equal(hash(bytes),c.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[c.width,c.height]);assert.equal(source.view,'front');assert.equal(source.file,c.file);assert.equal(registeredNativeCloth(f.profile,source),c);assert.throws(()=>registeredDetailedBodyView(f.profile),/detailed3\/4/);
    for(const changed of [{...source,sha256:'0'.repeat(64)},{...source,width:source.width+1},{...source,height:source.height+1}])assert.throws(()=>registeredNativeCloth(f.profile,changed),/image registration differs/);
    assert.ok(c.left<c.split&&c.split<c.right&&c.waist<c.bottom&&c.bottom<c.height);
  }
});
test('front selection is explicit and does not grant forward walk/run, depth, seat, props/tools, turn, head bank or supportingModel',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    for(const bodyView of ['left','right','back-left','back-right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredLocomotionBodyView(raw));}
    for(const action of ['walk','walk-left','run','run-left','sit-left','carry','spear-thrust','hunt-chase','head-turn'] as const)assert.throws(()=>candidate(actor,action));
    assert.throws(()=>bodyCalibrationPlan(actor,'sidestep','happy',undefined,'front'),/front-motion/);
    for(const option of [{bodySeat:'registered-seated-v1'},{bodyManipulation:'registered-manipulation-v1'},{supportingModel:'prehistoric-male-bald'},{sourceColour:'original-rgb-v2'},{bodyHeadBank:{actor:'lila'}}])assert.throws(()=>HostProfileSchema.parse({...f.profile,appearance:{...f.profile.appearance,...option}}));
    const raw={...f.profile,appearance:{...f.profile.appearance,bodyMotion:undefined}} as HostProfile;assert.throws(()=>registeredNativeCloth(raw,registeredBodyView(raw)));
  }
});
test('paired lateral schedule leads in actual travel direction, closes each pair and finishes both own sole offsets',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['sidestep','sidestep-left'] as const){const f=candidate(actor,action),w=f.plan.walks[0]!,m=rigMetrics(f.profile),root=(t:number)=>samplePerformance(f.plan,f.profile,t,silence).root,steps=frontalSidestepSchedule(w,m,f.plan.scale,root),leading=action==='sidestep'?'right':'left';
    assert.equal(steps.length%2,0);assert.equal(steps[0]!.side,leading);assert.equal(steps.at(-1)!.endMs,w.endMs);
    for(let i=0;i<steps.length;i+=2){assert.notEqual(steps[i]!.side,steps[i+1]!.side);const a=steps[i]!,b=steps[i+1]!,offset=(s:'left'|'right')=>(m.footOffsets?.[s]??(s==='left'?-m.stance:m.stance))*f.plan.scale;assert.ok(Math.abs((a.landing-offset(a.side))-(b.landing-offset(b.side)))<1e-9);}
    for(const s of steps.slice(-2))assert.ok(Math.abs(s.landing-w.toX-(m.footOffsets?.[s.side]??(s.side==='left'?-m.stance:m.stance))*f.plan.scale)<1e-9);
    assert.throws(()=>frontalSidestepSchedule({...w,toX:w.fromX},m,f.plan.scale,root),/nonzero/);assert.throws(()=>frontalSidestepSchedule({...w,gait:'walk'},m,f.plan.scale,root),/sidestep/);
  }
});
test('front cloth retains native upper artwork and twelve shared pieces with pinned belt and positive area',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),source=registeredLocomotionBodyView(f.profile),c=registeredNativeCloth(f.profile,source),before=hash({f,source}),triangles=nativeClothTriangles(f.profile,source);assert.equal(triangles.length,12);
    for(const controls of [{left:0,right:0},{left:18,right:-18},{left:-18,right:18}]){const state=nativeClothState(f.profile,source,controls);for(const piece of state.pieces){assert.ok(clothTriangleArea(piece.from)>0&&piece.areaRatio>=.25-1e-9);for(const [i,p]of piece.from.entries())if(p.y===c.waist)assert.deepEqual(piece.target[i],p);}assert.equal(nativeClothMatrixError(f.profile,source,state.face,state.face,state.face,.5),0);}
    const art=bodyViewClothingSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png'),pair=['a-','b-'].map(p=>namespaceRigSvg(art.defs+art.torso,p)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(pair,/a-view-cloth-triangle-11/);assert.doesNotMatch(pair,/scale\(-1|url\(#view-|href="#view-/);assert.equal(hash({f,source}),before);
  }
});
test('lateral motion keeps sole order and stance contact with deterministic random/reverse seeks and fixed source identity',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['sidestep','sidestep-left'] as const){const f=candidate(actor,action),before=hash(f),times=[0,300,600,900,1200,1600,2000,2700,3600,4000],saved=times.map(t=>samplePerformance(f.plan,f.profile,t,silence));
    for(const i of [7,1,8,3,0,9,6,2,5,4])assert.deepEqual(samplePerformance(f.plan,f.profile,times[i]!,silence),saved[i]);assert.ok(new Set(saved.map(s=>JSON.stringify(s.feet))).size>2);
    for(let t=0;t<4000;t+=13){const a=samplePerformance(f.plan,f.profile,t,silence),b=samplePerformance(f.plan,f.profile,t+3,silence);assert.ok(a.feet.left.x<a.feet.right.x);for(const side of ['left','right'] as const)if(a.stance[side]&&b.stance[side]){assert.ok(Math.abs(a.feet[side].x-b.feet[side].x)<.01);assert.ok(Math.abs(a.feet[side].y-b.feet[side].y)<.01);}assert.doesNotMatch(JSON.stringify(a),/NaN|Infinity/);}
    assert.equal(registeredBodyView(f.profile).sha256,frontClothBindings[actor].sha256);assert.equal(f.plan.facing,'front');assert.equal(f.plan.headView,'front');assert.equal(hash(f),before);
  }
});
test('frontal jump/crouch/react use the same body kernel while whole face/head and source garment remain independently selected',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['jump','crouch'] as const){const f=candidate(actor,action,true),rest=samplePerformance(f.plan,f.profile,0,silence),active=samplePerformance(f.plan,f.profile,1100,silence);assert.notDeepEqual(active.transforms.pelvis,rest.transforms.pelvis);assert.ok(active.feet.left.x<active.feet.right.x);assert.doesNotMatch(JSON.stringify(active),/NaN|Infinity/);assert.equal(registeredBodyView(f.profile).file,frontClothBindings[actor].file);
    for(const patch of [{turns:[{startMs:0,endMs:1000,direction:'left'}]},{headTurns:[{startMs:0,endMs:1000,direction:'left'}]},{props:[{id:'unregistered-object',origin:{x:100,y:300}}]}])assert.throws(()=>validatePerformance({...f.plan,...patch} as PerformancePlan,f.profile));
  }
});
test('complete original sidestep/cloth/face/hair clocks survive continuous camera cut and actual primary/supporting swap',()=>{
  const f=pairedBoard(),before=hash(f.board);
  for(const actor of f.actors){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.bodyMotion,actor.performance.sourceBody);
    const end=samplePerformance(actor.performance,actor.profile,2000,silence,undefined,clocks[0]),start=samplePerformance(actor.performance,actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(end.face,start.face);assert.deepEqual(end.paths,start.paths);assert.deepEqual(end.transforms,start.transforms);assert.deepEqual(end.feet,start.feet);
  }assert.equal(hash(f.board),before);
});
test('wrong/local/missing/sibling-edited source gait and unregistered actor direction invalidate the original run and publication',()=>{
  const f=pairedBoard(),narration:Narration={mode:'script',durationMs:4000,words:[],segments:[{id:'line',startMs:0,endMs:4000,text:'The two actors take lateral steps.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);
  for(const change of ['missing','edited','local'] as const){const board=structuredClone(f.board),p=board.shots[1]!.cinematic!.performance;if(change==='missing')delete p.sourceBody;else if(change==='edited')p.sourceBody!.walks[0]!.toX--;else p.walks=[{startMs:100,endMs:1800,fromX:800,toX:770,gait:'sidestep'}];assert.throws(()=>actorViewActingClock(board,board.shots[1]!,'karo'));assert.throws(()=>assertRigSpeechPublicationBinding(board.shots[0]!,narration,board,binding));}
  const c=candidate('lila','sidestep');for(const gait of [undefined,'walk','run'] as const)assert.throws(()=>validatePerformance({...c.plan,compilerVersion:HUNT_ANIMATION_VERSION,walks:[{...c.plan.walks[0]!,gait}]},c.profile),/frontal travel/);
  const side=bodyCalibrationPlan('lila','walk','happy',undefined,'right','cutout','silent','native','rest','native','registered-profile-locomotion-v1');assert.throws(()=>validatePerformance({...side.plan,walks:side.plan.walks.map(w=>({...w,gait:'sidestep' as const}))},side.profile));
});
test('compiler/report/cache selection binds front source but never grants production or motion acceptance',()=>{
  const f=candidate('karo','sidestep'),compiled=compilePerformance(f.plan,f.profile,silence,'own-front-');assert.match(compiled.js,/own-front-view-cloth-triangle-11/);assert.equal(compiled.report.bodyMotion?.selection,FRONT_BODY_MOTION_SELECTION);assert.equal(compiled.report.bodyMotion?.approved,false);assert.equal(compiled.report.bodyMotion?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  const d=nativeClothDescription.ownFront;assert.equal(d.sourceCount,2);assert.equal(d.forwardWalking,false);assert.equal(d.depthTravel,false);assert.equal(d.productionReady,false);assert.equal(d.productionRig,null);assert.deepEqual(d.availableBanks,[]);assert.throws(()=>requireTopicProductionReady({topic:{id:'prehistoric-life'}} as Parameters<typeof requireTopicProductionReady>[0]));
});
