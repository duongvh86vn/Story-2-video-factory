import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {jsonSha256 as hash} from '../core/json-sha256.js';
import {bodyViewRegistrations} from './body-view-registration.js';
import {NativeHeadFaceSchema,validateNativeHeadFace,nativeHeadEyeRegistrations} from './native-head-face.js';
import {NativeHeadPaintSchema,validateNativeHeadPaint} from './native-head-paint.js';
import {NATIVE_HEAD_ACTORS,NATIVE_SUPPORTING_HEAD_BANK_VERSION,NATIVE_EMOTION_HEAD_BANK_VERSION,NATIVE_MOTION_HEAD_BANK_VERSION,NATIVE_OCCLUSION_HEAD_BANK_VERSION,nativeHeadIdentities,isNativeHeadFaceVersion} from './native-head-identity.js';

export const NATIVE_HEAD_BANK_VERSION='native-head-bank-1' as const;
const Sha=z.string().length(64).regex(/^[a-f0-9]{64}$/),Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const NativeHeadSourceFileSchema=z.string().regex(/^library\/topics\/prehistoric-life\/(?:head-turn-studies\/(?:lila|karo)-head-turn-v[1-9]\d*|(?:head-cells|head-face-plates)\/(?:lila|karo|prehistoric-male-bald|prehistoric-female-haired)-head-[a-z0-9][a-z0-9-]{0,39}-v[1-9]\d*)\.png$(?![\s\S])/);
const NativeHeadSourceSchema=z.object({file:NativeHeadSourceFileSchema,sha256:Sha,width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192),pixelScale:z.number().finite().min(.05).max(2).optional()}).strict();
export type NativeHeadSource=z.infer<typeof NativeHeadSourceSchema>;
const held=new Set(['fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87','1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0','965d9fb0f4e800144612bb4e3cd6ec6b482dad483c894980aea6fc61bbb4aaaf','035b9d42e3825b311b25b155ddfd646416f806b2ab9f28086aa706eb16295a4f','9946191d25bdb10c9729ba77e7112d66f4171a1dcec6b6ab55fdf05a794fdb21']);
// This local-mouth plate moved the chin tuft into the overlay and would
// duplicate the original beard detail; renaming cannot make it usable.
held.add('1f84f61a4bf5e69c45903626df91517091013f16aa3bbc5bec52aa14609227b2');
// Human replaced this bearded supporting male with the clean-face v2. It
// cannot become a new directional head by copying/renaming its original PNG.
held.add('f2995c6f6289f9c6e3b33b872ae40f70daef58cc312f34d641bb6dbcecce83ca');
// New front-to-profile studies still have margin/identity/spacing defects and
// no own per-cell registration. File renaming does not repair the source art.
held.add('b2b0c90dbe66f8fefb61c8851920dcbb59b8932cc45dbab77694adcf74f45cde');
held.add('7346a6bcc4fa0e33f23ae79dd134ddbb832424ebb1e32ba3ba59b2db069de692');
/** An explicit engineering source registration, distinct from the incomplete
 * landmark draft, artistic approval or production rig. Held studies cannot
 * enter this contract, even under a renamed path. */
export const NativeHeadBankDefinitionSchema=z.object({version:z.enum([NATIVE_HEAD_BANK_VERSION,'native-head-bank-2','native-head-bank-3',NATIVE_SUPPORTING_HEAD_BANK_VERSION,NATIVE_EMOTION_HEAD_BANK_VERSION,NATIVE_MOTION_HEAD_BANK_VERSION,NATIVE_OCCLUSION_HEAD_BANK_VERSION]),id:Id,actor:z.enum(NATIVE_HEAD_ACTORS),
  source:NativeHeadSourceSchema,
  additionalSources:z.array(z.object({id:Id,...NativeHeadSourceSchema.shape}).strict()).max(23).optional(),
  primary:z.object({file:z.string(),sha256:Sha}).strict(),
  bodyViews:z.array(z.object({view:z.enum(['three-quarter-left','three-quarter-right']),sourceHash:Sha}).strict()).min(1).max(2),
  unitScale:z.number().finite().min(.05).max(2),
  cells:z.array(z.object({id:Id,sourceId:Id.optional(),crop:Rect,neck:Point,neckTop:Point,chin:Point,eyeTarget:Point,skull:Rect,yawDeg:z.number().finite().min(-90).max(90).nullable(),
    seam:z.array(Point).min(3).max(32),restMood:z.enum(['neutral','happy']),face:NativeHeadFaceSchema.optional(),paint:NativeHeadPaintSchema.optional(),
  }).strict()).min(1).max(40),
  routes:z.array(z.array(Id).min(2).max(40)).max(40),
  capabilities:z.object({speech:z.boolean(),directionalEyes:z.boolean(),expressions:z.boolean(),secondary:z.boolean()}).strict(),
  status:z.literal('engineering-source-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((b,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  const faceVersion=isNativeHeadFaceVersion(b.version),identity=nativeHeadIdentities[b.actor];
  const occlusionVersion=b.version===NATIVE_OCCLUSION_HEAD_BANK_VERSION,motionVersion=b.version===NATIVE_MOTION_HEAD_BANK_VERSION||occlusionVersion,emotionVersion=b.version===NATIVE_EMOTION_HEAD_BANK_VERSION||motionVersion;
  if(b.cells.some(c=>'paint' in c)&&(!emotionVersion||b.cells.some(c=>!c.paint)))fail('Source paint requires an explicit complete bank5/6 partition; legacy registrations retain their bytes');
  if(motionVersion){
    if(b.cells.some(c=>c.paint?.version!=='native-head-paint-2')||b.capabilities.secondary!==b.cells.some(c=>c.paint?.rear.length))fail('Bank6 requires complete own paint2 and exact rear motion capability');
  }else if(b.capabilities.secondary||b.cells.some(c=>c.paint?.version==='native-head-paint-2'))fail('Only explicit bank6 may enable own source rear motion; bank1-5 retain no secondary capability');
  if(!emotionVersion&&identity.supporting!==(b.version===NATIVE_SUPPORTING_HEAD_BANK_VERSION))fail('Supporting head identity requires its own version 4 bank; principal banks retain versions 1–3');
  if(occlusionVersion){
    if(!b.capabilities.expressions||b.cells.some(c=>c.face?.version!=='native-head-face-3'||!c.face.emotions||c.restMood!=='happy'))fail('Bank7 requires complete own face3 visibility/emotions from a happy source rest');
  }else{
    if(b.cells.some(c=>c.face?.version==='native-head-face-3'))fail('Source-occluded faces require explicit bank7; legacy bank1-6 remain unchanged');
    if(emotionVersion?(!b.capabilities.expressions||b.cells.some(c=>c.face?.version!=='native-head-face-2'||!c.face.emotions||c.restMood!=='happy')):(b.capabilities.expressions||b.cells.some(c=>c.face?.version==='native-head-face-2')))fail('Only explicit bank5/6 may declare complete own face2 emotions from a happy source rest; legacy bank bytes retain their capabilities');
  }
  if(!faceVersion&&(b.cells.length<2||!b.routes.length||b.cells.some(c=>c.yawDeg===null||'face' in c)||b.capabilities.speech||b.capabilities.directionalEyes))fail('Legacy head banks require numeric turn cells and forbid source-face capabilities');
  if(faceVersion&&b.cells.length===1&&b.routes.length)fail('A single fixed source-angle cell cannot declare head turns');
  if(faceVersion&&b.cells.length>1&&(!b.routes.length||b.cells.some(c=>c.yawDeg===null)))fail('Multiple source cells need numeric measured angles and real routes');
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
    if(b.version!==NATIVE_HEAD_BANK_VERSION&&s.pixelScale===undefined)fail('Multi-source head sources require explicit pixelScale');
    if(s.file.includes('/head-face-plates/')&&(!faceVersion||b.cells.some(c=>c.sourceId===s.id)))fail('Closed-mouth plates may supply only local source-face mouth patches, never a whole face cell');
  }
  if(sources.reduce((sum,s)=>sum+s.width*s.height,0)>40_000_000)fail('Head bank sources exceed aggregate pixel limit');
  if(b.primary.file!==identity.primary.file)fail('Head bank source and identity must belong to the same actor');
  if(b.primary.sha256!==identity.primary.sha256)fail('Head bank primary source changed');
  if(new Set(b.bodyViews.map(v=>v.view)).size!==b.bodyViews.length)fail('Duplicate compatible body view');
  for(const v of b.bodyViews)if(bodyViewRegistrations[identity.bodyTemplate][v.view].sha256!==v.sourceHash)fail('Head bank body compatibility source changed');
  const cells=new Map(b.cells.map(c=>[c.id,c]));if(cells.size!==b.cells.length)fail('Duplicate head cell identity');
  const sourceId=(c:typeof b.cells[number])=>c.sourceId??(b.version===NATIVE_HEAD_BANK_VERSION?'primary':undefined);
  const usedSources=new Set([...b.cells.map(sourceId),...b.cells.flatMap(c=>c.face?.mouth.rest?[c.face.mouth.rest.sourceId]:[]),...b.cells.flatMap(c=>c.face?.emotions?[c.face.emotions.mouth.repair.sourceId]:[])]);
  if(sources.some(s=>!usedSources.has(s.id)))fail('Head bank contains an unused source');
  const inside=(p:{x:number;y:number},r:{x:number;y:number;width:number;height:number})=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
  for(const [i,c] of b.cells.entries()){
    const id=sourceId(c),source=id===undefined?undefined:sourceById.get(id);
    if(id===undefined)fail('Multi-source head cells require explicit sourceId');
    else if(!source)fail('Head cell refers to an unknown source');
    if(source&&(c.crop.x+c.crop.width>source.width||c.crop.y+c.crop.height>source.height))fail('Head crop leaves source PNG');
    for(const p of [c.neck,c.neckTop,c.chin,c.eyeTarget,...c.seam])if(!inside(p,c.crop))fail('Head landmark/overlap contour leaves its source crop');
    if(c.neckTop.y>=c.neck.y)fail('Head neck axis is inverted');
    if(c.paint&&source){try{validateNativeHeadPaint(c.paint,source,c);}catch(error){fail(error instanceof Error?error.message:String(error));}}
    if(c.face&&source){
      try{validateNativeHeadFace(c.face,source,c.crop);}catch(error){fail(error instanceof Error?error.message:String(error));}
      if(occlusionVersion){
        const eyes=nativeHeadEyeRegistrations(c.face),anchor={x:eyes.reduce((n,[,e])=>n+e.center.x,0)/eyes.length,y:eyes.reduce((n,[,e])=>n+e.center.y,0)/eyes.length};
        if(c.eyeTarget.x!==anchor.x||c.eyeTarget.y!==anchor.y)fail('Bank7 eye target must be the actual visible eye center or both visible centers midpoint');
      }
      if(c.face.mouth.kind!==identity.mouthKind)fail('Actor mouth requires its own source-face kind');
      if(c.face.mouth.rest){const r=c.face.mouth.rest,plate=sourceById.get(r.sourceId);if(!plate||plate.sha256!==r.source.sha256||plate.width!==r.source.width||plate.height!==r.source.height||!plate.file.includes('/head-face-plates/'))fail('Closed-mouth patch source differs from its registered bank resource');}
      if(c.face.emotions){const r=c.face.emotions.mouth.repair,paint=sourceById.get(r.sourceId);
        if(!paint||paint.sha256!==r.source.sha256||paint.width!==r.source.width||paint.height!==r.source.height||r.sourceId!==id&&r.sourceId!==c.face.mouth.rest?.sourceId)fail('Emotion repair must use this cell or its own registered closed-mouth plate');
      }
    }
    if(!inside(c.skull,c.crop)||c.skull.x+c.skull.width>c.crop.x+c.crop.width||c.skull.y+c.skull.height>c.crop.y+c.crop.height||!inside(c.eyeTarget,c.skull))fail('Head skull/eye anchor leaves its registered crop');
    for(const other of b.cells.slice(i+1))if(id!==undefined&&id===sourceId(other)&&c.crop.x<other.crop.x+other.crop.width&&other.crop.x<c.crop.x+c.crop.width&&c.crop.y<other.crop.y+other.crop.height&&other.crop.y<c.crop.y+c.crop.height)fail('Head cells overlap in source image');
  }
  if(faceVersion){const complete=b.cells.every(c=>c.face!==undefined);if(!complete||!b.capabilities.speech||!b.capabilities.directionalEyes)fail('Source-face capabilities require complete registrations for every cell');}
  for(const route of b.routes){
    if(new Set(route).size!==route.length)fail('Head route repeats a cell; declare the reverse route separately');
    const sequence=route.map(id=>cells.get(id));if(sequence.some(c=>!c))fail('Head route contains an unknown source cell');
    let sign=0;
    for(let i=1;i<sequence.length;i++){const a=sequence[i-1],c=sequence[i];if(!a||!c)continue;if(a.yawDeg===null||c.yawDeg===null){fail('Unknown-angle source cannot enter a turn route');continue;}const delta=c.yawDeg-a.yawDeg,next=Math.sign(delta);
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
  sourceVersions:[NATIVE_HEAD_BANK_VERSION,'native-head-bank-2','native-head-bank-3',NATIVE_SUPPORTING_HEAD_BANK_VERSION,NATIVE_EMOTION_HEAD_BANK_VERSION,NATIVE_MOTION_HEAD_BANK_VERSION,NATIVE_OCCLUSION_HEAD_BANK_VERSION],
  sourceVisibility:'Explicit bank7/face3 retains protected own-source occluded eye/brow contours; hidden features have no glyph/strip/center or animation channel; visible eyes own gaze target. Declarations are not optical or art acceptance.',
  modelIdentities:nativeHeadIdentities,
  method:'registered source cell at the original discrete head clock; single atlas or explicitly bound source images, fixed source pixel density and uniform global neck attachment, native eye/chin geometry; no pose-dependent scaling, whole-face warp, reflection or double-face crossfade',
  productionReady:false,approved:false,motionVerified:false,availableBanks:[],
  pending:['faithful artwork, source identity and correspondence; Lila V1-V4 and Karo V1-V3 held','bank3/4 local speech/eyes painter and geometry are source candidates; real registration/closed-mouth seam/normal-speed verification pending','bank5 own source emotions are authored candidates; geometry, skin/ink masks and normal-speed reactions unverified; supporting own emotion drawings pending','explicit bank5 source-paint and bank6 own rear follow authored; bank7/face3 source occlusion contract has no actual registered cell yet; geometry/alpha seams/body occlusion/mesh/history/normal-speed motion unverified; full hair/cloth art and continuous turns pending','continuous chin-contact and observer-gaze correspondence across cell changes; current combinations blocked','neck overlap/painter seam masks and compatible body turns','actual head/body turn and normal-speed video review','whole arbitrary-story/script/WAV factory acceptance']};
