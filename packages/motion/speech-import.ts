import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {MotionHash,type ActorMotion} from './schemas.js';
import {ACTOR_SPEECH_VERSION,ActorSpeechSchema,ActorSpeechRegistrationSchema,bindActorSpeech,type ActorSpeech} from './speech-schemas.js';
import {loadActorMotion} from './import.js';
import {MOTION_JSON_LIMIT,MOTION_PNG_LIMIT,MOTION_PIXELS,motionCanonical,motionDirectories,motionFilePath,motionPng,motionRead,motionSourceDirectory,motionWriteImmutable} from './files.js';

const directory=(id:string,fingerprint:string)=>`assets/motion-speech/${id}/${fingerprint}`;
const sheetPath=(id:string,fingerprint:string)=>`${directory(id,fingerprint)}/sheet.png`;
function descriptorHash(speech:ActorSpeech){
  const {fingerprint:_,...descriptor}=speech;
  return hash(motionCanonical({...descriptor,sheet:{...speech.sheet,path:sheetPath(speech.id,'{fingerprint}')}}));
}
async function rgba(bytes:Buffer,width:number,height:number):Promise<Buffer>{
  const decoded=await sharp(bytes,{limitInputPixels:MOTION_PIXELS,failOn:'warning'}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(decoded.info.width!==width||decoded.info.height!==height||decoded.info.channels!==4)throw new Error('Speech decoded RGBA layout mismatch');
  return decoded.data;
}
/** Pixels are decoded for comparison only. Saved source/variant PNGs are never re-encoded. */
async function comparePixels(root:string,motion:ActorMotion,variant:ActorSpeech,bytes:Buffer){
  bindActorSpeech(motion,variant);
  const baseBytes=await motionRead(root,motion.sheet.path,MOTION_PNG_LIMIT);
  if(hash(baseBytes)!==motion.sheet.hash)throw new Error('Native motion PNG changed during speech registration');
  const {width,height}=motion.sheet;
  const base=await rgba(baseBytes,width,height),alternate=await rgba(bytes,width,height),allowed=new Uint8Array(width*height);
  for(const [index,frame] of motion.frames.entries()){
    const region=variant.regions[index]!;
    for(let y=0;y<region.h;y++){const offset=(frame.rect.y+region.y+y)*width+frame.rect.x+region.x;allowed.fill(1,offset,offset+region.w);}
  }
  const differs=(pixel:number)=>{const at=pixel*4;return base[at]!==alternate[at]||base[at+1]!==alternate[at+1]||base[at+2]!==alternate[at+2]||base[at+3]!==alternate[at+3];};
  for(let pixel=0;pixel<allowed.length;pixel++)if(!allowed[pixel]&&differs(pixel))throw new Error('Speech variant changes pixels outside registered mouth regions');
  // Overlapping/repeated native rectangles must each protect their own face,
  // even if another frame happens to permit that sheet pixel.
  for(const [index,frame] of motion.frames.entries()){
    const region=variant.regions[index]!;let changed=false;
    for(let y=0;y<frame.rect.h;y++)for(let x=0;x<frame.rect.w;x++){
      if(!differs((frame.rect.y+y)*width+frame.rect.x+x))continue;
      if(x<region.x||x>=region.x+region.w||y<region.y||y>=region.y+region.h)throw new Error(`Speech variant changes pixels outside frame mouth region: ${index}`);
      changed=true;
    }
    if(!changed)throw new Error(`Speech variant has no alternate mouth artwork in frame: ${index}`);
  }
}
export async function importActorSpeech(root:string,sheetFile:string,registrationFile:string):Promise<ActorSpeech>{
  const registrationPath=path.resolve(root,registrationFile),registrationRoot=await motionSourceDirectory(registrationPath);
  const registrationBytes=await motionRead(registrationRoot,path.basename(registrationPath),MOTION_JSON_LIMIT);
  const registration=ActorSpeechRegistrationSchema.parse(JSON.parse(registrationBytes.toString('utf8')));
  const motion=await loadActorMotion(root,registration.motionId,registration.motionFingerprint);
  const selectedSheet=path.resolve(root,sheetFile),sourceRoot=await motionSourceDirectory(selectedSheet);
  const bytes=await motionRead(sourceRoot,path.basename(selectedSheet),MOTION_PNG_LIMIT),sheet=await motionPng(bytes);
  const variant=ActorSpeechSchema.parse({version:ACTOR_SPEECH_VERSION,id:registration.id,actorId:motion.actorId,motionId:motion.id,motionFingerprint:motion.fingerprint,
    view:motion.view,referenceHash:motion.source.referenceHash,fingerprint:'0'.repeat(64),source:{registrationHash:hash(motionCanonical(registration)),baseSheetHash:motion.sheet.hash},
    sheet:{...sheet,path:sheetPath(registration.id,'0'.repeat(64))},regions:registration.regions,
    review:{status:'candidate',productionReady:false,warnings:['Candidate authored rest/open mouth artwork; pixel/landmark checks do not approve anatomy, identity or acting.','Supports binary speech activity only; not phoneme lip-sync.']}});
  await comparePixels(root,motion,variant,bytes);
  variant.fingerprint=descriptorHash(variant);variant.sheet.path=sheetPath(variant.id,variant.fingerprint);
  const manifest=Buffer.from(motionCanonical(variant)+'\n');
  if(manifest.length>MOTION_JSON_LIMIT)throw new Error('Speech manifest exceeds size limit');
  await motionDirectories(root,directory(variant.id,variant.fingerprint));
  await motionWriteImmutable(root,variant.sheet.path,bytes,MOTION_PNG_LIMIT);
  await motionWriteImmutable(root,`${directory(variant.id,variant.fingerprint)}/manifest.json`,manifest,MOTION_JSON_LIMIT);
  return loadActorSpeech(root,variant.id,variant.fingerprint);
}
export async function loadActorSpeech(root:string,id:string,fingerprint:string):Promise<ActorSpeech>{
  Id.parse(id);MotionHash.parse(fingerprint);
  const variant=ActorSpeechSchema.parse(JSON.parse((await motionRead(root,`${directory(id,fingerprint)}/manifest.json`,MOTION_JSON_LIMIT)).toString('utf8')));
  if(variant.id!==id||variant.fingerprint!==fingerprint||variant.sheet.path!==sheetPath(id,fingerprint)||descriptorHash(variant)!==fingerprint)throw new Error('Speech descriptor integrity mismatch');
  const bytes=await motionRead(root,variant.sheet.path,MOTION_PNG_LIMIT),sheet=await motionPng(bytes);
  if(sheet.hash!==variant.sheet.hash||sheet.width!==variant.sheet.width||sheet.height!==variant.sheet.height)throw new Error('Speech PNG integrity mismatch');
  await comparePixels(root,await loadActorMotion(root,variant.motionId,variant.motionFingerprint),variant,bytes);
  return variant;
}
export async function actorSpeechSheetBytes(root:string,input:ActorSpeech):Promise<Buffer>{
  const variant=await loadActorSpeech(root,input.id,input.fingerprint);
  if(hash(variant)!==hash(input))throw new Error('Speech descriptor changed before staging');
  const bytes=await motionRead(root,variant.sheet.path,MOTION_PNG_LIMIT);
  if(hash(bytes)!==variant.sheet.hash)throw new Error('Speech PNG changed before staging');
  return bytes;
}
export async function listActorSpeech(root:string):Promise<ActorSpeech[]>{
  let base:string;try{base=await motionFilePath(root,'assets/motion-speech');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const result:ActorSpeech[]=[];
  for await(const id of await fs.opendir(base)){
    if(!id.isDirectory()||id.isSymbolicLink()||!Id.safeParse(id.name).success)continue;
    for await(const version of await fs.opendir(await motionFilePath(root,`assets/motion-speech/${id.name}`))){
      if(!version.isDirectory()||version.isSymbolicLink()||!MotionHash.safeParse(version.name).success)continue;
      if(result.length===256)throw new Error('Speech list exceeds 256 versions');
      result.push(await loadActorSpeech(root,id.name,version.name));
    }
  }
  return result.sort((a,b)=>a.id.localeCompare(b.id)||a.fingerprint.localeCompare(b.fingerprint));
}
