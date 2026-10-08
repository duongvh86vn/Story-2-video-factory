import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {hash} from '../core/utils.js';
import {bodyViewRegistrations} from '../animation/body-view-art.js';
import lila from '../../library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.json' with {type:'json'};
import karo from '../../library/topics/prehistoric-life/native-seat-v1/karo-seated-folds-v1.json' with {type:'json'};

export const NATIVE_SEAT_MATERIAL_VERSION='native-seat-material-1' as const;
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const Sha=z.string().regex(/^[0-9a-f]{64}$/),Count=z.number().int().nonnegative();
export const NativeSeatMaterialSchema=z.object({
  version:z.literal(NATIVE_SEAT_MATERIAL_VERSION),actor:z.enum(['lila','karo']),file:z.string(),sha256:Sha,width:z.number().int().positive(),height:z.number().int().positive(),
  hasAlpha:z.literal(true),alphaThreshold:z.literal(8),transparentPixels:Count,opaquePixels:Count,
  alphaBands:z.array(z.object({min:Count,max:Count,pixels:Count}).strict()).length(8),
  tiles:z.array(z.object({id:z.string(),view:z.enum(['three-quarter-right','three-quarter-left']),facing:z.enum(['right','left']),region:Rect,visibleBounds:Rect,nonzeroAlphaPixels:z.number().int().positive()}).strict()).length(2),
  references:z.array(z.object({file:z.string(),sha256:Sha,role:z.enum(['primary-character-identity','native-three-quarter-right','native-three-quarter-left','legacy-seated-construction-reference'])}).strict()).length(4),
  promptFile:z.string(),shape:z.string(),status:z.literal('candidate-material-unregistered'),approved:z.literal(false),productionReady:z.literal(false),registered:z.literal(false),motionVerified:z.literal(false),limits:z.array(z.string()).min(1),
}).strict().superRefine((record,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message}),base=`library/topics/prehistoric-life/native-seat-v1/${record.actor}-seated-folds-v1`;
  if(record.file!==base+'.png'||record.promptFile!==base+'-prompt.json')fail('Native seat material paths must belong to their exact actor/version');
  const split=Math.floor(record.width/2),total=record.width*record.height;
  if(record.transparentPixels<=0||record.opaquePixels>total||record.alphaBands.reduce((n,b)=>n+b.pixels,record.transparentPixels)!==total)fail('Native seat alpha counts must cover the original image');
  const ranges=[[1,7],[8,63],[64,127],[128,191],[192,239],[240,249],[250,254],[255,255]];
  record.alphaBands.forEach((b,i)=>{if(b.min!==ranges[i]![0]||b.max!==ranges[i]![1])fail('Native seat alpha bands must retain measured ranges');});
  if(record.alphaBands[7]!.pixels!==record.opaquePixels)fail('Native seat opaque pixel count differs');
  record.tiles.forEach((tile,i)=>{
    const view=i===0?'three-quarter-right':'three-quarter-left',facing=i===0?'right':'left',region={x:i===0?0:split,y:0,width:i===0?split:record.width-split,height:record.height};
    if(tile.view!==view||tile.facing!==facing||tile.id!==`${record.actor}-native-seat-${facing}`||hash(tile.region)!==hash(region))fail('Native seat tiles must retain independent actor/view ownership and complete atlas partition');
    const b=tile.visibleBounds;
    if(b.x<=region.x||b.y<=region.y||b.x+b.width>=region.x+region.width||b.y+b.height>=region.y+region.height||tile.nonzeroAlphaPixels>b.width*b.height)fail('Native seat visible ink must fit its tile with clear margin');
  });
  const visiblePixels=record.alphaBands.filter(b=>b.min>=8).reduce((n,b)=>n+b.pixels,0);
  if(record.tiles.reduce((n,t)=>n+t.nonzeroAlphaPixels,0)!==visiblePixels)fail('Native seat tile alpha counts differ');
  const roles=['primary-character-identity','native-three-quarter-right','native-three-quarter-left','legacy-seated-construction-reference'];
  record.references.forEach((ref,i)=>{
    if(ref.role!==roles[i])fail('Native seat references must retain their distinct roles');
    if(i===0&&ref.file!==`docs/topics/assets/reference-${record.actor}-full.png`)fail('Native seat primary identity belongs to another actor');
    if(i===1||i===2){const source=bodyViewRegistrations[record.actor][i===1?'three-quarter-right':'three-quarter-left'];if(ref.file!==source.file||ref.sha256!==source.sha256)fail('Native seat standing registration changed; new correspondence required');}
    if(i===3&&ref.file!==`library/topics/prehistoric-life/rig-v1/${record.actor}-seated-garment-${record.actor==='lila'?'v1':'v2'}.png`)fail('Native seat construction reference belongs to another actor/version');
  });
});
export type NativeSeatMaterial=z.infer<typeof NativeSeatMaterialSchema>;
const materials=([lila,karo] as const).map(record=>NativeSeatMaterialSchema.parse(record));
/** Returns detached static records. Availability is not pose/UV registration,
 * scene selection, approval or production readiness. No motion is sampled. */
export function nativeSeatMaterialCandidates():NativeSeatMaterial[]{return structuredClone(materials);}
export const nativeSeatArtDescription=Object.freeze({version:NATIVE_SEAT_MATERIAL_VERSION,fingerprint:hash(materials),
  actors:['lila','karo'] as const,views:['three-quarter-right','three-quarter-left'] as const,materialCount:2,tileCount:4,
  purpose:'separate native seated lower-garment fold materials; primary faces, hair, torso and belts stay on their original layers',
  sourcePolicy:'exact PNG bytes and primary/native/construction reference hashes; requested independent view tiles, no code reflection; generated perspective/identity compliance still needs visual review',
  alphaPolicy:'transparent source pixels are retained; most painted alpha is250–254; common surface must stay opaque beneath internal material blending',
  selection:null,registered:false,approved:false,productionReady:false,motionVerified:false,
  pending:['semantic standing/seated UV/contour correspondence and original support contact','native sit/rise/walk plus original camera-run clock','colour/identity/seam/cuff/hem acceptance and normal-speed video']});

/** Reads hashes and static PNG alpha metadata only. Does not execute any
 * pose/body/renderer helper or rewrite image bytes. Missing/stale art fails. */
export async function nativeSeatArtInventory(repo:string){
  const result=[];
  for(const record of materials){
    for(const ref of record.references){if(hash(await fs.readFile(path.join(repo,ref.file)))!==ref.sha256)throw new Error('Native seat reference changed: '+ref.file);}
    const prompt=JSON.parse(await fs.readFile(path.join(repo,record.promptFile),'utf8')) as {actor?:string;provider?:string;referenceImages?:unknown;approved?:boolean;productionReady?:boolean;registered?:boolean;runtimeVerified?:boolean;prompt?:string};
    if(prompt.actor!==record.actor||prompt.provider!=='builtin-imagegen'||hash(prompt.referenceImages)!==hash(record.references)||!prompt.prompt||prompt.approved!==false||prompt.productionReady!==false||prompt.registered!==false||prompt.runtimeVerified!==false)throw new Error('Native seat prompt provenance differs: '+record.actor);
    const bytes=await fs.readFile(path.join(repo,record.file));
    if(hash(bytes)!==record.sha256)throw new Error('Native seat material changed: '+record.file);
    const metadata=await sharp(bytes).metadata();
    if(metadata.width!==record.width||metadata.height!==record.height||!metadata.hasAlpha)throw new Error('Native seat material changed: '+record.file);
    const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});if(info.channels!==4)throw new Error('Native seat material must retain original RGBA: '+record.file);
    const histogram=new Array<number>(256).fill(0);
    for(let i=3;i<data.length;i+=4)histogram[data[i]!]!++;
    if(histogram[0]!==record.transparentPixels||record.alphaBands.some(b=>histogram.slice(b.min,b.max+1).reduce((n,c)=>n+c,0)!==b.pixels))throw new Error('Native seat alpha metadata differs: '+record.file);
    for(const tile of record.tiles){let left=record.width,right=-1,top=record.height,bottom=-1,pixels=0;
      for(let y=tile.region.y;y<tile.region.y+tile.region.height;y++)for(let x=tile.region.x;x<tile.region.x+tile.region.width;x++)if(data[(y*record.width+x)*4+3]!>=record.alphaThreshold){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);pixels++;}
      if(pixels!==tile.nonzeroAlphaPixels||hash({x:left,y:top,width:right-left+1,height:bottom-top+1})!==hash(tile.visibleBounds))throw new Error('Native seat tile alpha bounds differ: '+tile.id);
    }
    result.push({...structuredClone(record),promptSha256:hash(await fs.readFile(path.join(repo,record.promptFile))),productionAllowed:false});
  }
  return result;
}
