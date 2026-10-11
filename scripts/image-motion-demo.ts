import path from 'node:path';
import {promises as fs} from 'node:fs';
import {prepareOldProjectDemo} from '../packages/image-motion/prepare.js';
import {exportLocalDemo} from '../packages/image-motion/export.js';

const args=process.argv.slice(2),arg=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const source=arg('--source');if(!source)throw new Error('Usage: node --import tsx scripts/image-motion-demo.ts --source <flow_doodle export folder> [--output <new directory>] [--chrome <exe>] [--ffmpeg <exe>] [--ffprobe <exe>]');
const parent=path.resolve('runtime/image-motion/demos');await fs.mkdir(parent,{recursive:true});
const directory=path.resolve(arg('--output')??path.join(parent,'original-'+Date.now()));
const prepared=await prepareOldProjectDemo(path.resolve(source),directory);
console.log(JSON.stringify({directory,stage:'layers-prepared',sources:prepared.sources.map(x=>({copy:x.copy,sha256:x.sha256}))}));
await exportLocalDemo(prepared,{
  chrome:arg('--chrome')??process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',
  ffmpeg:arg('--ffmpeg')??'C:/ffmpeg/bin/ffmpeg.exe',ffprobe:arg('--ffprobe')??'C:/ffmpeg/bin/ffprobe.exe',
  onProgress:(frame,total)=>console.log(JSON.stringify({stage:'render',frame,total}))
});
console.log(JSON.stringify({stage:'demo-exported',video:path.join(directory,'demo.mp4'),qc:path.join(directory,'qc-report.json'),scope:'Silent motion demo only'}));
