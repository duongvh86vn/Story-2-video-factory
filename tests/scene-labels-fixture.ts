import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {TestContext} from 'node:test';
import YAML from 'yaml';
import {creativeFixture} from './creative-fixture.js';
import {directCinematicShot} from '../packages/director/index.js';
import {explainerShot,writeHostTimeline} from '../packages/explainer/storyboard.js';
import {writeCinematicPlans} from '../packages/director/index.js';
import {hash,writeJson} from '../packages/core/utils.js';
import type {AssetManifest,SceneFiles} from '../packages/core/schemas.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {renderExplainer} from '../library/shots/explainer.js';
import {getStyle} from '../library/styles/index.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
export const activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
export async function labelFixture(t:TestContext,options:{control?:boolean;diagram?:boolean}={}){
 const parent=process.env.SCENE_LABELS_EVIDENCE;if(!parent)throw new Error('Explicit isolated evidence root required');
 await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'labels-'));
 const f=await creativeFixture(root);f.config.retry.scene_repair=0;f.config.retry.render=0;f.config.retry.structured_output=0;
 if(options.control){const part=f.shot.visualization!.parts[0]!;f.shot.host!.actions=[{type:'operate-model',startMs:0,endMs:5000,contactMs:1800,narrationAnchor:'cue',target:{modelId:f.shot.visualization!.modelId,partId:part.id,anchor:'handle'}}];f.shot=directCinematicShot(f.shot,f.beat,f.profile,f.config);}
 if(options.diagram){f.config.presentation.mode='diagram';f.shot=explainerShot(f.shot.id,0,5000,f.beat,f.narration,f.profile,f.rig);}
 else {f.shot.cinematic!.artDirection={...structuredClone(f.artDirection),showHeading:true,layers:[],models:f.shot.visualization!.parts.map(part=>({partId:part.id,sourceRefs:part.sourceRefs,svg:'<g class="motion"><rect x="-45" y="-30" width="90" height="60" rx="10" fill="#EAF3F5"/></g>',labelMode:'renderer',controlMode:options.control?'renderer':'none'}))};}
 const need=f.shot.assetNeeds.find(n=>n.localPath===f.rig.assetPath);assert.ok(need);
 const assets:AssetManifest={assets:[{id:need.id,type:'image',path:f.rig.assetPath,source:'code',status:'approved',hash:hash(await fs.readFile(path.join(root,f.rig.assetPath))),shotIds:[f.shot.id]}]};
 await fs.mkdir(path.join(root,'input'),{recursive:true});await fs.writeFile(path.join(root,f.config.input.source),f.narration.segments[0]!.text);
 for(const [name,value] of Object.entries({'narration.json':f.narration,'beats.json':[f.beat],'storyboard.json':{shots:[f.shot]},'speech-activity.json':activity,'asset-manifest.json':assets}))await writeJson(path.join(root,'work',name),value);
 await fs.writeFile(path.join(root,'project.yaml'),YAML.stringify(f.config));
 await writeJson(path.join(root,'project-state.json'),{version:1,name:path.basename(root),state:'NEW',updatedAt:new Date().toISOString(),inputHash:'',locked:{}});
 if(f.shot.cinematic)await writeCinematicPlans(root,{shots:[f.shot]});
 await writeHostTimeline(root,{shots:[f.shot]},f.narration,f.profile,f.rig,'audio-activity');
 t.diagnostic('AUTHORED label fixture '+root);
 return {...f,root,assets,characters:{characters:[]},board:{shots:[f.shot]}};
}
export type LabelFixture=Awaited<ReturnType<typeof labelFixture>>;
export function renderLabel(f:LabelFixture):SceneFiles{
 const before=structuredClone({shot:f.shot,narration:f.narration,profile:f.profile,rig:f.rig});
 const result=f.shot.cinematic?renderCinematic(f.shot,f.profile,f.rig,activity,f.config,undefined,f.narration):renderExplainer(f.shot,f.profile,f.rig,activity,getStyle(f.config),1280,720,false,f.config.project.language);
 const files=secureSceneFiles(result.files);assert.deepEqual(validateSceneFiles(files,f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
 assert.deepEqual({shot:f.shot,narration:f.narration,profile:f.profile,rig:f.rig},before);return files;
}
