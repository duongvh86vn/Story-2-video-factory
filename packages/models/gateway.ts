import { OpenAICompatibleAdapter } from './openai-compatible.js';
import { ModelError } from './adapter.js';

export class GatewayAdapter extends OpenAICompatibleAdapter {
  protected override defaultBaseUrl(): string {
    const base = process.env.MODEL_GATEWAY_URL;
    if (!base) throw new ModelError('configuration', 'Gateway requires base_url or MODEL_GATEWAY_URL');
    return base;
  }
}
