import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {hash,safePath,safeRealPath} from '../core/utils.js';

export const MOTION_JSON_LIMIT=2*1024*1024,MOTION_PNG_LIMIT=16*1024*1024,MOTION_PIXELS=64_000_000;
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
export function motionCanonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(motionCanonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)
    .map(([key,v])=>`${JSON.stringify(key)}:${motionCanonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Reject every link component as well as escapes, including in-project links. */
export async function motionFilePath(root:string,relative:string):Promise<string>{
  const target=safePath(root,relative),rel=path.relative(path.resolve(root),target);
  let current=path.resolve(root);
  for(const part of rel.split(path.sep).filter(Boolean)){
    current=path.join(current,part);
    if((await fs.lstat(current)).isSymbolicLink())throw new Error('Motion paths cannot contain symlinks');
  }
  return safeRealPath(root,relative);
}
export async function motionRead(root:string,relative:string,limit:number):Promise<Buffer>{
  const file=await motionFilePath(root,relative),handle=await fs.open(file,'r');
  try{
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size>limit)throw new Error('Motion file exceeds size limit or is not a file');
    const buffer=Buffer.alloc(Math.min(stat.size+1,limit+1));let offset=0;
    while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead;}
    const after=await handle.stat();
    if(offset>limit||after.size>limit||after.size!==stat.size||offset!==stat.size)throw new Error('Motion file changed during bounded read');
    return buffer.subarray(0,offset);
  }finally{await handle.close();}
}
export async function motionPng(bytes:Buffer):Promise<{width:number;height:number;hash:string}>{
  if(bytes.length>MOTION_PNG_LIMIT||!bytes.subarray(0,8).equals(pngSignature))throw new Error('Invalid PNG signature/size');
  const image=sharp(bytes,{limitInputPixels:MOTION_PIXELS,failOn:'warning'}),info=await image.metadata();
  if(info.format!=='png'||!info.width||!info.height||!info.hasAlpha||info.width>32768||info.height>32768||info.width*info.height>MOTION_PIXELS||(info.pages??1)!==1)throw new Error('Invalid PNG dimensions/alpha/pages');
  const decoded=await image.raw().toBuffer({resolveWithObject:true});
  if(decoded.info.width!==info.width||decoded.info.height!==info.height)throw new Error('PNG decoded dimensions mismatch');
  return {width:info.width,height:info.height,hash:hash(bytes)};
}
export async function motionDirectories(root:string,relative:string):Promise<void>{
  let prefix='';
  for(const part of relative.split('/')){
    prefix=prefix?`${prefix}/${part}`:part;
    try{await fs.mkdir(safePath(root,prefix));}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
    if(!(await fs.stat(await motionFilePath(root,prefix))).isDirectory())throw new Error('Motion output parent is not a directory');
  }
}
export async function motionWriteImmutable(root:string,relative:string,bytes:Buffer,limit:number):Promise<void>{
  if(bytes.length>limit)throw new Error('Motion output exceeds size limit');
  const parent=path.posix.dirname(relative);await motionFilePath(root,parent);
  const temp=`${parent}/.${randomUUID()}.tmp`;let created=false;
  try{
    const handle=await fs.open(safePath(root,temp),'wx');created=true;
    try{await handle.writeFile(bytes);}finally{await handle.close();}
    try{await fs.link(await motionFilePath(root,temp),safePath(root,relative));}
    catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;if(!(await motionRead(root,relative,limit)).equals(bytes))throw new Error('Immutable motion output conflict');}
  }finally{if(created)await fs.unlink(safePath(root,temp)).catch(()=>{});}
}
/** Validate the selected source directory and every ancestor up to its volume. */
export async function motionSourceDirectory(file:string):Promise<string>{
  const directory=path.dirname(file),filesystemRoot=path.parse(file).root;
  return motionFilePath(filesystemRoot,path.relative(filesystemRoot,directory));
}
