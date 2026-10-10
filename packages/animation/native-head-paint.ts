import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {nativeHeadEyeRegistrations,nativeHeadBrowRegistrations,nativeHeadOcclusionContours,type NativeHeadFace} from './native-head-face.js';
import {NativeRearMotionSchema,nativeRearFollowDefs} from './native-head-follow.js';

const Scalar=z.number().finite().nonnegative();
const Rect=z.object({x:Scalar,y:Scalar,width:z.number().finite().positive(),height:z.number().finite().positive()}).strict();
const Source=z.object({sha256:z.string().regex(/^[a-f0-9]{64}$/),width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict();
/** Authored source-space partitions, not inferred anatomy or the neck seam.
 * region paints behind the BODY; frontCut removes only its interior from the
 * original foreground image. The explicit narrow overlap avoids a clipping
 * crack, but its actual alpha/colour seam still needs visual acceptance. */
export const NativeHeadPaintSchema=z.object({version:z.enum(['native-head-paint-1','native-head-paint-2']),source:Source,
  rear:z.array(z.object({id:Id,region:Rect,frontCut:Rect,motion:NativeRearMotionSchema.optional()}).strict()).max(8),
  status:z.literal('engineering-paint-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict();
export type NativeHeadPaint=z.infer<typeof NativeHeadPaintSchema>;
type R=z.infer<typeof Rect>;type P={x:number;y:number};
const within=(a:R,b:R)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;
const box=(ps:P[]):R=>({x:Math.min(...ps.map(p=>p.x)),y:Math.min(...ps.map(p=>p.y)),width:Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x)),height:Math.max(...ps.map(p=>p.y))-Math.min(...ps.map(p=>p.y))});
const touches=(a:R,b:R)=>a.x<=b.x+b.width&&b.x<=a.x+a.width&&a.y<=b.y+b.height&&b.y<=a.y+a.height;
export function validateNativeHeadPaint(value:NativeHeadPaint,source:z.infer<typeof Source>,cell:{crop:R;neck:P;neckTop:P;chin:P;eyeTarget:P;seam:P[];face?:NativeHeadFace}){
  const paint=NativeHeadPaintSchema.parse(value),fail=(message:string):never=>{throw new Error('needs-head-paint-registration: '+message);};
  if(paint.source.sha256!==source.sha256||paint.source.width!==source.width||paint.source.height!==source.height)fail('paint must belong to this exact cell PNG');
  const full={x:0,y:0,width:source.width,height:source.height};
  if(!within(cell.crop,full)||source.width*source.height>20_000_000)fail('crop leaves bounded source');
  if(new Set(paint.rear.map(p=>p.id)).size!==paint.rear.length)fail('duplicate rear layer');
  const f=cell.face,protect=[box(cell.seam),...[cell.neck,cell.neckTop,cell.chin,cell.eyeTarget].map(p=>({x:p.x,y:p.y,width:0,height:0})),
    ...(f?[f.mouth.region,...nativeHeadEyeRegistrations(f).map(([,e])=>e.region),...f.protectedContours,...nativeHeadOcclusionContours(f),...nativeHeadBrowRegistrations(f).map(([,b])=>b.region)].map(box):[]),
    ...(f?nativeHeadEyeRegistrations(f).map(([,e])=>e.strip):[]),...(f?.mouth.strip?[f.mouth.strip]:[]),
    ...(f?nativeHeadBrowRegistrations(f).map(([,b])=>b.strip):[]),
    ...(f?.emotions?.mouth.repair.source.sha256===source.sha256?[f.emotions.mouth.repair.strip]:[])];
  for(const [i,p] of paint.rear.entries()){
    if(paint.version==='native-head-paint-1'?'motion' in p:!p.motion)fail('paint2 requires every own rear motion; paint1 forbids motion fields');
    if(p.motion&&(p.region.width<64||p.region.height<96))fail('rear motion mesh requires at least 64 by 96 source pixels for stable UV seams');
    if(!within(p.region,cell.crop)||!within(p.frontCut,p.region))fail('rear paint or front cut leaves its cell/partition');
    // Overlap is explicitly authored and bounded at each internal edge. Crop
    // edges may coincide: they have no second paint seam outside the image.
    const inset=[p.frontCut.x-p.region.x,p.frontCut.y-p.region.y,p.region.x+p.region.width-p.frontCut.x-p.frontCut.width,p.region.y+p.region.height-p.frontCut.y-p.frontCut.height];
    if(inset.some(n=>n<0||n>2)||inset.every(n=>n===0))fail('partition needs an explicit overlap of at most two source pixels');
    if(protect.some(r=>touches(p.region,r)))fail('rear layer touches facial edits, landmarks or neck overlap; author a separate source partition');
    if(paint.rear.slice(i+1).some(q=>touches(p.region,q.region)))fail('rear layers overlap');
  }
}
const rect=(r:R,colour?:string)=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"${colour?` fill="${colour}"`:''}/>`;
export function nativeHeadPaintDefs(paint:NativeHeadPaint,crop:R,index:number){
  if(!paint.rear.length)return '';
  const key='native-head-paint-'+index;
  return `<clipPath id="${key}-rear" clipPathUnits="userSpaceOnUse">${paint.rear.map(p=>rect(p.region)).join('')}</clipPath><mask id="${key}-front" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${crop.x}" y="${crop.y}" width="${crop.width}" height="${crop.height}" style="mask-type:luminance">${rect(crop,'white')}${paint.rear.map(p=>rect(p.frontCut,'black')).join('')}</mask>${nativeRearFollowDefs(paint,index)}`;
}
export const nativeHeadPaintDescription={version:'native-head-paint-1',method:'explicit same-source rear partitions before all body paint; original face/neck in front, both on the identical uniform head transform and discrete original cell clock; bounded authored source-pixel overlap',
  secondaryMotion:false,neckTrim:false,approved:false,productionReady:false,motionVerified:false};
