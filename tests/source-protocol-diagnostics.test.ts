import assert from 'node:assert/strict';
import test,{type TestContext} from 'node:test';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {creativeFixture} from './creative-fixture.js';
import {supportedArtworkTags,artworkSvg} from '../packages/director/art-direction.js';
import {validateCamera,cameraMatrixAt,cameraPoint,CAMERA_VIEWPORT} from '../packages/director/camera.js';
import {validateSceneIntent,groundedExplanation} from '../packages/explainer/plan.js';
import {validateExplainerStoryboard,explainerShot} from '../packages/explainer/storyboard.js';
import {createCreativeStoryboard} from '../packages/director/creative.js';
import {directCinematicShot} from '../packages/director/index.js';
import {ModelRouter} from '../packages/models/registry.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {StorySchema} from '../packages/core/schemas.js';
import {readJson,walk} from '../packages/core/utils.js';

async function fixture(t:TestContext){
  const root=await fs.mkdtemp(path.join(process.env.SOURCE_PROTOCOL_EVIDENCE??os.tmpdir(),'diagnostics-'));
  if(!process.env.SOURCE_PROTOCOL_EVIDENCE)t.after(()=>fs.rm(root,{recursive:true,force:true}));
  return {root,...await creativeFixture(root)};
}
function message(operation:()=>unknown){try{operation();}catch(error){assert.ok(error instanceof Error);return error.message;}assert.fail('expected source rejection');}

test('passive tag guidance is a copy and cannot expand the security validator',()=>{
  const original=supportedArtworkTags(),exposed=supportedArtworkTags();exposed.splice(0,exposed.length,'script','pattern','image');
  assert.deepEqual(supportedArtworkTags(),original);
  for(const tag of ['script','pattern','image','use','filter','animate','style'])assert.throws(()=>artworkSvg('<'+tag+'/>','audit'),/unsupported\/executable tag/);
  assert.equal(artworkSvg('<rect width="10" height="10"/>','audit'),'<rect width="10" height="10"/>');
});

test('source assertion diagnostics retain exact current cue and bounded truncation without accepting negation removal',()=>{
  const text='Maya does not leave.',ref={kind:'narration' as const,segmentId:'current',quote:text};
  const narration={mode:'srt' as const,durationMs:1000,words:[],segments:[{id:'current',startMs:0,endMs:1000,text}]};
  const intent={participants:[],action:text,objective:text,sourceRefs:[ref]};
  assert.doesNotThrow(()=>validateSceneIntent(intent,narration,[ref],['current']));
  const error=message(()=>validateSceneIntent({...intent,action:'leave.'},narration,[ref],['current']));
  assert.ok(error.includes('Received: "leave."'));
  assert.ok(error.includes(JSON.stringify({segmentId:'current',text,truncated:false})));
  const long='Maya does not leave. '+ 'x'.repeat(2100);
  const segments=Array.from({length:9},(_,i)=>({id:'cue'+i,startMs:i*1000,endMs:(i+1)*1000,text:long}));
  const refs=segments.map(s=>({kind:'narration' as const,segmentId:s.id,quote:'Maya'}));
  const bounded=message(()=>validateSceneIntent({...intent,sourceRefs:refs,action:'leave.'},{...narration,durationMs:9000,segments},refs,segments.map(s=>s.id)));
  const evidence=JSON.parse(bounded.split('Current cue evidence: ')[1]!.split('; 1 additional')[0]!) as {segmentId:string;text:string;truncated:boolean}[];
  assert.equal(evidence.length,8);assert.ok(evidence.every(e=>e.text===long.slice(0,2000)&&e.truncated===true));assert.ok(bounded.includes('1 additional referenced cues omitted'));
});

test('public storyboard source error includes shot ID and exact referenced current cue',async t=>{
  const f=await fixture(t),text='Linh does not leave.';
  const narration={...f.narration,segments:[{...f.narration.segments[0]!,text}]};
  const story=StorySchema.parse({...f.story,story:text,characters:[{id:'person0',name:'Linh',description:text}]});
  const config={...f.config,presentation:{...f.config.presentation,character_mode:'actors' as const}};
  const base={...f.beat,narrationText:text};
  const beat={...base,...groundedExplanation(story,narration,[base],f.profile,true).beats[0]!};
  const shot=directCinematicShot(explainerShot('diagnostic-current-shot',0,5000,beat,narration,f.profile,f.rig),beat,f.profile,config,undefined,{seed:true});
  assert.doesNotThrow(()=>validateExplainerStoryboard({shots:[shot]},narration,[beat],f.profile,f.rig,config));
  shot.cinematic!.sceneIntent!.action='leave.';shot.visualization!.sceneIntent=structuredClone(shot.cinematic!.sceneIntent!);
  const error=message(()=>validateExplainerStoryboard({shots:[shot]},narration,[beat],f.profile,f.rig,config));
  assert.ok(error.startsWith(shot.id+': sceneIntent.action'),error);
  assert.ok(error.includes('Received: "leave."'));assert.ok(error.includes(JSON.stringify({segmentId:'cue',text,truncated:false})));
});

test('cropped model remains rejected with the same projected endpoint arithmetic and safe viewport',async t=>{
  const f=await fixture(t),shot=structuredClone(f.shot),part=shot.visualization!.parts[0]!,p=shot.cinematic!.performance;
  part.width=4;
  const error=message(()=>validateCamera(shot,f.profile));
  assert.ok(error.includes(shot.id+': camera model '+part.id+' is cropped'),error);
  const projected=JSON.parse(error.split('Projected model envelope in screen pixels: ')[1]!.split('. Required viewport')[0]!);
  const round=(v:number)=>Number(v.toFixed(3));
  const expected=[0,p.durationMs].map(atMs=>{
    const matrix=cameraMatrixAt(shot.cinematic!.camera,p.stage,p.durationMs,atMs);
    const first=cameraPoint({x:part.x*p.stage.width-part.width*p.stage.width*.56,y:part.y*p.stage.height-part.height*p.stage.height*.6},matrix);
    const last=cameraPoint({x:part.x*p.stage.width+part.width*p.stage.width*.56,y:part.y*p.stage.height+part.height*p.stage.height*.6},matrix);
    return {atMs,left:round(first.x),right:round(last.x),top:round(first.y),bottom:round(last.y)};
  });
  assert.deepEqual(projected,expected);
  const viewport={left:round(p.stage.width*CAMERA_VIEWPORT.left),right:round(p.stage.width*CAMERA_VIEWPORT.right),top:round(p.stage.height*CAMERA_VIEWPORT.top),bottom:round(p.stage.height*CAMERA_VIEWPORT.bottom)};
  assert.ok(error.includes(JSON.stringify(viewport)));assert.ok(error.includes('validation bounds are unchanged'));
});

test('generation and matching repair receive supported tags and complete unchanged rejected JSON; accepted cached render bytes stay identical',async t=>{
  const f=await fixture(t);f.config.models.storyboard.provider='gateway';f.config.retry.structured_output=0;
  const context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
  const seed={shots:[structuredClone(f.shot)]};seed.shots[0]!.cinematic!.artDirection=structuredClone(f.artDirection);
  const rejected=structuredClone(seed);rejected.shots[0]!.cinematic!.artDirection!.layers[0]!.svg='<pattern/>';
  const original=structuredClone(rejected),router=new ModelRouter(f.config,f.root);let calls=0;
  router.structured=async(_role,request,schema)=>{
    calls++;assert.ok(request.prompt.includes('Renderer-supported passive SVG tags: '+supportedArtworkTags().join(', ')));
    assert.equal(Object.prototype.hasOwnProperty.call(request.context,'supportedTags'),false,'guidance does not change request context identity');
    return schema.parse(rejected);
  };
  await assert.rejects(()=>createCreativeStoryboard(f.root,f.config,router,context,seed,[]),/unsupported\/executable tag pattern/);
  assert.equal(calls,1);assert.deepEqual(rejected,original);
  const attemptFiles=await walk(path.join(f.root,'work/attempts/creative-storyboard'));assert.equal(attemptFiles.length,1);
  const bytes=await fs.readFile(attemptFiles[0]!,'utf8');
  const attempt=await readJson<{response:typeof seed;status:string}>(attemptFiles[0]!);assert.equal(attempt.status,'domain-rejected');assert.deepEqual(attempt.response,original);
  router.structured=async(_role,request,schema)=>{
    calls++;assert.ok(request.prompt.includes('Renderer-supported passive SVG tags: '+supportedArtworkTags().join(', ')));
    assert.match(request.prompt,/Domain validation failed.*unsupported\/executable tag pattern/s);
    assert.deepEqual(JSON.parse(request.prompt.split('Previous output:\n')[1]!),original);
    return schema.parse(seed);
  };
  const accepted=await createCreativeStoryboard(f.root,f.config,router,context,seed,[]);assert.equal(calls,2);
  assert.equal(await fs.readFile(attemptFiles[0]!,'utf8'),bytes,'repair must preserve old rejected receipt bytes');
  const render=(board:typeof seed)=>renderCinematic(board.shots[0]!,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config,undefined,f.narration).files;
  const emitted=render(accepted),cache=path.join(f.root,'work/creative-storyboard-cache.json'),cacheBytes=await fs.readFile(cache,'utf8');
  router.structured=async()=>{assert.fail('accepted cache must not call the model');};
  const cached=await createCreativeStoryboard(f.root,f.config,router,context,seed,[]);
  assert.deepEqual(cached,accepted);assert.deepEqual(render(cached),emitted);assert.equal(await fs.readFile(cache,'utf8'),cacheBytes);
});

