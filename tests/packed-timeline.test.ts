import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {gunzipSync,gzipSync} from 'node:zlib';
import {packTimelineScript,unpackTimelineCall,PACKED_TIMELINE_PREFIX,LEGACY_PACKED_TIMELINE_PREFIX} from '../packages/scenes/packed-timeline.js';
import {writePackedBinary,readPackedBinary} from '../packages/scenes/packed-binary.js';
import {secureSceneFiles,validateSceneFiles,validateSceneScript} from '../packages/scenes/security.js';
import type {SceneFiles,Shot} from '../packages/core/schemas.js';

const header='const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["packed"]=tl;';
const selector=(id:string)=>`[data-composition-id="packed"] [id="${id}"]`;
function calls(extra=''){
 const rows:string[]=[];
 for(let i=0;i<600;i++)for(const actor of ['lila','karo']){
  rows.push(`tl.${i?'to':'set'}(${JSON.stringify(selector(actor))},${JSON.stringify({attr:{transform:`matrix(1 0 -0.0000471 0.99992 ${100+i/10000000} ${200-i/10000000})`},...(i?{duration:.001,ease:'none'}:{immediateRender:true})})},${i/1000});`);
  if(i%10===0)rows.push(`tl.set(${JSON.stringify(selector(actor+'-mouth'))},{attr:{d:"M0 0C1 1 2 2 3 3C2 2 1 1 0 0Z"},opacity:0.5},${i/1000});`);
 }
 rows.push('tl.to({},{duration:1},0);',extra);return rows.join('\n');
}
function capture(source:string){
 const result:unknown[]=[];const tl=Object.fromEntries(['set','to','from','fromTo'].map(method=>[method,(...args:unknown[])=>result.push([method,args])]));
 runInNewContext(source,{window:{},gsap:{timeline:()=>tl},atob,Uint8Array,TextDecoder});return JSON.parse(JSON.stringify(result));
}
function packedCall(extra=''){
 const s=packTimelineScript(header+calls(extra),1),at=s.indexOf(PACKED_TIMELINE_PREFIX);assert.ok(at>=0);return s.slice(at).trim();
}
function mutatePayload(call:string,change:(p:any)=>void){
 const b64=JSON.parse(call.slice(PACKED_TIMELINE_PREFIX.length,-2));const p=readPackedBinary(gunzipSync(Buffer.from(b64,'base64')));change(p);
 return PACKED_TIMELINE_PREFIX+JSON.stringify(gzipSync(writePackedBinary(p)).toString('base64'))+');';
}
test('packed browser player preserves exact values, actor interleaving and duration sentinels',()=>{
 const source=header+calls('tl.fromTo('+JSON.stringify(selector('extra'))+',{x:-1},{x:1,duration:0.1},0.6);');
 const packed=packTimelineScript(source,1);assert.ok(Buffer.byteLength(packed)<Buffer.byteLength(source)/2);
 assert.deepEqual(capture(packed),capture(source));assert.deepEqual(validateSceneScript(packed,'packed'),[]);
 const expanded=unpackTimelineCall(packed.slice(packed.indexOf(PACKED_TIMELINE_PREFIX)))!;assert.deepEqual(capture(header+expanded),capture(source));
 assert.equal(packTimelineScript(packed,1),packed);
});
test('second differences retain irregular signed motion, template changes and mixed methods at seven decimal places',()=>{
 let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return seed/2147483648;},rows:string[]=[];
 for(let i=0;i<350;i++){
  const a=(random()*999).toFixed(7),b=(random()*999).toFixed(7),target=JSON.stringify(selector(i%2?'lila':'karo'));
  const transform=i%3?`translate(${a} ${b})`:`matrix(1 0 0 1 ${a} ${b})`,vars=JSON.stringify({attr:{transform},duration:.001,ease:'none'});
  rows.push(i%5?`tl.to(${target},${vars},${i/700});`:`tl.fromTo(${target},{attr:{transform:"translate(0 0)"}},${vars},${i/700});`);
 }
 const source=header+rows.join('\n'),packed=packTimelineScript(source,1);assert.ok(packed.includes(PACKED_TIMELINE_PREFIX));
 assert.deepEqual(capture(packed),capture(source));assert.deepEqual(validateSceneScript(packed,'packed'),[]);
});
test('packing cannot hide forbidden targets, resources or executable callbacks',()=>{
 for(const extra of ['tl.set("body",{opacity:0},0);',`tl.set(${JSON.stringify(selector('x'))},{attr:{href:"https://bad.invalid"}},0);`,`tl.to(${JSON.stringify(selector('x'))},{onUpdate:()=>{window.bad=true;}},0);`,`tl.set(${JSON.stringify(selector('x'))},{__proto__:{polluted:1}},0);`]){
  const source=header+calls(extra),packed=packTimelineScript(source,1);assert.ok(validateSceneScript(packed,'packed').length);
 }
});
test('decoder rejects tampering, invalid order and decompression/expansion bounds',()=>{
 const call=packedCall();
 for(const mutate of [(p:any)=>p.order[0]=999999,(p:any)=>p.order.pop(),(p:any)=>p.columns[0][1][0][0]='eval',(p:any)=>p.templates[0][0]='x'.repeat(4097)]){
  assert.ok(validateSceneScript(header+mutatePayload(call,mutate),'packed').length);
 }
 assert.ok(validateSceneScript(header+call.replace('const module=', 'const wrong='),'packed').length);
 const bomb=PACKED_TIMELINE_PREFIX+JSON.stringify(gzipSync(Buffer.alloc(65*1024*1024,32)).toString('base64'))+');';
 assert.match(validateSceneScript(header+bomb,'packed').join('\n'),/invalid packed timeline/);
});
test('legacy JSON transport remains validated and playable without rewriting cached scene bytes',()=>{
 const p={v:1,templates:[],columns:[[selector('lila'),[['set',[2,[3,'opacity',.5],0]]]]],order:[0]};
 const call=LEGACY_PACKED_TIMELINE_PREFIX+JSON.stringify(gzipSync(JSON.stringify(p)).toString('base64'))+');';
 const expected=header+`tl.set(${JSON.stringify(selector('lila'))},{opacity:0.5},0);`;
 assert.deepEqual(capture(header+call),capture(expected));assert.deepEqual(capture(header+unpackTimelineCall(call)),capture(expected));
 assert.deepEqual(validateSceneScript(header+call,'packed'),[]);
});
function files(svg:string):SceneFiles{return {files:[{path:'index.html',content:`<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="packed" data-width="640" data-height="360" data-duration="1" data-start="0"><svg>${svg}</svg></div><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`},{path:'style.css',content:''},{path:'scene.js',content:header}],dependencies:[],notes:[]};}
const shot={id:'packed',startMs:0,endMs:1000} as Shot;
test('source alpha filter accepts only the fixed discrete alpha operation',()=>{
 const good='<filter id="opaque"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter>';
 assert.deepEqual(validateSceneFiles(secureSceneFiles(files(good)),shot),[]);
 for(const bad of [good.replace('0 1','0 0.5 1'),good.replace('discrete','gamma'),good.replace('feFuncA','feFuncR'),good.replace('feComponentTransfer>','feComponentTransfer href="https://bad.invalid">')])assert.ok(validateSceneFiles(secureSceneFiles(files(bad)),shot).length);
});
