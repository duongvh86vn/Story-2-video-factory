import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { temporary } from './support.js';
import { creativeFixture } from './creative-fixture.js';
import { ShotSchema, type Shot } from '../packages/core/schemas.js';
import { ArtDirectionSchema } from '../packages/director/art-direction-schemas.js';
import { customModelArt } from '../packages/director/art-direction.js';
import { directCinematicShot } from '../packages/director/index.js';
import { partAnchor } from '../packages/host/controller.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { secureSceneFiles, validateSceneFiles, validateSceneScript } from '../packages/scenes/security.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
type Fixture=Awaited<ReturnType<typeof creativeFixture>>;
const evidence=process.env.ARTWORK_PROJECTION_EVIDENCE;
async function retain(name:string,value:unknown){if(evidence)await fs.writeFile(path.join(evidence,name),typeof value==='string'?value:JSON.stringify(value,null,2));}
function authored(f:Fixture,svg:string,projection?:'normalized-stretch'|'model-viewport'):Shot{
  const part=f.shot.visualization!.parts[0]!;
  return ShotSchema.parse({...f.shot,cinematic:{...f.shot.cinematic,artDirection:{...f.artDirection,models:[{
    partId:part.id,sourceRefs:part.sourceRefs,svg,labelMode:'artwork',...(projection?{projection}:{})
  }]}}});
}
function render(f:Fixture,shot:Shot){return renderCinematic(shot,f.profile,f.rig,silence,f.config);}

test('default and explicit normalized projection preserve complete public scenes and anchors',async t=>{
  const f=await creativeFixture(await temporary(t));
  for(const svg of ['<g class="motion"><rect x="-30" y="-20" width="60" height="40"/></g>',
    '<svg viewBox="-20 10 240 120"><circle class="motion" cx="100" cy="70" r="12"/></svg>']){
    const legacy=authored(f,svg),explicit=authored(f,svg,'normalized-stretch');
    assert.deepEqual(render(f,legacy).files,render(f,explicit).files);
    for(const anchor of ['center','handle','label'] as const)assert.deepEqual(partAnchor(legacy,legacy.visualization!.parts[0]!.id,anchor,1280,720),partAnchor(explicit,explicit.visualization!.parts[0]!.id,anchor,1280,720));
  }
});

test('whole baseline public renderer remains byte identical for omitted projection',async t=>{
  const baseline=process.env.ARTWORK_PROJECTION_BASELINE;
  if(!baseline){t.skip('Requires an isolated complete baseline checkout; no private function extraction.');return;}
  const f=await creativeFixture(await temporary(t));
  const old=await import(pathToFileURL(path.join(baseline,'library/shots/cinematic.ts')).href) as {renderCinematic:typeof renderCinematic};
  const oldHost=await import(pathToFileURL(path.join(baseline,'packages/host/controller.ts')).href) as {partAnchor:typeof partAnchor};
  for(const svg of ['<rect x="-45" y="-30" width="90" height="60"/><g class="motion"><circle r="12"/></g>',
    '<svg viewBox="-20 10 240 120"><rect x="-20" y="10" width="240" height="120"/><circle class="motion" cx="100" cy="70" r="12"/></svg>']){
    const shot=authored(f,svg),current=render(f,shot),previous=old.renderCinematic(shot,f.profile,f.rig,silence,f.config);
    assert.deepEqual(current.files,previous.files,'HTML/CSS/JS bytes and file metadata must remain identical');
    assert.deepEqual(current.geometry,previous.geometry);
    for(const kind of ['center','handle','label'] as const)assert.deepEqual(partAnchor(shot,shot.visualization!.parts[0]!.id,kind,1280,720),oldHost.partAnchor(shot,shot.visualization!.parts[0]!.id,kind,1280,720));
    await retain(`baseline-${svg.startsWith('<svg')?'svg':'fragment'}.json`,{shot,current,previous});
  }
});

const invalidRoots=[
  ['fragment','<g class="motion"><circle r="10"/></g>'],
  ['multiple roots','<svg viewBox="0 0 100 100"><circle class="motion" r="10"/></svg><svg viewBox="0 0 100 100"></svg>'],
  ['missing viewBox','<svg><circle class="motion" r="10"/></svg>'],
  ['nonfinite origin','<svg viewBox="NaN 0 100 100"><circle class="motion" r="10"/></svg>'],
  ['nonfinite extent','<svg viewBox="0 0 Infinity 100"><circle class="motion" r="10"/></svg>'],
  ['hex origin','<svg viewBox="0x0 0 100 100"><circle class="motion" r="10"/></svg>'],
  ['zero width','<svg viewBox="0 0 0 100"><circle class="motion" r="10"/></svg>'],
  ['negative height','<svg viewBox="0 0 100 -1"><circle class="motion" r="10"/></svg>'],
  ['self closing root','<svg viewBox="0 0 100 100"/>'],
  ['text outside root','before<svg viewBox="0 0 100 100"><circle class="motion" r="10"/></svg>'],
];
for(const [name,svg] of invalidRoots)test(`public viewport renderer rejects ${name}`,async t=>{
  const f=await creativeFixture(await temporary(t));
  assert.throws(()=>render(f,authored(f,svg!,'model-viewport')),/complete SVG root|viewBox/i);
});

test('projection enum and finite positive viewport dimensions are guarded',async t=>{
  const f=await creativeFixture(await temporary(t));
  const good=authored(f,'<svg viewBox="0 0 100 100"><circle class="motion" r="10"/></svg>','model-viewport');
  assert.equal(ArtDirectionSchema.safeParse({...good.cinematic!.artDirection,models:[{...good.cinematic!.artDirection!.models[0]!,projection:'stretch-anything'}]}).success,false);
  for(const [w,h] of [[0,100],[100,0],[-1,100],[100,Infinity],[NaN,100]])assert.throws(()=>customModelArt(good,good.visualization!.parts[0]!.id,w!,h!),/finite and positive/);
});

test('SVG viewBox grammar accepts decimal exponent comma separators and rejects repeated commas',async t=>{
  const f=await creativeFixture(await temporary(t));
  for(const box of ['-2.5 +.5 1e2 100.','0, 0, 100, 100','\t0\n0\r100 100\t']){
    assert.doesNotThrow(()=>render(f,authored(f,`<svg viewBox="${box}"><circle class="motion" r="10"/></svg>`,'model-viewport')),box);
  }
  for(const box of ['0,,0,100,100','0 0 0x64 100']){
    assert.throws(()=>render(f,authored(f,`<svg viewBox="${box}"><circle class="motion" r="10"/></svg>`,'model-viewport')),/complete SVG root|viewBox/i,box);
  }
});

test('viewport projection preserves passive SVG, identity, rendered-motion and script security gates',async t=>{
  const f=await creativeFixture(await temporary(t));
  for(const bad of ['<script>alert(1)</script>','<circle onload="alert(1)" r="10"/>','<image href="https://example.invalid/x"/>','<g class="camera-rig"><circle r="10"/></g>']){
    assert.throws(()=>render(f,authored(f,`<svg viewBox="0 0 100 100">${bad}</svg>`,'model-viewport')),/SVG|executable|reserved|forbidden/i);
  }
  const shot=authored(f,'<svg viewBox="0 0 100 100"><rect width="10" height="10"/></svg>','model-viewport');
  const part=shot.visualization!.parts[0]!;
  shot.visualization!.events.push({type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:1000,endMs:3000,motion:'rotate',contactRequired:false,sourceRefs:part.sourceRefs});
  assert.throws(()=>render(f,shot),/motion.*geometry/i);
  const identity=authored(f,'<svg viewBox="0 0 100 100"><circle class="motion" r="10"/></svg>','model-viewport');
  identity.cinematic!.artDirection!.models[0]!.sourceRefs=[{kind:'narration',segmentId:'cue',quote:'invented identity'}];
  assert.throws(()=>render(f,identity),/source identity/i);
  const safe=render(f,authored(f,'<svg viewBox="0 0 100 100"><circle class="motion" r="10"/></svg>','model-viewport')).files.files.find(file=>file.path==='scene.js')!.content;
  assert.deepEqual(validateSceneScript(safe,f.shot.id),[]);
  const target=JSON.stringify(`[data-composition-id="${f.shot.id}"] .motion`);
  for(const attr of ['transform:"matrix(1 0 0 1 0 0)"','d:"M0 0L10 10"','href:"https://example.invalid"'])assert.ok(validateSceneScript(`${safe}\ntl.to(${target},{attr:{${attr}},duration:1},0);`,f.shot.id).length>0,attr);
});

const cases=[
  {name:'wide-date',width:563.2,height:115.2,box:[-280,-57.5,560,115],font:56,policy:undefined},
  {name:'qualifier',width:371.2,height:64.8,box:[-185.5,-32.5,371,65],font:28,policy:undefined},
  {name:'square',width:160,height:160,box:[0,0,100,100],font:20,policy:undefined},
  {name:'tall-nonzero-origin',width:120,height:240,box:[30,-90,60,120],font:20,policy:undefined},
  {name:'explicit-none',width:300,height:100,box:[-40,10,100,100],font:20,policy:'none'},
  {name:'explicit-meet',width:300,height:100,box:[-40,10,100,100],font:20,policy:'xMinYMin meet'},
];

test('real browser SVG CTM, model bounds, local event pivot and seek/reverse through public cinematic scenes',async t=>{
  const paths=[process.env.ARTWORK_PROJECTION_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter((v):v is string=>!!v);
  let executable:string|undefined;
  for(const p of paths){if(await fs.stat(p).then(()=>true,()=>false)){executable=p;break;}}
  if(!executable){t.skip('No existing browser executable; no downloads.');return;}
  const f=await creativeFixture(await temporary(t));
  const browser=await puppeteer.launch({executablePath:executable,headless:true,args:['--disable-background-networking','--no-first-run'],timeout:20000});
  const owned=browser.process()!;
  await retain('browser-start.json',{pid:owned.pid,spawnargs:owned.spawnargs,observedUtc:new Date().toISOString()});
  try{
    const page=await browser.newPage();await page.setViewport({width:1280,height:720});
    await page.setRequestInterception(true);page.on('request',request=>{void request.abort();});
    const requested=process.env.ARTWORK_PROJECTION_CASES?.split(',');
    for(const c of cases.filter(c=>!requested||requested.includes(c.name)))await t.test(c.name,async()=>{
      const initial=structuredClone(f.shot),part=initial.visualization!.parts[0]!;
      Object.assign(part,{x:.68,y:.35,width:c.width/1280,height:c.height/720});
      initial.visualization!.parts=[part];initial.visualization!.relations=[];
      // Projection fixtures use a newly authored wide ensemble, not the seed's close mechanism camera.
      initial.visualization!.type='question';
      initial.host!.actions=[{type:'point',startMs:0,endMs:5000,narrationAnchor:'cue',target:{modelId:initial.visualization!.modelId,partId:part.id,anchor:'center'}}];
      const shot=directCinematicShot(initial,f.beat,f.profile,f.config,undefined,{parts:[part]});
      const [x,y,w,h]=c.box as [number,number,number,number],cx=x+w/2,cy=y+h/2;
      const svg=`<svg x="999" y="999" width="2" height="2" viewBox="${c.box.join(' ')}"${c.policy?` preserveAspectRatio="${c.policy}"`:''}><rect id="bounds" x="${x}" y="${y}" width="${w}" height="${h}" fill="#EEE"/><g class="motion"><circle cx="${cx}" cy="${cy}" r="8"/></g><text id="probe" x="${cx}" y="${cy}" font-size="${c.font}">1886</text></svg>`;
      shot.visualization!.events=[{type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:1000,endMs:3000,motion:'rotate',contactRequired:false,sourceRefs:part.sourceRefs}];
      const metrics:unknown[]=[];
      for(const projection of ['normalized-stretch','model-viewport'] as const){
        shot.cinematic!.artDirection={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,svg,projection,labelMode:'artwork',motionOrigin:{x:cx,y:cy}}]};
        const parsed=ShotSchema.parse(shot),files=secureSceneFiles(render(f,parsed).files);
        assert.deepEqual(validateSceneFiles(files,parsed,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
        const html=files.files.find(file=>file.path==='index.html')!.content,css=files.files.find(file=>file.path==='style.css')!.content,js=files.files.find(file=>file.path==='scene.js')!.content;
        await retain(`${c.name}-${projection}-scene.json`,{shot:parsed,files});
        await page.setContent(html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'')+`<style>${css}</style>`);
        await page.addScriptTag({path:createRequire(import.meta.url).resolve('gsap/dist/gsap.js')});
        await page.addScriptTag({content:js});
        const samples=[];
        for(const time of [0,2,3,2,0]){
          const sample=await page.evaluate(({shotId,partId,time})=>{
            const timeline=(window as unknown as {__timelines:Record<string,{seek:(time:number,suppress:boolean)=>void}>}).__timelines[shotId]!;timeline.seek(time,true);
            const root=document.querySelector(`[data-custom-model="${partId}"]`)!;
            const text=root.querySelector('text') as SVGGraphicsElement,rect=root.querySelector('rect') as SVGGraphicsElement;
            const camera=root.closest('.camera-rig') as SVGGraphicsElement;
            const m=text.getScreenCTM()!,cameraM=camera.getScreenCTM()!,bounds=rect.getBBox(),r=rect.getScreenCTM()!;
            const motion=root.querySelector('.motion') as SVGGraphicsElement,mm=motion.getScreenCTM()!,circle=motion.querySelector('circle')!;
            const center=new DOMPoint(Number(circle.getAttribute('cx')),Number(circle.getAttribute('cy'))).matrixTransform(mm);
            const corners=[new DOMPoint(bounds.x,bounds.y),new DOMPoint(bounds.x+bounds.width,bounds.y+bounds.height)].map(p=>p.matrixTransform(r));
            const outer=(root as SVGGraphicsElement).transform.baseVal.consolidate()?.matrix;
            return {sx:Math.hypot(m.a,m.b),sy:Math.hypot(m.c,m.d),cameraScale:Math.hypot(cameraM.a,cameraM.b),font:Number(text.getAttribute('font-size')),corners:corners.map(p=>({x:p.x,y:p.y})),center:{x:center.x,y:center.y},motionMatrix:[mm.a,mm.b,mm.c,mm.d,mm.e,mm.f],rectBBox:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},rectMatrix:[r.a,r.b,r.c,r.d,r.e,r.f],textMatrix:[m.a,m.b,m.c,m.d,m.e,m.f],outerMatrix:outer?[outer.a,outer.b,outer.c,outer.d,outer.e,outer.f]:null,svg:{x:root.querySelector('svg')!.getAttribute('x'),width:root.querySelector('svg')!.getAttribute('width'),viewBox:root.querySelector('svg')!.getAttribute('viewBox'),policy:root.querySelector('svg')!.getAttribute('preserveAspectRatio')}};
          },{shotId:shot.id,partId:part.id,time});samples.push(sample);
        }
        const first=samples[0]!,none=c.policy==='none';
        const inner=none?undefined:Math.min(c.width/w,c.height/h);
        const expectedX=projection==='model-viewport'?(none?c.width/w:inner!):(none?100/w:Math.min(100/w,100/h))*c.width/100;
        const expectedY=projection==='model-viewport'?(none?c.height/h:inner!):(none?100/h:Math.min(100/w,100/h))*c.height/100;
        // Observation only: persist failures before any numerical assertion can abort the case.
        const controlShot=structuredClone(parsed);
        controlShot.cinematic!.artDirection!.models[0]!.svg='<svg viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100"/></svg>';
        controlShot.cinematic!.artDirection!.models[0]!.projection='normalized-stretch';
        const controlHtml=customModelArt(controlShot,part.id,400,100)!;
        const integerControl=await page.evaluate(({shotId,html})=>{
          const camera=document.querySelector(`[data-composition-id="${shotId}"] .camera-rig`) as SVGGraphicsElement;
          const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');wrapper.innerHTML=html;camera.appendChild(wrapper);
          const rect=wrapper.querySelector('rect') as SVGGraphicsElement,b=rect.getBBox(),m=rect.getScreenCTM()!,cm=camera.getScreenCTM()!,scale=Math.hypot(cm.a,cm.b);
          const a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);
          const result={expectedWidth:400,expectedHeight:100,width:(z.x-a.x)/scale,height:(z.y-a.y)/scale,bbox:{x:b.x,y:b.y,width:b.width,height:b.height},matrix:[m.a,m.b,m.c,m.d,m.e,m.f]};wrapper.remove();return result;
        },{shotId:shot.id,html:controlHtml});
        await retain(`${c.name}-${projection}-preassert.json`,{samples,expectedX,expectedY,expectedWidth:w*expectedX,expectedHeight:h*expectedY,actualWidth:(first.corners[1]!.x-first.corners[0]!.x)/first.cameraScale,actualHeight:(first.corners[1]!.y-first.corners[0]!.y)/first.cameraScale,integerControl});
        for(const [actual,expected] of [[first.sx/first.cameraScale,expectedX],[first.sy/first.cameraScale,expectedY]])assert.ok(Math.abs(actual!-expected!)<1e-6,`${projection}: measured ${actual}, expected ${expected}`);
        if(projection==='model-viewport'&&!none)assert.ok(Math.abs(first.sx/first.sy-1)<1e-6,'aspect preserving viewport must retain round glyph axes');
        // SVG fractional bounds round to float precision: observed deltas up to 0.000014861 stage-px.
        assert.ok(Math.abs((first.corners[1]!.x-first.corners[0]!.x)/first.cameraScale-w*expectedX)<1e-4,'sourced model width must be fitted according to its aspect policy');
        assert.ok(Math.abs((first.corners[1]!.y-first.corners[0]!.y)/first.cameraScale-h*expectedY)<1e-4,'sourced model height must be fitted according to its aspect policy');
        assert.deepEqual(samples[1],samples[3],'reverse seek must reproduce all matrices and text metrics at 2s');
        assert.deepEqual(samples[0],samples[4],'reverse seek must restore the complete initial pose');
        // Compare rotation against each clock's unrotated center, so camera movement is not mistaken for pivot drift.
        for(const time of [0,2,3]){
          const center=await page.evaluate(({shotId,partId,time,cx,cy})=>{
            (window as unknown as {__timelines:Record<string,{seek:(time:number,suppress:boolean)=>void}>}).__timelines[shotId]!.seek(time,true);
            const text=document.querySelector(`[data-custom-model="${partId}"] text`) as SVGGraphicsElement;
            const point=new DOMPoint(cx,cy).matrixTransform(text.getScreenCTM()!);return {x:point.x,y:point.y};
          },{shotId:shot.id,partId:part.id,time,cx,cy});
          const sample=samples[[0,2,3].indexOf(time)]!;
          assert.ok(Math.hypot(sample.center.x-center.x,sample.center.y-center.y)<.01,'rotation must preserve its glyph-local event pivot under a uniform camera');
        }
        metrics.push({projection,samples,expectedX,expectedY,stageEm:first.font*first.sy/first.cameraScale});
        assert.equal(first.svg.viewBox,c.box.join(' '));assert.equal(first.svg.policy,c.policy??null);
      }
      await retain(`${c.name}-metrics.json`,metrics);
    });
  }finally{
    await browser.close();
    await retain('browser-terminal.json',{pid:owned.pid,exitCode:owned.exitCode,signalCode:owned.signalCode,observedUtc:new Date().toISOString()});
  }
});
