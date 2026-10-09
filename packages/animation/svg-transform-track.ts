import type {compilePerformance} from './compiler.js';
import {isCurrentAnimation,type PerformancePlan} from './schemas.js';
import {hash} from '../core/utils.js';

type Point={x:number;y:number};
export type SvgTransform={x:number;y:number;angle:number;scale:number};
export const EMITTED_TRANSFORM_VERSION='emitted-svg-transform-1';
/** GSAP 3 complex strings round intermediate numbers to four decimals.
 * Endpoints are the exact serialized strings, not newly rounded values. */
export const svgLinearNumber=(a:number,b:number,t:number)=>t===0?a:t===1?b:Math.round((a+(b-a)*t)*10000)/10000;
export function parseSvgTransform(value:string):SvgTransform{
  const n='(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?)';
  const values=value.match(new RegExp(`^translate\\(${n} ${n}\\) rotate\\(${n}\\) scale\\(${n}\\)$`))?.slice(1).map(Number);
  if(!values||values.length!==4||!values.every(Number.isFinite)||values[3]!<=0)throw new Error('needs-source-prop-binding: invalid actual emitted SVG transform');
  return {x:values[0]!,y:values[1]!,angle:values[2]!,scale:values[3]!};
}
export function svgTransformPoint(transform:SvgTransform,point:Point):Point{
  if(![transform.x,transform.y,transform.angle,transform.scale,point.x,point.y].every(Number.isFinite)||transform.scale<=0)throw new Error('needs-source-prop-binding: nonfinite emitted SVG point');
  const r=transform.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {x:transform.x+(point.x*c-point.y*s)*transform.scale,y:transform.y+(point.x*s+point.y*c)*transform.scale};
}
/** Observe supplied actual compilation; never invoke a compiler or accept a
 * physics-center substitute. Verify relevant exact JS channels before query. */
export function emittedTransformTrack(plan:PerformancePlan,profileHash:string,namespace:string,keys:readonly string[],compiled:ReturnType<typeof compilePerformance>){
  const fail=(message:string):never=>{throw new Error(`${plan.id}: needs-source-prop-binding: emitted transform ${message}`);};
  if(!isCurrentAnimation(plan.compilerVersion)||compiled.report.planHash!==hash(plan)||compiled.report.profileHash!==profileHash||compiled.report.compilerVersion!==plan.compilerVersion||compiled.report.durationMs!==plan.durationMs||compiled.report.fps!==plan.fps)return fail('belongs to a different original plan/profile/compiler/clock');
  if(!keys.length||new Set(keys).size!==keys.length||!compiled.frames.length||compiled.frames[0]!.timeMs!==0||compiled.frames.at(-1)!.timeMs!==plan.durationMs)return fail('requires complete actual channels and camera clock');
  const scope=`[data-composition-id="${plan.id}"]`,selector=(id:string)=>JSON.stringify(`${scope} [id=${JSON.stringify(namespace+id)}]`);
  let previous=-1;
  const frames=compiled.frames.map(f=>{
    if(!Number.isFinite(f.timeMs)||f.timeMs<=previous)return fail('has a missing/nonincreasing original frame');previous=f.timeMs;
    const transforms:Record<string,SvgTransform>=Object.create(null);
    for(const key of keys){if(!Object.hasOwn(f.transforms,key))return fail('is missing its own SVG channel');transforms[key]=parseSvgTransform(f.transforms[key]!);}
    return {timeMs:f.timeMs,transforms};
  });
  const calls:string[]=[];
  for(const [i,f] of compiled.frames.entries())for(const key of keys){
    const prior=compiled.frames[i-1],value=f.transforms[key]!;
    if(!prior||value!==prior.transforms[key])calls.push(`tl.${prior?'to':'set'}(${selector(key)},${JSON.stringify({attr:{transform:value},...(prior?{duration:(f.timeMs-prior.timeMs)/1000,ease:'none'}:{immediateRender:true})})},${(prior?.timeMs??0)/1000});`);
  }
  const selected=compiled.js.split('\n').filter(line=>keys.some(key=>line.startsWith(`tl.set(${selector(key)},`)||line.startsWith(`tl.to(${selector(key)},`)));
  // Compiler emits per-frame transform keys in its own order. Compare each
  // channel independently while retaining its complete original call order.
  for(const key of keys){const choose=(lines:string[])=>lines.filter(line=>line.startsWith(`tl.set(${selector(key)},`)||line.startsWith(`tl.to(${selector(key)},`));
    if(hash(choose(selected))!==hash(choose(calls)))return fail('frames differ from the actual emitted JS channel');
  }
  const at=(key:string,timeMs:number):SvgTransform=>{
    if(!keys.includes(key)||!Number.isFinite(timeMs)||timeMs<0||timeMs>plan.durationMs)return fail('cannot infer a missing channel or clamp a query clock');
    let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(frames[mid]!.timeMs<timeMs)lo=mid+1;else hi=mid;}
    const right=frames[lo]!,left=frames[Math.max(0,lo-1)]!,t=left.timeMs===right.timeMs?0:(timeMs-left.timeMs)/(right.timeMs-left.timeMs),a=left.transforms[key]!,b=right.transforms[key]!;
    return {x:svgLinearNumber(a.x,b.x,t),y:svgLinearNumber(a.y,b.y,t),angle:svgLinearNumber(a.angle,b.angle,t),scale:svgLinearNumber(a.scale,b.scale,t)};
  };
  return {version:EMITTED_TRANSFORM_VERSION,times:frames.map(f=>f.timeMs),at,pointAt:(key:string,timeMs:number,p:Point)=>svgTransformPoint(at(key,timeMs),p),fingerprint:hash({plan,profileHash,namespace,keys,frames,calls}),scope:'supplied-emitted-channel-candidate' as const,motionVerified:false as const,productionApproval:false as const};
}
