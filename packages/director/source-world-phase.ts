import type {SourceWorld} from './source-world-schemas.js';
import type {Visualization} from '../explainer/schemas.js';

export interface SourceWorldModelPhase {
  focus:number;visible:number;rotation:number;x:number;opacity:number;energy:number;control:number;
  hot:number;cold:number;hotCoat:number;coldCoat:number;
}
export interface SourceWorldPhase {globalMs:number;models:Record<string,SourceWorldModelPhase>;flows:Record<string,number|null>;}
const progress=(t:number,start:number,end:number)=>t<=start?0:t>=end?1:(t-start)/(end-start);
const sine=(t:number)=>(1-Math.cos(Math.PI*t))/2;
const pulse=(t:number,low:number)=>t<=.5?1+(low-1)*sine(t*2):low+(1-low)*sine((t-.5)*2);
/** Pure original-global effect state. No geometry, voice, GSAP, renderer or
 * mutation; callers validate the complete original source before compilation.
 * History before the current camera slice is deliberately retained. */
export function sampleSourceWorldPhase(world:SourceWorld,parts:Visualization['parts'],width:number,globalMs:number):SourceWorldPhase {
  if(!Number.isFinite(globalMs)||globalMs<world.startMs||globalMs>world.endMs||!Number.isFinite(width)||width<=0)throw new Error('needs-source-prop-binding: original world phase is outside its real clock');
  const models:Record<string,SourceWorldModelPhase>={},flows:Record<string,number|null>={};
  for(const part of parts){
    const events=world.events.filter(e=>e.targetId===part.id).sort((a,b)=>a.startMs-b.startMs),reveals=events.filter(e=>e.type==='reveal');
    const state:SourceWorldModelPhase={focus:events.some(e=>e.startMs<=globalMs&&globalMs<e.endMs)?1:0,visible:!reveals.length||reveals.some(e=>e.startMs<=globalMs)?1:0,rotation:0,x:0,opacity:1,energy:0,control:0,hot:0,cold:0,hotCoat:0,coldCoat:0};
    for(const e of events){const t=progress(globalMs,e.startMs,e.endMs);
      if(e.motion==='rotate')state.rotation+=120*t;
      if(e.motion==='translate')state.x+=width*.018*(t<=.5?sine(t*2):1-sine((t-.5)*2));
      if(e.motion==='pulse')state.opacity*=pulse(t,.4);
    }
    // State and reveal are persistent results, not bounded highlights. Thermal
    // paint holds until the next sourced state, as in the existing renderer.
    const states=events.filter(e=>e.type==='state'&&e.startMs<=globalMs),latest=states.at(-1);
    if(latest){const previous=states.at(-2)?.state,t=sine(progress(globalMs,latest.startMs,latest.startMs+Math.min(280,latest.endMs-latest.startMs)));
      state.hot=latest.state==='hot'?1:0;state.cold=latest.state==='cold'?1:0;
      state.hotCoat=.62*((previous==='hot'?1:0)*(1-t)+(latest.state==='hot'?1:0)*t);
      state.coldCoat=.62*((previous==='cold'?1:0)*(1-t)+(latest.state==='cold'?1:0)*t);
    }
    // Explicit contact-driven source events own the control response; a camera
    // slice cannot turn it again merely because its action continues.
    for(const e of world.events.filter(e=>e.contactRequired&&(e.contactPartId??e.targetId)===part.id))state.control=Math.max(state.control,65*sine(progress(globalMs,e.startMs,e.startMs+120)));
    models[part.id]=state;
  }
  for(const e of world.events.filter(e=>e.type==='flow')){
    const split=e.startMs+(e.endMs-e.startMs)*.55,t=progress(globalMs,e.startMs,split);
    flows[e.id]=globalMs>=e.startMs&&globalMs<split?t:null;
    const target=parts.find(p=>p.id===e.relationTo),state=target&&models[target.id];if(!target||!state)continue;
    const response=progress(globalMs,split,e.endMs);
    state.energy=Math.max(state.energy,.55*(response<=.5?sine(response*2):1-sine((response-.5)*2)));
    const explicit=world.events.some(other=>other.targetId===target.id&&other.motion!=='none'&&other.startMs<e.endMs&&other.endMs>split);
    if(!explicit&&['wheel','gear'].includes(target.kind))state.rotation+=100*response;
    if(!explicit&&target.kind==='engine')state.opacity*=pulse(response,.3);
  }
  return {globalMs,models,flows};
}
