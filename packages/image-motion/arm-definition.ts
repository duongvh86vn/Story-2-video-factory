import {z} from 'zod';
import type {CharacterSourceRecipe,SourcePart} from './character-source.js';

const Point=z.object({x:z.number().finite().nonnegative(),y:z.number().finite().nonnegative()}).strict();
const Polygon=z.array(z.tuple([z.number().finite().nonnegative(),z.number().finite().nonnegative()])).min(3).max(128);
const Arm=z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,27}$/),erasePolygon:Polygon,shoulder:Point,elbow:Point,wrist:Point,width:z.number().finite().min(1).max(64),handWidth:z.number().finite().min(2).max(128),handHeight:z.number().finite().min(2).max(128),upperAngle:z.number().finite().min(-130).max(130),foreAngle:z.number().finite().min(-130).max(130),occlusionPolygons:z.array(Polygon).max(2)}).strict();
export const ArmDefinitionSchema=z.object({backgroundMode:z.enum(['paper','clean-plate']),cleanPlateImageId:z.string().regex(/^[a-f0-9]{64}$/).optional(),arms:z.array(Arm).max(4)}).strict().superRefine((v,ctx)=>{
  if(v.arms.length&&v.backgroundMode==='clean-plate'&&!v.cleanPlateImageId)ctx.addIssue({code:'custom',message:'Chọn ảnh nền sạch trước khi lưu.',path:['cleanPlateImageId']});
  if(v.backgroundMode==='paper'&&v.cleanPlateImageId)ctx.addIssue({code:'custom',message:'Nền giấy không dùng ảnh nền sạch.',path:['cleanPlateImageId']});
});
export type ArmDefinition=z.infer<typeof ArmDefinitionSchema>;

/** Shared source-space contract; source labels never decide anatomical sides. */
export function armRecipe(input:ArmDefinition,width:number,height:number):CharacterSourceRecipe{
  const definition=ArmDefinitionSchema.parse(input),ids=new Set<string>(),parts:SourcePart[]=[];
  const frames=(angle:number)=>[{timeMs:0,angle:0},{timeMs:650,angle:0},{timeMs:2100,angle},{timeMs:3200,angle},{timeMs:5100,angle:0},{timeMs:6000,angle:0}];
  for(const a of definition.arms){
    if(ids.has(a.id))throw Error('Mỗi tay cần tên riêng.');ids.add(a.id);
    const points=[a.shoulder,a.elbow,a.wrist,...a.erasePolygon.map(([x,y])=>({x,y})),...a.occlusionPolygons.flatMap(p=>p.map(([x,y])=>({x,y})))];
    if(points.some(p=>p.x>width||p.y>height))throw Error('Điểm khớp và vùng xóa phải nằm trong ảnh.');
    for(const poly of [a.erasePolygon,...a.occlusionPolygons]){let area=0;for(let i=0;i<poly.length;i++){const p=poly[i]!,q=poly[(i+1)%poly.length]!;area+=p[0]*q[1]-q[0]*p[1];}if(Math.abs(area)<1)throw Error('Khoanh một vùng có diện tích, không chỉ một đường thẳng.');}
    if(Math.hypot(a.elbow.x-a.shoulder.x,a.elbow.y-a.shoulder.y)<a.width||Math.hypot(a.wrist.x-a.elbow.x,a.wrist.y-a.elbow.y)<a.width)throw Error('Đặt vai, khuỷu và cổ tay thành hai đoạn riêng.');
    const upper=a.id+'-upper',fore=a.id+'-fore';
    parts.push({id:upper,image:`assets/${upper}.png`,pivot:a.shoulder,polygon:a.erasePolygon,inkOnly:true,replacement:{type:'ink-arm',from:a.shoulder,to:a.elbow,width:a.width},frames:frames(a.upperAngle)});
    parts.push({id:fore,parent:upper,image:`assets/${fore}.png`,pivot:a.elbow,polygon:a.erasePolygon,inkOnly:true,replacement:{type:'ink-arm',from:a.elbow,to:a.wrist,width:a.width,hand:{width:a.handWidth,height:a.handHeight,thumbSide:a.wrist.x>=a.shoulder.x?'left':'right'}},frames:frames(a.foreAngle)});
  }
  // All original occlusion regions are above all replacement arms.
  for(const a of definition.arms)for(const [i,polygon]of a.occlusionPolygons.entries()){const id=a.id+'-cover-'+i;parts.push({id,image:`assets/${id}.png`,pivot:{x:0,y:0},polygon,remove:false,frames:frames(0)});}
  return {width,height,fps:60,durationMs:6000,patchSampleX:width-1,patchMode:'paper-harmonic',repairRegion:'polygon',repairMargin:2,parts};
}
