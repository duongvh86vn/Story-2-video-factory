/** Real creative-role production example. Requires configured Vietnamese TTS and authenticated native CLI. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { createProject, runPipeline } from '../packages/orchestrator/index.js';

const args=process.argv.slice(2);
const option=(name:string,fallback?:string)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const kind=option('--host','stick-man'),story=option('--story','steam'),command=option('--command'),provider=option('--provider','codex-cli');
if(!['stick-man','mini-robot'].includes(kind??''))throw new Error('Choose --host stick-man or mini-robot');
if(!['steam','car'].includes(story??''))throw new Error('Choose --story steam or car');
if(!['codex-cli','claude-cli'].includes(provider??''))throw new Error('Choose --provider codex-cli|claude-cli; --command may override native executable discovery');
const script=option('--script');
const text=script?await fs.readFile(path.resolve(script),'utf8'):story==='steam'
  ?'Mỗi lần hơi nước đi vào xi-lanh, lực đẩy làm pít-tông dịch chuyển. Khi pít-tông đi từ vị trí này sang vị trí khác, nó tạo ra chuyển động qua lại. Chuyển động từ pít-tông được truyền đến bánh xe. Bánh xe quay, đưa chuyển động ấy tới các bộ phận của máy. Nhìn vào mô hình, ta có thể theo dõi đường truyền từ hơi nước, qua pít-tông, rồi đến bánh xe. Hóa ra, hơi nước không chỉ là một đám hơi nóng: nó có thể đẩy pít-tông và tạo ra chuyển động.'
  :'Những chiếc ô tô đầu tiên dùng động cơ để làm bánh xe chuyển động. Động cơ xăng đốt nhiên liệu, tạo lực đẩy pít-tông. Chuyển động được truyền đến bánh xe, giúp ô tô tiến về phía trước. Với ô tô điện, pin cung cấp năng lượng cho động cơ điện. Động cơ điện làm bánh xe quay. Cùng đưa chúng ta đi lại, nhưng hai loại ô tô dùng những nguồn năng lượng khác nhau.';
const root=await createProject(`model-${story}-${kind}-${Date.now()}`,{root:path.resolve('temp/art-direction-v22')});
const file=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(file,'utf8'));
raw.input={mode:'script'};raw.presentation={mode:'story-cinematic'};raw.host={profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`};
raw.rendering={draft:{width:1280,height:720,fps:30,quality:'looks'},final:{width:1280,height:720,fps:30,quality:'delivery'}};
raw.models={storyboard:{provider,model:option('--model',provider==='codex-cli'?'default':'opus'),...(command?{command:path.resolve(command)}:{}),timeout_ms:900000}};
await fs.writeFile(file,YAML.stringify(raw));await fs.writeFile(path.join(root,'input/script.txt'),text);
console.log(JSON.stringify({root,scope:'Real creative-role example. Technical QC does not prove visual or full product acceptance.'}));
const state=await runPipeline(root,{until:args.includes('--storyboard-only')?'STORYBOARDED':args.includes('--scenes-only')?'SCENES_READY':'DONE',onProgress:s=>console.log(JSON.stringify({state:s.state,error:s.error,waitingFor:s.waitingFor}))});
console.log(JSON.stringify({root,state:state.state,error:state.error,waitingFor:state.waitingFor,video:path.join(root,'output/final.mp4')}));
if(state.error||state.waitingFor)process.exitCode=1;
