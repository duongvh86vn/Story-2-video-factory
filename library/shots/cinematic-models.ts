import type { Shot } from '../../packages/core/schemas.js';
import type { CinematicModel } from '../../packages/director/schemas.js';
import { escapeHtml } from '../../packages/core/utils.js';
import { fold } from '../../packages/explainer/plan.js';
import { steamComponentLabels } from '../../packages/explainer/configurations.js';
import { component } from './explainer.js';
import type {PropMotionFrame} from '../../packages/director/prop-motion.js';
import {boundProp} from '../../packages/director/props.js';

export const CINEMATIC_MODEL_VERSION='cinematic-models-2.2.2';
type Part=NonNullable<Shot['visualization']>['parts'][number];
export interface ModelIllustration {svg:string;motionAnchors:Array<{selector:string;x:number;y:number}>;}

/** A narrated feature diagram, not a claim of an authentic historical reconstruction. */
export function cinematicModel(part:Part,model:CinematicModel,w:number,h:number):ModelIllustration {
  if(model.variant==='steam-old')return {svg:`<g data-configuration="old-cylinder"><g data-config-component="cooled-cylinder">${component('cylinder',w*.72,h*.66,'#237CA6','#BBDDED')}<path d="M0 ${-h*.28}V${-h*.46}M${-w*.05} ${-h*.32}L${w*.05} ${-h*.42}M${-w*.05} ${-h*.42}L${w*.05} ${-h*.32}" stroke="#237CA6"/></g></g>`,motionAnchors:[]};
  if(model.variant==='steam-split'){
    const font=h*.11;
    const labels=steamComponentLabels([...part.sourceRefs,...model.sourceRefs]);
    const label=(text:string)=>`<rect x="${-w*.21}" y="${h*.42-font}" width="${w*.42}" height="${font*1.35}" rx="3" fill="#FFF3DB" stroke="none"/><text x="0" y="${h*.42}" text-anchor="middle" fill="#201A15" stroke="none" font-family="Arial" font-size="${font}">${escapeHtml(text)}</text>`;
    return {svg:`<g data-configuration="separate-condenser"><g data-config-component="hot-cylinder" transform="translate(${-w*.24} ${-h*.06})">${component('cylinder',w*.36,h*.49,'#BF482B','#F0B2A0')}${[-.08,0,.08].map(x=>`<path d="M${w*x} ${-h*.28}q${w*.035} ${-h*.06} 0 ${-h*.12}" stroke="#BF482B"/>`).join('')}${label(labels.cylinder)}</g><g data-config-component="cold-condenser" transform="translate(${w*.24} ${-h*.06})">${component('condenser',w*.36,h*.49,'#237CA6','#BBDDED')}<path d="M0 ${-h*.28}V${-h*.46}M${-w*.04} ${-h*.32}L${w*.04} ${-h*.42}M${-w*.04} ${-h*.42}L${w*.04} ${-h*.32}" stroke="#237CA6"/>${label(labels.condenser)}</g></g>`,motionAnchors:[]};
  }
  if(['electric-vehicle-schematic','combustion-vehicle-schematic'].includes(model.variant)){
    const electric=model.variant==='electric-vehicle-schematic',accent=electric?'#237CA6':'#BF6C36';
    const emblem=electric?`<path d="M${w*.04} ${-h*.32}L${-w*.05} ${-h*.13}H${w*.015}L${-w*.02} ${h*.02}L${w*.10} ${-h*.18}H${w*.04}Z" fill="${accent}" stroke="none"/>`:`<path d="M${-w*.06} ${-h*.12}Q${-w*.08} ${-h*.22} 0 ${-h*.29}Q${w*.02} ${-h*.22} ${w*.07} ${-h*.18}Q${w*.10} ${-h*.06} 0 ${-h*.06}Z" fill="${accent}" stroke="none"/>`;
    return {svg:`<g data-power-kind="${electric?'electric':'combustion'}">${component('car',w,h,accent,electric?'#D6EAF1':'#F2DBC2')}${emblem}</g>`,motionAnchors:[{selector:'.motion',x:0,y:0}]};
  }
  if(model.variant==='electric-motor')return {svg:`<g data-power-kind="electric"><rect x="${-w*.36}" y="${-h*.3}" width="${w*.72}" height="${h*.6}" rx="${h*.18}" fill="#D6EAF1"/><path d="M${w*.36} 0H${w*.5}"/><g class="motion"><circle r="${Math.min(w,h)*.2}" fill="#237CA6"/>${[-.18,0,.18].map(x=>`<path d="M${w*x} ${-h*.18}V${h*.18}" stroke="#FFF3DB"/>`).join('')}</g></g>`,motionAnchors:[{selector:'.motion',x:0,y:0}]};
  if(model.variant==='combustion-engine')return {svg:`<g data-power-kind="combustion">${component('engine',w,h,'#BF6C36','#F2DBC2')}<path d="M${-w*.13} ${-h*.44}V${-h*.55}M0 ${-h*.44}V${-h*.57}M${w*.13} ${-h*.44}V${-h*.55}" stroke="#BF6C36"/></g>`,motionAnchors:[{selector:'.motion',x:0,y:0}]};
  if(model.variant==='historical-note'||model.variant==='vehicle-feature-schematic'){
    const source=fold(model.sourceRefs.map(r=>r.quote).join(' ')).replace(/-/g,' ');
    if(!/\bba banh\b|\bthree wheel/.test(source))return {svg:`<rect x="${-w*.44}" y="${-h*.36}" width="${w*.88}" height="${h*.72}" rx="8" fill="#FFF3DB"/><path d="M${-w*.3} ${-h*.17}H${w*.3}M${-w*.3} 0H${w*.2}M${-w*.3} ${h*.17}H${w*.12}"/>`,motionAnchors:[]};
    const rear=/phia sau|at the rear|rear mounted/.test(source),r=Math.min(w*.11,h*.15),points=[{x:-w*.3,y:-h*.28},{x:-w*.3,y:h*.28},{x:w*.32,y:0}];
    const wheel=(p:{x:number;y:number},i:number)=>`<g data-feature="historical-wheel" transform="translate(${p.x} ${p.y})"><circle r="${r}" fill="#DFCFAD"/><g class="motion wheel-${i}"><path d="M${-r} 0H${r}M0 ${-r}V${r}"/></g></g>`;
    return {svg:`<g data-fidelity="narrated-feature-schematic" aria-label="Sơ đồ đặc điểm được kể"><rect x="${-w*.48}" y="${-h*.48}" width="${w*.96}" height="${h*.96}" rx="9" fill="#FFF3DB" stroke="none"/><path d="M${-w*.3} ${-h*.28}L${w*.32} 0L${-w*.3} ${h*.28}Z" fill="#DAC197"/>${points.map(wheel).join('')}${rear?`<rect data-feature="rear-engine" x="${-w*.3}" y="${-h*.12}" width="${w*.2}" height="${h*.24}" rx="4" fill="#B7803D"/>`:''}</g>`,
      motionAnchors:points.map((_p,i)=>({selector:`.wheel-${i}`,x:0,y:0}))};
  }
  if(model.variant==='three-wheel-group'){
    const points=[{x:-w*.28,y:-h*.21},{x:-w*.28,y:h*.21},{x:w*.3,y:0}],r=Math.min(w*.12,h*.18);
    return {svg:points.map((p,i)=>`<g transform="translate(${p.x} ${p.y})"><circle r="${r}" fill="#DFCFAD"/><g class="motion wheel-${i}"><path d="M${-r} 0H${r}M0 ${-r}V${r}"/></g></g>`).join(''),
      motionAnchors:points.map((_p,i)=>({selector:`.wheel-${i}`,x:0,y:0}))};
  }
  const svg=component(part.kind,w,h,'#B7803D','#DFCFAD');
  return {svg,motionAnchors:svg.includes('class="motion"')?[{selector:'.motion',x:0,y:0}]:[]};
}

const point=(x:number,y:number)=>({x,y});
const arrow=(tip:{x:number;y:number},from:{x:number;y:number},size:number)=>{
  const angle=Math.atan2(tip.y-from.y,tip.x-from.x),dx=Math.cos(angle),dy=Math.sin(angle);
  return `<path class="arrowhead" d="M${tip.x} ${tip.y}L${tip.x-dx*size-dy*size*.45} ${tip.y-dy*size+dx*size*.45}L${tip.x-dx*size+dy*size*.45} ${tip.y-dy*size-dx*size*.45}Z" fill="#765438"/>`;
};

/** Directed relations use arrowheads; compare and part-of do not imply causality. */
export function cinematicRelations(shot:Shot,width:number,height:number,frames?:PropMotionFrame[]) {
  const v=shot.visualization!,html:string[]=[],calls:string[]=[],scope=`[data-composition-id="${shot.id}"]`;
  const bindings=shot.cinematic?.propBindings??[];
  const centerAt=(part:Part,time:number)=>{
    const binding=bindings.find(binding=>binding.partId===part.id);
    if(!binding||!frames?.length)return point(part.x*width,part.y*height);
    let low=0,high=frames.length-1;
    while(low<high){const middle=Math.floor((low+high)/2);if(frames[middle]!.timeMs<time)low=middle+1;else high=middle;}
    const right=frames[low]!,left=frames[Math.max(0,low-1)]!,a=left.props[binding.propId]?.point,b=right.props[binding.propId]?.point;
    if(!a||!b)throw new Error(`${shot.id}: relation lacks compiled prop ${binding.propId}`);
    const mix=left.timeMs===right.timeMs?0:Math.max(0,Math.min(1,(time-left.timeMs)/(right.timeMs-left.timeMs)));
    return point(a.x+(b.x-a.x)*mix,a.y+(b.y-a.y)*mix);
  };
  const geometryAt=(a:Part,b:Part,time:number)=>{
    const ca=centerAt(a,time),cb=centerAt(b,time),dx=cb.x-ca.x,dy=cb.y-ca.y,length=Math.hypot(dx,dy);
    if(length<1)throw new Error(`${shot.id}: relation endpoints overlap during model motion at ${time}ms`);
    const ux=dx/length,uy=dy/length,radius=(part:Part)=>Math.min(part.width*width*.53/Math.max(.001,Math.abs(ux)),part.height*height*.53/Math.max(.001,Math.abs(uy)));
    const start=point(ca.x+ux*radius(a),ca.y+uy*radius(a)),end=point(cb.x-ux*radius(b),cb.y-uy*radius(b));
    return {start,end,control:point((start.x+end.x)/2,Math.min(start.y,end.y)-height*.055)};
  };
  const curvePoint=(g:ReturnType<typeof geometryAt>,t:number)=>point((1-t)**2*g.start.x+2*(1-t)*t*g.control.x+t*t*g.end.x,(1-t)**2*g.start.y+2*(1-t)*t*g.control.y+t*t*g.end.y);
  for(const [i,r] of v.relations.entries()){
    const a=v.parts.find(p=>p.id===r.from)!,b=v.parts.find(p=>p.id===r.to)!;
    const dx=(b.x-a.x)*width,dy=(b.y-a.y)*height,length=Math.hypot(dx,dy);
    if(length<1)throw new Error(`${shot.id}: relation endpoints occupy the same stage anchor`);
    const ux=dx/length,uy=dy/length;
    const radius=(p:Part)=>Math.min(p.width*width*.53/Math.max(.001,Math.abs(ux)),p.height*height*.53/Math.max(.001,Math.abs(uy)));
    const start=point(a.x*width+ux*radius(a),a.y*height+uy*radius(a));
    const end=point(b.x*width-ux*radius(b),b.y*height-uy*radius(b));
    const control=point((start.x+end.x)/2,Math.min(start.y,end.y)-height*.055);
    const directed=['transfer','cause','sequence'].includes(r.kind);
    const dynamic=!!frames?.length&&bindings.some(binding=>binding.partId===r.from||binding.partId===r.to);
    const line=dynamic?Array.from({length:16},(_,segment)=>`<path id="relation-${i}-segment-${segment}" d="M0 0H1" vector-effect="non-scaling-stroke"${r.kind==='part-of'?' stroke-dasharray="5 4"':''}/>`).join(''):
      `<path d="M${start.x} ${start.y}Q${control.x} ${control.y} ${end.x} ${end.y}"${r.kind==='part-of'?' stroke-dasharray="5 4"':''}/>`;
    const head=directed?(dynamic?arrow(point(0,0),point(-1,0),height*.014).replace('<path ',`<path id="relation-${i}-arrow" vector-effect="non-scaling-stroke" `):arrow(end,control,height*.014)):'';
    html.push(`<g id="link-${i}" data-relation-kind="${r.kind}" data-from="${escapeHtml(r.from)}" data-to="${escapeHtml(r.to)}" stroke="#765438" stroke-width="${height*.003}" fill="none">${line}${head}<circle id="relation-flow-${i}" r="${height*.005}" fill="#D8912C" stroke="none" opacity="0"/></g>`);
    if(dynamic){
      const angles=new Map<string,number>();
      for(const [index,frame] of frames!.entries()){
        const g=geometryAt(a,b,frame.timeMs),previous=frames![index-1],at=(previous?.timeMs??0)/1000;
        const move=(id:string,x:number,y:number,dx:number,dy:number,length?:number)=>{
          let angle=Math.atan2(dy,dx)*180/Math.PI;const prior=angles.get(id);if(prior!==undefined)angle+=Math.round((prior-angle)/360)*360;angles.set(id,angle);
          const transform=`translate(${x} ${y}) rotate(${angle})${length===undefined?'':` scale(${length} 1)`}`;
          calls.push(`tl.${previous?'to':'set'}(${JSON.stringify(`${scope} #${id}`)},${JSON.stringify({attr:{transform},...(previous?{duration:Number(((frame.timeMs-previous.timeMs)/1000).toFixed(6)),ease:'none'}:{immediateRender:true})})},${Number(at.toFixed(6))});`);
        };
        for(let segment=0;segment<16;segment++){const from=curvePoint(g,segment/16),to=curvePoint(g,(segment+1)/16),dx=to.x-from.x,dy=to.y-from.y;move(`relation-${i}-segment-${segment}`,from.x,from.y,dx,dy,Math.hypot(dx,dy));}
        if(directed)move(`relation-${i}-arrow`,g.end.x,g.end.y,g.end.x-g.control.x,g.end.y-g.control.y);
      }
    }
    if(!['transfer','cause'].includes(r.kind))continue;
    const events=v.events.filter(e=>e.type==='flow'&&e.targetId===r.from&&e.relationTo===r.to).sort((a,b)=>a.startMs-b.startMs);
    for(const event of events){
    const begin=(event.startMs-shot.startMs)/1000,span=(event.endMs-event.startMs)/1000*.55;
    if(span<=0)continue;
    const selector=JSON.stringify(`${scope} #relation-flow-${i}`);
    if(dynamic){
      const times=[...new Set([begin*1000,(begin+span)*1000,...frames!.map(f=>f.timeMs).filter(t=>t>begin*1000&&t<(begin+span)*1000)])].sort((a,b)=>a-b);
      for(const [index,time] of times.entries()){
        const pos=curvePoint(geometryAt(a,b,time),(time/1000-begin)/span),previous=times[index-1],vars={attr:{transform:`translate(${pos.x} ${pos.y})`},...(previous===undefined?{opacity:1}:{duration:(time-previous)/1000,ease:'none'})};
        calls.push(`tl.${previous===undefined?'set':'to'}(${selector},${JSON.stringify(vars)},${previous===undefined?begin:previous/1000});`);
      }
    }else{
      calls.push(`tl.set(${selector},{opacity:1,attr:{transform:"translate(${start.x} ${start.y})"}},${begin});`);
      for(let step=1;step<=16;step++){
        const t=step/16,x=(1-t)**2*start.x+2*(1-t)*t*control.x+t*t*end.x,y=(1-t)**2*start.y+2*(1-t)*t*control.y+t*t*end.y;
        calls.push(`tl.to(${selector},{attr:{transform:"translate(${x} ${y})"},duration:${span/16},ease:"none"},${begin+span*(step-1)/16});`);
      }
    }
    calls.push(`tl.set(${selector},{opacity:0},${begin+span});`);
    const targetIndex=v.parts.findIndex(p=>p.id===r.to),effect=JSON.stringify(`${scope} #object-${targetIndex} .energy-effect`),remaining=(event.endMs-event.startMs)/1000-span;
    calls.push(`tl.to(${effect},{opacity:.55,duration:${remaining/2},ease:"sine.inOut"},${begin+span});tl.to(${effect},{opacity:0,duration:${remaining/2},ease:"sine.inOut"},${begin+span+remaining/2});`);
    const binding=shot.cinematic?.propBindings.find(binding=>binding.partId===r.to);
    const motion=JSON.stringify(`${scope} ${binding?`[id=${JSON.stringify(boundProp(shot,binding).svgId)}]`:`#object-${targetIndex}`} .motion`);
    const explicit=v.events.some(e=>e.targetId===r.to&&e.motion!=='none'&&e.startMs<event.endMs&&e.endMs>event.startMs+span*1000);
    if(!explicit&&['wheel','gear'].includes(b.kind))calls.push(`tl.to(${motion},{rotation:100,duration:${remaining},ease:"none"},${begin+span});`);
    else if(!explicit&&b.kind==='engine')calls.push(`tl.to(${motion},{opacity:.3,duration:${remaining/2},ease:"sine.inOut"},${begin+span});tl.to(${motion},{opacity:1,duration:${remaining/2},ease:"sine.inOut"},${begin+span+remaining/2});`);
    }
  }
  return {html:html.join(''),calls};
}

