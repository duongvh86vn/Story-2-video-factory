import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StorySchema, NarrationSchema, CharacterBibleSchema, ChapterSchema, BeatSchema, ShotSchema, StoryboardSchema, AssetManifestSchema, SceneFilesSchema, ReviewSchema, ProjectStateSchema } from '../../packages/core/schemas.js';
import { ChapterPlanSchema, BeatPlanSchema } from '../../packages/story/schemas.js';
import { ScriptDocumentSchema } from '../../packages/ingest/script.js';
import { HostProfileSchema, HostRigSchema, HostTimelineSchema } from '../../packages/host/schemas.js';
import { ExplanationPlanSchema } from '../../packages/explainer/schemas.js';
import { VoiceReportSchema, ActivitySchema } from '../../packages/voice/schemas.js';
import {SpeechSourceClockSchema} from '../../packages/animation/speech-clock.js';
import {ViewActingClockSchema} from '../../packages/animation/view-acting-clock.js';
import {BodySourceSchema,GestureSourceSpanSchema,ManipulationSourceSchema} from '../../packages/animation/schemas.js';
import { ConfigSchema } from '../../packages/core/config.js';
import { GeneratedDraftSchema, ScriptGenerationReportSchema } from '../../packages/orchestrator/script-generation.js';
import {ActorMotionSchema,MotionRegistrationSchema,SpriteClipSchema} from '../../packages/motion/schemas.js';
import {SpriteStageSchema} from '../../packages/motion/stage-schemas.js';
import {SpriteMotionCatalogSchema} from '../../packages/motion/catalog-schemas.js';
import {ActorSpeechSchema,ActorSpeechRegistrationSchema} from '../../packages/motion/speech-schemas.js';
import {SpriteSpeechScheduleSchema} from '../../packages/motion/speech-clock.js';
import {MotionMeasureLayoutSchema} from '../../packages/motion/measure.js';
import {NativeSeatMaterialSchema} from '../../packages/topics/native-seat-art.js';
import {NativeSeatCorrespondenceSchema} from '../../packages/animation/native-seat-registration.js';
import {ViewGazeTargetSchema} from '../../packages/animation/view-gaze-target.js';
import {HeadTurnMaterialSchema,HeadTurnPromptSchema,HeadTurnDraftSchema,HeadTurnCheckRequestSchema} from '../../packages/topics/head-turn-schemas.js';
import {NativeHeadBankSchema} from '../../packages/animation/native-head-bank.js';
import {NativeHeadTrackSchema} from '../../packages/animation/native-head-track.js';
import {HeadCellPromptSchema,HeadCellMaterialSchema} from '../../packages/topics/head-cell-art.js';
import {HeadCellDraftSchema,HeadCellCheckRequestSchema} from '../../packages/topics/head-cell-landmarks.js';
import {NativeHeadFaceSchema} from '../../packages/animation/native-head-face.js';
import {NativeHeadPaintSchema} from '../../packages/animation/native-head-paint.js';
import {NativeRearMotionSchema} from '../../packages/animation/native-head-follow.js';

/** Generated views of core contracts; Zod remains the runtime authority. */
export const schemaLibrary:Record<string,z.ZodTypeAny> = {
  story: StorySchema, narration: NarrationSchema, 'character-bible': CharacterBibleSchema,
  chapters: z.array(ChapterSchema), beats: z.array(BeatSchema), shot: ShotSchema,
  storyboard: StoryboardSchema, 'asset-manifest': AssetManifestSchema,
  'scene-files': SceneFilesSchema, review: ReviewSchema, 'project-state': ProjectStateSchema,
  'chapter-plan': ChapterPlanSchema, 'beat-plan': BeatPlanSchema,
  config:ConfigSchema,script:ScriptDocumentSchema,'host-profile':HostProfileSchema,'host-rig':HostRigSchema,'host-timeline':HostTimelineSchema,
  'explanation-plan':ExplanationPlanSchema,'voice-report':VoiceReportSchema,'speech-source-clock':SpeechSourceClockSchema,'speech-activity':ActivitySchema,'view-acting-clock':ViewActingClockSchema,'gesture-source-span':GestureSourceSpanSchema,'body-source':BodySourceSchema,'manipulation-source':ManipulationSourceSchema,
  'generated-script':GeneratedDraftSchema,'script-generation':ScriptGenerationReportSchema,
  'actor-motion':ActorMotionSchema,'actor-motion-registration':MotionRegistrationSchema,'sprite-clip':SpriteClipSchema,
  'sprite-stage':SpriteStageSchema,
  'sprite-motion-catalog':SpriteMotionCatalogSchema,
  'actor-speech':ActorSpeechSchema,'actor-speech-registration':ActorSpeechRegistrationSchema,'sprite-speech-schedule':SpriteSpeechScheduleSchema,
  'actor-motion-measure-layout':MotionMeasureLayoutSchema,
  'native-seat-material':NativeSeatMaterialSchema,
  'native-seat-correspondence':NativeSeatCorrespondenceSchema,
  'view-gaze-target':ViewGazeTargetSchema,
  'native-head-turn-material':HeadTurnMaterialSchema,'native-head-turn-prompt':HeadTurnPromptSchema,'native-head-turn-landmarks':HeadTurnDraftSchema,
  'native-head-turn-check':HeadTurnCheckRequestSchema,
  'native-head-bank':NativeHeadBankSchema,'native-head-source':NativeHeadTrackSchema,
  'native-head-cell-prompt':HeadCellPromptSchema,'native-head-cell-material':HeadCellMaterialSchema,
  'native-head-cell-landmarks':HeadCellDraftSchema,'native-head-cell-check':HeadCellCheckRequestSchema,
  'native-head-face':NativeHeadFaceSchema,
  'native-head-paint':NativeHeadPaintSchema,
  'native-head-rear-motion':NativeRearMotionSchema,
};

export async function writeSchemaLibrary(directory = path.dirname(fileURLToPath(import.meta.url))): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  for (const [name, schema] of Object.entries(schemaLibrary)) {
    const json = zodToJsonSchema(schema, { name, target: 'jsonSchema7', $refStrategy: 'none' });
    const file=path.join(directory, `${name}.schema.json`),bytes=Buffer.from(JSON.stringify(json,null,2)+'\n');
    // Re-export is byte-idempotent. Avoid opening identical large schemas for
    // overwrite while Windows indexers/readers hold them; real read/write
    // errors and changed or missing documents retain the ordinary failure path.
    const existing=await fs.readFile(file).catch((error:NodeJS.ErrnoException)=>{
      if(error.code==='ENOENT')return undefined;
      throw error;
    });
    if(!existing?.equals(bytes))await fs.writeFile(file,bytes);
  }
}
