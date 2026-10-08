import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {jsonSha256 as hash} from '../core/json-sha256.js';
import {bodyViewRegistrations} from './body-view-registration.js';

export const NATIVE_HEAD_BANK_VERSION='native-head-bank-1' as const;
const Sha=z.string().length(64).regex(/^[a-f0-9]{64}$/),Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const NativeHeadSourceFileSchema=z.string().regex(/^library\/topics\/prehistoric-life\/(?:head-turn-studies\/(?:lila|karo)-head-turn-v[1-9]\d*|head-cells\/(?:lila|karo)-head-[a-z0-9][a-z0-9-]{0,39}-v[1-9]\d*)\.png$(?![\s\S])/);
const NativeHeadSourceSchema=z.object({file:NativeHeadSourceFileSchema,sha256:Sha,width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192),pixelScale:z.number().finite().min(.05).max(2).optional()}).strict();
export type NativeHeadSource=z.infer<typeof NativeHeadSourceSchema>;
const held=new Set(['fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87','1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0','965d9fb0f4e800144612bb4e3cd6ec6b482dad483c894980aea6fc61bbb4aaaf','035b9d42e3825b311b25b155ddfd646416f806b2ab9f28086aa706eb16295a4f','9946191d25bdb10c9729ba77e7112d66f4171a1dcec6b6ab55fdf05a794fdb21']);
/** An explicit engineering source registration, distinct from the incomplete
 * landmark draft, artistic approval or production rig. Held studies cannot
 * enter this contract, even under a renamed path. */
export const NativeHeadBankDefinitionSchema=z.object({version:z.enum([NATIVE_HEAD_BANK_VERSION,'native-head-bank-2']),id:Id,actor:z.enum(['lila','karo']),
  source:NativeHeadSourceSchema,
  additionalSources:z.array(z.object({id:Id,...NativeHeadSourceSchema.shape}).strict()).max(23).optional(),
  primary:z.object({file:z.string(),sha256:Sha}).strict(),
  bodyViews:z.array(z.object({view:z.enum(['three-quarter-left','three-quarter-right']),sourceHash:Sha}).strict()).min(1).max(2),
  unitScale:z.number().finite().min(.05).max(2),
  cells:z.array(z.object({id:Id,sourceId:Id.optional(),crop:Rect,neck:Point,neckTop:Point,chin:Point,eyeTarget:Point,skull:Rect,yawDeg:z.number().finite().min(-90).max(90),
    seam:z.array(Point).min(3).max(32),restMood:z.enum(['neutral','happy']),
  }).strict()).min(2).max(40),
  routes:z.array(z.array(Id).min(2).max(40)).min(1).max(40),
  capabilities:z.object({speech:z.literal(false),directionalEyes:z.literal(false),expressions:z.literal(false),secondary:z.literal(false)}).strict(),
  status:z.literal('engineering-source-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((b,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(b.version===NATIVE_HEAD_BANK_VERSION){
    // Reject field presence even when its value is explicitly undefined. No
    // defaults or added keys may change version 1 canonical registration bytes.
    if('pixelScale' in b.source||'additionalSources' in b||b.cells.some(c=>'sourceId' in c))fail('Version 1 head banks forbid multi-source fields');
    if(!b.source.file.includes('/head-turn-studies/'))fail('Version 1 head banks require the original head-turn atlas path');
  }
  const sources=[{id:'primary',...b.source},...(b.additionalSources??[])],sourceById=new Map(sources.map(s=>[s.id,s]));
  if(sourceById.size!==sources.length||(b.additionalSources??[]).some(s=>s.id==='primary'))fail('Duplicate or reserved head source identity');
  if(new Set(sources.map(s=>s.file)).size!==sources.length)fail('Duplicate head source filename');
  if(new Set(sources.map(s=>s.sha256)).size!==sources.length)fail('Head source SHA aliases are forbidden');
  for(const s of sources){
    if(held.has(s.sha256)||/\/head-turn-studies\/(?:lila|karo)-head-turn-v[12]\.png$/.test(s.file)||/\/head-turn-studies\/lila-head-turn-v3\.png$/.test(s.file))fail('Held head art cannot be registered as a turn bank');
    if(!s.file.split('/').at(-1)!.startsWith(b.actor+'-head-'))fail('Head bank source and identity must belong to the same actor');
    if(s.width*s.height>20_000_000)fail('Head bank source exceeds pixel limit');
    if(b.version==='native-head-bank-2'&&s.pixelScale===undefined)fail('Version 2 head sources require explicit pixelScale');
  }
  if(sources.reduce((sum,s)=>sum+s.width*s.height,0)>40_000_000)fail('Head bank sources exceed aggregate pixel limit');
  if(b.primary.file!==`docs/topics/assets/reference-${b.actor}-full.png`)fail('Head bank source and identity must belong to the same actor');
  const primaryHashes={lila:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',karo:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2'};
  if(b.primary.sha256!==primaryHashes[b.actor])fail('Head bank primary source changed');
  if(new Set(b.bodyViews.map(v=>v.view)).size!==b.bodyViews.length)fail('Duplicate compatible body view');
  for(const v of b.bodyViews)if(bodyViewRegistrations[b.actor][v.view].sha256!==v.sourceHash)fail('Head bank body compatibility source changed');
  const cells=new Map(b.cells.map(c=>[c.id,c]));if(cells.size!==b.cells.length)fail('Duplicate head cell identity');
  const sourceId=(c:typeof b.cells[number])=>c.sourceId??(b.version===NATIVE_HEAD_BANK_VERSION?'primary':undefined);
  const usedSources=new Set(b.cells.map(sourceId));
  if(sources.some(s=>!usedSources.has(s.id)))fail('Head bank contains an unused source');
  const inside=(p:{x:number;y:number},r:{x:number;y:number;width:number;height:number})=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
  for(const [i,c] of b.cells.entries()){
    const id=sourceId(c),source=id===undefined?undefined:sourceById.get(id);
    if(id===undefined)fail('Version 2 head cells require explicit sourceId');
    else if(!source)fail('Head cell refers to an unknown source');
    if(source&&(c.crop.x+c.crop.width>source.width||c.crop.y+c.crop.height>source.height))fail('Head crop leaves source PNG');
    for(const p of [c.neck,c.neckTop,c.chin,c.eyeTarget,...c.seam])if(!inside(p,c.crop))fail('Head landmark/overlap contour leaves its source crop');
    if(c.neckTop.y>=c.neck.y)fail('Head neck axis is inverted');
    if(!inside(c.skull,c.crop)||c.skull.x+c.skull.width>c.crop.x+c.crop.width||c.skull.y+c.skull.height>c.crop.y+c.crop.height||!inside(c.eyeTarget,c.skull))fail('Head skull/eye anchor leaves its registered crop');
    for(const other of b.cells.slice(i+1))if(id!==undefined&&id===sourceId(other)&&c.crop.x<other.crop.x+other.crop.width&&other.crop.x<c.crop.x+c.crop.width&&c.crop.y<other.crop.y+other.crop.height&&other.crop.y<c.crop.y+c.crop.height)fail('Head cells overlap in source image');
  }
  for(const route of b.routes){
    if(new Set(route).size!==route.length)fail('Head route repeats a cell; declare the reverse route separately');
    const sequence=route.map(id=>cells.get(id));if(sequence.some(c=>!c))fail('Head route contains an unknown source cell');
    let sign=0;
    for(let i=1;i<sequence.length;i++){const a=sequence[i-1],c=sequence[i];if(!a||!c)continue;const delta=c.yawDeg-a.yawDeg,next=Math.sign(delta);
      if(!next||Math.abs(delta)>9||sign&&sign!==next)fail('Head route needs distinct monotonic small-angle source drawings');sign=next;
      const aId=sourceId(a),cId=sourceId(c),aSource=aId===undefined?undefined:sourceById.get(aId),cSource=cId===undefined?undefined:sourceById.get(cId);
      if(aSource&&cSource){const ratio=(cSource.pixelScale??1)**2*c.skull.width*c.skull.height/((aSource.pixelScale??1)**2*a.skull.width*a.skull.height);if(ratio<.8||ratio>1.25)fail('Head skull scale changes abruptly along route');}
    }
  }
});
export const NativeHeadBankSchema=NativeHeadBankDefinitionSchema.innerType().extend({fingerprint:Sha}).superRefine((b,ctx)=>{
  const {fingerprint,...value}=b,parsed=NativeHeadBankDefinitionSchema.safeParse(value);
  if(!parsed.success)for(const issue of parsed.error.issues)ctx.addIssue(issue);
  else if(fingerprint!==hash(parsed.data))ctx.addIssue({code:'custom',message:'Native head bank registration fingerprint changed'});
});
export type NativeHeadBank=z.infer<typeof NativeHeadBankSchema>;
export function nativeHeadBank(input:z.infer<typeof NativeHeadBankDefinitionSchema>):NativeHeadBank{const bank=NativeHeadBankDefinitionSchema.parse(input);return NativeHeadBankSchema.parse({...bank,fingerprint:hash(bank)});}
/** Metadata only: primary is the implicit base image ID, not art acceptance. */
export function nativeHeadSources(bank:NativeHeadBank):Array<NativeHeadSource&{id:string}>{
  if(!bank.source)throw new Error('Native head bank is missing its primary source');
  return [{id:'primary',...bank.source},...(bank.additionalSources??[]).map(s=>({...s}))];
}
export function nativeHeadSourceForCell(bank:NativeHeadBank,cell:NativeHeadBank['cells'][number]):NativeHeadSource&{id:string}{
  const id=cell.sourceId??(bank.version===NATIVE_HEAD_BANK_VERSION?'primary':undefined);
  if(id===undefined)throw new Error('Native head cell is missing its source ID');
  const source=nativeHeadSources(bank).find(s=>s.id===id);
  if(!source)throw new Error('Native head cell refers to an unknown source: '+id);
  return source;
}
/** Fixed image pixel density times the one global attachment unit scale. */
export function nativeHeadPixelScale(bank:NativeHeadBank,cell:NativeHeadBank['cells'][number]):number{return bank.unitScale*(nativeHeadSourceForCell(bank,cell).pixelScale??1);}
export const nativeHeadBankDescription={version:NATIVE_HEAD_BANK_VERSION,selection:'appearance.bodyHeadBank + performance.sourceHead',
  sourceVersions:[NATIVE_HEAD_BANK_VERSION,'native-head-bank-2'],
  method:'registered source cell at the original discrete head clock; single atlas or explicitly bound source images, fixed source pixel density and uniform global neck attachment, native eye/chin geometry; no pose-dependent scaling, whole-face warp, reflection or double-face crossfade',
  productionReady:false,approved:false,motionVerified:false,availableBanks:[],
  pending:['faithful artwork, source identity and correspondence; Lila V1-V3 and Karo V1-V2 held','per-cell speech, eyes, emotions and secondary hair/occlusion artwork capabilities','continuous chin-contact and observer-gaze correspondence across cell changes; current combinations blocked','neck overlap/painter seam masks and compatible body turns','actual head/body turn and normal-speed video review','whole arbitrary-story/script/WAV factory acceptance']};
