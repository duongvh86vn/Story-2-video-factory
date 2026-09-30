import type { Shot, SceneFiles } from '../../packages/core/schemas.js';
import type { VisualStyle } from '../styles/index.js';
import { escapeHtml } from '../../packages/core/utils.js';
import { svg, sourceLabels } from '../components/index.js';
import { transitionTween } from '../transitions/index.js';

export interface ShotRecipe { id: string; version: number; sceneTypes: string[]; description: string; duration: { min: number; max: number }; }
export const recipes: readonly ShotRecipe[] = [
  {id:'historical-map',version:1,sceneTypes:['map'],description:'Schematic route with named locations, moving marker and progressive route reveal.',duration:{min:2,max:8}},
  {id:'patent-reveal',version:1,sceneTypes:['document-highlight','technical-diagram','schematic','document'],description:'Document or schematic on paper, line reveal and region highlight.',duration:{min:2,max:7}},
  {id:'newspaper-headline',version:1,sceneTypes:['newspaper','quote','kinetic-text','kinetic-typography'],description:'Editorial headline, pull quote and independently timed rule/column reveal.',duration:{min:2,max:6}},
  {id:'portrait-parallax',version:1,sceneTypes:['character-scene','historical-reconstruction','archival-photo','photo-parallax','object-hero','macro-detail'],description:'Approved character or photograph with layered framing and slow push-in.',duration:{min:2,max:8}},
  {id:'factory-conveyor',version:1,sceneTypes:['factory-process','process-diagram'],description:'Process stations, material packets and staggered step emphasis.',duration:{min:3,max:8}},
  {id:'exploded-machine',version:1,sceneTypes:['exploded-view','technical-cutaway'],description:'Separated schematic assembly with expanding layers and rotating shaft.',duration:{min:3,max:8}},
  {id:'timeline-zoom',version:1,sceneTypes:['timeline'],description:'Chronology rail with successive source labels and marker zoom.',duration:{min:3,max:8}},
  {id:'before-after',version:1,sceneTypes:['before-after','comparison','data-chart','ui-demo','abstract-transition'],description:'Two sourced views with comparison divider and sequential emphasis.',duration:{min:2,max:7}}
];
export function selectRecipe(shot: Shot): ShotRecipe | undefined {
  if (shot.recipeId) return recipes.find(recipe=>recipe.id === shot.recipeId);
  return recipes.find(recipe=>recipe.sceneTypes.includes(shot.sceneType));
}
export interface RecipeAsset { id:string; type:string; path:string; characterId?:string; }
export function renderRecipe(recipe: ShotRecipe, shot: Shot, style: VisualStyle, width: number, height: number, assets: RecipeAsset[]): SceneFiles {
  const title=escapeHtml(shot.textOnScreen ?? ''), description=escapeHtml(shot.visualDescription.slice(0,220).trim() + (shot.visualDescription.length>220 ? '…' : ''));
  const duration=(shot.endMs-shot.startMs)/1000, scope=`[data-composition-id="${shot.id}"]`;
  const targets=(selector:string)=>JSON.stringify(`${scope} ${selector}`);
  const labels=sourceLabels(shot.visualDescription,shot.subject);
  const text=(value:string)=>escapeHtml(value.slice(0,130));
  const imageAssets=assets.filter(asset=>!['music','sfx','video'].includes(asset.type));
  const image=(asset:RecipeAsset|undefined,className:string)=>asset ? `<img class="${className}" src="${escapeHtml(asset.path)}" alt="${escapeHtml(shot.subject)}">` : '';
  let content='', motion='';
  switch(recipe.id) {
    case 'historical-map': {
      content=svg(`<path class="land" d="M80 120L270 70 360 140 520 90 740 125 910 65 1100 210 1040 410 850 560 610 510 440 590 230 460 100 310Z"/><path class="route" d="M220 360Q550 80 940 330" fill="none"/><circle class="traveler" cx="220" cy="360" r="18"/>${labels.slice(0,3).map((value,i)=>`<circle cx="${220+i*360}" cy="${i===1?190:350}" r="10"/><text x="${160+i*360}" y="${i===1?150:415}">${text(value)}</text>`).join('')}`);
      motion=`tl.from(${targets('.route')},{strokeDashoffset:1400,duration:${duration*.75}},0.1);tl.to(${targets('.traveler')},{x:720,y:-30,duration:${duration*.8},ease:"sine.inOut"},0.1);`;break;
    }
    case 'patent-reveal': {
      content=`<div class="paper">${image(imageAssets[0],'document-image') || svg('<rect x="180" y="150" width="840" height="320" rx="12" fill="none"/><circle cx="600" cy="310" r="110" fill="none"/><path class="ink" d="M180 310H1020M600 150V470M300 220H900M300 400H900" fill="none"/>')}<div class="highlight"></div><div class="document-note">${description}</div></div>`;
      motion=`tl.from(${targets('.paper')},{y:45,opacity:0,duration:${Math.min(.6,duration*.2)}},0);tl.from(${targets('.highlight')},{scaleX:0,duration:${duration*.35}},${duration*.2});`;break;
    }
    case 'newspaper-headline': {
      content=`<div class="newspaper"><div class="masthead">${text(shot.subject)}</div><div class="rule"></div><blockquote>${title}</blockquote><div class="columns">${labels.map(value=>`<p>${text(value)}</p>`).join('')}</div></div>`;
      motion=`tl.from(${targets('.rule')},{scaleX:0,duration:${duration*.2}},0);tl.from(${targets('blockquote')},{y:35,opacity:0,duration:${duration*.25}},${duration*.1});tl.from(${targets('.columns p')},{opacity:0,y:20,stagger:${duration*.07},duration:${duration*.25}},${duration*.3});`;break;
    }
    case 'portrait-parallax': {
      const videoAsset=assets.find(asset=>asset.type==='video');
      const media=videoAsset?`<video class="portrait-image clip" src="${escapeHtml(videoAsset.path)}" data-start="0" data-duration="${duration}" data-track-index="1" muted="" playsinline="" preload="auto"></video>`:image(imageAssets.find(a=>a.characterId)||imageAssets[0],'portrait-image');
      content=`<div class="portrait-back"></div><div class="portrait-frame">${media || svg('<circle cx="600" cy="220" r="100"/><path d="M360 590V440Q600 290 840 440V590Z"/>')}<div class="portrait-caption">${description}</div></div>`;
      motion=`tl.to(${targets('.portrait-frame')},{scale:1.055,x:12,duration:${duration},ease:"sine.inOut"},0);tl.to(${targets('.portrait-back')},{x:-18,duration:${duration}},0);`;break;
    }
    case 'factory-conveyor': {
      content=svg(`<path class="belt" d="M60 490H1140"/>${labels.map((value,i)=>`<g class="station"><rect x="${60+i*280}" y="180" width="230" height="210" rx="12"/><text x="${80+i*280}" y="270">${text(value.slice(0,25))}</text><path d="M${175+i*280} 390V470"/></g>`).join('')}<g class="packet"><rect x="80" y="425" width="70" height="55" rx="8"/></g><path class="flow-arrow" d="M70 540H1100M1070 515L1100 540 1070 565"/>`);
      motion=`tl.to(${targets('.packet')},{x:950,duration:${duration*.85},ease:"none"},0);tl.from(${targets('.station')},{opacity:.25,stagger:${duration*.15},duration:${duration*.2}},0.1);`;break;
    }
    case 'exploded-machine': {
      content=svg('<g class="housing"><rect x="350" y="140" width="500" height="360" rx="40" fill="none"/><path d="M380 175V465M820 175V465"/></g><g class="rotor"><circle cx="600" cy="320" r="120" fill="none"/><path d="M500 260L700 380M500 380L700 260M600 200V440"/></g><g class="shaft"><rect x="200" y="305" width="800" height="30" rx="15"/></g><path class="callout" d="M850 170H1030V95" fill="none"/>');
      motion=`tl.to(${targets('.housing')},{x:-110,duration:${duration*.35}},${duration*.1});tl.to(${targets('.shaft')},{x:120,duration:${duration*.35}},${duration*.1});tl.to(${targets('.rotor')},{rotation:180,transformOrigin:"50% 50%",duration:${duration*.7},ease:"none"},${duration*.1});`;break;
    }
    case 'timeline-zoom': {
      content=`<div class="time-rail"></div><div class="timeline-cards">${labels.map((value,i)=>`<div class="time-card"><span class="ordinal">${i+1}</span><p>${text(value)}</p></div>`).join('')}</div><div class="time-marker"></div>`;
      motion=`tl.from(${targets('.time-card')},{opacity:0,y:35,stagger:${duration*.15},duration:${duration*.2}},0);tl.to(${targets('.time-marker')},{x:${width*.65},duration:${duration*.8},ease:"none"},${duration*.1});`;break;
    }
    default: {
      content=`<div class="comparison-panel left">${image(imageAssets[0],'comparison-image')}<p>${text(labels[0]||shot.subject)}</p></div><div class="comparison-panel right">${image(imageAssets[1]||imageAssets[0],'comparison-image')}<p>${text(labels[1]||shot.visualDescription)}</p></div><div class="divider"></div>`;
      motion=`tl.from(${targets('.left')},{x:-30,opacity:0,duration:${duration*.25}},0);tl.from(${targets('.right')},{x:30,opacity:0,duration:${duration*.25}},${duration*.25});tl.from(${targets('.divider')},{scaleY:0,duration:${duration*.3}},${duration*.1});`;
    }
  }
  const scale=width/1920, font=Math.round(58*scale), body=Math.round(32*scale), padding=Math.round(90*scale);
  const css=`html,body{margin:0;overflow:hidden;background:${style.background}}${scope}{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${style.background};color:${style.foreground};font-family:${style.bodyFont};box-sizing:border-box}${scope} *{box-sizing:border-box}${scope} .scene-title{position:absolute;left:${padding}px;right:${padding}px;top:${Math.round(42*scale)}px;margin:0;max-height:18%;overflow:hidden;overflow-wrap:anywhere;font-size:${font}px;font-family:${style.titleFont};line-height:1.13}${scope} .visual{position:absolute;inset:22% 5% 15%;overflow:hidden}${scope} .graphic{width:100%;height:100%;fill:${style.accent};stroke:${style.accent};stroke-width:4}${scope} text{font:24px Arial;stroke:none;fill:${style.foreground}}${scope} .land{fill:${style.panel};stroke:${style.muted}}${scope} .route{stroke-dasharray:1400;stroke:${style.accent};stroke-width:8}${scope} .paper,${scope} .newspaper{height:100%;padding:3%;background:${style.panel};border-radius:${style.borderRadius}px;overflow:hidden}${scope} .paper{position:relative}${scope} .paper .graphic{height:80%}${scope} .document-image{width:100%;height:80%;object-fit:contain}${scope} .highlight{position:absolute;left:15%;right:15%;top:64%;height:5%;background:${style.accent};opacity:.35;transform-origin:left}${scope} .document-note{font-size:${body}px;line-height:1.25;max-height:22%;overflow:hidden}${scope} .masthead{font:${font}px ${style.titleFont};white-space:nowrap;overflow:hidden}${scope} .rule{height:4px;background:${style.accent};margin:2% 0;transform-origin:left}${scope} blockquote{font:${font}px ${style.titleFont};margin:0;max-height:42%;overflow:hidden}${scope} .columns{display:flex;gap:4%;font-size:${body}px;line-height:1.3}${scope} .columns p{flex:1;max-height:${Math.round(height*.23)}px;overflow:hidden}${scope} .portrait-back{position:absolute;inset:10%;background:${style.panel};border:2px solid ${style.accent}}${scope} .portrait-frame{position:absolute;inset:3% 10%;display:flex;align-items:center;gap:5%;overflow:hidden}${scope} .portrait-image{height:95%;max-width:65%;object-fit:contain}${scope} .portrait-frame .graphic{width:50%}${scope} .portrait-caption{flex:1;font-size:${body}px;line-height:1.35;max-height:80%;overflow:hidden}${scope} .station rect{fill:${style.panel}}${scope} .station text{font-size:22px}${scope} .time-rail{position:absolute;left:5%;right:5%;top:35%;height:4px;background:${style.accent}}${scope} .timeline-cards{position:absolute;inset:20% 3% 0;display:flex;gap:4%}${scope} .time-card{flex:1;overflow:hidden}${scope} .ordinal{display:block;background:${style.accent};color:${style.background};border-radius:50%;width:${font}px;height:${font}px;text-align:center;font-size:${body}px;line-height:${font}px}${scope} .time-card p{font-size:${body}px;line-height:1.3}${scope} .time-marker{position:absolute;left:10%;top:33%;height:12px;width:12px;border-radius:50%;background:${style.foreground}}${scope} .comparison-panel{position:absolute;top:5%;bottom:5%;width:44%;background:${style.panel};padding:3%;border-radius:${style.borderRadius}px;overflow:hidden}${scope} .left{left:3%}${scope} .right{right:3%}${scope} .comparison-panel p{font-size:${body}px;line-height:1.3;overflow-wrap:anywhere}${scope} .comparison-image{width:100%;height:65%;object-fit:contain}${scope} .divider{position:absolute;left:50%;top:8%;bottom:8%;width:3px;background:${style.accent}}`;
  const transitionDuration=Math.min(.3,duration*.12);
  const movement=shot.camera.movement.toLowerCase(), size=shot.camera.shotSize.toLowerCase();
  const framing=/macro|extreme/.test(size)?1.14:/close/.test(size)?1.09:/medium/.test(size)?1.03:1;
  const angle=shot.camera.angle.toLowerCase(), tilt=/overhead|trên cao/.test(angle)?-1.5:/low|góc thấp/.test(angle)?1:0;
  const cameraVars:Record<string,number|string>={duration,ease:'sine.inOut'};
  if(/pull|zoom.out|lùi/.test(movement)) cameraVars.scale=Math.max(.98,framing-.04);
  else if(/push|zoom|tiến/.test(movement)) cameraVars.scale=framing+.045;
  else if(/track|pan|lateral|ngang/.test(movement)) cameraVars.x=(/right|phải/.test(movement)?-1:1)*Math.round(width*.018);
  else if(/arc|orbit|vòng/.test(movement)) {cameraVars.rotation=tilt+1.5;cameraVars.x=Math.round(width*.008);}
  const camera=`tl.set(${targets('.camera-rig')},${JSON.stringify({scale:framing,rotation:tilt})},0);${shot.intentionalStatic || /static|locked|tĩnh/.test(movement)?'':`tl.to(${targets('.camera-rig')},${JSON.stringify(cameraVars)},0);`}`;
  const js=`const tl=gsap.timeline({paused:true});\nwindow.__timelines=window.__timelines||{};\nwindow.__timelines[${JSON.stringify(shot.id)}]=tl;\n${camera}\n${shot.intentionalStatic ? '' : motion}\n${transitionTween(shot.transitionIn,`${scope} .visual`,transitionDuration,0,true)}\n${transitionTween(shot.transitionOut,`${scope} .visual`,transitionDuration,Math.max(0,duration-transitionDuration),false)}\ntl.to({}, {duration:${duration}},0);\n`;
  const cameraCss=`${scope} .camera-rig{position:absolute;inset:0;transform-origin:50% 50%}`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(shot.subject)}</title><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="${shot.id}" data-width="${width}" data-height="${height}" data-duration="${duration}" data-start="0">${title?`<h1 class="scene-title">${title}</h1>`:''}<div class="camera-rig"><div class="visual">${content}</div></div></div><script>window.__timelines=window.__timelines||{};</script><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`;
  return {files:[{path:'index.html',content:html},{path:'style.css',content:css+cameraCss},{path:'scene.js',content:js}],dependencies:[],notes:[`${recipe.id} v${recipe.version}`, 'Schematic graphics are visualizations, not archival evidence.']};
}
