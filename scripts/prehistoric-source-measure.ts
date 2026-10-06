import sharp from 'sharp';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
const repo=await findRepoRoot(),measurements=[];
for(const [id,w,h] of [['lila',430,766],['karo',377,716]] as const){
const bytes=await fs.readFile(path.join(repo,`library/topics/prehistoric-life/${id}-cutout-v1.png`));
const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const rows=[];
for(const y of [300,330,360,390,420,450,470,580,610,640,670]){
 const runs=[];let start=-1;
 for(let x=45;x<(id==='lila'?420:370);x++){
  const at=(Math.round(y*info.height/h)*info.width+Math.round(x*info.width/w))*info.channels;
  const dark=data[at]!<18&&data[at+1]!<18&&data[at+2]!<18&&data[at+3]!>190;
  if(dark&&start<0)start=x;
  if(!dark&&start>=0){if(x-start>=3)runs.push([start,x-1]);start=-1;}
 }
 rows.push({y,runs});
}
measurements.push({id,sourceSha256:hash(bytes),sourceUnits:{width:w,height:h},rows});
}
await writeJson(path.join(repo,'library/topics/prehistoric-life/source-ink-measurements-v1.json'),{version:1,scope:'read-only-source-ink-analysis',measurements});
console.log(JSON.stringify({measured:measurements.length}));
