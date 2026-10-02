/** An authored design example through production, not a universal scene preset. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { createProject, runPipeline, loadState } from '../packages/orchestrator/index.js';
import { loadConfig } from '../packages/core/config.js';
import { readJson, writeJson, escapeHtml } from '../packages/core/utils.js';
import { BeatSchema, NarrationSchema, StoryboardSchema } from '../packages/core/schemas.js';
import { loadHost } from '../packages/host/index.js';
import { creativeInputIdentity } from '../packages/director/creative.js';
import { ArtDirectionSchema } from '../packages/director/art-direction-schemas.js';

const args=process.argv.slice(2),hostIndex=args.indexOf('--host'),kind=hostIndex<0?'stick-man':args[hostIndex+1];
if(!['stick-man','mini-robot'].includes(kind??''))throw new Error('Choose --host stick-man or mini-robot');
const existingIndex=args.indexOf('--project'),root=existingIndex<0?await createProject(`art-${kind}-${Date.now()}`,{root:path.resolve('temp/art-direction-v22')}):path.resolve(args[existingIndex+1]??'');
if(existingIndex>=0&&!root.startsWith(path.resolve('temp/art-direction-v22')+path.sep))throw new Error('This design example resumes only its own controlled temp projects');
const text='Mỗi lần hơi nước đi vào xi-lanh, lực đẩy làm pít-tông dịch chuyển. Khi pít-tông đi từ vị trí này sang vị trí khác, nó tạo ra chuyển động qua lại. Chuyển động từ pít-tông được truyền đến bánh xe. Bánh xe quay, đưa chuyển động ấy tới các bộ phận của máy. Nhìn vào mô hình, ta có thể theo dõi đường truyền từ hơi nước, qua pít-tông, rồi đến bánh xe. Hóa ra, hơi nước không chỉ là một đám hơi nóng: nó có thể đẩy pít-tông và tạo ra chuyển động.';
await fs.writeFile(path.join(root,'input/script.txt'),text);
const file=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(file,'utf8'));
raw.input={mode:'script'};raw.presentation={mode:'story-cinematic'};raw.host={profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`};
raw.rendering={draft:{width:1280,height:720,fps:30,quality:'looks'},final:{width:1280,height:720,fps:30,quality:'delivery'}};
await fs.writeFile(file,YAML.stringify(raw));
console.log(JSON.stringify({root,scope:'Authored visual pilot; not full release acceptance.'}));
let state=existingIndex<0?await runPipeline(root,{until:'STORYBOARDED',onProgress:s=>console.log(s.state)}):await loadState(root);
if(existingIndex<0&&(state.error||state.waitingFor))throw new Error(state.error??state.waitingFor);
const [narration,beats,board,host]=await Promise.all([
  readJson(path.join(root,'work/narration.json'),NarrationSchema),readJson(path.join(root,'work/beats.json'),z.array(BeatSchema)),
  readJson(path.join(root,'work/storyboard.json'),StoryboardSchema),loadHost(root)]);
const config=await loadConfig(root),{width,height}=config.rendering.final;
const glyph=(kind:string)=>{
  const stroke='stroke="#264657" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  if(kind==='wheel'||kind==='gear')return `<circle r="38" fill="#DCEBF0" ${stroke}/><circle r="31" fill="#FAFCFC" ${stroke}/><g class="motion" ${stroke}>${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return `<path d="M${Math.cos(a)*8} ${Math.sin(a)*8}L${Math.cos(a)*31} ${Math.sin(a)*31}"/>`;}).join('')}</g><circle r="7" fill="#5A98AF" ${stroke}/>`;
  if(kind==='piston')return `<defs><linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBFEFF"/><stop offset=".5" stop-color="#ABC7D3"/><stop offset="1" stop-color="#6C91A2"/></linearGradient></defs><g class="motion" ${stroke}><rect x="-33" y="-28" width="22" height="56" rx="5" fill="url(#steel)"/><path d="M-26 -24V24M-19 -24V24" opacity=".45"/><rect x="-11" y="-5" width="53" height="10" rx="4" fill="url(#steel)"/><circle cx="43" cy="0" r="7" fill="#EFF6F8"/></g>`;
  if(kind==='cylinder')return `<defs><linearGradient id="glass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E9F7FA"/><stop offset="1" stop-color="#A5D0DB"/></linearGradient></defs><path d="M-42 -29H42V29H-42Z" fill="url(#glass)" ${stroke}/><path d="M-34 -20H34M-34 20H34" stroke="#FFF" stroke-width="4"/><path d="M-42 -29V29M42 -29V29" stroke="#264657" stroke-width="6"/><path d="M-30 -29V-43H-15" fill="none" ${stroke}/>`;
  if(kind==='flow')return `<g class="motion" fill="none" stroke="#4F96AD" stroke-width="4" stroke-linecap="round"><path d="M-22 25C-36 2 -7 -1 -21 -26M0 27C-14 4 15 0 1 -28M22 25C8 2 37 -1 23 -26"/></g>`;
  return undefined;
};
for(const shot of board.shots){
  const duration=shot.endMs-shot.startMs;
  // Narrated mechanisms can move on their own; this is not a claimed host-contact interaction.
  for(const cue of narration.segments.filter(cue=>cue.startMs<shot.endMs&&cue.endMs>shot.startMs)){
    const refs=shot.sourceRefs!.filter(ref=>ref.segmentId===cue.id);
    const sourceText=cue.text.toLocaleLowerCase('vi');
    for(const part of shot.visualization!.parts.filter(part=>part.sourceRefs.some(ref=>ref.segmentId===cue.id))){
      const motion=part.kind==='piston'&&/đẩy|chuyển động/.test(sourceText)?'translate':part.kind==='wheel'&&/chuyển động/.test(sourceText)?'rotate':undefined;
      if(motion&&!shot.host!.actions.some(action=>action.type==='operate-model'&&action.target?.partId===part.id)&&!shot.visualization!.events.some(event=>event.targetId===part.id&&event.narrationAnchor===cue.id&&event.motion===motion))shot.visualization!.events.push({type:'part-motion',targetId:part.id,narrationAnchor:cue.id,startMs:Math.max(shot.startMs,cue.startMs),endMs:Math.min(shot.endMs,cue.endMs),contactRequired:false,motion,sourceRefs:refs});
    }
    for(const relation of shot.visualization!.relations.filter(relation=>relation.kind==='transfer'&&relation.sourceRefs.some(ref=>ref.segmentId===cue.id))){
      if(!shot.visualization!.events.some(event=>event.type==='flow'&&event.targetId===relation.from&&event.relationTo===relation.to&&event.narrationAnchor===cue.id))shot.visualization!.events.push({type:'flow',targetId:relation.from,relationTo:relation.to,narrationAnchor:cue.id,startMs:Math.max(shot.startMs,cue.startMs),endMs:Math.min(shot.endMs,cue.endMs),contactRequired:false,motion:'none',sourceRefs:relation.sourceRefs});
    }
  }
  const frames=(opacity=1)=>[{atMs:0,x:shot.startMs/narration.durationMs*24,y:0,scale:1,rotation:0,opacity},{atMs:duration,x:shot.endMs/narration.durationMs*24,y:0,scale:1,rotation:0,opacity}];
  const grid=Array.from({length:26},(_,i)=>`<path d="M${i*52} 0V720" stroke="#BFD3DC" stroke-width="1" opacity=".15"/>`).join('')+Array.from({length:15},(_,i)=>`<path d="M0 ${i*52}H1280" stroke="#BFD3DC" stroke-width="1" opacity=".15"/>`).join('');
  shot.cinematic!.artDirection=ArtDirectionSchema.parse({origin:'authored',brief:'An airy illustrated engineering theatre: cool paper, a soft pool of light, metallic cutaway components and a curious protagonist. Use the narrator’s grounded gesture and reaction clock; floating linework suggests depth without competing with the explanation.',
    useEnvironment:false,showHeading:false,palette:{background:'#EAF2F4',surface:'#FAFCFC',ink:'#264657',accent:'#6CADBD'},
    layers:[
      {id:'paper',plane:'background',role:'decoration',svg:`<defs><radialGradient id="light"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F1F6F7"/><stop offset="1" stop-color="#D8E7EC"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#light)"/>${grid}`,keyframes:frames()},
      {id:'depth',plane:'midground',role:'decoration',svg:`<path d="M0 549Q640 490 1280 552V720H0Z" fill="#D7E5E9" opacity=".45"/><ellipse cx="830" cy="493" rx="290" ry="23" fill="#A3C2CD" opacity=".12"/>`,keyframes:frames()},
      {id:'frame',plane:'foreground',role:'decoration',svg:'<path d="M1130 560Q1200 529 1280 552V720H1130Z" fill="#90B2C0" opacity=".14"/>',keyframes:frames()},
      {id:'identity',plane:'overlay',role:'decoration',svg:`<path d="M54 44H88" stroke="#4A859A" stroke-width="4"/><text x="101" y="49" fill="#264657" font-family="Arial" font-size="15" letter-spacing="3">MÔ HÌNH MINH HỌA</text><text x="52" y="92" fill="#264657" font-family="Arial" font-size="34" font-weight="700">${escapeHtml('Hơi nước')}</text><path d="M52 113H1200" stroke="#AAC7D1" stroke-width="1"/> `,keyframes:[{atMs:0,x:0,y:0,scale:1,rotation:0,opacity:1}]},
    ],models:shot.visualization!.parts.flatMap(part=>{const svg=glyph(part.kind);return svg?[{partId:part.id,svg,sourceRefs:part.sourceRefs}]:[]})});
}
await writeJson(path.join(root,'input/art-direction.json'),{identity:creativeInputIdentity(narration,beats,host.profile,host.rig),storyboard:board});
state=await runPipeline(root,{until:args.includes('--scenes-only')?'SCENES_READY':'DONE',onProgress:s=>console.log(s.state)});
console.log(JSON.stringify({root,state:state.state,error:state.error,waitingFor:state.waitingFor,video:path.join(root,'output/final.mp4')}));
if(state.error||state.waitingFor)process.exitCode=1;
