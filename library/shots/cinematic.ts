import type { FactoryConfig } from '../../packages/core/config.js';
import type { SceneFiles, Shot,Narration,Storyboard } from '../../packages/core/schemas.js';
import { escapeHtml,hash } from '../../packages/core/utils.js';
import {rigHand} from '../../packages/core/identifiers.js';
import {cinematicActionGroups} from '../../packages/director/actions.js';
import type { HostProfile, HostRig } from '../../packages/host/schemas.js';
import { partAnchor, type HostGeometry } from '../../packages/host/controller.js';
import type { SpeechActivity } from '../../packages/voice/schemas.js';
import { performanceScene } from '../../packages/animation/scene.js';
import { samplePerformance } from '../../packages/animation/compiler.js';
import {actorViewActingClock,actorUsesViewActingClock} from '../../packages/actors/view-acting-clock.js';
import type {ViewActingClock} from '../../packages/animation/view-acting-clock.js';
import {viewSourceGestureDefinition} from '../../packages/animation/view-source-gesture.js';
import { rigMetrics } from '../../packages/animation/rig.js';
import { ANIMATION_VERSION } from '../../packages/animation/schemas.js';
import { validateCinematicShot } from '../../packages/director/index.js';
import { cinematicModel, cinematicRelations } from './cinematic-models.js';
import { CAMERA_VIEWPORT, cameraMatrixAt, cameraTimeline, cameraModelLabel, cameraEnvironmentBounds, validateCamera } from '../../packages/director/camera.js';
import { artLayers, customModelArt, customModelForegroundArt, customModelMotionOrigin, MODEL_FOREGROUND_VERSION } from '../../packages/director/art-direction.js';
import { rendersModelLabel,rendersModelControl } from '../../packages/director/art-direction-schemas.js';
import {actorProfile,actorActions,shotPerformer,actorSpeech} from '../../packages/actors/model.js';
import {actorShotSpeech,narrationCueOwners,shotUsesSourceSpeechClock} from '../../packages/actors/speech-clock.js';
import {SPEECH_SOURCE_CLOCK_VERSION,windowSpeechActivity,validateSpeechActivityTrack,type SpeechSourceClock} from '../../packages/animation/speech-clock.js';
import {buildRig} from '../../packages/host/rig.js';
import {performanceSvg,propHandSlotsSvg} from '../../packages/animation/rig.js';
import {namespaceRigSvg} from '../../packages/animation/svg-namespace.js';
import {compilePerformance} from '../../packages/animation/compiler.js';
import {PROP_BINDING_VERSION,boundProp} from '../../packages/director/props.js';
import {originalPropGesture} from '../../packages/director/source-prop-binding.js';
import {performanceProps} from '../../packages/animation/view-source-manipulation.js';
import {compiledModelFrames,compiledRigidProp,mergeModelMotionFrames} from '../../packages/director/prop-motion.js';
import {sourceSpearBinding} from '../../packages/director/source-spear-bindings.js';
import {spearSvg} from '../../packages/animation/spear.js';
import {ownershipBindingPartition} from '../../packages/director/ownership-bindings.js';
import {sceneSeats,SEAT_SUPPORT_VERSION} from '../../packages/stage/seats.js';
import {sceneLabels} from './scene-labels.js';
import {renderSpriteScene} from '../../packages/motion/scene.js';
import type {ActorMotion} from '../../packages/motion/schemas.js';
import {sourceWorldFrames,sourceWorldModelTimeline} from './source-world-timeline.js';
import {inspectEmittedSpearActions} from '../../packages/director/source-spear-emitted.js';
import {projectedModelGeometry} from '../../packages/director/projected-model-geometry.js';
import {projectedModelOverlayTimeline} from '../../packages/director/projected-model-overlays.js';
import {modelThermal} from '../../packages/director/model-decorations.js';
export {modelThermal} from '../../packages/director/model-decorations.js';
import {sourceInteractionGeometry} from '../../packages/director/source-interactions.js';
import {sourceSpearInteractionGeometry} from '../../packages/director/source-spear-interactions.js';
import {compileSourceOwnership} from '../../packages/director/ownership-compile.js';
import {ownershipGlyph} from '../../packages/director/ownership-reference.js';
import {renderOwnershipLayer,suppressOwnershipCopies,ownershipRelationFrames} from './ownership-layer.js';

function renderRigCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration,board?:Storyboard):{
  files:SceneFiles;geometry:HostGeometry;report:ReturnType<typeof performanceScene>['compiled']['report'] & {camera:ReturnType<typeof validateCamera>;actors:Array<{actorId:string;profileHash:string;rigHash:string;report:ReturnType<typeof compilePerformance>['report']}>;modelForegroundVersion?:string;foregroundModels?:Array<{partId:string;actorId?:string;propId?:string;ownershipSourceId?:string}>;seatSupportVersion?:string;seatSupports?:ReturnType<typeof sceneSeats>;boundModelMotionVersion?:string;boundModels?:Record<string,unknown>[];sourceWorld?:Record<string,unknown>;sourceOwnership?:Record<string,unknown>;emittedSpearActions?:ReturnType<typeof inspectEmittedSpearActions>;projectedRelations?:ReturnType<typeof cinematicRelations>['projectedReports'];projectedOverlays?:Array<ReturnType<typeof projectedModelOverlayTimeline>['report']>};
} {
  ({profile,rig}=shotPerformer(shot,profile,rig));
  validateCinematicShot(shot,profile,config,board,narration);
  const c=shot.cinematic!,p=c.performance,v=shot.visualization!,{width,height}=p.stage;
  const sceneText=sceneLabels(config.project.language);
  const art=c.artDirection,palette=art?.palette??{background:'#F3DDAA',surface:'#FFF3DB',ink:'#201A15',accent:'#F4CD68'};
  const planes={background:artLayers(shot,'background','frame'),worldBackground:artLayers(shot,'background','world'),midground:artLayers(shot,'midground'),foreground:artLayers(shot,'foreground'),overlay:artLayers(shot,'overlay')};
  const speech=c.actorScene?actorSpeech(activity,narration,c.actorScene.speakingSegmentIds,shot.startMs,shot.endMs):activity;
  let localActivity:SpeechActivity={...speech,intervals:speech.intervals.filter(a=>a.startMs<shot.endMs&&a.endMs>shot.startMs)
    .map(a=>({...a,startMs:Math.max(0,a.startMs-shot.startMs),endMs:Math.min(p.durationMs,a.endMs-shot.startMs)}))};
  if(board&&shotUsesSourceSpeechClock(shot)&&!narration)throw new Error('needs-speech-phase: storyboard source phase requires narration');
  const owners=board&&shotUsesSourceSpeechClock(shot)?narrationCueOwners(board,shot,narration!):undefined;
  let primaryClock:SpeechSourceClock|undefined;
  if(actorUsesViewActingClock(profile)&&c.actorScene?.primary!==null){
    if(c.actorScene){const projected=actorShotSpeech(activity,narration,profile.id,c.actorScene.speakingSegmentIds,shot.startMs,shot.endMs,owners?.get(profile.id)??(owners?[]:undefined));
      localActivity=projected.activity;primaryClock=projected.sourceClock;
    }else {validateSpeechActivityTrack(activity);primaryClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:profile.id,scope:'narration',cueIds:[],startMs:shot.startMs,endMs:shot.endMs,
      sourceActivityHash:hash(activity),activity:windowSpeechActivity(activity,shot.startMs,shot.endMs)};}
  }
  const primaryActingClock=board?actorViewActingClock(board,shot,profile.id):undefined;
  const performerSpeech=new Map<string,{activity:SpeechActivity;sourceClock?:SpeechSourceClock;actingClock?:ViewActingClock}>([[profile.id,{activity:localActivity,sourceClock:primaryClock,actingClock:primaryActingClock}]]);
  // Story scenery owns the actual rock/table/floor. Do not add a fabricated
  // mechanical stand under every carried basket or bowl in an actor story.
  const supports=c.actorScene?[]:c.propBindings.length?c.propBindings.flatMap(binding=>{
    const part=v.parts.find(part=>part.id===binding.partId)!,{prop,performance:ownerPlan}=boundProp(shot,binding);
    // A dropped object has no invented table underneath its held entry or floor landing.
    // Authored scenery supplies any actual narrated support.
    if(ownerPlan.gestures.some(g=>g.propId===prop.id&&g.action==='drop'))return [];
    return [prop.origin,...(prop.destination?[prop.destination]:[])].map(center=>({x:center.x,y:center.y+part.height*height*.5,width:part.width*width*1.12}));
  }):undefined;
  const seats=sceneSeats(shot),result=performanceScene(p,profile,localActivity,background,supports,{items:seats,palette},primaryClock,primaryActingClock),scope=`[data-composition-id="${shot.id}"]`,selector=(s:string)=>JSON.stringify(`${scope} ${s.replace(/#([a-zA-Z][\w.-]*)/g,(_,id:string)=>`[id=${JSON.stringify(id)}]`)}`);
  const decoration=c.setting==='road'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#A78C66"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#E8D6AF" stroke-width="5" stroke-dasharray="45 24"/>`
    :c.setting==='workshop'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#B79C72"/><path d="M${width*.6} ${height*.26}H${width*.9}V${height*.63}H${width*.6}Z" fill="#836D52" opacity=".3"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#876E4F" stroke-width="3"/>`
    :`<path d="M0 ${p.stage.groundY}H${width}" stroke="#A38B65" stroke-width="3"/>`;
  const calls:string[]=Object.values(planes).flatMap(plane=>plane.calls);
  const actorReports:Array<{actorId:string;profileHash:string;rigHash:string;report:ReturnType<typeof compilePerformance>['report']}>=[];
  const ownerCompilations=new Map<string,ReturnType<typeof compilePerformance>>([[profile.id,result.compiled]]);
  const supporting=(c.actorScene?.supporting??[]).map(actor=>{
    const definition=actorProfile(actor.character,profile),prefix=`actor-${actor.character.id}-`;
    let local=actorSpeech(activity,narration,actor.speakingSegmentIds,shot.startMs,shot.endMs);
    local.intervals=local.intervals.map(interval=>({...interval,startMs:interval.startMs-shot.startMs,endMs:interval.endMs-shot.startMs}));
    let sourceClock:SpeechSourceClock|undefined;
    if(actorUsesViewActingClock(definition)){const projected=actorShotSpeech(activity,narration,definition.id,actor.speakingSegmentIds,shot.startMs,shot.endMs,owners?.get(definition.id)??(owners?[]:undefined));
      local=projected.activity;sourceClock=projected.sourceClock;
    }
    const actingClock=board?actorViewActingClock(board,shot,definition.id):undefined;
    performerSpeech.set(definition.id,{activity:local,sourceClock,actingClock});
    const compiled=compilePerformance(actor.performance,definition,local,prefix,sourceClock,actingClock);
    ownerCompilations.set(definition.id,compiled);
    actorReports.push({actorId:definition.id,profileHash:definition.profileHash,rigHash:buildRig(definition).rigHash,report:compiled.report});
    calls.push(compiled.js);
    const props=performanceProps(actor.performance).map(prop=>actor.performance.sourceSpear?.spears.some(s=>s.propId===prop.id)?namespaceRigSvg(spearSvg(prop),prefix):`<g id="${prefix}prop-${prop.id}"></g>`).join('');
    return `<g data-actor-id="${escapeHtml(actor.character.id)}"><ellipse id="${prefix}ground-shadow" cx="0" cy="0" rx="54" ry="10" fill="${palette.ink}" opacity=".18"/>${namespaceRigSvg(performanceSvg(definition,'scene'),prefix)}${props}${namespaceRigSvg(propHandSlotsSvg(definition),prefix)}</g>`;
  }).join('');
  // The production validator above still blocks unaccepted ownership. This
  // branch is its real one-entity renderer implementation, not a gate override.
  const ownership=c.sourceOwnership?compileSourceOwnership(shot,board!,narration!,[...ownerCompilations.values()].flatMap(owner=>owner.frames.map(f=>shot.startMs+f.timeMs))):undefined;
  const ownershipLayer=ownership?renderOwnershipLayer(shot,ownership,modelThermal):undefined;
  if(ownershipLayer)calls.push(...ownershipLayer.calls);
  const emittedSpears=inspectEmittedSpearActions(shot,board,narration,ownerCompilations,ownership);
  const propArt=new Map<string,string>(),foregroundModels:string[]=[];
  const foregroundParts=new Set(art?.models.filter(model=>model.foregroundSvg!==undefined).map(model=>model.partId));
  const modelTargets=(partId:string,base:string,suffix:string)=>[selector(`${base} ${suffix}`),...(foregroundParts.has(partId)?[selector(`#foreground-object-${v.parts.findIndex(part=>part.id===partId)} ${suffix}`)]:[])];
  const objects=v.parts.map((part,i)=>{
    const x=part.x*width,y=part.y*height,w=part.width*width,h=part.height*height,handle=partAnchor(shot,part.id,'handle',width,height);
    const focal=part.id===c.attentionPartId;
    const model=c.models.find(m=>m.partId===part.id)!;
    const contactFrame=art?.models.find(m=>m.partId===part.id)?.contactFrame;
    const illustration=cinematicModel(part,model,w,h);
    const authoredGlyph=customModelArt(shot,part.id,w,h,!!contactFrame);
    if(authoredGlyph){illustration.svg=authoredGlyph;illustration.motionAnchors=!contactFrame&&[...authoredGlyph.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion'))?[{selector:'.motion',...customModelMotionOrigin(shot,part.id)}]:[];}
    const binding=c.propBindings.find(binding=>binding.partId===part.id),canonicalGlyph=ownershipGlyph(shot,part.id),showLabel=rendersModelLabel(shot,part.id);
    const frontScale=contactFrame&&binding&&!canonicalGlyph?boundProp(shot,binding).performance.scale:1;
    const foreground=canonicalGlyph?undefined:customModelForegroundArt(shot,part.id,w/frontScale,h/frontScale);
    if(foreground){
      foregroundModels.push(`<g id="foreground-object-${i}" data-sourced-foreground="${escapeHtml(part.id)}"${binding?` data-bound-prop-id="${escapeHtml(binding.propId)}"`:''} transform="translate(${x} ${y})">${foreground}</g>`);
      if(!contactFrame&&[...foreground.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion')))calls.push(`tl.set(${selector(`#foreground-object-${i} .motion`)},{svgOrigin:${JSON.stringify(`${customModelMotionOrigin(shot,part.id).x} ${customModelMotionOrigin(shot,part.id).y}`)}},0);`);
    }
    if(binding&&!canonicalGlyph){
      const owner=boundProp(shot,binding),scale=owner.performance.scale,compiled=ownerCompilations.get(owner.id);
      if(!compiled)throw new Error(`${shot.id}: bound model has no compiled owner ${owner.id}`);
      const tool=sourceSpearBinding(shot,binding),rigid=tool?{partId:part.id,ownerId:owner.id,propId:binding.propId,frames:compiled.frames,rigid:{transformKey:`prop-${binding.propId}`,scale}}:undefined;
      if(tool){
        // The actual owner layer already draws exactly one native wood/stone
        // shaft with its compiler transform. No schematic replacement/clock.
        illustration.motionAnchors=[];
      }else{
        const art=cinematicModel(part,model,w/scale,h/scale);
        art.svg=customModelArt(shot,part.id,w/scale,h/scale,!!contactFrame)??art.svg;
        propArt.set(owner.svgId,`<g id="${owner.svgId}" data-prop-entity="${escapeHtml(part.id)}" data-prop-role="${binding.role}"${binding.ownerId?` data-prop-owner="${escapeHtml(owner.id)}"`:''} fill="none" stroke="#644931" stroke-width="${height*.003/scale}" stroke-linecap="round" stroke-linejoin="round">${art.svg}${contactFrame?'':modelThermal(part,w/scale,h/scale)}</g>`);
      }
      // Model labels, emphasis and effects share the exact adaptive prop clock.
      if(!contactFrame)for(const [frameIndex,frame] of compiled.frames.entries()){
        const prop=frame.props[binding.propId]!,previous=compiled.frames[frameIndex-1],at=(previous?.timeMs??0)/1000;
        const center=rigid?compiledRigidProp(frame,rigid).point:prop.point;
        const interpolation=previous?{duration:Number(((frame.timeMs-previous.timeMs)/1000).toFixed(6)),ease:'none'}:{immediateRender:true};
        const method=previous?'to':'set',deltaY=center.y-y;
        calls.push(`tl.${method}(${selector(`#object-${i}`)},${JSON.stringify({attr:{transform:`translate(${center.x-x} ${deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
        if(foreground&&!contactFrame)calls.push(`tl.${method}(${selector(`#foreground-object-${i}`)},${JSON.stringify({attr:{transform:`translate(${center.x} ${center.y})`},...interpolation})},${Number(at.toFixed(6))});`);
        calls.push(`tl.${method}(${selector(`#object-${i} .bound-model-shadow`)},${JSON.stringify({attr:{transform:`translate(0 ${-deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
      }
      if(foreground&&contactFrame){
        // Copy the actual emitted owner channel, including its unwrapped angle,
        // rounded scale and exact interpolation clock; never just its center.
        const from=selector(`#${owner.svgId}`),to=selector(`#foreground-object-${i}`);
        const transforms=compiled.js.split('\n').filter(line=>line.startsWith(`tl.set(${from},`)||line.startsWith(`tl.to(${from},`));
        if(!transforms.length||transforms.some(line=>!line.includes('"attr":{"transform":')))throw new Error(`${shot.id}: projected foreground has no exact owner transform channel`);
        calls.push(...transforms.map(line=>line.replace(from,to)));
      }
    }
    for(const anchor of illustration.motionAnchors)calls.push(`tl.set(${selector(`${canonicalGlyph?`#${canonicalGlyph}`:binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`} ${anchor.selector}`)},{svgOrigin:${JSON.stringify(`${anchor.x} ${anchor.y}`)}},0);`);
    const {font,lines,labelY,labelHeight}=cameraModelLabel(part,height,width);
    if(showLabel&&lines.length>4)throw new Error(`${shot.id}: model label too long for the cinematic stage`);
    if(showLabel&&!contactFrame&&labelY+labelHeight>height*.79)throw new Error(`${shot.id}: cinematic label crosses subtitle clearance`);
    const renderControl=rendersModelControl(shot,part.id);
    const controlled=renderControl&&actorActions(shot).some(a=>a.type==='operate-model'&&a.target?.partId===part.id);
    const thermal=contactFrame?'':modelThermal(part,w,h);
    const control=binding||!renderControl?'':controlled?`<g data-control="illustrative" aria-label="${escapeHtml(sceneText.control)}" transform="translate(${handle.x} ${handle.y})"><circle r="${height*.011}" fill="#FFF3DB"/><g class="control-turn"><path d="M${-height*.007} 0H${height*.007}"/></g></g>`:`<circle class="handle" cx="${handle.x}" cy="${handle.y}" r="${height*.005}" fill="#B7803D"/>`;
    if(contactFrame)return `<g id="object-${i}" data-entity-id="${escapeHtml(part.id)}" data-model-variant="${model.variant}" data-projected-overlays="true" fill="none" stroke="#644931" stroke-width="${height*.003}" stroke-linecap="round" stroke-linejoin="round"><g class="contact-model-shadow"><ellipse data-model-shadow="${escapeHtml(part.id)}" cx="${x+w*.08}" cy="${binding||canonicalGlyph?p.stage.groundY-4:y+h*.53}" rx="${w*.48}" ry="${h*.09}" fill="${palette.ink}" opacity=".14" stroke="none"/></g>${!binding&&!canonicalGlyph?`<g transform="translate(${x} ${y})">${illustration.svg}</g>`:''}${showLabel?`<g class="contact-model-label model-label"><rect x="${x-w*.56}" y="${labelY-font}" width="${w*1.12}" height="${labelHeight+font*.35}" rx="6" fill="${palette.surface}" stroke="none"/><text x="${x}" y="${labelY}" text-anchor="middle" stroke="none" fill="${palette.ink}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${font}">${lines.map((text,j)=>`<tspan x="${x}" dy="${j?font*1.15:0}">${escapeHtml(text)}</tspan>`).join('')}</text></g>`:''}</g>`;
    return `<g id="object-${i}" data-entity-id="${escapeHtml(part.id)}" data-model-variant="${model.variant}" fill="none" stroke="#644931" stroke-width="${height*.003}" stroke-linecap="round" stroke-linejoin="round"><ellipse ${binding?'class="bound-model-shadow" ':''}data-model-shadow="${escapeHtml(part.id)}" cx="${x+w*.08}" cy="${binding?p.stage.groundY-4:y+h*.53}" rx="${w*.48}" ry="${h*.09}" fill="${palette.ink}" opacity=".14" stroke="none"/><g class="focus-${i}" opacity="0"><ellipse cx="${x}" cy="${y}" rx="${w*.53}" ry="${h*.6}" fill="${palette.accent}" opacity=".35" stroke="none"/></g><g transform="translate(${x} ${y})">${binding?'':illustration.svg+thermal}<ellipse class="energy-effect" rx="${w*.4}" ry="${h*.4}" fill="#F0C545" opacity="0" stroke="none"/></g>${!binding&&!art&&focal&&c.setting==='workshop'?`<path d="M${x-w*.5} ${y+h*.5}H${x+w*.5}M${x-w*.45} ${y+h*.5}V${p.stage.groundY}M${x+w*.45} ${y+h*.5}V${p.stage.groundY}" stroke="#765438"/>`:''}${control}${showLabel?`<g class="model-label"><rect x="${x-w*.56}" y="${labelY-font}" width="${w*1.12}" height="${labelHeight+font*.35}" rx="6" fill="${palette.surface}" stroke="none"/><text x="${x}" y="${labelY}" text-anchor="middle" stroke="none" fill="${palette.ink}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${font}">${lines.map((text,j)=>`<tspan x="${x}" dy="${j?font*1.15:0}">${escapeHtml(text)}</tspan>`).join('')}</text></g>`:''}</g>`;
  }).join('');
  const independentBindings=ownership?ownershipBindingPartition(shot).local:c.propBindings;
  const independentClock=independentBindings.length?compiledModelFrames(result.compiled.frames,independentBindings.map(binding=>{
    const owner=boundProp(shot,binding),compiled=ownerCompilations.get(owner.id);
    if(!compiled)throw new Error(`${shot.id}: model ${binding.partId} lacks its actual owner ${owner.id} compilation`);
    return {partId:binding.partId,ownerId:owner.id,propId:binding.propId,frames:compiled.frames,
      ...(sourceSpearBinding(shot,binding)?{rigid:{transformKey:`prop-${binding.propId}`,scale:owner.performance.scale}}:{})};
  })):undefined;
  const relationClock=ownership?mergeModelMotionFrames(p.durationMs,[{partIds:[...ownership.keys()],frames:ownershipRelationFrames(shot,ownership)},
    ...(independentClock?[{partIds:independentBindings.map(binding=>binding.partId),frames:independentClock}]:[])]):independentClock;
  const worldFrames=c.sourceWorld?sourceWorldFrames(shot):undefined;
  const projected=c.artDirection?.models.some(m=>m.contactFrame)?projectedModelGeometry(shot,board,narration,ownerCompilations,ownership):undefined;
  const relation=cinematicRelations(shot,width,height,relationClock,worldFrames,projected),connections=relation.html;
  calls.push(...relation.calls);
  const overlayReports:Array<ReturnType<typeof projectedModelOverlayTimeline>['report']>=[];
  if(projected)for(const model of art!.models.filter(m=>m.contactFrame)){const overlay=projectedModelOverlayTimeline(shot,model.partId,projected);calls.push(...overlay.calls);overlayReports.push(overlay.report);}
  if(worldFrames)calls.push(...sourceWorldModelTimeline(shot,worldFrames));
  for(const e of c.sourceWorld?[]:v.events){
    const i=v.parts.findIndex(part=>part.id===e.targetId),start=(e.startMs-shot.startMs)/1000,end=(e.endMs-shot.startMs)/1000,span=end-start;
    const binding=c.propBindings.find(binding=>binding.partId===e.targetId),canonicalGlyph=ownershipGlyph(shot,e.targetId),motionTargets=modelTargets(e.targetId,canonicalGlyph?`#${canonicalGlyph}`:binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`,'.motion');
    calls.push(`tl.set(${selector(`.focus-${i}`)},{opacity:1},${start});tl.set(${selector(`.focus-${i}`)},{opacity:0},${end});`);
    if(e.type==='state'){
      const thermalTarget=canonicalGlyph?`#${canonicalGlyph}`:binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`;
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
    const first=cameraMatrixAt(c.camera,p.stage,p.durationMs,0),last=cameraMatrixAt(c.camera,p.stage,p.durationMs,p.durationMs);
    calls.push(`tl.set(${selector('.environment')},${JSON.stringify({x:first.x,y:first.y,scale:first.scale,transformOrigin:'0 0',immediateRender:true})},0);`);
    if(JSON.stringify(first)!==JSON.stringify(last))calls.push(`tl.to(${selector('.environment')},${JSON.stringify({x:last.x,y:last.y,scale:last.scale,duration:p.durationMs/1000,ease:'sine.inOut'})},0);`);
  }
  const files:SceneFiles={...result.files,files:result.files.files.map(file=>{
    if(file.path==='index.html'){
      const heading=sceneText.heading;
      const clip=`${shot.id}.camera-viewport`,top=height*CAMERA_VIEWPORT.top,bottom=height*CAMERA_VIEWPORT.bottom;
      const title=art?.showHeading===false?'':`<rect x="0" y="0" width="${width}" height="${top}" fill="${palette.background}"/><rect x="0" y="${bottom}" width="${width}" height="${height-bottom}" fill="${palette.background}"/><rect x="${width*.033}" y="${height*.032}" width="${width*.38}" height="${height*.085}" rx="10" fill="${palette.surface}"/><text x="${width*.045}" y="${height*.07}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${height*.028}" fill="${palette.ink}">${heading[v.type]}</text><text x="${width*.045}" y="${height*.102}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${height*.017}" fill="${palette.ink}">${escapeHtml(sceneText.setting)}</text>`;
      const foreground=planes.foreground.html||(!art?`<path d="M${width*.82} ${height*.78}Q${width*.90} ${height*.75} ${width} ${height*.77}V${height}H${width*.82}Z" fill="#644931" opacity=".18"/>`:'');
      let base=file.content;
      if(art&&!background)base=base.replace(/<rect width="[^"]+" height="[^"]+" fill="url\(#stage-light\)"\/>/, '').replace(/<path d="M0 [^"]+" stroke="#8F7852" stroke-width="2"\/>/,'');
      const content=base.replace('</defs>',`<clipPath id="${clip}"><rect x="0" y="${top}" width="${width}" height="${bottom-top}"/></clipPath></defs>${art&&!background?`<rect width="${width}" height="${height}" fill="${palette.background}"/>`:''}<g data-stage-plane="background">${planes.background.html}</g><g clip-path="url(#${clip})"><g class="camera-rig" data-light-direction="upper-left" data-framing="${c.camera.framing}" data-focus="${c.camera.focus??'ensemble'}">${planes.worldBackground.html?`<g data-stage-plane="background" data-art-space="world">${planes.worldBackground.html}</g>`:''}`)
        .replace('<ellipse id="ground-shadow"',`<g data-stage-plane="midground">${!background&&!art?decoration:''}${planes.midground.html}${connections}${objects}${ownershipLayer?.beforeActors??''}</g><ellipse id="ground-shadow"`)
        .replace('</svg></div>',`${supporting}${ownershipLayer?.afterActors??''}<g data-stage-plane="foreground">${foregroundModels.join('')}${foreground}</g></g></g><g data-stage-plane="overlay">${planes.overlay.html}</g>${title}</svg></div>`);
      let authored=content;for(const [id,svg] of propArt)authored=authored.replace(new RegExp(`<g id="${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">[\\s\\S]*?</g>`),()=>svg);
      if(ownershipLayer)authored=suppressOwnershipCopies(shot,authored,ownershipLayer);
      if(c.actorScene?.primary===null)authored=authored.replace('<g id="performer"','<g opacity="0" id="performer"').replace('<ellipse id="ground-shadow"','<ellipse visibility="hidden" id="ground-shadow"');
      else if(c.actorScene?.primary)authored=authored.replace('<g id="performer"',`<g data-actor-id="${escapeHtml(c.actorScene.primary.id)}" id="performer"`);
      return {...file,content:authored};
    }
    if(file.path==='scene.js')return {...file,content:`${file.content}\n${calls.join('\n')}`};
    if(file.path==='style.css'&&background){const bounds=cameraEnvironmentBounds(c.camera,p.stage,p.durationMs);return {...file,content:`${file.content}\n${scope} .environment{left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;}`};}
    return file;
  }),notes:[`${p.compilerVersion}; story-cinematic; illustration`, `Speech activity: ${activity.method}; no phoneme lip-sync.`]};
  const geometry:HostGeometry={controllerVersion:p.compilerVersion,profileHash:profile.profileHash,rigHash:rig.rigHash,shotId:shot.id,
    hostHeightRatio:rigMetrics(profile).height*p.scale/height,interactions:[]};
  const performers=[...(c.actorScene?.primary===null?[]:[{id:profile.id,profile,performance:p,actions:shot.host!.actions,activity:localActivity,sourceClock:primaryClock,actingClock:primaryActingClock}]),
    ...(c.actorScene?.supporting??[]).map(actor=>({id:actor.character.id,profile:actorProfile(actor.character),performance:actor.performance,actions:actor.actions,
      activity:performerSpeech.get(actor.character.id)!.activity,sourceClock:performerSpeech.get(actor.character.id)!.sourceClock,actingClock:performerSpeech.get(actor.character.id)!.actingClock}))];
  for(const performer of performers)for(const {action:a,gestures,sourceManipulation,sourceSpear} of cinematicActionGroups(performer.actions,performer.performance,shot.startMs)){
    if(sourceSpear){geometry.interactions.push(sourceSpearInteractionGeometry(shot,performer.id,a,board,narration));continue;}
    if(sourceManipulation){geometry.interactions.push(sourceInteractionGeometry(shot,performer.id,a,board,narration,ownership));continue;}
    if(a.target)for(const [index,g] of gestures.entries()){
    const target=index===1?a.secondTarget!:a.target;
    const sourceGesture=g.sourceSpan?viewSourceGestureDefinition(g):undefined;
    const reach=sourceGesture?Math.max(g.startMs,Math.min(g.endMs,sourceGesture.reachMs-shot.startMs)):g.contactMs??Math.min(g.endMs-1,g.startMs+Math.min(320,(g.endMs-g.startMs)*.3));
    const f=samplePerformance(performer.performance,performer.profile,reach,performer.activity,performer.sourceClock,performer.actingClock),anchor=g.target!,handSide=rigHand(g),hand=f.hands[handSide];
    geometry.interactions.push({actorId:performer.id,handSide,type:a.type,startMs:g.startMs+shot.startMs,reachMs:Math.round(reach)+shot.startMs,endMs:g.endMs+shot.startMs,partId:target.partId,
      target:anchor,hand,errorPx:Math.hypot(hand.x-anchor.x,hand.y-anchor.y),root:f.root,gaze:anchor,
      ...(sourceGesture?{sourceGesture:{id:sourceGesture.id,originalReachMs:sourceGesture.reachMs,originalRecoverMs:sourceGesture.recoverMs,
        samplePhase:reach+shot.startMs<sourceGesture.reachMs?'approach' as const:reach+shot.startMs>sourceGesture.recoverMs?'recovery' as const:'hold' as const,contactVerified:false as const}}:{}),
      ...(a.contactMs===undefined?{}:{contactMs:a.contactMs})});
  }
    }
  if(c.actorScene?.primary!==null)actorReports.unshift({actorId:profile.id,profileHash:profile.profileHash,rigHash:rig.rigHash,report:result.compiled.report});
  const ownershipReport=ownership&&ownershipLayer?{scope:'canonical-render-candidate',entities:ownershipLayer.entities,bakes:[...ownership.values()].map(item=>({sourceId:item.source.id,partId:item.source.partId,sourceHash:item.sourceHash,paintHash:item.paintHash,frames:item.bake.samples.length,entry:item.bake.samples[0],exit:item.bake.samples.at(-1),maxMeasuredGapPx:item.bake.maxMeasuredGapPx,gapLimitPx:item.bake.gapLimitPx})),contactVerified:false,motionVerified:false,productionApproval:false}:undefined;
  return {files,geometry,report:{...result.compiled.report,...(overlayReports.length?{projectedOverlays:overlayReports}:{}),...(relation.projectedReports.length?{projectedRelations:relation.projectedReports}:{}),...(emittedSpears.length?{emittedSpearActions:emittedSpears}:{}),...(ownershipReport?{sourceOwnership:ownershipReport}:{}),...(worldFrames?{sourceWorld:{version:c.sourceWorld!.version,id:c.sourceWorld!.id,originalStartMs:c.sourceWorld!.startMs,originalEndMs:c.sourceWorld!.endMs,sourceHash:hash(c.sourceWorld),entry:worldFrames[0]!.phase,exit:worldFrames.at(-1)!.phase,scope:"original-global-phase-candidate",motionVerified:false}}:{}),camera:validateCamera(shot,profile,primaryActingClock,{worldShot:shot,board,narration,ownership,projected}),actors:actorReports,...(foregroundParts.size?{modelForegroundVersion:MODEL_FOREGROUND_VERSION,foregroundModels:[...foregroundParts].map(partId=>{const canonical=ownership?.get(partId),binding=c.propBindings.find(binding=>binding.partId===partId);return canonical?{partId,ownershipSourceId:canonical.source.id}:binding?{partId,actorId:boundProp(shot,binding).id,propId:binding.propId}:{partId};})}:{}),...(seats.length?{seatSupportVersion:SEAT_SUPPORT_VERSION,seatSupports:seats}:{}),...(c.propBindings.length?{boundModelMotionVersion:PROP_BINDING_VERSION,boundModels:c.propBindings.map(binding=>{
    const tool=sourceSpearBinding(shot,binding);
    if(tool)return {...binding,scope:'original rigid tool entity/model candidate',actorId:tool.owner.id,ownerScale:tool.owner.performance.scale,artwork:tool.declared.artwork,
      originalSource:{sourceId:tool.source.id,sourceHash:hash(tool.source),trackId:tool.track.id,originalStartMs:tool.source.startMs,originalEndMs:tool.source.endMs,
        clock:'complete original shaft/body phase; center and unwrapped angle use actual emitted owner transform',motionVerified:false},pending:'original tool action/tip contact/whole cue/reaction physical candidate; emitted contact, native art/runtime/film acceptance pending'};
    const owner=originalPropGesture(shot,binding),prop=owner.prop,g=owner.gesture,source=owner.performance.sourceManipulation;
    return {...binding,...(ownership?.has(binding.partId)?{scope:'physical-grip-alias-only; drawn entity is in sourceOwnership report'}:{}),actorId:owner.id,ownerScale:owner.performance.scale,gestureId:g.id,action:g.action,hand:rigHand(g),gripOffset:prop.gripOffset??{x:0,y:0},origin:prop.origin,gripDestination:g.destination,placedCenter:prop.destination,contactMs:g.contactMs,releaseMs:g.releaseMs,
      ...(source?{originalSource:{sourceId:source.id,sourceHash:hash(source),originalStartMs:source.startMs,originalEndMs:source.endMs,contactGlobalMs:source.startMs+g.contactMs!,releaseGlobalMs:g.releaseMs===undefined?null:source.startMs+g.releaseMs,clock:'reported clip times are original source-relative; sampled positions follow the actual shot slice',motionVerified:false}}:{})};
  })}:{})}};
}

// Legacy seven-argument callers retain the rig report type and byte contract.
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration):ReturnType<typeof renderRigCinematic>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background:string|undefined,narration:Narration|undefined,motions:ReadonlyMap<string,ActorMotion>|undefined,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard):ReturnType<typeof renderRigCinematic>|ReturnType<typeof renderSpriteScene>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration,motions?:ReadonlyMap<string,ActorMotion>,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard){
  const cast=shot.cinematic?.actorScene,renderer=config.presentation.actor_renderer;
  if(renderer==='rig'&&shot.cinematic?.spriteStage)throw new Error(`${shot.id}: rig selection cannot render an image-motion stage`);
  if(renderer==='sprite'&&(cast?.primary||cast?.supporting.length)&&!shot.cinematic?.spriteStage)throw new Error(`${shot.id}: needs-motion-library: image motion cannot fall back to skeletal actors`);
  if(shot.cinematic?.spriteStage){
    if(!motions)throw new Error(`${shot.id}: needs-sprite-motion-context: canonical rendering requires verified sprite descriptors`);
    return renderSpriteScene(shot,profile,config,motions,background,narration,activity,speech);
  }
  return renderRigCinematic(shot,profile,rig,activity,config,background,narration,board);
}
