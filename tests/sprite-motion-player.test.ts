// Runtime tests are delegated: all probes, assertions and GSAP loading stay inside callbacks.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {compileActorMotion,sampleMotionFrame,motionLandmarkAt} from '../packages/motion/player.js';
import {ACTOR_MOTION_VERSION,SPRITE_PLAYER_VERSION,type ActorMotion,type SpriteClip} from '../packages/motion/schemas.js';
import {validateSceneFiles,validateSceneScript} from '../packages/scenes/security.js';
import type {Shot} from '../packages/core/schemas.js';

function fixture(mode:ActorMotion['playback']['mode']='once',end:ActorMotion['playback']['end']='hold'):ActorMotion {
  const hash='a'.repeat(64);
  return {version:ACTOR_MOTION_VERSION,id:'lila-walk',actorId:'lila',state:'walk',view:'left',fingerprint:hash,
    source:{kind:'sprite-gen-atlas',metadataHash:hash,sheetHash:hash,registrationHash:hash,referenceHash:hash,loop:true},
    sheet:{path:'sheet.png',hash,width:40,height:20},playback:{mode,end},
    frames:[
      {rect:{x:0,y:0,w:20,h:20},durationMs:70,anchor:{x:10,y:20},landmarks:{hand:{x:12,y:16}}},
      {rect:{x:20,y:0,w:20,h:20},durationMs:230,anchor:{x:10,y:20},landmarks:{hand:{x:14,y:10}}},
      {rect:{x:0,y:0,w:20,h:20},durationMs:120,anchor:{x:10,y:20},landmarks:{hand:{x:6,y:14}}},
    ],review:{status:'candidate',productionReady:false,warnings:['Source review pending']}};
}
function clip():SpriteClip {
  return {id:'walk.1',compositionId:'shot.1',startMs:100,endMs:1200,rate:1,placement:{x:100,y:200,scale:2,rotation:90}};
}
function wrapped(js:string,id:string) {
  return `const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines[${JSON.stringify(id)}]=tl;${js}`;
}

// Real installed GSAP on plain opacity targets; does not render or pretend to exercise browser CSS.
function gsapProbe(compiled:ReturnType<typeof compileActorMotion>,c:SpriteClip) {
  const targets=new Map<string,Record<string,unknown>>();
  for(const match of compiled.svg.matchAll(/<g id="(sprite-[^"]+-frame-\d+)" opacity="([01])"/g))
    targets.set(`[data-composition-id="${c.compositionId}"] [id="${match[1]}"]`,{opacity:Number(match[2])});
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    const target=targets.get(selector);
    if(!target) throw new Error(`Unknown sprite selector: ${selector}`);
    return [target];
  }};
  const window:Record<string,unknown>={document};
  const context=vm.createContext({window,document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;${wrapped(compiled.js,c.compositionId)}window.testTimeline=tl;gsap.ticker.sleep();`,context);
  const tl=window.testTimeline as {seek:(seconds:number,suppressEvents:boolean)=>unknown;kill:()=>unknown};
  return {tl,visible:()=>[...targets].filter(([,target])=>Number(target.opacity)>.5).map(([selector])=>selector)};
}
function visualSelector(m:ActorMotion,c:SpriteClip,index:number|null):string[] {
  if(index===null) return [];
  const keys:string[]=[];
  const nodes=m.frames.map(frame=>{
    const key=JSON.stringify([frame.rect,frame.anchor]);let node=keys.indexOf(key);
    if(node<0){node=keys.length;keys.push(key);}return node;
  });
  return [`[data-composition-id="${c.compositionId}"] [id="sprite-${c.id}-frame-${nodes[index]}"]`];
}

test('nonuniform durations are left closed/right open, deterministic and independent of source loop',()=>{
  const m=fixture(),c=clip();
  const times=[-1,99.999,100,169.999,170,399.999,400,519.999,520,1200,2000];
  assert.deepEqual(times.map(t=>sampleMotionFrame(m,c,t)),[null,null,0,0,1,1,2,2,2,2,2]);
  assert.deepEqual(times.slice().reverse().map(t=>sampleMotionFrame(m,c,t)).reverse(),times.map(t=>sampleMotionFrame(m,c,t)));
  assert.equal(m.source.loop,true);assert.equal(m.playback.mode,'once');
});
test('once rate preserves native metadata, requires full span and applies each end policy at action end',()=>{
  for(const end of ['hold','first','hide'] as const){
    const m=fixture('once',end),c={...clip(),rate:2};
    assert.equal(sampleMotionFrame(m,c,134.999),0);assert.equal(sampleMotionFrame(m,c,135),1);
    assert.equal(sampleMotionFrame(m,c,250),2);assert.equal(sampleMotionFrame(m,c,310),end==='hide'?null:end==='first'?0:2);
    const exact={...c,endMs:310};assert.doesNotThrow(()=>compileActorMotion(m,exact));
    const short={...c,endMs:309.999};
    assert.throws(()=>sampleMotionFrame(m,short,-1),/Once.*entire native duration/);
    assert.throws(()=>compileActorMotion(m,short),/Once.*entire native duration/);
    assert.throws(()=>motionLandmarkAt(m,short,'hand',100),/Once.*entire native duration/);
    assert.deepEqual(m.frames.map(f=>f.durationMs),[70,230,120]);
  }
});
test('loop is bounded by clip and holds the left limit at both cycle and frame boundaries',()=>{
  for(const end of ['hold','first','hide'] as const){
    const m=fixture('loop',end),c={...clip(),endMs:590};
    assert.equal(sampleMotionFrame(m,c,520),0);assert.equal(sampleMotionFrame(m,c,589.999),0);
    assert.equal(sampleMotionFrame(m,c,590),end==='hide'?null:0);
    assert.equal(sampleMotionFrame(m,{...c,endMs:520},520),end==='hide'?null:end==='first'?0:2);
    assert.equal(sampleMotionFrame(m,{...c,endMs:750},750),end==='hide'?null:end==='first'?0:1);
    assert.equal(sampleMotionFrame(m,c,10000),sampleMotionFrame(m,c,590));
  }
});
test('fractional strip timing is preserved without integer rounding',()=>{
  const m=fixture();m.source.kind='sprite-gen-strip';m.frames.forEach(f=>{f.durationMs=1000/24;});
  const c={...clip(),rate:1.25};const boundary=c.startMs+m.frames[0]!.durationMs/c.rate;
  assert.equal(sampleMotionFrame(m,c,boundary-.00001),0);assert.equal(sampleMotionFrame(m,c,boundary),1);
  assert.equal(compileActorMotion(m,c).report.nativeDurationMs,125);
  assert.ok(compileActorMotion(m,c).js.includes(String(boundary/1000)));
});
test('landmarks use each logical instance and anchor, positive scale, rotation and translation',()=>{
  const m=fixture(),c=clip();
  assert.deepEqual(motionLandmarkAt(m,c,'hand',100),{x:108,y:204});
  const last=motionLandmarkAt(m,c,'hand',400)!;
  assert.ok(Math.abs(last.x-112)<1e-10);assert.ok(Math.abs(last.y-192)<1e-10);
  assert.equal(motionLandmarkAt(m,c,'hand',99),null);
  m.playback.end='hide';assert.equal(motionLandmarkAt(m,c,'hand',520),null);
  assert.throws(()=>motionLandmarkAt(m,c,'missing',0),/Missing sprite landmark/);
  delete m.frames[2]!.landmarks.hand;assert.throws(()=>motionLandmarkAt(m,c,'hand',100),/Missing sprite landmark/);
});
test('malformed clips, frames and clocks are rejected by all entry points',()=>{
  const m=fixture(),c=clip();
  for(const change of [{rate:0},{rate:NaN},{endMs:100},{compositionId:'x"] injected'},{placement:{...c.placement,scale:-1}}]){
    const bad={...c,...change};
    assert.throws(()=>sampleMotionFrame(m,bad,100));assert.throws(()=>compileActorMotion(m,bad));
    assert.throws(()=>motionLandmarkAt(m,bad,'hand',100));
  }
  for(const change of [{durationMs:0},{durationMs:Infinity},{rect:{x:30,y:0,w:20,h:20}},{anchor:{x:100,y:20}}]){
    const bad=structuredClone(m);Object.assign(bad.frames[0]!,change);
    assert.throws(()=>sampleMotionFrame(bad,c,100));assert.throws(()=>compileActorMotion(bad,c));
    assert.throws(()=>motionLandmarkAt(bad,c,'hand',100));
  }
  for(const time of [NaN,Infinity,-Infinity]){
    assert.throws(()=>sampleMotionFrame(m,c,time),/finite/);assert.throws(()=>motionLandmarkAt(m,c,'hand',time),/finite/);
  }
});
test('SVG shares identical rect and anchor only, crops statically and report counts literal calls truthfully',()=>{
  const m=fixture(),c=clip(),before=structuredClone(m),out=compileActorMotion(m,c);
  assert.equal((out.svg.match(/<image /g)??[]).length,2);
  assert.match(out.svg,/clipPathUnits="userSpaceOnUse"/);assert.match(out.svg,/x="-20" y="0"/);
  assert.match(out.svg,/translate\(100 200\) rotate\(90\) scale\(2\)/);
  assert.equal(out.report.eventCount,out.js.split('\n').length);assert.equal(out.report.eventCount,7);
  assert.equal(out.report.frameCount,3);assert.equal(out.report.nativeDurationMs,420);assert.equal(out.report.clipDurationMs,1100);
  assert.equal(out.report.producer,SPRITE_PLAYER_VERSION);assert.equal(out.report.actorId,m.actorId);
  assert.equal(out.report.fingerprint,m.fingerprint);assert.equal(out.report.sourceLoop,true);
  assert.deepEqual(out.report.playback,m.playback);assert.equal(out.report.productionReady,false);assert.equal(out.report.speechSync,'none');
  assert.ok(out.report.warnings.includes('Source review pending'));assert.match(out.report.warnings.at(-1)!,/Candidate/);
  assert.deepEqual(m,before);assert.deepEqual(compileActorMotion(m,c),out);
  m.frames[2]!.anchor.x=9;assert.equal((compileActorMotion(m,c).svg.match(/<image /g)??[]).length,3);
});
test('local sheet URLs reject traversal, remote, encoded and markup resources',()=>{
  const m=fixture(),c=clip();
  assert.match(compileActorMotion(m,c).svg,new RegExp(`assets/${m.sheet.hash}\\.png`));
  assert.match(compileActorMotion(m,c,'assets/motions/v1/sheet.png').svg,/href="assets\/motions\/v1\/sheet.png"/);
  for(const url of ['', '../sheet.png','a/../sheet.png','./sheet.png','/sheet.png','//host/sheet.png','https://host/a.png',
    'C:/sheet.png','a\\sheet.png','a//b.png','a/%2e%2e/b.png','a.png?x=1','a.png#x','a" onload="x','a\0.png'])
    assert.throws(()=>compileActorMotion(m,c,url),/safe local relative path/);
});
test('event budget rejects before repeated generation and accepts exactly 6000 literal calls',()=>{
  const m=fixture('loop','hold');m.frames=m.frames.slice(0,2);m.frames.forEach(f=>{f.durationMs=1;});
  const c={...clip(),startMs:0,endMs:3000};
  const out=compileActorMotion(m,c);assert.equal(out.report.eventCount,6000);
  assert.throws(()=>compileActorMotion(m,{...c,endMs:3001}),/6002 events.*6000/);
  assert.throws(()=>compileActorMotion(m,{...c,endMs:120000,rate:2}),/maximum is 6000/);
  // A tiny cycle with one visual emits no redundant repeated transitions.
  m.frames[1]!.rect={...m.frames[0]!.rect};
  assert.equal(compileActorMotion(m,{...c,endMs:120000}).report.eventCount,1);
});
test('compiled SVG and literal fragment satisfy the unchanged scene security contract',()=>{
  const m=fixture(),c=clip(),out=compileActorMotion(m,c),js=wrapped(out.js,c.compositionId);
  assert.deepEqual(validateSceneScript(js,c.compositionId),[]);
  assert.doesNotMatch(out.js,/gsap\.timeline|window|callback|repeat|setTimeout/);
  for(const line of out.js.split('\n')) if(!line.endsWith(',0);'))assert.match(line,/immediateRender:false/);
  const shot={id:c.compositionId,startMs:0,endMs:1200} as Shot;
  const html=`<!doctype html><html><head><link rel="stylesheet" href="style.css"/></head><body><div data-composition-id="${c.compositionId}" data-duration="1.2" data-start="0" data-width="1280" data-height="720">${out.svg}</div><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`;
  assert.deepEqual(validateSceneFiles({files:[{path:'index.html',content:html},{path:'style.css',content:''},{path:'scene.js',content:js}],dependencies:[],notes:[]},shot,500000,[`assets/${m.sheet.hash}.png`]),[]);
});

for(const mode of ['once','loop'] as const) for(const end of ['hold','first','hide'] as const)
test(`real GSAP opacity parity: ${mode}/${end}, fresh zero, random forward/backward and exact boundaries`,t=>{
  for(const startMs of [0,100]) for(const rate of [.5,1,1.25,2]){
    const m=fixture(mode,end),c={...clip(),startMs,rate,endMs:1300},out=compileActorMotion(m,c),probe=gsapProbe(out,c);
    t.after(()=>probe.tl.kill());
    const times=[0,startMs-.001,startMs,startMs+.001,1299.999,1300,1300.001,2000];let cumulative=0;
    const period=420/rate;
    for(let cycle=0;cycle<(mode==='once'?1:4);cycle++){
      cumulative=0;
      for(const frame of m.frames){const at=startMs+cycle*period+cumulative/rate;times.push(at-.001,at,at+.001);cumulative+=frame.durationMs;}
    }
    times.push(startMs+period-.001,startMs+period,startMs+period+.001);
    // Seeded order is reproducible; every call still uses the sampler's arbitrary clock contract.
    let seed=20261007;
    for(let i=0;i<60;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;times.push(seed/2**32*2000);}
    for(const time of times.concat(times.slice().reverse()).filter(time=>time>=0)){
      probe.tl.seek(time/1000,true);
      assert.deepEqual(probe.visible(),visualSelector(m,c,sampleMotionFrame(m,c,time)),`${mode}/${end}, start=${startMs}, rate=${rate}, time=${time}`);
    }
  }
});

test('real GSAP handles distinct loop wrap visuals, changed anchors and single-frame end policies',t=>{
  for(const single of [false,true]) for(const end of ['hold','first','hide'] as const){
    const m=fixture('loop',end);m.frames=m.frames.slice(0,single?1:2);
    if(!single){m.frames[1]!.rect={...m.frames[0]!.rect};m.frames[1]!.anchor.x=9;}
    const c={...clip(),endMs:770},probe=gsapProbe(compileActorMotion(m,c),c);
    t.after(()=>probe.tl.kill());
    const times=[0,100,169.999,170,399.999,400,469.999,470,700,769.999,770,1000];
    for(const time of times.concat(times.slice().reverse())){
      probe.tl.seek(time/1000,true);assert.deepEqual(probe.visible(),visualSelector(m,c,sampleMotionFrame(m,c,time)),`single=${single}, end=${end}, time=${time}`);
    }
  }
});

test('real GSAP fractional strip boundary parity remains a delegated precision regression',t=>{
  const m=fixture('loop','hide');m.frames.forEach(f=>{f.durationMs=1000/24;});
  const c={...clip(),rate:1.3,endMs:800},probe=gsapProbe(compileActorMotion(m,c),c);
  t.after(()=>probe.tl.kill());
  const times=[0,800,100];
  for(let cycle=0;cycle<4;cycle++) for(let frame=0;frame<3;frame++){
    const at=c.startMs+cycle*(125/c.rate)+(frame*(1000/24))/c.rate;times.push(at-.001,at,at+.001);
  }
  for(const time of times.concat(times.slice().reverse())){
    probe.tl.seek(time/1000,true);assert.deepEqual(probe.visible(),visualSelector(m,c,sampleMotionFrame(m,c,time)),`fractional time ${time}`);
  }
});

test('exact arbitrary-clock parity contract exposes GSAP sub-resolution seek ambiguity',t=>{
  const m=fixture(),c=clip(),probe=gsapProbe(compileActorMotion(m,c),c);
  t.after(()=>probe.tl.kill());
  // GSAP rounds seconds to 7 decimal places; this clock rounds to the next boundary.
  // Keep the requested exact contract visible instead of weakening it to make a test pass.
  for(const time of [170,169.99999,170.00001,169.99999]){
    probe.tl.seek(time/1000,true);
    assert.deepEqual(probe.visible(),visualSelector(m,c,sampleMotionFrame(m,c,time)),`sub-resolution time ${time}`);
  }
});
