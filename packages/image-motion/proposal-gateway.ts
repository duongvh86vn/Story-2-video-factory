import {apiKey,endpoint,FetchModelAdapter,fetchJson,ModelError,object,requestText,tokenCount,type EncodedImage,type JsonSchema,type ModelRequest,type ModelResponse} from '../models/adapter.js';
import {ModelSettingsSchema,type ModelSettings} from '../core/config.js';
import {NINE_ROUTER_URL} from '../models/nine-router.js';

/** This CLI uses the user's local9router, not an unrelated general API URL. */
export const motionProposalGatewaySettings=(model='coder')=>ModelSettingsSchema.parse({provider:'gateway',model,base_url:NINE_ROUTER_URL,api_key_env:'MODEL_GATEWAY_KEY',vision:true,temperature:0.1,timeout_ms:180000});

/** One bounded vision call; no retries or fanout, shared model adapter validation. */
export class MotionProposalGateway extends FetchModelAdapter {
  constructor(settings:ModelSettings,private readonly maxOutputTokens=2400){
    super(settings);if(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<256||maxOutputTokens>4000)throw Error('Choose output token limit256–4000');
  }
  protected async request(input:ModelRequest,_schema?:JsonSchema,images?:EncodedImage[]):Promise<ModelResponse>{
    const key=apiKey(this.settings);if(!key)throw new ModelError('configuration','Configure the gateway key in the local environment');
    const content=[{type:'text',text:requestText(input)},...(images??[]).map(image=>({type:'image_url',image_url:{url:`data:${image.mimeType};base64,${image.data}`}}))];
    const data=await fetchJson(endpoint(this.settings.base_url??'http://127.0.0.1:20128/v1','/chat/completions'),{Authorization:'Bearer '+key},
      {model:this.settings.model,stream:false,temperature:this.settings.temperature,max_tokens:this.maxOutputTokens,messages:[{role:'system',content:input.system},{role:'user',content}]},this.settings.timeout_ms);
    const choice=object(Array.isArray(data.choices)?data.choices[0]:undefined),message=object(choice.message);
    const text=typeof message.content==='string'?message.content:'';
    const response={text,...(typeof data.model==='string'?{model:data.model}:{}),usage:{inputTokens:tokenCount(object(data.usage).prompt_tokens),outputTokens:tokenCount(object(data.usage).completion_tokens)}};
    this.lastResponse=response;
    if(message.refusal||choice.finish_reason==='content_filter')throw new ModelError('refusal','Provider declined motion proposal');
    if(choice.finish_reason==='length')throw new ModelError('truncated','Motion proposal exceeded output token limit');
    if(!text.trim())throw new ModelError('empty_response','Provider returned no motion proposal');
    return response;
  }
}
