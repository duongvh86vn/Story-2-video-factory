/** Opt-in Vietnamese narration tracer through the actual project pipeline. */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { createProject, runPipeline } from '../packages/orchestrator/index.js';
import { probe } from '../packages/audio/ffmpeg.js';
import { loadConfig } from '../packages/core/config.js';
import { readJson } from '../packages/core/utils.js';

const args=process.argv.slice(2),hostIndex=args.indexOf('--host'),kind=hostIndex>=0?args[hostIndex+1]:'stick-man';
if(kind!=='stick-man'&&kind!=='mini-robot')throw new Error('--host must be stick-man or mini-robot');
const scriptIndex=args.indexOf('--script');
const text=scriptIndex>=0?await fs.readFile(path.resolve(args[scriptIndex+1]??''),'utf8')
  :'Hơi nước đẩy pít-tông trong xi-lanh. Pít-tông truyền chuyển động đến bánh xe.';
const root=await createProject(`cinematic-${kind}-${Date.now()}`,{root:path.resolve('temp/cinematic-v22')});
await fs.writeFile(path.join(root,'input/script.txt'),text,'utf8');
const configPath=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(configPath,'utf8')) as Record<string,unknown>;
raw.input={mode:'script'};raw.presentation={mode:'story-cinematic'};
raw.host={profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`};
raw.rendering={draft:{width:960,height:540,fps:30,quality:'looks'},final:{width:1280,height:720,fps:30,quality:'delivery'}};
await fs.writeFile(configPath,YAML.stringify(raw));
console.log(JSON.stringify({root,kind,scope:'Cinematic narration tracer, not full release acceptance.'}));
const state=await runPipeline(root,{onProgress:state=>console.log(state.state)});
assert.equal(state.state,'DONE',state.error??`waiting: ${state.waitingFor}`);
const qc=await readJson<{pass:boolean;issues:unknown[]}>(path.join(root,'output/qc-report.json'));
assert.equal(qc.pass,true,JSON.stringify(qc.issues));
const metadata=await probe(root,await loadConfig(root),path.join(root,'output/final.mp4'));
console.log(JSON.stringify({root,state:state.state,qc,video:metadata.streams.map(s=>({codec:s.codec_name,width:s.width,height:s.height,fps:s.r_frame_rate,duration:s.duration})),final:path.join(root,'output/final.mp4')},null,2));
