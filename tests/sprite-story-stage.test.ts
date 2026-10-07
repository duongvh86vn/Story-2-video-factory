// Runtime delegated. Fixtures, GSAP, probes and assertions execute only in test callbacks.
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {compileSpriteStage,sampleSpriteStage,spriteMotionKey} from '../packages/motion/stage.js';
import {SpriteStageSchema,SPRITE_STAGE_VERSION,type SpriteStage} from '../packages/motion/stage-schemas.js';
import {type ActorMotion} from '../packages/motion/schemas.js';
import {validateSceneScript} from '../packages/scenes/security.js';

function fixture(){
  const hash='a'.repeat(64);
  const motion:ActorMotion={version:'actor-motion-1',id:'lila-walk',actorId:'lila',state:'walk',view:'right',fingerprint:hash,
    source:{kind:'sprite-gen-strip',metadataHash:hash,sheetHash:hash,registrationHash:hash,referenceHash:hash,loop:true},
    sheet:{path:'sheet.png',hash,width:40,height:20},playback:{mode:'once',end:'hold'},
    frames:[{rect:{x:0,y:0,w:20,h:20},durationMs:100,anchor:{x:10,y:20},landmarks:{hand:{x:12,y:16}}},
      {rect:{x:20,y:0,w:20,h:20},durationMs:100,anchor:{x:10,y:20},landmarks:{hand:{x:14,y:10}}}],
    review:{status:'candidate',productionReady:false,warnings:[]}};
  const transform={x:0,y:0,scale:1,rotation:0};
  const plan:SpriteStage={version:1,producer:SPRITE_STAGE_VERSION,id:'shot.1',durationMs:1000,stage:{width:1280,height:720},
    actors:[{actorId:'lila',clips:[{id:'lila.1',compositionId:'shot.1',motionId:motion.id,fingerprint:hash,startMs:100,endMs:600,rate:1,
      placement:{x:100,y:200,scale:2,rotation:90},sourceRefs:[{kind:'narration',segmentId:'s1',quote:'Lila walks.'}],
      root:[{timeMs:100,transform,ease:'none'},{timeMs:600,transform:{...transform,x:100},ease:'none'}]}]}],contacts:[]};
  return {plan,motion,motions:new Map([[spriteMotionKey(motion.id,hash),motion]])};
}
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('source pixels stay unchanged; candidate fragment uses one external timeline and existing validator',()=>{
  const {plan,motion,motions}=fixture(),before=JSON.stringify(motion),result=compileSpriteStage(plan,motions);
  assert.equal(JSON.stringify(motion),before);assert.equal(result.report.productionReady,false);
  assert.equal(result.report.speechSync,'none');assert.equal(result.report.contactCoverage,'declared-points-only');
  assert.match(result.svg,new RegExp(`assets/${motion.sheet.hash}\\.png`));
  assert.doesNotMatch(result.js,/gsap\.timeline|callback|requestAnimationFrame|setTimeout/);
  const js=`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["shot.1"]=tl;${result.js}tl.to({},{duration:1},0);`;
  assert.deepEqual(validateSceneScript(js,'shot.1'),[]);
  assert.equal(result.report.eventCount,(result.js.match(/tl\.(?:set|to)\(/g)??[]).length);
});

test('slot hides held native frame at clip end; gaps and scene end are invisible',()=>{
  const {plan,motions}=fixture();
  const times=[-1,0,99.999,100,199.999,200,300,599.999,600,999,1000,2000];
  assert.deepEqual(times.map(time=>sampleSpriteStage(plan,motions,time).map(actor=>actor.frameIndex)),[[],[],[],[0],[0],[1],[1],[1],[],[],[],[]]);
  const clip=structuredClone(plan.actors[0]!.clips[0]!);clip.id='lila.2';clip.startMs=800;clip.endMs=1000;
  clip.root=[{...clip.root[0]!,timeMs:800},{...clip.root[1]!,timeMs:1000}];plan.actors[0]!.clips.push(clip);
  assert.equal(sampleSpriteStage(plan,motions,750).length,0);assert.equal(sampleSpriteStage(plan,motions,800)[0]!.clipId,'lila.2');
});

test('two actors have independent logical frames, slots and motion identities',()=>{
  const {plan,motion,motions}=fixture(),other=structuredClone(motion);other.actorId='karo';other.id='karo-walk';other.playback.mode='loop';
  motions.set(spriteMotionKey(other.id,other.fingerprint),other);
  const clip=structuredClone(plan.actors[0]!.clips[0]!);clip.id='karo.1';clip.motionId=other.id;clip.rate=2;
  plan.actors.push({actorId:'karo',clips:[clip]});
  const samples=sampleSpriteStage(plan,motions,250);
  assert.deepEqual(samples.map(s=>[s.actorId,s.frameIndex]),[['lila',1],['karo',1]]);
  assert.equal(sampleSpriteStage(plan,motions,300).find(s=>s.actorId==='karo')!.frameIndex,0);
  const output=compileSpriteStage(plan,motions);assert.match(output.svg,/data-actor-id="karo"/);assert.match(output.svg,/sprite-slot-karo\.1/);
});

test('root transform composes outside clip placement and measures frame corners and landmarks',()=>{
  const {plan,motions}=fixture(),clip=plan.actors[0]!.clips[0]!;
  clip.root.forEach(key=>{key.transform={x:10,y:20,rotation:90,scale:3};});
  const sample=sampleSpriteStage(plan,motions,100)[0]!;
  near(sample.landmarks.hand!.x,-602);near(sample.landmarks.hand!.y,344);
  near(sample.bounds.left,-650);near(sample.bounds.right,-530);near(sample.bounds.top,320);near(sample.bounds.bottom,440);
  assert.equal(sample.view,'right');
});

test('sine interpolation follows destination ease and accepts fractional clocks without metadata rounding',()=>{
  const {plan,motions}=fixture(),clip=plan.actors[0]!.clips[0]!;
  clip.root[1]!.ease='sine.inOut';
  near(sampleSpriteStage(plan,motions,225)[0]!.root.x,14.64466094067262);
  near(sampleSpriteStage(plan,motions,350)[0]!.root.x,50);
  const times=[100,200,225,599.999,300,100];
  assert.deepEqual(times.map(t=>sampleSpriteStage(plan,motions,t)),times.slice().reverse().map(t=>sampleSpriteStage(plan,motions,t)).reverse());
  assert.throws(()=>sampleSpriteStage(plan,motions,NaN),/clock.*finite/);
});

test('renderer clock governs slot/key boundaries, adjacent clips and hidden end',()=>{
  const {plan,motions}=fixture(),clip=plan.actors[0]!.clips[0]!;
  assert.equal(sampleSpriteStage(plan,motions,99.99999).length,1);
  assert.equal(sampleSpriteStage(plan,motions,599.99999).length,0);
  const second=structuredClone(clip);second.id='lila.2';second.startMs=clip.endMs;second.endMs=1000;
  second.root=[{...second.root[0]!,timeMs:600},{...second.root[1]!,timeMs:1000}];plan.actors[0]!.clips.push(second);
  assert.equal(sampleSpriteStage(plan,motions,600)[0]!.clipId,'lila.2');
  second.startMs=599.999;second.root[0]!.timeMs=second.startMs;
  assert.throws(()=>compileSpriteStage(plan,motions),/overlap/);
  second.startMs=600;second.root[0]!.timeMs=600;
  second.root.splice(1,0,{...second.root[0]!,timeMs:600.00001});
  assert.throws(()=>SpriteStageSchema.parse(plan),/strictly increase/);
});

test('contact measures registered point through both transforms and caller-resolved target',()=>{
  const {plan,motions}=fixture();
  plan.contacts.push({id:'touch',actorId:'lila',clipId:'lila.1',landmark:'hand',targetId:'berry',timeMs:100,effectMs:150,maxErrorPx:1,sourceRefs:plan.actors[0]!.clips[0]!.sourceRefs});
  const compiled=compileSpriteStage(plan,motions,new Map([['berry',{x:108,y:204}]]));
  assert.equal(compiled.report.contacts[0]!.errorPx,0);
  assert.throws(()=>compileSpriteStage(plan,motions),/Missing.*scene target/);
  assert.throws(()=>compileSpriteStage(plan,motions,new Map([['berry',{x:0,y:0}]])),/exceeds tolerance/);
  plan.contacts[0]!.effectMs=99.99999;assert.throws(()=>compileSpriteStage(plan,motions),/effect must follow contact/);
});

test('missing landmarks, hidden native end and malformed contact ownership are errors',()=>{
  const {plan,motion,motions}=fixture();
  plan.contacts.push({id:'touch',actorId:'lila',clipId:'lila.1',landmark:'hand',targetId:'berry',timeMs:300,maxErrorPx:1,sourceRefs:plan.actors[0]!.clips[0]!.sourceRefs});
  motion.playback.end='hide';assert.throws(()=>compileSpriteStage(plan,motions,new Map([['berry',{x:0,y:0}]])),/Hidden sprite contact/);
  motion.playback.end='hold';delete motion.frames[0]!.landmarks.hand;
  assert.throws(()=>compileSpriteStage(plan,motions,new Map([['berry',{x:0,y:0}]])),/Missing sprite landmark/);
  plan.contacts[0]!.actorId='unknown';assert.throws(()=>compileSpriteStage(plan,motions),/outside its actor clip/);
});

test('no fabricated motion, mismatched cast/fingerprint, short once action or mirror is accepted',()=>{
  const {plan,motion,motions}=fixture();
  assert.throws(()=>compileSpriteStage(plan,new Map()),/Missing sprite motion/);
  motion.actorId='someone';assert.throws(()=>sampleSpriteStage(plan,motions,0),/identity mismatch/);motion.actorId='lila';
  motion.fingerprint='b'.repeat(64);assert.throws(()=>compileSpriteStage(plan,motions),/identity mismatch/);motion.fingerprint='a'.repeat(64);
  const clip=plan.actors[0]!.clips[0]!;clip.endMs=299.99999;clip.root.at(-1)!.timeMs=clip.endMs;
  assert.throws(()=>sampleSpriteStage(plan,motions,0),/entire native duration/);
  clip.endMs=600;clip.root.at(-1)!.timeMs=600;clip.root[0]!.transform.scale=-1;
  assert.throws(()=>compileSpriteStage(plan,motions));
});

test('global literal-call budget rejects individually valid motions without truncation',()=>{
  const {plan,motion}=fixture();motion.playback.mode='loop';motion.frames.forEach(frame=>{frame.durationMs=1;});
  plan.durationMs=1500;const base=plan.actors[0]!.clips[0]!,motions=new Map<string,ActorMotion>();plan.actors=[];
  for(let i=0;i<4;i++){
    const m=structuredClone(motion);m.actorId=`actor${i}`;m.id=`motion${i}`;motions.set(spriteMotionKey(m.id,m.fingerprint),m);
    const clip=structuredClone(base);clip.id=`clip${i}`;clip.motionId=m.id;clip.startMs=0;clip.endMs=1500;
    clip.root=[{...clip.root[0]!,timeMs:0},{...clip.root[1]!,timeMs:1500}];plan.actors.push({actorId:m.actorId,clips:[clip]});
  }
  assert.throws(()=>compileSpriteStage(plan,motions),/stage exceeds 12000/);
});

// Real installed GSAP on plain opacity/AttrPlugin targets; browser painting is a separate acceptance test.
test('shared GSAP seek agrees with sampled root/slot when seeking forward and backward',()=>{
  const {plan,motions}=fixture();plan.actors[0]!.clips[0]!.root[1]!.ease='sine.inOut';
  const compiled=compileSpriteStage(plan,motions);
  const targets=new Map<string,Record<string,unknown>>(),attributes=new Map<string,Map<string,string>>();
  for(const match of compiled.svg.matchAll(/<g id="([^"]+)"[^>]*>/g)){
    const id=match[1]!,attrs=new Map<string,string>();
    for(const attr of match[0].matchAll(/([a-z]+)="([^"]*)"/g))attrs.set(attr[1]!,attr[2]!);
    attributes.set(id,attrs);
    targets.set(`[data-composition-id="shot.1"] [id="${id}"]`,{opacity:Number(attrs.get('opacity')??1),getAttribute:(key:string)=>attrs.get(key)??null,setAttribute:(key:string,value:string)=>attrs.set(key,String(value))});
  }
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    const target=targets.get(selector);if(!target)throw new Error(`Unknown target ${selector}`);return [target];
  }},window:Record<string,unknown>={document},context=vm.createContext({window,document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;const tl=gsap.timeline({paused:true});${compiled.js}tl.to({},{duration:1},0);window.testTimeline=tl;gsap.ticker.sleep();`,context);
  const timeline=window.testTimeline as {seek:(seconds:number,suppressEvents:boolean)=>void;kill:()=>void};
  for(const time of [0,100,225,599.999,600,1000,300,100,0]){
    timeline.seek(time/1000,true);
    const sample=sampleSpriteStage(plan,motions,time)[0],visible=Number(targets.get('[data-composition-id="shot.1"] [id="sprite-slot-lila.1"]')!.opacity)>.5;
    assert.equal(visible,Boolean(sample));
    if(sample){
      const match=/translate\(([-\d.e+]+) ([-\d.e+]+)\)/.exec(attributes.get('sprite-root-lila.1')!.get('transform')!);
      assert.ok(match);assert.ok(Math.abs(Number(match[1])-sample.root.x)<.001);
    }
  }
  timeline.kill();
});
