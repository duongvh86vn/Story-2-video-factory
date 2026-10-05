import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import {ArtDirectionSchema,validateArtDirection,customModelArt,customModelForegroundArt,MODEL_FOREGROUND_VERSION} from '../packages/director/art-direction.js';
import {compilePerformance,samplePerformance} from '../packages/animation/compiler.js';
import {cameraMatrixAt,cameraPoint} from '../packages/director/camera.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {buildScenes,assertLockedSceneCompatibility} from '../packages/scenes/index.js';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import type {Shot} from '../packages/core/schemas.js';
import {foregroundFixture,renderAuthored,silence,type ForegroundFixture} from './foreground-fixture.js';

const baseFragment='<rect id="body" x="-50" y="-50" width="100" height="100" fill="#EEEEEE"/>';
const frontFragment='<rect id="edge" x="-50" y="15" width="100" height="35" fill="#1D6C7C"/>';
function glyph(f:ForegroundFixture,base=baseFragment,front:string|null=frontFragment,projection?:'normalized-stretch'|'model-viewport'){
  const part=f.shot.visualization!.parts[0]!;
  f.shot.cinematic!.artDirection!.models=[{partId:part.id,svg:base,...(front===null?{}:{foregroundSvg:front}),sourceRefs:part.sourceRefs,labelMode:'none',controlMode:'none',...(projection?{projection}:{})}];
  return part;
}
function full(content:string,box='-50 -50 100 100',policy?:string){return '<svg viewBox="'+box+'"'+(policy?' preserveAspectRatio="'+policy+'"':'')+'>'+content+'</svg>';}

test('foreground passive/source/space contract and exact source/clock invariants',async t=>{
  const f=await foregroundFixture(t),original=structuredClone(f.shot);
  await t.test('optional omitted front retains ordinary bytes and opt-in foreground produces distinct passive IDs',()=>{
    const part=glyph(f,baseFragment,null),back=renderAuthored(f);
    assert.equal(customModelForegroundArt(f.shot,part.id,100,100),undefined);assert.equal(back.report.modelForegroundVersion,undefined);
    f.shot.cinematic!.artDirection!.models[0]!.foregroundSvg=frontFragment;const front=renderAuthored(f);
    assert.equal(front.report.modelForegroundVersion,MODEL_FOREGROUND_VERSION);assert.deepEqual(front.report.foregroundModels,[{partId:part.id}]);
    assert.notEqual(hash(front.files),hash(back.files));assert.deepEqual(front.geometry,back.geometry);
    assert.deepEqual(f.shot.host,original.host);assert.deepEqual(f.shot.cinematic!.performance,original.cinematic!.performance);assert.deepEqual(f.shot.sourceRefs,original.sourceRefs);
    const html=front.files.files.find(x=>x.path==='index.html')!.content;
    assert.ok(html.indexOf('data-sourced-foreground')>html.indexOf('data-actor-id'));
    const backIDs=[...customModelArt(f.shot,part.id,100,100)!.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
    const frontIDs=[...customModelForegroundArt(f.shot,part.id,100,100)!.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
    assert.ok(backIDs.every(id=>!frontIDs.includes(id)));assert.ok(frontIDs.length);
  });
  await t.test('normalized fragments, full default roots and viewport numeric/equivalent default-meet roots share one plane',()=>{
    for(const projection of [undefined,'normalized-stretch','model-viewport'] as const){
      for(const pair of [[full(baseFragment),full(frontFragment,'-5e1,-50,1e2,100','xMidYMid meet')],[full(baseFragment,'-50 -50 100 100','xMidYMid'),full(frontFragment)]]){
        glyph(f,pair[0],pair[1],projection);assert.doesNotThrow(()=>validateArtDirection(f.shot));assert.ok(customModelForegroundArt(f.shot,'table',120,60));
      }
    }
    glyph(f,baseFragment,frontFragment);assert.doesNotThrow(()=>validateArtDirection(f.shot));
    glyph(f,baseFragment,full(frontFragment));assert.throws(()=>validateArtDirection(f.shot),/viewBox|aspect|share/);
  });
  const invalid=[
    ['malformed','<svg viewBox="0 0 100 100"><rect width="2" height="2"/></g>'],
    ['empty','<g/>'],['definitions-only','<defs><rect width="10" height="10"/></defs>'],
    ['opacity-hidden','<g opacity="0"><rect width="10" height="10"/></g>'],
    ['display-hidden','<rect display="none" width="10" height="10"/>'],
    ['visibility-hidden','<rect visibility="hidden" width="10" height="10"/>'],
    ['executable','<script>alert(1)</script>'],['handler','<rect onload="bad" width="10" height="10"/>'],
    ['remote','<image href="https://example.invalid/x"/>'],['external-paint','<rect fill="url(https://example.invalid/x)" width="10" height="10"/>'],
  ] as const;
  for(const [name,svg] of invalid)await t.test('foreground rejects '+name,()=>{glyph(f,baseFragment,svg);assert.throws(()=>validateArtDirection(f.shot));});
  await t.test('mismatched/invalid viewBox/aspect/root cannot change coordinate or projection silently',()=>{
    for(const front of [full(frontFragment,'-50 -50 101 100'),full(frontFragment,'-50 -50 100 100','none'),full(frontFragment,'NaN 0 100 100'),full(frontFragment,'0 0 0 100'),full(frontFragment,'-50 -50 100 100','invented'),'before'+full(frontFragment),'<svg>'+frontFragment+'</svg>']){
      glyph(f,full(baseFragment),front,'model-viewport');assert.throws(()=>renderAuthored(f),/SVG|root|viewBox|aspect|share/i,front);
    }
    glyph(f,full(baseFragment),frontFragment,'model-viewport');assert.throws(()=>validateArtDirection(f.shot),/complete SVG/);
  });
  await t.test('API requires original explicit positive viewBox in model-viewport while normalized defaults remain valid',()=>{
    for(const box of [undefined,'0 0 0 100','0 0 -100 100','0 0 NaN 100','0 0 Infinity 100']){
      const root=(content:string)=>box===undefined?'<svg>'+content+'</svg>':full(content,box);
      for(const pair of [[root(baseFragment),full(frontFragment)],[full(baseFragment),root(frontFragment)]]){
        glyph(f,pair[0],pair[1],'model-viewport');const before=structuredClone(f.shot);
        assert.throws(()=>validateArtDirection(f.shot),/finite positive viewBox|invalid viewBox/i);assert.deepEqual(f.shot,before);
      }
    }
    for(const projection of [undefined,'normalized-stretch'] as const){glyph(f,'<svg>'+baseFragment+'</svg>','<svg>'+frontFragment+'</svg>',projection);assert.doesNotThrow(()=>validateArtDirection(f.shot));renderAuthored(f);}
  });
  await t.test('unknown/executable schema keys and unbound source identity reject with no mutation',()=>{
    for(const value of [{execute:'bad'},{assetId:'new'},{startMs:50},{target:'other'}]){glyph(f);Object.assign(f.shot.cinematic!.artDirection!.models[0]!,value);assert.equal(ArtDirectionSchema.safeParse(f.shot.cinematic!.artDirection).success,false);}
    glyph(f);f.shot.cinematic!.artDirection!.models[0]!.partId='unknown';assert.throws(()=>validateArtDirection(f.shot),/source identity/);
    glyph(f);f.shot.cinematic!.artDirection!.models[0]!.sourceRefs=[{kind:'narration',segmentId:'cue',quote:'invented'}];const before=structuredClone(f.shot);assert.throws(()=>validateArtDirection(f.shot),/source identity/);assert.deepEqual(f.shot,before);
  });
  await t.test('front-only visible motion is valid; missing or hidden/defs-only motion rejects',()=>{
    const part=glyph(f,baseFragment,'<g class="motion">'+frontFragment+'</g><circle class="thermal-hot" opacity="0" r="8" fill="#DD4422"/><circle class="thermal-cold" opacity="0" r="8" fill="#2255DD"/>');
    f.shot.visualization!.events=[{type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:1000,endMs:3000,motion:'rotate',contactRequired:false,sourceRefs:part.sourceRefs}];
    assert.doesNotThrow(()=>validateArtDirection(f.shot));const result=renderAuthored(f);
    assert.deepEqual(result.geometry,renderAuthored(f).geometry);
  });
  await t.test('missing or hidden/defs-only motion rejects independently of positive render gate',()=>{
    const part=glyph(f);f.shot.visualization!.events=[{type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:1000,endMs:3000,motion:'rotate',contactRequired:false,sourceRefs:part.sourceRefs}];
    for(const front of [frontFragment,'<defs><g class="motion"><rect width="2" height="2"/></g></defs>'+frontFragment,'<g class="motion" opacity="0">'+frontFragment.replace('id="edge"','id="hidden-edge"')+'</g>'+frontFragment]){glyph(f,baseFragment,front);assert.throws(()=>validateArtDirection(f.shot),/motion geometry/);}
  });
});

test('baseline779 real public renderer and cache equality; opt-in changes hash and locked conflict retains bytes',async t=>{
  const baseline=process.env.FOREGROUND_BASELINE;if(!baseline){t.skip('Isolated complete baseline required via FOREGROUND_BASELINE');return;}
  const f=await foregroundFixture(t);glyph(f,baseFragment,null);
  const oldRender=await import(pathToFileURL(path.join(baseline,'library/shots/cinematic.ts')).href) as typeof import('../library/shots/cinematic.js');
  const current=renderAuthored(f),previous=oldRender.renderCinematic(f.shot,f.profile,f.rig,silence,f.config,undefined,f.narration);
  assert.deepEqual(current.files,previous.files);assert.deepEqual(current.geometry,previous.geometry);assert.deepEqual(current.report,previous.report);
  const oldEngine=await import(pathToFileURL(path.join(baseline,'packages/render/hyperframes.ts')).href) as typeof import('../packages/render/hyperframes.js');
  const oldScenes=await import(pathToFileURL(path.join(baseline,'packages/scenes/index.ts')).href) as typeof import('../packages/scenes/index.js');
  let validations=0;t.mock.method(oldEngine.HyperFramesEngine.prototype,'validate',async()=>{validations++;return {pass:true,errors:[]};});t.mock.method(HyperFramesEngine.prototype,'validate',async()=>{validations++;return {pass:true,errors:[]};});
  for(const engine of [oldEngine.HyperFramesEngine,HyperFramesEngine])for(const method of ['renderDraft','renderFinal','snapshot','snapshots'] as const)t.mock.method(engine.prototype,method,async()=>{throw new Error('FORBIDDEN_NATIVE_RENDER');});
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('FORBIDDEN_PROVIDER');});
  await oldScenes.buildScenes(f.root,f.config,f.router,{shots:[f.shot]},f.characters,f.manifest);
  const recordFile=path.join(f.root,'scenes/scene/scene.json'),oldRecord=await readJson<any>(recordFile),count=validations;
  await buildScenes(f.root,f.config,f.router,{shots:[f.shot]},f.characters,f.manifest);
  assert.equal(validations,count,'new baseline-omitted scene must reuse old genuine public cache identity');assert.deepEqual(await readJson(recordFile),oldRecord);
  const filesBefore=await fs.readFile(path.join(f.root,'scenes/scene/scene.js'));
  f.shot.cinematic!.artDirection!.models[0]!.foregroundSvg=frontFragment;
  await assert.rejects(assertLockedSceneCompatibility(f.root,f.config,{shots:[f.shot]},f.characters,f.manifest,{locked:{'scene:scene':true}}),/locked scene input\/renderer conflict/i);
  assert.ok((await fs.readFile(path.join(f.root,'scenes/scene/scene.js'))).equals(filesBefore));assert.deepEqual(await readJson(recordFile),oldRecord);
  await buildScenes(f.root,f.config,f.router,{shots:[f.shot]},f.characters,f.manifest);
  const added=await readJson<any>(recordFile);assert.notEqual(added.inputHash,oldRecord.inputHash);assert.notEqual(added.sourceHash,oldRecord.sourceHash);assert.equal(validations,count+1);
  const oldAnimation=await import(pathToFileURL(path.join(baseline,'packages/animation/schemas.ts')).href) as typeof import('../packages/animation/schemas.js');
  const newAnimation=await import('../packages/animation/schemas.js');const oldArt=await import(pathToFileURL(path.join(baseline,'packages/director/art-direction.ts')).href) as typeof import('../packages/director/art-direction.js');
  assert.equal(oldAnimation.ANIMATION_VERSION,newAnimation.ANIMATION_VERSION);assert.equal(oldArt.ARTWORK_RENDER_VERSION,(await import('../packages/director/art-direction.js')).ARTWORK_RENDER_VERSION);
  await writeJson(path.join(f.root,'baseline-cache-proof.json'),{label:'AUTHORED controlled validator, not visual acceptance',oldRecord,added,validations,oldFilesHash:hash(previous.files),newFilesHash:hash(current.files)});
});

test('scoped actual browser: foreground order, events and both-rig bound prop CTM on compiled clock',async t=>{
  const evidence=process.env.FOREGROUND_CAST_EVIDENCE;if(!evidence){t.skip('Explicit isolated evidence/browser ownership required');return;}
  const paths=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
  let executable:string|undefined;for(const candidate of paths)if(await fs.stat(candidate).then(()=>true,()=>false)){executable=candidate;break;}
  if(!executable){t.skip('Existing browser unavailable; no download/account fallback');return;}
  const browserDir=await fs.mkdtemp(path.join(evidence,'owned-browser-'));
  const browser=await puppeteer.launch({executablePath:executable,headless:true,userDataDir:path.join(browserDir,'profile'),args:['--disable-background-networking','--disable-sync','--no-first-run'],timeout:20000});
  const ownedBrowserProcess=browser.process()!,birth=execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-CimInstance Win32_Process -Filter "ProcessId=${ownedBrowserProcess.pid}"; [pscustomobject]@{pid=$p.ProcessId;parentPid=$p.ParentProcessId;birthUTC=$p.CreationDate.ToUniversalTime().ToString('o');path=$p.ExecutablePath}|ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true}).trim();
  await writeJson(path.join(browserDir,'browser-before-load.json'),{label:'AUTHORED isolated render/snapshot ONLY',pid:ownedBrowserProcess.pid,argv:ownedBrowserProcess.spawnargs,birth:JSON.parse(birth),recordedUTC:new Date().toISOString(),userDataDir:path.join(browserDir,'profile'),contentLoaded:false});
  const preload=execFileSync('powershell.exe',['-NoProfile','-Command',`$all=Get-CimInstance Win32_Process; $ids=@(${ownedBrowserProcess.pid}); do{$next=@($all|Where-Object {$_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids}|ForEach-Object {$_.ProcessId}); $ids+=$next}while($next.Count -gt 0); @($all|Where-Object {$_.ProcessId -in $ids}|ForEach-Object {[pscustomobject]@{pid=$_.ProcessId;parentPid=$_.ParentProcessId;birthUTC=$_.CreationDate.ToUniversalTime().ToString('o');argv=$_.CommandLine}})|ConvertTo-Json -Depth 5`],{encoding:'utf8',windowsHide:true}).trim();
  await writeJson(path.join(browserDir,'browser-owned-census-before-load.json'),{recordedUTC:new Date().toISOString(),contentLoaded:false,processes:JSON.parse(preload)});
  const watchdog=setTimeout(()=>{void browser.close();},120000);
  const page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.setRequestInterception(true);
  const requests:string[]=[];page.on('request',r=>{requests.push(r.url());void r.abort();});
  const browserConsole:string[]=[];page.on('console',message=>browserConsole.push(message.type()+': '+message.text()));page.on('pageerror',error=>browserConsole.push('pageerror: '+String(error)));
  try{
    const load=async(f:ForegroundFixture)=>{
      const r=renderAuthored(f),html=r.secured.files.find(x=>x.path==='index.html')!.content,css=r.secured.files.find(x=>x.path==='style.css')!.content,js=r.secured.files.find(x=>x.path==='scene.js')!.content;
      await writeJson(path.join(f.root,'authored-render.json'),{label:'AUTHORED source fixture; no native or full movie quality claim',shot:f.shot,report:r.report,geometry:r.geometry,files:r.secured});
      await page.setContent(html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'')+'<style>'+css+'</style>');
      await page.addScriptTag({path:createRequire(import.meta.url).resolve('gsap/dist/gsap.js')});await page.addScriptTag({content:js});return r;
    };
    await t.test('stationary foreground after all actors and matching sourced motion/thermal clocks',async sub=>{ const stationary=await foregroundFixture(sub);const part=glyph(stationary,'<g class="motion"><rect id="body" x="-50" y="-50" width="100" height="100" fill="#E5D3A1"/></g>','<g class="motion">'+frontFragment+'</g><circle class="thermal-hot" opacity="0" r="8" fill="#DD4422"/><circle class="thermal-cold" opacity="0" r="8" fill="#2255DD"/>');
    Object.assign(part,{x:.4,y:.60,width:.45,height:.2}); stationary.shot.cinematic!.continuity.models=stationary.shot.visualization!.parts.map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));stationary.shot.cinematic!.artDirection!.layers=[
      {id:'genericfront',plane:'foreground',role:'decoration',svg:'<circle cx="100" cy="200" r="5" fill="#223344"/>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]},
      {id:'caption',plane:'overlay',role:'explanation',sourceRefs:part.sourceRefs,svg:'<text id="caption-probe" x="640" y="657" text-anchor="middle" font-size="26" fill="#112233">Lena and Amir wait beside the table.</text>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]}];
    stationary.shot.cinematic!.camera={framing:'wide',focus:'ensemble',movement:'push-in',anchor:{x:640,y:367.2},startScale:.9,endScale:.95};
    stationary.shot.camera={...stationary.shot.camera,shotSize:'wide',movement:'push-in',angle:'eye-level'}; part.states=[{value:'hot',sourceRefs:part.sourceRefs}];
    stationary.shot.visualization!.events=[{type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:1000,endMs:3000,motion:'rotate',contactRequired:false,sourceRefs:part.sourceRefs},{type:'state',targetId:part.id,narrationAnchor:'cue',startMs:3000,endMs:5000,motion:'none',contactRequired:false,state:'hot',sourceRefs:part.sourceRefs}];
    const sourcedEvents=structuredClone(stationary.shot.visualization!.events);stationary.shot.visualization!.events=[];await load(stationary);
    const observe=async(time:number)=>page.evaluate(({time,id})=>{
      (window as any).__timelines[id].seek(time,true);
      const front=document.querySelector('[data-sourced-foreground]')! as SVGGraphicsElement,base=document.querySelector('#object-0 .motion') as SVGGraphicsElement|null,motion=front.querySelector('.motion')! as SVGGraphicsElement;
      const motionMatrix=motion.getCTM()!,baseMatrix=base?.getCTM();
      const localMotion=motion.transform.baseVal.consolidate()?.matrix??new DOMMatrix(),localBase=base?.transform.baseVal.consolidate()?.matrix??new DOMMatrix();
      const actors=Array.from(new Set([document.querySelector('#performer'),...Array.from(document.querySelectorAll('[data-actor-id]'))].filter(Boolean))) as Element[];
      const order=actors.every(actor=>Boolean(actor.compareDocumentPosition(front)&Node.DOCUMENT_POSITION_FOLLOWING));
      const caption=document.querySelector('[id$="caption-probe"]')!.getBoundingClientRect(),bounds=front.getBoundingClientRect();
      const camera=front.closest('.camera-rig')!.getBoundingClientRect();
      return {time,order,actorCount:actors.length,frontBeforeGeneric:Boolean(front.compareDocumentPosition(document.querySelector('[data-art-layer="genericfront"]')!)&Node.DOCUMENT_POSITION_FOLLOWING),frontBeforeCaption:Boolean(front.compareDocumentPosition(document.querySelector('[data-art-layer="caption"]')!)&Node.DOCUMENT_POSITION_FOLLOWING),hot:getComputedStyle(front.querySelector('.thermal-hot')!).opacity,baseHot:getComputedStyle(document.querySelector('#object-0 .thermal-hot')!).opacity,cold:getComputedStyle(front.querySelector('.thermal-cold')!).opacity,hotRaw:front.querySelector('.thermal-hot')?.getAttribute('opacity'),baseHotRaw:document.querySelector('#object-0 .thermal-hot')?.getAttribute('opacity'),coldRaw:front.querySelector('.thermal-cold')?.getAttribute('opacity'),motion:motion.getAttribute('transform'),baseMotion:base?.getAttribute('transform'),motionLocalCTM:{a:localMotion.a,b:localMotion.b,c:localMotion.c,d:localMotion.d,e:localMotion.e,f:localMotion.f},baseMotionLocalCTM:{a:localBase.a,b:localBase.b,c:localBase.c,d:localBase.d,e:localBase.e,f:localBase.f},motionCTM:{a:motionMatrix.a,b:motionMatrix.b,c:motionMatrix.c,d:motionMatrix.d,e:motionMatrix.e,f:motionMatrix.f},baseMotionCTM:baseMatrix?{a:baseMatrix.a,b:baseMatrix.b,c:baseMatrix.c,d:baseMatrix.d,e:baseMatrix.e,f:baseMatrix.f}:null,caption:{x:caption.x,y:caption.y,width:caption.width,height:caption.height},bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},camera:{x:camera.x,y:camera.y}};
    },{time,id:stationary.shot.id});
    const semantic=(value:Awaited<ReturnType<typeof observe>>)=>{const {motion,baseMotion,...state}=value;return state;};
    const structural=(value:Awaited<ReturnType<typeof observe>>)=>{assert.ok(value.order&&value.frontBeforeGeneric&&value.frontBeforeCaption);assert.equal(value.actorCount,2);assert.ok(value.caption.x>=0&&value.caption.y>=0&&value.caption.x+value.caption.width<=1280&&value.caption.y+value.caption.height<=720);};
    const observations:Awaited<ReturnType<typeof observe>>[]=[];
    for(const time of [0,2,4,2,0]){const value=await observe(time);observations.push(value);structural(value);if(time===0||time===2||time===4)await page.screenshot({path:path.join(stationary.root,'stationary-'+time+'.png')});}
    await writeJson(path.join(stationary.root,'stationary-observations.json'),{label:'AUTHORED raw transform strings retained; exact CTM/bounds/order comparisons',observations});
    assert.deepEqual(semantic(observations[1]!),semantic(observations[3]!));assert.deepEqual(semantic(observations[0]!),semantic(observations[4]!));assert.equal(observations[0]!.hot,'0');
    stationary.shot.visualization!.events=sourcedEvents;const before=structuredClone(stationary.shot);await load(stationary);assert.deepEqual(stationary.shot,before);
    const eventTimes=[0,.999,1,2,2.999,3,4,5,6],eventObservations:Awaited<ReturnType<typeof observe>>[]=[];
    for(const time of eventTimes){const value=await observe(time);eventObservations.push(value);structural(value);await writeJson(path.join(stationary.root,'event-'+time+'.json'),value);
      assert.ok(value.motionCTM&&value.baseMotionCTM);const angle=(m:{a:number;b:number})=>Math.atan2(m.b,m.a)*180/Math.PI;
      const expected=Math.max(0,Math.min(1,(time-1)/2))*120;
      assert.ok(Math.abs(angle(value.motionLocalCTM)-expected)<.01,'foreground rotation must follow authored 1–3s linear event clock');
      assert.ok(Math.abs(angle(value.baseMotionLocalCTM)-expected)<.01,'base rotation must share sourced event clock');
      assert.equal(value.hot,time<3?'0':'1');assert.equal(value.baseHot,value.hot);assert.equal(value.cold,'0');
      if(time===2||time===4)await page.screenshot({path:path.join(stationary.root,'event-'+time+'.png')});
    }
    for(let i=eventTimes.length-1;i>=0;i--)assert.deepEqual(semantic(await observe(eventTimes[i]!)),semantic(eventObservations[i]!),'exact semantic CTM, bounds and heat must reproduce on reverse seek');
    assert.deepEqual(stationary.shot.visualization!.events,sourcedEvents);assert.deepEqual(stationary.shot,before);
    await writeJson(path.join(stationary.root,'event-observations.json'),{label:'AUTHORED actual browser sourced motion/thermal samples, not native film',eventTimes,eventObservations,sourceEvents:sourcedEvents});
    });
    for(const kind of ['stick-man','mini-robot'] as const)await t.test(kind+' bound prop front follows world point, camera and actual contact at adaptive clocks',async sub=>{
      const f=await foregroundFixture(sub,kind,true),part=glyph(f);const p=f.shot.cinematic!.performance,g=p.gestures.find(g=>g.action==='pick-place')!;assert.ok(g);assert.notEqual(p.scale,1);
      const render=await load(f),compiled=compilePerformance(p,f.profile,silence),propId=g.propId!;
      const frames=compiled.frames,times=[0,g.contactMs!-1,g.contactMs!,frames[Math.floor(frames.length*.35)]!.timeMs,(g.contactMs!+g.releaseMs!)/2,g.releaseMs!-1,g.releaseMs!,p.durationMs];
      const forward:any[]=[];
      const observe=async(time:number)=>{
        const value=await page.evaluate(({time,id,propId})=>{
          (window as any).__timelines[id].seek(time/1000,true);
          const front=document.querySelector('[data-sourced-foreground]')! as SVGGraphicsElement,back=document.querySelector('[data-prop-entity] [data-custom-model]')! as SVGGraphicsElement;
          const a=front.querySelector('rect')! as SVGGraphicsElement,b=back.querySelector('rect')! as SVGGraphicsElement;
          const af=a.getScreenCTM()!,bf=b.getScreenCTM()!,fc=new DOMPoint(0,0).matrixTransform(af),bc=new DOMPoint(0,0).matrixTransform(bf);
          const cm=(front.closest('.camera-rig') as SVGGraphicsElement).getScreenCTM()!;const local=new DOMPoint(fc.x,fc.y).matrixTransform(cm.inverse());return {cameraMatrix:{a:cm.a,b:cm.b,c:cm.c,d:cm.d,e:cm.e,f:cm.f},worldFront:{x:local.x,y:local.y},front:{x:fc.x,y:fc.y},back:{x:bc.x,y:bc.y},frontScale:{x:Math.hypot(af.a,af.b),y:Math.hypot(af.c,af.d)},backScale:{x:Math.hypot(bf.a,bf.b),y:Math.hypot(bf.c,bf.d)},camera:front.closest('.camera-rig')!.getAttribute('transform'),transform:front.getAttribute('transform')};
        },{time,id:f.shot.id,propId});
        const frame=samplePerformance(p,f.profile,time,silence),expected=cameraPoint(frame.props[propId]!.point,cameraMatrixAt(f.shot.cinematic!.camera,p.stage,p.durationMs,time));
        const analyticDelta=Math.hypot(value.front.x-expected.x,value.front.y-expected.y);const delta=Math.hypot(value.worldFront.x-frame.props[propId]!.point.x,value.worldFront.y-frame.props[propId]!.point.y),pairDelta=Math.hypot(value.front.x-value.back.x,value.front.y-value.back.y);
        await writeJson(path.join(f.root,'clock-'+String(time).replace('.','_')+'.json'),{time,value,expected,analyticDelta,worldDelta:delta,pairDelta,scale:p.scale,attached:frame.props[propId]!.attached,hand:frame.hands.right,prop:frame.props[propId]!.point});
        const analyticCamera=cameraMatrixAt(f.shot.cinematic!.camera,p.stage,p.durationMs,time);assert.ok(Math.abs(value.cameraMatrix.a-analyticCamera.scale)<.000051,'actual legacy GSAP camera scale must stay within its four-decimal attribute interpolation quantization');assert.ok(Math.abs(value.cameraMatrix.e-analyticCamera.x)<.000051);assert.ok(Math.abs(value.cameraMatrix.f-analyticCamera.y)<.000051);assert.ok(delta<.02,'front must follow the compiled world clock/camera, measured delta='+delta);assert.ok(pairDelta<.02,'front/back share the same world center under nonunit performance scale: '+pairDelta);
        assert.ok(Math.abs(value.frontScale.x-value.backScale.x)<.0001);assert.ok(Math.abs(value.frontScale.y-value.backScale.y)<.0001);return value;
      };
      for(const time of times)forward.push(await observe(time));
      for(let i=times.length-1;i>=0;i--)assert.deepEqual(await observe(times[i]!),forward[i],'reverse seek must reproduce exact DOM state');
      for(const at of [g.contactMs!,Math.round((g.contactMs!+g.releaseMs!)/2),g.releaseMs!]){await observe(at);await page.screenshot({path:path.join(f.root,'prop-'+at+'.png')});}
      assert.ok(render.geometry.interactions.some(a=>a.type==='operate-model'&&a.errorPx<.01));assert.deepEqual(f.shot.host!.actions.find(a=>a.type==='operate-model')!.contactMs,g.contactMs!);
      await writeJson(path.join(f.root,'prop-summary.json'),{label:'AUTHORED',kind,scale:p.scale,adaptiveFrameCount:frames.length,times,geometry:render.geometry,report:render.report});
    });
    await writeJson(path.join(browserDir,'page-requests.json'),requests);
  }finally{
    clearTimeout(watchdog);await browser.close();await writeJson(path.join(browserDir,'browser-terminal.json'),{pid:ownedBrowserProcess.pid,exitCode:ownedBrowserProcess.exitCode,signalCode:ownedBrowserProcess.signalCode,closedUTC:new Date().toISOString(),requests,browserConsole});
  }
});