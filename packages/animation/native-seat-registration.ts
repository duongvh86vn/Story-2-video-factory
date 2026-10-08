import {z} from 'zod';
import {hash} from '../core/utils.js';
import {clothTriangleArea,type ClothTriangle} from './view-cloth-geometry.js';
import document from '../../library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json' with {type:'json'};
import lila from '../../library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.json' with {type:'json'};
import karo from '../../library/topics/prehistoric-life/native-seat-v1/karo-seated-folds-v1.json' with {type:'json'};
import {bodyViewRegistrations} from './body-view-registration.js';
import {nativeClothBindings} from './body-view-cloth-binding.js';

const Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const Triangle=z.tuple([Point,Point,Point]),Sha=z.string().regex(/^[a-f0-9]{64}$/);
const Rect=z.object({x:z.number().int().nonnegative(),y:z.number().int().nonnegative(),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const Image=z.object({file:z.string(),sha256:Sha,width:z.number().int().positive(),height:z.number().int().positive()}).strict();
const View=z.object({standing:Image.extend({pelvis:Point,bodyScale:z.number().finite().positive(),waist:z.number().finite()}),tileId:z.string(),region:Rect,seatWaist:z.number().int().nonnegative(),
  waist:z.object({left:Point,right:Point}).strict(),uv:z.object({rest:z.array(Point).length(16),seat:z.array(Point).length(16)}).strict(),
  outline:z.object({rest:z.array(Point).length(50),seat:z.array(Point).length(50),target:z.array(Point).length(50)}).strict(),
  pieces:z.array(z.object({rest:Triangle,seat:Triangle,target:Triangle}).strict()).min(1).max(400),minimumTriangleArea:z.number().finite().positive(),seatScale:z.number().finite().positive()}).strict();

/** Exact quadratic minimum for a static linear correspondence. This proves
 * undeformed registration geometry only, not a sampled motion or a video. */
export function nativeSeatMinimumArea(from:ClothTriangle,to:ClothTriangle){
  const area=(t:number)=>clothTriangleArea(from.map((p,i)=>({x:p.x+(to[i]!.x-p.x)*t,y:p.y+(to[i]!.y-p.y)*t})) as unknown as ClothTriangle)/2;
  const start=area(0),end=area(1),mid=area(.5),a=2*(end+start-2*mid),b=end-start-a,t=a>0?-b/(2*a):-1;
  return Math.min(start,end,...(t>0&&t<1?[area(t)]:[]));
}
export const NativeSeatCorrespondenceSchema=z.object({version:z.literal('native-seat-correspondence-1'),status:z.literal('candidate-geometry'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),method:z.string().min(1),
  actors:z.object({lila:z.object({material:Image,primary:z.object({file:z.string(),sha256:Sha,role:z.literal('primary-character-identity')}).strict(),views:z.object({'three-quarter-right':View,'three-quarter-left':View}).strict()}).strict(),
    karo:z.object({material:Image,primary:z.object({file:z.string(),sha256:Sha,role:z.literal('primary-character-identity')}).strict(),views:z.object({'three-quarter-right':View,'three-quarter-left':View}).strict()}).strict()}).strict()
}).strict().superRefine((record,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  for(const actor of ['lila','karo'] as const){
    const data=record.actors[actor],material=actor==='lila'?lila:karo;
    if(hash(data.material)!==hash({file:material.file,sha256:material.sha256,width:material.width,height:material.height})||hash(data.primary)!==hash(material.references[0]))fail('needs-view-seat: wrong actor/atlas/primary binding');
    for(const view of ['three-quarter-right','three-quarter-left'] as const){
      const c=data.views[view],tile=material.tiles.find(t=>t.view===view)!,reference=material.references.find(r=>r.role==='native-'+view)!;
      if(c.tileId!==tile.id||hash(c.region)!==hash(tile.region)||c.standing.file!==reference.file||c.standing.sha256!==reference.sha256)fail('needs-view-seat: wrong native view/tile registration');
      const source=bodyViewRegistrations[actor][view],expected={file:source.file,sha256:source.sha256,width:source.width,height:source.height,pelvis:source.pelvis,bodyScale:source.bodyScale,waist:nativeClothBindings[actor][view].waist};
      if(hash(c.standing)!==hash(expected))fail('needs-view-seat: image-space attachment/waist registration differs');
      const inside=(p:{x:number;y:number},r:{x:number;y:number;width:number;height:number})=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
      const sourceRegion={x:0,y:c.standing.waist,width:c.standing.width,height:c.standing.height-c.standing.waist};
      for(const p of [...c.outline.rest,...c.pieces.flatMap(p=>p.rest)])if(!inside(p,sourceRegion))fail('needs-view-seat: standing UV outside lower garment');
      for(const p of [...c.outline.seat,...c.pieces.flatMap(p=>p.seat)])if(!inside(p,c.region)||p.y<c.seatWaist)fail('needs-view-seat: seated UV outside its independently authored tile');
      for(let i=0;i<=8;i++)if(Math.abs(c.outline.rest[i]!.x-c.outline.target[i]!.x)>1e-7||Math.abs(c.outline.rest[i]!.y-c.outline.target[i]!.y)>1e-7)fail('needs-view-seat: waist edge must stay pinned');
      const minimum=Math.min(...c.pieces.map(p=>nativeSeatMinimumArea(p.rest,p.target)));
      if(minimum<=1e-7||Math.abs(minimum-c.minimumTriangleArea)>1e-7||c.pieces.some(p=>clothTriangleArea(p.rest)<=0||clothTriangleArea(p.seat)<=0))fail('needs-view-seat: singular/inverted UV or inconsistent static area evidence');
    }
  }
});
// Private parsed document. Callers receive detached geometry; no exported
// description or inventory may mutate the production binding through a reference.
const registration=NativeSeatCorrespondenceSchema.parse(document);
export const nativeSeatRegistration=()=>structuredClone(registration);
export const nativeSeatRegistrationFingerprint=hash(registration);
