/** Manual per-PNG source geometry only. No raster edit, inferred yaw, bank
 * registration or scene/voice/animation execution. Initial proposal via9router
 * GPT5.6Luna; source binding/geometry/test gaps corrected during integration. */
import {z} from 'zod';
import {hash} from '../core/utils.js';
import {HeadCellFileSchema,HeadCellMaterialSchema,type HeadCellMaterial} from './head-cell-art.js';

const Point=z.object({x:z.number().finite().nonnegative(),y:z.number().finite().nonnegative()}).strict();
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const Polygon=z.array(Point).min(3).max(32);
const Eye=z.discriminatedUnion('visible',[
  z.object({visible:z.literal(true),center:Point}).strict(),
  z.object({visible:z.literal(false),occludedBy:z.enum(['nose','face-contour','hair'])}).strict(),
]);
const Sha=z.string().length(64).regex(/^[a-f0-9]{64}$/);
type P=z.infer<typeof Point>;
type R=z.infer<typeof Rect>;
export const HeadCellSourceBindingSchema=z.object({actor:z.enum(['lila','karo']),file:HeadCellFileSchema,sha256:Sha,materialFingerprint:Sha,
  width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict().superRefine((s,c)=>{
  if(s.width*s.height>20_000_000)c.addIssue({code:'custom',message:'Source exceeds pixel limit'});
  if(!s.file.startsWith(s.actor+'-head-'))c.addIssue({code:'custom',message:'Source actor/file differ'});
});
const DraftShape=z.object({version:z.literal('native-head-cell-landmarks-1'),source:HeadCellSourceBindingSchema,
  coordinates:z.literal('absolute-source-pixels'),crop:Rect.optional(),skull:Rect.optional(),
  neck:Point.optional(),neckTop:Point.optional(),chin:Point.optional(),nose:Point.optional(),mouth:Point.optional(),
  eyes:z.object({'screen-left':Eye.optional(),'screen-right':Eye.optional()}).strict().optional(),
  faceContour:Polygon.optional(),seam:Polygon.optional(),mouthContour:Polygon.optional(),mouthEditMask:Polygon.optional(),
  eyeEditMasks:z.object({'screen-left':Polygon.optional(),'screen-right':Polygon.optional()}).strict().optional(),
  protectedContours:z.array(Polygon).max(8).optional(),
  yawDeg:z.number().finite().min(-90).max(90).optional(),pixelScale:z.number().finite().min(.05).max(2).optional(),
  ponytailSide:z.enum(['anatomical-left','anatomical-right','behind','not-applicable']).optional(),
  review:z.enum(['unreviewed','needs-redraw','candidate']),notes:z.string().max(2000),
  approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict();
type Draft=z.infer<typeof DraftShape>;
const eyeSlots=['screen-left','screen-right'] as const;
const points=['neck','neckTop','chin','nose','mouth'] as const;
const polygons=['faceContour','seam','mouthContour','mouthEditMask'] as const;
const epsilon=1e-7;
function cross(a:P,b:P,c:P){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function onSegment(p:P,a:P,b:P){return Math.abs(cross(a,b,p))<=epsilon&&p.x>=Math.min(a.x,b.x)-epsilon&&p.x<=Math.max(a.x,b.x)+epsilon&&p.y>=Math.min(a.y,b.y)-epsilon&&p.y<=Math.max(a.y,b.y)+epsilon;}
function intersects(a:P,b:P,c:P,d:P){
  if(onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d))return true;
  return (cross(a,b,c)>0)!==(cross(a,b,d)>0)&&(cross(c,d,a)>0)!==(cross(c,d,b)>0);
}
function contains(p:P,poly:P[]){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i]!,b=poly[j]!;
    if(onSegment(p,a,b))return true;
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;
}
function validPolygon(poly:P[]){
  let area=0;
  for(let i=0;i<poly.length;i++){
    const a=poly[i]!,b=poly[(i+1)%poly.length]!,previous=poly[(i+poly.length-1)%poly.length]!;
    if(Math.hypot(a.x-b.x,a.y-b.y)<=epsilon)return false;
    // Adjacent edges may meet once; a collinear reversal retraces paint.
    if(Math.abs(cross(previous,a,b))<=epsilon&&(previous.x-a.x)*(b.x-a.x)+(previous.y-a.y)*(b.y-a.y)>epsilon)return false;
    area+=a.x*b.y-b.x*a.y;
    for(let j=i+1;j<poly.length;j++){
      if(j===i+1||(i===0&&j===poly.length-1))continue;
      if(intersects(a,b,poly[j]!,poly[(j+1)%poly.length]!))return false;
    }
  }return Math.abs(area)>epsilon;
}
function within(p:P,r:R){return p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;}
function rectWithin(inner:R,outer:R){return inner.x>=outer.x&&inner.y>=outer.y&&inner.x+inner.width<=outer.x+outer.width&&inner.y+inner.height<=outer.y+outer.height;}
function overlap(a:P[],b:P[]){
  if(a.some(p=>contains(p,b))||b.some(p=>contains(p,a)))return true;
  return a.some((p,i)=>b.some((q,j)=>intersects(p,a[(i+1)%a.length]!,q,b[(j+1)%b.length]!)));
}
function geometry(d:Draft,c:z.RefinementCtx){
  const fail=(message:string,path:(string|number)[])=>c.addIssue({code:'custom',message,path});
  const source={x:0,y:0,width:d.source.width,height:d.source.height},region=d.crop??source;
  const point=(p:P,at:(string|number)[])=>{if(!within(p,source)||!within(p,region))fail('Point outside source/crop',at);};
  for(const key of ['crop','skull'] as const)if(d[key]&&!rectWithin(d[key]!,source))fail('Rectangle outside source',[key]);
  if(d.skull&&!rectWithin(d.skull,region))fail('Skull outside crop',['skull']);
  for(const key of points)if(d[key])point(d[key]!,[key]);
  const poly=(p:P[],at:(string|number)[])=>{p.forEach((v,i)=>point(v,[...at,i]));if(!validPolygon(p))fail('Polygon degenerates, reverses, crosses or touches itself',at);};
  for(const key of polygons)if(d[key])poly(d[key]!,[key]);
  d.protectedContours?.forEach((p,i)=>poly(p,['protectedContours',i]));
  for(const side of eyeSlots){
    const e=d.eyes?.[side],mask=d.eyeEditMasks?.[side];
    if(e?.visible)point(e.center,['eyes',side,'center']);
    if(mask)poly(mask,['eyeEditMasks',side]);
    if(e?.visible&&mask&&!contains(e.center,mask))fail('Eye outside own edit mask',['eyeEditMasks',side]);
    if(e&&!e.visible&&mask)fail('Occluded eye cannot have a visible-eye edit mask',['eyeEditMasks',side]);
  }
  if(d.faceContour){
    // The neck socket is below the chin; it need not be inside the face outline.
    for(const key of ['chin','nose','mouth'] as const)if(d[key]&&!contains(d[key]!,d.faceContour))fail('Facial feature outside face contour',[key]);
    for(const side of eyeSlots){const e=d.eyes?.[side];if(e?.visible&&!contains(e.center,d.faceContour))fail('Eye outside face contour',['eyes',side]);}
  }
  const l=d.eyes?.['screen-left'],r=d.eyes?.['screen-right'];
  if(l?.visible&&r?.visible&&l.center.x>=r.center.x)fail('Screen-coordinate eyes are swapped',['eyes']);
  if(d.neck&&d.neckTop&&d.neckTop.y>=d.neck.y)fail('Neck top must be above socket',['neckTop']);
  if(d.neck&&d.seam&&!contains(d.neck,d.seam))fail('Socket outside seam',['seam']);
  for(const key of ['mouthContour','mouthEditMask'] as const)if(d.mouth&&d[key]&&!contains(d.mouth,d[key]!))fail('Mouth outside own contour/mask',[key]);
  const editMasks=[d.mouthEditMask,...eyeSlots.map(side=>d.eyeEditMasks?.[side])].filter((p):p is P[]=>!!p);
  if(editMasks.some(mask=>d.protectedContours?.some(protectedPoly=>overlap(mask,protectedPoly))))fail('Edit mask overlaps protected paint',['protectedContours']);
  if(d.source.actor==='lila'&&d.ponytailSide==='not-applicable')fail('Lila needs a measured ponytail side',['ponytailSide']);
  if(d.source.actor==='karo'&&d.ponytailSide!==undefined&&d.ponytailSide!=='not-applicable')fail('Karo has no ponytail',['ponytailSide']);
}
export const HeadCellDraftSchema=DraftShape.superRefine(geometry);
export type HeadCellDraft=z.infer<typeof HeadCellDraftSchema>;
export const HeadCellCheckRequestSchema=z.object({source:HeadCellSourceBindingSchema,draft:HeadCellDraftSchema}).strict();
export function headCellSourceBinding(material:HeadCellMaterial){
  const m=HeadCellMaterialSchema.parse(material);
  return HeadCellSourceBindingSchema.parse({actor:m.actor,file:m.file,sha256:m.sha256,materialFingerprint:hash(m),width:m.width,height:m.height});
}
export function headCellDraft(material:HeadCellMaterial):HeadCellDraft{
  return {version:'native-head-cell-landmarks-1',source:headCellSourceBinding(material),coordinates:'absolute-source-pixels',
    review:'unreviewed',notes:'',approved:false,registered:false,productionReady:false,motionVerified:false};
}
function sameBinding(a:z.infer<typeof HeadCellSourceBindingSchema>,b:z.infer<typeof HeadCellSourceBindingSchema>){
  return a.actor===b.actor&&a.file===b.file&&a.sha256===b.sha256&&a.materialFingerprint===b.materialFingerprint&&a.width===b.width&&a.height===b.height;
}
export function checkHeadCellDraft(value:unknown,material:HeadCellMaterial){
  const draft=HeadCellDraftSchema.parse(value),source=headCellSourceBinding(material);
  if(!sameBinding(draft.source,source))throw new Error('Draft source differs from verified material');
  if(draft.crop&&!rectWithin(material.visibleBounds,draft.crop))throw new Error('Crop truncates original head paint');
  const required=['crop','skull',...points,...polygons,'yawDeg','pixelScale','ponytailSide'] as const;
  const pending=required.filter(k=>draft[k]===undefined).map(reason=>({reason:'Missing '+reason}));
  for(const side of eyeSlots){
    const eye=draft.eyes?.[side];
    if(!eye)pending.push({reason:'Missing '+side+' eye visibility'});
    else if(eye.visible&&!draft.eyeEditMasks?.[side])pending.push({reason:'Missing '+side+' eye edit mask'});
  }
  if(!draft.protectedContours?.length)pending.push({reason:'Missing protected paint contours'});
  if(draft.review!=='candidate')pending.push({reason:'Manual reference review remains'});
  return {draft,pending,landmarksComplete:pending.length===0,registered:false as const,approved:false as const,productionReady:false as const,motionVerified:false as const,
    blockers:['Artwork identity and adjacent-view correspondence not accepted','Masks are draft coordinates; speech/blink/emotion not implemented or accepted','Neck/garment/hair seam and body clock not accepted','Normal-speed whole-story motion and final video not accepted']};
}
export function checkBoundHeadCellDraft(value:unknown,material:HeadCellMaterial){
  const request=HeadCellCheckRequestSchema.parse(value);
  if(!sameBinding(request.source,headCellSourceBinding(material))||!sameBinding(request.draft.source,request.source))throw new Error('Displayed/draft source mismatch');
  return checkHeadCellDraft(request.draft,material);
}
