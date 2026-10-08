import {z} from 'zod';

export const HEAD_TURN_MATERIAL_VERSION='native-head-turn-material-1' as const;
export const HEAD_TURN_DRAFT_VERSION='native-head-turn-landmarks-1' as const;
export const HEAD_TURN_FOLDER='library/topics/prehistoric-life/head-turn-studies';
export const HeadTurnFileSchema=z.string().regex(/^(lila|karo)-head-turn-v[1-9]\d*\.png$/);
const Sha=z.string().regex(/^[a-f0-9]{64}$/),Count=z.number().int().nonnegative();
export const HeadTurnPointSchema=z.object({x:z.number().finite().nonnegative(),y:z.number().finite().nonnegative()}).strict();
/** Source authoring produced1254px, not the requested2048px. Partition by
 * integer edge coordinates; never resize the artwork to make equal cells. */
export function headTurnCellRegion(width:number,height:number,index:number){
  const column=(index-1)%4,row=Math.floor((index-1)/4),x=Math.floor(column*width/4),y=Math.floor(row*height/4);
  return {x,y,width:Math.floor((column+1)*width/4)-x,height:Math.floor((row+1)*height/4)-y};
}
const Rect=z.object({x:Count,y:Count,width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const Ref=z.object({file:z.string(),sha256:Sha,role:z.enum(['primary-character-identity','edit-target'])}).strict();
export const HeadTurnPromptSchema=z.object({actor:z.enum(['lila','karo']),provider:z.literal('builtin-imagegen'),
  prompt:z.string().min(1),referenceImages:z.array(Ref).min(1).max(2),generatedOriginal:z.string().min(1),
  requestedYawDeg:z.array(z.number().finite().min(-90).max(90)).length(16),requestedRepairCells:z.array(z.number().int().min(1).max(16)).max(16),
  scope:z.literal('static-art-authoring-only'),approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),runtimeVerified:z.literal(false),
}).strict().superRefine((p,ctx)=>{
  const primary=p.referenceImages.filter(r=>r.role==='primary-character-identity'),targets=p.referenceImages.filter(r=>r.role==='edit-target');
  if(primary.length!==1||primary[0]?.file!==`docs/topics/assets/reference-${p.actor}-full.png`)ctx.addIssue({code:'custom',message:'Head turn identity must use the original actor reference'});
  if(targets.some(r=>!new RegExp(`^${HEAD_TURN_FOLDER}/${p.actor}-head-turn-v[1-9]\\d*\\.png$`).test(r.file)))ctx.addIssue({code:'custom',message:'Head turn repair target must belong to the same actor'});
  if(new Set(p.requestedRepairCells).size!==p.requestedRepairCells.length||(p.requestedRepairCells.length>0)!==(targets.length===1))ctx.addIssue({code:'custom',message:'Head turn repair scope requires exactly one edit target and distinct cell indexes'});
});
export const HeadTurnMaterialSchema=z.object({version:z.literal(HEAD_TURN_MATERIAL_VERSION),actor:z.enum(['lila','karo']),file:HeadTurnFileSchema,sha256:Sha,
  promptFile:z.string(),promptSha256:Sha,references:z.array(Ref).min(1).max(2),width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192),
  columns:z.literal(4),rows:z.literal(4),hasAlpha:z.literal(true),alphaThreshold:z.literal(8),transparentPixels:Count,visiblePixels:z.number().int().positive(),opaquePixels:Count,
  cells:z.array(z.object({index:z.number().int().min(1).max(16),region:Rect,visibleBounds:Rect,visiblePixels:z.number().int().positive(),edgePixels:Count,pixelSha256:Sha}).strict()).length(16),
  requestedYawDeg:z.array(z.number().finite().min(-90).max(90)).length(16),yawMeasured:z.literal(false),
  findings:z.array(z.object({cells:z.array(z.number().int().min(1).max(16)).min(1),note:z.string().min(1)}).strict()).min(1),
  status:z.literal('held-needs-art-repair-and-landmarks'),approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((m,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(!m.file.startsWith(m.actor+'-head-turn-')||m.promptFile!==`${HEAD_TURN_FOLDER}/${m.file.slice(0,-4)}-prompt.json`)fail('Head material paths must bind the exact actor/version');
  if(m.width<4||m.height<4||m.width*m.height>20_000_000)fail('Head turn canvas must fit a bounded 4x4 grid');
  if(m.transparentPixels<=0||m.transparentPixels+m.visiblePixels>m.width*m.height||m.opaquePixels>m.visiblePixels)fail('Invalid measured alpha counts');
  m.cells.forEach((c,i)=>{
    const {x,y,width:cw,height:ch}=headTurnCellRegion(m.width,m.height,i+1);
    if(c.index!==i+1||c.region.x!==x||c.region.y!==y||c.region.width!==cw||c.region.height!==ch)fail('Cells must partition the original canvas in row-major order');
    const b=c.visibleBounds;
    if(b.x<x||b.y<y||b.x+b.width>x+cw||b.y+b.height>y+ch||c.visiblePixels>b.width*b.height||c.edgePixels>c.visiblePixels)fail('Measured ink must belong to its own cell');
  });
  if(m.cells.reduce((n,c)=>n+c.visiblePixels,0)!==m.visiblePixels)fail('Head turn cell alpha counts differ');
});
export type HeadTurnMaterial=z.infer<typeof HeadTurnMaterialSchema>;
export type HeadTurnPrompt=z.infer<typeof HeadTurnPromptSchema>;
const Eye=z.union([z.object({visible:z.literal(true),center:HeadTurnPointSchema}).strict(),z.object({visible:z.literal(false),occludedBy:z.enum(['nose','face-contour','hair'])}).strict()]);
/** Absolute SOURCE pixel coordinates. Requested prompt yaw is never a measured
 * yaw, a pivot, an eye position, an anatomical side or approval evidence. */
export const HeadTurnDraftSchema=z.object({version:z.literal(HEAD_TURN_DRAFT_VERSION),actor:z.enum(['lila','karo']),file:HeadTurnFileSchema,sha256:Sha,materialFingerprint:Sha,
  width:z.number().int().positive(),height:z.number().int().positive(),coordinates:z.literal('absolute-source-pixels'),
  cells:z.array(z.object({index:z.number().int().min(1).max(16),yawDeg:z.number().finite().min(-90).max(90).optional(),
    neck:HeadTurnPointSchema.optional(),neckTop:HeadTurnPointSchema.optional(),chin:HeadTurnPointSchema.optional(),
    eyes:z.object({'screen-left':Eye.optional(),'screen-right':Eye.optional()}).strict().optional(),nose:HeadTurnPointSchema.optional(),mouth:HeadTurnPointSchema.optional(),
    faceContour:z.array(HeadTurnPointSchema).min(3).max(32).optional(),
    ponytailSide:z.enum(['anatomical-left','anatomical-right','behind','not-applicable']).optional(),
    review:z.enum(['unreviewed','needs-redraw','candidate']).default('unreviewed'),notes:z.string().max(2000).default(''),
  }).strict()).length(16),
  approved:z.literal(false),registered:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((d,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(d.width<4||d.height<4||d.width*d.height>20_000_000||!d.file.startsWith(d.actor+'-'))fail('Invalid head landmark actor/canvas');
  d.cells.forEach((c,i)=>{
    if(c.index!==i+1)fail('Head landmark cell identity/order changed');
    const {x,y,width:cw,height:ch}=headTurnCellRegion(d.width,d.height,i+1);
    const eyePoints=Object.values(c.eyes??{}).flatMap(e=>e.visible?[e.center]:[]);
    for(const p of [c.neck,c.neckTop,c.chin,c.nose,c.mouth,...eyePoints,...(c.faceContour??[])])if(p&&(p.x<x||p.x>=x+cw||p.y<y||p.y>=y+ch))fail(`Landmark leaves source cell${i+1}`);
    const l=c.eyes?.['screen-left'],r=c.eyes?.['screen-right'];
    if(l?.visible&&r?.visible&&l.center.x>=r.center.x)fail('Screen eye slots must not be swapped');
    if(c.neck&&c.neckTop&&c.neckTop.y>=c.neck.y)fail('Neck axis must go upward from the attachment');
    if(d.actor==='karo'&&c.ponytailSide&&c.ponytailSide!=='not-applicable'||d.actor==='lila'&&c.ponytailSide==='not-applicable')fail('Ponytail landmark belongs to the wrong actor');
  });
});
export type HeadTurnDraft=z.infer<typeof HeadTurnDraftSchema>;
export const HeadTurnSourceBindingSchema=z.object({actor:z.enum(['lila','karo']),file:HeadTurnFileSchema,sha256:Sha,materialFingerprint:Sha,width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const HeadTurnCheckRequestSchema=z.object({source:HeadTurnSourceBindingSchema,draft:HeadTurnDraftSchema}).strict();
