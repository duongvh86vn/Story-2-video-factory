import {lstatSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {hash} from '../core/utils.js';
import {NativeHeadSourceFileSchema,nativeHeadSources,type NativeHeadBank,type NativeHeadSource} from './native-head-bank.js';
import {nativeHeadIdentities} from './native-head-identity.js';

type Source=NativeHeadSource;
export type NativeHeadResource={file:string;sha256:string;path:string;nativeHeadSource?:{width:number;height:number;primary:NativeHeadBank['primary']};nativeHeadPrimary?:true};
const PNG=Buffer.from([137,80,78,71,13,10,26,10]),MAX_BYTES=40*1024*1024;
/** Every descendant is a real bounded repository file. No URL, link, arbitrary
 * path, decoded/resampled asset or stale embedded-cache shortcut. */
function readSource(root:string,file:string){
  if(!NativeHeadSourceFileSchema.safeParse(file).success&&!Object.values(nativeHeadIdentities).some(identity=>identity.primary.file===file))throw new Error('Unknown registered native head resource');
  let target=path.resolve(root);const parts=file.split('/');
  for(const [i,part] of parts.entries()){
    target=path.join(target,part);const stat=lstatSync(target);
    if(stat.isSymbolicLink()||(i===parts.length-1?!stat.isFile()||stat.size>MAX_BYTES:!stat.isDirectory()))throw new Error('Invalid linked/oversized native head source');
  }
  const bytes=readFileSync(target);if(bytes.length>MAX_BYTES)throw new Error('Oversized native head source');return bytes;
}
/** PNG framing/dimensions/format guard. This is not artistic inspection, a
 * pixel correspondence proof or a replacement for static RGBA measurement. */
export function validateNativeHeadPng(bytes:Buffer,width:number,height:number){
  if(bytes.length>MAX_BYTES||bytes.length<45||!bytes.subarray(0,8).equals(PNG)||bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(16)!==width||bytes.readUInt32BE(20)!==height||width*height>20_000_000||bytes[24]!==8||bytes[25]!==6||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)throw new Error('Native head source differs from registered single noninterlaced RGBA PNG dimensions');
  let offset=8,seenHeader=false,seenData=false,ended=false;
  while(offset<bytes.length){
    if(offset+12>bytes.length)throw new Error('Truncated native head PNG');
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+length+12;
    if(end>bytes.length||ended||['acTL','fcTL','fdAT'].includes(type))throw new Error('Invalid or animated native head PNG');
    if(type==='IHDR'){if(seenHeader||offset!==8||length!==13)throw new Error('Duplicate native head PNG header');seenHeader=true;}
    if(type==='IDAT'&&length)seenData=true;
    if(type==='IEND'){if(length||!seenData||end!==bytes.length)throw new Error('Invalid native head PNG end');ended=true;}
    offset=end;
  }
  if(!ended)throw new Error('Missing native head PNG end');
}
export function readNativeHeadPrimary(root:string,primary:NativeHeadBank['primary']){
  const bytes=readSource(root,primary.file);if(hash(bytes)!==primary.sha256)throw new Error('Native head primary identity source changed');return bytes;
}
export function readNativeHeadSource(root:string,source:Source,primary:NativeHeadBank['primary']){
  readNativeHeadPrimary(root,primary);
  const bytes=readSource(root,source.file);if(hash(bytes)!==source.sha256)throw new Error('Native head cell artwork changed');
  validateNativeHeadPng(bytes,source.width,source.height);return bytes;
}
export function nativeHeadResources(bank:NativeHeadBank):NativeHeadResource[]{return [
  ...nativeHeadSources(bank).map(source=>({file:source.file,sha256:source.sha256,path:'assets/rigs/'+source.sha256+'.png',nativeHeadSource:{width:source.width,height:source.height,primary:bank.primary}})),
  {...bank.primary,path:'assets/rigs/'+bank.primary.sha256+'.png',nativeHeadPrimary:true},
];}
