import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { FactoryConfig } from '../core/config.js';
import { exists, hash, readJson, safeRealPath, writeAtomic, writeJson } from '../core/utils.js';
import { parseScript, validateIdea, authoringSource } from '../ingest/script.js';
import type { ModelRouter } from '../models/registry.js';
import { loadPrompt } from '../story/prompts.js';
import { planWithValidation } from '../story/request.js';
import { ApprovalRequired } from './state-machine.js';
import {topicNarrativeContext} from '../topics/prehistoric-life.js';

export const SCRIPT_GENERATION_VERSION = 'story-authoring-1';
export const GeneratedDraftSchema = z.object({ title:z.string().min(1).max(300), kind:z.enum(['factual','fiction']),
  narration:z.string().min(1).max(128*1024),format:z.enum(['narration','dialogue']).optional(),warnings:z.array(z.string().max(2000)).max(30) }).strict();
export const ScriptGenerationReportSchema = z.object({ version:z.literal(1), generatorVersion:z.literal(SCRIPT_GENERATION_VERSION),
  identity:z.string(), sourcePath:z.string(), sourceHash:z.string(), referenceHash:z.string().nullable(),
  language:z.string(), targetSeconds:z.number(), title:z.string(), kind:z.enum(['factual','fiction']),
  requestedProvider:z.string(), requestedModel:z.string(), promptHash:z.string(), scriptHash:z.string(), documentHash:z.string(),
  factualVerification:z.literal('not-independently-verified'),scriptFormat:z.enum(['narration','dialogue']).optional(), warnings:z.array(z.string()), createdAt:z.string() }).strict();

async function writingPrompt(config:FactoryConfig):Promise<string>{
  const plain=await loadPrompt('script-writer');
  return config.input.script_format==='dialogue'?plain+'\n\n'+await loadPrompt('dialogue-script-writer'):plain;
}
/** Cache hits and fresh provider results obey the same selected format/kind. */
export function parseGeneratedScript(draft:z.infer<typeof GeneratedDraftSchema>,config:FactoryConfig){
  if(config.input.script_format==='dialogue'?draft.format!=='dialogue':draft.format==='dialogue')throw new Error('Generated script format differs from selected spoken format');
  if(config.script_generation.kind!=='auto'&&draft.kind!==config.script_generation.kind)throw new Error('Generated script kind differs from the selected story kind');
  return parseScript(draft.narration,'work/generated-script.txt',config.input.script_format);
}

function authoringIdentity(config:FactoryConfig,source:Buffer,reference:Buffer|null,prompt:string,sourcePath:string):string {
  return hash({version:SCRIPT_GENERATION_VERSION,sourcePath,source:hash(source),reference:reference?hash(reference):null,
    topic:topicNarrativeContext(config),language:config.project.language,settings:config.script_generation,writer:config.models.planner,fallback:config.models.fallback,prompt,...(config.input.script_format==='dialogue'?{format:'dialogue'}:{})});
}
export async function scriptGenerationIdentity(root:string,config:FactoryConfig):Promise<string> {
  const sourcePath=await authoringSource(root,config);
  const source = await fs.readFile(await safeRealPath(root,sourcePath));
  const reference = await exists(path.join(root,config.input.source)) ? await fs.readFile(await safeRealPath(root,config.input.source)) : null;
  return authoringIdentity(config,source,reference,await writingPrompt(config),sourcePath);
}

/** Publish a cached accepted draft before TTS. Voice and actor edits cannot issue a new writing call. */
export async function generateScript(root:string,config:FactoryConfig,router:ModelRouter):Promise<void> {
  const sourcePath=await authoringSource(root,config);
  const bytes=await fs.readFile(await safeRealPath(root,sourcePath));
  const idea=new TextDecoder('utf-8',{fatal:true}).decode(bytes);validateIdea(idea);
  const referenceBytes=await exists(path.join(root,config.input.source))?await fs.readFile(await safeRealPath(root,config.input.source)):null;
  if(referenceBytes&&referenceBytes.length>2*1024*1024)throw new Error('Script reference exceeds 2 MB');
  const reference=referenceBytes?new TextDecoder('utf-8',{fatal:true}).decode(referenceBytes):null;
  const system=await writingPrompt(config), identity=authoringIdentity(config,bytes,referenceBytes,system,sourcePath);
  const cache=path.join(root,'work/cache/scripts',`${identity}.json`);
  const CacheSchema=z.object({identity:z.literal(identity),draft:GeneratedDraftSchema,createdAt:z.string()}).strict();
  let accepted:z.infer<typeof CacheSchema>;
  if(await exists(cache))accepted=await readJson(cache,CacheSchema);
  else {
    if(router.isMock('planner'))throw new ApprovalRequired('script','needs-script: configure the script-writing model or supply a complete script. Offline sketches cannot author the requested story.');
    const request={system,prompt:JSON.stringify({language:config.project.language,writing:config.script_generation,...(config.input.script_format==='dialogue'?{scriptFormat:'dialogue',speakerIds:(config.voice.speaker_voices??[]).map(v=>v.speaker_id)}:{}),
      story:{sourcePath,text:idea},topic:topicNarrativeContext(config),reference:reference?{sourcePath:config.input.source,text:reference}:null})};
    const draft=await planWithValidation(root,config,router,'planner','script-generation',request,GeneratedDraftSchema,value=>{
      parseGeneratedScript(value,config);
      return value;
    },{identity,sourceHash:hash(bytes)});
    accepted={identity,draft,createdAt:new Date().toISOString()};await writeJson(cache,accepted);
  }
  const script=parseGeneratedScript(accepted.draft,config);
  if(identity!==await scriptGenerationIdentity(root,config))throw new Error('Authoring source changed during generation. The accepted draft is retained in cache; resume with current inputs.');
  await writeAtomic(path.join(root,'work/generated-script.txt'),accepted.draft.narration);
  await writeJson(path.join(root,'work/script.json'),script);
  await writeJson(path.join(root,'work/script-generation.json'),ScriptGenerationReportSchema.parse({version:1,generatorVersion:SCRIPT_GENERATION_VERSION,
    identity,sourcePath,sourceHash:hash(bytes),referenceHash:referenceBytes?hash(referenceBytes):null,
    language:config.project.language,targetSeconds:config.script_generation.target_seconds,title:accepted.draft.title,kind:accepted.draft.kind,
    requestedProvider:config.models.planner.provider,requestedModel:config.models.planner.model,promptHash:hash(system),scriptHash:hash(accepted.draft.narration),documentHash:hash(JSON.stringify(script,null,2)+'\n'),
    factualVerification:'not-independently-verified',...(config.input.script_format==='dialogue'?{scriptFormat:'dialogue'}:{}),warnings:accepted.draft.warnings,createdAt:accepted.createdAt}));
}
