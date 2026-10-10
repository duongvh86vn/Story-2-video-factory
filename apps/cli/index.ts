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
import { parseScript, ScriptFormatSchema,validateIdea, resolveInputMode } from '../../packages/ingest/script.js';
import { writeAtomic } from '../../packages/core/utils.js';
import { installedWindowsVoices,matchingWindowsVoices } from '../../packages/voice/catalog.js';
import { NARRATION_LANGUAGES,LANGUAGE_TAG,primaryLanguage } from '../../packages/core/languages.js';
import {importActorMotion,listActorMotions,loadActorMotion} from '../../packages/motion/import.js';
import {motionWorkbench} from '../../packages/motion/workbench.js';
import {loadSpriteMotionCatalog} from '../../packages/motion/catalog.js';
import {importActorSpeech,listActorSpeech,loadActorSpeech} from '../../packages/motion/speech-import.js';
import {boundPath,ensureIdle,ProjectName} from '../server/security.js';
import {addMotionMeasureCommand} from './motion-measure-command.js';

const cli=new Command().name('video-factory').description('Turn a topic/story, complete script, WAV or SRT into an animated story with stick figure or robot actors.').version('2.2.0');
addMotionMeasureCommand(cli);
cli.command('motion-import <project> <metadata>').description('Import a local sprite bundle as a candidate; requires a configured idle project')
  .requiredOption('--registration <file>','Explicit local actor/state/view/anchor/playback registration')
  .action(async(project:string,metadata:string,options:{registration:string})=>{
    const root=path.resolve(project);
    await boundPath(root,'project.yaml');await loadConfig(root);await ensureIdle(root);
    const metadataFile=path.isAbsolute(metadata)?metadata:await boundPath(root,metadata);
    const registrationFile=path.isAbsolute(options.registration)?options.registration:await boundPath(root,options.registration);
    console.log(JSON.stringify(await importActorMotion(root,metadataFile,registrationFile),null,2));
  });
cli.command('motion-list <project>').description('List verified candidate motion descriptors as JSON')
  .action(async(project:string)=>console.log(JSON.stringify(await listActorMotions(path.resolve(project)),null,2)));
cli.command('speech-import <project> <sheet>').description('Import candidate native-frame mouth artwork; does not approve or produce a video')
  .requiredOption('--registration <file>','Exact native motion/version and per-frame mouth rectangles')
  .action(async(project:string,sheet:string,options:{registration:string})=>{
    const root=path.resolve(project);await boundPath(root,'project.yaml');await loadConfig(root);await ensureIdle(root);
    const selectedSheet=path.isAbsolute(sheet)?sheet:await boundPath(root,sheet);
    const registration=path.isAbsolute(options.registration)?options.registration:await boundPath(root,options.registration);
    console.log(JSON.stringify(await importActorSpeech(root,selectedSheet,registration),null,2));
  });
cli.command('speech-list <project>').description('List verified candidate mouth variants and their exact native motion identity')
  .action(async(project:string)=>console.log(JSON.stringify(await listActorSpeech(path.resolve(project)),null,2)));
cli.command('motion-catalog <project>').description('Read the verified movement library and its draft-only capabilities as JSON')
  .action(async(project:string)=>console.log(JSON.stringify(await loadSpriteMotionCatalog(path.resolve(project)),null,2)));
cli.command('motion-preview <project> <id> <fingerprint>').description('Validate a candidate and print its preview URL in the running project Studio')
  .option('--port <port>','Port of the running Studio for this project','8850')
  .action(async(project:string,id:string,fingerprint:string,options:{port:string})=>{
    const root=path.resolve(project),name=ProjectName.parse(path.basename(root));
    const port=z.coerce.number().int().min(1).max(65535).parse(options.port);
    // Verify descriptor and preflight the compiler before printing the existing Studio URL.
    motionWorkbench(await loadActorMotion(root,id,fingerprint));
    console.log(`http://127.0.0.1:${port}/api/projects/${encodeURIComponent(name)}/motions/${encodeURIComponent(id)}/${fingerprint}/preview`);
  });
cli.command('speech-preview <project> <id> <fingerprint>').description('Preflight candidate mouth artwork and print a diagnostic preview URL; no audio acceptance')
  .option('--port <port>','Port of the running project Studio','8850')
  .action(async(project:string,id:string,fingerprint:string,options:{port:string})=>{
    const root=path.resolve(project),name=ProjectName.parse(path.basename(root)),port=z.coerce.number().int().min(1).max(65535).parse(options.port);
    const variant=await loadActorSpeech(root,id,fingerprint);
    motionWorkbench(await loadActorMotion(root,variant.motionId,variant.motionFingerprint),1,variant);
    console.log(`http://127.0.0.1:${port}/api/projects/${encodeURIComponent(name)}/motions/speech/${encodeURIComponent(id)}/${fingerprint}/preview`);
  });
cli.command('configure <project>')
  .option('--language <code>','Narration language: en, vi, ja, ko or locale (e.g. en-US)').option('--input <mode>','story, script, wav (legacy: idea, srt, auto)')
  .option('--host <kind>','mini-robot, stick-man or custom actor rig').option('--style <mode>','diagram or story-cinematic; keeps valid narration/audio')
  .option('--characters <mode>','actors or legacy presenter').option('--actor-renderer <kind>','rig or sprite; image motion needs a registered movement library').option('--tts <provider>','windows-speech, azure-speech, omnivoice-studio, openai-compatible, http, command or none').option('--voice <id>').option('--tts-url <url>')
  .option('--tts-model <id>','Model installed on the local TTS server').option('--tts-timeout <seconds>','Per-segment TTS timeout').option('--tts-options <json>','Additional provider parameters').option('--tts-fields <json>','Custom HTTP request field names')
  .action(async(project:string,o:{language?:string;input?:string;host?:string;style?:string;characters?:string;actorRenderer?:string;tts?:string;voice?:string;ttsUrl?:string;ttsModel?:string;ttsTimeout?:string;ttsOptions?:string;ttsFields?:string})=>{
    await updateSettings(path.resolve(project),{...(o.language?{language:o.language}:{}),
      ...(o.style!==undefined||o.characters!==undefined||o.actorRenderer!==undefined?{presentation:PresentationPatchSchema.parse({...o.style?{mode:o.style}:{},...o.characters?{character_mode:o.characters}:{},...o.actorRenderer?{actor_renderer:o.actorRenderer}:{}})}:{}),
      ...(o.input?{input:{mode:z.enum(['auto','story','idea','script','wav','srt']).parse(o.input)}}:{}),
      ...(o.host?{host:z.enum(['mini-robot','stick-man','custom']).parse(o.host)}:{}),
      ...(o.tts||o.voice||o.ttsUrl||o.ttsModel||o.ttsTimeout||o.ttsOptions||o.ttsFields?{voice:{...(o.tts?{tts_provider:z.enum(['none','windows-speech','azure-speech','omnivoice-studio','openai-compatible','http','command']).parse(o.tts)}:{}),...(o.voice?{voice_id:o.voice}:{}),...(o.ttsUrl?{base_url:o.ttsUrl}:{}),
        ...(o.ttsModel?{model:o.ttsModel}:{}),...(o.ttsTimeout?{timeout_ms:Number(o.ttsTimeout)*1000}:{}),...(o.ttsOptions?{http_extra_body:JSON.parse(o.ttsOptions)}:{}),...(o.ttsFields?{http_fields:JSON.parse(o.ttsFields)}:{})}}:{})});console.log('Settings saved');
  });
cli.command('voices').description('List installed Windows voices and supported narration languages').option('--language <code>','Filter installed voices by narration language').action(async(o:{language?:string})=>{
  const language=o.language?z.string().regex(LANGUAGE_TAG).parse(o.language):undefined,windows=await installedWindowsVoices();
  console.log(JSON.stringify({languages:NARRATION_LANGUAGES.filter(item=>!language||item.id===primaryLanguage(language)),windows:{...windows,voices:language?matchingWindowsVoices(windows.voices,language):windows.voices}},null,2));
});
cli.command('script <project> <file>').description('Import a complete script (.txt/.md)').option('--spoken-format <format>','narration or explicit dialogue').action(async(project:string,file:string,options:{spokenFormat?:string})=>{const root=path.resolve(project),extension=path.extname(file).toLowerCase();if(!['.txt','.md'].includes(extension))throw new Error('Script must be .txt or .md');const body=new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file)),relative=`input/script${extension}`;const spokenFormat=ScriptFormatSchema.parse(options.spokenFormat??(await loadConfig(root)).input.script_format??'narration');parseScript(body,relative,spokenFormat);await coordinator.invalidateProject(root,'NEW');await writeAtomic(await outputPath(root,relative),body);await updateSettings(root,{input:{mode:'script',script:relative as 'input/script.txt'|'input/script.md',script_format:spokenFormat}});console.log('Script imported');});
cli.command('idea <project> <file>').description('Import a topic, idea or rough story (.txt/.md)').action(async(project:string,file:string)=>{const root=path.resolve(project),extension=path.extname(file).toLowerCase();if(!['.txt','.md'].includes(extension))throw new Error('Idea must be .txt or .md');const body=new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file)),relative=`input/idea${extension}`;validateIdea(body);await coordinator.invalidateProject(root,'NEW');await writeAtomic(await outputPath(root,relative),body);await updateSettings(root,{input:{mode:'idea',idea:relative as 'input/idea.txt'|'input/idea.md'}});console.log('Idea imported');});
cli.command('story <project> <file>').description('Import a topic, story or rough story (.txt/.md)').action(async(project:string,file:string)=>{const root=path.resolve(project),extension=path.extname(file).toLowerCase();if(!['.txt','.md'].includes(extension))throw new Error('Story must be .txt or .md');const body=new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file)),relative=`input/story${extension}`;validateIdea(body);await coordinator.invalidateProject(root,'NEW');await writeAtomic(await outputPath(root,relative),body);await updateSettings(root,{input:{mode:'story',story:relative as 'input/story.txt'|'input/story.md'}});console.log('Story imported');});
cli.command('authoring <project>').description('Configure the script-writing model and story preferences')
  .option('--provider <name>').option('--model <id>').option('--url <url>').option('--key-env <name>').option('--timeout <seconds>')
  .option('--kind <kind>','auto, factual or fiction').option('--seconds <seconds>','Writing target only; audio establishes the clock').option('--brief <text>')
  .action(async(project:string,o:{provider?:string;model?:string;url?:string;keyEnv?:string;timeout?:string;kind?:string;seconds?:string;brief?:string})=>{
    const config=await loadConfig(path.resolve(project));
    await updateSettings(path.resolve(project),{models:{planner:{...(o.provider?{provider:z.enum(['gateway','openai-compatible','gemini','deepseek','ollama','litellm','claude-cli','codex-cli','mock']).parse(o.provider)}:{}),...(o.model?{model:o.model}:{}),...(o.url?{base_url:o.url}:{}),...(o.keyEnv?{api_key_env:o.keyEnv}:{}),timeout_ms:o.timeout?Number(o.timeout)*1000:o.provider&&['codex-cli','claude-cli'].includes(o.provider)?900000:config.models.planner.timeout_ms}},
      script_generation:{...(o.kind?{kind:z.enum(['auto','factual','fiction']).parse(o.kind)}:{}),...(o.seconds?{target_seconds:Number(o.seconds)}:{}),...(o.brief!==undefined?{brief:o.brief}:{})}});console.log('Authoring settings saved');
  });
cli.command('write-script <project>').description('Generate a script from the selected idea, stopping before TTS').action(async(project:string)=>{const root=path.resolve(project);if(!['idea','story'].includes(await resolveInputMode(root,await loadConfig(root))))throw new Error('Select story input to generate a script');const state=await runPipeline(root,{until:'INGESTED'});console.log(JSON.stringify(state,null,2));if(state.error)process.exitCode=2;});
cli.command('new <name>').option('--topic <id>','Reusable topic: prehistoric-life').option('--root <directory>','Projects directory').option('--example','Copy the explanatory steam script example').option('--style <mode>','diagram or story-cinematic').action(async(name:string,options:{root?:string,example?:boolean,style?:string,topic?:string})=>{
  const presentation = options.style !== undefined ? PresentationPatchSchema.parse({mode:options.style}) : undefined;
  const root = await createProject(name,{root:options.root,example:options.example,topic:options.topic?z.literal('prehistoric-life').parse(options.topic):undefined});
  if(presentation)await updateSettings(root,{presentation});console.log(root);
});
const stages:Record<string,ProjectStatus>={ingest:'TIMED',storyboard:'STORYBOARDED','build-scenes':'SCENES_READY',review:'REVIEWED',produce:'DONE',make:'DONE',resume:'DONE'};
for(const [command,until] of Object.entries(stages)) cli.command(`${command} <project>`).description(`Resume production through ${until}`).option('--force','Invalidate planning while respecting locks').option('--until <state>','Stop at a specific persisted state').option('--shot <id...>','Rebuild only these shots').option('--retry-model-errors','Explicitly retry completed failed model requests; retains usage limits and failure history').option('--scene-repair-attempts <number>','Allow 0–3 scene repair attempts for this invocation; retains journal and review limits').action(async(project:string,options:{force?:boolean,until?:string,shot?:string[],retryModelErrors?:boolean,sceneRepairAttempts?:string})=>{
  const target=options.until ? z.enum(States).parse(options.until):until;
  const state=await runPipeline(project,{until:target,force:options.force,shotIds:options.shot,retryModelErrors:options.retryModelErrors,sceneRepairAttempts:options.sceneRepairAttempts===undefined?undefined:z.coerce.number().int().min(0).max(3).parse(options.sceneRepairAttempts),onProgress:s=>console.log(`[${s.state}] ${s.name}`)});
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
