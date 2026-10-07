import {z} from 'zod';
import {NINE_ROUTER_URL} from './nine-router.js';

/** Art-generation endpoint is separate from the text/vision model adapter.
 * A model being listed does not prove availability or reference-image support. */
export async function discoverNineRouterImages(baseUrl=NINE_ROUTER_URL):Promise<string[]> {
  const response=await fetch(`${baseUrl.replace(/\/$/,'')}/models/image`,{headers:headers(),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`9router image discovery HTTP ${response.status}`);
  const data=z.object({data:z.array(z.object({id:z.string().min(1)}))}).parse(await response.json());
  return [...new Set(data.data.map(item=>item.id))].sort();
}
function headers(){
  const key=process.env.MODEL_GATEWAY_KEY;
  if(!key)throw new Error('Set MODEL_GATEWAY_KEY in the environment or the selected .env file.');
  return {'Content-Type':'application/json',Authorization:`Bearer ${key}`};
}
export interface NineRouterImageRequest {model:string;prompt:string;referencePng:Buffer;size?:string;baseUrl?:string;}
export async function generateNineRouterReferenceImage(input:NineRouterImageRequest):Promise<Buffer> {
  const base=(input.baseUrl??NINE_ROUTER_URL).replace(/\/$/,'');
  // The ag image adapter forwards ONE inline image. Supplying images[] would
  // silently discard later references; the caller supplies one labelled board.
  if(!/^(ag|cx)\//.test(input.model))throw new Error('This reference workflow supports the ag and cx image adapters; the Gemini images endpoint drops image references in the inspected router adapter.');
  const response=await fetch(`${base}/images/generations`,{method:'POST',headers:headers(),
    body:JSON.stringify({model:input.model,prompt:input.prompt,image:'data:image/png;base64,'+input.referencePng.toString('base64'),
      size:input.size??'1536x1024',n:1,response_format:'b64_json',...(input.model.startsWith('cx/')?{quality:'high',image_detail:'high',output_format:'png'}:{})}),signal:AbortSignal.timeout(240000)});
  // Never log raw provider errors: upstream text may contain credential URLs.
  if(!response.ok)throw new Error(`9router image generation HTTP ${response.status}`);
  const data=z.object({data:z.array(z.object({b64_json:z.string().optional()}))}).parse(await response.json());
  const encoded=data.data[0]?.b64_json;
  if(!encoded)throw new Error('9router returned no image bytes. No artwork was generated.');
  const image=Buffer.from(encoded,'base64');
  if(image.length<1000||image.length>40*1024*1024)throw new Error('9router image payload is missing or too large.');
  return image;
}
