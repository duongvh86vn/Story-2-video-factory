// DECLARED / NOT RUN. User QA owns callbacks, fixtures, semantic/physical
// validators, actual playback, original story assets and full factory tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {SceneFiles,Shot} from '../packages/core/schemas.js';
import {BeatSchema,CharacterBibleSchema} from '../packages/core/schemas.js';
import {hash} from '../packages/core/utils.js';
import {buildRig} from '../packages/host/rig.js';
import {renderSourceCinematicPreview} from '../library/shots/cinematic.js';
import {markSourcePreview,SOURCE_PREVIEW_SCOPE,SOURCE_PREVIEW_LABEL} from '../packages/scenes/source-preview-scope.js';
import {secureSceneFiles,validateSceneFiles,validateSourcePreviewFiles} from '../packages/scenes/security.js';
import {readPreviewBytes,readSourcePreviewProject,previewRasterPath} from '../packages/scenes/source-preview-project.js';
import {sourcePreviewOptions,exportSourcePreview} from '../scripts/source-preview.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

function scene(){
  const shot={id:'original.s001',startMs:1000,endMs:3000} as Shot;
  const files:SceneFiles={files:[
    {path:'index.html',content:`<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><div data-composition-id="${shot.id}" data-width="1280" data-height="720" data-duration="2" data-start="0"><svg viewBox="0 0 1280 720"></svg></div><script>window.__timelines=window.__timelines||{};</script><script src="vendor/gsap.min.js"></script><script src="scene.js"></script></body></html>`},
    {path:'style.css',content:`html,body{margin:0;overflow:hidden;background:#241910}[data-composition-id="${shot.id}"]{position:relative;width:1280px;height:720px;}`},
    {path:'scene.js',content:`const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines["${shot.id}"]=tl;tl.to({},{duration:2},0);`},
  ],dependencies:[],notes:[]};return {shot,files};
}

test('ordinary scene remains production-valid; diagnostic bytes are separately validated and never publishable after reload',()=>{
  const f=scene(),before=hash(f.files);assert.deepEqual(validateSceneFiles(secureSceneFiles(f.files),f.shot),[]);
  const preview=secureSceneFiles(markSourcePreview(f.files,f.shot.id));assert.equal(hash(f.files),before);
  assert.deepEqual(validateSourcePreviewFiles(preview,f.shot),[]);
  assert.ok(validateSceneFiles(preview,f.shot).includes('Diagnostic source preview cannot enter production'));
  const reloaded={...preview,notes:[]};assert.deepEqual(validateSourcePreviewFiles(reloaded,f.shot),[]);
  assert.ok(validateSceneFiles(reloaded,f.shot).includes('Diagnostic source preview cannot enter production'));
  const html=preview.files.find(f=>f.path==='index.html')!.content;
  assert.ok(html.indexOf(SOURCE_PREVIEW_LABEL)>html.indexOf('</svg>')&&html.indexOf(SOURCE_PREVIEW_LABEL)<html.indexOf('</div>'));
  assert.equal(preview.files.find(f=>f.path==='scene.js')!.content,secureSceneFiles(f.files).files.find(f=>f.path==='scene.js')!.content);
});
test('preview scope does not exempt script/resource/CSS/clock/dimensions or byte-cap security',()=>{
  const f=scene(),preview=secureSceneFiles(markSourcePreview(f.files,f.shot.id));
  for(const [file,edit]of [
    ['scene.js',(s:string)=>s+'\nfetch("https://example.com");'],
    ['index.html',(s:string)=>s.replace('src="scene.js"','src="https://example.com/scene.js"')],
    ['index.html',(s:string)=>s.replace('data-duration="2"','data-duration="3"')],
    ['style.css',(s:string)=>s+'\nbody{color:red}'],
  ] as const){const changed={...preview,files:preview.files.map(f=>f.path===file?{...f,content:edit(f.content)}:f)};assert.ok(validateSourcePreviewFiles(changed,f.shot).length>0);}
  assert.ok(validateSourcePreviewFiles(preview,f.shot,10).includes('Scene exceeds max_scene_bytes'));
  assert.ok(validateSourcePreviewFiles(preview,f.shot,500000,[],{width:640,height:360}).length>0);
  assert.ok(validateSourcePreviewFiles(secureSceneFiles(f.files),f.shot).some(e=>e.includes('exact HTML scope')));
  for(const token of ['data-source-preview="'+SOURCE_PREVIEW_SCOPE+'"','name="story-factory-scope"','data-source-preview-label="'+SOURCE_PREVIEW_SCOPE+'"']){
    const changed={...preview,files:preview.files.map(f=>f.path==='index.html'?{...f,content:f.content.replace(token,'data-stripped="yes"')}:f)};assert.ok(validateSourcePreviewFiles(changed,f.shot).some(e=>e.includes('exact HTML scope')));
  }
});
test('foreign composition structure cannot acquire a diagnostic label',()=>{
  const f=scene();assert.throws(()=>markSourcePreview(f.files,'foreign'),/canonical cinematic/);
});
test('incomplete original project fails before emission, without retiming or granting any approval',()=>{
  const f=sourceInteractionFixture(),profile=f.profiles[0]!,input={board:f.board,narration:f.narration,
    beats:[BeatSchema.parse({id:'beat',chapterId:'chapter',startMs:0,endMs:5000,narrationText:f.ref.quote,meaning:f.ref.quote,visualGoal:'Original actor action',importance:1,segmentIds:['cue']})],
    characters:CharacterBibleSchema.parse({characters:f.characters.map(c=>({id:c.id,name:c.name,identity:{},wardrobe:{default:'original'},immutable:['identity'],mutable:['expression']}))}),profile,rig:buildRig(profile),config:f.config};
  const before=hash(input);assert.throws(()=>renderSourceCinematicPreview(input,f.board.shots[0]!.id,{method:'segment-draft',windowMs:20,intervals:[]}),/complete original source audit failed/);assert.equal(hash(input),before);
});
test('absent original project artifacts fail without writing a work directory',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-source-preview-'));
  try{await assert.rejects(readSourcePreviewProject(root),/missing work\/narration.json/);assert.deepEqual(await fs.readdir(root),[]);}
  finally{await fs.rm(root,{recursive:true,force:true});}
});
test('bounded source reads retain exact bytes and reject oversized or escaping paths',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'factory-source-preview-read-'));
  try{await fs.writeFile(path.join(root,'original.txt'),'original narration');assert.equal((await readPreviewBytes(root,'original.txt'))!.toString(),'original narration');await assert.rejects(readPreviewBytes(root,'original.txt',2),/oversized/);await assert.rejects(readPreviewBytes(root,'../outside.txt'),/escapes project/);assert.equal(await readPreviewBytes(root,'absent.json',4,true),null);assert.deepEqual(await fs.readdir(root),['original.txt']);}
  finally{await fs.rm(root,{recursive:true,force:true});}
});
test('still raster receipts use unchanged bytes; APNG control chunks are blocked without mistaking payload letters for animation',()=>{
  // Header/chunk contract only, not a valid decoded picture or artwork review.
  const chunk=(name:string,data:Buffer)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(name,4,'ascii');data.copy(b,8);return b;};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1);ihdr.writeUInt32BE(1,4);
  const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',Buffer.from('acTL')),chunk('IEND',Buffer.alloc(0))]);
  assert.equal(previewRasterPath('environment.png',bytes,hash(bytes)),'assets/source/'+hash(bytes)+'.png');
  assert.throws(()=>previewRasterPath('environment.png',bytes,'0'.repeat(64)),/hash mismatch/);
  assert.throws(()=>previewRasterPath('environment.jpg',bytes,hash(bytes)),/PNG\/JPEG\/WebP/);
  const animated=Buffer.concat([bytes.subarray(0,33),chunk('acTL',Buffer.alloc(8)),bytes.subarray(33)]);assert.throws(()=>previewRasterPath('environment.png',animated,hash(animated)),/animated background/);
});
test('opt-in options require an existing-project path/shot contract and do not expose render/provider/production switches',()=>{
  assert.throws(()=>sourcePreviewOptions(['--project','relative','--shot','shot']));
  for(const option of ['--render','--tts','--approve','--allow-production','--serve'])assert.throws(()=>sourcePreviewOptions([option]));
  assert.equal(sourcePreviewOptions(['--help']).help,true);
  const root=path.resolve('projects/original-story');assert.deepEqual(sourcePreviewOptions(['--project',root,'--shot','original.s001']),{project:root,shot:'original.s001',help:false});
});
test('user-provided complete original project exports receipted diagnostic scene bytes without editing its source',async t=>{
  const root=process.env.FACTORY_SOURCE_PREVIEW_QA_PROJECT,shotId=process.env.FACTORY_SOURCE_PREVIEW_QA_SHOT;
  if(!root||!shotId){t.skip('Requires explicit real original project/shot from user QA; no fixed demo or replacement fixture');return;}
  const before=await readSourcePreviewProject(root),output=await exportSourcePreview(root,shotId),after=await readSourcePreviewProject(root);
  assert.deepEqual(after.fileReceipts,before.fileReceipts);assert.equal(after.configHash,before.configHash);assert.equal(after.hostHash,before.hostHash);
  const report=JSON.parse(await fs.readFile(path.join(output,'preview-report.json'),'utf8'));
  assert.equal(report.status,'exported');assert.equal(report.shotId,shotId);assert.equal(report.canPublish,false);assert.equal(report.productionReady,false);assert.equal(report.productionApproval,false);assert.equal(report.motionVerified,false);assert.equal(report.audioIncluded,false);assert.equal(report.runtimePlayback,'NOT RUN');
  for(const [file,sha]of Object.entries(report.sceneReceipts))assert.equal(hash(await fs.readFile(path.join(output,file))),sha);
  for(const resource of report.resourceReceipts)assert.equal(hash(await fs.readFile(path.join(output,resource.path))),resource.sha256);
  const files:SceneFiles={files:await Promise.all(['index.html','style.css','scene.js'].map(async file=>({path:file,content:await fs.readFile(path.join(output,file),'utf8')}))),dependencies:[],notes:[]},shot=before.input.board.shots.find(s=>s.id===shotId)!;
  assert.deepEqual(validateSourcePreviewFiles(files,shot,before.input.config.workflow.max_scene_bytes,report.resourceReceipts.map((r:{path:string})=>r.path),before.input.config.rendering.final),[]);
  assert.ok(validateSceneFiles(files,shot,before.input.config.workflow.max_scene_bytes,report.resourceReceipts.map((r:{path:string})=>r.path),before.input.config.rendering.final).includes('Diagnostic source preview cannot enter production'));
  // Keep the exclusively reserved output for user visual QA. Never auto-approve
  // or delete evidence, and never start a browser/renderer from this callback.
});
