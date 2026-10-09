// DECLARED ONLY, NOT RUN. Human tester owns all runtime/geometry/video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {ShotSchema,type Shot,type Storyboard,type Narration} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../packages/animation/schemas.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../packages/animation/native-contact-arm.js';
import {SourceWorldSchema,type SourceWorld} from '../packages/director/source-world-schemas.js';
import {SOURCE_WORLD_VERSION} from '../packages/director/source-world-reference.js';
import {projectSourceWorldEvents,sourceWorldEvent,validateSourceWorld,sourceWorldIdentity} from '../packages/director/source-world.js';
import {sampleSourceWorldPhase} from '../packages/director/source-world-phase.js';
import {sourceWorldFrames,sourceWorldModelTimeline} from '../library/shots/source-world-timeline.js';
import {cinematicRelations} from '../library/shots/cinematic-models.js';
import {projectManipulationAction} from '../packages/director/source-manipulation-actions.js';
import {stageModels} from '../packages/director/models.js';
import {validatePropBindings} from '../packages/director/props.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';

/** Engineering data built exclusively within callbacks, not a prescribed film.
 * No geometry/render/API/TTS/media fixture is executed on module import. */
function fixture(contact=false){
  const raw=bodyCalibrationPlan('karo','carry','happy','right','three-quarter-right','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION,'rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION);
  const text='Karo carries the basket while the bowl changes from hot to cold and the contents move between them.';
  const ref={kind:'narration' as const,segmentId:'cue',quote:text},narration:Narration={mode:'script',durationMs:5000,segments:[{id:'cue',startMs:1000,endMs:5000,text}],words:[]};
  const character=ActorDefinitionSchema.parse({id:'karo-person',name:'Karo',role:'sourced forest actor',identity:'illustrative',kind:'stick-man',appearance:raw.profile.appearance,costume:[],sourceRefs:[ref]}),profile=actorProfile(character);
  const complete=structuredClone(raw.plan),prop=complete.props[0]!,g=complete.gestures[0]!;
  prop.id='basket-prop';g.id='basket-original-contact';g.propId=prop.id;
  const parts=[{id:'basket',label:'basket',kind:'object' as const,x:prop.origin.x/complete.stage.width,y:prop.origin.y/complete.stage.height,width:.07,height:.07,sourceRefs:[ref]},
    {id:'bowl',label:'bowl',kind:'object' as const,x:.75,y:.35,width:.08,height:.08,sourceRefs:[ref],states:[{value:'hot' as const,sourceRefs:[ref]},{value:'cold' as const,sourceRefs:[ref]}]}];
  const world:SourceWorld=SourceWorldSchema.parse({version:SOURCE_WORLD_VERSION,id:'forest-original-world',startMs:1000,endMs:5000,events:[
    {id:'reveal-basket',type:'reveal',targetId:'basket',startMs:1050,endMs:1100,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
    {id:'rotate-bowl',type:'part-motion',targetId:'bowl',startMs:1400,endMs:4200,narrationAnchor:'cue',contactRequired:false,motion:'rotate',sourceRefs:[ref]},
    {id:'pulse-basket',type:'part-motion',targetId:'basket',startMs:1600,endMs:3200,narrationAnchor:'cue',contactRequired:false,motion:'pulse',sourceRefs:[ref]},
    {id:'hot-bowl',type:'state',state:'hot',targetId:'bowl',startMs:1100,endMs:1500,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
    {id:'cold-bowl',type:'state',state:'cold',targetId:'bowl',startMs:2600,endMs:3000,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
    {id:'flow-contents',type:'flow',targetId:'basket',relationTo:'bowl',startMs:1800,endMs:4000,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
    ...(contact?[{id:'real-contact-response',type:'highlight',targetId:'basket',startMs:1000+g.contactMs!+1,endMs:Math.min(1000+g.endMs,1000+g.contactMs!+501),narrationAnchor:'cue',contactRequired:true,contactActorId:character.id,contactHands:[g.hand!],motion:'none',sourceRefs:[ref],contacts:[{actorId:character.id,sourceId:'basket-source',gestureId:g.id}]}]:[])
  ]});
  const intent={participants:[{id:character.id,name:character.name,role:character.role,identity:character.identity,sourceRefs:[ref]}],action:text,objective:'Show the actual original forest action and object events.',sourceRefs:[ref],acting:[{participantId:character.id,kind:'manipulation' as const,operation:'carry' as const,statement:text,sourceRefs:[ref],targetIds:['basket']}]};
  const cuts=[1000,2300,4100,5000],shots:Shot[]=[];
  for(let i=0;i<3;i++){
    const id='world-shot-'+i,startMs=cuts[i]!,endMs=cuts[i+1]!;
    const plan:PerformancePlan={...complete,id,leadCharacterId:character.id,profileHash:profile.profileHash,durationMs:endMs-startMs,props:[],gestures:[],walks:[],jumps:[],gazes:[],expressions:[],
      ...(contact?{sourceBody:{version:BODY_SOURCE_VERSION,id:'body-source',startMs:1000,endMs:5000,walks:complete.walks,jumps:complete.jumps??[]},sourceManipulation:{version:MANIPULATION_SOURCE_VERSION,id:'basket-source',startMs:1000,endMs:5000,props:complete.props,gestures:complete.gestures}}:{})};
    const actions=contact?[projectManipulationAction(plan,g.id,{shotStartMs:startMs,target:{modelId:'forest-model-'+i,partId:'basket',anchor:'center'},narrationAnchor:'cue'})]:[];
    const shot=ShotSchema.parse({id,startMs,endMs,beatIds:['beat'],sceneType:'character-scene',subject:text,characters:[character.id],visualDescription:text,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],host:{id:character.id,profileVersion:1,rigHash:'candidate-rig',presence:'beside-model',actions},visualization:{type:'summary',modelId:'forest-model-'+i,provenance:'visualization',fidelity:'conceptual',parts:structuredClone(parts),relations:[{from:'basket',to:'bowl',kind:'transfer',sourceRefs:[ref]}],events:projectSourceWorldEvents(world,startMs,endMs),sceneIntent:intent}});
    shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:character.id,motivation:text,attentionPartId:'basket',sourceRefs:[ref],setting:'forest',provenance:'illustration',models:stageModels(shot),sceneIntent:intent,propBindings:contact?[{propId:prop.id,ownerId:character.id,partId:'basket',role:'illustrative-model',sourceRefs:[ref]}]:[],actorScene:{primary:character,speakingSegmentIds:['cue'],continuity:i?'continuous':'cut',supporting:[]},performance:plan,sourceWorld:structuredClone(world),artDirection:{origin:'authored',brief:'Original world candidate, not approved animation.',useEnvironment:false,palette:{background:'#71CFF0',surface:'#DB9B4D',ink:'#2B1710',accent:'#F97316'},showHeading:false,layers:[],models:parts.map(p=>({partId:p.id,sourceRefs:[ref],svg:'<g class="motion"><path d="M-16 -10H16L12 10H-12Z" fill="#AE6E31"/></g>',labelMode:'none',controlMode:'none'}))},continuity:{entry:plan.root,exit:plan.root,facing:plan.facing!,carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:complete.stage.width/2,y:220},startScale:1,endScale:1,designIntent:'Show one original world through camera slices.'}};
    shots.push(shot);
  }
  return {board:{shots} satisfies Storyboard,narration,world,parts,profile};
}

test('exact complete world projections preserve originals, identity and narration through camera slices',()=>{
  const f=fixture(),before=hash(f);
  for(const shot of f.board.shots){validateSourceWorld(shot,f.board,f.narration);for(const event of shot.visualization!.events)assert.equal(sourceWorldEvent(shot,event).id,event.sourceWorld!.eventId);}
  assert.equal(hash(f),before);
});
test('source effect entry equals previous exit without restarting rotation, pulse, reveal, flow or thermal history',()=>{
  const f=fixture(),before=hash(f);
  for(let i=1;i<3;i++){
    const previous=f.board.shots[i-1]!,next=f.board.shots[i]!,a=sourceWorldFrames(previous).at(-1)!,b=sourceWorldFrames(next)[0]!;
    assert.deepEqual(a.phase,b.phase);assert.deepEqual(b.phase,sampleSourceWorldPhase(f.world,f.parts,next.cinematic!.performance.stage.width,next.startMs));
  }
  const entry=sourceWorldFrames(f.board.shots[2]!)[0]!.phase.models;
  assert.ok(entry.bowl!.rotation>100);assert.equal(entry.bowl!.coldCoat,.62);assert.equal(entry.bowl!.hotCoat,0);assert.equal(entry.basket!.visible,1);assert.equal(hash(f),before);
});
test('original flow progress and response energy survive a cut inside the particle travel and after arrival',()=>{
  const f=fixture(),at=sampleSourceWorldPhase(f.world,f.parts,640,2300),later=sampleSourceWorldPhase(f.world,f.parts,640,3500);
  assert.ok(at.flows['flow-contents']!>0&&at.flows['flow-contents']!<1);assert.equal(later.flows['flow-contents'],null);assert.ok(later.models.bowl!.energy>0);
  assert.equal(sampleSourceWorldPhase(f.world,f.parts,640,5000).models.bowl!.energy,0);
});
test('generated world tracks initialize true phase at zero and never emit negative scene times or a local effect restart',()=>{
  const f=fixture(),shot=f.board.shots[1]!,frames=sourceWorldFrames(shot),before=hash(f);
  const calls=[...sourceWorldModelTimeline(shot,frames),...cinematicRelations(shot,shot.cinematic!.performance.stage.width,440,undefined,frames).calls];
  assert.ok(calls.some(s=>s.includes('rotation')&&s.includes('immediateRender')));
  for(const s of calls)for(const match of s.matchAll(/,(-?\d+(?:\.\d+)?)\);/g))assert.ok(Number(match[1])>=0);
  assert.equal(hash(f),before);
});
test('missing source/camera slice, changed model/art/relation/evidence or altered projection cannot pass complete original world validation',()=>{
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{f.board.shots.splice(1,1);},f=>{delete f.board.shots[1]!.cinematic!.sourceWorld;},
    f=>{f.board.shots[1]!.visualization!.parts[1]!.width+=.01;},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models[1]!.svg='<g class="motion"><circle r="10"/></g>';},
    f=>{f.board.shots[1]!.visualization!.relations=[];},f=>{f.board.shots[1]!.visualization!.events[0]!.startMs+=1;},
    f=>{f.narration.segments[0]!.text='Unrelated narration.';},f=>{f.narration.segments[0]!.endMs=3000;}
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>validateSourceWorld(f.board.shots[0]!,f.board,f.narration));}
  const f=fixture();assert.throws(()=>validateSourceWorld(f.board.shots[0]!,undefined,f.narration));assert.throws(()=>projectSourceWorldEvents(f.world,900,2000));
});
test('source reaction requires the actual original contact person, source, hand, cue and time, not a contact invented at the cut',()=>{
  const valid=fixture(true);for(const shot of valid.board.shots)validateSourceWorld(shot,valid.board,valid.narration);
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{for(const s of f.board.shots)s.cinematic!.sourceWorld!.events.at(-1)!.startMs=1000+s.cinematic!.performance.sourceManipulation!.gestures[0]!.contactMs!;},
    f=>{for(const s of f.board.shots)s.cinematic!.sourceWorld!.events.at(-1)!.contacts![0]!.sourceId='wrong-source';},
    f=>{for(const s of f.board.shots)s.cinematic!.sourceWorld!.events.at(-1)!.contactActorId='wrong-person';},
    f=>{for(const s of f.board.shots)s.cinematic!.sourceWorld!.events.at(-1)!.contactHands=['left'];},
    f=>{f.board.shots[1]!.host!.actions[0]!.target!.partId='bowl';}
  ];
  for(const mutate of mutations){const f=fixture(true);mutate(f);for(const s of f.board.shots)s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);assert.throws(()=>validateSourceWorld(f.board.shots[0]!,f.board,f.narration));}
});
test('sibling source world/model edit invalidates visual/publication identity while narration bytes are preserved',()=>{
  const f=fixture(),shot=f.board.shots[0]!,voice=hash(f.narration),original=sourceWorldIdentity(shot,f.board,f.narration)!,binding=rigSpeechPublicationBinding(shot,f.narration,f.board);
  const changed=structuredClone(f.board);changed.shots[2]!.visualization!.parts[1]!.width+=.01;
  assert.notEqual(sourceWorldIdentity(shot,changed,f.narration)!.fingerprint,original.fingerprint);
  assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,changed,binding));assert.equal(hash(f.narration),voice);assert.equal(original.approved,false);
});
test('source world cannot alone bypass pending interaction/action groups/coverage production or overlapping property ownership',()=>{
  const f=fixture(true),shot=f.board.shots[0]!;
  assert.throws(()=>validatePropBindings(shot,f.board,f.narration),/needs-source-prop-binding/);
  const duplicate=structuredClone(f.world);duplicate.events.push({...duplicate.events.find(e=>e.id==='rotate-bowl')!,id:'second-rotation'});
  for(const s of f.board.shots){s.cinematic!.sourceWorld=duplicate;s.visualization!.events=projectSourceWorldEvents(duplicate,s.startMs,s.endMs);}
  assert.throws(()=>validateSourceWorld(shot,f.board,f.narration),/same model property/);
});
