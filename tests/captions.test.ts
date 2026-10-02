import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { temporary, shot } from './support.js';
import { ConfigSchema } from '../packages/core/config.js';
import { buildMaster } from '../packages/scenes/index.js';

test('720p subtitles accept a full Vietnamese cue that fits and reject real overflow without cutting words', async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({rendering:{final:{width:1280,height:720,fps:30}}});
  const sb={shots:[shot()]};await fs.mkdir(path.join(root,'scenes/shot001'),{recursive:true});await fs.writeFile(path.join(root,'scenes/shot001/index.html'),'fixture');
  const text='Trong thiết kế cũ, xi-lanh phải nóng để tiết kiệm nhiên liệu, nhưng lại cần được làm nguội trong mỗi chu kỳ.';
  const narration={mode:'srt' as const,durationMs:4000,segments:[{id:'cue',startMs:0,endMs:4000,text}],words:[]};
  await buildMaster(root,config,sb,narration,{assets:[]});
  assert.ok((await fs.readFile(path.join(root,'scenes/index.html'),'utf8')).includes(text));
  await assert.rejects(buildMaster(root,config,sb,{...narration,segments:[{...narration.segments[0]!,text:Array(200).fill('nguyên văn').join(' ')}]},{assets:[]}),/full subtitle does not fit/);
  config.captions.font_size=80;
  await assert.rejects(buildMaster(root,config,sb,narration,{assets:[]}),/full subtitle does not fit/);
});
