import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {hash,safeRealPath,writeAtomic} from '../packages/core/utils.js';
import {readFlowImageTimeline,retimeImageScene,validateTimedClipCache} from '../packages/image-motion/flow-timeline.js';
import {outputPath} from '../packages/render/process.js';
import {exportStandaloneClip} from '../packages/image-motion/export-clip.js';
import {createImageMotionHtml,validateDemo,type ImageMotionDemo} from '../packages/image-motion/scene.js';

const {values}=parseArgs({options:{source:{type:'string'},output:{type:'string'},fps:{type:'string'},variant:{type:'string'},manifest:{type:'string'},scene:{type:'string'},clip:{type:'string'},chrome:{type:'string'},ffmpeg:{type:'string'},ffprobe:{type:'string'},render:{type:'boolean'}}});
if(!values.source)throw Error('--source is required');
if(values.variant&&!['original','fullhd'].includes(values.variant))throw Error('--variant must be original or fullhd');
const source=await fs.realpath(path.resolve(values.source)),timeline=await readFlowImageTimeline(source,{fps:Number(values.fps??60),variant:values.variant as 'original'|'fullhd'|undefined});
const output=path.resolve(values.output??'runtime/image-motion/timestamp-import');
// A sibling export; never write into the supplied project.
const outputAncestor=async()=>{let p=output;for(;;){try{return await fs.realpath(p);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const next=path.dirname(p);if(next===p)throw e;p=next;}}};
const ancestor=await outputAncestor();if(output===source||output.startsWith(source+path.sep)||ancestor===source||ancestor.startsWith(source+path.sep))throw Error('Choose an output outside the source project');
await fs.mkdir(output,{recursive:true});
const realOutput=await fs.realpath(output);if(realOutput===source||realOutput.startsWith(source+path.sep))throw Error('Output resolves inside source project');
if(!values.manifest){if(values.render)throw Error('--render requires --manifest, --scene and --clip');await writeAtomic(await outputPath(output,'timeline-import.json'),JSON.stringify({...timeline,productionReady:false,clips:timeline.clips.map(c=>({...c,status:'needs-motion'}))},null,2)+'\n');console.log(JSON.stringify({imported:timeline.clips.length,durationMs:timeline.durationMs,fps:timeline.outputFps,gaps:timeline.gaps,manifest:path.join(output,'timeline-import.json'),productionReady:false}));}
else{
  if(!values.scene||!values.clip)throw Error('--scene and --clip are required with --manifest');const clip=timeline.clips.find(c=>c.id===Number(values.clip));if(!clip)throw Error('Clip is absent from source timeline');
  const manifest=await fs.realpath(path.resolve(values.manifest)),base=path.dirname(manifest);if((await fs.stat(manifest)).size>4*1024*1024)throw Error('Motion manifest exceeds 4 MB');const prepared=JSON.parse(await fs.readFile(manifest,'utf8'));validateDemo(prepared.demo);
  const original=prepared.demo.scenes.find((s:any)=>s.id===values.scene);if(!original)throw Error('Motion scene is absent from manifest');const scene=retimeImageScene(original,clip.clock),demo:ImageMotionDemo={version:1,fps:clip.clock.fps,scenes:[scene]};
  const assets=new Map<string,Buffer>();for(const name of [...new Set<string>([scene.original,scene.background,...scene.layers.map(l=>l.image),...(scene.parts??[]).map(p=>p.image)])]){const file=await safeRealPath(base,name);if((await fs.stat(file)).size>16*1024*1024)throw Error('Motion asset exceeds 16 MB');const data=await fs.readFile(file);if(prepared.assetHashes&&prepared.assetHashes[name]!==hash(data))throw Error('Motion asset integrity changed: '+name);assets.set(name,data);}
  let sourceHash=hash(assets.get(scene.original)!);
  if(sourceHash!==clip.selectedHash){const bytes=await fs.readFile(await safeRealPath(base,'assets/source-original.png'));sourceHash=hash(bytes);if(sourceHash!==prepared.sourceHash||prepared.assetHashes?.['assets/source-original.png']!==sourceHash)throw Error('Raw motion source integrity changed');}
  if(sourceHash!==clip.selectedHash)throw Error('Motion source does not match the selected timeline image');
  const assetHashes=Object.fromEntries([...assets].map(([name,bytes])=>[name,hash(bytes)])),html=createImageMotionHtml(demo),identity=hash({version:'timed-clip-2',clock:clip.clock,demo,assetHashes,html:hash(html)}),directory=await outputPath(output,'clip-'+String(clip.id).padStart(4,'0')+'-'+identity.slice(0,16));await fs.mkdir(directory,{recursive:true});await fs.mkdir(await outputPath(directory,'assets'),{recursive:true});
  const immutable=async(name:string,bytes:Buffer)=>{const target=await outputPath(directory,name);try{await fs.writeFile(target,bytes,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(target))!==hash(bytes))throw Error('Timed clip cache integrity changed: '+name);}};
  for(const [name,bytes]of assets)await immutable(name,bytes);await immutable('index.html',Buffer.from(html));await immutable('timing.json',Buffer.from(JSON.stringify({version:1,identity,clip,assetHashes,sourceFps:timeline.sourceFps,outputFps:timeline.outputFps,variant:timeline.variant,timelineHash:timeline.timelineHash,sourceHash,productionReady:false,qualityAccepted:false},null,2)+'\n'));
  let cached=false;try{const report=JSON.parse(await fs.readFile(await outputPath(directory,'qc-report.json'),'utf8'));validateTimedClipCache(report,await fs.readFile(await outputPath(directory,'demo.mp4')),{clock:clip.clock,identity,width:scene.width,height:scene.height});cached=true;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if(values.render&&!cached){const report=await exportStandaloneClip({directory,demo,clock:clip.clock},{chrome:values.chrome??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',ffmpeg:values.ffmpeg??'C:/ffmpeg/bin/ffmpeg.exe',ffprobe:values.ffprobe??'C:/ffmpeg/bin/ffprobe.exe',onProgress:(n,total)=>{if(n===total)console.log(JSON.stringify({renderedFrames:n}));}});report.movieHash=hash(await fs.readFile(await outputPath(directory,'demo.mp4')));report.renderIdentity=identity;await writeAtomic(await outputPath(directory,'qc-report.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({clip:clip.id,clock:clip.clock,frames:clip.clock.endFrame-clip.clock.startFrame,directory,cached,status:values.render||cached?'silent-clip':'prepared',productionReady:false,qualityAccepted:false}));
}
