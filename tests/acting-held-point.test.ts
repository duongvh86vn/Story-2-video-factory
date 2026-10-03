import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compilePerformance, samplePerformance } from '../packages/animation/compiler.js';
import { PerformancePlanSchema } from '../packages/animation/schemas.js';
import { HostProfileSchema } from '../packages/host/schemas.js';

// Authored Benz fixture: shot starts at movie2949ms, held point2851–5701ms local.
// Copied input values, never an extracted production implementation.
const plan=PerformancePlanSchema.parse({"version":22,"compilerVersion":"performance-2.2.7","id":"benz.milestone","leadCharacterId":"karl-benz","profileHash":"1eddac144ed49bbb9cae6ec612c1000bbbad920c04b6e1df00a0d31132b4ebf3","kind":"stick-man","durationMs":5974,"fps":30,"stage":{"width":1280,"height":720,"groundY":555},"root":{"x":340,"y":555},"scale":1.03,"facing":"right","turns":[],"walks":[{"startMs":0,"endMs":800,"fromX":340,"toX":370}],"gestures":[{"startMs":0,"endMs":800,"id":"benz.milestone.vehicle.0","action":"lead-next","target":{"x":793.6,"y":403.20000000000005}},{"startMs":950,"endMs":2301,"id":"benz.milestone.vehicle.1","action":"think","target":{"x":793.6,"y":403.20000000000005}},{"startMs":2851,"endMs":5701,"id":"benz.milestone.vehicle.2","action":"point","target":{"x":793.6,"y":223.2}}],"expressions":[{"startMs":0,"endMs":2426,"mood":"thinking"},{"startMs":2426,"endMs":5974,"mood":"understanding"}],"gazes":[{"startMs":0,"endMs":2750,"target":{"x":793.6,"y":403.20000000000005}},{"startMs":2750,"endMs":5974,"target":{"x":793.6,"y":223.2}}],"props":[]});
const profile=HostProfileSchema.parse({"id":"karl-benz","version":1,"kind":"stick-man","role":"story-actor","name":"Karl Benz","description":"xe dùng động cơ xăng của Karl Benz; historical; stylized illustration","appearance":{"outline":"#233A40","shell":"#FFF0D7","screen":"#16353C","accent":"#9A6746","badge":"#DAB26B","headScale":1,"bodyScale":1,"strokeWidth":6},"costume":[{"joint":"head","svg":"<path d=\"M-37 -8Q-42 -42 -12 -43L-2 -49L24 -40L38 -18L25 -25L17 -34L-2 -30L-18 -34Z\" fill=\"#674735\" stroke=\"#233A40\" stroke-width=\"3\"/>"},{"joint":"head","svg":"<path d=\"M-3 17Q-14 7 -24 15Q-16 27 -3 21L0 19L3 21Q16 27 24 15Q14 7 3 17Z\" fill=\"#5B4031\" stroke=\"#233A40\" stroke-width=\"2\"/>"},{"joint":"chest","svg":"<path d=\"M-20 -88L-28 -5L-22 9H24L27 -5L20 -88L5 -80L0 -41L-6 -80Z\" fill=\"#9A6746\" stroke=\"#233A40\" stroke-width=\"3\"/><path d=\"M-7 -80H7L0 -41Z\" fill=\"#F5DFC0\"/><path d=\"M0 -38V1\" stroke=\"#DAB26B\" stroke-width=\"3\"/>"}],"actions":["idle","greet","explain","point","operate-model","compare","think","react","summarize","walk-to-marker"],"immutable":["cast identity","face design","costume baseline","rig proportions"],"profileHash":"1eddac144ed49bbb9cae6ec612c1000bbbad920c04b6e1df00a0d31132b4ebf3","compilerVersion":"host-svg-2.2.7","sourcePath":"work/actor-cast.json"});
const activity={method:'audio-rms' as const,windowMs:20,intervals:[]};
const movieTimes=[6900,7000,7100];
const localTimes=movieTimes.map(ms=>ms-2949);
const position=(value:string)=>{const numbers=value.match(/-?\d+(?:\.\d+)?/g);assert.ok(numbers);return {x:Number(numbers[0]),y:Number(numbers[1])};};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function retain(name:string,data:unknown){const directory=process.env.HELD_POINT_EVIDENCE;if(directory)writeFileSync(path.join(directory,name+'.json'),JSON.stringify(data,null,2));}
function probe(script:string,vendor?:string){
  const targets=new Map<string,Record<string,unknown>>();
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    let target=targets.get(selector);
    if(!target){const attributes:Record<string,string>={};target={x:0,y:0,scaleY:1,rotation:0,opacity:1,getAttribute:(key:string)=>attributes[key]??'',setAttribute:(key:string,value:string)=>{attributes[key]=String(value);}};targets.set(selector,target);}
    return [target];
  }};
  const context=vm.createContext({window:{document},document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(vendor??createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;${script};gsap.ticker.sleep();`,context);
  const tl=context.window.__timelines[plan.id] as {seek:(time:number,suppress:boolean)=>unknown};
  return {seek:(ms:number)=>{tl.seek(ms/1000,true);return Object.fromEntries(['arm-right-upper','arm-right-lower','hand-right'].map(id=>[id,(targets.get(`[data-composition-id="${plan.id}"] #${id}`)?.getAttribute as (key:string)=>string)('transform')]));}};
}
test('authored Benz held-point solver and compiled frames retain the pointing hand around movie7s',()=>{
  const compiled=compilePerformance(plan,profile,activity);
  const reference=samplePerformance(plan,profile,4051,activity).hands.right;
  const samples=localTimes.map(time=>samplePerformance(plan,profile,time,activity));
  const frames=compiled.frames.filter(frame=>frame.timeMs>=3900&&frame.timeMs<=4200);
  retain('numeric',{movieTimes,localTimes,plan,profile,activity,report:compiled.report,samples,frames});
  assert.ok(distance(reference,samplePerformance(plan,profile,800,activity).hands.right)>100,'point must visibly differ from neutral arms');
  for(const frame of [...samples,...frames])assert.ok(distance(frame.hands.right,reference)<1,`held point resets at local${frame.timeMs}ms`);
});
test('real GSAP AttrPlugin preserves held-point geometry across forward, reverse, fresh and random seeks',()=>{
  const compiled=compilePerformance(plan,profile,activity);
  const sources=[{label:'current public compilePerformance',script:`(function(){const tl=gsap.timeline({paused:true});window.__timelines={};window.__timelines[${JSON.stringify(plan.id)}]=tl;${compiled.js}})();`,vendor:undefined as string|undefined}];
  if(process.env.HELD_POINT_SCENE)sources.push({label:'immutable authored scene.js',script:readFileSync(process.env.HELD_POINT_SCENE,'utf8'),vendor:process.env.HELD_POINT_GSAP});
  const results:unknown[]=[];
  const times=[...localTimes,4000,4033.3333,4066.6667,4100,4133.3333,4151];
  const orders=[times.slice().sort((a,b)=>a-b),times.slice().sort((a,b)=>b-a),[4151,3951,4066.6667,4051,4033.3333,4100,4000,4133.3333,4051]];
  for(const source of sources){
    for(const order of orders){const runtime=probe(source.script,source.vendor);for(const time of order)results.push({source:source.label,mode:'ordered',time,actual:runtime.seek(time)});}
    for(const time of times)results.push({source:source.label,mode:'fresh',time,actual:probe(source.script,source.vendor).seek(time)});
  }
  retain('gsap-seeks',results);
  for(const row of results as {source:string;mode:string;time:number;actual:Record<string,string>}[]){
    const expected=samplePerformance(plan,profile,row.time,activity);
    for(const [id,transform] of Object.entries(row.actual))assert.ok(distance(position(transform),position(expected.transforms[id]!))<.21,`${row.source} ${row.mode} ${id} resets at local${row.time}ms: ${transform}`);
  }
});