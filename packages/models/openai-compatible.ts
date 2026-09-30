import { apiKey, endpoint, FetchModelAdapter, fetchJson, ModelError, object, requestText, tokenCount,
  type AdapterOptions, type EncodedImage, type JsonSchema, type ModelRequest, type ModelResponse } from './adapter.js';
import type { ModelSettings } from '../core/config.js';

/** Chat Completions wire format; JSON mode plus the full schema in the prompt. */
export class OpenAICompatibleAdapter extends FetchModelAdapter {
  constructor(settings: ModelSettings, options: AdapterOptions = {}) { super(settings, options); }
  protected defaultBaseUrl(): string { return 'https://api.openai.com/v1'; }
  protected async request(input: ModelRequest, schema?: JsonSchema, images?: EncodedImage[]): Promise<ModelResponse> {
    const key = apiKey(this.settings);
    const content = images ? [{ type: 'text', text: requestText(input) }, ...images.map(image => ({ type: 'image_url',
      image_url: { url: `data:${image.mimeType};base64,${image.data}` } }))] : requestText(input);
    const body = { model: this.settings.model, temperature: this.settings.temperature, stream: false,
      messages: [{ role: 'system', content: input.system }, { role: 'user', content }],
      // JSON object mode is the common denominator across compatible servers.
      ...(schema?.type === 'object' ? { response_format: { type: 'json_object' } } : {}) };
    const data = await fetchJson(endpoint(this.settings.base_url ?? this.defaultBaseUrl(), '/chat/completions'),
      key ? { Authorization: `Bearer ${key}` } : {}, body, this.settings.timeout_ms);
    const choice = object(Array.isArray(data.choices) ? data.choices[0] : undefined);
    const message = object(choice.message);
    const usage = data.usage ? { inputTokens: tokenCount(object(data.usage).prompt_tokens), outputTokens: tokenCount(object(data.usage).completion_tokens) } : undefined;
    const text = typeof message.content === 'string' ? message.content : Array.isArray(message.content)
      ? message.content.map(part => object(part).text).filter((part): part is string => typeof part === 'string').join('') : '';
    this.lastResponse = { text, ...(usage ? { usage } : {}) };
    if (message.refusal || choice.finish_reason === 'content_filter') throw new ModelError('refusal', 'Model provider declined the request');
    if (choice.finish_reason === 'length') throw new ModelError('truncated', 'Model output was truncated', true);
    if (!text.trim()) throw new ModelError('empty_response', 'Model returned no text', true);
    return this.lastResponse;
  }
}
