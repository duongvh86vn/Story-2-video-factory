// Runtime delegated. All fixtures, inject requests, GSAP execution and assertions are inside test callbacks/helpers called by them.
import assert from 'node:assert/strict';
import test, {type TestContext} from 'node:test';
import {promises as fs,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import sharp from 'sharp';
import {buildServer} from '../apps/server/index.js';
import type {Coordinator} from '../apps/server/jobs.js';
import {hash} from '../packages/core/utils.js';
import {motionWorkbench} from '../packages/motion/workbench.js';
import {compileActorMotion,sampleMotionFrame,motionLandmarkAt} from '../packages/motion/player.js';
import type {ActorMotion,MotionRegistration} from '../packages/motion/schemas.js';

async function fixture(t:TestContext) {
  const projectsRoot=await fs.mkdtemp(path.join(os.tmpdir(),'motion-api-'));
  const root=path.join(projectsRoot,'fixture'),source=path.join(root,'bundle');
  await fs.mkdir(source,{recursive:true});
  // No coordinator operation is permitted for candidate routes; construction is inert.
  const forbidden=async():Promise<never>=>{throw new Error('Unexpected production coordinator call');};
  const coordinator:Coordinator={createProject:forbidden,getProjectStatus:forbidden,runPipeline:forbidden,
    approveProject:forbidden,updateLocks:forbidden,invalidateProject:forbidden};
  const app=await buildServer({projectsRoot,coordinator});
  t.after(async()=>{await app.close();await fs.rm(projectsRoot,{recursive:true,force:true});});
  await fs.writeFile(path.join(root,'project.yaml'),'project:\n  name: fixture\n');
  const bytes=await sharp({create:{width:8,height:4,channels:4,background:{r:30,g:60,b:90,alpha:.5}}}).png().toBuffer();
  await fs.writeFile(path.join(source,'atlas.png'),bytes);
  const metadata={game_input:'atlas.png',frame_layout:{rows:{walk:[{x:0,y:0,w:4,h:4},{x:4,y:0,w:4,h:4},{x:0,y:0,w:4,h:4}]}},
    animation:{rows:{walk:{frames:3,loop:true,durations_ms:[70,230,120]}}},
    rig:{landmarks:{walk:[{hand:[1,2]},{hand:[7,1]},{hand:[2,3]}]}}};
  const registration:MotionRegistration={version:'actor-motion-registration-1',id:'lila-walk',actorId:'lila',state:'walk',view:'left',
    referenceHash:'a'.repeat(64),playback:{mode:'once',end:'hold'},anchor:{x:2,y:4},requiredLandmarks:['hand'],notes:[]};
  const save=async()=>{
    await fs.writeFile(path.join(source,'metadata.json'),JSON.stringify(metadata));
    await fs.writeFile(path.join(source,'registration.json'),JSON.stringify(registration));
  };
  await save();
  const body={metadata:'bundle/metadata.json',registration:'bundle/registration.json'};
  const importMotion=async()=>{
    const response=await app.inject({method:'POST',url:'/api/projects/fixture/motions/import',payload:body});
    assert.equal(response.statusCode,200,response.body);
    return response.json<ActorMotion>();
  };
  return {app,root,projectsRoot,source,bytes,metadata,registration,save,body,importMotion};
}
const route=(motion:ActorMotion)=>`/api/projects/fixture/motions/${motion.id}/${motion.fingerprint}`;

test('API imports and lists verified immutable candidates, with atlas timing and coordinate registration',async t=>{
  const f=await fixture(t);
  assert.deepEqual((await f.app.inject({url:'/api/projects/fixture/motions'})).json(),{motions:[]});
  const motion=await f.importMotion();
  assert.deepEqual(motion.review.status,'candidate');assert.equal(motion.review.productionReady,false);
  assert.equal(motion.source.loop,true);assert.equal(motion.playback.mode,'once');
  assert.deepEqual(motion.frames.map(frame=>frame.durationMs),[70,230,120]);
  assert.deepEqual(motion.frames.map(frame=>frame.rect.x),[0,4,0]);
  assert.deepEqual(motion.frames.map(frame=>frame.landmarks.hand),[{x:1,y:2},{x:3,y:1},{x:2,y:3}]);
  assert.deepEqual(await f.importMotion(),motion);
  assert.deepEqual((await f.app.inject({url:'/api/projects/fixture/motions'})).json().motions,[motion]);
  const sheet=await f.app.inject({url:route(motion)+'/sheet'});
  assert.equal(sheet.statusCode,200);assert.equal(sheet.headers['content-type'],'image/png');
  assert.deepEqual(sheet.rawPayload,f.bytes);assert.equal(hash(sheet.rawPayload),motion.sheet.hash);
  assert.equal(sheet.headers['content-length'],String(f.bytes.length));
  await assert.rejects(fs.access(path.join(f.root,'asset-manifest.json')));
  await assert.rejects(fs.access(path.join(f.root,'scenes')));
});

test('import requires config and idle; read-only listing remains available during production',async t=>{
  const f=await fixture(t),url='/api/projects/fixture/motions/import';
  await fs.unlink(path.join(f.root,'project.yaml'));
  assert.equal((await f.app.inject({method:'POST',url,payload:f.body})).statusCode,404);
  await fs.writeFile(path.join(f.root,'project.yaml'),'project: {name: fixture}\n');
  await fs.writeFile(path.join(f.root,'.factory.lock'),JSON.stringify({pid:process.pid}));
  const busy=await f.app.inject({method:'POST',url,payload:f.body});
  assert.equal(busy.statusCode,409);assert.equal(busy.json().error.code,'PROJECT_BUSY');
  assert.equal((await f.app.inject({url:'/api/projects/fixture/motions'})).statusCode,200);
  await assert.rejects(fs.access(path.join(f.root,'assets/motions')));
});

test('import body is strict and both selections must stay within bounded project paths',async t=>{
  const f=await fixture(t),url='/api/projects/fixture/motions/import';
  for(const payload of [{...f.body,url:'https://example.test/sheet.png'},{metadata:f.body.metadata},
    {...f.body,metadata:''},{...f.body,registration:42},{...f.body,metadata:'x'.repeat(241)}])
    assert.equal((await f.app.inject({method:'POST',url,payload})).statusCode,422);
  for(const field of ['metadata','registration'] as const)for(const selection of ['../outside.json','/outside.json',
    path.join(f.source,field==='metadata'?'metadata.json':'registration.json'),'https://example.test/bundle.json','bundle\\metadata.json']) {
    const response=await f.app.inject({method:'POST',url,payload:{...f.body,[field]:selection}});
    assert.equal(response.statusCode,400,response.body);assert.equal(response.json().error.code,'INVALID_PATH');
  }
  await assert.rejects(fs.access(path.join(f.root,'assets/motions')));
});

test('linked project bundles cannot redirect API import',async t=>{
  const f=await fixture(t),link=path.join(f.root,'linked');
  try {await fs.symlink(f.source,link,'junction');}catch(error){if((error as NodeJS.ErrnoException).code==='EPERM'){t.skip('Junction permission unavailable');return;}throw error;}
  const response=await f.app.inject({method:'POST',url:'/api/projects/fixture/motions/import',payload:{...f.body,metadata:'linked/metadata.json'}});
  assert.equal(response.statusCode,403);assert.equal(response.json().error.code,'LINK_FORBIDDEN');
});

test('in-flight imports reserve the project through the existing mutate gate',async t=>{
  const f=await fixture(t),metadata=path.join(f.source,'metadata.json'),open=fs.open;
  let release!:()=>void,entered!:()=>void;
  const blocked=new Promise<void>(resolve=>{release=resolve;}),started=new Promise<void>(resolve=>{entered=resolve;});
  t.mock.method(fs,'open',async(...args:Parameters<typeof fs.open>)=>{
    if(String(args[0])===metadata){entered();await blocked;}
    return open(...args);
  });
  const url='/api/projects/fixture/motions/import';
  const first=f.app.inject({method:'POST',url,payload:f.body});
  try {
    await started;
    const second=await f.app.inject({method:'POST',url,payload:f.body});
    assert.equal(second.statusCode,409);assert.equal(second.json().error.code,'PROJECT_BUSY');
  } finally {release();}
  assert.equal((await first).statusCode,200);
});

test('API surfaces malformed metadata and missing anchor/landmark before publishing candidates',async t=>{
  const f=await fixture(t),url='/api/projects/fixture/motions/import';
  await fs.writeFile(path.join(f.source,'metadata.json'),'{"bad":');
  assert.ok((await f.app.inject({method:'POST',url,payload:f.body})).statusCode>=400);
  await f.save();
  await fs.writeFile(path.join(f.source,'registration.json'),JSON.stringify({...f.registration,anchor:undefined}));
  assert.equal((await f.app.inject({method:'POST',url,payload:f.body})).statusCode,422);
  await f.save();Reflect.deleteProperty(f.metadata.rig.landmarks.walk[0]!,'hand');await f.save();
  assert.ok((await f.app.inject({method:'POST',url,payload:f.body})).statusCode>=400);
  await assert.rejects(fs.access(path.join(f.root,'assets/motions')));
});

test('strip API import resolves the sibling sheet and preserves inferred source loop independently of once policy',async t=>{
  const f=await fixture(t);f.registration.requiredLandmarks=[];await f.save();
  await fs.writeFile(path.join(f.source,'walk.strip.json'),JSON.stringify({frames:2,w:4,h:4,delay_ms:90,kind:'periodic'}));
  await fs.writeFile(path.join(f.source,'walk.strip.png'),f.bytes);
  const response=await f.app.inject({method:'POST',url:'/api/projects/fixture/motions/import',payload:{...f.body,metadata:'bundle/walk.strip.json'}});
  assert.equal(response.statusCode,200,response.body);const motion=response.json<ActorMotion>();
  assert.equal(motion.source.kind,'sprite-gen-strip');assert.equal(motion.source.loop,true);
  assert.equal(motion.playback.mode,'once');assert.deepEqual(motion.frames.map(frame=>frame.durationMs),[90,90]);
});

test('preview shows candidate policies and serves only the fixed package GSAP runtime',async t=>{
  const f=await fixture(t),motion=await f.importMotion();
  const response=await f.app.inject({url:route(motion)+'/preview'});
  assert.equal(response.statusCode,200,response.body);assert.match(response.headers['content-type']!,/text\/html/);
  for(const label of ['candidate','actor','lila','walk','left','sourceLoop','once','hold','speechSync','none','max 2 cycles / 120 seconds'])
    assert.ok(response.body.includes(label),label);
  assert.match(response.body,/<image href="sheet"/);
  assert.match(response.body,/gsap\.timeline\(\{paused:true/);
  assert.match(response.headers['content-security-policy']!,/connect-src 'none'/);
  const runtime=await f.app.inject({url:'/api/motions/runtime/gsap.min.js'});
  assert.equal(runtime.statusCode,200);assert.match(runtime.headers['content-type']!,/javascript/);
  assert.deepEqual(runtime.rawPayload,await fs.readFile(createRequire(import.meta.url).resolve('gsap/dist/gsap.min.js')));
  assert.equal((await f.app.inject({url:'/api/motions/runtime/other.js'})).statusCode,404);
});

test('GET endpoints reject arbitrary URLs, paths, invalid fingerprints and unknown projects',async t=>{
  const f=await fixture(t),motion=await f.importMotion();
  for(const endpoint of [route(motion)+'/preview',route(motion)+'/sheet','/api/projects/fixture/motions','/api/motions/runtime/gsap.min.js'])
    for(const query of ['?url=https%3A%2F%2Fevil.test%2Fx.png','?path=bundle%2Fatlas.png'])
      assert.equal((await f.app.inject({url:endpoint+query})).statusCode,422);
  for(const endpoint of ['preview','sheet']) {
    assert.equal((await f.app.inject({url:`/api/projects/fixture/motions/${motion.id}/bad/${endpoint}`})).statusCode,422);
    assert.equal((await f.app.inject({url:`/api/projects/missing/motions/${motion.id}/${motion.fingerprint}/${endpoint}`})).statusCode,404);
  }
});

test('list, preview and sheet refuse descriptor/hash/file corruption',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),sheet=path.join(f.root,motion.sheet.path);
  const manifest=path.join(path.dirname(sheet),'manifest.json'),saved=await fs.readFile(manifest);
  const endpoints=['/api/projects/fixture/motions',route(motion)+'/preview',route(motion)+'/sheet'];
  await fs.writeFile(manifest,JSON.stringify({...motion,source:{...motion.source,referenceHash:'b'.repeat(64)}}));
  for(const url of endpoints)assert.equal((await f.app.inject({url})).statusCode,500);
  await fs.writeFile(manifest,saved);await fs.writeFile(sheet,Buffer.from('corrupt'));
  for(const url of endpoints)assert.equal((await f.app.inject({url})).statusCode,500);
  await fs.unlink(sheet);
  assert.ok((await f.app.inject({url:route(motion)+'/sheet'})).statusCode>=400);
});

test('sheet re-read rejects bytes changed after descriptor load instead of streaming unchecked bytes',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),sheet=path.join(f.root,motion.sheet.path),open=fs.open;
  let reads=0;
  t.mock.method(fs,'open',async(...args:Parameters<typeof fs.open>)=>{
    if(String(args[0])===sheet && ++reads===2) {
      const changed=Buffer.from(f.bytes);changed[changed.length-1]=changed[changed.length-1]!^1;await fs.writeFile(sheet,changed);
    }
    return open(...args);
  });
  const response=await f.app.inject({url:route(motion)+'/sheet'});
  assert.equal(reads,2);assert.equal(response.statusCode,409);assert.equal(response.json().error.code,'MOTION_SHEET_INTEGRITY');
});

test('sheet re-read is bounded when the file grows after verified load',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),sheet=path.join(f.root,motion.sheet.path),open=fs.open;
  let reads=0;
  t.mock.method(fs,'open',async(...args:Parameters<typeof fs.open>)=>{
    if(String(args[0])===sheet && ++reads===2)await fs.truncate(sheet,16*1024*1024+1);
    return open(...args);
  });
  const response=await f.app.inject({url:route(motion)+'/sheet'});
  assert.equal(response.statusCode,413);assert.equal(response.json().error.code,'MOTION_SHEET_LIMIT');
});

test('preview caps loop duration at two cycles and 120 seconds; once spans the full action',async t=>{
  const f=await fixture(t);
  f.registration.playback={mode:'loop',end:'hide'};f.metadata.animation.rows.walk.durations_ms=[30000,30000,10000];await f.save();
  const loop=await f.importMotion(),preview=await f.app.inject({url:route(loop)+'/preview'});
  assert.equal(preview.statusCode,200,preview.body);assert.match(preview.body,/<dt>previewDurationMs<\/dt><dd>120000<\/dd>/);
  f.registration.playback={mode:'once',end:'first'};await f.save();const once=await f.importMotion();
  const workbench=motionWorkbench(once);assert.equal(workbench.clip.endMs,70000);
  assert.equal(workbench.report.nativeDurationMs,70000);assert.equal(workbench.labelTrack.at(-1)!.frame,0);
  assert.throws(()=>motionWorkbench(once,.5));
  const short={...loop,frames:loop.frames.map(frame=>({...frame,durationMs:20}))};
  assert.equal(motionWorkbench(short).clip.endMs,120);
});

test('workbench escapes warning text and compiles before returning even for dense single-frame loops',async t=>{
  const f=await fixture(t),motion=await f.importMotion();
  const malicious={...motion,review:{...motion.review,warnings:['</script><script>alert(1)</script>']}};
  const html=motionWorkbench(malicious).html;
  assert.ok(html.includes('&lt;/script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));
  // One 1 ms crop must not expand a two-cycle preview to 120,000 cycles.
  const dense={...motion,playback:{mode:'loop',end:'hold'} as const,frames:[{...motion.frames[0]!,durationMs:1}]};
  const result=motionWorkbench(dense);assert.equal(result.clip.endMs,2);assert.ok(result.labelTrack.length<=3);
  const overlong={...motion,frames:motion.frames.map(frame=>({...frame,durationMs:60000}))};
  assert.throws(()=>motionWorkbench(overlong));
});

test('maximum-frame preview bounds logical labels and compiler calls to two native cycles',async t=>{
  const f=await fixture(t),motion=await f.importMotion();
  const frames=Array.from({length:512},(_,i)=>({...motion.frames[i%2]!,durationMs:1}));
  const dense={...motion,frames,playback:{mode:'loop',end:'hide'} as const};
  const preview=motionWorkbench(dense);
  assert.equal(preview.clip.endMs,1024);assert.equal(preview.labelTrack.length,1025);
  assert.ok(preview.report.eventCount<=6000);assert.equal(preview.labelTrack.at(-1)!.frame,null);
  assert.deepEqual(preview.labelTrack.slice(510,515).map(label=>label.frame),[510,511,0,1,2]);
});

// Execute the actual generated controls and label track with installed GSAP on plain targets.
// This callback helper probes clock/seek behavior; it does not render or launch a browser.
function workbenchProbe(html:string) {
  const targets=new Map<string,{opacity:number}>();
  for(const match of html.matchAll(/<g id="(sprite-[^"]+-frame-\d+)" opacity="([01])"/g))
    targets.set(`[data-composition-id="motion-workbench"] [id="${match[1]}"]`,{opacity:Number(match[2])});
  const controls=new Map<string,{value:string;textContent:string;events:Map<string,()=>void>;addEventListener:(event:string,action:()=>void)=>void}>();
  for(const id of ['play','pause','reset','seek','frame']) {
    const events=new Map<string,()=>void>();controls.set(id,{value:'0',textContent:'',events,addEventListener:(event,action)=>{events.set(event,action);}});
  }
  const document={createElement:()=>({style:{}}),documentElement:{},getElementById:(id:string)=>controls.get(id),
    querySelectorAll:(selector:string)=>{const target=targets.get(selector);if(!target)throw new Error(`Unknown selector ${selector}`);return [target];}};
  const window:Record<string,unknown>={document},context=vm.createContext({window,document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  vm.runInContext(`var gsap=window.gsap;${inline}\nwindow.probe={tl,labelState};gsap.ticker.sleep();`,context);
  const probe=window.probe as {tl:{time:(seconds?:number,suppressEvents?:boolean)=>number;paused:()=>boolean;duration:()=>number;kill:()=>void};labelState:{frame:number}};
  return {...probe,controls,visible:()=>[...targets].filter(([,target])=>target.opacity>.5).map(([selector])=>selector)};
}

test('actual workbench GSAP clock and controls agree with sampler labels at fractional boundaries and arbitrary seeks',async t=>{
  const f=await fixture(t),motion=await f.importMotion();
  for(const mode of ['once','loop'] as const)for(const end of ['hold','first','hide'] as const)for(const rate of [.5,1,1.3,2]) {
    const m={...motion,playback:{mode,end},frames:motion.frames.map(frame=>({...frame,durationMs:1000/24}))};
    const w=motionWorkbench(m,rate),probe=workbenchProbe(w.html);t.after(()=>probe.tl.kill());
    assert.equal(probe.tl.paused(),true);assert.equal(probe.tl.duration(),Math.round(w.clip.endMs/1000*1e7)/1e7);
    const times=[0,w.clip.endMs];
    for(const label of w.labelTrack)for(const offset of [-.00006,-.00004,0,.00004,.00006])times.push(Math.max(0,Math.min(w.clip.endMs,label.seconds*1000+offset)));
    let seed=37;for(let i=0;i<50;i++){seed=(seed*1664525+1013904223)>>>0;times.push(seed/2**32*w.clip.endMs);}
    for(const ms of times.concat(times.slice().reverse())) {
      const control=probe.controls.get('seek')!;control.value=String(ms/1000);control.events.get('input')!();
      const index=sampleMotionFrame(m,w.clip,ms);
      assert.equal(probe.labelState.frame,index??-1,`${mode}/${end}/${rate}/${ms}`);
      assert.match(probe.controls.get('frame')!.textContent,index===null?/Frame hidden/:new RegExp(`Frame ${index+1} / 3`));
      const node=index===null?null:index===1?1:0;
      assert.deepEqual(probe.visible(),node===null?[]:[`[data-composition-id="motion-workbench"] [id="sprite-candidate-frame-${node}"]`]);
      assert.equal(probe.tl.paused(),true);
    }
    probe.controls.get('reset')!.events.get('click')!();assert.equal(probe.tl.time(),0);assert.equal(probe.labelState.frame,0);
    probe.controls.get('play')!.events.get('click')!();assert.equal(probe.tl.paused(),false);
    probe.controls.get('pause')!.events.get('click')!();assert.equal(probe.tl.paused(),true);
  }
});

test('repeated crops retain logical labels and world landmark transforms',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),w=motionWorkbench(motion);
  assert.deepEqual(w.labelTrack.map(label=>label.frame),[0,1,2,2]);
  const clip={...w.clip,placement:{x:100,y:200,scale:2,rotation:90}};
  const point=motionLandmarkAt(motion,clip,'hand',350)!;
  assert.ok(Math.abs(point.x-102)<1e-10);assert.ok(Math.abs(point.y-200)<1e-10);
  assert.notDeepEqual(motion.frames[0]!.landmarks,motion.frames[2]!.landmarks);
});

test('once hold workbench pads the single clock through final-frame dwell beyond the last visual transition',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),w=motionWorkbench(motion);
  const fragment=compileActorMotion(motion,w.clip,'sheet');
  const positions=fragment.js.split('\n').map(line=>Number(line.match(/,([\d.]+)\);$/)![1]));
  assert.equal(Math.max(...positions),.3);assert.equal(w.clip.endMs,420);
  assert.equal(w.report.nativeDurationMs,420);assert.ok(w.html.includes(fragment.js));
  assert.ok(!fragment.js.includes('clockState'));assert.ok(!fragment.js.includes('labelTrack'));
  const probe=workbenchProbe(w.html);t.after(()=>probe.tl.kill());
  assert.equal(probe.tl.duration(),.42);
  for(const seconds of [.3,.4199999,.42,.35,0,.42]) {
    const seek=probe.controls.get('seek')!;seek.value=String(seconds);seek.events.get('input')!();
    assert.equal(probe.labelState.frame,seconds===0?0:2);
    assert.equal(probe.tl.time(),seconds);
  }
  assert.match(probe.controls.get('frame')!.textContent,/Frame 3 \/ 3/);
});

// Delegated CLI probes only: argument arrays avoid shell execution, and timeout requires
// validate-and-print commands to exit. These helpers are called exclusively in callbacks.
async function cliProbe(cwd:string,args:string[]) {
  const cli=fileURLToPath(new URL('../apps/cli/index.ts',import.meta.url));
  const loader=pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;
  return promisify(execFile)(process.execPath,['--import',loader,cli,...args],
    {cwd,encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
}

async function protectedProjectFiles(root:string) {
  const files=new Map<string,Buffer>([
    ['project.yaml',await fs.readFile(path.join(root,'project.yaml'))],
    ['narration.json',Buffer.from(JSON.stringify({version:1,segments:[{id:'spoken.1',text:'Keep narration',startMs:0,endMs:420}]}))],
    ['asset-manifest.json',Buffer.from(JSON.stringify({version:1,assets:[{id:'approved-art',approved:true,path:'assets/approved.svg'}]}))],
    ['project-state.json',Buffer.from(JSON.stringify({version:1,name:'fixture',state:'REVIEWED',updatedAt:'2026-10-07T00:00:00.000Z',
      inputHash:'unchanged',approvals:{host:true,characters:true,storyboard:true,hostHash:'approved-host'},locked:{'shot.1':true}}))],
  ]);
  for(const [relative,bytes] of files)await fs.writeFile(path.join(root,relative),bytes);
  return async()=>{
    for(const [relative,bytes] of files)assert.deepEqual(await fs.readFile(path.join(root,relative)),bytes,`${relative} must remain unchanged`);
    await assert.rejects(fs.access(path.join(root,'scenes')));
    await assert.rejects(fs.access(path.join(root,'voiced-narration.json')));
  };
}

test('CLI preview prints the existing Studio URL and exits even when that port is occupied',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),unchanged=await protectedProjectFiles(f.root);
  const listener=createServer(socket=>socket.destroy());
  await new Promise<void>((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
  t.after(()=>new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve())));
  const address=listener.address();assert.ok(address && typeof address==='object');
  const args=['motion-preview',f.root,motion.id,motion.fingerprint];
  // Occupied ephemeral port exercises the same collision as running Studio on 8850,
  // without requiring the delegated runner to stop or replace its real Studio.
  const selected=await cliProbe(f.projectsRoot,[...args,'--port',String(address.port)]);
  assert.equal(selected.stdout.trim(),`http://127.0.0.1:${address.port}${route(motion)}/preview`);
  assert.equal(listener.listening,true);
  const defaults=await cliProbe(f.projectsRoot,args);
  assert.equal(defaults.stdout.trim(),`http://127.0.0.1:8850${route(motion)}/preview`);
  await unchanged();
});

test('CLI preview validates port and descriptor before printing a URL',async t=>{
  const f=await fixture(t),motion=await f.importMotion(),unchanged=await protectedProjectFiles(f.root);
  const args=['motion-preview',f.root,motion.id,motion.fingerprint];
  for(const invalid of ['0','65536','1.5','invalid'])await assert.rejects(
    cliProbe(f.projectsRoot,[...args,'--port',invalid]),error=>{
      const failure=error as Error & {code?:number;stdout?:string};
      assert.equal(failure.code,1);assert.equal(failure.stdout,'');return true;
    });
  await assert.rejects(cliProbe(f.projectsRoot,['motion-preview',f.root,motion.id,'bad']),error=>{
    const failure=error as Error & {code?:number;stdout?:string};
    assert.equal(failure.code,1);assert.equal(failure.stdout,'');return true;
  });
  await unchanged();
});

test('CLI imports project-relative and explicitly selected absolute local bundles without changing narration/assets/approvals',async t=>{
  const f=await fixture(t),unchanged=await protectedProjectFiles(f.root);
  // cwd is deliberately the parent rather than projectRoot: relative selections belong
  // to the project, not to the launching shell's working directory.
  const relative=await cliProbe(f.projectsRoot,['motion-import',f.root,f.body.metadata,'--registration',f.body.registration]);
  const first=JSON.parse(relative.stdout) as ActorMotion;
  assert.equal(first.review.status,'candidate');assert.equal(first.review.productionReady,false);
  assert.equal(first.source.sheetHash,hash(f.bytes));await unchanged();
  const selected=path.join(f.projectsRoot,'selected-local-bundle');await fs.mkdir(selected);
  for(const file of ['metadata.json','registration.json','atlas.png'])await fs.copyFile(path.join(f.source,file),path.join(selected,file));
  const absolute=await cliProbe(f.projectsRoot,['motion-import',f.root,path.join(selected,'metadata.json'),
    '--registration',path.join(selected,'registration.json')]);
  assert.deepEqual(JSON.parse(absolute.stdout),first);
  const listing=await cliProbe(f.projectsRoot,['motion-list',f.root]);
  assert.deepEqual(JSON.parse(listing.stdout),[first]);
  assert.deepEqual(await fs.readFile(path.join(f.root,first.sheet.path)),f.bytes);
  await unchanged();
});
