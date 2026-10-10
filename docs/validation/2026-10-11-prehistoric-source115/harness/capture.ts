import {promises as fs} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {renderCinematic} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/library/shots/cinematic.ts';
import {secureSceneFiles,validateSceneFiles,validateSceneScript} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/scenes/security.ts';
import {actorRigResourcePaths} from 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/packages/actors/rig-resources.ts';
async function main(){
 const base='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/';
 const source=base+'runtime/prehistoric-life/native-seat-tracers/tracer-2026-10-10T18-03-13-906Z-24aaeba8-b049-4f5f-8366-3e52298180d1/work/';
 const out=base+'runtime/prehistoric-life/qa/source115-scene-data/capture';await fs.mkdir(out,{recursive:true});
 const read=async(name:string)=>JSON.parse(await fs.readFile(source+name+'.json','utf8'));
 const [board,narration,activity,profile,rig,config]=await Promise.all(['storyboard','narration','speech-activity','host-profile','host-rig','config'].map(read));
 const shot=board.shots[0];console.log('START',new Date().toISOString(),shot.id);const start=performance.now();
 const result=renderCinematic(shot,profile,rig,activity,config,undefined,narration,undefined,undefined,board),files=secureSceneFiles(result.files);
 for(const f of files.files)await fs.writeFile(out+'/'+f.path,f.content);
 await fs.writeFile(out+'/performance.json',JSON.stringify(result.report));
 const js=files.files.find(f=>f.path==='scene.js')!.content;
 const rejected=js.split('\n').flatMap((line,index)=>{
  if(!line.startsWith('tl.'))return [];
  const e=validateSceneScript('const tl=gsap.timeline({paused:true});window.__timelines=window.__timelines||{};window.__timelines['+JSON.stringify(shot.id)+']=tl;'+line,shot.id);
  return e.length?[{line:index+1,text:line,errors:e}]:[];
 });
 const report={time:new Date().toISOString(),durationMs:performance.now()-start,source,shotId:shot.id,files:files.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content),gzipBytes:gzipSync(f.content).length,sha256:createHash('sha256').update(f.content).digest('hex')})),errors:validateSceneFiles(files,shot,config.workflow.max_scene_bytes,actorRigResourcePaths(shot,profile),config.rendering.final),rejectedCount:rejected.length,rejected:rejected.slice(0,12)};
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}main().catch(e=>{console.error(e);process.exitCode=1;});
