import type { ZodType, ZodTypeDef } from 'zod';
import { ModelSettingsSchema, type ModelSettings } from '../core/config.js';
import { ModelError, object, requestText, validateStructured, type AdapterOptions, type ModelAdapter,
  type ModelRequest, type ModelResponse, type VisionRequest } from './adapter.js';
import { mockBeats, mockCharacterBible, mockChapters, mockStoryAnalysis } from './mock-story.js';
import { mockStoryboard } from './mock-storyboard.js';
import { mockReview, mockScene } from './mock-scenes.js';

export class MockAdapter implements ModelAdapter {
  lastResponse?: ModelResponse;
  constructor(public readonly settings: ModelSettings = ModelSettingsSchema.parse({ provider: 'mock' }),
    _options: AdapterOptions = {}) {}
  async generateText(input: ModelRequest): Promise<ModelResponse> {
    this.lastResponse = undefined;
    const context = this.taskContext(input);
    const text = typeof context.task === 'string' ? JSON.stringify(this.generate(context))
      : `Deterministic mock response to: ${input.prompt.trim()}${input.context === undefined ? '' : `\nSupplied context: ${JSON.stringify(input.context)}`}\nNo external model was contacted.`;
    return this.lastResponse = { text, usage: { inputTokens: Math.ceil((input.system.length + requestText(input).length) / 4), outputTokens: Math.ceil(text.length / 4) } };
  }
  async generateStructured<T>(input: ModelRequest, schema: ZodType<T, ZodTypeDef, any>): Promise<T> {
    if (typeof this.taskContext(input).task !== 'string') throw new ModelError('mock_context', 'Structured mock generation requires a supported task context');
    return validateStructured(await this.generateText(input), schema);
  }
  private taskContext(input: ModelRequest): Record<string, unknown> {
    const context = object(input.context);
    if (typeof context.task === 'string') return context;
    // The scene package supplies the restricted generation contract without a task label.
    if (context.shot || context.shotSpec) return { ...context, task: context.files || context.errors ? 'scene-repair' : 'scene-coder' };
    if (context.shots || context.storyboard) return { ...context, task: 'review' };
    return context;
  }
  async analyzeImages(input: VisionRequest): Promise<ModelResponse> {
    this.lastResponse = undefined;
    const context = { ...(input.context && typeof input.context === 'object' ? input.context : {}), task: 'visual-review' };
    // Deliberately do not represent a deterministic mock as a vision-capable model.
    return this.generateText({ ...input, context });
  }
  private generate(context: Record<string, unknown>): unknown {
    switch (context.task) {
      case 'story-analysis': case 'story-analyst': return mockStoryAnalysis(context);
      case 'character-bible': return mockCharacterBible(context);
      case 'chapters': case 'chapter-planning': return mockChapters(context);
      case 'beats': case 'beat-planning': return mockBeats(context);
      case 'storyboard': return mockStoryboard(context);
      case 'scene-coder': case 'scene-code': case 'scene-generation': case 'scene': case 'coder': return mockScene(context);
      case 'scene-repair': case 'repair': return mockScene(context, true);
      case 'visual-review': case 'review': case 'story-review': case 'continuity-review': return mockReview(context);
      default: throw new ModelError('mock_task', 'No deterministic mock implementation exists for this task context');
    }
  }
}
