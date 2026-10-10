import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const base='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/';
const modules=async(p:string)=>import('file:///'+base+p);
const {createNativeHeadSeatTracer}=await modules('benchmarks/native-seat-tracer.ts');
const {renderCinematic}=await modules('library/shots/cinematic.ts');
const {secureSceneFiles,validateSceneFiles}=await modules('packages/scenes/security.ts');
const {actorRigResourcePaths}=await modules('packages/actors/rig-resources.ts');
const {referenceHeadAssets,readReferenceHeadAsset}=await modules('packages/animation/forest-head-art.ts');
const {referenceBodyAssets}=await modules('packages/animation/forest-body-art.ts');
const {HyperFramesEngine}=await modules('packages/render/hyperframes.ts');
const {hash}=await modules('packages/core/utils.ts');
const staging=process.argv[2]??'lila-left',indices=(process.argv[3]??'1,2').split(',').map(Number),root=base+'runtime/prehistoric-life/qa/source116-chin/render-'+staging;
await fs.mkdir(root,{recursive:true});
const fixture=await createNativeHeadSeatTracer(base,{staging,acting:'listening-think'}),activity={method:'segment-draft',windowMs:20,intervals:[]};
for(const [name,data] of Object.entries({storyboard:fixture.board,narration:fixture.narration,'speech-activity':activity,'host-profile':fixture.profile,'host-rig':fixture.rig,config:fixture.config}))await fs.writeFile(root+'/'+name+'.json',JSON.stringify(data,null,2));
for(const index of indices){
 const shot=fixture.board.shots[index],output=root+'/shot-'+index;await fs.mkdir(output+'/scenes',{recursive:true});
 const report:any={startedAt:new Date().toISOString(),staging,shotId:shot.id,sourceRange:[shot.startMs,shot.endMs],boardHash:hash(fixture.board),productionAcceptance:false,finalExportAllowed:false,audio:'SILENT DIAGNOSTIC',paidCalls:0,phase:'compile'};
 const save=async()=>fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await save();
 try{
  const result=renderCinematic(shot,fixture.profile,fixture.rig,activity,fixture.config,undefined,fixture.narration,undefined,undefined,fixture.board),files=secureSceneFiles(result.files);
  report.bytes=files.files.map((f:any)=>({path:f.path,bytes:Buffer.byteLength(f.content)}));report.validationErrors=validateSceneFiles(files,shot,fixture.config.workflow.max_scene_bytes,actorRigResourcePaths(shot,fixture.profile),fixture.config.rendering.final);
  await fs.writeFile(output+'/performance.json',JSON.stringify(result.report,null,2));
  for(const file of files.files)await fs.writeFile(output+'/scenes/'+file.path,file.content);
  await save();console.log(JSON.stringify({shot:index,bytes:report.bytes,validationErrors:report.validationErrors}));
  if(report.validationErrors.length)throw Error('Scene safety/size validation failed');
  const require=createRequire(base+'package.json');await fs.mkdir(output+'/scenes/vendor',{recursive:true});await fs.copyFile(require.resolve('gsap/dist/gsap.min.js'),output+'/scenes/vendor/gsap.min.js');
  const scene=shot.cinematic.actorScene,actors=[scene.primary,...scene.supporting.map((a:any)=>a.character)];
  const resources=new Map(actors.flatMap((a:any)=>[...referenceHeadAssets(a.appearance),...referenceBodyAssets(a.appearance)]).map((a:any)=>[a.path,a]));
  for(const resource of resources.values() as any){const destination=output+'/scenes/'+resource.path;await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,readReferenceHeadAsset(resource));}
  // A visible diagnostic label is separate from the source SVG/actor data.
  const html=output+'/scenes/index.html';await fs.writeFile(html,(await fs.readFile(html,'utf8')).replace('</body>','<div style="position:absolute;left:12px;top:10px;color:#9a3600;font:16px sans-serif">SILENT DIAGNOSTIC — UNAPPROVED</div></body>'));
  const engine=new HyperFramesEngine(fixture.config,output);report.phase='hyperframes-validate';await save();report.validation=await engine.validate('scenes');await save();if(!report.validation.pass)throw Error('HyperFrames lint/check failed');
  const duration=shot.endMs-shot.startMs,times=[0,Math.min(duration-1,index===1?800:1300),duration-1];
  report.phase='snapshots';await save();report.frames=await engine.snapshots({project:'scenes',frames:times.map(timeMs=>({timeMs,output:'frames/'+timeMs+'.png'}))});await save();
  report.phase='draft-render';await save();report.render=await engine.renderDraft('scenes');report.phase='exported';report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({shot:index,phase:report.phase,render:report.render}));
 }catch(error){report.error=String(error);report.phase='failed';await save();throw error;}
}
