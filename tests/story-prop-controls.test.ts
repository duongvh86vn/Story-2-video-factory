import assert from 'node:assert/strict';
import test, {type TestContext} from 'node:test';
import {promises as fs, readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {creativeFixture} from './creative-fixture.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {bindActorShot} from '../packages/actors/model.js';
import {stageModels} from '../packages/director/models.js';
import {directCinematicShot} from '../packages/director/index.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles, validateSceneFiles, validateSceneScript} from '../packages/scenes/security.js';

// Renderer protocol fixtures retain sourced mechanical geometry and contact. A
// part-kind/cast matrix tests control presentation, not story/factual acceptance.
async function fixture(t:TestContext,kind:'object'|'stage'|'marker'|'lever',actors=true){
  const parent=process.env.STORY_PROP_CONTROLS_EVIDENCE??os.tmpdir();
  await fs.mkdir(parent,{recursive:true});
  const root=await fs.mkdtemp(path.join(parent,'story-prop-controls-'));
  if(!process.env.STORY_PROP_CONTROLS_EVIDENCE)t.after(async()=>{
    const parentReal=await fs.realpath(parent),entry=await fs.lstat(root),real=await fs.realpath(root);
    assert.equal(entry.isSymbolicLink(),false);assert.equal(path.dirname(real),parentReal);
    assert.ok(path.basename(real).startsWith('story-prop-controls-'));
    await fs.rm(real,{recursive:true,force:true});
  });
  const f=await creativeFixture(root),first=f.shot.visualization!.parts[0]!;
  // The creative fixture may only point after legacy-contact migration. Ask the
  // public director for a real operation instead of fabricating gesture geometry.
  f.shot.host!.actions=[{type:'operate-model',startMs:0,endMs:5000,contactMs:1800,narrationAnchor:'cue',
    target:{modelId:f.shot.visualization!.modelId,partId:first.id,anchor:'handle'}}];
  f.shot=directCinematicShot(f.shot,f.beat,f.profile,f.config);
  const s=f.shot,part=s.visualization!.parts[0]!;
  part.kind=kind;s.cinematic!.models=stageModels(s);
  s.cinematic!.artDirection=structuredClone(f.artDirection);
  if(actors){
    f.config.presentation.character_mode='actors';
    const primary=ActorDefinitionSchema.parse({id:'protocol-actor',name:'Protocol actor',role:f.narration.segments[0]!.text,
      identity:'illustrative',kind:f.profile.kind,sourceRefs:part.sourceRefs,appearance:f.profile.appearance,costume:[]});
    s.cinematic!.actorScene={primary,speakingSegmentIds:[],continuity:'cut',supporting:[]};
    bindActorShot(s,f.profile,f.rig);
  }
  assert.ok(s.host!.actions.some(a=>a.type==='operate-model'&&a.target?.partId===part.id),'positive contact fixture must reach the control branch');
  return {...f,root,part};
}

function timeline(js:string,id:string){
  assert.deepEqual(validateSceneScript(js,id),[],'only secured generated scene script may execute');
  const selectors=new Set<string>();
  const document={createElement:()=>({style:{}}),documentElement:{},querySelectorAll:(selector:string)=>{
    selectors.add(selector);const attrs:Record<string,string>={};
    return [{x:0,y:0,rotation:0,opacity:1,getAttribute:(k:string)=>attrs[k]??'',setAttribute:(k:string,v:string)=>{attrs[k]=String(v);}}];
  }};
  const context=vm.createContext({window:{document},document,console,setTimeout:()=>0,clearTimeout:()=>{},Date});
  vm.runInContext(readFileSync(createRequire(import.meta.url).resolve('gsap/dist/gsap.js'),'utf8'),context);
  vm.runInContext(`var gsap=window.gsap;${js};gsap.ticker.sleep();`,context);
  const tl=context.window.__timelines[id] as {duration():number;seek(t:number,suppress:boolean):void};
  tl.seek(1,true);return {selectors,duration:tl.duration()};
}

async function render(f:Awaited<ReturnType<typeof fixture>>,label:string){
  const before=structuredClone(f.shot);
  const result=renderCinematic(f.shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config,undefined,f.narration);
  const files=secureSceneFiles(result.files);
  assert.deepEqual(validateSceneFiles(files,f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  assert.deepEqual(f.shot,before,'control presentation must not rewrite geometry, actions or the narration clock');
  const html=files.files.find(f=>f.path==='index.html')!.content,js=files.files.find(f=>f.path==='scene.js')!.content;
  const probe=timeline(js,f.shot.id);
  if(process.env.STORY_PROP_CONTROLS_EVIDENCE){
    for(const file of files.files)await fs.writeFile(path.join(f.root,label+'-'+file.path),file.content);
    await fs.writeFile(path.join(f.root,label+'-probe.json'),JSON.stringify({geometry:result.geometry,duration:probe.duration,selectors:[...probe.selectors]},null,2));
  }
  // Other parts in this sourced fixture remain mechanical and keep their own
  // controls. Inspect the changed prop's group, not an unrelated cylinder/flow.
  const start=html.indexOf('<g id="object-0"'),end=html.indexOf('<g id="object-1"',start);
  assert.ok(start>=0&&end>start,'the tested prop must have its own rendered group');
  return {...result,html,propHtml:html.slice(start,end),js,probe};
}
function absent(r:Awaited<ReturnType<typeof render>>){
  assert.doesNotMatch(r.propHtml,/class="handle"|class="control-turn"|data-control="illustrative"/);
  assert.doesNotMatch(r.js,/#object-0 \.control-turn/);
  assert.ok([...r.probe.selectors].filter(s=>s.includes('#object-0 ')).every(s=>!s.includes('.control-turn')&&!s.includes('.handle')));
}
function controlled(r:Awaited<ReturnType<typeof render>>){
  assert.match(r.propHtml,/class="control-turn"/);assert.match(r.js,/#object-0 \.control-turn/);
  assert.ok([...r.probe.selectors].some(s=>s.includes('#object-0 .control-turn')),'real GSAP must register the explicit control');
}

for(const kind of ['object','stage','marker'] as const)test(`generic actor ${kind}: default has no synthetic control and preserves explicit-renderer geometry/clock`,async t=>{
  const f=await fixture(t,kind),off=await render(f,'default');absent(off);
  f.shot.cinematic!.artDirection!.models[0]!.controlMode='renderer';
  const on=await render(f,'renderer');controlled(on);
  assert.deepEqual(off.geometry,on.geometry);assert.equal(off.probe.duration,on.probe.duration);
  assert.deepEqual(off.report,on.report);
});
for(const kind of ['object','lever'] as const)test(`explicit none suppresses operating knob and idle fallback handle for ${kind}`,async t=>{
  const f=await fixture(t,kind);f.shot.cinematic!.artDirection!.models[0]!.controlMode='none';
  absent(await render(f,'none-operating'));
  // Remove action and its matching gesture together, preserving stage and clock.
  f.shot.host!.actions=[{type:'idle',startMs:0,endMs:5000}];f.shot.cinematic!.performance.gestures=[];
  absent(await render(f,'none-idle'));
  f.shot.cinematic!.artDirection!.models[0]!.controlMode='renderer';
  const fallback=await render(f,'renderer-idle');assert.match(fallback.propHtml,/class="handle"/);
});
test('mechanical actor default retains the renderer knob',async t=>controlled(await render(await fixture(t,'lever'),'mechanical')));
test('legacy presenter generic prop remains compatible with renderer control default',async t=>controlled(await render(await fixture(t,'object',false),'legacy')));
