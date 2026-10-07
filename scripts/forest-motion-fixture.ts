/** Prepared for the delegated test model. Offline fixture export by default;
 * --render explicitly runs the actual HyperFrames validator/exporter. Never
 * generates story narration or bypasses the topic production guard. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
import {ConfigSchema,findRepoRoot} from '../packages/core/config.js';
import {hash,writeAtomic,writeJson,safeRealPath} from '../packages/core/utils.js';
import {outputPath} from '../packages/render/process.js';
import {BODY_ACTIONS,bodyCalibrationPlan,type BodyAction} from '../packages/topics/body-workbench.js';
import {Moods,type Mood} from '../packages/animation/schemas.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {performanceScene} from '../packages/animation/scene.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';

const {values}=parseArgs({options:{actor:{type:'string',default:'karo'},action:{type:'string',default:'walk'},mood:{type:'string',default:'happy'},render:{type:'boolean',default:false}}});
if(values.actor!=='lila'&&values.actor!=='karo')throw new Error('actor must be lila or karo');
if(!(BODY_ACTIONS as readonly string[]).includes(values.action!))throw new Error('Unknown body action');
if(!(Moods as readonly string[]).includes(values.mood!))throw new Error('Unknown mood');
const actor=values.actor,action=values.action as BodyAction,mood=values.mood as Mood;
const repo=await findRepoRoot(),root=path.join(repo,'runtime/prehistoric-life/motion-fixtures',actor,action,mood),dir=path.join(root,'scene');
const {plan,profile}=bodyCalibrationPlan(actor,action,mood),activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
const scene=performanceScene(plan,profile,activity),files=secureSceneFiles(scene.files);
const resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)];
const errors=validateSceneFiles(files,{id:plan.id,startMs:0,endMs:plan.durationMs} as Parameters<typeof validateSceneFiles>[1],2000000,resources.map(a=>a.path),plan.stage);
if(errors.length)throw new Error(errors.join('\n'));
await fs.mkdir(dir,{recursive:true});
for(const asset of resources){
  const bytes=await fs.readFile(await safeRealPath(repo,asset.file));
  if(hash(bytes)!==asset.sha256)throw new Error('Reference resource hash changed: '+asset.file);
  await writeAtomic(await outputPath(dir,asset.path),bytes);
}
for(const file of files.files)await writeAtomic(await outputPath(dir,file.path),file.content);
const require=createRequire(import.meta.url);await writeAtomic(await outputPath(dir,'vendor/gsap.min.js'),await fs.readFile(require.resolve('gsap/dist/gsap.min.js')));
await writeJson(path.join(root,'performance-plan.json'),plan);
await writeJson(path.join(root,'performance-report.json'),{...scene.compiled.report,sceneBytes:files.files.reduce((sum,f)=>sum+Buffer.byteLength(f.content),0),
  scope:'isolated-motion-fixture',resources,productionAcceptance:false,runtimeValidated:false});
if(values.render){
  const config=ConfigSchema.parse({rendering:{draft:{width:430,height:440,fps:60,quality:'looks'},final:{width:430,height:440,fps:60,quality:'delivery'}},workflow:{max_scene_bytes:2000000}});
  const engine=new HyperFramesEngine(config,root),validation=await engine.validate(dir);
  await writeJson(path.join(root,'runtime-validation.json'),validation);
  if(!validation.pass)throw new Error(validation.errors.join('\n'));
  await engine.renderFinal(dir);
}
console.log(JSON.stringify({root,scene:path.join(dir,'index.html'),renderRequested:values.render,video:values.render?path.join(root,'work/rendered.mp4'):null,
  note:'Isolated silent motion fixture. Does not prove narrative/voice, artistic fidelity or production acceptance.'}));
