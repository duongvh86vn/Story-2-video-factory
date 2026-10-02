import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import { cameraMatrixAt, CAMERA_VIEWPORT } from '../packages/director/camera.js';
import { renderCinematic } from '../library/shots/cinematic.js';

const cases=[
  {name:'wide',ms:4000,text:'Ta so sánh xe điện với xe xăng.'},
  {name:'medium',ms:4000,text:'Hơi nước đẩy pít-tông trong xi-lanh.'},
  {name:'face',ms:1600,text:'Bất ngờ, người dẫn nhận ra hơi nước.'},
  {name:'contact',ms:1600,text:'Pít-tông chuyển động.'},
] as const;
const activity={method:'segment-draft' as const,windowMs:20,intervals:[]};
const cssLength=(value:string|undefined,axis:number,fallback:number)=>value===undefined?fallback:value.endsWith('%')?parseFloat(value)*axis/100:parseFloat(value);
for(const kind of ['stick-man','mini-robot'] as const)for(const sample of cases)test(`${kind}: environment covers the visible camera throughout ${sample.name} framing`,async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`},rendering:{final:{width:1280,height:720,fps:30}}});
  const {profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  const narration:Narration={mode:'srt',durationMs:sample.ms,segments:[{id:'cue',startMs:0,endMs:sample.ms,text:sample.text}],words:[]};
  const story=StorySchema.parse({title:'Camera edge',story:sample.text,style:{visual:'vector'}}),base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:sample.ms,segmentIds:['cue'],narrationText:sample.text,meaning:'explain',visualGoal:'preserve background',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!},shot=directCinematicShot(explainerShot('s1',0,sample.ms,beat,narration,profile,rig),beat,profile,config);
  const files=renderCinematic(shot,profile,rig,activity,config,'assets/environment.png').files.files;
  const css=files.find(file=>file.path==='style.css')!.content,styles:Record<string,string>={};
  for(const match of css.matchAll(/\.environment\s*\{([^}]+)\}/g))for(const declaration of match[1]!.split(';')){const [key,value]=declaration.split(':');if(key&&value)styles[key.trim()]=value.trim();}
  const {width,height}=shot.cinematic!.performance.stage,left=cssLength(styles.left,width,0),top=cssLength(styles.top,height,0),right=left+cssLength(styles.width,width,width),bottom=top+cssLength(styles.height,height,height);
  for(let ms=0;ms<=sample.ms;ms+=sample.ms/20){
    const matrix=cameraMatrixAt(shot.cinematic!.camera,{width,height},sample.ms,ms);
    assert.ok(left*matrix.scale+matrix.x<=.01&&right*matrix.scale+matrix.x>=width-.01,`background leaves a horizontal gap at ${ms}ms`);
    assert.ok(top*matrix.scale+matrix.y<=height*CAMERA_VIEWPORT.top+.01&&bottom*matrix.scale+matrix.y>=height*CAMERA_VIEWPORT.bottom-.01,`background leaves a vertical gap at ${ms}ms`);
  }
});
