import type {PrehistoricSupportingModel} from './supporting-models.js';

/** Raw directional drawings and manual registrations awaiting independent
 * geometry, identity and normal-speed video review. Never a production list. */
export const SUPPORTING_FACE_CANDIDATES=[
  {actor:'prehistoric-male-bald',view:'three-quarter-left',id:'supporting-male-left-face-v1',
    file:'library/topics/prehistoric-life/head-face-registrations/supporting-male-left-face-v1.json',
    headFile:'prehistoric-male-bald-head-left-v1.png',
    sha256:'8308c768b762c00b8d9aba4a1ed37f225c1c4b507591e51823778cca5091b674',width:1199,height:1312},
  {actor:'prehistoric-female-haired',view:'three-quarter-right',id:'supporting-female-right-face-v1',
    file:'library/topics/prehistoric-life/head-face-registrations/supporting-female-right-face-v1.json',
    headFile:'prehistoric-female-haired-head-right-v1.png',
    sha256:'7ab9bcd21fa122a711af6797c81f7d127b369de0588ea37306e53898eeeb7a58',width:1419,height:1109},
] as const satisfies ReadonlyArray<{actor:PrehistoricSupportingModel;view:'three-quarter-left'|'three-quarter-right';id:string;file:string;headFile:string;sha256:string;width:number;height:number}>;
export const supportingFaceDescription={version:'supporting-source-face-1',candidates:SUPPORTING_FACE_CANDIDATES,
  selection:'Explicit own-model bank4 with matching Karo/Lila body costume; story-person IDs and clocks remain separate.',
  geometryValidation:'NOT RUN',yawMeasured:false,independentRedrawProven:false,
  availableBanks:[],approved:false,productionReady:false,motionVerified:false,
  pending:['identity and face artwork review','geometry and seam validation','original speaker/gaze clocks through camera cuts','missing opposite/profile/rear views','continuous turns and normal-speed multi-actor video']};
