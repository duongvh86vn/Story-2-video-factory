import {promises as fs} from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../../packages/core/config.js';
import {loadHost} from '../../packages/host/index.js';
import {HostProfileSchema,HostRigSchema} from '../../packages/host/schemas.js';
import {hash} from '../../packages/core/utils.js';
import {inspectSourceProductionCandidate,type SourceProductionAuditInput} from '../../packages/director/source-production-audit.js';
import {ApiError,boundPath,redact} from './security.js';

const MAX_ARTIFACT_BYTES=4*1024*1024;
const required=['storyboard.json','beats.json','character-bible.json','host-profile.json','host-rig.json'] as const;

/** Exact source bytes, including the preferred voiced-narration selection.
 * This route is diagnostic, read-only, with no provider or production job. */
async function sourceFiles(root:string){
  const read=async(file:string,optional=false)=>{
    try{
      const absolute=await boundPath(root,'work/'+file),handle=await fs.open(absolute,'r');
      try{const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_ARTIFACT_BYTES)throw new ApiError(413,'Source audit artifact exceeds its bounded size.','SOURCE_AUDIT_TOO_LARGE');
        const bytes=await handle.readFile();if(bytes.length>MAX_ARTIFACT_BYTES)throw new ApiError(413,'Source audit artifact exceeds its bounded size.','SOURCE_AUDIT_TOO_LARGE');return bytes;
      }finally{await handle.close();}
    }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'||error instanceof ApiError&&error.code==='NOT_FOUND'){if(optional)return null;throw new ApiError(409,'Create narration, analysis, host and storyboard artifacts before source audit.','SOURCE_AUDIT_CONTEXT_MISSING');}throw error;}
  };
  const voiced=await read('voiced-narration.json',true),narrationFile=voiced?'voiced-narration.json':'narration.json';
  const files=Object.fromEntries(await Promise.all(required.map(async file=>[file,(await read(file))!])));
  files[narrationFile]=voiced??(await read(narrationFile))!;
  return {files,narrationFile,receipts:Object.fromEntries(Object.entries(files).map(([file,bytes])=>['work/'+file,hash(bytes)]))};
}

export async function readSourceProductionAudit(root:string){
  const before=await sourceFiles(root),config=await loadConfig(root),host=await loadHost(root);
  // Bind the host that loadHost actually verified to the snapshot used below.
  const json=(file:string)=>{try{return JSON.parse(before.files[file]!.toString('utf8'));}catch{throw new ApiError(422,'Source audit input is not valid JSON.','SOURCE_AUDIT_INVALID');}};
  const profile=HostProfileSchema.parse(json('host-profile.json')),rig=HostRigSchema.parse(json('host-rig.json'));
  if(hash(host.profile)!==hash(profile)||hash(host.rig)!==hash(rig))throw new ApiError(409,'Source changed while preparing its audit. Reload and audit again.','SOURCE_AUDIT_STALE');
  const input={board:json('storyboard.json'),narration:json(before.narrationFile),beats:json('beats.json'),characters:json('character-bible.json'),profile,rig,config} as SourceProductionAuditInput;
  let report:ReturnType<typeof inspectSourceProductionCandidate>;
  try{report=inspectSourceProductionCandidate(input);}catch(error){throw new ApiError(422,redact(error instanceof Error?error.message:String(error)),'SOURCE_AUDIT_INVALID');}
  const [after,currentConfig,currentHost]=await Promise.all([sourceFiles(root),loadConfig(root),loadHost(root)]);
  if(before.narrationFile!==after.narrationFile||hash(before.receipts)!==hash(after.receipts)||hash(config)!==hash(currentConfig)||hash(host)!==hash(currentHost))
    throw new ApiError(409,'Source changed during audit. Reload and audit the current revision.','SOURCE_AUDIT_STALE');
  return {...report,checks:report.checks.map(check=>({...check,...(check.message?{message:redact(check.message)}:{})})),
    fileReceipts:before.receipts,narrationFile:'work/'+before.narrationFile,revisionChecked:true as const,
    freshness:'optimistic end-of-read comparison; not an OS snapshot, asset/audio receipt or publication authority' as const};
}
