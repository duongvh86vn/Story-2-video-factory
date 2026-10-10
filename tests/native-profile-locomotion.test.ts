// DECLARED / NOT RUN. All runtime schemas, fixtures, geometry and samplers
// remain inside callbacks. User QA owns motion/art/audio/film acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {PROFILE_BODY_LOCOMOTION_SELECTION,PROFILE_MOTION_VIEWS,profileClothBindings} from '../packages/animation/body-view-profile-cloth-binding.js';
import {BASIC_BODY_EYES_SELECTION} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION} from '../packages/animation/body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION} from '../packages/animation/body-view-basic-expression-registration.js';
import {registeredBodyView,registeredDetailedBodyView,registeredLocomotionBodyView,bodyViewClothingSvg} from '../packages/animation/body-view-art.js';
import {registeredNativeCloth,nativeClothState,nativeClothTriangles,nativeClothMatrixError,nativeClothDescription} from '../packages/animation/body-view-cloth.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {clothTriangleArea} from '../packages/animation/view-cloth-geometry.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {BODY_SOURCE_VERSION} from '../packages/animation/schemas.js';
import {bodyCalibrationPlan,BODY_MOTION_MODES,type BodyAction} from '../packages/topics/body-workbench.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:'left'|'right',action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION,PROFILE_BODY_LOCOMOTION_SELECTION);
function pairedBoard(){
  const actors=(['lila','karo'] as const).map((actor,i)=>{const f=candidate(actor,i?'left':'right'),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character),root={x:i?800:300,y:500};return {character,profile,performance:{...f.plan,profileHash:profile.profileHash,stage:{width:1280,height:720,groundY:500},root,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}],sourceBody:{version:BODY_SOURCE_VERSION,id:'original-'+actor,startMs:0,endMs:4000,walks:[{startMs:300,endMs:3400,fromX:root.x,toX:root.x+(i?-60:60)}]}}};});
  const shots=[0,2000].map((startMs,i)=>{const cast=actors.map(a=>({character:a.character,performance:{...a.performance,id:'profile-motion-'+i+'-'+a.character.id},actions:[],speakingSegmentIds:[]}));return {id:'profile-motion-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:[],supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  return {actors,shots,board:{shots} as Storyboard};
}

test('four own garment cages bind original PNG bytes/canvas and cannot fall back to a detailed3/4 source',()=>{
  assert.ok(BODY_MOTION_MODES.includes(PROFILE_BODY_LOCOMOTION_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_MOTION_VIEWS){
    const c=profileClothBindings[actor][view],bytes=readFileSync(c.file),f=candidate(actor,view),source=registeredLocomotionBodyView(f.profile);
    assert.equal(hash(bytes),c.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[c.width,c.height]);assert.equal(source.view,view);assert.equal(source.file,c.file);assert.equal(registeredNativeCloth(f.profile,source),c);
    assert.throws(()=>registeredDetailedBodyView(f.profile),/detailed3\/4/);assert.throws(()=>registeredNativeCloth(f.profile,{...source,sha256:'0'.repeat(64)}),/image registration differs/);assert.throws(()=>registeredNativeCloth(f.profile,{...source,width:source.width+1}),/image registration differs/);
  }
});

test('only exact own profile motion is authorized, while default/basic/detailed/rear/seat/tool/cast boundaries remain closed',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_MOTION_VIEWS){
    const f=candidate(actor,view),source=registeredLocomotionBodyView(f.profile);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    for(const bodyMotion of [undefined,null,false,'registered-locomotion-v1']){const raw={...f.profile,appearance:{...f.profile.appearance,bodyMotion}} as unknown as HostProfile;if(bodyMotion!==undefined)assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredNativeCloth(raw,source));}
    for(const bodyView of ['front','back-left','back-right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredLocomotionBodyView(raw));assert.throws(()=>registeredNativeCloth(raw,source));}
    for(const option of ['bodySeat','bodySecondary','bodyManipulation','supportingModel','bodyHeadBank','sourceColour']){const raw={...f.profile,appearance:{...f.profile.appearance,[option]:'selected'}} as HostProfile;assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredNativeCloth(raw,source));}
    const invalid={...f.profile,appearance:{...f.profile.appearance,characterVariant:'other'}} as unknown as HostProfile;assert.throws(()=>registeredNativeCloth(invalid,source),/capability/);assert.throws(()=>registeredLocomotionBodyView(invalid),/needs-view-locomotion/);
    assert.throws(()=>bodyCalibrationPlan(actor,view==='left'?'walk-left':'walk','happy',undefined,view));
    assert.throws(()=>candidate(actor,view,view==='left'?'walk':'walk-left'),/opposite|follow/);
    for(const action of ['sit-left','sit-right','spear-thrust','hunt-aim','carry','head-turn'] as const)assert.throws(()=>candidate(actor,view,action));
  }
});

test('own cloth uses one native upper material and twelve shared mesh pieces with pinned belt and positive areas',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_MOTION_VIEWS){
    const f=candidate(actor,view),source=registeredLocomotionBodyView(f.profile),binding=registeredNativeCloth(f.profile,source),before=hash({f,source}),triangles=nativeClothTriangles(f.profile,source);
    assert.equal(triangles.length,12);for(const t of triangles)assert.ok(clothTriangleArea(t)>0);
    for(const controls of [{left:0,right:0},{left:18,right:-18},{left:-18,right:18}]){const state=nativeClothState(f.profile,source,controls);for(const piece of state.pieces){assert.ok(piece.areaRatio>=.25-1e-9);for(const [i,p]of piece.from.entries())if(p.y===binding.waist)assert.deepEqual(piece.target[i],p);}assert.equal(nativeClothMatrixError(f.profile,source,state.face,state.face,state.face,.5),0);}
    const art=bodyViewClothingSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png'),pair=['a-','b-'].map(p=>namespaceRigSvg(art.defs+art.torso,p)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(pair,/a-view-cloth-triangle-11/);assert.doesNotMatch(pair,/scale\(-1|url\(#view-|href="#view-/);assert.equal(hash({f,source}),before);
  }
});

test('forward profile walk/run has changing feet, planted stance soles and deterministic random/reverse seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_MOTION_VIEWS)for(const gait of ['walk','run'] as const){
    const action=(gait+(view==='left'?'-left':'')) as BodyAction,f=candidate(actor,view,action),before=hash(f),times=[0,300,600,900,1200,1600,2000,2700,3600,4000],saved=times.map(t=>samplePerformance(f.plan,f.profile,t,silence));
    for(const index of [7,1,8,3,0,9,6,2,5,4])assert.deepEqual(samplePerformance(f.plan,f.profile,times[index]!,silence),saved[index]);
    assert.ok(new Set(saved.map(s=>JSON.stringify(s.feet))).size>2);assert.ok(new Set(saved.map(s=>s.face['view-cloth-triangle-11']?.attr?.transform)).size>1);
    for(let t=400;t<2000;t+=20){const a=samplePerformance(f.plan,f.profile,t,silence),b=samplePerformance(f.plan,f.profile,t+5,silence);for(const side of ['left','right'] as const)if(a.stance[side]&&b.stance[side]){assert.ok(Math.abs(a.feet[side].x-b.feet[side].x)<.01);assert.ok(Math.abs(a.feet[side].y-b.feet[side].y)<.01);}assert.doesNotMatch(JSON.stringify(a),/NaN|Infinity/);}
    assert.equal(hash(f),before);
  }
});

test('profile jump/crouch use existing body/arm response while facial identity and unavailable seat/turn ownership remain guarded',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_MOTION_VIEWS){
    for(const action of ['jump','crouch'] as const){const f=candidate(actor,view,action),rest=samplePerformance(f.plan,f.profile,0,silence),active=samplePerformance(f.plan,f.profile,1100,silence);assert.notDeepEqual(active.transforms.pelvis,rest.transforms.pelvis);assert.equal(registeredBodyView(f.profile).sha256,profileClothBindings[actor][view].sha256);assert.doesNotMatch(JSON.stringify(active),/NaN|Infinity/);}
    const f=candidate(actor,view);for(const patch of [{turns:[{startMs:300,endMs:1800,from:'left',to:'right'}]},{headTurns:[{startMs:300,endMs:1800,from:'front',to:'left'}]},{entryPosture:{pose:'seated',supportId:'log'}}])assert.throws(()=>validatePerformance({...f.plan,...patch} as typeof f.plan,f.profile));
  }
});

test('complete original body and cloth lag retain identical phase across camera cut and primary/supporting swap',()=>{
  const f=pairedBoard(),before=hash(f.board);
  for(const actor of f.actors){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.bodyMotion,actor.performance.sourceBody);assert.deepEqual(clocks[0]!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);
    const end=samplePerformance(actor.performance,actor.profile,2000,silence,undefined,clocks[0]),start=samplePerformance(actor.performance,actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(end.face,start.face);assert.deepEqual(end.paths,start.paths);assert.deepEqual(end.transforms,start.transforms);assert.deepEqual(end.feet,start.feet);
  }
  assert.equal(hash(f.board),before);
});

test('missing/changed source body or local motion during a continuous slice invalidates original run and publication binding',()=>{
  const f=pairedBoard(),narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:0,endMs:4000,text:'The two actors walk.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);
  for(const change of ['missing','edited','local'] as const){const board=structuredClone(f.board),p=board.shots[1]!.cinematic!.performance;if(change==='missing')delete p.sourceBody;else if(change==='edited')p.sourceBody!.walks[0]!.toX-=1;else p.walks=[{startMs:100,endMs:1800,fromX:800,toX:770}];assert.throws(()=>actorViewActingClock(board,board.shots[1]!,'karo'));assert.throws(()=>assertRigSpeechPublicationBinding(board.shots[0]!,narration,board,binding));}
  const plain=structuredClone(f.board);for(const s of plain.shots)for(const a of [s.cinematic!.actorScene!.primary!,...s.cinematic!.actorScene!.supporting.map(a=>a.character)]){delete a.appearance.bodyEyes;delete a.appearance.bodySpeech;delete a.appearance.bodyExpressions;}assert.deepEqual(actorViewActingClock(plain,plain.shots[0]!,'lila')!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);
});

test('compiler binds exact profile selection/cloth/original source mode and preserves production gates',()=>{
  const f=candidate('karo','left','walk-left'),compiled=compilePerformance(f.plan,f.profile,silence,'own-');assert.match(compiled.js,/own-view-cloth-triangle-11/);assert.equal(compiled.report.bodyMotion?.selection,PROFILE_BODY_LOCOMOTION_SELECTION);assert.equal(compiled.report.bodyMotion?.approved,false);assert.equal(compiled.report.bodyMotion?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  assert.equal(nativeClothDescription.ownProfile.sourceCount,4);assert.equal(nativeClothDescription.ownProfile.frontMotion,false);assert.equal(nativeClothDescription.ownProfile.rearMotion,false);assert.equal(nativeClothDescription.ownProfile.productionReady,false);assert.deepEqual(nativeClothDescription.ownProfile.availableBanks,[]);
});
