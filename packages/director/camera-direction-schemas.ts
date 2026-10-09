import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {CameraSchema} from './schemas.js';

export const CAMERA_DIRECTION_VERSION='camera-direction-1';
export const CameraDirectionSchema=z.object({
  version:z.literal(CAMERA_DIRECTION_VERSION),
  shots:z.array(z.object({
    shotId:Id,
    camera:CameraSchema.refine(camera=>!!camera.designIntent?.trim(),'Camera requires a specific visual intent'),
    purpose:z.enum(['establish','interaction','reaction','action','detail','transition','hold']),
    rationale:z.string().trim().min(1).max(1200),
    continuity:z.string().trim().min(1).max(1200),
  }).strict()).min(1),
}).strict();
export type CameraDirection=z.infer<typeof CameraDirectionSchema>;

export const cameraDirectionDescription={version:CAMERA_DIRECTION_VERSION,
  roles:{director:'models.storyboard: sourced cast, acting, world, cuts and story rhythm',camera:'models.camera: camera-only polish after a valid director storyboard; omitted/null inherits director settings'},
  authority:'Unlocked canonical cameras and matching shot camera metadata only; all narration, people, actions, source clocks, artwork, entities, cuts and locks are immutable',
  capabilities:['2D wide/medium/close','ensemble/face/contact/object focus within the current renderer contract','locked/push-in/pull-out/pan-left/pan-right'],
  limits:['No 3D perspective, orbit, inferred missing actor view or new cut','Full canonical validation, original owner/run context and subtitle clearance remain mandatory','Model reasoning and geometry validation do not approve artwork, movement or final video'],
  reuse:'Exact request/settings/binding/schema plus successful journal/model artifact and accepted domain receipt; current domain revalidation required',
  approved:false,productionReady:false,motionVerified:false};
