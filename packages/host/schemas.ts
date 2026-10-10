import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';
import {NativeHeadBankSchema} from '../animation/native-head-bank.js';
import {PREHISTORIC_SUPPORTING_MODELS,prehistoricSupportingModel} from '../topics/supporting-models.js';
import {isSupportingNativeHeadVersion,nativeHeadIdentityMatches} from '../animation/native-head-identity.js';
import {SpearActionRefSchema} from '../director/source-spear-action-reference.js';
import {basicBodyHasUnsupportedOptions,basicBodyCapabilityError} from '../animation/body-view-basic-capabilities.js';
import {BASIC_BODY_EYES_SELECTION,isBasicEyeView} from '../animation/body-view-basic-eyes-registration.js';
import {BASIC_BODY_SPEECH_SELECTION,isBasicMouthView} from '../animation/body-view-basic-mouth-registration.js';

export const HostKinds = ['mini-robot', 'stick-man'] as const;
export const HostActions = ['idle', 'greet', 'explain', 'point', 'operate-model', 'compare', 'think', 'react', 'summarize', 'walk-to-marker','hold-tool','thrust-tool'] as const;
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const HostProfileSchema = z.object({
  id: Id, version: z.number().int().positive(), kind: z.enum(HostKinds), role: z.enum(['explainer-host','story-actor']),
  name: z.string().min(1).max(80), description: z.string().min(1).max(24000),
  appearance: z.object({ outline: Color, shell: Color, screen: Color, accent: Color, badge: Color,
    headScale: z.number().min(0.75).max(1.25), bodyScale: z.number().min(0.75).max(1.25),
    strokeWidth: z.number().min(2).max(10),
    characterVariant: z.enum(['lila','karo']).optional(),
    supportingModel:z.enum(PREHISTORIC_SUPPORTING_MODELS).optional(),
    artworkVersion: z.enum(['forest-head-1','forest-body-1','forest-body-view-1']).optional(),
    bodyView:z.enum(['three-quarter-right','three-quarter-left','front','left','right','back-left','back-right']).optional(),
    bodyHeadBank:NativeHeadBankSchema.optional(),
    bodySpeech:z.enum(['registered-mouth-v1','registered-rest-mouth-v1','registered-basic-mouth-v1']).optional(),bodyEyes:z.enum(['registered-eyes-v1','registered-basic-eyes-v1']).optional(),bodyExpressions:z.literal('registered-expressions-v1').optional(),bodyMotion:z.literal('registered-locomotion-v1').optional(),bodySeat:z.literal('registered-seated-v1').optional(),bodySecondary:z.literal('registered-secondary-v1').optional(),bodyManipulation:z.literal('registered-manipulation-v1').optional(),sourceColour:z.literal('original-rgb-v2').optional() }).strict().superRefine((a,ctx)=>{
      if(basicBodyHasUnsupportedOptions(a))
        ctx.addIssue({code:'custom',message:basicBodyCapabilityError(a.bodyView,'detailed feature/action').message});
      if(a.supportingModel){
        const matchingCostume=a.characterVariant===prehistoricSupportingModel(a.supportingModel).bodyTemplate;
        const legacy=a.artworkVersion==='forest-body-1'&&!a.bodyView&&!a.bodyHeadBank&&!a.bodyMotion&&!a.bodySeat&&!a.bodyManipulation;
        const native=a.artworkVersion==='forest-body-view-1'&&!!a.bodyView&&!!a.bodyHeadBank&&isSupportingNativeHeadVersion(a.bodyHeadBank.version)&&a.bodyHeadBank.actor===a.supportingModel;
        if(!matchingCostume||!legacy&&!native||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary||a.sourceColour)ctx.addIssue({code:'custom',message:'Supporting model requires its matching source costume and own version 4/5 head; principal/fixed-view face and hair registrations cannot be reused'});
      }
      if(a.artworkVersion==='forest-body-view-1'&&(!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Authored body candidate requires its actor and registered view'});
      if(a.bodyView&&a.artworkVersion!=='forest-body-view-1')ctx.addIssue({code:'custom',message:'bodyView requires the authored body candidate artwork version'});
      if(a.bodyHeadBank&&(a.artworkVersion!=='forest-body-view-1'||!nativeHeadIdentityMatches(a,a.bodyHeadBank.actor)||!a.bodyHeadBank.bodyViews.some(v=>v.view===a.bodyView)||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary))ctx.addIssue({code:'custom',message:'Head bank requires its actor/body source and independent cell capabilities; fixed-view face/hair overlays cannot be reused'});
      if(a.bodySpeech&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered mouth requires its authored actor and body view'});
      if(a.bodySpeech===BASIC_BODY_SPEECH_SELECTION&&!isBasicMouthView(a.bodyView))ctx.addIssue({code:'custom',message:'Basic speech requires its own front/profile source; rear or detailed3/4 mouth cannot be inferred'});
      if(a.bodyEyes&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered eyes require their authored actor and body view'});
      if(a.bodyEyes===BASIC_BODY_EYES_SELECTION&&!isBasicEyeView(a.bodyView))ctx.addIssue({code:'custom',message:'Basic eyes require their own front/profile source; rear or detailed3/4 eyes cannot be inferred'});
      if(a.bodyExpressions&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant||a.bodyEyes!=='registered-eyes-v1'||a.bodySpeech!=='registered-rest-mouth-v1'))ctx.addIssue({code:'custom',message:'Registered expressions require native actor/view, registered eyes and resting speech'});
      if(a.bodyMotion&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered locomotion requires its native actor and body view'});
      if(a.bodySeat&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant||a.bodyMotion!=='registered-locomotion-v1'))ctx.addIssue({code:'custom',message:'Registered seating requires its native actor/view and registered locomotion'});
      if(a.bodyManipulation&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered manipulation requires its native actor and body view'});
      if(a.bodySecondary&&(a.artworkVersion!=='forest-body-view-1'||!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Registered secondary motion requires its native actor and body view'});
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
/** Reference to an immutable original contact clip, never a new local contact. */
export const ManipulationActionRefSchema=z.object({sourceId:Id,gestureId:Id}).strict();
export const HostActionSchema = z.object({ type: z.enum(HostActions), startMs: z.number().int().nonnegative(),
  hand:RigHandSchema.optional(),
  endMs: z.number().int().positive(), narrationAnchor: Id.optional(), target: TargetSchema.optional(),
  secondTarget: TargetSchema.optional(), contactMs: z.number().int().nonnegative().optional(),
  sourceManipulation:ManipulationActionRefSchema.optional(),sourceSpear:SpearActionRefSchema.optional() })
  .superRefine((action,ctx)=>{
    if(action.endMs<=action.startMs)ctx.addIssue({code:'custom',message:'Host action interval must be positive'});
    if(action.sourceManipulation&&(action.type!=='operate-model'||!action.hand||!action.narrationAnchor||!action.target||action.target.anchor==='label'||action.secondTarget))
      ctx.addIssue({code:'custom',path:['sourceManipulation'],message:'Original contact action requires operate-model, explicit own hand, cue and one model center/handle target'});
    if(Boolean(action.sourceSpear)!==['hold-tool','thrust-tool'].includes(action.type)||action.sourceSpear&&(!action.hand||!action.narrationAnchor||!action.target||action.target.anchor==='label'||action.secondTarget||action.sourceManipulation))
      ctx.addIssue({code:'custom',path:['sourceSpear'],message:'Tool action requires its explicit original source/track/shaft, hand, cue and one center/handle target; no generic contact reference'});
    if(action.type==='hold-tool'&&(action.contactMs!==undefined||action.target?.anchor!=='center'||action.target.partId!==action.sourceSpear?.shaftPartId))
      ctx.addIssue({code:'custom',message:'Holding an entry-attached shaft targets that entity center and does not invent a contact'});
  });
export const ShotHostSchema = z.object({ id: Id, profileVersion: z.number().int().positive(), rigHash: z.string(),
  presence: z.enum(['beside-model', 'inset', 'absent']), actions: z.array(HostActionSchema).min(1) });
export type ShotHost = z.infer<typeof ShotHostSchema>;
export const HostTimelineSchema = z.object({ version: z.literal(2), hostId: Id, profileVersion: z.number().int().positive(),
  rigHash: z.string(), durationMs: z.number().int().positive(), speechVisibility: z.number().min(0).max(1),
  synchronization: z.enum(['audio-activity', 'word', 'segment']),
  shots: z.array(z.object({ shotId: Id, startMs: z.number().int(), endMs: z.number().int(), host: ShotHostSchema })).min(1) });
