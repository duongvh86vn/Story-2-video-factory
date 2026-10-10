import type {FactoryConfig} from '../core/config.js';
import type {ScriptDocument} from '../ingest/script.js';

export const DIALOGUE_VOICE_VERSION='explicit-dialogue-voice-1';
export const explicitDialogueDescription={version:DIALOGUE_VOICE_VERSION,format:'explicit opt-in [speaker-id] turns; narrator is voiceover',
  sourceSpeaker:'authoritative cue owner; actor art model cannot rename speaker',voice:'one selected provider/language; stable per-speaker voice IDs; resolve all roles before requests',
  cache:'per cue text/provider/voice/language/options; real measured durations; no authoring rewrite for voice changes',
  synchronization:'audio activity, not phoneme lip-sync',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
export class MissingSpeakerVoiceError extends Error {constructor(message:string){super(`needs-voice: ${message}`);this.name='MissingSpeakerVoiceError';}}
/** Resolve every turn before the first provider request. A missing actor voice
 * cannot silently fall back to the narrator; WAV never calls this resolver. */
export function scriptVoiceSelections(script:ScriptDocument,config:FactoryConfig):Map<string,FactoryConfig>{
  const voices=new Map<string,string>();
  for(const row of config.voice.speaker_voices??[]){
    if(voices.has(row.speaker_id)||!row.voice_id.trim())throw new MissingSpeakerVoiceError('Each speaker needs exactly one nonempty voice mapping');
    voices.set(row.speaker_id,row.voice_id);
  }
  const result=new Map<string,FactoryConfig>();
  for(const chunk of script.chunks){
    if(script.format==='dialogue'&&!chunk.speakerId)throw new MissingSpeakerVoiceError('Dialogue chunk has no explicit speaker');
    if(chunk.speakerId&&script.format!=='dialogue')throw new MissingSpeakerVoiceError('Speaker metadata requires explicit dialogue format');
    const id=chunk.speakerId??'narrator';if(result.has(id))continue;
    const voiceId=(script.format==='dialogue'?voices.get(id):undefined)??(id==='narrator'?config.voice.voice_id:undefined);
    if(id!=='narrator'&&!voiceId)throw new MissingSpeakerVoiceError(`Configure voice.speaker_voices for ${id}`);
    result.set(id,{...config,voice:{...config.voice,voice_id:voiceId??null}});
  }
  return result;
}
