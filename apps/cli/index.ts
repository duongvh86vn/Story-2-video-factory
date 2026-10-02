#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs, constants as fileConstants } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import * as coordinator from '../../packages/orchestrator/index.js';
import { approveProject, createProject, getProjectStatus, runPipeline, updateLocks } from '../../packages/orchestrator/index.js';
import { loadConfig } from '../../packages/core/config.js';
import { States, type ProjectStatus } from '../../packages/core/schemas.js';
import { exists, runCommand } from '../../packages/core/utils.js';
import { readArtifact, saveArtifact, cinematicArtifactStatuses, cinematicArtifactStatus, DOWNLOADS, locate, currentDownload } from '../server/artifacts.js';
import { HyperFramesEngine } from '../../packages/render/hyperframes.js';
import { updateSettings, PresentationPatchSchema } from '../../packages/orchestrator/settings.js';
import { outputPath } from '../../packages/render/process.js';
import { parseScript } from '../../packages/ingest/script.js';
import { writeAtomic } from '../../packages/core/utils.js';

const cli=new Command().name('video-factory').description('Compile script, WAV or SRT into an animated story with stick figure or robot actors.').version('2.2.0');
cli.command('configure <project>')
  .option('--language <code>','Narration language (default vi)').option('--input <mode>','script, wav, srt or auto')
  .option('--host <kind>','mini-robot, stick-man or custom actor rig').option('--style <mode>','diagram or story-cinematic; keeps valid narration/audio')
  .option('--characters <mode>','actors or legacy presenter').option('--tts <provider>','windows-speech, http, command or none').option('--voice <id>').option('--tts-url <url>')
  .action(async(project:string,o:{language?:string;input?:string;host?:string;style?:string;characters?:string;tts?:string;voice?:string;ttsUrl?:string})=>{
    await updateSettings(path.resolve(project),{...(o.language?{language:o.language}:{}),
      ...(o.style!==undefined||o.characters!==undefined?{presentation:PresentationPatchSchema.parse({...o.style?{mode:o.style}:{},...o.characters?{character_mode:o.characters}:{}})}:{}),
      ...(o.input?{input:{mode:z.enum(['auto','script','wav','srt']).parse(o.input)}}:{}),
      ...(o.host?{host:z.enum(['mini-robot','stick-man','custom']).parse(o.host)}:{}),
      ...(o.tts||o.voice||o.ttsUrl?{voice:{...(o.tts?{tts_provider:z.enum(['none','windows-speech','http','command']).parse(o.tts)}:{}),...(o.voice?{voice_id:o.voice}:{}),...(o.ttsUrl?{base_url:o.ttsUrl}:{})}}:{})});console.log('Settings saved');
  });
cli.command('script <project> <file>').description('Import a complete spoken script (.txt/.md)').action(async(project:string,file:string)=>{const root=path.resolve(project),extension=path.extname(file).toLowerCase();if(!['.txt','.md'].includes(extension))throw new Error('Script must be .txt or .md');const body=new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file)),relative=`input/script${extension}`;parseScript(body,relative);await coordinator.invalidateProject(root,'NEW');await writeAtomic(await outputPath(root,relative),body);await updateSettings(root,{input:{mode:'script',script:relative as 'input/script.txt'|'input/script.md'}});console.log('Script imported');});
cli.command('new <name>').option('--root <directory>','Projects directory').option('--example','Copy the explanatory steam script example').option('--style <mode>','diagram or story-cinematic').action(async(name:string,options:{root?:string,example?:boolean,style?:string})=>{
  const presentation = options.style !== undefined ? PresentationPatchSchema.parse({mode:options.style}) : undefined;
  const root = await createProject(name,{root:options.root,example:options.example});
  if(presentation)await updateSettings(root,{presentation});console.log(root);
});
const stages:Record<string,ProjectStatus>={ingest:'TIMED',storyboard:'STORYBOARDED','build-scenes':'SCENES_READY',review:'REVIEWED',produce:'DONE',make:'DONE',resume:'DONE'};
for(const [command,until] of Object.entries(stages)) cli.command(`${command} <project>`).description(`Resume production through ${until}`).option('--force','Invalidate planning while respecting locks').option('--until <state>','Stop at a specific persisted state').option('--shot <id...>','Rebuild only these shots').action(async(project:string,options:{force?:boolean,until?:string,shot?:string[]})=>{
  const target=options.until ? z.enum(States).parse(options.until):until;
  const state=await runPipeline(project,{until:target,force:options.force,shotIds:options.shot,onProgress:s=>console.log(`[${s.state}] ${s.name}`)});
  console.log(JSON.stringify(state,null,2)); if(state.error) process.exitCode=2;
});
cli.command('render <project>').option('--draft','Render and snapshot a draft').action(async(project:string,options:{draft?:boolean})=>{ const state=await runPipeline(project,{until:options.draft?'DRAFT_RENDERED':'FINAL_RENDERED',onProgress:s=>console.log(`[${s.state}]`)}); console.log(JSON.stringify(state,null,2)); if(state.error) process.exitCode=2; });
cli.command('preview <project>').description('Open HyperFrames preview for the assembled scenes').action(async(project:string)=>{ if(!await exists(path.join(project,'scenes/index.html'))) await runPipeline(project,{until:'SCENES_READY'}); const engine=new HyperFramesEngine(await loadConfig(project),path.resolve(project)); console.log(await engine.preview()); });
cli.command('status <project>').action(async(project:string)=>{const root=path.resolve(project);console.log(JSON.stringify({...await getProjectStatus(root) as object,presentation:(await loadConfig(root)).presentation,cinematicArtifacts:await cinematicArtifactStatuses(root)},null,2));});
cli.command('artifact <project> <name>').description('Read an allowed artifact as JSON; derived cinematic plans are read-only').action(async(project:string,name:string)=>{
  const root=path.resolve(project),doc=await readArtifact(root,name),statuses=await cinematicArtifactStatuses(root);
  console.log(JSON.stringify({...doc,...(statuses[name]?{freshness:statuses[name]}:{})},null,2));
});
cli.command('download <project> <name> <destination>').description('Copy a current allowed artifact without overwriting an existing file').action(async(project:string,name:string,destination:string)=>{
  const root=path.resolve(project),paths=DOWNLOADS[name];if(!paths)throw new Error('Download is not allowed.');
  if(!await currentDownload(root,name))throw new Error('Artifact is stale; resume production before downloading it.');
  const file=await locate(root,paths);if(!file)throw new Error('Artifact is not available yet.');
  const statuses=await cinematicArtifactStatuses(root);if(statuses[name]?.status==='unverified')console.error(`Unverified: ${(await cinematicArtifactStatus(root,name)).reason}`);
  await fs.copyFile(file,path.resolve(destination),fileConstants.COPYFILE_EXCL);console.log(path.resolve(destination));
});
cli.command('approve <project> <kind>').description('Approve host, storyboard or characters').action(async(project:string,kind:string)=>{ await approveProject(project,z.enum(['storyboard','characters','host']).parse(kind)); console.log(`${kind} approved`); });
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
