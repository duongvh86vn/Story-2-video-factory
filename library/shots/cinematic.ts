import type { FactoryConfig } from '../../packages/core/config.js';
import type { SceneFiles, Shot,Narration } from '../../packages/core/schemas.js';
import { escapeHtml } from '../../packages/core/utils.js';
import {rigHand} from '../../packages/core/identifiers.js';
import {cinematicActionGroups} from '../../packages/director/actions.js';
import type { HostProfile, HostRig } from '../../packages/host/schemas.js';
import { partAnchor, type HostGeometry } from '../../packages/host/controller.js';
import type { SpeechActivity } from '../../packages/voice/schemas.js';
import { performanceScene } from '../../packages/animation/scene.js';
import { samplePerformance } from '../../packages/animation/compiler.js';
import { rigMetrics } from '../../packages/animation/rig.js';
import { ANIMATION_VERSION } from '../../packages/animation/schemas.js';
import { validateCinematicShot } from '../../packages/director/index.js';
import { cinematicModel, cinematicRelations } from './cinematic-models.js';
import { CAMERA_VIEWPORT, cameraMatrixAt, cameraTimeline, cameraModelLabel, cameraEnvironmentBounds, validateCamera } from '../../packages/director/camera.js';
import { artLayers, customModelArt, customModelForegroundArt, customModelMotionOrigin, MODEL_FOREGROUND_VERSION } from '../../packages/director/art-direction.js';
import { rendersModelLabel,rendersModelControl } from '../../packages/director/art-direction-schemas.js';
import {actorProfile,actorActions,shotPerformer,actorSpeech} from '../../packages/actors/model.js';
import {buildRig} from '../../packages/host/rig.js';
import {performanceSvg} from '../../packages/animation/rig.js';
import {compilePerformance} from '../../packages/animation/compiler.js';
import {PROP_BINDING_VERSION} from '../../packages/director/props.js';
import {sceneSeats,SEAT_SUPPORT_VERSION} from '../../packages/stage/seats.js';
import {sceneLabels} from './scene-labels.js';

function modelThermal(part:NonNullable<Shot['visualization']>['parts'][number],w:number,h:number):string{
  return part.states?.length?`<g class="thermal-coat">${(['hot','cold'] as const).map(state=>`<rect class="thermal-${state}-coat" x="${-w*.36}" y="${-h*.33}" width="${w*.72}" height="${h*.66}" rx="8" fill="${state==='hot'?'#D65332':'#3394C5'}" opacity="0" stroke="none"/>`).join('')}</g><g class="thermal-hot" opacity="0" stroke="#BF482B">${[-.2,0,.2].map(px=>`<path d="M${w*px} ${-h*.4}q${w*.08} ${-h*.08} 0 ${-h*.16}"/>`).join('')}</g><g class="thermal-cold" opacity="0" stroke="#237CA6"><path d="M0 ${-h*.37}V${-h*.58}M${-w*.08} ${-h*.43}L${w*.08} ${-h*.53}M${-w*.08} ${-h*.53}L${w*.08} ${-h*.43}"/></g>`:'';
}

export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration):{
  files:SceneFiles;geometry:HostGeometry;report:ReturnType<typeof performanceScene>['compiled']['report'] & {camera:ReturnType<typeof validateCamera>;actors:Array<{actorId:string;profileHash:string;rigHash:string;report:ReturnType<typeof compilePerformance>['report']}>;modelForegroundVersion?:string;foregroundModels?:Array<{partId:string;propId?:string}>;seatSupportVersion?:string;seatSupports?:ReturnType<typeof sceneSeats>;boundModelMotionVersion?:string;boundModels?:Record<string,unknown>[]};
} {
  ({profile,rig}=shotPerformer(shot,profile,rig));
  validateCinematicShot(shot,profile,config);
  const c=shot.cinematic!,p=c.performance,v=shot.visualization!,{width,height}=p.stage;
  const sceneText=sceneLabels(config.project.language);
  const art=c.artDirection,palette=art?.palette??{background:'#F3DDAA',surface:'#FFF3DB',ink:'#201A15',accent:'#F4CD68'};
  const planes={background:artLayers(shot,'background','frame'),worldBackground:artLayers(shot,'background','world'),midground:artLayers(shot,'midground'),foreground:artLayers(shot,'foreground'),overlay:artLayers(shot,'overlay')};
  const speech=c.actorScene?actorSpeech(activity,narration,c.actorScene.speakingSegmentIds,shot.startMs,shot.endMs):activity;
  const localActivity:SpeechActivity={...speech,intervals:speech.intervals.filter(a=>a.startMs<shot.endMs&&a.endMs>shot.startMs)
    .map(a=>({...a,startMs:Math.max(0,a.startMs-shot.startMs),endMs:Math.min(p.durationMs,a.endMs-shot.startMs)}))};
  const supports=c.propBindings.length?c.propBindings.flatMap(binding=>{
    const part=v.parts.find(part=>part.id===binding.partId)!,prop=p.props.find(prop=>prop.id===binding.propId)!;
    // A dropped object has no invented table underneath its held entry or floor landing.
    // Authored scenery supplies any actual narrated support.
    if(p.gestures.some(g=>g.propId===prop.id&&g.action==='drop'))return [];
    return [prop.origin,...(prop.destination?[prop.destination]:[])].map(center=>({x:center.x,y:center.y+part.height*height*.5,width:part.width*width*1.12}));
  }):undefined;
  const seats=sceneSeats(shot),result=performanceScene(p,profile,localActivity,background,supports,{items:seats,palette}),scope=`[data-composition-id="${shot.id}"]`,selector=(s:string)=>JSON.stringify(`${scope} ${s}`);
  const decoration=c.setting==='road'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#A78C66"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#E8D6AF" stroke-width="5" stroke-dasharray="45 24"/>`
    :c.setting==='workshop'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#B79C72"/><path d="M${width*.6} ${height*.26}H${width*.9}V${height*.63}H${width*.6}Z" fill="#836D52" opacity=".3"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#876E4F" stroke-width="3"/>`
    :`<path d="M0 ${p.stage.groundY}H${width}" stroke="#A38B65" stroke-width="3"/>`;
  const calls:string[]=Object.values(planes).flatMap(plane=>plane.calls);
  const actorReports:Array<{actorId:string;profileHash:string;rigHash:string;report:ReturnType<typeof compilePerformance>['report']}>=[];
  const supporting=(c.actorScene?.supporting??[]).map(actor=>{
    const definition=actorProfile(actor.character,profile),prefix=`actor-${actor.character.id}-`;
    const local=actorSpeech(activity,narration,actor.speakingSegmentIds,shot.startMs,shot.endMs);
    local.intervals=local.intervals.map(interval=>({...interval,startMs:interval.startMs-shot.startMs,endMs:interval.endMs-shot.startMs}));
    const compiled=compilePerformance(actor.performance,definition,local);
    actorReports.push({actorId:definition.id,profileHash:definition.profileHash,rigHash:buildRig(definition).rigHash,report:compiled.report});
    calls.push(compiled.js.replace(/#[a-zA-Z][\w.-]*/g,id=>`#${prefix}${id.slice(1)}`));
    return `<g data-actor-id="${escapeHtml(actor.character.id)}"><ellipse id="${prefix}ground-shadow" cx="0" cy="0" rx="54" ry="10" fill="${palette.ink}" opacity=".18"/>${performanceSvg(definition).replace(/id="([^"]+)"/g,(_,id:string)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id:string)=>`url(#${prefix}${id})`)}</g>`;
  }).join('');
  const propArt=new Map<string,string>(),foregroundModels:string[]=[];
  const foregroundParts=new Set(art?.models.filter(model=>model.foregroundSvg!==undefined).map(model=>model.partId));
  const modelTargets=(partId:string,base:string,suffix:string)=>[selector(`${base} ${suffix}`),...(foregroundParts.has(partId)?[selector(`#foreground-object-${v.parts.findIndex(part=>part.id===partId)} ${suffix}`)]:[])];
  const objects=v.parts.map((part,i)=>{
    const x=part.x*width,y=part.y*height,w=part.width*width,h=part.height*height,handle=partAnchor(shot,part.id,'handle',width,height);
    const focal=part.id===c.attentionPartId;
    const model=c.models.find(m=>m.partId===part.id)!;
    const illustration=cinematicModel(part,model,w,h);
    const authoredGlyph=customModelArt(shot,part.id,w,h);
    if(authoredGlyph){illustration.svg=authoredGlyph;illustration.motionAnchors=[...authoredGlyph.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion'))?[{selector:'.motion',...customModelMotionOrigin(shot,part.id)}]:[];}
    const binding=c.propBindings.find(binding=>binding.partId===part.id),showLabel=rendersModelLabel(shot,part.id);
    const foreground=customModelForegroundArt(shot,part.id,w,h);
    if(foreground){
      foregroundModels.push(`<g id="foreground-object-${i}" data-sourced-foreground="${escapeHtml(part.id)}"${binding?` data-bound-prop-id="${escapeHtml(binding.propId)}"`:''} transform="translate(${x} ${y})">${foreground}</g>`);
      if([...foreground.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion')))calls.push(`tl.set(${selector(`#foreground-object-${i} .motion`)},{svgOrigin:${JSON.stringify(`${customModelMotionOrigin(shot,part.id).x} ${customModelMotionOrigin(shot,part.id).y}`)}},0);`);
    }
    if(binding){
      const art=cinematicModel(part,model,w/p.scale,h/p.scale);
      art.svg=customModelArt(shot,part.id,w/p.scale,h/p.scale)??art.svg;
      propArt.set(binding.propId,`<g id="prop-${binding.propId}" data-prop-entity="${escapeHtml(part.id)}" data-prop-role="${binding.role}" fill="none" stroke="#644931" stroke-width="${height*.003/p.scale}" stroke-linecap="round" stroke-linejoin="round">${art.svg}${modelThermal(part,w/p.scale,h/p.scale)}</g>`);
      // Model labels, emphasis and effects share the exact adaptive prop clock.
      for(const [frameIndex,frame] of result.compiled.frames.entries()){
        const prop=frame.props[binding.propId]!,previous=result.compiled.frames[frameIndex-1],at=(previous?.timeMs??0)/1000;
        const interpolation=previous?{duration:Number(((frame.timeMs-previous.timeMs)/1000).toFixed(6)),ease:'none'}:{immediateRender:true};
        const method=previous?'to':'set',deltaY=prop.point.y-y;
        calls.push(`tl.${method}(${selector(`#object-${i}`)},${JSON.stringify({attr:{transform:`translate(${prop.point.x-x} ${deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
        if(foreground)calls.push(`tl.${method}(${selector(`#foreground-object-${i}`)},${JSON.stringify({attr:{transform:`translate(${prop.point.x} ${prop.point.y})`},...interpolation})},${Number(at.toFixed(6))});`);
        calls.push(`tl.${method}(${selector(`#object-${i} .bound-model-shadow`)},${JSON.stringify({attr:{transform:`translate(0 ${-deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
      }
    }
    for(const anchor of illustration.motionAnchors)calls.push(`tl.set(${selector(`${binding?`#prop-${binding.propId}`:`#object-${i}`} ${anchor.selector}`)},{svgOrigin:${JSON.stringify(`${anchor.x} ${anchor.y}`)}},0);`);
    const {font,lines,labelY,labelHeight}=cameraModelLabel(part,height,width);
    if(showLabel&&lines.length>4)throw new Error(`${shot.id}: model label too long for the cinematic stage`);
    if(showLabel&&labelY+labelHeight>height*.79)throw new Error(`${shot.id}: cinematic label crosses subtitle clearance`);
    const renderControl=rendersModelControl(shot,part.id);
    const controlled=renderControl&&actorActions(shot).some(a=>a.type==='operate-model'&&a.target?.partId===part.id);
    const thermal=modelThermal(part,w,h);
    const control=binding||!renderControl?'':controlled?`<g data-control="illustrative" aria-label="${escapeHtml(sceneText.control)}" transform="translate(${handle.x} ${handle.y})"><circle r="${height*.011}" fill="#FFF3DB"/><g class="control-turn"><path d="M${-height*.007} 0H${height*.007}"/></g></g>`:`<circle class="handle" cx="${handle.x}" cy="${handle.y}" r="${height*.005}" fill="#B7803D"/>`;
    return `<g id="object-${i}" data-entity-id="${escapeHtml(part.id)}" data-model-variant="${model.variant}" fill="none" stroke="#644931" stroke-width="${height*.003}" stroke-linecap="round" stroke-linejoin="round"><ellipse ${binding?'class="bound-model-shadow" ':''}data-model-shadow="${escapeHtml(part.id)}" cx="${x+w*.08}" cy="${binding?p.stage.groundY-4:y+h*.53}" rx="${w*.48}" ry="${h*.09}" fill="${palette.ink}" opacity=".14" stroke="none"/><g class="focus-${i}" opacity="0"><ellipse cx="${x}" cy="${y}" rx="${w*.53}" ry="${h*.6}" fill="${palette.accent}" opacity=".35" stroke="none"/></g><g transform="translate(${x} ${y})">${binding?'':illustration.svg+thermal}<ellipse class="energy-effect" rx="${w*.4}" ry="${h*.4}" fill="#F0C545" opacity="0" stroke="none"/></g>${!binding&&!art&&focal&&c.setting==='workshop'?`<path d="M${x-w*.5} ${y+h*.5}H${x+w*.5}M${x-w*.45} ${y+h*.5}V${p.stage.groundY}M${x+w*.45} ${y+h*.5}V${p.stage.groundY}" stroke="#765438"/>`:''}${control}${showLabel?`<g class="model-label"><rect x="${x-w*.56}" y="${labelY-font}" width="${w*1.12}" height="${labelHeight+font*.35}" rx="6" fill="${palette.surface}" stroke="none"/><text x="${x}" y="${labelY}" text-anchor="middle" stroke="none" fill="${palette.ink}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${font}">${lines.map((text,j)=>`<tspan x="${x}" dy="${j?font*1.15:0}">${escapeHtml(text)}</tspan>`).join('')}</text></g>`:''}</g>`;
  }).join('');
  const relation=cinematicRelations(shot,width,height,result.compiled.frames),connections=relation.html;
  calls.push(...relation.calls);
  for(const e of v.events){
    const i=v.parts.findIndex(part=>part.id===e.targetId),start=(e.startMs-shot.startMs)/1000,end=(e.endMs-shot.startMs)/1000,span=end-start;
    const binding=c.propBindings.find(binding=>binding.partId===e.targetId),motionTargets=modelTargets(e.targetId,binding?`#prop-${binding.propId}`:`#object-${i}`,'.motion');
    calls.push(`tl.set(${selector(`.focus-${i}`)},{opacity:1},${start});tl.set(${selector(`.focus-${i}`)},{opacity:0},${end});`);
    if(e.type==='state'){
      const thermalTarget=binding?`#prop-${binding.propId}`:`#object-${i}`;
      for(const state of ['hot','cold'])for(const target of modelTargets(e.targetId,thermalTarget,`.thermal-${state}-coat`))calls.push(`tl.to(${target},{opacity:${e.state===state?.62:0},duration:${Math.min(.28,span)},ease:"sine.inOut"},${start});`);
      const hotTargets=modelTargets(e.targetId,thermalTarget,'.thermal-hot'),coldTargets=modelTargets(e.targetId,thermalTarget,'.thermal-cold');
      for(const [index,target] of hotTargets.entries())calls.push(`tl.set(${target},{opacity:${e.state==='hot'?1:0}},${start});tl.set(${coldTargets[index]},{opacity:${e.state==='cold'?1:0}},${start});`);
    }
    if(e.motion==='rotate')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{rotation:120,duration:${span},ease:"none"},${start});`);
    if(e.motion==='translate')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{x:${width*.018},duration:${span/2},ease:"sine.inOut"},${start});tl.to(${motionTarget},{x:0,duration:${span/2},ease:"sine.inOut"},${start+span/2});`);
    if(e.motion==='pulse')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{opacity:.4,duration:${span/2}},${start});tl.to(${motionTarget},{opacity:1,duration:${span/2}},${start+span/2});`);
  }
  const operations=actorActions(shot).filter(a=>a.type==='operate-model'&&rendersModelControl(shot,a.target!.partId)&&!c.propBindings.some(b=>b.partId===a.target?.partId));
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
        .replace('<ellipse id="ground-shadow"',`<g data-stage-plane="midground">${!background&&!art?decoration:''}${planes.midground.html}${connections}${objects}</g><ellipse id="ground-shadow"`)
        .replace('</svg></div>',`${supporting}<g data-stage-plane="foreground">${foregroundModels.join('')}${foreground}</g></g></g><g data-stage-plane="overlay">${planes.overlay.html}</g>${title}</svg></div>`);
      let authored=content;for(const [id,svg] of propArt)authored=authored.replace(new RegExp(`<g id="prop-${id}">[\\s\\S]*?</g>`),svg);
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
  const performers=[...(c.actorScene?.primary===null?[]:[{id:profile.id,profile,performance:p,actions:shot.host!.actions,activity:localActivity}]),
    ...(c.actorScene?.supporting??[]).map(actor=>({id:actor.character.id,profile:actorProfile(actor.character),performance:actor.performance,actions:actor.actions,activity:{...activity,intervals:[]}}))];
  for(const performer of performers)for(const {action:a,gestures} of cinematicActionGroups(performer.actions,performer.performance,shot.startMs))if(a.target)for(const [index,g] of gestures.entries()){
    const target=index===1?a.secondTarget!:a.target;
    const reach=g.contactMs??Math.min(g.endMs-1,g.startMs+Math.min(320,(g.endMs-g.startMs)*.3));
    const f=samplePerformance(performer.performance,performer.profile,reach,performer.activity),anchor=g.target!,handSide=rigHand(g),hand=f.hands[handSide];
    geometry.interactions.push({actorId:performer.id,handSide,type:a.type,startMs:g.startMs+shot.startMs,reachMs:Math.round(reach)+shot.startMs,endMs:g.endMs+shot.startMs,partId:target.partId,
      target:anchor,hand,errorPx:Math.hypot(hand.x-anchor.x,hand.y-anchor.y),root:f.root,gaze:anchor,
      ...(a.contactMs===undefined?{}:{contactMs:a.contactMs})});
  }
  if(c.actorScene?.primary!==null)actorReports.unshift({actorId:profile.id,profileHash:profile.profileHash,rigHash:rig.rigHash,report:result.compiled.report});
  return {files,geometry,report:{...result.compiled.report,camera:validateCamera(shot,profile),actors:actorReports,...(foregroundParts.size?{modelForegroundVersion:MODEL_FOREGROUND_VERSION,foregroundModels:[...foregroundParts].map(partId=>({partId,...(c.propBindings.find(binding=>binding.partId===partId)?{propId:c.propBindings.find(binding=>binding.partId===partId)!.propId}:{})}))}:{}),...(seats.length?{seatSupportVersion:SEAT_SUPPORT_VERSION,seatSupports:seats}:{}),...(c.propBindings.length?{boundModelMotionVersion:PROP_BINDING_VERSION,boundModels:c.propBindings.map(binding=>{
    const prop=p.props.find(prop=>prop.id===binding.propId)!,g=p.gestures.find(g=>g.propId===prop.id)!;
    return {...binding,gestureId:g.id,action:g.action,hand:rigHand(g),gripOffset:prop.gripOffset??{x:0,y:0},origin:prop.origin,gripDestination:g.destination,placedCenter:prop.destination,contactMs:g.contactMs,releaseMs:g.releaseMs};
  })}:{})}};
}


