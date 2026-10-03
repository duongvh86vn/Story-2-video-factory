import type { HostProfile } from '../host/schemas.js';
import type { SpeechActivity } from '../voice/schemas.js';
import type { SceneFiles } from '../core/schemas.js';
import type { PerformancePlan,SeatSupport } from './schemas.js';
import { compilePerformance } from './compiler.js';
import { performanceSvg } from './rig.js';
import {seatSvg} from '../stage/seats.js';

export interface PropSupport {x:number;y:number;width:number;}
export function performanceScene(plan:PerformancePlan,profile:HostProfile,activity:SpeechActivity,background?:string,supports?:PropSupport[],seats?:{items:SeatSupport[];palette:{surface:string;ink:string;accent:string}}):{files:SceneFiles;compiled:ReturnType<typeof compilePerformance>} {
  const compiled=compilePerformance(plan,profile,activity),scope=`[data-composition-id="${plan.id}"]`,{width,height}=plan.stage;
  const seatArt=(seats?.items??plan.supports??[]).map(seat=>seatSvg(seat,plan.stage.groundY,seats?.palette??{surface:'#FFF3DB',ink:'#201A15',accent:'#F4CD68'})).join('');
  const props=plan.props.map(p=>`<g id="prop-${p.id}"><rect x="-12" y="-11" width="24" height="22" rx="5" fill="#C39150" stroke="#674528" stroke-width="2"/><path d="M-6 -5H6" stroke="#F4D7A5" stroke-width="3"/></g>`).join('');
  const tables=supports?supports.map((p,i)=>`<g id="stand-${i}" stroke="#5F472F" stroke-width="5"><path d="M${p.x-p.width/2} ${p.y}H${p.x+p.width/2}M${p.x-p.width*.4} ${p.y}V${plan.stage.groundY}M${p.x+p.width*.4} ${p.y}V${plan.stage.groundY}"/></g>`).join(''):
    plan.props.flatMap(p=>[p.origin,...(p.destination?[p.destination]:[])]).map((p,i)=>`<g id="stand-${i}" stroke="#5F472F" stroke-width="5"><path d="M${p.x-23} ${p.y+14}H${p.x+23}M${p.x-18} ${p.y+14}V${plan.stage.groundY}M${p.x+18} ${p.y+14}V${plan.stage.groundY}"/></g>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Character acting preview</title><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="${plan.id}" data-width="${width}" data-height="${height}" data-duration="${plan.durationMs/1000}" data-start="0">${background?`<img class="environment" src="${background}" alt="Xưởng minh họa"/>`:''}<svg class="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="stage-light" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#F3DDAA"/><stop offset="1" stop-color="#A38B65"/></linearGradient></defs>${background?'':`<rect width="${width}" height="${height}" fill="url(#stage-light)"/><path d="M0 ${plan.stage.groundY}H${width}" stroke="#8F7852" stroke-width="2"/>`}<ellipse id="ground-shadow" cx="0" cy="0" rx="54" ry="10" fill="#352D26" opacity="0.18"/>${tables}${performanceSvg(profile)}${props}</svg></div><script>window.__timelines=window.__timelines||{};</script><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`;
  const js=`const tl=gsap.timeline({paused:true});\nwindow.__timelines=window.__timelines||{};\nwindow.__timelines[${JSON.stringify(plan.id)}]=tl;\n${compiled.js}\ntl.to({},{duration:${plan.durationMs/1000}},0);`;
  const css=`html,body{margin:0;overflow:hidden;background:#C4A878}${scope}{position:relative;width:${width}px;height:${height}px;overflow:hidden}${scope} .environment{position:absolute;width:100%;height:100%;object-fit:cover}${scope} .stage{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}`;
  return {compiled,files:{files:[{path:'index.html',content:html.replace('<ellipse id="ground-shadow"',`${seatArt?`<g data-stage-plane="midground">${seatArt}</g>`:''}<ellipse id="ground-shadow"`)},{path:'style.css',content:css},{path:'scene.js',content:js}],dependencies:[],notes:['Performance benchmark, not a final narrative video.', 'Audio-activity mouth; no phoneme lip-sync.']}};
}
