import type {Shot} from '../../packages/core/schemas.js';
import {hash} from '../../packages/core/utils.js';
import {sampleSourceWorldPhase,type SourceWorldPhase} from '../../packages/director/source-world-phase.js';
import {boundProp} from '../../packages/director/prop-owner.js';
import {rendersModelControl} from '../../packages/director/art-direction-schemas.js';
import {ownershipGlyph} from '../../packages/director/ownership-reference.js';
import {modelContactTimeline} from '../../packages/director/model-contact-motion.js';

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
    const binding=c.propBindings.find(b=>b.partId===part.id),canonicalGlyph=ownershipGlyph(shot,part.id),glyph=canonicalGlyph?`#${canonicalGlyph}`:binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`;
    const foreground=c.artDirection?.models.some(m=>m.partId===part.id&&m.foregroundSvg!==undefined),state=(frame:SourceWorldFrame)=>frame.phase.models[part.id]!;
    const targets=(suffix:string)=>[glyph+suffix,...(foreground?[`#foreground-object-${i}${suffix}`]:[])];
    const contactFrame=c.artDirection?.models.find(m=>m.partId===part.id)?.contactFrame;
    calls.push(...sourceWorldTrack(frames,selector(contactFrame?`${glyph} .contact-model-underlay .focus-${i}`:`#object-${i} .focus-${i}`),f=>({opacity:state(f).focus}),true));
    for(const base of new Set([`#object-${i}`,glyph,...(foreground?[`#foreground-object-${i}`]:[])]))calls.push(...sourceWorldTrack(frames,selector(base),f=>({opacity:state(f).visible}),true));
    if(contactFrame){
      const scale=binding&&!canonicalGlyph?boundProp(shot,binding).performance.scale:1;
      for(const target of targets(' .contact-model-root'))calls.push(...modelContactTimeline(shot,part.id,selector(target),part.width*c.performance.stage.width/scale,part.height*c.performance.stage.height/scale));
    }else for(const target of targets(' .motion'))calls.push(...sourceWorldTrack(frames,selector(target),f=>({rotation:state(f).rotation,x:state(f).x,opacity:state(f).opacity})));
    for(const [name,key] of [['hot','hot'],['cold','cold'],['hot-coat','hotCoat'],['cold-coat','coldCoat']] as const)for(const target of contactFrame?[`${glyph} .contact-model-effects .thermal-${name}`]:targets(` .thermal-${name}`))calls.push(...sourceWorldTrack(frames,selector(target),f=>({opacity:state(f)[key]}),!name.endsWith('coat')));
    calls.push(...sourceWorldTrack(frames,selector(contactFrame?`${glyph} .contact-model-effects .energy-effect`:`#object-${i} .energy-effect`),f=>({opacity:state(f).energy})));
    if(!binding&&rendersModelControl(shot,part.id)){
      calls.push(`tl.set(${JSON.stringify(selector(`#object-${i} .control-turn`))},{svgOrigin:"0 0"},0);`);
      calls.push(...sourceWorldTrack(frames,selector(`#object-${i} .control-turn`),f=>({rotation:state(f).control})));
    }
  }
  return calls;
}
