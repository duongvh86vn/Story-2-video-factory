// DECLARED / NOT RUN. All fixtures/schema/geometry/sampling/compiler/camera
// calls below are user QA, inside callbacks or uninvoked fixture functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {FRONT_BODY_SECONDARY_SELECTION,frontSecondaryBindings} from '../packages/animation/body-view-front-secondary-binding.js';
import {BASIC_BODY_EYES_SELECTION,bodyViewBasicEyesRegistration} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION,bodyViewBasicMouthRegistration} from '../packages/animation/body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION,bodyViewBasicExpressionRegistration} from '../packages/animation/body-view-basic-expression-registration.js';
import {registeredBodyView,registeredSecondaryBodyView,registeredDetailedBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_SECONDARY_SELECTION,registeredNativeSecondary,nativeSecondaryPieces,nativeSecondaryState,nativeSecondaryBounds,nativeSecondaryMatrixError,nativeSecondaryDescription} from '../packages/animation/body-view-secondary.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {bodyCalibrationPlan,BODY_SECONDARY_MODES,type BodyAction} from '../packages/topics/body-workbench.js';
import {samplePerformance,compilePerformance,validatePerformance} from '../packages/animation/compiler.js';
import {BODY_SOURCE_VERSION} from '../packages/animation/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {cameraHostBounds} from '../packages/director/camera.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,'front','cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION,'rigid',FRONT_BODY_SECONDARY_SELECTION);
const stripSecondary=(face:Record<string,unknown>)=>Object.fromEntries(Object.entries(face).filter(([id])=>!id.startsWith('view-secondary-')));
function pairedBoard(){
  const actors=(['lila','karo'] as const).map((actor,i)=>{const f=candidate(actor),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character);return {character,profile,performance:{...f.plan,profileHash:profile.profileHash,stage:{width:1280,height:720,groundY:500},root:{x:i?800:300,y:500},durationMs:2000}};});
  const shots=[0,2000].map((startMs,i)=>{const cast=actors.map(a=>({character:a.character,performance:{...a.performance,id:'front-cut-'+i+'-'+a.character.id,expressions:i?[{startMs:0,endMs:1000,mood:'laughing' as const},{startMs:1000,endMs:2000,mood:'happy' as const}]:[{startMs:0,endMs:1000,mood:'happy' as const},{startMs:1000,endMs:2000,mood:'laughing' as const}]},actions:[],speakingSegmentIds:[]}));return {id:'front-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:[],supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  return {actors,shots,board:{shots} as Storyboard};
}

test('front secondary binds two own PNG/SHA/canvas sources and protects own face/tie/neck source cues',()=>{
  assert.ok(BODY_SECONDARY_MODES.includes(FRONT_BODY_SECONDARY_SELECTION));
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),c=registeredSecondaryBodyView(f.profile),b=frontSecondaryBindings[actor].front,bytes=readFileSync(b.file);assert.equal(hash(bytes),b.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[b.width,b.height]);assert.equal(c.file,b.file);assert.equal(registeredNativeSecondary(f.profile,c),b);assert.throws(()=>registeredDetailedBodyView(f.profile));
    const eyes=bodyViewBasicEyesRegistration[actor].front,mouth=bodyViewBasicMouthRegistration[actor].front,brows=bodyViewBasicExpressionRegistration[actor].front,boxes=[...eyes.eyes.flatMap(e=>[e.bounds,e.strip]),mouth.bounds,mouth.strip,...brows.brows.flatMap(e=>[e.bounds,e.strip]),b.protectedNeck,...(b.hairTie?[b.hairTie]:[])];for(const r of b.regions)for(const box of boxes)assert.ok(r.right<=box.x||r.left>=box.x+box.width||r.bottom<=box.y||r.top>=box.y+box.height,actor+'/'+r.id);
  }
});

test('front source/mode/view/actor mismatches and unsupported motion/tool/head/crowd capabilities stay closed',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),c=registeredSecondaryBodyView(f.profile);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));for(const patch of [{sha256:'0'.repeat(64)},{width:c.width+1},{height:c.height+1},{view:'left'}])assert.throws(()=>registeredNativeSecondary(f.profile,{...c,...patch} as typeof c));
    for(const bodyView of ['left','right','back-left','back-right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredSecondaryBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    for(const bodySecondary of [undefined,null,false,BODY_VIEW_SECONDARY_SELECTION,'registered-profile-secondary-v1']){const raw={...f.profile,appearance:{...f.profile.appearance,bodySecondary}} as unknown as HostProfile;assert.throws(()=>registeredSecondaryBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    for(const option of ['bodyMotion','bodySeat','bodyManipulation','supportingModel','bodyHeadBank','sourceColour']){const raw={...f.profile,appearance:{...f.profile.appearance,[option]:'selected'}} as unknown as HostProfile;assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    for(const action of ['walk','walk-left','run','jump','crouch','carry','sit-right','spear-thrust','head-turn'] as BodyAction[])assert.throws(()=>candidate(actor,action));
    assert.throws(()=>validatePerformance({...f.plan,sourceBody:{version:BODY_SOURCE_VERSION,id:'illegal-front-source',startMs:0,endMs:4000,walks:[]}},f.profile));
    const wrong={...f.profile,appearance:{...f.profile.appearance,characterVariant:'other'}} as unknown as HostProfile;assert.throws(()=>registeredNativeSecondary(wrong,c));assert.throws(()=>registeredSecondaryBodyView(wrong));
  }
});

test('same face erase masks and own beard UV contour partition static/moving source without raw neck replacement',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),svg=bodyViewHeadSvg(f.profile,(_file,sha)=>'assets/rigs/'+sha+'.png');assert.match(svg,/<g id="view-secondary-source"><g mask="url\(#view-expression-source-mask\)"><g mask="url\(#view-mouth-source-mask\)"><image[^>]+mask="url\(#view-eyes-source-mask\)"/);assert.equal((svg.match(/href="#view-secondary-source"/g)??[]).length,25);assert.doesNotMatch(svg,/<image id="view-secondary-source"|scale\(-1/);const pair=['a-','b-'].map(p=>namespaceRigSvg(svg,p)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.doesNotMatch(pair,/url\(#view-|href="#view-/);if(actor==='karo')assert.equal(svg.split(frontSecondaryBindings.karo.front.regions[1].sourceClip).length-1,2);}
});

test('own front texture mesh pins attachment/side seams and retains shared positive-area finite bounded vertices',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),c=registeredSecondaryBodyView(f.profile),pieces=nativeSecondaryPieces(f.profile,c);assert.equal(pieces.length,24);for(const control of [{x:0,y:0,angle:0},{x:32,y:0,angle:8},{x:-32,y:0,angle:-8},{x:0,y:32,angle:8}]){const state=nativeSecondaryState(f.profile,c,control),vertices=new Map<string,string>();for(const p of state.pieces){const r=pieces.find(v=>v.id===p.id)!.region;assert.ok(p.areaRatio>=.4-1e-9);p.from.forEach((point,i)=>{const q=p.target[i]!,key=r.id+':'+point.x+','+point.y,value=JSON.stringify(q);if(vertices.has(key))assert.equal(value,vertices.get(key));else vertices.set(key,value);if(point.x===r.left||point.x===r.right||point.y===(r.pin==='top'?r.top:r.bottom))assert.deepEqual(q,point);assert.ok(Math.hypot(q.x-point.x,q.y-point.y)<=r.maxDisplacement+1e-9);});}}for(const control of [{x:NaN,y:0,angle:0},{x:33,y:0,angle:0},{x:0,y:0,angle:9}])assert.throws(()=>nativeSecondaryState(f.profile,c,control));}
});

test('random/reverse front sampling changes secondary while physical body/contact/feet and face state stay identical',()=>{
  for(const actor of ['lila','karo'] as const)for(const action of ['rest','point','think'] as BodyAction[]){const f=candidate(actor,action),rigid=structuredClone(f.profile);delete rigid.appearance.bodySecondary;const before=hash(f),seen=new Set<string>();for(const t of [4000,0,800,1175,2200,0,3500]){const a=samplePerformance(f.plan,f.profile,t,silence),b=samplePerformance(f.plan,rigid,t,silence);assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.hands,b.hands);assert.deepEqual(a.feet,b.feet);assert.deepEqual(stripSecondary(a.face),b.face);assert.deepEqual(a,samplePerformance(f.plan,f.profile,t,silence));seen.add(JSON.stringify(Object.entries(a.face).filter(([id])=>id.startsWith('view-secondary-'))));assert.doesNotMatch(JSON.stringify(a),/NaN|Infinity/);}assert.ok(seen.size>1);assert.equal(hash(f),before);}
});

test('camera and baked interpolation use exact own front secondary vertices and conservative bounds',()=>{
  for(const actor of ['lila','karo'] as const){const f=candidate(actor),c=registeredSecondaryBodyView(f.profile),state=nativeSecondaryState(f.profile,c,{x:20,y:0,angle:6}),bounds=nativeSecondaryBounds(f.profile,c,state.face);for(const p of state.pieces.flatMap(p=>p.target)){assert.ok(p.x>=bounds.left-1e-4&&p.x<=bounds.right+1e-4);assert.ok(p.y>=bounds.top-1e-4&&p.y<=bounds.bottom+1e-4);}assert.equal(nativeSecondaryMatrixError(f.profile,c,state.face,state.face,state.face,.5),0);assert.throws(()=>nativeSecondaryBounds(f.profile,c,{}));const camera=cameraHostBounds(f.plan,f.profile);assert.doesNotMatch(JSON.stringify(camera),/NaN|Infinity/);assert.ok(camera.head.right>camera.head.left);assert.ok(camera.head.bottom>camera.head.top);}
});

test('original expressive/secondary clock survives continuous cuts and role swaps; secondary alone retains original happy',()=>{
  const f=pairedBoard(),before=hash(f.board);for(const actor of f.actors){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.expressions,[{startMs:0,endMs:1000,mood:'happy'},{startMs:1000,endMs:3000,mood:'laughing'},{startMs:3000,endMs:4000,mood:'happy'}]);const local=(s:Shot)=>s.cinematic!.actorScene!.primary!.id===actor.character.id?s.cinematic!.performance:s.cinematic!.actorScene!.supporting.find(a=>a.character.id===actor.character.id)!.performance;const a=samplePerformance(local(f.shots[0]!),actor.profile,2000,silence,undefined,clocks[0]),b=samplePerformance(local(f.shots[1]!),actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(a.face,b.face);assert.deepEqual(a.transforms,b.transforms);}
  const plain=structuredClone(f.board);for(const s of plain.shots){for(const a of [s.cinematic!.actorScene!.primary!,...s.cinematic!.actorScene!.supporting.map(a=>a.character)]){delete a.appearance.bodyEyes;delete a.appearance.bodySpeech;delete a.appearance.bodyExpressions;}for(const p of [s.cinematic!.performance,...s.cinematic!.actorScene!.supporting.map(a=>a.performance)])p.expressions=[{startMs:0,endMs:2000,mood:'happy'}];}assert.deepEqual(actorViewActingClock(plain,plain.shots[0]!,'lila')!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);assert.equal(hash(f.board),before);
});

test('report/cache preserve exact front selection and sibling identity guard without art/motion/audio/final approval',()=>{
  const f=pairedBoard(),narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:0,endMs:4000,text:'The two actors laugh.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);for(const change of ['mode','view','expression'] as const){const board=structuredClone(f.board),primary=board.shots[1]!.cinematic!.actorScene!.primary!;if(change==='mode')delete primary.appearance.bodySecondary;else if(change==='view')primary.appearance.bodyView='right';else board.shots[1]!.cinematic!.performance.expressions[0]!.mood='angry';assert.throws(()=>assertRigSpeechPublicationBinding(board.shots[0]!,narration,board,binding));}
  const c=candidate('karo'),compiled=compilePerformance(c.plan,c.profile,silence,'front-');assert.match(compiled.js,/front-view-secondary-crest-11/);assert.equal(compiled.report.bodySecondary?.selection,FRONT_BODY_SECONDARY_SELECTION);assert.equal(compiled.report.bodySecondary?.approved,false);assert.equal(compiled.report.bodySecondary?.motionVerified,false);assert.equal(compiled.report.bodySecondary?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);assert.equal(nativeSecondaryDescription.ownFront.productionReady,false);assert.equal(nativeSecondaryDescription.ownFront.productionRig,null);assert.deepEqual(nativeSecondaryDescription.ownFront.availableBanks,[]);
});
