import {promises as fs} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {Id} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {MOTION_JSON_LIMIT as JSON_LIMIT,MOTION_PNG_LIMIT as PNG_LIMIT,motionCanonical as canonical,motionFilePath as local,
  motionRead as bounded,motionPng as png,motionDirectories as directories,motionWriteImmutable as immutable,motionSourceDirectory as sourceDirectory} from './files.js';
import {ACTOR_MOTION_VERSION, ActorMotionSchema, MotionHash, MotionPoint, MotionRect, MotionRegistrationSchema,
  type ActorMotion, type MotionRegistration} from './schemas.js';

const count=z.number().int().min(1).max(512);
const duration=z.number().finite().min(1).max(60000);
const object=z.record(z.unknown());
const own=(value:Record<string,unknown>, key:string):unknown=>Object.hasOwn(value,key)?value[key]:undefined;
const record=(value:unknown):Record<string,unknown>=>object.parse(value);

const sheetPath=(id:string,fingerprint:string)=>`assets/motions/${id}/${fingerprint}/sheet.png`;
/** Break the path/fingerprint cycle using a fixed token. Load separately enforces the exact expanded path.
 * Every other saved field, including source hashes, review and playback, participates in this hash. */
function descriptorHash(motion:ActorMotion):string {
  const {fingerprint:_,...descriptor}=motion;
  return hash(canonical({...descriptor,sheet:{...motion.sheet,path:sheetPath(motion.id,'{fingerprint}')}}));
}

export function normalizeSpriteMotion(metadata:unknown, sheet:{width:number;height:number;hash:string}, registration:MotionRegistration, metadataHash:string):ActorMotion {
  const reg=MotionRegistrationSchema.parse(registration), meta=record(metadata);
  MotionHash.parse(metadataHash);MotionHash.parse(sheet.hash);
  let rects:z.infer<typeof MotionRect>[], durations:number[], loop:boolean;
  let kind:ActorMotion['source']['kind'];
  let sourcePoints:unknown;
  const warnings=['Candidate import: referenceHash records provenance only; identity and quality require review.'];
  if(Object.hasOwn(meta,'frame_layout')) {
    kind='sprite-gen-atlas';
    const layout=record(meta.frame_layout), rows=record(layout.rows);
    rects=z.array(MotionRect).min(1).max(512).parse(own(rows,reg.state));
    const anim=record(own(record(record(meta.animation).rows),reg.state));
    if(Object.hasOwn(anim,'frames') && count.parse(anim.frames)!==rects.length)throw new Error('Atlas frame count mismatch');
    durations=Object.hasOwn(anim,'durations_ms')
      ? z.array(duration).length(rects.length).parse(anim.durations_ms)
      : rects.map(()=>duration.parse(1000/z.number().finite().positive().parse(anim.fps)));
    loop=z.boolean().parse(anim.loop);
    if(meta.rig!==undefined) {
      const rig=record(meta.rig);
      if(rig.landmarks!==undefined)sourcePoints=own(record(rig.landmarks),reg.state);
    }
  } else {
    kind='sprite-gen-strip';
    const n=count.parse(meta.frames), w=z.number().int().positive().parse(meta.w), h=z.number().int().positive().parse(meta.h);
    if(w*n!==sheet.width||h!==sheet.height)throw new Error('Strip dimensions do not match sheet');
    rects=Array.from({length:n},(_,i)=>({x:i*w,y:0,w,h}));
    durations=rects.map(()=>duration.parse(meta.delay_ms));
    if(Object.hasOwn(meta,'loop'))loop=z.boolean().parse(meta.loop);
    else {
      const stripKind=z.enum(['periodic','pinned','one-shot']).parse(meta.kind);
      loop=stripKind!=='one-shot';
      warnings.push(`Source loop inferred from strip kind=${stripKind}; registration playback remains explicit.`);
    }
  }
  if(reg.landmarks && reg.landmarks.length!==rects.length)throw new Error('Registration landmarks must cover every playback position');
  if(reg.anchors && reg.anchors.length!==rects.length)throw new Error('Registration anchors must cover every playback position');
  const upstream=reg.landmarks===undefined && sourcePoints!==undefined
    ? z.array(z.record(z.tuple([z.number().finite(),z.number().finite()]))).length(rects.length).parse(sourcePoints):undefined;
  const frames=rects.map((rect,i)=>{
    const landmarks=reg.landmarks?.[i] ?? Object.fromEntries(Object.entries(upstream?.[i]??{})
      .map(([name,p])=>[name,MotionPoint.parse({x:p[0]-rect.x,y:p[1]-rect.y})]));
    for(const name of reg.requiredLandmarks)if(!Object.hasOwn(landmarks,name))throw new Error(`Missing required landmark ${name} at frame ${i}`);
    return {rect,durationMs:durations[i]!,anchor:reg.anchors?.[i]??reg.anchor,landmarks};
  });
  const motion=ActorMotionSchema.parse({version:ACTOR_MOTION_VERSION,id:reg.id,actorId:reg.actorId,state:reg.state,view:reg.view,
    fingerprint:'0'.repeat(64),source:{kind,metadataHash,sheetHash:sheet.hash,registrationHash:hash(canonical(reg)),referenceHash:reg.referenceHash,loop},
    sheet:{...sheet,path:sheetPath(reg.id,'0'.repeat(64))},playback:reg.playback,frames,
    review:{status:'candidate',productionReady:false,warnings}});
  motion.fingerprint=descriptorHash(motion);motion.sheet.path=sheetPath(motion.id,motion.fingerprint);
  return ActorMotionSchema.parse(motion);
}

export async function importActorMotion(projectRoot:string, metadataFile:string, registrationFile:string):Promise<ActorMotion> {
  // Caller may select a local source outside the project; PNG must remain inside its metadata directory.
  const metadataPath=path.resolve(projectRoot,metadataFile), sourceRoot=await sourceDirectory(metadataPath);
  const metadataBytes=await bounded(sourceRoot,path.basename(metadataPath),JSON_LIMIT);
  const registrationPath=path.resolve(projectRoot,registrationFile);
  const registrationRoot=await sourceDirectory(registrationPath);
  const reg=MotionRegistrationSchema.parse(JSON.parse((await bounded(registrationRoot,path.basename(registrationPath),JSON_LIMIT)).toString('utf8')));
  const metadata:unknown=JSON.parse(metadataBytes.toString('utf8')), meta=record(metadata);
  let sourceSheet:string;
  if(Object.hasOwn(meta,'frame_layout')) {
    sourceSheet=z.string().min(1).parse(meta.game_input);
    if(sourceSheet.includes('\\')||sourceSheet.includes(':')||sourceSheet.includes('\0')||sourceSheet.startsWith('/')||sourceSheet.split('/').some(p=>!p||p==='.'||p==='..')||!sourceSheet.endsWith('.png'))throw new Error('Unsafe atlas PNG path');
  } else {
    if(!metadataPath.endsWith('.strip.json'))throw new Error('Strip metadata must be named <name>.strip.json');
    sourceSheet=path.basename(metadataPath).replace(/\.strip\.json$/,'.strip.png');
  }
  const bytes=await bounded(sourceRoot,sourceSheet,PNG_LIMIT);
  const motion=normalizeSpriteMotion(metadata,await png(bytes),reg,hash(metadataBytes));
  const manifestBytes=Buffer.from(canonical(motion)+'\n');
  // Normalized landmark maps can exceed the input JSON size. Reject before publishing either file.
  if(manifestBytes.length>JSON_LIMIT)throw new Error('Motion manifest exceeds size limit');
  const directory=`assets/motions/${motion.id}/${motion.fingerprint}`;
  await directories(projectRoot,directory);
  await immutable(projectRoot,motion.sheet.path,bytes,PNG_LIMIT);
  await immutable(projectRoot,`${directory}/manifest.json`,manifestBytes,JSON_LIMIT);
  return loadActorMotion(projectRoot,motion.id,motion.fingerprint);
}

export async function loadActorMotion(projectRoot:string,id:string,fingerprint:string):Promise<ActorMotion> {
  Id.parse(id);MotionHash.parse(fingerprint);
  const motion=ActorMotionSchema.parse(JSON.parse((await bounded(projectRoot,`assets/motions/${id}/${fingerprint}/manifest.json`,JSON_LIMIT)).toString('utf8')));
  if(motion.id!==id||motion.fingerprint!==fingerprint||motion.sheet.path!==sheetPath(id,fingerprint)||descriptorHash(motion)!==fingerprint)throw new Error('Motion descriptor integrity mismatch');
  const sheet=await png(await bounded(projectRoot,motion.sheet.path,PNG_LIMIT));
  if(sheet.hash!==motion.sheet.hash||sheet.hash!==motion.source.sheetHash||sheet.width!==motion.sheet.width||sheet.height!==motion.sheet.height)throw new Error('Motion sheet integrity mismatch');
  return motion;
}

export async function listActorMotions(projectRoot:string):Promise<ActorMotion[]> {
  let base:string;
  try {base=await local(projectRoot,'assets/motions');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const result:ActorMotion[]=[];
  // Streaming directory iteration bounds memory and never follows directory symlinks.
  const ids=await fs.opendir(base);
  for await(const id of ids) {
    if(!id.isDirectory()||id.isSymbolicLink()||!Id.safeParse(id.name).success)continue;
    const versions=await fs.opendir(await local(projectRoot,`assets/motions/${id.name}`));
    for await(const version of versions) {
      if(!version.isDirectory()||version.isSymbolicLink()||!MotionHash.safeParse(version.name).success)continue;
      if(result.length===256)throw new Error('Motion list exceeds 256 versions');
      result.push(await loadActorMotion(projectRoot,id.name,version.name));
    }
  }
  return result.sort((a,b)=>a.id.localeCompare(b.id)||a.fingerprint.localeCompare(b.fingerprint));
}
