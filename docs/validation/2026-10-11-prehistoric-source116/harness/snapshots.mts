import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const base='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/';
const load=async(p:string)=>import('file:///'+base+p),root=base+'runtime/prehistoric-life/qa/source116-chin/render-lila-left',output=root+'/shot-1';
const read=async(name:string)=>JSON.parse(await fs.readFile(root+'/'+name+'.json','utf8'));
const [board,profile,config]=await Promise.all(['storyboard','host-profile','config'].map(read)),shot=board.shots[1];
const {validateSceneFiles}=await load('packages/scenes/security.ts'),{actorRigResourcePaths}=await load('packages/actors/rig-resources.ts');
const files={files:await Promise.all(['index.html','style.css','scene.js'].map(async p=>({path:p,content:await fs.readFile(output+'/scenes/'+p,'utf8')}))),dependencies:[],notes:[]};
const errors=validateSceneFiles(files,shot,config.workflow.max_scene_bytes,actorRigResourcePaths(shot,profile),config.rendering.final);
if(errors.length!==1||errors[0]!=='Scene exceeds max_scene_bytes')throw Error('Unexpected scene failure: '+JSON.stringify(errors));
// Inspect the rejected scene in a local QA viewer only. Keep its production
// size failure, never renderDraft/renderFinal or publish this scene as accepted.
const {referenceHeadAssets,readReferenceHeadAsset}=await load('packages/animation/forest-head-art.ts'),{referenceBodyAssets}=await load('packages/animation/forest-body-art.ts');
const req=createRequire(base+'package.json');await fs.mkdir(output+'/scenes/vendor',{recursive:true});await fs.copyFile(req.resolve('gsap/dist/gsap.min.js'),output+'/scenes/vendor/gsap.min.js');
const s=shot.cinematic.actorScene,actors=[s.primary,...s.supporting.map((a:any)=>a.character)];
const resources=new Map(actors.flatMap((a:any)=>[...referenceHeadAssets(a.appearance),...referenceBodyAssets(a.appearance)]).map((a:any)=>[a.path,a]));
for(const resource of resources.values() as any){const dest=output+'/scenes/'+resource.path;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,readReferenceHeadAsset(resource));}
const {HyperFramesEngine}=await load('packages/render/hyperframes.ts'),engine=new HyperFramesEngine(config,output);
const report:any={scope:'LOCAL QA SNAPSHOTS OF SIZE-REJECTED SCENE; NOT AN ACCEPTED VIDEO',productionValidationErrors:errors,productionAcceptance:false,finalExportAllowed:false,videoExport:'NOT RUN',paidCalls:0,sourceRange:[shot.startMs,shot.endMs]};
const save=async()=>fs.writeFile(output+'/snapshot-report.json',JSON.stringify(report,null,2));await save();
report.validation=await engine.validate('scenes');await save();if(!report.validation.pass)throw Error('HyperFrames lint/check failed');
report.frames=await engine.snapshots({project:'scenes',frames:[0,300,800,1499].map(timeMs=>({timeMs,output:'qa-frames/'+timeMs+'.png'}))});await save();console.log(JSON.stringify({frames:report.frames,videoExport:report.videoExport}));
