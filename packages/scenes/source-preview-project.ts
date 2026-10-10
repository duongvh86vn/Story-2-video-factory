import {promises as fs} from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../core/config.js';
import {AssetManifestSchema} from '../core/schemas.js';
import {hash,safeRealPath} from '../core/utils.js';
import {loadHost} from '../host/index.js';
import {snapshotSourceProductionCandidate,type SourceProductionAuditInput} from '../director/source-production-audit.js';
import {ActivitySchema} from '../voice/schemas.js';
import {validateSpeechActivityTrack} from '../animation/speech-clock.js';

const MAX_SOURCE_BYTES=4*1024*1024;
export const MAX_PREVIEW_RESOURCE_BYTES=64*1024*1024;
const required=['storyboard.json','beats.json','character-bible.json','host-profile.json','host-rig.json','speech-activity.json'] as const;

/** Read-only and bounded, including junction/symlink containment. Missing or
 * oversized inputs are not repaired and no provider is requested. */
export async function readPreviewBytes(root:string,relative:string,maxBytes=MAX_SOURCE_BYTES,optional=false):Promise<Buffer|null>{
  try{
    const file=await safeRealPath(root,relative),handle=await fs.open(file,'r');
    try{const stat=await handle.stat();if(!stat.isFile()||stat.size>maxBytes)throw new Error(`needs-source-preview-context: oversized/non-file input ${relative}`);
      const bytes=await handle.readFile();if(bytes.length>maxBytes)throw new Error(`needs-source-preview-context: oversized input ${relative}`);return bytes;
    }finally{await handle.close();}
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){if(optional)return null;throw new Error(`needs-source-preview-context: missing ${relative}`);}throw error;}
}

/** Optimistic project snapshot. Raw source bytes, optional file absence, the
 * chosen narration, effective configuration and canonical host are all bound.
 * Credentials/configuration are never included in the exported snapshot. */
export async function readSourcePreviewProject(projectRoot:string){
  const root=await fs.realpath(projectRoot),files:Record<string,Buffer>={},fileReceipts:Record<string,string|null>={};
  const read=async(file:string,optional=false)=>{
    const bytes=await readPreviewBytes(root,'work/'+file,MAX_SOURCE_BYTES,optional);
    fileReceipts['work/'+file]=bytes?hash(bytes):null;if(bytes)files[file]=bytes;return bytes;
  };
  const voiced=await read('voiced-narration.json',true),narrationFile=voiced?'voiced-narration.json':'narration.json';
  if(!voiced)await read(narrationFile);
  for(const file of required)await read(file);
  await read('asset-manifest.json',true);
  const json=(file:string)=>{try{return JSON.parse(files[file]!.toString('utf8'));}catch{throw new Error(`needs-source-preview-context: invalid JSON ${file}`);}};
  const config=await loadConfig(root),host=await loadHost(root);
  const input=snapshotSourceProductionCandidate({board:json('storyboard.json'),narration:json(narrationFile),beats:json('beats.json'),characters:json('character-bible.json'),profile:json('host-profile.json'),rig:json('host-rig.json'),config} as SourceProductionAuditInput);
  if(hash(host.profile)!==hash(input.profile)||hash(host.rig)!==hash(input.rig))throw new Error('needs-source-preview-context: canonical host changed during source read');
  const activity=ActivitySchema.parse(json('speech-activity.json'));validateSpeechActivityTrack(activity);
  if(activity.intervals.some(c=>c.endMs>input.narration.durationMs))throw new Error('needs-source-preview-context: speech activity exceeds narration');
  const manifest=AssetManifestSchema.parse(files['asset-manifest.json']?json('asset-manifest.json'):{assets:[]});
  return {root,input,activity,manifest,fileReceipts,narrationFile:'work/'+narrationFile,configHash:hash(config),hostHash:hash(host)};
}
export type SourcePreviewProject=Awaited<ReturnType<typeof readSourcePreviewProject>>;

/** Re-read the whole authority, including siblings and preferred narration.
 * A later revision never becomes proof of a previously emitted scene. */
export async function assertSourcePreviewProjectCurrent(snapshot:SourcePreviewProject):Promise<void>{
  const current=await readSourcePreviewProject(snapshot.root);
  if(snapshot.narrationFile!==current.narrationFile||hash(snapshot.fileReceipts)!==hash(current.fileReceipts)||snapshot.configHash!==current.configHash||snapshot.hostHash!==current.hostHash||hash(snapshot.input)!==hash(current.input)||hash(snapshot.activity)!==hash(current.activity))
    throw new Error('needs-source-preview-context: source changed during preview export; export the current revision again');
}

/** No re-encoding, downloads or unreceipted derivatives. Only original still
 * raster backgrounds are staged; other formats require a separate contract. */
export function previewRasterPath(file:string,bytes:Buffer,sha256:string):string{
  if(!/^[a-f0-9]{64}$/.test(sha256)||hash(bytes)!==sha256)throw new Error('needs-source-preview-context: background hash mismatch');
  const extension=path.extname(file).toLowerCase();
  const png=bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=bytes.length>=16&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!(extension==='.png'&&png||['.jpg','.jpeg'].includes(extension)&&jpeg||extension==='.webp'&&webp))throw new Error('needs-source-preview-context: background must be an original PNG/JPEG/WebP still image');
  if(png){
    if(bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(16)===0||bytes.readUInt32BE(20)===0)throw new Error('needs-source-preview-context: invalid PNG header');
    for(let at=8;at<bytes.length;){
      if(at+12>bytes.length)throw new Error('needs-source-preview-context: truncated PNG chunk');
      const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);
      if(at+12+length>bytes.length)throw new Error('needs-source-preview-context: truncated PNG chunk');
      if(type==='acTL')throw new Error('needs-source-preview-context: animated background has no canonical clock contract');
      at+=12+length;
    }
  }
  if(webp){
    if(bytes.readUInt32LE(4)+8!==bytes.length)throw new Error('needs-source-preview-context: invalid WebP size');
    for(let at=12;at<bytes.length;){
      if(at+8>bytes.length)throw new Error('needs-source-preview-context: truncated WebP chunk');
      const length=bytes.readUInt32LE(at+4),type=bytes.toString('ascii',at,at+4),next=at+8+length+(length%2);
      if(next>bytes.length)throw new Error('needs-source-preview-context: truncated WebP chunk');
      if(type==='ANIM'||type==='ANMF')throw new Error('needs-source-preview-context: animated background has no canonical clock contract');
      at=next;
    }
  }
  return 'assets/source/'+sha256+extension;
}
