import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {escapeHtml,hash} from '../core/utils.js';
import {MotionRect,MotionHash} from './schemas.js';
import {MOTION_JSON_LIMIT,MOTION_PNG_LIMIT,MOTION_PIXELS,motionSourceDirectory,motionRead,motionPng,motionDirectories,motionWriteImmutable} from './files.js';

const frame=z.object({id:Id,rect:MotionRect,regions:z.array(z.object({name:Id,rect:MotionRect}).strict()).max(32).default([])}).strict();
/** Explicit author selections. Neither a grid detector nor native registration. */
export const MotionMeasureLayoutSchema=z.object({version:z.literal('actor-motion-measure-layout-1'),sheetHash:MotionHash,frames:z.array(frame).min(1).max(512)}).strict().superRefine((layout,ctx)=>{
  if(new Set(layout.frames.map(item=>item.id)).size!==layout.frames.length)ctx.addIssue({code:'custom',path:['frames'],message:'Duplicate measurement frame ID'});
  let pixels=0;
  for(const [index,item] of layout.frames.entries()){
    pixels+=item.rect.w*item.rect.h;
    if(new Set(item.regions.map(region=>region.name)).size!==item.regions.length)ctx.addIssue({code:'custom',path:['frames',index,'regions'],message:'Duplicate measurement region name'});
    for(const [at,region] of item.regions.entries()){
      pixels+=region.rect.w*region.rect.h;
      if(region.rect.x+region.rect.w>item.rect.w||region.rect.y+region.rect.h>item.rect.h)ctx.addIssue({code:'custom',path:['frames',index,'regions',at],message:'Measurement region escapes its frame'});
    }
  }
  if(pixels>MOTION_PIXELS)ctx.addIssue({code:'custom',path:['frames'],message:'Measurement samples exceed 64 million pixels'});
});
export type MotionMeasureLayout=z.infer<typeof MotionMeasureLayoutSchema>;
const thresholdSchema=z.number().int().min(1).max(255);
const dimensions=z.object({width:z.number().int().positive().max(32768),height:z.number().int().positive().max(32768)}).strict()
  .refine(size=>size.width*size.height<=MOTION_PIXELS,'Measurement sheet exceeds 64 million pixels');

function alphaBounds(raw:Uint8Array,width:number,window:z.infer<typeof MotionRect>,threshold:number){
  let left=window.w,top=window.h,right=-1,bottom=-1,pixels=0;
  for(let y=0;y<window.h;y++)for(let x=0;x<window.w;x++)if(raw[((window.y+y)*width+window.x+x)*4+3]!>=threshold){
    pixels++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  return {pixels,bounds:pixels?{x:window.x+left,y:window.y+top,w:right-left+1,h:bottom-top+1}:null,
    touchesEdges:{left:pixels>0&&left===0,top:pixels>0&&top===0,right:pixels>0&&right===window.w-1,bottom:pixels>0&&bottom===window.h-1}};
}
/** Static pixel occupancy, not feet/face/anatomy recognition or an approval. */
export function measureMotionPixels(raw:Uint8Array,sizeInput:{width:number;height:number},input:MotionMeasureLayout,thresholdInput=128){
  const size=dimensions.parse(sizeInput),layout=MotionMeasureLayoutSchema.parse(input),threshold=thresholdSchema.parse(thresholdInput);
  if(raw.byteLength!==size.width*size.height*4)throw new Error('Measurement requires exact decoded RGBA pixels');
  return {threshold,frames:layout.frames.map(item=>{
    if(item.rect.x+item.rect.w>size.width||item.rect.y+item.rect.h>size.height)throw new Error(`Measurement frame escapes PNG: ${item.id}`);
    const measured=alphaBounds(raw,size.width,item.rect,threshold),local=(bounds:typeof measured.bounds)=>bounds?{...bounds,x:bounds.x-item.rect.x,y:bounds.y-item.rect.y}:null;
    return {id:item.id,rect:item.rect,pixels:measured.pixels,bounds:local(measured.bounds),touchesEdges:measured.touchesEdges,
      regions:item.regions.map(region=>{const result=alphaBounds(raw,size.width,{...region.rect,x:item.rect.x+region.rect.x,y:item.rect.y+region.rect.y},threshold);
        return {name:region.name,rect:region.rect,pixels:result.pixels,bounds:local(result.bounds),touchesRegionEdges:result.touchesEdges};})};
  })};
}
type Measurements=ReturnType<typeof measureMotionPixels>;

/** Local, inert SVG worksheet; raw PNG is copied once under a fixed relative URL. */
export function motionMeasureWorksheets(measurements:Measurements,size:{width:number;height:number}):string[]{
  const pages:string[]=[];
  for(let first=0;first<measurements.frames.length;first+=16){
    const selected=measurements.frames.slice(first,first+16),rows=Math.ceil(selected.length/4),width=1320,height=rows*360+64;
    const cards=selected.map((item,index)=>{
      const x=(index%4)*330,y=Math.floor(index/4)*360+44;
      const box=(rect:z.infer<typeof MotionRect>,color:string)=>`<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="none" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
      const regions=item.regions.map(region=>box(region.rect,'#2576c2')+(region.bounds?box(region.bounds,'#df2477'):'' )).join('');
      const edge=Object.entries(item.touchesEdges).filter(([,value])=>value).map(([name])=>name).join(',')||'none';
      return `<g transform="translate(${x},${y})"><text x="6" y="14">${escapeHtml(item.id)} · ${item.rect.w}×${item.rect.h}</text>
<svg x="6" y="22" width="318" height="302" viewBox="0 0 ${item.rect.w} ${item.rect.h}" preserveAspectRatio="xMidYMid meet"><rect width="${item.rect.w}" height="${item.rect.h}" fill="#fff4dd"/>
<image href="source.png" x="${-item.rect.x}" y="${-item.rect.y}" width="${size.width}" height="${size.height}"/>
${item.bounds?box(item.bounds,'#158646'):''}${regions}</svg>
<text x="6" y="340">Alpha ≥ ${measurements.threshold}; frame edges: ${escapeHtml(edge)}</text></g>`;
    }).join('\n');
    pages.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font:12px sans-serif;fill:#302215}</style><rect width="100%" height="100%" fill="#f7ead0"/><text x="8" y="20">STATIC ALPHA WORKSHEET · green=frame occupancy, blue=author region, pink=region occupancy · NOT registration/anatomy/motion approval</text>${cards}</svg>\n`);
  }
  return pages;
}

/** Authoring artifact only. No project/config/coordinator/audio/catalog mutation. */
export async function writeMotionMeasurement(rootInput:string,sheetRelative:string,layoutRelative:string,outputRelative:string,threshold=128){
  const root=await motionSourceDirectory(path.join(path.resolve(rootInput),'.measurement-root'));
  // Narrow relative output components; never publish into production inputs/assets.
  if(!outputRelative||outputRelative.split('/').some(part=>!Id.safeParse(part).success)
    ||['assets','input','scenes','output','renders','artifacts'].includes(outputRelative.split('/')[0]!.toLowerCase()))throw new Error('Measurement output requires a separate relative authoring directory');
  const [bytes,layoutBytes]=await Promise.all([motionRead(root,sheetRelative,MOTION_PNG_LIMIT),motionRead(root,layoutRelative,MOTION_JSON_LIMIT)]);
  const layout=MotionMeasureLayoutSchema.parse(JSON.parse(layoutBytes.toString('utf8'))),sheet=await motionPng(bytes);
  if(layout.sheetHash!==sheet.hash)throw new Error('Measurement selections belong to a different PNG version');
  const decoded=await sharp(bytes,{limitInputPixels:MOTION_PIXELS,failOn:'warning'}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(decoded.info.channels!==4||decoded.info.width!==sheet.width||decoded.info.height!==sheet.height)throw new Error('Measurement RGBA decode dimensions mismatch');
  const measured=measureMotionPixels(decoded.data,{width:sheet.width,height:sheet.height},layout,threshold),pages=motionMeasureWorksheets(measured,sheet);
  const report={version:'actor-motion-measure-report-1',scope:'static-alpha-occupancy-only',registration:false,productionReady:false,
    source:{path:sheetRelative,sha256:sheet.hash,width:sheet.width,height:sheet.height},layout:{path:layoutRelative,sha256:hash(layoutBytes)},...measured,
    limitations:['Regions and frame rectangles are author selections, not detected anatomy.','Alpha bounds cannot identify sole/contact/shoulder/face landmarks or prove unclipped artwork.','No timing, interpolation, speech, native motion, catalog linkage or production acceptance is created.']};
  const reportBytes=Buffer.from(JSON.stringify(report)+'\n'),pageBytes=pages.map(svg=>Buffer.from(svg));
  if(reportBytes.length>MOTION_JSON_LIMIT||pageBytes.some(page=>page.length>MOTION_JSON_LIMIT)||pageBytes.reduce((sum,page)=>sum+page.length,0)>MOTION_PNG_LIMIT)throw new Error('Measurement output exceeds size limits');
  await motionDirectories(root,outputRelative);
  await motionWriteImmutable(root,`${outputRelative}/source.png`,bytes,MOTION_PNG_LIMIT);
  await motionWriteImmutable(root,`${outputRelative}/report.json`,reportBytes,MOTION_JSON_LIMIT);
  const worksheets:string[]=[];
  for(const [index,page] of pageBytes.entries()){
    const file=`${outputRelative}/worksheet-${String(index+1).padStart(2,'0')}.svg`;
    await motionWriteImmutable(root,file,page,MOTION_JSON_LIMIT);worksheets.push(file);
  }
  return {report:`${outputRelative}/report.json`,worksheets,sourceHash:sheet.hash,scope:report.scope,productionReady:false as const};
}
