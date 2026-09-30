import { OpenAICompatibleAdapter } from './openai-compatible.js';

/** DeepSeek's native Chat Completions API supports JSON object mode. */
export class DeepSeekAdapter extends OpenAICompatibleAdapter {
  protected override defaultBaseUrl(): string { return 'https://api.deepseek.com'; }
}
