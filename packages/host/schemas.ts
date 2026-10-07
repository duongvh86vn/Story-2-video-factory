import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';

export const HostKinds = ['mini-robot', 'stick-man'] as const;
export const HostActions = ['idle', 'greet', 'explain', 'point', 'operate-model', 'compare', 'think', 'react', 'summarize', 'walk-to-marker'] as const;
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const HostProfileSchema = z.object({
  id: Id, version: z.number().int().positive(), kind: z.enum(HostKinds), role: z.enum(['explainer-host','story-actor']),
  name: z.string().min(1).max(80), description: z.string().min(1).max(24000),
  appearance: z.object({ outline: Color, shell: Color, screen: Color, accent: Color, badge: Color,
    headScale: z.number().min(0.75).max(1.25), bodyScale: z.number().min(0.75).max(1.25),
    strokeWidth: z.number().min(2).max(10),
    characterVariant: z.enum(['lila','karo']).optional(),
    artworkVersion: z.enum(['forest-head-1','forest-body-1','forest-body-view-1']).optional(),
    bodyView:z.enum(['three-quarter-right']).optional(),sourceColour:z.literal('original-rgb-v2').optional() }).strict().superRefine((a,ctx)=>{
      if(a.artworkVersion==='forest-body-view-1'&&(!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Authored body candidate requires its actor and registered view'});
      if(a.bodyView&&a.artworkVersion!=='forest-body-view-1')ctx.addIssue({code:'custom',message:'bodyView requires the authored body candidate artwork version'});
      if(a.sourceColour&&(a.artworkVersion!=='forest-body-1'||!a.characterVariant))ctx.addIssue({code:'custom',message:'Original source colour requires the source body and its actor; authored views are separate artwork'});
    }),
  costume: z.array(z.object({joint:z.enum(['head','chest','pelvis','hand-left','hand-right']),svg:z.string().min(1).max(24000)}).strict()).max(12).optional(),
  actions: z.array(z.enum(HostActions)).min(1), immutable: z.array(z.string()).min(1),
  profileHash: z.string(), compilerVersion: z.string(), sourcePath: z.string(),
}).strict();
export type HostProfile = z.infer<typeof HostProfileSchema>;
export const RigPartSchema = z.object({ id: Id, parent: Id.optional(), pivot: z.object({ x: z.number(), y: z.number() }),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive() }) });
export const HostRigSchema = z.object({ id: Id, profileVersion: z.number().int().positive(), profileHash: z.string(),
  rigHash: z.string(), compilerVersion: z.string(), viewBox: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  assetPath: z.string(), posePath: z.string(), parts: z.array(RigPartSchema).min(10),
  poses: z.record(z.object({ rotations: z.record(z.number()), rootX: z.number().default(0), gaze: z.number().default(0) })) });
export type HostRig = z.infer<typeof HostRigSchema>;
export const TargetSchema = z.object({ modelId: Id, partId: Id, anchor: z.enum(['center', 'handle', 'label']).default('center') });
export const HostActionSchema = z.object({ type: z.enum(HostActions), startMs: z.number().int().nonnegative(),
  hand:RigHandSchema.optional(),
  endMs: z.number().int().positive(), narrationAnchor: Id.optional(), target: TargetSchema.optional(),
  secondTarget: TargetSchema.optional(), contactMs: z.number().int().nonnegative().optional() })
  .refine(action => action.endMs > action.startMs, 'Host action interval must be positive');
export const ShotHostSchema = z.object({ id: Id, profileVersion: z.number().int().positive(), rigHash: z.string(),
  presence: z.enum(['beside-model', 'inset', 'absent']), actions: z.array(HostActionSchema).min(1) });
export type ShotHost = z.infer<typeof ShotHostSchema>;
export const HostTimelineSchema = z.object({ version: z.literal(2), hostId: Id, profileVersion: z.number().int().positive(),
  rigHash: z.string(), durationMs: z.number().int().positive(), speechVisibility: z.number().min(0).max(1),
  synchronization: z.enum(['audio-activity', 'word', 'segment']),
  shots: z.array(z.object({ shotId: Id, startMs: z.number().int(), endMs: z.number().int(), host: ShotHostSchema })).min(1) });
