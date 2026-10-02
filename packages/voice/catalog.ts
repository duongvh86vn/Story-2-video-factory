import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { z } from 'zod';
import { findRepoRoot } from '../core/config.js';
import { primaryLanguage } from '../core/languages.js';

export const WindowsVoiceSchema = z.object({ id:z.string(), language:z.string(), gender:z.string() });
export type WindowsVoice = z.infer<typeof WindowsVoiceSchema>;
export interface WindowsVoiceCatalog { status:'available'|'unavailable'; voices:WindowsVoice[]; error?:string; }
export async function installedWindowsVoices():Promise<WindowsVoiceCatalog>{
  if(process.platform!=='win32')return {status:'unavailable',voices:[],error:'Windows Speech requires Windows.'};
  try {
    const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(await findRepoRoot(),'scripts/windows-tts.ps1'),'-ListVoices'],{windowsHide:true,timeout:10000,maxBuffer:256*1024});
    const voices=z.array(WindowsVoiceSchema).parse(JSON.parse(stdout.replace(/^\uFEFF/,'')));
    return {status:'available',voices};
  }catch{return {status:'unavailable',voices:[],error:'Could not enumerate installed Windows Speech voices.'};}
}
export function matchingWindowsVoices(voices:WindowsVoice[],language:string):WindowsVoice[]{
  return voices.filter(voice=>primaryLanguage(voice.language)===primaryLanguage(language)&&(!language.includes('-')||voice.language.toLowerCase()===language.toLowerCase()));
}
