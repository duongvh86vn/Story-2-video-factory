import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { deepMerge, findRepoRoot, loadConfig } from '../packages/core/config.js';
import { exists, readJson, writeJson } from '../packages/core/utils.js';
import { NarrationSchema, ReviewSchema, StoryboardSchema, CharacterBibleSchema } from '../packages/core/schemas.js';
import { createProject, invalidateProject, runPipeline } from '../packages/orchestrator/index.js';
import { loadState, stateIndex } from '../packages/orchestrator/state-machine.js';

// An opt-in measurement tool. Never runs as part of installation or build.
const cli=new Command().option('--count <number>','Samples per run (same fixture and variant list across models)','20').option('--config <path>','YAML routing overrides for the models being measured').option('--output <directory>','Measurement destination','temp/benchmarks').option('--full','Include scene checks, repair, snapshots and real visual review').option('--generated','Exercise model scene code rather than catalog recipes (implies --full)').option('--render','Include final rendering/QC (implies --full)').parse();
const options=cli.opts<{count:string,config?:string,output:string,full?:boolean,generated?:boolean,render?:boolean}>();
if(options.generated || options.render) options.full=true;
const count=Number(options.count); if(!Number.isInteger(count) || count<1 || count>100) throw new Error('--count must be between 1 and 100');
const repo=await findRepoRoot(),destination=path.resolve(options.output); await fs.mkdir(destination,{recursive:true});
const runId=new Date().toISOString().replace(/[:.]/g,'-'); const samples:unknown[]=[];
for(let i=0;i<count;i++) {
  const name=`sample-${runId}-${String(i+1).padStart(2,'0')}`; const root=await createProject(name,{root:destination,example:true});
  const projectFile=path.join(root,'project.yaml'); const variant=['historical-cinematic','technical-clean','industrial-documentary','watercolor-story','dark-tech','educational-flat'][i%6]!;
  let projectConfig=YAML.parse(await fs.readFile(projectFile,'utf8')) as Record<string,unknown>;
  projectConfig=deepMerge(projectConfig,{style:{preset:variant}});
  if(options.config) projectConfig=deepMerge(projectConfig,YAML.parse(await fs.readFile(options.config,'utf8')) as Record<string,unknown>);
  await fs.writeFile(projectFile,YAML.stringify(projectConfig));
  // Variant is a deterministic input change, so compare identical sample numbers across models.
  await fs.appendFile(path.join(root,'input/source.md'),`\n# BENCHMARK VISUAL REQUIREMENT\nStyle ${variant}. Emphasize ${['map','timeline','character-scene','document-highlight','technical-diagram','process-diagram'][i%6]}.\n`);
  const started=Date.now(); let error:string|undefined;
  try {
    if(options.generated) {
      await runPipeline(root,{until:'STORYBOARDED'});
      const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
      for(const shot of board.shots) shot.recipeId='benchmark-generated';
      await invalidateProject(root,'STORYBOARDED');await writeJson(path.join(root,'work/storyboard.json'),board);
    }
    await runPipeline(root,{until:options.render?'DONE':options.full?'REPAIRED':'STORYBOARDED'});
  }
  catch(e) { error=e instanceof Error?e.message:String(e); }
  const [config,narration,board,characters,review,costs,calls]=await Promise.all([
    loadConfig(root),exists(path.join(root,'work/narration.json')).then(found=>found?readJson(path.join(root,'work/narration.json'),NarrationSchema):undefined),
    exists(path.join(root,'work/storyboard.json')).then(found=>found?readJson(path.join(root,'work/storyboard.json'),StoryboardSchema):undefined),
    exists(path.join(root,'work/character-bible.json')).then(found=>found?readJson(path.join(root,'work/character-bible.json'),CharacterBibleSchema):undefined),
    exists(path.join(root,'work/review.json')).then(found=>found?readJson(path.join(root,'work/review.json'),ReviewSchema):undefined),
    exists(path.join(root,'work/cost-report.json')).then(found=>found?readJson(path.join(root,'work/cost-report.json')):undefined),
    exists(path.join(root,'logs/model-calls.jsonl')).then(async found=>found?(await fs.readFile(path.join(root,'logs/model-calls.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line) as Record<string,unknown>):[])
  ]);
  const roles:Record<string,unknown>={}; for(const role of ['planner','storyboard','coder','repair','visual_review']) { const records=calls.filter(c=>c.role===role && c.event!=='started'); roles[role]={attempts:records.length,accepted:records.filter(c=>c.status==='success').length,rejected:records.filter(c=>c.status==='error').length,latencyMs:records.reduce((total,c)=>total+Number(c.durationMs ?? 0),0)}; }
  const productionState=await loadState(root);
  error ??= productionState.error;
  samples.push({sample:i+1,variant,project:root,models:config.models,elapsedMs:Date.now()-started,error,roles,narrationDurationMs:narration?.durationMs,shots:board?.shots.length,characters:characters?.characters.length,sceneCompile:options.full||options.render ? stateIndex(productionState.state)>=stateIndex('SCENES_READY'):null,review:review ?? null,costs});
  await writeJson(path.join(destination,`${runId}-samples.json`),samples);
  console.log(`${i+1}/${count}: ${error?'failed':'completed'} (${Date.now()-started} ms)`);
}
await writeJson(path.join(destination,`${runId}-scorecard.json`),{runId,count,tasks:['chapter split','beat split','storyboard','scene code','repair','visual review'],rendered:Boolean(options.render),samples,notes:['Null measurements are not executed, never counted as passes.','Recipe hits may require no model code call.','Use the same count and visual variants for provider comparisons.','Failure injection and independent correctness evaluation are assigned to the test model.']});
