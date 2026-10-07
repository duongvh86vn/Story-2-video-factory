import type {Shot,SceneFiles} from '../core/schemas.js';
import type {FactoryConfig} from '../core/config.js';
import type {HostProfile} from '../host/schemas.js';
import {escapeHtml} from '../core/utils.js';
import {validateCinematicShot} from '../director/index.js';
import {artLayers,customModelArt,customModelForegroundArt,customModelMotionOrigin} from '../director/art-direction.js';
import {rendersModelLabel,rendersModelControl} from '../director/art-direction-schemas.js';
import {cameraTimeline,cameraEnvironmentBounds,cameraMatrixAt,CAMERA_VIEWPORT,cameraModelLabel} from '../director/camera.js';
import {cinematicModel,cinematicRelations} from '../../library/shots/cinematic-models.js';
import {sceneLabels} from '../../library/shots/scene-labels.js';
import {partAnchor} from '../host/controller.js';
import {compileSpriteStoryActors} from './story-stage.js';
import {validateSpriteCamera} from './camera.js';
import {spriteSceneTargets,SPRITE_SCENE_VERSION} from './scene-validation.js';
import type {ActorMotion} from './schemas.js';
import type {ActorSpeech} from './speech-schemas.js';
import type {Narration} from '../core/schemas.js';
import type {SpeechActivity} from '../voice/schemas.js';

export interface SpriteSceneGeometry {
  kind:'sprite-actors';controllerVersion:typeof SPRITE_SCENE_VERSION;shotId:string;stageHash:string;castHash:string;
  motions:Array<{actorId:string;motionId:string;fingerprint:string}>;
  speech?:Array<{actorId:string;clipId:string;variantId:string;fingerprint:string;sheetHash:string;segmentIds:string[];audioHash?:string;narrationHash:string;activityHash:string;scheduleHash:string;synchronization:'audio-activity'|'segment-draft'}>;
  interactions:Array<{actorId:string;landmark:string;type:'sprite-contact';startMs:number;reachMs:number;endMs:number;contactMs:number;partId:string;target:{x:number;y:number};measured:{x:number;y:number};errorPx:number;tolerancePx:number}>;
}

/** Canonical sprite branch: shared world/camera layers, no skeletal performer. */
export function renderSpriteScene(shot:Shot,profile:HostProfile,config:FactoryConfig,motions:ReadonlyMap<string,ActorMotion>,background?:string,narration?:Narration,activity?:SpeechActivity,variants?:ReadonlyMap<string,ActorSpeech>){
  validateCinematicShot(shot,profile,config);
  const c=shot.cinematic!,plan=c.spriteStage!,v=shot.visualization!,{width,height}=plan.stage;
  const speechContext=narration&&activity&&variants?{narration,activity,variants,shotStartMs:shot.startMs}:undefined;
  const actors=compileSpriteStoryActors(shot,plan,motions,spriteSceneTargets(shot),speechContext),camera=validateSpriteCamera(shot,motions),art=c.artDirection;
  const palette=art?.palette??{background:'#F3DDAA',surface:'#FFF3DB',ink:'#201A15',accent:'#F4CD68'},labels=sceneLabels(config.project.language);
  const planes={background:artLayers(shot,'background','frame'),worldBackground:artLayers(shot,'background','world'),midground:artLayers(shot,'midground'),foreground:artLayers(shot,'foreground'),overlay:artLayers(shot,'overlay')};
  const scope=`[data-composition-id="${shot.id}"]`,selector=(value:string)=>JSON.stringify(`${scope} ${value.replace(/#([a-zA-Z][\w.-]*)/g,(_,id:string)=>`[id=${JSON.stringify(id)}]`)}`);
  const calls=Object.values(planes).flatMap(plane=>plane.calls),foregroundObjects:string[]=[];
  const foregroundParts=new Set(art?.models.filter(model=>model.foregroundSvg!==undefined).map(model=>model.partId));
  const targets=(partId:string,suffix:string)=>[selector(`#object-${v.parts.findIndex(part=>part.id===partId)} ${suffix}`),...(foregroundParts.has(partId)?[selector(`#foreground-object-${v.parts.findIndex(part=>part.id===partId)} ${suffix}`)]:[])];
  const objects=v.parts.map((part,index)=>{
    const x=part.x*width,y=part.y*height,w=part.width*width,h=part.height*height,model=c.models.find(model=>model.partId===part.id)!;
    const fallback=cinematicModel(part,model,w,h),authored=customModelArt(shot,part.id,w,h),glyph=authored??fallback.svg;
    const foreground=customModelForegroundArt(shot,part.id,w,h);
    if(foreground)foregroundObjects.push(`<g id="foreground-object-${index}" data-sourced-foreground="${escapeHtml(part.id)}" transform="translate(${x} ${y})">${foreground}</g>`);
    const anchors=authored?([...authored.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion'))?[{selector:'.motion',...customModelMotionOrigin(shot,part.id)}]:[]):fallback.motionAnchors;
    for(const anchor of anchors)for(const target of targets(part.id,anchor.selector))calls.push(`tl.set(${target},{svgOrigin:${JSON.stringify(`${anchor.x} ${anchor.y}`)}},0);`);
    const label=cameraModelLabel(part,height,width),handle=partAnchor(shot,part.id,'handle',width,height);
    const control=rendersModelControl(shot,part.id)?`<g class="control-turn" transform="translate(${handle.x} ${handle.y})"><circle r="${height*.008}" fill="${palette.surface}"/><path d="M${-height*.006} 0H${height*.006}"/></g>`:'';
    const thermal=part.states?.length?(['hot','cold'] as const).map(state=>`<rect class="thermal-${state}-coat" x="${-w*.36}" y="${-h*.33}" width="${w*.72}" height="${h*.66}" rx="8" fill="${state==='hot'?'#D65332':'#3394C5'}" opacity="0" stroke="none"/>`).join(''):'';
    const text=rendersModelLabel(shot,part.id)?`<g class="model-label"><rect x="${x-w*.56}" y="${label.labelY-label.font}" width="${w*1.12}" height="${label.labelHeight+label.font*.35}" rx="6" fill="${palette.surface}" stroke="none"/><text x="${x}" y="${label.labelY}" text-anchor="middle" fill="${palette.ink}" stroke="none" font-family="${escapeHtml(labels.fontFamily)}" font-size="${label.font}">${label.lines.map((line,j)=>`<tspan x="${x}" dy="${j?label.font*1.15:0}">${escapeHtml(line)}</tspan>`).join('')}</text></g>`:'';
    return `<g id="object-${index}" data-entity-id="${escapeHtml(part.id)}" data-model-variant="${model.variant}" fill="none" stroke="#644931" stroke-width="${height*.003}" stroke-linecap="round" stroke-linejoin="round"><g class="focus-${index}" opacity="0"><ellipse cx="${x}" cy="${y}" rx="${w*.53}" ry="${h*.6}" fill="${palette.accent}" opacity=".35" stroke="none"/></g><g transform="translate(${x} ${y})">${glyph}${thermal}<ellipse class="energy-effect" rx="${w*.4}" ry="${h*.4}" fill="#F0C545" opacity="0" stroke="none"/></g>${control}${text}</g>`;
  }).join('');
  const relations=cinematicRelations(shot,width,height);calls.push(...relations.calls);
  for(const event of v.events){
    const index=v.parts.findIndex(part=>part.id===event.targetId),start=(event.startMs-shot.startMs)/1000,end=(event.endMs-shot.startMs)/1000,span=end-start;
    calls.push(`tl.set(${selector(`.focus-${index}`)},{opacity:1,immediateRender:false},${start});tl.set(${selector(`.focus-${index}`)},{opacity:0,immediateRender:false},${end});`);
    if(event.type==='state')for(const state of ['hot','cold'])for(const target of targets(event.targetId,`.thermal-${state}-coat`))calls.push(`tl.to(${target},{opacity:${event.state===state?.62:0},duration:${Math.min(.28,span)},ease:"sine.inOut"},${start});`);
    for(const target of targets(event.targetId,'.motion')){
      if(event.motion==='rotate')calls.push(`tl.to(${target},{rotation:120,duration:${span},ease:"none"},${start});`);
      if(event.motion==='translate')calls.push(`tl.to(${target},{x:${width*.018},duration:${span/2},ease:"sine.inOut"},${start});tl.to(${target},{x:0,duration:${span/2},ease:"sine.inOut"},${start+span/2});`);
      if(event.motion==='pulse')calls.push(`tl.to(${target},{opacity:.4,duration:${span/2},ease:"sine.inOut"},${start});tl.to(${target},{opacity:1,duration:${span/2},ease:"sine.inOut"},${start+span/2});`);
    }
    if(event.contactRequired&&rendersModelControl(shot,event.contactPartId??event.targetId)){
      const part=v.parts.find(part=>part.id===(event.contactPartId??event.targetId))!,handle=partAnchor(shot,part.id,'handle',width,height);
      const target=selector(`#object-${v.parts.indexOf(part)} .control-turn`);
      calls.push(`tl.set(${target},{svgOrigin:${JSON.stringify(`${handle.x} ${handle.y}`)}},0);tl.to(${target},{rotation:65,duration:.12,ease:"sine.inOut"},${start});`);
    }
  }
  calls.push(actors.js,...cameraTimeline(c.camera,c.performance,`${scope} .camera-rig`));
  if(background){
    const first=cameraMatrixAt(c.camera,plan.stage,plan.durationMs,0),last=cameraMatrixAt(c.camera,plan.stage,plan.durationMs,plan.durationMs);
    calls.push(`tl.set(${selector('.environment')},${JSON.stringify({x:first.x,y:first.y,scale:first.scale,transformOrigin:'0 0',immediateRender:true})},0);`);
    if(JSON.stringify(first)!==JSON.stringify(last))calls.push(`tl.to(${selector('.environment')},${JSON.stringify({x:last.x,y:last.y,scale:last.scale,duration:plan.durationMs/1000,ease:'sine.inOut'})},0);`);
  }
  const viewportId=`${shot.id}.camera-viewport`,top=height*CAMERA_VIEWPORT.top,bottom=height*CAMERA_VIEWPORT.bottom;
  const heading=art?.showHeading===false?'':`<rect width="${width}" height="${top}" fill="${palette.background}"/><text x="${width*.045}" y="${height*.075}" fill="${palette.ink}" font-family="${escapeHtml(labels.fontFamily)}" font-size="${height*.028}">${escapeHtml(labels.heading[v.type])}</text>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Sprite story candidate</title><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="${shot.id}" data-width="${width}" data-height="${height}" data-duration="${plan.durationMs/1000}" data-start="0" data-sprite-status="candidate">${background?`<img class="environment" src="${background}" alt="Story environment"/>`:''}<svg class="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><clipPath id="${viewportId}"><rect x="0" y="${top}" width="${width}" height="${bottom-top}"/></clipPath></defs>${background?'':`<rect width="${width}" height="${height}" fill="${palette.background}"/>`}<g data-stage-plane="background">${planes.background.html}</g><g clip-path="url(#${viewportId})"><g class="camera-rig" data-framing="${c.camera.framing}"><g data-stage-plane="background" data-art-space="world">${planes.worldBackground.html}</g><g data-stage-plane="midground">${planes.midground.html}${relations.html}${objects}</g>${actors.svg}<g data-stage-plane="foreground">${foregroundObjects.join('')}${planes.foreground.html}</g></g></g><g data-stage-plane="overlay">${planes.overlay.html}</g>${heading}</svg></div><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`;
  const environment=background?cameraEnvironmentBounds(c.camera,plan.stage,plan.durationMs):undefined;
  const css=`html,body{margin:0;overflow:hidden;background:${palette.background}}${scope}{position:relative;width:${width}px;height:${height}px;overflow:hidden}${scope} .stage{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}${scope} .environment{position:absolute;object-fit:cover;left:${environment?.left??0}px;top:${environment?.top??0}px;width:${environment?.width??width}px;height:${environment?.height??height}px}`;
  const js=`const tl=gsap.timeline({paused:true});\nwindow.__timelines=window.__timelines||{};\nwindow.__timelines[${JSON.stringify(shot.id)}]=tl;\n${calls.join('\n')}\ntl.to({},{duration:${plan.durationMs/1000}},0);`;
  const files:SceneFiles={files:[{path:'index.html',content:html},{path:'style.css',content:css},{path:'scene.js',content:js}],dependencies:[],notes:[`${SPRITE_SCENE_VERSION}; candidate sprite actors; no skeletal rig`, actors.report.speechSync==='none'?'Baked sprites: speechSync none; production acceptance pending.':`Speech: ${actors.report.speechSync}; binary rest/open only; not phoneme lip-sync; production acceptance pending.`]};
  const geometry:SpriteSceneGeometry={kind:'sprite-actors',controllerVersion:SPRITE_SCENE_VERSION,shotId:shot.id,stageHash:actors.report.stageHash,castHash:actors.report.castHash,
    motions:actors.report.clips.map(clip=>({actorId:clip.actorId,motionId:clip.motionId,fingerprint:clip.fingerprint})),
    ...(actors.report.clips.some(clip=>clip.speech)?{speech:actors.report.clips.flatMap(clip=>clip.speech?[{actorId:clip.actorId,clipId:clip.clipId,variantId:clip.speech.variantId,fingerprint:clip.speech.fingerprint,sheetHash:clip.speech.sheetHash,
      segmentIds:clip.speech.segmentIds,...(clip.speech.audioHash?{audioHash:clip.speech.audioHash}:{}),narrationHash:clip.speech.narrationHash,activityHash:clip.speech.activityHash,scheduleHash:clip.speech.scheduleHash,synchronization:clip.speech.synchronization}]:[])}:{}),
    interactions:actors.report.contacts.map(contact=>{
      const clip=plan.actors.find(actor=>actor.actorId===contact.actorId)!.clips.find(clip=>clip.id===contact.clipId)!;
      return {actorId:contact.actorId,landmark:contact.landmark,type:'sprite-contact',startMs:shot.startMs+clip.startMs,reachMs:shot.startMs+contact.timeMs,endMs:shot.startMs+clip.endMs,contactMs:shot.startMs+contact.timeMs,partId:contact.targetId,target:contact.target,measured:contact.measured,errorPx:contact.errorPx,tolerancePx:contact.maxErrorPx};
    })};
  return {files,geometry,report:{...actors.report,sceneProducer:SPRITE_SCENE_VERSION,camera}};
}
