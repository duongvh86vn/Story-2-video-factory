import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {jsonSha256 as hash} from '../core/json-sha256.js';
import {bodyViewRegistrations} from './body-view-registration.js';

export const NATIVE_HEAD_BANK_VERSION='native-head-bank-1' as const;
const Sha=z.string().length(64).regex(/^[a-f0-9]{64}$/),Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const held=new Set(['fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87','1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0','965d9fb0f4e800144612bb4e3cd6ec6b482dad483c894980aea6fc61bbb4aaaf','035b9d42e3825b311b25b155ddfd646416f806b2ab9f28086aa706eb16295a4f']);
/** An explicit engineering source registration, distinct from the incomplete
 * landmark draft, artistic approval or production rig. V1/V2 studies cannot
 * enter this contract, even under a renamed path. */
export const NativeHeadBankDefinitionSchema=z.object({version:z.literal(NATIVE_HEAD_BANK_VERSION),id:Id,actor:z.enum(['lila','karo']),
  source:z.object({file:z.string().regex(/^library\/topics\/prehistoric-life\/head-turn-studies\/(lila|karo)-head-turn-v[1-9]\d*\.png$/),sha256:Sha,width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)}).strict(),
  primary:z.object({file:z.string(),sha256:Sha}).strict(),
  bodyViews:z.array(z.object({view:z.enum(['three-quarter-left','three-quarter-right']),sourceHash:Sha}).strict()).min(1).max(2),
  unitScale:z.number().finite().min(.05).max(2),
  cells:z.array(z.object({id:Id,crop:Rect,neck:Point,neckTop:Point,chin:Point,eyeTarget:Point,skull:Rect,yawDeg:z.number().finite().min(-90).max(90),
    seam:z.array(Point).min(3).max(32),restMood:z.enum(['neutral','happy']),
  }).strict()).min(2).max(40),
  routes:z.array(z.array(Id).min(2).max(40)).min(1).max(40),
  capabilities:z.object({speech:z.literal(false),directionalEyes:z.literal(false),expressions:z.literal(false),secondary:z.literal(false)}).strict(),
  status:z.literal('engineering-source-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((b,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(held.has(b.source.sha256)||/head-turn-v[12]\.png$/.test(b.source.file))fail('Held V1/V2 head art cannot be registered as a turn bank');
  if(!b.source.file.includes('/'+b.actor+'-head-turn-')||b.primary.file!==`docs/topics/assets/reference-${b.actor}-full.png`)fail('Head bank source and identity must belong to the same actor');
  const primaryHashes={lila:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',karo:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2'};
  if(b.primary.sha256!==primaryHashes[b.actor])fail('Head bank primary source changed');
  if(b.source.width*b.source.height>20_000_000)fail('Head bank source exceeds pixel limit');
  if(new Set(b.bodyViews.map(v=>v.view)).size!==b.bodyViews.length)fail('Duplicate compatible body view');
  for(const v of b.bodyViews)if(bodyViewRegistrations[b.actor][v.view].sha256!==v.sourceHash)fail('Head bank body compatibility source changed');
  const cells=new Map(b.cells.map(c=>[c.id,c]));if(cells.size!==b.cells.length)fail('Duplicate head cell identity');
  const inside=(p:{x:number;y:number},r:{x:number;y:number;width:number;height:number})=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
  for(const [i,c] of b.cells.entries()){
    if(c.crop.x+c.crop.width>b.source.width||c.crop.y+c.crop.height>b.source.height)fail('Head crop leaves source PNG');
    for(const p of [c.neck,c.neckTop,c.chin,c.eyeTarget,...c.seam])if(!inside(p,c.crop))fail('Head landmark/overlap contour leaves its source crop');
    if(c.neckTop.y>=c.neck.y)fail('Head neck axis is inverted');
    if(!inside(c.skull,c.crop)||c.skull.x+c.skull.width>c.crop.x+c.crop.width||c.skull.y+c.skull.height>c.crop.y+c.crop.height||!inside(c.eyeTarget,c.skull))fail('Head skull/eye anchor leaves its registered crop');
    for(const other of b.cells.slice(i+1))if(c.crop.x<other.crop.x+other.crop.width&&other.crop.x<c.crop.x+c.crop.width&&c.crop.y<other.crop.y+other.crop.height&&other.crop.y<c.crop.y+c.crop.height)fail('Head cells overlap in source image');
  }
  for(const route of b.routes){
    if(new Set(route).size!==route.length)fail('Head route repeats a cell; declare the reverse route separately');
    const sequence=route.map(id=>cells.get(id));if(sequence.some(c=>!c))fail('Head route contains an unknown source cell');
    let sign=0;
    for(let i=1;i<sequence.length;i++){const a=sequence[i-1],c=sequence[i];if(!a||!c)continue;const delta=c.yawDeg-a.yawDeg,next=Math.sign(delta);
      if(!next||Math.abs(delta)>9||sign&&sign!==next)fail('Head route needs distinct monotonic small-angle source drawings');sign=next;
      const ratio=c.skull.width*c.skull.height/(a.skull.width*a.skull.height);if(ratio<.8||ratio>1.25)fail('Head skull scale changes abruptly along route');
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
export const nativeHeadBankDescription={version:NATIVE_HEAD_BANK_VERSION,selection:'appearance.bodyHeadBank + performance.sourceHead',
  method:'registered source cell at the original discrete head clock; uniform neck attachment, native eye/chin geometry; no whole-face warp, reflection or double-face crossfade',
  productionReady:false,approved:false,motionVerified:false,availableBanks:[],
  pending:['faithful V3+ artwork and source correspondence; V1/V2 held','per-cell speech, eyes, emotions and hair/occlusion artwork capabilities','continuous chin-contact and observer-gaze correspondence across cell changes; current combinations blocked','neck overlap/painter seam masks and compatible body turns','actual head/body turn and normal-speed video review','whole arbitrary-story/script/WAV factory acceptance']};
