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
import { ConfigSchema } from '../../packages/core/config.js';
import { GeneratedDraftSchema, ScriptGenerationReportSchema } from '../../packages/orchestrator/script-generation.js';
import {ActorMotionSchema,MotionRegistrationSchema,SpriteClipSchema} from '../../packages/motion/schemas.js';
import {SpriteStageSchema} from '../../packages/motion/stage-schemas.js';
import {SpriteMotionCatalogSchema} from '../../packages/motion/catalog-schemas.js';

/** Generated views of core contracts; Zod remains the runtime authority. */
export const schemaLibrary = {
  story: StorySchema, narration: NarrationSchema, 'character-bible': CharacterBibleSchema,
  chapters: z.array(ChapterSchema), beats: z.array(BeatSchema), shot: ShotSchema,
  storyboard: StoryboardSchema, 'asset-manifest': AssetManifestSchema,
  'scene-files': SceneFilesSchema, review: ReviewSchema, 'project-state': ProjectStateSchema,
  'chapter-plan': ChapterPlanSchema, 'beat-plan': BeatPlanSchema,
  config:ConfigSchema,script:ScriptDocumentSchema,'host-profile':HostProfileSchema,'host-rig':HostRigSchema,'host-timeline':HostTimelineSchema,
  'explanation-plan':ExplanationPlanSchema,'voice-report':VoiceReportSchema,'speech-activity':ActivitySchema,
  'generated-script':GeneratedDraftSchema,'script-generation':ScriptGenerationReportSchema,
  'actor-motion':ActorMotionSchema,'actor-motion-registration':MotionRegistrationSchema,'sprite-clip':SpriteClipSchema,
  'sprite-stage':SpriteStageSchema,
  'sprite-motion-catalog':SpriteMotionCatalogSchema,
};

export async function writeSchemaLibrary(directory = path.dirname(fileURLToPath(import.meta.url))): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  for (const [name, schema] of Object.entries(schemaLibrary)) {
    const json = zodToJsonSchema(schema, { name, target: 'jsonSchema7', $refStrategy: 'none' });
    await fs.writeFile(path.join(directory, `${name}.schema.json`), JSON.stringify(json, null, 2) + '\n');
  }
}
