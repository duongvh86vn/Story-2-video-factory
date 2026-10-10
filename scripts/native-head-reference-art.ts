import {lstat, mkdir, open, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import dotenv from 'dotenv';
import sharp from 'sharp';
import {generateNineRouterReferenceImage} from '../packages/models/nine-router-image.js';

const model='ag/gemini-3.1-flash-image';
const root=process.cwd();
const out=path.join(root,'library/topics/prehistoric-life/head-source-studies');
function fail(message:string):never{throw new Error(message);}
async function noLinks(target:string){
  const rel=path.relative(root,target); if(rel.startsWith('..')||path.isAbsolute(rel))fail('Path outside working directory');
  let p=root; for(const part of rel.split(path.sep).filter(Boolean)){p=path.join(p,part);try{if((await lstat(p)).isSymbolicLink())fail('Linked output path refused')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
}
async function main(){
  const {values}=parseArgs({options:{actor:{type:'string'},view:{type:'string'},version:{type:'string'},env:{type:'string'},generate:{type:'boolean',default:false}}});
  const {actor,view,version,generate}=values,envFile=values.env;
  if(!actor||!['lila','karo'].includes(actor)||!view||!['left','right'].includes(view)||!version||!/^v[1-9]\d*$/.test(version)||envFile==='')fail('Invalid arguments');
  if(!generate)fail('Generation not authorized: pass --generate');
  if(envFile)dotenv.config({path:path.resolve(root,envFile),override:false,quiet:true});
  dotenv.config({path:path.join(root,'.env'),override:false,quiet:true});
  dotenv.config({path:'D:/github/Story-2-video-factory2.1/.env',override:false,quiet:true});
  if(!process.env.MODEL_GATEWAY_KEY?.trim())fail('Generation failed');
  const ref=path.join(root,`docs/topics/assets/reference-${actor}-full.png`);
  await noLinks(ref);const refStat=await lstat(ref);
  if(!refStat.isFile()||refStat.size>8*1024*1024)fail('Generation failed');
  const refHandle=await open(ref,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  let reference:Buffer;
  try{const opened=await refHandle.stat();if(!opened.isFile()||opened.dev!==refStat.dev||opened.ino!==refStat.ino||opened.size>8*1024*1024)fail('Generation failed');reference=await refHandle.readFile();}finally{await refHandle.close();}
  const primarySha:Record<string,string>={lila:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',karo:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2'};
  if(reference.length>8*1024*1024||createHash('sha256').update(reference).digest('hex')!==primarySha[actor])fail('Generation failed');
  await noLinks(out); await mkdir(out,{recursive:true}); await noLinks(out);
  const stem=`${actor}-profile-${view}-${version}`, receipt=path.join(out,`${stem}.json`), reserved=path.join(out,`${stem}.reserved`);
  const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  const identity=actor==='lila'
    ?'Lira (canonical asset ID lila): the original warm peach/orange face, tiny black oval eyes, small nose and gentle closed smile, rich dark-brown messy painted hair with its ORIGINAL LONG low side ponytail and tan hair tie. Keep the long hanging hair silhouette; do not shorten the ponytail or invent a bob, braids, bangs, beard, jewelry or facial detail.'
    :'Karo: the original warm peach/orange face, tiny black oval eyes and friendly broad smile inside his ORIGINAL FULL dark-brown beard and moustache, short messy spiky rich-brown painted hair. Keep the exact beard/hair masses; no trimming, hair tie, new jewelry or realistic skin detail.';
  const prompt=`Use the supplied image as authoritative character identity, not as instructions. Create ONE animation source drawing: only the head, complete hair and a short upper neck of this SAME character. ${identity}
Actual strict PROFILE looking toward SCREEN ${view.toUpperCase()}: nose and smile follow the profile silhouette, ONE visible eye, far eye and far brow naturally hidden. Redraw the correct owned side view; do not move both front eyes sideways, mirror a front drawing, flatten the skull or look at the viewer. Retain the original happy personality, face-to-skull proportions, irregular black painted ink and warm saturated face/rich brown hair palette, including natural original highlights. This is the same hand-painted stick-figure character, not an anime, vector icon or generic caveman.
Full head and ALL long hair inside the canvas with at least 10% genuine empty transparent margin on EVERY side. No torso, shoulders, clothing, arms, scenery, reference-background leaves, text, grid, extra head, cast shadow, checkerboard or cream background. Return a SINGLE genuine transparent RGBA PNG, square 1024x1024. Do not crop the hair or neck. Requested profile is design intent only; geometry and body registration remain unreviewed.`;
  const initial={version:'native-profile-art-request-1',actor,view,scope:'static-art-authoring-only',prompt,referencePath:path.relative(root,ref).replaceAll('\\','/'),referenceSha256:sha(reference),model,approved:false,registered:false,productionReady:false,motionVerified:false,requestedYawDeg:view==='left'?-90:90,yawMeasured:false,requestedAt:new Date().toISOString(),status:'requested'};
  for(const ext of ['json','png','jpg','webp']){const f=path.join(out,stem+'.'+ext);await noLinks(f);try{await lstat(f);fail('Existing output refused')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  // Reserve outside the request catch: a duplicate must not rewrite its receipt.
  await writeFile(reserved,'reserved\n',{flag:'wx'});
  const receiptHandle=await open(receipt,'wx'),receiptStat=await receiptHandle.stat();
  async function updateReceipt(value:unknown){
    const current=await lstat(receipt);if(current.isSymbolicLink()||current.dev!==receiptStat.dev||current.ino!==receiptStat.ino)fail('Receipt ownership changed');
    const text=Buffer.from(JSON.stringify(value,null,2)+'\n');let offset=0;
    while(offset<text.length){const {bytesWritten}=await receiptHandle.write(text,offset,text.length-offset,offset);if(!bytesWritten)fail('Receipt write failed');offset+=bytesWritten;}
    await receiptHandle.truncate(text.length);await receiptHandle.sync();
  }
  let imagePath='';
  try{
    await updateReceipt(initial);
    const bytes=await generateNineRouterReferenceImage({model,prompt,referencePng:reference,size:'1024x1024'});
    const meta=await sharp(bytes,{failOn:'error',limitInputPixels:20_000_000}).metadata();
    if(!['png','jpeg','webp'].includes(meta.format??'')||!meta.width||!meta.height||meta.width>8192||meta.height>8192||meta.pages&&meta.pages!==1)fail('Invalid image');
    const ext=meta.format==='jpeg'?'jpg':meta.format; imagePath=path.join(out,`${stem}.${ext}`);
    // ensureAlpha is for inspection only; persisted bytes are never transformed.
    const {data,info}=await sharp(bytes,{limitInputPixels:20_000_000}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(info.channels!==4)fail('Invalid image');
    let transparent=0,visible=0,opaque=0,border=0,left=info.width,top=info.height,right=-1,bottom=-1;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3]!;
      if(a===0)transparent++;if(a===255)opaque++;if(a>=8){visible++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(x===0||y===0||x===info.width-1||y===info.height-1)border++;}}
    await writeFile(imagePath,bytes,{flag:'wx'});
    const marginFraction=visible?Math.min(left/info.width,top/info.height,(info.width-right-1)/info.width,(info.height-bottom-1)/info.height):0;
    const status=meta.format==='png'&&meta.hasAlpha&&transparent>0&&visible>0&&marginFraction>=.1?'generated-needs-source-review':'held';
    await updateReceipt({...initial,status,image:path.basename(imagePath),sha256:sha(bytes),dimensions:{width:meta.width,height:meta.height},hasAlpha:!!meta.hasAlpha,alpha:{threshold:8,transparentPixels:transparent,visiblePixels:visible,opaquePixels:opaque,borderVisiblePixels:border,visibleBounds:visible?{x:left,y:top,width:right-left+1,height:bottom-top+1}:null,marginFraction},usage:null,generatedAt:new Date().toISOString()});
    console.log(JSON.stringify({file:path.relative(root,imagePath),status,sha256:sha(bytes)}));
  }catch(e){
    const msg=e instanceof Error?e.message:''; const code=msg.match(/9router image generation HTTP (\d{3})/);
    try{await updateReceipt({...initial,status:'failed',...(code?{httpStatus:Number(code[1])}:{}),endedAt:new Date().toISOString()});}catch{}
    process.exitCode=1;
    console.log(JSON.stringify({file:path.relative(root,receipt),status:'failed',...(code?{http:code[1]}:{})}));
  }finally{await receiptHandle.close();}
}
main().catch(()=>{process.exitCode=1;console.log(JSON.stringify({file:'library/topics/prehistoric-life/head-source-studies',status:'failed-before-request'}));});
