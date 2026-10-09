import {z} from 'zod';

export const RELEASE_EVIDENCE_VERSION='release-evidence-1';
const Digest=z.string().regex(/^[a-f0-9]{64}$/);
export const ReviewSourceSchema=z.object({
  version:z.literal(RELEASE_EVIDENCE_VERSION),configurationHash:Digest,storyboardHash:Digest,
  sourceFiles:z.record(Digest.nullable()),sceneFiles:z.record(Digest),
}).strict();
export const ReviewInputSchema=ReviewSourceSchema.extend({previewFiles:z.record(Digest)}).strict();
export const ReviewAttemptSchema=z.object({version:z.literal(RELEASE_EVIDENCE_VERSION),attemptId:z.string().uuid()}).strict();
export const ReviewEvidenceSchema=z.object({
  version:z.literal(RELEASE_EVIDENCE_VERSION),attemptId:z.string().uuid(),status:z.literal('accepted'),reviewHash:Digest,inputHash:Digest,input:ReviewInputSchema,
  visualAcceptance:z.literal(false),motionVerified:z.literal(false),productionApproval:z.literal(false),
}).strict();
// Read-only API view can show an unfinished attempt. Production gates continue
// to require the strict accepted receipt above and a matching passing review.
export const ReviewEvidenceArtifactSchema=z.union([ReviewEvidenceSchema,z.object({
  version:z.literal(RELEASE_EVIDENCE_VERSION),attemptId:z.string().uuid(),status:z.enum(['reviewing','stale']),
  visualAcceptance:z.literal(false),motionVerified:z.literal(false),productionApproval:z.literal(false),
}).strict()]);
export const FinalEvidenceSchema=z.object({
  version:z.literal(RELEASE_EVIDENCE_VERSION),status:z.literal('produced'),reviewEvidenceHash:Digest,reviewHash:Digest,inputHash:Digest,
  artifacts:z.object({'work/rendered.mp4':Digest,'output/final.mp4':Digest,'output/final.srt':Digest,'output/thumbnail.png':Digest}).strict(),
  visualAcceptance:z.literal(false),motionVerified:z.literal(false),productionApproval:z.literal(false),
}).strict();
export type ReviewInput=z.infer<typeof ReviewInputSchema>;
export type ReviewSession={attemptId:string;input:ReviewInput};
export type ReviewSource=z.infer<typeof ReviewSourceSchema>;
export type ReviewEvidence=z.infer<typeof ReviewEvidenceSchema>;
export type FinalEvidence=z.infer<typeof FinalEvidenceSchema>;

export const releaseEvidenceDescription={version:RELEASE_EVIDENCE_VERSION,
  scope:'bind the inspected canonical source, full scene resources and preview bytes to a review and to the produced final artifact bytes',
  rule:'recheck before and after provider/render/postprocessing; stale or missing receipts require fresh review/render; never adopt the later source as proof of an earlier video',
  limits:'optimistic disk rechecks, not an operating-system lock or proof of visual/motion/content acceptance',
  approved:false,productionReady:false,motionVerified:false};
