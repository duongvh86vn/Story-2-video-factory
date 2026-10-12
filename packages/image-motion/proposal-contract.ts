import {z} from 'zod';
import {TimestampMotionDefinition,validateTimestampMotion} from './timestamp-definition.js';

const RegionId=z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const Target=z.object({regionId:RegionId,object:z.string().trim().min(1).max(120),evidence:z.string().trim().min(1).max(400),why:z.string().trim().min(1).max(400)}).strict();
const Artwork=z.object({regionId:RegionId,kind:z.enum(['clean-background','clean-rotation-source','pose']),reason:z.string().trim().min(1).max(400)}).strict();
const Common={version:z.literal(1),summary:z.string().trim().min(1).max(600),targets:z.array(Target).min(1).max(8)};
const MotionProposalBase=z.discriminatedUnion('status',[
 z.object({...Common,status:z.literal('candidate'),definition:TimestampMotionDefinition,needsArtwork:z.array(Artwork).length(0)}).strict(),
 z.object({...Common,status:z.literal('needs-artwork'),definition:z.null(),needsArtwork:z.array(Artwork).min(1).max(8)}).strict()
]);
export const MotionProposalSchema=MotionProposalBase.superRefine((p,c)=>{
 const ids=p.targets.map(t=>t.regionId);
 if(new Set(ids).size!==ids.length)c.addIssue({code:'custom',path:['targets'],message:'Target region IDs must be unique.'});
 if(p.status==='candidate'){
  const moving=[...p.definition.rotations,...p.definition.parts].map(r=>r.id);
  if(new Set(moving).size!==moving.length||moving.length!==ids.length||moving.some(id=>!ids.includes(id)))c.addIssue({code:'custom',path:['targets'],message:'Targets must match moving regions.'});
  if(p.definition.background.mode==='clean-plate'||p.definition.rotationSource==='clean-plate')c.addIssue({code:'custom',path:['definition'],message:'Clean-plate assets cannot be proposed.'});
  try{validateTimestampMotion(p.definition,1000,1000);}catch{c.addIssue({code:'custom',path:['definition'],message:'Normalized motion geometry is invalid.'});}
 }else if(p.needsArtwork.some(a=>!ids.includes(a.regionId)))c.addIssue({code:'custom',path:['targets'],message:'Targets must include artwork regions.'});
});
export type MotionProposal=z.infer<typeof MotionProposalSchema>;

export function parseMotionProposal(input:unknown,width:number,height:number):{proposal:MotionProposal;definition:ReturnType<typeof validateTimestampMotion>|null}{
 if(!Number.isInteger(width)||width<1||width>3840||!Number.isInteger(height)||height<1||height>2160)throw new Error('Image dimensions are invalid.');
 const proposal=MotionProposalSchema.parse(input);
 if(proposal.status==='needs-artwork')return {proposal,definition:null};
 const d=structuredClone(proposal.definition);
 for(const r of d.rotations){r.cx=r.cx*width/1000;r.rx=r.rx*width/1000;r.cy=r.cy*height/1000;r.ry=r.ry*height/1000;}
 for(const p of d.parts){p.pivot.x=p.pivot.x*width/1000;p.pivot.y=p.pivot.y*height/1000;p.polygon=p.polygon.map(([x,y])=>[x*width/1000,y*height/1000]);}
 if(d.occlusions)d.occlusions=d.occlusions.map(o=>({...o,polygon:o.polygon.map(([x,y])=>[x*width/1000,y*height/1000])}));
 if(d.background.mode==='column')d.background.sampleX=Math.min(width-1,Math.round(d.background.sampleX*width/1000));
 return {proposal,definition:validateTimestampMotion(d,width,height)};
}
