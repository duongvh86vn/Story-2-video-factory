import { ConfigSchema } from '../packages/core/config.js';
import { BeatSchema, StorySchema, type Narration } from '../packages/core/schemas.js';
import { compileHost } from '../packages/host/index.js';
import { ModelRouter } from '../packages/models/registry.js';
import { groundedExplanation } from '../packages/explainer/plan.js';
import { explainerShot } from '../packages/explainer/storyboard.js';
import { directCinematicShot } from '../packages/director/index.js';
import type { ArtDirection } from '../packages/director/art-direction.js';

export async function creativeFixture(root:string){
  const config=ConfigSchema.parse({presentation:{mode:'story-cinematic'},host:{profile:'library/characters/STICK-MAN.md'},rendering:{final:{width:1280,height:720,fps:30}}});
  const router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
  const text='Hơi nước đẩy pít-tông trong xi-lanh.';
  const narration:Narration={mode:'srt',durationMs:5000,words:[],segments:[{id:'cue',startMs:0,endMs:5000,text}]};
  const story=StorySchema.parse({title:'Cơ chế hơi nước',story:text,style:{visual:'vector'}});
  const base=BeatSchema.parse({id:'b1',chapterId:'ch1',startMs:0,endMs:5000,segmentIds:['cue'],narrationText:text,meaning:'cause',visualGoal:'mechanism',importance:1});
  const beat={...base,...groundedExplanation(story,narration,[base],profile).beats[0]!};
  const shot=directCinematicShot(explainerShot('ch1.s001',0,5000,beat,narration,profile,rig),beat,profile,config);
  const artDirection:ArtDirection={origin:'authored',brief:'An expansive blue engineering theatre, with soft light and a floating mechanism.',useEnvironment:false,
    palette:{background:'#142D40',surface:'#EAF3F5',ink:'#142D40',accent:'#F7BE52'},showHeading:false,
    layers:[{id:'light',plane:'background',role:'decoration',svg:'<defs><radialGradient id="glow"><stop offset="0" stop-color="#579BBA"/><stop offset="1" stop-color="#142D40"/></radialGradient></defs><rect width="1280" height="720" fill="url(#glow)"/>',keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1},{atMs:5000,x:20,y:0,scale:1,rotation:0,opacity:.8}]}],
    models:[{partId:shot.visualization!.parts[0]!.id,svg:'<rect x="-45" y="-30" width="90" height="60" rx="12" fill="#F7BE52"/><path class="motion" d="M-25 0H25" stroke="#142D40"/>',sourceRefs:shot.visualization!.parts[0]!.sourceRefs}]};
  return {config,router,profile,rig,narration,story,beat,shot,artDirection,
    chapters:[{id:'ch1',startMs:0,endMs:5000,title:'Cơ chế',summary:text,narrativePurpose:'explain',segmentIds:['cue']}],
    characters:{characters:[]}};
}
