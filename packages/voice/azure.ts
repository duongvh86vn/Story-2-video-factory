import type { FactoryConfig } from '../core/config.js';
import { NARRATION_LANGUAGES, primaryLanguage, speechLocale } from '../core/languages.js';
import { writeAtomic } from '../core/utils.js';

export function azureVoiceId(config:FactoryConfig):string{
  const voice=config.voice.voice_id??NARRATION_LANGUAGES.find(item=>item.id===primaryLanguage(config.project.language))?.azureVoices[0];
  if(!voice)throw new Error('Set an Azure Speech voice ID for this narration language.');
  return voice;
}
const xml=(text:string):string=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
export async function writeSpeechResponse(response:Response,output:string):Promise<void>{
  if(!response.ok)throw new Error(`TTS HTTP ${response.status}`);
  if(!/audio\/(?:wav|x-wav|wave)|application\/octet-stream/i.test(response.headers.get('content-type')??''))throw new Error('TTS must return WAV bytes');
  if(!response.body)throw new Error('Empty TTS response');
  const chunks:Uint8Array[]=[];let size=0;const reader=response.body.getReader();
  try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32*1024*1024)throw new Error('TTS cue audio exceeds 32 MB');chunks.push(value);}}
  finally {await reader.cancel();}
  await writeAtomic(output,Buffer.concat(chunks));
}
export async function synthesizeAzure(config:FactoryConfig,text:string,output:string):Promise<void>{
  const voice=azureVoiceId(config),voiceLocale=voice.match(/^([a-z]{2,3}-[A-Z]{2})-/)?.[1];
  if(!voiceLocale||primaryLanguage(voiceLocale)!==primaryLanguage(config.project.language)||config.project.language.includes('-')&&voiceLocale.toLowerCase()!==config.project.language.toLowerCase())
    throw new Error('Azure voice language does not match narration language.');
  if(!config.voice.base_url)throw new Error('Azure Speech requires voice.base_url (regional TTS endpoint).');
  const endpoint=new URL(config.voice.base_url);
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw new Error('Azure Speech requires an HTTPS endpoint without URL credentials.');
  if(endpoint.pathname==='/'||endpoint.pathname==='')endpoint.pathname='/cognitiveservices/v1';
  const key=process.env[config.voice.api_key_env];
  if(!key)throw new Error(`Azure Speech requires the ${config.voice.api_key_env} environment variable.`);
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/ssml+xml','Ocp-Apim-Subscription-Key':key,
    'X-Microsoft-OutputFormat':'riff-24khz-16bit-mono-pcm','User-Agent':'StoryVideoFactory'},
    body:`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xml(voiceLocale??speechLocale(config.project.language))}"><voice name="${xml(voice)}">${xml(text)}</voice></speak>`,
    signal:AbortSignal.timeout(config.voice.timeout_ms),redirect:'error'});
  await writeSpeechResponse(response,output);
}
