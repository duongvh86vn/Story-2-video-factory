import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {secureSceneFiles,validateSceneFiles} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/scenes/security.ts';
import {HyperFramesEngine} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/render/hyperframes.ts';
import {actorRigResourcePaths} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/actors/rig-resources.ts';
import {referenceHeadAssets,readReferenceHeadAsset} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/animation/forest-head-art.ts';
import {referenceBodyAssets} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/animation/forest-body-art.ts';
async function main(){
 const base='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/';
 const previous=base+'runtime/prehistoric-life/native-seat-tracers/tracer-2026-10-10T18-03-13-906Z-24aaeba8-b049-4f5f-8366-3e52298180d1/work/';
 const capture=base+'runtime/prehistoric-life/qa/source115-scene-data/capture/',root=base+'runtime/prehistoric-life/qa/source115-scene-data/packed-left';
 await fs.mkdir(root+'/scenes',{recursive:true});const read=async(n:string)=>JSON.parse(await fs.readFile(previous+n+'.json','utf8'));
 const [board,profile,config]=await Promise.all(['storyboard','host-profile','config'].map(read)),shot=board.shots[0];
 const raw={files:await Promise.all(['index.html','style.css','scene.js'].map(async p=>({path:p,content:await fs.readFile(capture+p,'utf8')}))),dependencies:[],notes:[]};
 const files=secureSceneFiles(raw),original=raw.files.find(f=>f.path==='scene.js')!.content,packed=files.files.find(f=>f.path==='scene.js')!.content;
 function digest(source:string){const hash=createHash('sha256');let calls=0;const tl=Object.fromEntries(['set','to','from','fromTo'].map(method=>[method,(...args:unknown[])=>{calls++;hash.update(JSON.stringify([method,args])+'\n');}]));runInNewContext(source,{gsap:{timeline:()=>tl},window:{},atob,Uint8Array,TextDecoder});return {calls,sha256:hash.digest('hex')};}
 const report:any={startedAt:new Date().toISOString(),sourceCapture:capture,original:raw.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content)})),packed:files.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content)})),originalErrors:validateSceneFiles(raw,shot,config.workflow.max_scene_bytes,actorRigResourcePaths(shot,profile),config.rendering.final),packedErrors:validateSceneFiles(files,shot,config.workflow.max_scene_bytes,actorRigResourcePaths(shot,profile),config.rendering.final),callDigest:{original:digest(original),packed:digest(packed)},productionAcceptance:false,finalExportAllowed:false,reverseSeek:'NOT RUN',paidCalls:0};
 const save=async()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));await save();console.log('PACK',JSON.stringify(report));
 if(report.packedErrors.length||report.callDigest.original.sha256!==report.callDigest.packed.sha256)throw Error('Pack validation/digest failed');
 for(const f of files.files){let content=f.content;if(f.path==='index.html')content=content.replace('</svg>','<text x="12" y="24" fill="#9a3600" font-size="16">SILENT DIAGNOSTIC — UNAPPROVED</text></svg>');await fs.writeFile(root+'/scenes/'+f.path,content);}
 await fs.mkdir(root+'/scenes/vendor',{recursive:true});const req=createRequire(base+'package.json');await fs.copyFile(req.resolve('gsap/dist/gsap.min.js'),root+'/scenes/vendor/gsap.min.js');
 const characters=[shot.cinematic.actorScene.primary,...shot.cinematic.actorScene.supporting.map((a:any)=>a.character)],resources=new Map(characters.flatMap((a:any)=>[...referenceHeadAssets(a.appearance),...referenceBodyAssets(a.appearance)]).map(a=>[a.path,a]));
 for(const resource of resources.values()){const dest=root+'/scenes/'+resource.path;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,readReferenceHeadAsset(resource));}
 const engine=new HyperFramesEngine(config,root);report.phase='hyperframes';await save();report.validation=await engine.validate('scenes');await save();console.log('VALIDATE',report.validation.pass);
 if(!report.validation.pass)throw Error('HyperFrames lint/check failed');
 report.phase='snapshots';await save();report.frames=await engine.snapshots({project:'scenes',frames:[0,100,450,899].map(timeMs=>({timeMs,output:`frames/${timeMs}.png`}))});await save();console.log('FRAMES',report.frames.length);
 report.phase='render-draft';await save();report.render=await engine.renderDraft('scenes');report.phase='exported';report.completedAt=new Date().toISOString();await save();console.log('RENDER',JSON.stringify(report.render));
}main().catch(e=>{console.error(e);process.exitCode=1;});
