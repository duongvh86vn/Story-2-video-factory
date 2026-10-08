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
import {BodySourceSchema,GestureSourceSpanSchema} from '../../packages/animation/schemas.js';
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

/** Generated views of core contracts; Zod remains the runtime authority. */
export const schemaLibrary = {
  story: StorySchema, narration: NarrationSchema, 'character-bible': CharacterBibleSchema,
  chapters: z.array(ChapterSchema), beats: z.array(BeatSchema), shot: ShotSchema,
  storyboard: StoryboardSchema, 'asset-manifest': AssetManifestSchema,
  'scene-files': SceneFilesSchema, review: ReviewSchema, 'project-state': ProjectStateSchema,
  'chapter-plan': ChapterPlanSchema, 'beat-plan': BeatPlanSchema,
  config:ConfigSchema,script:ScriptDocumentSchema,'host-profile':HostProfileSchema,'host-rig':HostRigSchema,'host-timeline':HostTimelineSchema,
  'explanation-plan':ExplanationPlanSchema,'voice-report':VoiceReportSchema,'speech-activity':ActivitySchema,'speech-source-clock':SpeechSourceClockSchema,'view-acting-clock':ViewActingClockSchema,'gesture-source-span':GestureSourceSpanSchema,'body-source':BodySourceSchema,
  'generated-script':GeneratedDraftSchema,'script-generation':ScriptGenerationReportSchema,
  'actor-motion':ActorMotionSchema,'actor-motion-registration':MotionRegistrationSchema,'sprite-clip':SpriteClipSchema,
  'sprite-stage':SpriteStageSchema,
  'sprite-motion-catalog':SpriteMotionCatalogSchema,
  'actor-speech':ActorSpeechSchema,'actor-speech-registration':ActorSpeechRegistrationSchema,'sprite-speech-schedule':SpriteSpeechScheduleSchema,
  'actor-motion-measure-layout':MotionMeasureLayoutSchema,
  'native-seat-material':NativeSeatMaterialSchema,
  'native-seat-correspondence':NativeSeatCorrespondenceSchema,
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
