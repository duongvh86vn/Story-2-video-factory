// DECLARED / NOT RUN. Every fixture/schema/geometry/pose/compiler call is
// inside a callback or uninvoked helper; actual runtime/video belongs to QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {REAR_BODY_LOCOMOTION_SELECTION,REAR_MOTION_VIEWS,rearClothBindings} from '../packages/animation/body-view-rear-cloth-binding.js';
import {registeredBodyView,registeredDetailedBodyView,registeredLocomotionBodyView,bodyViewClothingSvg,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
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
import {cameraHostBounds} from '../packages/director/camera.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:'back-left'|'back-right',action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','silent','native','rest','native',REAR_BODY_LOCOMOTION_SELECTION);
function pairedBoard(){
  const actors=(['lila','karo'] as const).map((actor,i)=>{const f=candidate(actor,i?'back-left':'back-right'),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character),root={x:i?800:300,y:500};return {character,profile,performance:{...f.plan,profileHash:profile.profileHash,stage:{width:1280,height:720,groundY:500},root,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}],sourceBody:{version:BODY_SOURCE_VERSION,id:'rear-original-'+actor,startMs:0,endMs:4000,walks:[{startMs:300,endMs:3400,fromX:root.x,toX:root.x+(i?-60:60)}]}}};});
  const shots=[0,2000].map((startMs,i)=>{const cast=actors.map(a=>({character:a.character,performance:{...a.performance,id:'rear-cut-'+i+'-'+a.character.id},actions:[],speakingSegmentIds:[]}));return {id:'rear-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:[],supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  return {actors,shots,board:{shots} as Storyboard};
}

test('four own rear cages bind exact PNG bytes/canvas without borrowing profile or detailed3/4 sources',()=>{
  assert.ok(BODY_MOTION_MODES.includes(REAR_BODY_LOCOMOTION_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of REAR_MOTION_VIEWS){const b=rearClothBindings[actor][view],bytes=readFileSync(b.file),f=candidate(actor,view),c=registeredLocomotionBodyView(f.profile);assert.equal(hash(bytes),b.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[b.width,b.height]);assert.equal(c.view,view);assert.equal(c.file,b.file);assert.equal(c.chin,null);assert.equal(registeredNativeCloth(f.profile,c),b);assert.throws(()=>registeredDetailedBodyView(f.profile));for(const patch of [{sha256:'0'.repeat(64)},{width:c.width+1},{height:c.height+1},{view:view==='back-left'?'back-right':'back-left'}])assert.throws(()=>registeredNativeCloth(f.profile,{...c,...patch} as typeof c));}
});

test('rear mode rejects wrong view/actor, face/secondary/seat/tool/head-bank/cast and opposite or default gait',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REAR_MOTION_VIEWS){
    const f=candidate(actor,view),c=registeredLocomotionBodyView(f.profile);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    for(const bodyView of ['front','left','right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredLocomotionBodyView(raw));assert.throws(()=>registeredNativeCloth(raw,c));}
    for(const patch of [{bodySpeech:'registered-basic-mouth-v1'},{bodyEyes:'registered-basic-eyes-v1'},{bodyExpressions:'registered-basic-expressions-v1'},{bodySecondary:'registered-profile-secondary-v1'},{bodySeat:'registered-seated-v1'},{bodyManipulation:'registered-manipulation-v1'},{supportingModel:'male-bald'},{bodyHeadBank:'selected'},{sourceColour:'original-rgb-v2'}]){const raw={...f.profile,appearance:{...f.profile.appearance,...patch}} as unknown as HostProfile;assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredNativeCloth(raw,c));}
    for(const bodyMotion of [undefined,null,false,'registered-locomotion-v1','registered-profile-locomotion-v1']){const raw={...f.profile,appearance:{...f.profile.appearance,bodyMotion}} as unknown as HostProfile;assert.throws(()=>registeredNativeCloth(raw,c));assert.throws(()=>registeredLocomotionBodyView(raw));}
    const invalid={...f.profile,appearance:{...f.profile.appearance,characterVariant:'other'}} as unknown as HostProfile;assert.throws(()=>registeredNativeCloth(invalid,c));assert.throws(()=>registeredLocomotionBodyView(invalid));
    assert.throws(()=>bodyCalibrationPlan(actor,view==='back-left'?'walk-left':'walk','happy',undefined,view));assert.throws(()=>candidate(actor,view,view==='back-left'?'walk':'walk-left'));
    for(const action of ['think','sit-left','sit-right','spear-thrust','hunt-aim','carry','head-turn'] as const)assert.throws(()=>candidate(actor,view,action));
  }
});

test('rear cloth keeps pinned belt, shared positive-area vertices, one own material and isolated SVG resources',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REAR_MOTION_VIEWS){const f=candidate(actor,view),c=registeredLocomotionBodyView(f.profile),b=registeredNativeCloth(f.profile,c),before=hash({f,c}),triangles=nativeClothTriangles(f.profile,c);assert.equal(triangles.length,12);for(const t of triangles)assert.ok(clothTriangleArea(t)>0);
    for(const angles of [{left:0,right:0},{left:18,right:-18},{left:-18,right:18}]){const state=nativeClothState(f.profile,c,angles),vertices=new Map<string,string>();for(const piece of state.pieces){assert.ok(piece.areaRatio>=.25-1e-9);piece.from.forEach((p,i)=>{const q=piece.target[i]!,key=p.x+','+p.y,value=JSON.stringify(q);if(vertices.has(key))assert.equal(value,vertices.get(key));else vertices.set(key,value);if(p.y===b.waist)assert.deepEqual(q,p);});}assert.equal(nativeClothMatrixError(f.profile,c,state.face,state.face,state.face,.5),0);}
    const art=bodyViewClothingSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png'),pair=['a-','b-'].map(p=>namespaceRigSvg(art.defs+art.torso,p)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(pair,/a-view-cloth-triangle-11/);assert.doesNotMatch(pair,/scale\(-1|url\(#view-|href="#view-/);assert.equal(hash({f,c}),before);
  }
});

test('rear forward walk/run retains planted stance soles, changing own hem/feet and deterministic random/reverse seeks',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REAR_MOTION_VIEWS)for(const gait of ['walk','run'] as const){const f=candidate(actor,view,(gait+(view==='back-left'?'-left':'')) as BodyAction),before=hash(f),times=[0,300,600,900,1200,1600,2000,2700,3600,4000],saved=times.map(t=>samplePerformance(f.plan,f.profile,t,silence));for(const i of [7,1,8,3,0,9,6,2,5,4])assert.deepEqual(samplePerformance(f.plan,f.profile,times[i]!,silence),saved[i]);assert.ok(new Set(saved.map(s=>JSON.stringify(s.feet))).size>2);assert.ok(new Set(saved.map(s=>s.face['view-cloth-triangle-11']?.attr?.transform)).size>1);
    for(let t=400;t<2000;t+=20){const a=samplePerformance(f.plan,f.profile,t,silence),b=samplePerformance(f.plan,f.profile,t+5,silence);for(const side of ['left','right'] as const)if(a.stance[side]&&b.stance[side]){assert.ok(Math.abs(a.feet[side].x-b.feet[side].x)<.01);assert.ok(Math.abs(a.feet[side].y-b.feet[side].y)<.01);}assert.doesNotMatch(JSON.stringify(a),/NaN|Infinity/);}assert.equal(hash(f),before);
  }
});

test('rear jump/crouch responds with existing body/arms while source head stays unchanged and no hidden face/chin/turn is granted',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REAR_MOTION_VIEWS){for(const action of ['jump','crouch'] as const){const f=candidate(actor,view,action),a=samplePerformance(f.plan,f.profile,0,silence),b=samplePerformance(f.plan,f.profile,1100,silence);assert.notDeepEqual(b.transforms.pelvis,a.transforms.pelvis);assert.equal(registeredBodyView(f.profile).sha256,rearClothBindings[actor][view].sha256);assert.doesNotMatch(bodyViewHeadSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png'),/view-eyes-source-mask|view-mouth-source-mask|view-expression-source-mask|view-secondary-/);}
    const f=candidate(actor,view);for(const patch of [{turns:[{startMs:300,endMs:1800,from:'left',to:'right'}]},{headTurns:[{startMs:300,endMs:1800,from:'front',to:'left'}]},{expressions:[{startMs:0,endMs:4000,mood:'angry'}]},{entryPosture:{pose:'seated',supportId:'log'}}])assert.throws(()=>validatePerformance({...f.plan,...patch} as typeof f.plan,f.profile));
    const point=candidate(actor,view,'point');assert.throws(()=>validatePerformance({...point.plan,gestures:point.plan.gestures.map(g=>({...g,sourceSpan:{id:'rear-original',startMs:g.startMs,endMs:g.endMs}}))},point.profile),/needs-view-gesture-phase|needs-basic-view-capability/);
  }
});

test('rear original body/cloth phase and happy clock survive continuous camera cuts and primary/supporting swaps',()=>{
  const f=pairedBoard(),before=hash(f.board);for(const actor of f.actors){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.bodyMotion,actor.performance.sourceBody);assert.deepEqual(clocks[0]!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);const a=samplePerformance(actor.performance,actor.profile,2000,silence,undefined,clocks[0]),b=samplePerformance(actor.performance,actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(a.face,b.face);assert.deepEqual(a.paths,b.paths);assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.feet,b.feet);}assert.equal(hash(f.board),before);
});

test('sibling missing/edited source or local motion invalidates rear original clock and publication identity',()=>{
  const f=pairedBoard(),narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:0,endMs:4000,text:'The two actors walk away.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);
  for(const change of ['missing','edited','local','view'] as const){const board=structuredClone(f.board),p=board.shots[1]!.cinematic!.performance;if(change==='missing')delete p.sourceBody;else if(change==='edited')p.sourceBody!.walks[0]!.toX-=1;else if(change==='local')p.walks=[{startMs:100,endMs:1800,fromX:800,toX:770}];else board.shots[1]!.cinematic!.actorScene!.primary!.appearance.bodyView='back-right';assert.throws(()=>actorViewActingClock(board,board.shots[1]!,'karo'));assert.throws(()=>assertRigSpeechPublicationBinding(board.shots[0]!,narration,board,binding));}
});

test('compiler/camera consume exact rear source; report/cache keep unaccepted production and audio state',()=>{
  const f=candidate('karo','back-left','walk-left'),compiled=compilePerformance(f.plan,f.profile,silence,'rear-'),bounds=cameraHostBounds(f.plan,f.profile);assert.match(compiled.js,/rear-view-cloth-triangle-11/);assert.equal(compiled.report.bodyMotion?.selection,REAR_BODY_LOCOMOTION_SELECTION);assert.equal(compiled.report.bodyMotion?.approved,false);assert.equal(compiled.report.bodyMotion?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);assert.doesNotMatch(JSON.stringify(bounds),/NaN|Infinity/);assert.ok(bounds.body.right>bounds.body.left);assert.ok(bounds.head.bottom>bounds.head.top);
  assert.equal(nativeClothDescription.ownRear.productionReady,false);assert.equal(nativeClothDescription.ownRear.productionRig,null);assert.deepEqual(nativeClothDescription.ownRear.availableBanks,[]);assert.equal(nativeClothDescription.ownRear.face,false);assert.equal(nativeClothDescription.ownRear.chinContact,false);assert.equal(nativeClothDescription.ownRear.continuousTurns,false);
});
