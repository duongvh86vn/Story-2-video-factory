import type { SceneFiles, Shot } from '../../packages/core/schemas.js';
import { escapeHtml } from '../../packages/core/utils.js';
import { hostSvg, type HostProfile, type HostRig } from '../../packages/host/index.js';
import { hostController, partAnchor, type HostGeometry } from '../../packages/host/controller.js';
import type { SpeechActivity } from '../../packages/voice/index.js';
import type { VisualStyle } from '../styles/index.js';
import { EXPLAINER_RECIPES } from '../../packages/explainer/recipes.js';
import type { Visualization } from '../../packages/explainer/schemas.js';

export const explainerRecipes = Object.entries(EXPLAINER_RECIPES).map(([method,id]) => ({ id, version: 2, sceneTypes: method === 'evolution' || method === 'event-sequence' ? ['timeline'] : method === 'comparison' ? ['comparison'] : ['technical-diagram'], description: `Animated explainer host with grounded ${method} visualization and target anchors.`, duration: { min: .001, max: 300 } }));
export function component(kind: Visualization['parts'][number]['kind'], w: number, h: number, accent: string, panel: string): string {
  const circle = `<circle cx="0" cy="0" r="${Math.min(w,h)*.39}"/><path d="M${-w*.25} 0H${w*.25}M0 ${-h*.3}V${h*.3}M${-w*.2} ${-h*.2}L${w*.2} ${h*.2}M${-w*.2} ${h*.2}L${w*.2} ${-h*.2}"/>`;
  switch (kind) {
    case 'condenser': return `<rect x="${-w*.35}" y="${-h*.4}" width="${w*.7}" height="${h*.8}" rx="${h*.1}" fill="${panel}"/><path d="M${-w*.5} ${-h*.2}H${w*.18}V0H${-w*.18}V${h*.2}H${w*.5}"/><path d="M${-w*.1} ${-h*.52}L0 ${-h*.62}L${w*.1} ${-h*.52}"/>`;
    case 'boiler': return `<rect x="${-w*.4}" y="${-h*.4}" width="${w*.8}" height="${h*.75}" rx="${h*.18}" fill="${panel}"/><path d="M${-w*.32} ${h*.07}Q${-w*.1} ${-h*.03} 0 ${h*.07}T${w*.32} ${h*.07}"/><path d="M${w*.22} ${-h*.4}V${-h*.65}H${w*.45}"/><path d="M${-w*.15} ${h*.5}l${w*.12} ${-h*.14}l${w*.1} ${h*.14}"/>`;
    case 'cylinder': return `<rect x="${-w*.35}" y="${-h*.32}" width="${w*.7}" height="${h*.64}" rx="8" fill="${panel}"/><path d="M${-w*.42} 0H${w*.42}"/>`;
    case 'piston': return `<rect x="${-w*.45}" y="${-h*.3}" width="${w*.9}" height="${h*.6}" fill="${panel}"/><g class="motion"><rect x="${-w*.2}" y="${-h*.26}" width="${w*.12}" height="${h*.52}" fill="${accent}"/><path d="M${-w*.08} 0H${w*.35}"/></g>`;
    case 'wheel': case 'gear': return `<g class="motion">${circle}${kind==='gear'?Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<path d="M${Math.cos(a)*Math.min(w,h)*.39} ${Math.sin(a)*Math.min(w,h)*.39}L${Math.cos(a)*Math.min(w,h)*.47} ${Math.sin(a)*Math.min(w,h)*.47}"/>`;}).join(''):''}</g>`;
    case 'car': return `<g class="motion"><path d="M${-w*.45} ${h*.1}V${-h*.1}L${-w*.2} ${-h*.15}L${-w*.08} ${-h*.4}H${w*.2}L${w*.34} ${-h*.12}L${w*.45} ${-h*.05}V${h*.1}Z" fill="${panel}"/><path d="M${-w*.05} ${-h*.33}V${-h*.12}H${w*.26}L${w*.15} ${-h*.33}Z"/><circle cx="${-w*.26}" cy="${h*.13}" r="${h*.13}"/><circle cx="${w*.27}" cy="${h*.13}" r="${h*.13}"/></g>`;
    case 'engine': return `<rect x="${-w*.35}" y="${-h*.25}" width="${w*.7}" height="${h*.6}" rx="${h*.06}" fill="${panel}"/><path d="M${-w*.18} ${-h*.25}V${-h*.4}H${w*.18}V${-h*.25}M${w*.35} 0H${w*.5}"/><g class="motion"><path d="M${-w*.2} ${h*.02}H${w*.2}M${-w*.2} ${h*.16}H${w*.2}"/></g>`;
    case 'battery': return `<rect x="${-w*.35}" y="${-h*.32}" width="${w*.7}" height="${h*.65}" rx="${h*.05}" fill="${panel}"/><path d="M${-w*.18} ${-h*.32}V${-h*.43}H${-w*.07}V${-h*.32}M${w*.07} ${-h*.32}V${-h*.43}H${w*.18}V${-h*.32}M${-w*.22} 0H${-w*.08}M${w*.06} 0H${w*.23}M${w*.145} ${-h*.09}V${h*.09}"/>`;
    case 'pipe': return `<path d="M${-w*.4} ${h*.15}H0V${-h*.25}H${w*.4}" stroke-width="${h*.18}"/><path d="M${-w*.4} ${h*.15}H0V${-h*.25}H${w*.4}" stroke="${panel}" stroke-width="${h*.1}"/>`;
    case 'flow': return `<g class="motion">${[-.23,0,.23].map(x=>`<path d="M${w*x} ${h*.3}q${-w*.1} ${-h*.15} 0 ${-h*.3}t0 ${-h*.3}"/>`).join('')}</g>`;
    case 'lever': return `<g class="motion"><path d="M${-w*.35} ${h*.15}L${w*.35} ${-h*.25}"/><circle cx="0" cy="0" r="${h*.09}"/></g><path d="M0 0L${-w*.15} ${h*.38}H${w*.15}Z"/>`;
    case 'marker': case 'stage': return `<circle cx="0" cy="0" r="${Math.min(w,h)*.26}" fill="${panel}"/><path d="M0 ${-h*.12}V${h*.12}M${-w*.06} 0H${w*.06}"/>`;
    default: return `<rect x="${-w*.3}" y="${-h*.28}" width="${w*.6}" height="${h*.56}" rx="${h*.12}" fill="${panel}"/><path d="M${-w*.15} 0H${w*.15}"/>`;
  }
}
export function renderExplainer(shot: Shot, profile: HostProfile, rig: HostRig, activity: SpeechActivity, style: VisualStyle, width: number, height: number, simplified = false): { files: SceneFiles; geometry: HostGeometry } {
  const v = shot.visualization, host = shot.host;
  if (!v || !host || shot.recipeId !== EXPLAINER_RECIPES[v.type]) throw new Error(`${shot.id}: explainer recipe contract missing`);
  const scope = `[data-composition-id="${shot.id}"]`, target = (s: string) => JSON.stringify(`${scope} ${s}`), duration = (shot.endMs - shot.startMs)/1000;
  const controller = hostController(shot,profile,rig,width,height,activity), motion: string[] = [], font = Math.max(12,height*.023), stroke = Math.max(2,height*.003);
  const parts = v.parts.map((p,i) => {
    const x=p.x*width,y=p.y*height,w=p.width*width,h=p.height*height,handle=partAnchor(shot,p.id,'handle',width,height);
    const labelWords=p.label.split(/\s+/), labels:string[]=[]; let line='';
    for(const word of labelWords){if((line?line.length+word.length+1:word.length)>Math.max(12,Math.floor(w/font*1.6))&&line){labels.push(line);line='';}line=line?`${line} ${word}`:word;}if(line)labels.push(line);
    if(p.y+p.height*.55+(labels.length-1)*font*1.15/height+font/height>.79)throw new Error(`${shot.id}: model label crosses subtitle clearance; move or resize the model`);
    if(labels.length>4)throw new Error(`${shot.id}: model label too long for safe layout; shorten source excerpt`);
    return `<g id="part-${i}" class="model-part"><g class="highlight"><circle cx="${x}" cy="${y}" r="${Math.min(w,h)*.5}"/></g><g transform="translate(${x} ${y})">${component(p.kind,w,h,style.accent,style.panel)}</g><circle class="handle" cx="${handle.x}" cy="${handle.y}" r="${height*.006}"/><text class="part-label" x="${x}" y="${y+h*.55}">${labels.map((text,j)=>`<tspan x="${x}" dy="${j?font*1.15:0}">${escapeHtml(text)}</tspan>`).join('')}</text></g>`;
  }).join('');
  const relations=v.relations.map((r,i)=>{
    const a=partAnchor(shot,r.from,'center',width,height),b=partAnchor(shot,r.to,'center',width,height),d=Math.hypot(b.x-a.x,b.y-a.y),ux=(b.x-a.x)/d,uy=(b.y-a.y)/d;
    return `<g class="relation" id="relation-${i}"><path d="M${a.x} ${a.y}L${b.x} ${b.y}M${b.x-ux*14-uy*7} ${b.y-uy*14+ux*7}L${b.x} ${b.y}L${b.x-ux*14+uy*7} ${b.y-uy*14-ux*7}"/></g>`;
  }).join('');
  let methodGraphic='';
  if(v.type==='evolution'||v.type==='event-sequence'||v.type==='process'){
    const rows=[...new Set(v.parts.map(p=>p.y))];
    methodGraphic=rows.map(y=>`<path class="method-rail" d="M${width*.32} ${height*(y+.015)}H${width*.93}"/>`).join('');
  }else if(v.type==='comparison')methodGraphic=`<path class="method-rail" d="M${width*.65} ${height*.19}V${height*.73}"/>`;
  else if(v.type==='question')methodGraphic=`<text class="question-mark" x="${width*.22}" y="${height*.26}">?</text>`;
  else if(v.type==='summary')methodGraphic=v.parts.map(p=>`<path class="method-rail" d="M${width*(p.x-p.width*.3)} ${height*(p.y-p.height*.7)}l${height*.009} ${height*.009}l${height*.017} ${-height*.022}"/>`).join('');
  for(const [i,p] of v.parts.entries()){
    motion.push(`tl.set(${target(`#part-${i} .highlight`)},{opacity:0},0);`);
    if(['piston','wheel','gear','car','engine','flow','lever'].includes(p.kind))motion.push(`tl.set(${target(`#part-${i} .motion`)},{svgOrigin:${JSON.stringify(`${p.x*width} ${p.y*height}`)}},0);`);
    if(v.type==='breakdown'||v.type==='process'||v.type==='event-sequence')motion.push(`tl.fromTo(${target(`#part-${i}`)},{opacity:.25},{opacity:1,duration:${Math.min(.3,duration*.15)},immediateRender:false},${duration*i/v.parts.length});`);
  }
  for(const e of v.events){
    const i=v.parts.findIndex(p=>p.id===e.targetId),start=(e.startMs-shot.startMs)/1000,end=(e.endMs-shot.startMs)/1000,span=end-start,p=v.parts[i]!;
    motion.push(`tl.set(${target(`#part-${i} .highlight`)},{opacity:.18},${start});tl.set(${target(`#part-${i} .highlight`)},{opacity:0},${end});`);
    if(e.type==='reveal')motion.push(`tl.fromTo(${target(`#part-${i}`)},{opacity:0},{opacity:1,duration:${Math.min(.3,span)},immediateRender:false},${start});`);
    if(e.motion==='rotate')motion.push(`tl.to(${target(`#part-${i} .motion`)},{rotation:${simplified?45:150},duration:${span},ease:"none",transformOrigin:"50% 50%"},${start});`);
    if(e.motion==='translate'){
      motion.push(`tl.to(${target(`#part-${i} .motion`)},{x:${p.width*width*.13},duration:${span/2},ease:"sine.inOut"},${start});`);
      motion.push(`tl.to(${target(`#part-${i} .motion`)},{x:0,duration:${span/2},ease:"sine.inOut"},${start+span/2});`);
    }
    if(e.motion==='pulse'){
      motion.push(`tl.to(${target(`#part-${i} .motion`)},{opacity:.35,y:${-height*.012},duration:${span/2}},${start});`);
      motion.push(`tl.to(${target(`#part-${i} .motion`)},{opacity:1,y:0,duration:${span/2}},${start+span/2});`);
    }
  }
  const hostGraphic=hostSvg(profile,'idle',true).replace('<svg ',`<svg width="${rig.viewBox[2]*height*.36/rig.viewBox[3]}" height="${height*.36}" `);
  const title=shot.visualization?.parts.map(p=>p.label).join(' · ').slice(0,100)??'';
  const css=`html,body{margin:0;overflow:hidden;background:${style.background}}${scope}{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${style.background};font-family:${style.bodyFont}}${scope} .explainer-stage{width:100%;height:100%;overflow:hidden;stroke:${style.accent};stroke-width:${stroke};fill:none;stroke-linecap:round;stroke-linejoin:round}${scope} .highlight{opacity:0}${scope} .highlight circle{fill:${style.accent};stroke:none}${scope} .part-label{fill:${style.foreground};stroke:none;text-anchor:middle;font:${font}px Arial}${scope} .scene-title{fill:${style.foreground};stroke:none;font:${height*.032}px Arial}${scope} .provenance{fill:${style.muted};stroke:none;font:${height*.016}px Arial}${scope} .handle{fill:${style.accent};stroke:${style.panel}}${scope} .pointer{opacity:0;stroke:${style.accent};stroke-width:${stroke};fill:${style.accent}}${scope} .relation{opacity:.55;stroke:${style.muted}}${scope} .method-rail{stroke:${style.muted};opacity:.28}${scope} .question-mark{fill:${style.accent};stroke:none;font:${height*.09}px Arial}`;
  const cameraScale=shot.camera.shotSize==='close'?1.02:shot.camera.shotSize==='medium'?1.01:1;
  const cameraVars:Record<string,number|string>={duration,ease:'sine.inOut'};
  if(shot.camera.movement==='push-in')cameraVars.scale=1.02;
  if(shot.camera.movement==='pull-out')cameraVars.scale=1;
  if(shot.camera.movement.startsWith('pan-'))cameraVars.x=width*.005*(shot.camera.movement==='pan-left'?-1:1);
  const camera=`tl.set(${target('.camera-rig')},{scale:${shot.camera.movement==='pull-out'?1.02:cameraScale},svgOrigin:${JSON.stringify(`${width*.5} ${height*.4}`)}},0);${['locked','static'].includes(shot.camera.movement)?'':`tl.to(${target('.camera-rig')},${JSON.stringify(cameraVars)},0);`}`;
  const js=`const tl=gsap.timeline({paused:true});\nwindow.__timelines=window.__timelines||{};\nwindow.__timelines[${JSON.stringify(shot.id)}]=tl;\n${camera}\n${controller.js}\n${motion.join('\n')}\ntl.to({},{duration:${duration}},0);\n`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="${shot.id}" data-width="${width}" data-height="${height}" data-duration="${duration}" data-start="0"><svg class="explainer-stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><text class="scene-title" x="${width*.055}" y="${height*.08}">${escapeHtml(title)}</text><text class="provenance" x="${width*.055}" y="${height*.12}">Minh họa khái niệm</text><g class="camera-rig">${methodGraphic}${relations}${parts}<g class="host-carrier" transform="translate(${width*.055} ${height*.39})" opacity="${host.presence==='absent'?0:1}">${hostGraphic}</g>${controller.pointers}</g></svg></div><script>window.__timelines=window.__timelines||{};</script><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`;
  return {files:{files:[{path:'index.html',content:html},{path:'style.css',content:css},{path:'scene.js',content:js}],dependencies:[],notes:[`${shot.recipeId} v2; ${profile.id} v${profile.version}`,`Speech synchronization: ${activity.method}; not phoneme lip-sync.`,simplified?'Simplified model motion; source parts, relations, host and contact preserved.':'Conceptual visualization; not archival evidence.']},geometry:controller.geometry};
}
