import {z} from 'zod';

export const MODEL_CONTACT_FRAME_VERSION='model-contact-frame-1' as const;
const Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const Anchor=Point.refine(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1,'Anchor is a fraction of the actual projected model viewport');
/** Coordinates are after SVG/viewBox/aspect projection, before whole-glyph
 * motion. Bounds and anchors are authored measurements, never art approval. */
export const ModelContactFrameSchema=z.object({version:z.literal(MODEL_CONTACT_FRAME_VERSION),pivot:Point,
  anchors:z.object({center:Anchor,handle:Anchor.optional()}).strict(),
  bounds:z.object({left:z.number().finite(),right:z.number().finite(),top:z.number().finite(),bottom:z.number().finite()}).strict(),
}).strict().superRefine((f,ctx)=>{
  const b=f.bounds;
  if(b.left>=b.right||b.top>=b.bottom)ctx.addIssue({code:'custom',path:['bounds'],message:'Projected drawable bounds must have positive width and height'});
  for(const [key,p] of Object.entries(f.anchors))if(p&&(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom))ctx.addIssue({code:'custom',path:['anchors',key],message:'Own authored contact anchor must lie inside its declared drawable bounds'});
});
export type ModelContactFrame=z.infer<typeof ModelContactFrameSchema>;
