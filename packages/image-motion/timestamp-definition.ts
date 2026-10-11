import {z} from 'zod';
const Point=z.object({x:z.number().finite().nonnegative(),y:z.number().finite().nonnegative()}).strict();
const Id=z.string().regex(/^[a-z][a-z0-9-]{0,39}$/).refine(id=>!['original','source-original','background','clean-plate','static-subject'].includes(id),'Tên vùng trùng tên asset hệ thống.');
export const TimestampMotionDefinition=z.object({
  version:z.literal(1),
  rotations:z.array(z.object({id:Id,cx:z.number().finite().nonnegative(),cy:z.number().finite().nonnegative(),rx:z.number().finite().positive(),ry:z.number().finite().positive(),periodMs:z.number().finite().min(100).max(600000),direction:z.union([z.literal(1),z.literal(-1)])}).strict()).max(16),
  parts:z.array(z.object({id:Id,polygon:z.array(z.tuple([z.number().finite().nonnegative(),z.number().finite().nonnegative()])).min(3).max(128),pivot:Point,angle:z.number().finite().min(-120).max(120).refine(a=>a!==0,'Chọn góc chuyển động khác 0.')}).strict()).max(8),
  background:z.discriminatedUnion('mode',[
    z.object({mode:z.literal('column'),sampleX:z.number().int().nonnegative()}).strict(),
    z.object({mode:z.literal('clean-plate'),cleanPlateId:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
  ])
}).strict().superRefine((d,c)=>{
  const ids=[...d.rotations,...d.parts].map(p=>p.id);if(new Set(ids).size!==ids.length)c.addIssue({code:'custom',message:'Tên vùng phải khác nhau.'});
});
export type TimestampMotionDefinition=z.infer<typeof TimestampMotionDefinition>;
export const emptyTimestampMotion=():TimestampMotionDefinition=>({version:1,rotations:[],parts:[],background:{mode:'column',sampleX:0}});
export function validateTimestampMotion(input:unknown,width:number,height:number):TimestampMotionDefinition{
  const d=TimestampMotionDefinition.parse(input);
  if(!d.rotations.length&&!d.parts.length)throw Error('Chọn ít nhất một vùng chuyển động.');
  if(d.background.mode==='column'&&d.background.sampleX>=width)throw Error('Cột nền phải nằm trong ảnh.');
  if(d.rotations.some(r=>r.cx-r.rx<0||r.cy-r.ry<0||r.cx+r.rx>width||r.cy+r.ry>height)||d.parts.some(p=>p.pivot.x>width||p.pivot.y>height||p.polygon.some(q=>q[0]>width||q[1]>height)))throw Error('Vùng và điểm xoay phải nằm trong ảnh.');
  for(const p of d.parts){let twiceArea=0;for(let i=0;i<p.polygon.length;i++){const a=p.polygon[i]!,b=p.polygon[(i+1)%p.polygon.length]!;twiceArea+=a[0]*b[1]-b[0]*a[1];}if(Math.abs(twiceArea)<2)throw Error('Polygon phải bao quanh một vùng có diện tích.');}
  return d;
}
