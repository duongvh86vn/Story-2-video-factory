import type { FactoryConfig } from '../core/config.js';
import { primaryLanguage } from '../core/languages.js';
import { writeSpeechResponse } from './azure.js';

/** HTTP services own speech generation; the factory owns narration and clock. */
export function externalSpeechRequest(config:FactoryConfig,text:string):{endpoint:string;body:Record<string,unknown>}{
  const v=config.voice;if(!v.base_url)throw new Error('External TTS requires voice.base_url.');
  const endpoint=new URL(v.base_url);
  if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password)throw new Error('External TTS requires an HTTP(S) endpoint without URL credentials.');
  const extra=v.http_extra_body??{};
  let body:Record<string,unknown>;
  if(v.tts_provider==='http'){
    const fields=v.http_fields??{text:'text',language:'language',voice:'voice',model:'model',format:'format'};
    const names=Object.values(fields).filter((name):name is string=>typeof name==='string');
    if(new Set(names).size!==names.length)throw new Error('Custom TTS request field names must be distinct.');
    if(names.some(name=>Object.hasOwn(extra,name)))throw new Error('TTS options cannot override narration, language, voice, model or format fields.');
    body={...extra,[fields.text]:text};
    if(fields.language)body[fields.language]=config.project.language;
    if(fields.voice)body[fields.voice]=v.voice_id;
    if(fields.model&&v.model)body[fields.model]=v.model;
    if(fields.format)body[fields.format]='wav';
  }else{
    const model=v.model??(v.tts_provider==='omnivoice-studio'?'omnivoice':undefined);
    if(!model)throw new Error('OpenAI-compatible local TTS requires voice.model.');
    const reserved=['input','model','voice','response_format','speed','stream_format','language'];
    if(reserved.some(name=>Object.hasOwn(extra,name)))throw new Error('TTS options cannot override narration, language, voice, model, speed or WAV format.');
    const base=endpoint.pathname.replace(/\/+$/,'');
    if(!base.endsWith('/audio/speech'))endpoint.pathname=base.endsWith('/v1')?`${base}/audio/speech`:`${base}/v1/audio/speech`;
    body={...extra,input:text,model,voice:v.voice_id??'default',response_format:'wav',speed:1,
      ...(v.tts_provider==='omnivoice-studio'?{language:primaryLanguage(config.project.language)}:{})};
  }
  return {endpoint:endpoint.href,body};
}
export async function synthesizeExternal(config:FactoryConfig,text:string,output:string):Promise<void>{
  const {endpoint,body}=externalSpeechRequest(config,text),key=process.env[config.voice.api_key_env];
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(config.voice.timeout_ms),redirect:'error'});
  await writeSpeechResponse(response,output);
}
