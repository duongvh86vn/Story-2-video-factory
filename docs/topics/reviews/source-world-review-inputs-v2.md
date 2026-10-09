# Frozen source0.69 renderer/cache/guard wiring

Source data only. No tests/callbacks/fixtures/schema-instance geometry/pose samples/browser/server/API production pipeline/TTS/ASR/render/audio/video executed. Original world event/phase candidate does NOT remove needs-source-prop-binding for native original manipulation. Source action groups, interaction geometry, fixed operate targets, acting coverage, API lead swaps and runtime/film acceptance remain pending. Motion x retains the renderer glyph-coordinate contract; no physical root motion or optical displacement acceptance is inferred. Actor clock collector owns complete original head/body/manipulation; rigHand defaults right, never throws. No principal/supporting PNG, approval or production rig changed.

## library/shots/cinematic-models.ts:104-126
Full file SHA256 6087194292ab1c024920d34883973b2169fc4b1ca8c9d08704cfcb1fe92a213a

~~~ts
    if(!['transfer','cause'].includes(r.kind))continue;
    if(shot.cinematic?.sourceWorld){
      if(!worldFrames?.length)throw new Error(`${shot.id}: needs-source-prop-binding: relation lacks the original world frame clock`);
      const originals=shot.cinematic.sourceWorld.events.filter(e=>e.type==='flow'&&e.targetId===r.from&&e.relationTo===r.to).sort((a,b)=>a.startMs-b.startMs);
      if(originals.length){
        const flow=(frame:SourceWorldFrame)=>originals.find(e=>frame.phase.flows[e.id]!=null)??originals.filter(e=>e.startMs<=frame.phase.globalMs).at(-1)??originals[0]!;
        calls.push(...sourceWorldTrack(worldFrames,`${scope} #relation-flow-${i}`,frame=>({opacity:originals.some(e=>frame.phase.flows[e.id]!=null)?1:0}),true));
        calls.push(...sourceWorldTrack(worldFrames,`${scope} #relation-flow-${i}`,frame=>{
          const original=flow(frame),split=original.startMs+(original.endMs-original.startMs)*.55;
          const progress=frame.phase.flows[original.id]??(frame.phase.globalMs>=split?1:0),pos=curvePoint(geometryAt(a,b,frame.timeMs),progress);
          return {attr:{transform:`translate(${pos.x} ${pos.y})`}};
        }));
      }
      continue; // Energy and motion use the same original phase in the model track.
    }
    const events=v.events.filter(e=>e.type==='flow'&&e.targetId===r.from&&e.relationTo===r.to).sort((a,b)=>a.startMs-b.startMs);
    for(const event of events){
    const begin=(event.startMs-shot.startMs)/1000,span=(event.endMs-event.startMs)/1000*.55;
    if(span<=0)continue;
    const selector=JSON.stringify(`${scope} #relation-flow-${i}`);
    if(dynamic){
      const times=[...new Set([begin*1000,(begin+span)*1000,...frames!.map(f=>f.timeMs).filter(t=>t>begin*1000&&t<(begin+span)*1000)])].sort((a,b)=>a-b);
      for(const [index,time] of times.entries()){
~~~

## library/shots/cinematic.ts:144-181
Full file SHA256 9077c40cd242b4ea2d4c4c834124a4167e8df3123fc0b346aa3215a55e5031a3

~~~ts
  const worldFrames=c.sourceWorld?sourceWorldFrames(shot):undefined;
  const relation=cinematicRelations(shot,width,height,relationClock,worldFrames),connections=relation.html;
  calls.push(...relation.calls);
  if(worldFrames)calls.push(...sourceWorldModelTimeline(shot,worldFrames));
  for(const e of c.sourceWorld?[]:v.events){
    const i=v.parts.findIndex(part=>part.id===e.targetId),start=(e.startMs-shot.startMs)/1000,end=(e.endMs-shot.startMs)/1000,span=end-start;
    const binding=c.propBindings.find(binding=>binding.partId===e.targetId),motionTargets=modelTargets(e.targetId,binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`,'.motion');
    calls.push(`tl.set(${selector(`.focus-${i}`)},{opacity:1},${start});tl.set(${selector(`.focus-${i}`)},{opacity:0},${end});`);
    if(e.type==='state'){
      const thermalTarget=binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`;
      for(const state of ['hot','cold'])for(const target of modelTargets(e.targetId,thermalTarget,`.thermal-${state}-coat`))calls.push(`tl.to(${target},{opacity:${e.state===state?.62:0},duration:${Math.min(.28,span)},ease:"sine.inOut"},${start});`);
      const hotTargets=modelTargets(e.targetId,thermalTarget,'.thermal-hot'),coldTargets=modelTargets(e.targetId,thermalTarget,'.thermal-cold');
      for(const [index,target] of hotTargets.entries())calls.push(`tl.set(${target},{opacity:${e.state==='hot'?1:0}},${start});tl.set(${coldTargets[index]},{opacity:${e.state==='cold'?1:0}},${start});`);
    }
    if(e.motion==='rotate')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{rotation:120,duration:${span},ease:"none"},${start});`);
    if(e.motion==='translate')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{x:${width*.018},duration:${span/2},ease:"sine.inOut"},${start});tl.to(${motionTarget},{x:0,duration:${span/2},ease:"sine.inOut"},${start+span/2});`);
    if(e.motion==='pulse')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{opacity:.4,duration:${span/2}},${start});tl.to(${motionTarget},{opacity:1,duration:${span/2}},${start+span/2});`);
  }
  const operations=c.sourceWorld?[]:actorActions(shot).filter(a=>a.type==='operate-model'&&rendersModelControl(shot,a.target!.partId)&&!c.propBindings.some(b=>b.partId===a.target?.partId));
  const gated=new Map<string,typeof v.events>();
  for(const partId of new Set(operations.map(a=>a.target!.partId))){
    const explicit=v.events.filter(e=>e.contactRequired&&(e.contactActorId||e.contactHands)&&(e.contactPartId??e.targetId)===partId);
    if(explicit.length)gated.set(partId,explicit);
  }
  // Keep original action order and generated calls for unchanged single-hand scenes.
  for(const action of operations.filter(a=>!gated.has(a.target!.partId))){
    const i=v.parts.findIndex(part=>part.id===action.target!.partId);
    calls.push(`tl.set(${selector(`#object-${i} .control-turn`)},{svgOrigin:"0 0"},0);tl.to(${selector(`#object-${i} .control-turn`)},{rotation:65,duration:.12,ease:"sine.inOut"},${(action.contactMs!-shot.startMs)/1000});`);
  }
  for(const [partId,explicit] of gated){
    const i=v.parts.findIndex(part=>part.id===partId);
    // An explicit two-hand/actor requirement also owns the control's visual response.
    const times=[...new Set(explicit.map(e=>e.startMs))].sort((a,b)=>a-b);
    calls.push(`tl.set(${selector(`#object-${i} .control-turn`)},{svgOrigin:"0 0"},0);`);
    for(const time of times)calls.push(`tl.to(${selector(`#object-${i} .control-turn`)},{rotation:65,duration:.12,ease:"sine.inOut"},${(time-shot.startMs)/1000});`);
  }
  calls.push(...cameraTimeline(c.camera,p,`${scope} .camera-rig`));
  if(background){
~~~

## packages/actors/speech-clock.ts:42-61
Full file SHA256 bebcf0a85644ec4857a8513cf6c66331a32e9c5ae80d562c052b4ff3ab1188bb

~~~ts
}
export function rigSpeechInputIdentity(shot:Shot,narration:Narration,board:Storyboard){
  const world=sourceWorldIdentity(shot,board,narration);
  if(!shotUsesSourceSpeechClock(shot)&&!world)return undefined;
  const owners=narrationCueOwners(board,shot,narration),scene=shot.cinematic!.actorScene!;
  const selected=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)].filter(actorUsesViewActingClock);
  const sourceModels=sourcePropBindingIdentity(shot,board,narration);
  return {version:SPEECH_SOURCE_CLOCK_VERSION,narrationHash:hash(NarrationSchema.parse(narration)),owners:selected.map(a=>({actorId:a.id,cueIds:owners.get(a.id)??[]})),
    viewActing:selected.flatMap(a=>{const clock=actorViewActingClock(board,shot,a.id);return clock?[clock]:[]}),
    ...(sourceModels?{sourcePropBinding:sourceModels}:{}),...(world?{sourceWorld:world}:{})};
}
export type RigSpeechPublicationBinding={version:typeof SPEECH_SOURCE_CLOCK_VERSION;identityHash:string};
export function rigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard):RigSpeechPublicationBinding|undefined{
  const identity=rigSpeechInputIdentity(shot,narration,board);
  return identity?{version:SPEECH_SOURCE_CLOCK_VERSION,identityHash:hash(identity)}:undefined;
}
/** Acceptance uses the board actually being committed, with the repaired shot
 * substituted. Nonlocal ownership/narration changes must not approve a scene
 * compiled with another source phase. This is not waveform verification. */
export function assertRigSpeechPublicationBinding(shot:Shot,narration:Narration,board:Storyboard,expected?:RigSpeechPublicationBinding):void{
~~~

## packages/scenes/index.ts:51-57
Full file SHA256 83e440c2f23405f6b5a75579bc1dd854afbea51bf54f5b928084e82fd9244d83

~~~ts
async function sourceSpeechBoard(root:string,shot:Shot,provided?:Storyboard):Promise<Storyboard|undefined>{
  if(!shotUsesSourceSpeechClock(shot)&&!shot.cinematic?.sourceWorld)return undefined;
  if(provided)return provided;
  const file=path.join(root,'work/storyboard.json');
  if(!await exists(file))throw new Error('needs-speech-phase: canonical source clock requires the complete storyboard');
  return readJson(file,StoryboardSchema);
}
~~~

## packages/scenes/index.ts:132-140
Full file SHA256 83e440c2f23405f6b5a75579bc1dd854afbea51bf54f5b928084e82fd9244d83

~~~ts
  const speechNarration=shot.cinematic?.spriteStage?.actors.some(actor=>actor.clips.some(clip=>clip.speech))?await readJson(path.join(root,'work/narration.json'),NarrationSchema):undefined;
  const actorScene=shot.cinematic?.actorScene,actors=[...(actorScene?.primary?[actorScene.primary]:[]),...(actorScene?.supporting.map(actor=>actor.character)??[])];
  const phaseBoard=await sourceSpeechBoard(root,shot,board);
  const phaseNarration=phaseBoard?await readJson(path.join(root,'work/narration.json'),NarrationSchema):undefined;
  const rigSpeechPhase=phaseBoard&&phaseNarration?rigSpeechInputIdentity(shot,phaseNarration,phaseBoard):undefined;
  const sourceWorldPhase=phaseBoard&&phaseNarration?sourceWorldIdentity(shot,phaseBoard,phaseNarration):undefined;
  const referenceRig=Object.keys(assetHashes).some(file=>file.startsWith('assets/rigs/'))?{referenceHeadPack:referenceHeadDescription().fingerprint,
    ...(actors.some(actor=>usesReferenceBody(actor))?{referenceBodyPack:referenceBodyDescription().fingerprint}:{})}:{};
  return hash({shot,...referenceRig,...(rigSpeechPhase?{rigSpeechPhase}:{}),...(shot.cinematic?.spriteStage?{spriteSceneRenderer:SPRITE_SCENE_VERSION}:{}),...(speechNarration?{spriteSpeechNarration:hash(speechNarration)}:{}),source:hash(source),characters:characters.characters.filter(character=>shot.characters.includes(character.id)),assetHashes,style:getStyle(config),renderer:HYPERFRAMES_VERSION,gsap:hash(gsap),recipe:selectRecipe(shot),dimensions:config.rendering.final,securityVersion:SCENE_SECURITY_VERSION,hostRigIdentityVersion:shot.host?HOST_RIG_IDENTITY_VERSION:undefined,controller:shot.cinematic?shot.cinematic.performance.compilerVersion:HOST_CONTROLLER_VERSION,director:shot.cinematic?DIRECTION_VERSION:undefined,artworkRenderer:shot.cinematic?ARTWORK_RENDER_VERSION:undefined,artworkEasingRenderer:shot.cinematic?.artDirection?.layers.some(layer=>layer.keyframes.some(frame=>frame.ease!==undefined))?ARTWORK_EASING_VERSION:undefined,artworkWorldBackgroundRenderer:shot.cinematic?.artDirection?.layers.some(layer=>layer.plane==='background'&&layer.coordinateSpace==='world')?ARTWORK_WORLD_BACKGROUND_VERSION:undefined,modelForegroundRenderer:shot.cinematic?.artDirection?.models.some(model=>model.foregroundSvg!==undefined)?MODEL_FOREGROUND_VERSION:undefined,modelContactAnchor:shot.cinematic?.artDirection?.models.some(model=>model.handleAnchor!==undefined)?MODEL_CONTACT_ANCHOR_VERSION:undefined,modelRenderer:shot.cinematic?CINEMATIC_MODEL_VERSION:undefined,propBindingsRenderer:shot.cinematic?.propBindings.length?PROP_BINDING_VERSION:undefined,seatSupportRenderer:shot.cinematic?SEAT_SUPPORT_VERSION:undefined,sceneLabels:sceneLabelIdentity(shot,config),activity});
~~~

## packages/scenes/source-publication.ts:8-18
Full file SHA256 0de47346be7ebd2aa70d987aecf9c6dcd02bfc1ad61e42d3b7db835bc32ebba2

~~~ts
 * run before staging/writes and after writes; they are not a filesystem lock. */
export function nativeSceneSourceGuard(root:string,shot:Shot,expected?:RigSpeechPublicationBinding):(()=>Promise<void>)|undefined{
  if(!shotUsesSourceSpeechClock(shot)&&!shot.cinematic?.sourceWorld&&!expected)return undefined;
  const shotId=shot.id,shotHash=hash(shot),binding=expected&&structuredClone(expected);
  return async()=>{
    const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema),current=board.shots.find(s=>s.id===shotId);
    if(!current||hash(current)!==shotHash)throw new Error(`${shotId}: needs-source-publication: canonical shot changed during scene publication`);
    assertRigSpeechPublicationBinding(current,await readJson(path.join(root,'work/narration.json'),NarrationSchema),board,binding);
  };
}

~~~

## packages/director/props.ts:50-66
Full file SHA256 a6a61d3a0044bdae86b1a92b7758a93c6ffd00b7921fa65a435b3bf5ec412ed1

~~~ts
export function modelEntryParts(shot:Shot,board?:Storyboard){return modelPartsAt(shot,false,board);}
export function validatePropBindings(shot:Shot,board?:Storyboard,narration?:Narration):void{
  const c=shot.cinematic;if(!c)return;
  validateSourceWorld(shot,board,narration);
  const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
  const sourceSelected=performances.some(p=>p.sourceManipulation);
  if(sourceSelected){
    if(!board||!narration)throw new Error(`${shot.id}: needs-source-prop-binding: original contact requires complete storyboard and original narration`);
    validateSourcePropBindings(shot,board,narration);
  }
  const declared=performances.flatMap(p=>performanceProps(p).map(prop=>prop.id));
  if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
  if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
  const svgIds=c.propBindings.map(binding=>boundProp(shot,binding).svgId);
  if(new Set(svgIds).size!==svgIds.length)throw new Error(`${shot.id}: bound prop namespaces collide; use unambiguous actor/prop IDs`);
  if(sourceSelected)throw new Error(`${shot.id}: needs-source-prop-binding: original entity/action/evidence binding is checked; source event/effect/interaction/coverage world contract remains pending and cannot enter production`);
  const pickup=pickupPart(shot),ids=new Set<string>(),parts=new Set<string>();
~~~

## packages/director/schemas.ts:28-38
Full file SHA256 54fcddb6617facb34a5ef9c73aa55bdf4d6c68d8b166892b2cbe2bc4e12b718c

~~~ts
  version:z.literal(22),producer:z.literal(DIRECTION_VERSION),shotId:Id,leadCharacterId:Id,
  motivation:z.string().min(1).max(1000),attentionPartId:Id.optional(),sourceRefs:z.array(SourceRefSchema).min(1),
  setting:z.enum(['workshop','road','neutral','forest','camp','cave','river']),environmentAssetId:Id.optional(),
  provenance:z.literal('illustration'),
  artDirection:ArtDirectionSchema.optional(),
  actorScene:ActorSceneSchema.optional(),
  spriteStage:SpriteStageSchema.optional(),
  sourceWorld:SourceWorldSchema.optional(),
  sceneIntent:SceneIntentSchema.optional(),
  models:z.array(CinematicModelSchema),
  propBindings:z.array(z.object({propId:Id,partId:Id,ownerId:Id.optional(),role:z.literal('illustrative-model'),sourceRefs:z.array(SourceRefSchema).min(1)}).strict()).default([]),
~~~

## packages/explainer/schemas.ts:42-49
Full file SHA256 aa87b8b2a4ad1e1fe5aefe5bff4405d00434d186ff3ccfd5be2bb89ced0579e8

~~~ts
});
export const VisualizationEventSchema = z.object({ type: z.enum(['highlight', 'part-motion', 'flow', 'reveal', 'compare','state']),
  targetId: Id, narrationAnchor: Id, startMs: z.number().int().nonnegative(), endMs: z.number().int().positive(),
  contactRequired: z.boolean().default(false), motion: z.enum(['translate', 'rotate', 'pulse', 'none']).default('none'),
  sourceRefs: z.array(SourceRefSchema).min(1),state:z.enum(['hot','cold']).optional(),relationTo:Id.optional(),contactPartId:Id.optional(),
  contactActorId:Id.optional(),contactHands:z.array(RigHandSchema).min(1).max(2).optional(),sourceWorld:SourceWorldRefSchema.optional() });
export const VisualizationSchema = z.object({ type: z.enum(VisualMethods), modelId: Id,
  parts: z.array(VisualizationPartSchema).max(8), relations: z.array(RelationSchema).max(16),
~~~

## packages/core/identifiers.ts:1-6
Full file SHA256 7d5d65506ca7e11c92f4bf5232f8ac9fe894eb0a73f3226986ac2e17c3c14fad

~~~ts
import { z } from 'zod';

/** Rig-space sides, not anatomical left/right after a camera turn. */
export const RigHandSchema=z.enum(['left','right']);
export type RigHand=z.infer<typeof RigHandSchema>;
export const rigHand=(value:{hand?:RigHand}):RigHand=>value.hand??'right';
~~~

## Complete library/shots/source-world-timeline.ts
Full file SHA256 8d3fe011eb7c514ebd7b49d60c19a88b37e1e555fce3791af67b356b70b25971

~~~ts
import type {Shot} from '../../packages/core/schemas.js';
import {hash} from '../../packages/core/utils.js';
import {sampleSourceWorldPhase,type SourceWorldPhase} from '../../packages/director/source-world-phase.js';
import {boundProp} from '../../packages/director/prop-owner.js';
import {rendersModelControl} from '../../packages/director/art-direction-schemas.js';

export interface SourceWorldFrame {timeMs:number;phase:SourceWorldPhase;}
/** Original breakpoints + a measured fps grid. Generated JS never contains
 * negative camera-local times or a fabricated event start at the cut. */
export function sourceWorldFrames(shot:Shot):SourceWorldFrame[]{
  const c=shot.cinematic,world=c?.sourceWorld;if(!c||!world)throw new Error('needs-source-prop-binding: complete original world timeline required');
  const duration=shot.endMs-shot.startMs,times=new Set<number>([0,duration]);
  if(!Number.isSafeInteger(duration)||duration<=0||!Number.isFinite(c.performance.fps)||c.performance.fps<=0||c.performance.fps>120)throw new Error('needs-source-prop-binding: invalid original world frame clock');
  const add=(global:number)=>{const local=global-shot.startMs;if(local>0&&local<duration)times.add(local);};
  for(let frame=1;frame*1000/c.performance.fps<duration;frame++)times.add(frame*1000/c.performance.fps);
  for(const e of world.events){const span=e.endMs-e.startMs;
    for(const at of [e.startMs,e.endMs,e.startMs+span/2,e.startMs+span*.55,e.startMs+span*.775,e.startMs+Math.min(280,span),e.startMs+120])add(at);
  }
  return [...times].sort((a,b)=>a-b).map(timeMs=>({timeMs,phase:sampleSourceWorldPhase(world,shot.visualization!.parts,c.performance.stage.width,shot.startMs+timeMs)}));
}
/** Emit a deterministic initial state and only changed channel values. Step
 * channels switch at their actual breakpoint, never tween before contact. */
export function sourceWorldTrack<T extends object>(frames:SourceWorldFrame[],selector:string,value:(frame:SourceWorldFrame)=>T,step=false):string[]{
  if(!frames.length||frames[0]!.timeMs!==0)throw new Error('needs-source-prop-binding: original world track requires an explicit camera entry');
  const calls:string[]=[];let previous=frames[0]!,vars=value(previous);
  calls.push(`tl.set(${JSON.stringify(selector)},${JSON.stringify({...vars,immediateRender:true})},0);`);
  for(const frame of frames.slice(1)){const next=value(frame);
    if(hash(next)!==hash(vars))calls.push(step?`tl.set(${JSON.stringify(selector)},${JSON.stringify(next)},${Number((frame.timeMs/1000).toFixed(6))});`:
      `tl.to(${JSON.stringify(selector)},${JSON.stringify({...next,duration:Number(((frame.timeMs-previous.timeMs)/1000).toFixed(6)),ease:'none'})},${Number((previous.timeMs/1000).toFixed(6))});`);
    previous=frame;vars=next;
  }
  return calls;
}
export function sourceWorldModelTimeline(shot:Shot,frames:SourceWorldFrame[]):string[]{
  const c=shot.cinematic!,scope=`[data-composition-id="${shot.id}"]`,calls:string[]=[];
  const selector=(s:string)=>`${scope} ${s.replace(/#([a-zA-Z][\w.-]*)/g,(_,id:string)=>`[id=${JSON.stringify(id)}]`)}`;
  for(const [i,part] of shot.visualization!.parts.entries()){
    const binding=c.propBindings.find(b=>b.partId===part.id),glyph=binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`;
    const foreground=c.artDirection?.models.some(m=>m.partId===part.id&&m.foregroundSvg!==undefined),state=(frame:SourceWorldFrame)=>frame.phase.models[part.id]!;
    const targets=(suffix:string)=>[glyph+suffix,...(foreground?[`#foreground-object-${i}${suffix}`]:[])];
    calls.push(...sourceWorldTrack(frames,selector(`#object-${i} .focus-${i}`),f=>({opacity:state(f).focus}),true));
    for(const base of new Set([`#object-${i}`,glyph,...(foreground?[`#foreground-object-${i}`]:[])]))calls.push(...sourceWorldTrack(frames,selector(base),f=>({opacity:state(f).visible}),true));
    for(const target of targets(' .motion'))calls.push(...sourceWorldTrack(frames,selector(target),f=>({rotation:state(f).rotation,x:state(f).x,opacity:state(f).opacity})));
    for(const [name,key] of [['hot','hot'],['cold','cold'],['hot-coat','hotCoat'],['cold-coat','coldCoat']] as const)for(const target of targets(` .thermal-${name}`))calls.push(...sourceWorldTrack(frames,selector(target),f=>({opacity:state(f)[key]}),!name.endsWith('coat')));
    calls.push(...sourceWorldTrack(frames,selector(`#object-${i} .energy-effect`),f=>({opacity:state(f).energy})));
    if(!binding&&rendersModelControl(shot,part.id)){
      calls.push(`tl.set(${JSON.stringify(selector(`#object-${i} .control-turn`))},{svgOrigin:"0 0"},0);`);
      calls.push(...sourceWorldTrack(frames,selector(`#object-${i} .control-turn`),f=>({rotation:state(f).control})));
    }
  }
  return calls;
}

~~~
