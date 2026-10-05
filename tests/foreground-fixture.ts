import assert from 'node:assert/strict';
import {promises as fs,writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {TestContext} from 'node:test';
import {ConfigSchema} from '../packages/core/config.js';
import {BeatSchema,StorySchema,NarrationSchema,StoryboardSchema,type AssetManifest} from '../packages/core/schemas.js';
import {compileHost} from '../packages/host/index.js';
import {ModelRouter} from '../packages/models/registry.js';
import {groundedExplanation} from '../packages/explainer/plan.js';
import {explainerShot,validateExplainerStoryboard,writeHostTimeline} from '../packages/explainer/storyboard.js';
import {directCinematicShot,writeCinematicPlans} from '../packages/director/index.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
export const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
export async function foregroundFixture(t:TestContext,kind:'stick-man'|'mini-robot'='stick-man',pickup=false){
  const base=process.env.FOREGROUND_CAST_EVIDENCE??os.tmpdir();await fs.mkdir(base,{recursive:true});
  const root=await fs.mkdtemp(path.join(base,'authored-'));
  if(!process.env.FOREGROUND_CAST_EVIDENCE)t.after(()=>fs.rm(root,{recursive:true,force:true}));else t.diagnostic('AUTHORED isolated fixture '+root);
  const config=ConfigSchema.parse({input:{mode:'srt'},presentation:{mode:'story-cinematic',character_mode:pickup?'presenter':'actors'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},retry:{structured_output:0,scene_repair:0,render:0},rendering:{final:{width:1280,height:720,fps:30}}});
  const router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
  const text=pickup?'Ta nhấc pin lên rồi đặt pin sang bên phải.':'Lena and Amir wait beside the table.',durationMs=pickup?8000:6000;
  const narration=NarrationSchema.parse({mode:'srt',durationMs,words:[],segments:[{id:'cue',startMs:0,endMs:durationMs,text}]});
  const story=StorySchema.parse({title:pickup?'AUTHORED prop clock':'AUTHORED ordinary library cast',genre:'fiction',story:text,style:{visual:'vector'},characters:pickup?[]:['Lena','Amir'].map((name,i)=>({id:'person'+i,name,description:text}))});
  const raw=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:durationMs,segmentIds:['cue'],narrationText:text,meaning:text,visualGoal:text,importance:1});
  const semantic=groundedExplanation(story,narration,[raw],profile,!pickup).beats[0]!;
  if(!pickup){semantic.entities=[{id:'table',label:'table',kind:'stage',sourceRefs:[{kind:'narration',segmentId:'cue',quote:text}]}];semantic.relations=[];semantic.visualMethod='summary';semantic.sceneIntent!.acting=semantic.sceneIntent!.participants.map(p=>({participantId:p.id,kind:'hold',statement:p.role,sourceRefs:p.sourceRefs}));}
  const beat={...raw,...semantic},shot=directCinematicShot(explainerShot('scene',0,durationMs,beat,narration,profile,rig),beat,profile,config,undefined,{seed:!pickup});
  shot.cinematic!.artDirection={origin:'authored',brief:'AUTHORED passive library/prop fixture, not native film',useEnvironment:false,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#112233',accent:'#AABBCC'},showHeading:false,layers:[],models:[]};
  if(!pickup){
    for(const p of [shot.cinematic!.performance,...shot.cinematic!.actorScene!.supporting.map(a=>a.performance)]){p.walks=[];p.turns=[];p.gestures=[];p.expressions=[];p.gazes=[];p.postures=[];}
    shot.host!.actions=[{type:'idle',startMs:0,endMs:durationMs}];for(const a of shot.cinematic!.actorScene!.supporting)a.actions=[{type:'idle',startMs:0,endMs:durationMs}];shot.visualization!.events=[];
  }
  const board=StoryboardSchema.parse({shots:[shot]});validateExplainerStoryboard(board,narration,[beat],profile,rig,config);
  const accepted=board.shots[0]!;
  const need=accepted.assetNeeds.find(n=>n.localPath===rig.assetPath);
  const manifest:AssetManifest={assets:need?[{id:need.id,type:'image',path:rig.assetPath,hash:hash(await fs.readFile(path.join(root,rig.assetPath))),source:'code',status:'approved',shotIds:[accepted.id]}]:[]};
  await fs.mkdir(path.join(root,'input'),{recursive:true});
  for(const [name,value] of Object.entries({'narration.json':narration,'beats.json':[beat],'storyboard.json':board,'speech-activity.json':silence,'voice-report.json':{version:2,status:'ready',source:'input',provider:null,voiceId:null,narrationHash:hash(narration),textPreserved:true,timingPreserved:true,inputAudioPreserved:true,synchronization:'audio-activity',cues:[],warnings:[]},'asset-manifest.json':manifest}))await writeJson(path.join(root,'work',name),value);
  await writeCinematicPlans(root,board);await writeHostTimeline(root,board,narration,profile,rig,'audio-activity');
  return {root,config,router,profile,rig,story,narration,beat,shot:accepted,board,manifest,characters:{characters:[]}};
}
export type ForegroundFixture=Awaited<ReturnType<typeof foregroundFixture>>;
export function renderAuthored(f:ForegroundFixture){
  const original=structuredClone(f.shot),result=renderCinematic(f.shot,f.profile,f.rig,silence,f.config,undefined,f.narration);
  const secured=secureSceneFiles(result.files);const errors=validateSceneFiles(secured,f.shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final);if(process.env.FOREGROUND_CAST_EVIDENCE)writeFileSync(path.join(f.root,'render-'+hash(result.files).slice(0,16)+'.json'),JSON.stringify({label:'AUTHORED generated source; security errors retained, no execution if invalid',shot:f.shot,files:secured,geometry:result.geometry,errors},null,2));assert.deepEqual(errors,[]);
  assert.deepEqual(f.shot,original,'renderer must not mutate source, actors, contact/clock or geometry');return {...result,secured};
}