import { apiKey, endpoint, FetchModelAdapter, fetchJson, ModelError, object, requestText, tokenCount,
  type EncodedImage, type JsonSchema, type ModelRequest, type ModelResponse } from './adapter.js';

export class GeminiAdapter extends FetchModelAdapter {
  protected async request(input: ModelRequest, schema?: JsonSchema, images?: EncodedImage[]): Promise<ModelResponse> {
    const model = this.settings.model.replace(/^models\//, '');
    const url = endpoint(this.settings.base_url ?? 'https://generativelanguage.googleapis.com/v1beta', `/models/${encodeURIComponent(model)}:generateContent`);
    const key = apiKey(this.settings);
    const data = await fetchJson(url, key ? { 'x-goog-api-key': key } : {}, {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: requestText(input) }, ...(images ?? []).map(image => ({ inlineData: image }))] }],
      generationConfig: { temperature: this.settings.temperature,
        ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}) }
    }, this.settings.timeout_ms);
    const candidate = object(Array.isArray(data.candidates) ? data.candidates[0] : undefined);
    const parts = object(candidate.content).parts;
    const text = Array.isArray(parts) ? parts.filter(part => !object(part).thought).map(part => object(part).text)
      .filter((part): part is string => typeof part === 'string').join('') : '';
    const metadata = object(data.usageMetadata);
    const usage = data.usageMetadata ? { inputTokens: tokenCount(metadata.promptTokenCount),
      outputTokens: tokenCount(metadata.candidatesTokenCount) + tokenCount(metadata.thoughtsTokenCount) } : undefined;
    this.lastResponse = { text, ...(usage ? { usage } : {}) };
    if (object(data.promptFeedback).blockReason || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY'].includes(String(candidate.finishReason))) {
      throw new ModelError('refusal', 'Gemini declined the request');
    }
    if (candidate.finishReason === 'MAX_TOKENS') throw new ModelError('truncated', 'Gemini output was truncated', true);
    if (!text.trim()) throw new ModelError('empty_response', 'Gemini returned no text', true);
    return this.lastResponse;
  }
}
