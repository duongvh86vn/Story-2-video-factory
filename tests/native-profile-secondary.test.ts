// DECLARED / NOT RUN. Fixtures, schemas, geometry, sampling, camera and
// compiler calls below belong to user QA and remain inside test callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema,type HostProfile} from '../packages/host/schemas.js';
import {PROFILE_BODY_SECONDARY_SELECTION,PROFILE_SECONDARY_VIEWS,profileSecondaryBindings} from '../packages/animation/body-view-profile-secondary-binding.js';
import {PROFILE_BODY_LOCOMOTION_SELECTION} from '../packages/animation/body-view-profile-cloth-binding.js';
import {BASIC_BODY_EYES_SELECTION,bodyViewBasicEyesRegistration} from '../packages/animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION,bodyViewBasicMouthRegistration} from '../packages/animation/body-view-basic-mouth-registration.js';
import {BASIC_BODY_EXPRESSIONS_SELECTION,bodyViewBasicExpressionRegistration} from '../packages/animation/body-view-basic-expression-registration.js';
import {registeredSecondaryBodyView,registeredDetailedBodyView,bodyViewHeadSvg} from '../packages/animation/body-view-art.js';
import {BODY_VIEW_SECONDARY_SELECTION,registeredNativeSecondary,nativeSecondaryPieces,nativeSecondaryState,nativeSecondaryBounds,nativeSecondaryMatrixError,nativeSecondaryDescription} from '../packages/animation/body-view-secondary.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {bodyCalibrationPlan,BODY_SECONDARY_MODES,type BodyAction} from '../packages/topics/body-workbench.js';
import {samplePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {BODY_SOURCE_VERSION} from '../packages/animation/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {cameraHostBounds} from '../packages/director/camera.js';
import type {Shot,Storyboard,Narration} from '../packages/core/schemas.js';
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const candidate=(actor:'lila'|'karo',view:'left'|'right',action:BodyAction='rest')=>bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout',BASIC_BODY_SPEECH_SELECTION,BASIC_BODY_EYES_SELECTION,'rest',BASIC_BODY_EXPRESSIONS_SELECTION,PROFILE_BODY_LOCOMOTION_SELECTION,PROFILE_BODY_SECONDARY_SELECTION);
const stripSecondary=(face:Record<string,unknown>)=>Object.fromEntries(Object.entries(face).filter(([id])=>!id.startsWith('view-secondary-')));
function pairedBoard(){
  const actors=(['lila','karo'] as const).map((actor,i)=>{
    const f=candidate(actor,i?'left':'right'),character=ActorDefinitionSchema.parse({id:actor,name:actor,kind:'stick-man',role:'story actor',identity:'fictional',appearance:f.profile.appearance,sourceRefs:[{kind:'narration',segmentId:'line',quote:actor}]}),profile=actorProfile(character),root={x:i?800:300,y:500};
    return {character,profile,performance:{...f.plan,profileHash:profile.profileHash,stage:{width:1280,height:720,groundY:500},root,durationMs:2000,expressions:[{startMs:0,endMs:2000,mood:'happy' as const}],sourceBody:{version:BODY_SOURCE_VERSION,id:'secondary-original-'+actor,startMs:0,endMs:4000,walks:[{startMs:300,endMs:3400,fromX:root.x,toX:root.x+(i?-60:60)}]}}};
  });
  const shots=[0,2000].map((startMs,i)=>{const cast=actors.map(a=>({character:a.character,performance:{...a.performance,id:'secondary-cut-'+i+'-'+a.character.id},actions:[],speakingSegmentIds:[]}));return {id:'secondary-cut-'+i,startMs,endMs:startMs+2000,narrationSegmentIds:['line'],cinematic:{performance:cast[i]!.performance,actorScene:{primary:cast[i]!.character,speakingSegmentIds:[],supporting:[cast[1-i]!],continuity:i?'continuous':'cut'}}} as unknown as Shot;});
  return {actors,shots,board:{shots} as Storyboard};
}

test('four own secondary sources bind exact original PNG bytes/canvas and exclude own face, neck and hair ties',()=>{
  assert.ok(BODY_SECONDARY_MODES.includes(PROFILE_BODY_SECONDARY_SELECTION));
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS){
    const {profile}=candidate(actor,view),c=registeredSecondaryBodyView(profile),b=profileSecondaryBindings[actor][view],bytes=readFileSync(b.file);
    assert.equal(hash(bytes),b.sha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[b.width,b.height]);assert.equal(c.file,b.file);assert.equal(registeredNativeSecondary(profile,c),b);assert.throws(()=>registeredDetailedBodyView(profile));
    const eyes=bodyViewBasicEyesRegistration[actor][view],mouth=bodyViewBasicMouthRegistration[actor][view],brows=bodyViewBasicExpressionRegistration[actor][view];
    const boxes=[...eyes.eyes.flatMap(e=>[e.bounds,e.strip]),mouth.bounds,mouth.strip,...brows.brows.flatMap(e=>[e.bounds,e.strip]),{x:c.neck.x-24,y:c.neck.y-24,width:48,height:48},...(b.hairTie?[b.hairTie]:[])];
    for(const r of b.regions)for(const box of boxes)assert.ok(r.right<=box.x||r.left>=box.x+box.width||r.bottom<=box.y||r.top>=box.y+box.height,actor+'/'+view+'/'+r.id);
  }
});

test('wrong source/mode/view/actor and unavailable features cannot grant profile secondary or physical source ownership',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS){
    const f=candidate(actor,view),c=registeredSecondaryBodyView(f.profile);assert.doesNotThrow(()=>HostProfileSchema.parse(f.profile));
    for(const patch of [{sha256:'0'.repeat(64)},{width:c.width+1},{height:c.height+1},{view:view==='left'?'right':'left'}])assert.throws(()=>registeredNativeSecondary(f.profile,{...c,...patch} as typeof c));
    for(const bodyView of ['front','back-left','back-right','three-quarter-left','three-quarter-right'] as const){const raw={...f.profile,appearance:{...f.profile.appearance,bodyView}};assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredSecondaryBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    for(const bodySecondary of [undefined,null,false,BODY_VIEW_SECONDARY_SELECTION]){const raw={...f.profile,appearance:{...f.profile.appearance,bodySecondary}} as unknown as HostProfile;assert.throws(()=>registeredSecondaryBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    for(const option of ['bodySeat','bodyManipulation','supportingModel','bodyHeadBank','sourceColour']){const raw={...f.profile,appearance:{...f.profile.appearance,[option]:'selected'}} as unknown as HostProfile;assert.throws(()=>HostProfileSchema.parse(raw));assert.throws(()=>registeredSecondaryBodyView(raw));assert.throws(()=>registeredNativeSecondary(raw,c));}
    const wrong={...f.profile,appearance:{...f.profile.appearance,characterVariant:'other'}} as unknown as HostProfile;assert.throws(()=>registeredSecondaryBodyView(wrong));assert.throws(()=>registeredNativeSecondary(wrong,c));
    assert.throws(()=>bodyCalibrationPlan(actor,view==='left'?'walk-left':'walk','happy',undefined,view,'cutout','silent','native','rest','native','rigid',PROFILE_BODY_SECONDARY_SELECTION));
  }
});

test('static and moving own source share face erase masks, replacement layers and independent SVG namespaces',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS){
    const {profile}=candidate(actor,view),svg=bodyViewHeadSvg(profile,(_file,sha)=>'assets/rigs/'+sha+'.png');
    assert.match(svg,/<g id="view-secondary-source"><g mask="url\(#view-expression-source-mask\)"><g mask="url\(#view-mouth-source-mask\)"><image[^>]+mask="url\(#view-eyes-source-mask\)"/);
    assert.equal((svg.match(/href="#view-secondary-source"/g)??[]).length,25);assert.doesNotMatch(svg,/<image id="view-secondary-source"|scale\(-1/);
    const pair=['a-','b-'].map(prefix=>namespaceRigSvg(svg,prefix)).join(''),ids=[...pair.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.doesNotMatch(pair,/url\(#view-|href="#view-/);
  }
});

test('profile secondary mesh has shared vertices, pinned attachment/side seams, finite bounded displacement and positive area',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS){
    const {profile}=candidate(actor,view),c=registeredSecondaryBodyView(profile),pieces=nativeSecondaryPieces(profile,c);assert.equal(pieces.length,24);
    for(const control of [{x:0,y:0,angle:0},{x:32,y:0,angle:8},{x:-32,y:0,angle:-8},{x:0,y:32,angle:8}]){
      const state=nativeSecondaryState(profile,c,control),vertices=new Map<string,string>();
      for(const piece of state.pieces){const r=pieces.find(p=>p.id===piece.id)!.region;assert.ok(piece.areaRatio>=.4-1e-9);piece.from.forEach((p,i)=>{const q=piece.target[i]!,key=r.id+':'+p.x+','+p.y,value=JSON.stringify(q);if(vertices.has(key))assert.equal(value,vertices.get(key));else vertices.set(key,value);if(p.x===r.left||p.x===r.right||p.y===(r.pin==='top'?r.top:r.bottom))assert.deepEqual(q,p);assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<=r.maxDisplacement+1e-9);});}
    }
    for(const control of [{x:NaN,y:0,angle:0},{x:33,y:0,angle:0},{x:0,y:0,angle:9}])assert.throws(()=>nativeSecondaryState(profile,c,control));
  }
});

test('random/reverse sampling preserves rigid body, feet, contact and face state while secondary changes with original head history',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS)for(const action of [view==='left'?'walk-left':'walk','jump'] as BodyAction[]){
    const f=candidate(actor,view,action),rigid=structuredClone(f.profile);delete rigid.appearance.bodySecondary;const before=hash(f),seen=new Set<string>();
    for(const t of [4000,0,800,1175,2200,0,3500]){const a=samplePerformance(f.plan,f.profile,t,silence),b=samplePerformance(f.plan,rigid,t,silence);assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.hands,b.hands);assert.deepEqual(a.feet,b.feet);assert.deepEqual(stripSecondary(a.face),b.face);assert.deepEqual(a,samplePerformance(f.plan,f.profile,t,silence));seen.add(JSON.stringify(Object.entries(a.face).filter(([id])=>id.startsWith('view-secondary-'))));assert.doesNotMatch(JSON.stringify(a),/NaN|Infinity/);}
    assert.ok(seen.size>1);assert.equal(hash(f),before);
  }
});

test('camera bounds include transformed own hair/beard vertices and interpolation validates the same source mesh',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of PROFILE_SECONDARY_VIEWS){
    const f=candidate(actor,view,view==='left'?'run-left':'run'),c=registeredSecondaryBodyView(f.profile),state=nativeSecondaryState(f.profile,c,{x:20,y:0,angle:6}),bounds=nativeSecondaryBounds(f.profile,c,state.face);
    for(const p of state.pieces.flatMap(p=>p.target)){assert.ok(p.x>=bounds.left-1e-4&&p.x<=bounds.right+1e-4);assert.ok(p.y>=bounds.top-1e-4&&p.y<=bounds.bottom+1e-4);}
    assert.equal(nativeSecondaryMatrixError(f.profile,c,state.face,state.face,state.face,.5),0);assert.throws(()=>nativeSecondaryBounds(f.profile,c,{}));
    const camera=cameraHostBounds(f.plan,f.profile),frame=samplePerformance(f.plan,f.profile,0,silence),match=/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\)$/.exec(frame.transforms.head!)!;
    const x=Number(match[1]),y=Number(match[2]),angle=Number(match[3])*Math.PI/180,scale=Number(match[4])*c.headScale;
    for(const piece of nativeSecondaryState(f.profile,c,{x:0,y:0,angle:0}).pieces)for(const p of piece.target){const dx=(p.x-c.neck.x)*scale,dy=(p.y-c.neck.y)*scale,px=x+dx*Math.cos(angle)-dy*Math.sin(angle),py=y+dx*Math.sin(angle)+dy*Math.cos(angle);assert.ok(px>=camera.head.left-1e-3&&px<=camera.head.right+1e-3);assert.ok(py>=camera.head.top-1e-3&&py<=camera.head.bottom+1e-3);}
  }
});

test('continuous camera/role swaps retain complete original body/secondary phase and happy clock without face features',()=>{
  const f=pairedBoard(),before=hash(f.board);
  for(const actor of f.actors){const clocks=f.shots.map(s=>actorViewActingClock(f.board,s,actor.character.id)!);assert.equal(clocks[0]!.sourceIdentityHash,clocks[1]!.sourceIdentityHash);assert.deepEqual(clocks[0]!.bodyMotion,actor.performance.sourceBody);
    const a=samplePerformance(actor.performance,actor.profile,2000,silence,undefined,clocks[0]),b=samplePerformance(actor.performance,actor.profile,0,silence,undefined,clocks[1]);assert.deepEqual(a.face,b.face);assert.deepEqual(a.transforms,b.transforms);assert.deepEqual(a.feet,b.feet);
  }
  const plain=structuredClone(f.board);for(const s of plain.shots)for(const actor of [s.cinematic!.actorScene!.primary!,...s.cinematic!.actorScene!.supporting.map(a=>a.character)]){delete actor.appearance.bodyEyes;delete actor.appearance.bodySpeech;delete actor.appearance.bodyExpressions;delete actor.appearance.bodyMotion;}
  for(const s of plain.shots)for(const p of [s.cinematic!.performance,...s.cinematic!.actorScene!.supporting.map(a=>a.performance)])delete p.sourceBody;
  assert.deepEqual(actorViewActingClock(plain,plain.shots[0]!,'lila')!.expressions,[{startMs:0,endMs:4000,mood:'happy'}]);assert.equal(hash(f.board),before);
});

test('exact report selection/cache binding and sibling source changes remain guarded; no final/art/audio approval',()=>{
  const f=pairedBoard(),narration:Narration={mode:'wav',durationMs:4000,words:[],segments:[{id:'line',startMs:0,endMs:4000,text:'The two actors walk.'}]},binding=rigSpeechPublicationBinding(f.shots[0]!,narration,f.board);
  for(const change of ['missing','edited','mode'] as const){const board=structuredClone(f.board),p=board.shots[1]!.cinematic!.performance;if(change==='missing')delete p.sourceBody;else if(change==='edited')p.sourceBody!.walks[0]!.toX-=1;else delete board.shots[1]!.cinematic!.actorScene!.primary!.appearance.bodySecondary;assert.throws(()=>assertRigSpeechPublicationBinding(board.shots[0]!,narration,board,binding));}
  const c=candidate('karo','left','walk-left'),compiled=compilePerformance(c.plan,c.profile,silence,'own-');assert.match(compiled.js,/own-view-secondary-crest-11/);assert.equal(compiled.report.bodySecondary?.selection,PROFILE_BODY_SECONDARY_SELECTION);assert.equal(compiled.report.bodySecondary?.approved,false);assert.equal(compiled.report.bodySecondary?.motionVerified,false);assert.equal(compiled.report.bodySecondary?.audioVerified,false);assert.equal(compiled.report.phonemeLipSync,false);assert.ok(compiled.report.maxInterpolationGapPx<=.2);
  assert.equal(nativeSecondaryDescription.ownProfile.productionReady,false);assert.equal(nativeSecondaryDescription.ownProfile.productionRig,null);assert.deepEqual(nativeSecondaryDescription.ownProfile.availableBanks,[]);
});
