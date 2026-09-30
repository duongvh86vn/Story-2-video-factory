import { OpenAICompatibleAdapter } from './openai-compatible.js';

export class LiteLLMAdapter extends OpenAICompatibleAdapter {
  protected override defaultBaseUrl(): string { return 'http://localhost:4000/v1'; }
}
