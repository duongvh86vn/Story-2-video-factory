/** Reuse source art and an existing candidate alpha matte. No image/model/TTS calls. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {prepareCharacterSource,type CharacterSourceRecipe} from '../packages/image-motion/character-source.js';
import {createImageMotionHtml} from '../packages/image-motion/scene.js';
import {exportStandaloneClip} from '../packages/image-motion/export-clip.js';

const {values}=parseArgs({options:{actor:{type:'string'},output:{type:'string'},render:{type:'boolean'},chrome:{type:'string'},ffmpeg:{type:'string'},ffprobe:{type:'string'}}});
const actor=values.actor??'lila';if(!['lila','karo'].includes(actor))throw new Error('Choose --actor lila or karo');
const parent=path.resolve('runtime/image-motion/character-candidates'),maskRoot=path.resolve('runtime/image-motion/character-mask-cache');await fs.mkdir(parent,{recursive:true});await fs.mkdir(maskRoot,{recursive:true});
const svg=await fs.readFile(`library/topics/prehistoric-life/source-rgb-masters/${actor}-source-rgb-master-v3.svg`),mask=path.join(maskRoot,hash(svg)+'.png');
try{await fs.access(mask);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await sharp(svg).png().toFile(mask);}
const frames=(angles:number[])=>[0,650,900,2100,3200,4200,5100,6000].map((timeMs,i)=>({timeMs,angle:angles[i]!}));
const upper=frames([0,0,4,-62,-62,-48,0,0]),fore=frames([0,0,-4,18,18,9,0,0]),still=frames([0,0,0,0,0,0,0,0]);
const shape=actor==='lila'?{
  shoulder:{x:286,y:293},elbow:{x:344,y:390},wrist:{x:376,y:487},patch:420,
  upper:[[283,291],[303,302],[329,337],[347,374],[357,402],[335,410],[314,358],[292,318],[282,307]],
  fore:[[331,377],[352,373],[377,455],[401,474],[404,538],[350,541],[344,486],[331,453],[324,398]],
  cloth:[[233,268],[281,277],[295,317],[312,341],[309,357],[303,367],[221,375],[216,320]]
}:{
  shoulder:{x:272,y:281},elbow:{x:309,y:377},wrist:{x:340,y:470},patch:370,
  upper:[[264,274],[284,281],[299,325],[320,374],[320,391],[296,395],[277,339],[262,294]],
  fore:[[291,362],[317,359],[341,440],[367,459],[373,530],[315,537],[313,481],[303,437],[288,389]],
  cloth:[[162,252],[241,253],[259,275],[271,306],[277,346],[279,389],[273,422],[166,421],[150,350]]
};
const recipe:CharacterSourceRecipe={width:640,height:800,durationMs:6000,fps:60,patchSampleX:shape.patch,patchMode:'paper-harmonic',repairRegion:'polygon',repairMargin:12,protectSubject:true,parts:[
  {id:'image-right-upper',image:'assets/image-right-upper.png',pivot:shape.shoulder,polygon:shape.upper as [number,number][],inkOnly:true,replacement:{type:'ink-arm',from:shape.shoulder,to:shape.elbow,width:13},frames:upper},
  {id:'image-right-fore',parent:'image-right-upper',image:'assets/image-right-fore.png',pivot:shape.elbow,polygon:shape.fore as [number,number][],inkOnly:true,replacement:{type:'ink-arm',from:shape.elbow,to:shape.wrist,width:13,hand:{width:44,height:60,thumbSide:'left'}},frames:fore},
  {id:'cloth-occlusion',image:'assets/cloth-occlusion.png',pivot:{x:0,y:0},polygon:shape.cloth as [number,number][],remove:false,frames:still}
]};
const directory=path.resolve(values.output??path.join(parent,`${actor}-new-arm-v5`)),prepared=await prepareCharacterSource(`docs/topics/assets/reference-${actor}-full.png`,mask,directory,recipe,path.resolve('runtime/image-motion/character-layer-cache'));
const html=createImageMotionHtml(prepared.demo),file=path.join(directory,'index.html');
try{await fs.writeFile(file,html,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(hash(await fs.readFile(file))!==hash(html))throw new Error('Viewer code changed. Choose a new --output directory; prepared layers will be reused.');}
console.log(JSON.stringify({directory,actor,layerCacheKey:prepared.layerCacheKey,sourceHash:prepared.sourceHash,scope:'Image-right arm replaced with straight rounded ink segments; original face/clothes and opposite arm; not production or artistic acceptance'}));
if(values.render){await exportStandaloneClip(prepared,{chrome:values.chrome??process.env.IMAGE_MOTION_CHROME??'C:/Users/Duongvh-pc/.cache/puppeteer/chrome-headless-shell/win64-154.0.8037.57/chrome-headless-shell-win64/chrome-headless-shell.exe',ffmpeg:values.ffmpeg??'C:/ffmpeg/bin/ffmpeg.exe',ffprobe:values.ffprobe??'C:/ffmpeg/bin/ffprobe.exe',onProgress:(frame,total)=>console.log(JSON.stringify({actor,stage:'render',frame,total}))});console.log(JSON.stringify({actor,video:path.join(directory,'demo.mp4'),productionReady:false,qualityAccepted:false}));}
