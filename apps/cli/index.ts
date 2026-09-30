#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import * as coordinator from '../../packages/orchestrator/index.js';
import { approveProject, createProject, getProjectStatus, runPipeline, updateLocks } from '../../packages/orchestrator/index.js';
import { loadConfig } from '../../packages/core/config.js';
import { States, type ProjectStatus } from '../../packages/core/schemas.js';
import { exists, runCommand } from '../../packages/core/utils.js';
import { readArtifact, saveArtifact } from '../server/artifacts.js';
import { HyperFramesEngine } from '../../packages/render/hyperframes.js';

const cli=new Command().name('video-factory').description('Compile source.md + SRT/WAV into a reviewed HyperFrames video.').version('1.0.0');
cli.command('new <name>').option('--root <directory>','Projects directory').option('--example','Copy the 60-second invention example').action(async(name:string,options:{root?:string,example?:boolean})=>console.log(await createProject(name,options)));
const stages:Record<string,ProjectStatus>={ingest:'TIMED',storyboard:'STORYBOARDED','build-scenes':'SCENES_READY',review:'REVIEWED',produce:'DONE',make:'DONE',resume:'DONE'};
for(const [command,until] of Object.entries(stages)) cli.command(`${command} <project>`).description(`Resume production through ${until}`).option('--force','Invalidate planning while respecting locks').option('--until <state>','Stop at a specific persisted state').option('--shot <id...>','Rebuild only these shots').action(async(project:string,options:{force?:boolean,until?:string,shot?:string[]})=>{
  const target=options.until ? z.enum(States).parse(options.until):until;
  const state=await runPipeline(project,{until:target,force:options.force,shotIds:options.shot,onProgress:s=>console.log(`[${s.state}] ${s.name}`)});
  console.log(JSON.stringify(state,null,2)); if(state.error) process.exitCode=2;
});
cli.command('render <project>').option('--draft','Render and snapshot a draft').action(async(project:string,options:{draft?:boolean})=>{ const state=await runPipeline(project,{until:options.draft?'DRAFT_RENDERED':'FINAL_RENDERED',onProgress:s=>console.log(`[${s.state}]`)}); console.log(JSON.stringify(state,null,2)); if(state.error) process.exitCode=2; });
cli.command('preview <project>').description('Open HyperFrames preview for the assembled scenes').action(async(project:string)=>{ if(!await exists(path.join(project,'scenes/index.html'))) await runPipeline(project,{until:'SCENES_READY'}); const engine=new HyperFramesEngine(await loadConfig(project),path.resolve(project)); console.log(await engine.preview()); });
cli.command('status <project>').action(async(project:string)=>console.log(JSON.stringify(await getProjectStatus(project),null,2)));
cli.command('approve <project> <kind>').description('Approve storyboard or characters').action(async(project:string,kind:string)=>{ await approveProject(project,z.enum(['storyboard','characters']).parse(kind)); console.log(`${kind} approved`); });
cli.command('lock <project> <item>').description('Lock storyboard, characterBible, or a shot ID').option('--unlock','Remove the lock').action(async(project:string,item:string,options:{unlock?:boolean})=>{ await updateLocks(project,{[item]:!options.unlock}); console.log(`${item} ${options.unlock?'unlocked':'locked'}`); });
cli.command('edit <project> <artifact> <replacement>').description('Import a manual artifact edit, preserving timing and invalidating dependent stages').action(async(project:string,artifact:string,replacement:string)=>{
  const names:Record<string,string>={storyboard:'storyboard.json',characters:'character-bible.json',assets:'asset-manifest.json',source:'source.md',narration:'narration.json',subtitles:'narration.srt'};
  const name=names[artifact]; if(!name) throw new Error('Artifact must be storyboard, characters, assets, source, narration or subtitles');
  const root=path.resolve(project), content=await fs.readFile(replacement,'utf8'), previous=await readArtifact(root,name);
  await saveArtifact(root,name,typeof previous.data==='string'?content:JSON.parse(content),previous.revision,coordinator);
  console.log(`Saved ${name}; resume to rebuild dependent stages`);
});
cli.command('doctor').description('Show runtime tools; does not render or call models').action(async()=>{ console.log(`Node ${process.version}`); for(const tool of [process.env.FFMPEG_PATH ?? 'ffmpeg',process.env.FFPROBE_PATH ?? 'ffprobe',process.env.PYTHON_PATH ?? 'python']) { try { const result=await runCommand(tool,[tool.includes('python')?'--version':'-version'],{timeoutMs:10000}); console.log(result.stdout.split('\n')[0]); } catch(e) { console.log(`${tool}: ${String(e)}`); process.exitCode=1; } } });
try { await cli.parseAsync(process.argv); } catch(error) { console.error(error instanceof Error ? error.message:String(error)); process.exitCode=1; }
