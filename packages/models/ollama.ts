import { apiKey, endpoint, FetchModelAdapter, fetchJson, ModelError, object, requestText, tokenCount,
  type EncodedImage, type JsonSchema, type ModelRequest, type ModelResponse } from './adapter.js';

export class OllamaAdapter extends FetchModelAdapter {
  protected async request(input: ModelRequest, schema?: JsonSchema, images?: EncodedImage[]): Promise<ModelResponse> {
    const base = this.settings.base_url ?? 'http://localhost:11434';
    const suffix = new URL(base).pathname.replace(/\/+$/, '').endsWith('/api') ? '/chat' : '/api/chat';
    const key = apiKey(this.settings);
    const data = await fetchJson(endpoint(base, suffix), key ? { Authorization: `Bearer ${key}` } : {}, {
      model: this.settings.model, stream: false, options: { temperature: this.settings.temperature },
      messages: [{ role: 'system', content: input.system }, { role: 'user', content: requestText(input),
        ...(images ? { images: images.map(image => image.data) } : {}) }], ...(schema ? { format: schema } : {})
    }, this.settings.timeout_ms);
    const text = typeof object(data.message).content === 'string' ? object(data.message).content as string : '';
    const usage = data.prompt_eval_count !== undefined || data.eval_count !== undefined
      ? { inputTokens: tokenCount(data.prompt_eval_count), outputTokens: tokenCount(data.eval_count) } : undefined;
    this.lastResponse = { text, ...(usage ? { usage } : {}) };
    if (data.done_reason === 'length') throw new ModelError('truncated', 'Ollama output was truncated', true);
    if (!text.trim()) throw new ModelError('empty_response', 'Ollama returned no text', true);
    return this.lastResponse;
  }
}
