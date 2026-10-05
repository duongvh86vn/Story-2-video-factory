import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import YAML from 'yaml';
import {sceneLabels,sceneLabelIdentity} from '../library/shots/scene-labels.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {renderExplainer} from '../library/shots/explainer.js';
import {EXPLAINER_RECIPES} from '../packages/explainer/recipes.js';
import {getStyle} from '../library/styles/index.js';
import {secureSceneFiles} from '../packages/scenes/security.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';
import {buildScenes,assertLockedSceneCompatibility,validateExplainerSources} from '../packages/scenes/index.js';
import {buildServer} from '../apps/server/index.js';
import type {Coordinator} from '../apps/server/jobs.js';
import {hash,readJson,writeJson} from '../packages/core/utils.js';
import type {SceneFiles} from '../packages/core/schemas.js';
import {labelFixture,renderLabel,activity} from './scene-labels-fixture.js';

const kinds=['question','mechanism','process','evolution','comparison','breakdown','event-sequence','summary'] as const;
const expected={
 en:{headings:['Let’s explore','How it works','Step by step','Through the milestones','Compare the differences','Explore the parts','Follow the story','What we discovered'],setting:'Setting and illustration',concept:'Conceptual illustration',control:'Illustrative model control'},
 ja:{headings:['一緒に考えよう','しくみを見てみよう','順を追って','発展の歩み','違いを比べよう','各部分を見てみよう','物語をたどろう','わかったこと'],setting:'場面と図解',concept:'概念の図解',control:'図解の操作部'},
 ko:{headings:['함께 알아봐요','작동 원리','단계별로 살펴봐요','발전 과정','차이를 비교해요','각 부분을 살펴봐요','이야기를 따라가요','알게 된 내용'],setting:'장면과 설명 그림',concept:'개념 설명',control:'설명용 모형 조작부'}
} as const;
const html=(files:SceneFiles)=>files.files.find(f=>f.path==='index.html')!.content;
const digest=(files:SceneFiles)=>hash(files.files.slice().sort((a,b)=>a.path.localeCompare(b.path)));
const localeRows=[['en-US','en'],['EN-gb','en'],['vi-VN','vi'],['VI','vi'],['ja-JP','ja'],['JA','ja'],['ko-KR','ko'],['KO','ko'],['fr-FR','en'],['und','en']] as const;

test('locale prefixes/fallback and isolated label value objects',()=>{
 for(const [tag,locale] of localeRows){assert.equal(sceneLabels(tag).language,locale);assert.deepEqual(sceneLabels(tag).heading,sceneLabels(locale).heading);}
 assert.equal(sceneLabels().language,'vi');assert.equal(sceneLabels('en').fontFamily,'Arial');assert.equal(sceneLabels('vi').fontFamily,'Arial');
 assert.match(sceneLabels('ja').fontFamily,/Yu Gothic.*MS Gothic.*Noto Sans CJK JP/);assert.match(sceneLabels('ko').fontFamily,/Malgun Gothic.*Noto Sans CJK KR/);
 const labels=sceneLabels('en');labels.heading.question='MUTATED';assert.equal(sceneLabels('en').heading.question,expected.en.headings[0]);
});

test('public renderers localize only factory text; default explainer is byte-exact VI',async t=>{
 const f=await labelFixture(t,{control:true}),original=structuredClone({shot:f.shot,narration:f.narration,beat:f.beat,profile:f.profile,rig:f.rig});
 for(const lang of ['en','ja','ko'] as const)for(const [i,kind] of kinds.entries())await t.test(lang+' '+kind,()=>{
  const shot=structuredClone(f.shot);shot.visualization!.type=kind;shot.recipeId=EXPLAINER_RECIPES[kind];
  const cfg=structuredClone(f.config);cfg.project.language=lang;const before=structuredClone(shot);
  const result=renderCinematic(shot,f.profile,f.rig,activity,cfg,undefined,f.narration);const content=html(result.files);
  assert.ok(content.includes(expected[lang].headings[i]!));assert.ok(content.includes(expected[lang].setting));assert.ok(content.includes('aria-label="'+expected[lang].control+'"'));
  assert.deepEqual(shot,before);assert.deepEqual(result.geometry,renderCinematic(shot,f.profile,f.rig,activity,{...cfg,project:{...cfg.project,language:'vi'}},undefined,f.narration).geometry);
 });
 assert.deepEqual({shot:f.shot,narration:f.narration,beat:f.beat,profile:f.profile,rig:f.rig},original);
 const d=await labelFixture(t,{diagram:true}),base=process.env.SCENE_LABELS_BASELINE!;assert.ok(base);
 const oldDiagram=await import(pathToFileURL(path.join(base,'library/shots/explainer.ts')).href) as typeof import('../library/shots/explainer.js');
 const defaultRender=renderExplainer(d.shot,d.profile,d.rig,activity,getStyle(d.config),1280,720);
 assert.deepEqual(defaultRender,oldDiagram.renderExplainer(d.shot,d.profile,d.rig,activity,getStyle(d.config),1280,720));
 assert.deepEqual(defaultRender,renderExplainer(d.shot,d.profile,d.rig,activity,getStyle(d.config),1280,720,false,'vi'));
 for(const lang of ['en','ja','ko'] as const){const r=renderExplainer(d.shot,d.profile,d.rig,activity,getStyle(d.config),1280,720,false,lang);assert.ok(html(r.files).includes(expected[lang].concept));assert.ok(html(r.files).includes(d.shot.visualization!.parts[0]!.label));assert.deepEqual(r.geometry,defaultRender.geometry);}
});

test('old a321 byte/cache identities, conditional invalidation and atomic lock protection',async t=>{
 const base=process.env.SCENE_LABELS_BASELINE!;assert.ok(base);
 const oldC=await import(pathToFileURL(path.join(base,'library/shots/cinematic.ts')).href) as typeof import('../library/shots/cinematic.js');
 const oldScenes=await import(pathToFileURL(path.join(base,'packages/scenes/index.ts')).href) as typeof import('../packages/scenes/index.js');
 const oldEngine=await import(pathToFileURL(path.join(base,'packages/render/hyperframes.ts')).href) as typeof import('../packages/render/hyperframes.js');
 let validations=0;for(const engine of [oldEngine.HyperFramesEngine,HyperFramesEngine]){
  t.mock.method(engine.prototype,'validate',async()=>{validations++;return {pass:true,errors:[]};});
  for(const method of ['renderDraft','renderFinal','snapshot','snapshots'] as const)t.mock.method(engine.prototype,method,async()=>{throw new Error('FORBIDDEN_NATIVE');});
 }
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('FORBIDDEN_PROVIDER');});
 const cases=[
  ['VI heading/control','vi',true,true,true,true],['EN Arial model-label only','en',false,true,false,true],
  ['JA model-label only','ja',false,true,false,false],['KO model-label only','ko',false,true,false,false],
  ['EN all factory hidden','en',false,false,false,true],['JA all factory hidden','ja',false,false,false,true],['KO all factory hidden','ko',false,false,false,true],
  ['EN heading','en',true,false,false,false],['EN control','en',false,false,true,false]
 ] as const;
 for(const [name,lang,heading,labels,controls,reuse] of cases)await t.test(name,async sub=>{
  const f=await labelFixture(sub,{control:controls});f.config.project.language=lang;const art=f.shot.cinematic!.artDirection!;
  art.showHeading=heading;for(const model of art.models){model.labelMode=labels?'renderer':'none';model.controlMode=controls?'renderer':'none';}
  if(!heading&&!labels&&!controls)art.layers=[{id:'author-text',plane:'overlay',role:'decoration',svg:'<text x="640" y="640" font-family="Arial" fill="#142D40">AUTHORED 名称 이름</text>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]}];
  const old=oldC.renderCinematic(f.shot,f.profile,f.rig,activity,f.config,undefined,f.narration),current=renderLabel(f);const oldFiles=secureSceneFiles(old.files);
  if(reuse)assert.deepEqual(current.files,oldFiles.files);else assert.notEqual(digest(current),digest(oldFiles));
  assert.equal(sceneLabelIdentity(f.shot,f.config)===undefined,reuse);
  const board={shots:[f.shot]},protectedInputs=structuredClone({shot:f.shot,narration:f.narration,profile:f.profile,rig:f.rig,assets:f.assets});
  await oldScenes.buildScenes(f.root,f.config,f.router,board,f.characters,f.assets);
  const file=path.join(f.root,'scenes',f.shot.id,'scene.json'),before=await readJson<any>(file),bytes=await fs.readFile(path.join(f.root,'scenes',f.shot.id,'index.html')),n=validations;
  if(!reuse){await assert.rejects(assertLockedSceneCompatibility(f.root,f.config,board,f.characters,f.assets,{locked:{['scene:'+f.shot.id]:true}}),/locked scene input\/renderer conflict/);assert.ok(bytes.equals(await fs.readFile(path.join(f.root,'scenes',f.shot.id,'index.html'))));assert.deepEqual(await readJson(file),before);}
  else await assertLockedSceneCompatibility(f.root,f.config,board,f.characters,f.assets,{locked:{['scene:'+f.shot.id]:true}});
  await buildScenes(f.root,f.config,f.router,board,f.characters,f.assets);const after=await readJson<any>(file);
  if(reuse){assert.deepEqual(after,before);assert.equal(validations,n);}else{assert.notEqual(after.inputHash,before.inputHash);assert.notEqual(after.sourceHash,before.sourceHash);assert.equal(validations,n+1);}
  const count=validations,accepted=structuredClone(after);f.config.project.language=lang==='ja'?'ja-JP':lang==='ko'?'ko-KR':lang==='en'?'en-US':'vi-VN';
  await buildScenes(f.root,f.config,f.router,board,f.characters,f.assets);assert.deepEqual(await readJson(file),accepted);assert.equal(validations,count);
  assert.deepEqual({shot:f.shot,narration:f.narration,profile:f.profile,rig:f.rig,assets:f.assets},protectedInputs);
  await writeJson(path.join(f.root,'cache-proof.json'),{label:'AUTHORED source/cache; controlled engine validate',name,reuse,before,after,oldFilesHash:digest(oldFiles),currentFilesHash:digest(current),validations});
 });
 for(const [relative,key] of [['packages/animation/schemas.ts','ANIMATION_VERSION'],['packages/director/schemas.ts','DIRECTION_VERSION'],['packages/director/art-direction.ts','ARTWORK_RENDER_VERSION']] as const){
  const old=await import(pathToFileURL(path.join(base,relative)).href),current=await import(pathToFileURL(path.join(process.cwd(),relative)).href);assert.equal(old[key],current[key]);
 }
});

test('trusted source/scene API propagates locale, rejects tampering and protects files',async t=>{
 t.mock.method(HyperFramesEngine.prototype,'validate',async()=>({pass:true,errors:[]}));
 for(const method of ['renderDraft','renderFinal','snapshot','snapshots'] as const)t.mock.method(HyperFramesEngine.prototype,method,async()=>{throw new Error('FORBIDDEN_NATIVE');});
 for(const diagram of [false,true])await t.test(diagram?'legacy diagram':'cinematic',async sub=>{
  const f=await labelFixture(sub,{diagram,control:!diagram});f.config.project.language='ja';
  await fs.writeFile(path.join(f.root,'project.yaml'),YAML.stringify(f.config));await writeJson(path.join(f.root,'work/storyboard.json'),{shots:[f.shot]});
  await buildScenes(f.root,f.config,f.router,{shots:[f.shot]},f.characters,f.assets);const files=renderLabel(f);
  assert.deepEqual(await validateExplainerSources(f.root,f.config,f.shot,files),[]);
  const wrongConfig=structuredClone(f.config);wrongConfig.project.language='ko';const wrong=diagram?renderExplainer(f.shot,f.profile,f.rig,activity,getStyle(f.config),1280,720,false,'ko').files:renderCinematic(f.shot,f.profile,f.rig,activity,wrongConfig,undefined,f.narration).files;
  assert.ok((await validateExplainerSources(f.root,f.config,f.shot,wrong)).length);
  const tampered=structuredClone(files);tampered.files.find(x=>x.path==='index.html')!.content=html(files).replace(diagram?expected.ja.concept:expected.ja.headings[1], 'TAMPERED LOCALE');assert.ok((await validateExplainerSources(f.root,f.config,f.shot,tampered)).length);
  const blocked=async()=>{throw new Error('FORBIDDEN_COORDINATOR');};const core:Coordinator={createProject:blocked,getProjectStatus:blocked,runPipeline:blocked,approveProject:blocked,updateLocks:blocked,invalidateProject:blocked};
  const app=await buildServer({repoRoot:process.cwd(),projectsRoot:path.dirname(f.root),coordinator:core});try{
   const url='/api/projects/'+path.basename(f.root)+'/scenes/'+f.shot.id;const response=await app.inject({url});assert.equal(response.statusCode,200);assert.deepEqual(response.json().files.slice().sort((a:any,b:any)=>a.path.localeCompare(b.path)),files.files.slice().sort((a,b)=>a.path.localeCompare(b.path)));
   const saved=await app.inject({method:'PUT',url,payload:{...tampered,revision:response.json().revision}});assert.equal(saved.statusCode,403);assert.equal(saved.json().error.code,'READ_ONLY');
   assert.equal((await app.inject({url})).json().revision,response.json().revision);
  }finally{await app.close();}
 });
});

test('AUTHORED isolated Chrome EN/JA/KO eight headings, glyphs, computed fonts and control labels',async t=>{
 const root=process.env.SCENE_LABELS_EVIDENCE!;assert.ok(root);const executable='C:/Program Files/Google/Chrome/Application/chrome.exe';
 if(!await fs.stat(executable).then(()=>true,()=>false)){t.skip('Installed Chrome absent; no fallback/download');return;}
 const dir=await fs.mkdtemp(path.join(root,'owned-browser-')),browser=await puppeteer.launch({executablePath:executable,headless:true,userDataDir:path.join(dir,'profile'),args:['--disable-background-networking','--disable-sync','--no-first-run'],timeout:15000});
 const proc=browser.process()!,timer=setTimeout(()=>{void browser.close();},120000),consoleEntries:string[]=[],requests:string[]=[];
 try{
  const census=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','$all=Get-CimInstance Win32_Process; $ids=@('+proc.pid+'); do{$next=@($all|Where-Object {$_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids}|ForEach-Object {$_.ProcessId});$ids+=$next}while($next.Count -gt 0); @($all|Where-Object {$_.ProcessId -in $ids}|ForEach-Object {[pscustomobject]@{pid=$_.ProcessId;parentPid=$_.ParentProcessId;birthUTC=$_.CreationDate.ToUniversalTime().ToString("o");argv=$_.CommandLine}})|ConvertTo-Json -Depth 5'],{encoding:'utf8',windowsHide:true}).trim());
  await writeJson(path.join(dir,'browser-before-load.json'),{label:'AUTHORED isolated locale samples',pid:proc.pid,argv:proc.spawnargs,census,contentLoaded:false,recordedUTC:new Date().toISOString()});
  const page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.setRequestInterception(true);page.on('request',r=>{requests.push(r.url());void r.abort();});page.on('console',m=>consoleEntries.push(m.type()+': '+m.text()));page.on('pageerror',e=>consoleEntries.push('pageerror: '+String(e)));
  const f=await labelFixture(t,{control:true}),original=structuredClone(f.shot),observations=[];
  for(const lang of ['en','ja','ko'] as const)for(const [i,kind] of kinds.entries()){
   f.config.project.language=lang;f.shot=structuredClone(original);f.shot.visualization!.type=kind;f.shot.recipeId=EXPLAINER_RECIPES[kind];const files=renderLabel(f);
   await writeJson(path.join(f.root,lang+'-'+kind+'-source.json'),{label:'AUTHORED factory locale fixture',files});
   const css=files.files.find(x=>x.path==='style.css')!.content,js=files.files.find(x=>x.path==='scene.js')!.content;
   await page.setContent(html(files).replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'')+'<style>'+css+'</style>');await page.addScriptTag({path:createRequire(import.meta.url).resolve('gsap/dist/gsap.js')});await page.addScriptTag({content:js});
   const observed=await page.evaluate(({id,heading})=>{
    (window as any).__timelines[id].seek(1,true);const texts=Array.from(document.querySelectorAll('text')),title=texts.find(n=>n.textContent===heading);if(!title)throw new Error('Expected localized heading absent');
    title.setAttribute('data-localization-probe','heading');const b=title.getBoundingClientRect(),style=getComputedStyle(title);
    return {text:title.textContent,fontFamily:style.fontFamily,fontSize:style.fontSize,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},controls:Array.from(document.querySelectorAll('[data-control="illustrative"]')).map(n=>n.getAttribute('aria-label'))};
   },{id:f.shot.id,heading:expected[lang].headings[i]});
   assert.equal(observed.text,expected[lang].headings[i]);assert.ok(observed.controls.length);assert.ok(observed.controls.every(x=>x===expected[lang].control));
   assert.ok(observed.bounds.width>0&&observed.bounds.height>0&&observed.bounds.x>=0&&observed.bounds.y>=0&&observed.bounds.x+observed.bounds.width<=1280&&observed.bounds.y+observed.bounds.height<=720);
   if(lang==='ja')assert.match(observed.fontFamily,/Yu Gothic/);if(lang==='ko')assert.match(observed.fontFamily,/Malgun Gothic/);
   const cdp=await page.createCDPSession();await cdp.send('DOM.enable');await cdp.send('CSS.enable');const domTree=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:domTree.root.nodeId,selector:'[data-localization-probe="heading"]'});const platform=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});assert.ok(platform.fonts.some(font=>font.glyphCount>0));
   await cdp.detach();await page.screenshot({path:path.join(f.root,lang+'-'+kind+'.png')});observations.push({lang,kind,...observed,platformFonts:platform.fonts});
  }
  await writeJson(path.join(f.root,'browser-label-observations.json'),{label:'AUTHORED actual PNG/fonts; no native/movie/audio acceptance',observations});assert.equal(observations.length,24);
 }finally{clearTimeout(timer);await browser.close();await writeJson(path.join(dir,'browser-terminal.json'),{pid:proc.pid,exitCode:proc.exitCode,signalCode:proc.signalCode,closedUTC:new Date().toISOString(),requests,consoleEntries});}
});
