import type {FastifyInstance} from 'fastify';
import {promises as fs} from 'node:fs';
import {z} from 'zod';
import sharp from 'sharp';
import {hash,writeAtomic} from '../../packages/core/utils.js';
import {ApiError,boundPath,uploadFilename} from './security.js';
import {imageMotionWorkbench} from '../../packages/image-motion/workbench.js';
import {imageMotionArmWorkbench} from '../../packages/image-motion/arm-workbench.js';
import {ArmDefinitionSchema,armRecipe} from '../../packages/image-motion/arm-definition.js';
import {prepareCharacterSource,SOURCE_PART_VERSION} from '../../packages/image-motion/character-source.js';
import {validateDemo,type ImageMotionDemo} from '../../packages/image-motion/scene.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/),NoQuery=z.object({}).strict();
export const SurfaceRegionSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),cx:z.number().finite(),cy:z.number().finite(),rx:z.number().finite().positive(),ry:z.number().finite().positive(),periodMs:z.number().finite().min(100).max(60000),direction:z.union([z.literal(1),z.literal(-1)])}).strict();
const ImageSchema=z.object({id:Hash,filename:z.string().max(140),sourceHash:Hash,previewHash:Hash,format:z.enum(['png','jpeg']),sourceWidth:z.number().int().positive(),sourceHeight:z.number().int().positive(),width:z.number().int().positive().max(3840),height:z.number().int().positive().max(2160),regions:z.array(SurfaceRegionSchema).max(16),armMotion:z.object({definition:ArmDefinitionSchema,key:Hash}).strict().optional()}).strict();
const BookSchema=z.object({version:z.literal(1),images:z.array(ImageSchema).max(64)}).strict();
type Book=z.infer<typeof BookSchema>;
interface Context {rootFor:(name:string)=>Promise<string>;mutateLocal:<T>(name:string,action:(root:string)=>Promise<T>)=>Promise<T>}
const prefix='input/image-motion/',fileLimit=16*1024*1024;

async function readBook(root:string):Promise<{book:Book;revision:string}>{
  try {const bytes=await fs.readFile(await boundPath(root,prefix+'catalog.json'));if(bytes.length>256*1024)throw new ApiError(413,'Image catalog is too large.','IMAGE_CATALOG_LIMIT');return {book:BookSchema.parse(JSON.parse(bytes.toString('utf8'))),revision:hash(bytes)};}
  catch(e){if(e instanceof ApiError&&e.statusCode===404)return {book:{version:1,images:[]},revision:'new'};throw e;}
}
const snapshot=({book,revision}:{book:Book;revision:string})=>({...book,revision,productionReady:false as const});
function revision(current:string,expected:string){if(current!==expected)throw new ApiError(409,'Image selections changed. Reload before saving.','REVISION_CONFLICT');}
async function save(root:string,book:Book){const text=JSON.stringify(BookSchema.parse(book),null,2)+'\n';if(Buffer.byteLength(text)>256*1024)throw new ApiError(413,'The image catalog is too large. Use fewer polygon points.','IMAGE_CATALOG_LIMIT');await writeAtomic(await boundPath(root,prefix+'catalog.json',true),text);return snapshot({book,revision:hash(text)});}
async function immutable(root:string,relative:string,bytes:Buffer){
  const file=await boundPath(root,prefix+relative,true);
  try {await fs.writeFile(file,bytes,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(hash(await fs.readFile(file))!==hash(bytes))throw new ApiError(409,'Stored image differs from the source.','IMAGE_INTEGRITY');}
}
async function imageBytes(root:string,image:z.infer<typeof ImageSchema>,original=false){
  const file=await boundPath(root,prefix+image.id+(original?'.source':'.png')),stat=await fs.stat(file);
  if(stat.size>fileLimit)throw new ApiError(413,'Stored image exceeds the limit.','IMAGE_LIMIT');
  const bytes=await fs.readFile(file);if(hash(bytes)!==(original?image.sourceHash:image.previewHash))throw new ApiError(409,'Stored image changed. Restore the original before editing.','IMAGE_INTEGRITY');return bytes;
}
type Image=z.infer<typeof ImageSchema>;
const previewDirectory=(image:Image)=>prefix+'arm-previews/'+image.id+'/'+image.armMotion!.key;
async function armManifest(root:string,image:Image){
  if(!image.armMotion)throw new ApiError(404,'Chưa lưu tay cho ảnh này. Khoanh tay và lưu trước.','NOT_FOUND');
  await imageBytes(root,image,true);await imageBytes(root,image);
  const plateId=image.armMotion.definition.cleanPlateImageId;
  const current=plateId?(await readBook(root)).book.images.find(i=>i.id===plateId):undefined;
  if(plateId&&!current)throw new ApiError(409,'Ảnh nền sạch không còn trong project.','IMAGE_INTEGRITY');
  if(current){await imageBytes(root,current,true);await imageBytes(root,current);}
  const file=await boundPath(root,previewDirectory(image)+'/manifest.json');
  if((await fs.stat(file)).size>256*1024)throw new ApiError(413,'Motion manifest is too large.','IMAGE_LIMIT');
  const m=JSON.parse(await fs.readFile(file,'utf8')) as {demo:ImageMotionDemo;sourceHash:string;cleanPlateHash?:string;assetHashes:Record<string,string>;identity:string};
  validateDemo(m.demo);
  if(m.sourceHash!==image.previewHash||m.cleanPlateHash!==current?.previewHash||m.identity!==hash(m.demo)||!m.assetHashes||m.demo.scenes.length!==1||m.demo.scenes[0]!.width!==image.width||m.demo.scenes[0]!.height!==image.height)throw new ApiError(409,'Các layer đã thay đổi. Khôi phục ảnh hoặc lưu lại tay.','IMAGE_INTEGRITY');
  return m;
}

/** Local image preparation only. No pipeline, model, voice or approval calls. */
export function registerImageMotionRoutes(app:FastifyInstance,context:Context){
  const base='/api/projects/:name/image-motion';
  app.get<{Params:{name:string}}>(base,async req=>{NoQuery.parse(req.query);return snapshot(await readBook(await context.rootFor(req.params.name)));});
  app.post<{Params:{name:string}}>(base+'/images',async(req,reply)=>{
    const query=z.object({revision:z.string().min(1).max(64)}).strict().parse(req.query);
    const result=await context.mutateLocal(req.params.name,async root=>{
      const current=await readBook(root);revision(current.revision,query.revision);
      let bytes:Buffer|undefined,filename='';
      for await(const part of req.parts({limits:{files:1,fields:0,parts:1,fileSize:fileLimit}})){
        if(part.type!=='file'||part.fieldname!=='image')throw new ApiError(422,'Choose one PNG or JPG image.','IMAGE_UPLOAD');
        filename=uploadFilename(part.filename);bytes=await part.toBuffer();
      }
      if(!bytes?.length)throw new ApiError(422,'Choose one PNG or JPG image.','IMAGE_UPLOAD');
      const id=hash(bytes),existing=current.book.images.find(i=>i.id===id);
      if(existing){await imageBytes(root,existing,true);await imageBytes(root,existing);return snapshot(current);}
      let metadata:Awaited<ReturnType<sharp.Sharp['metadata']>>,preview:Buffer,width:number,height:number;
      try{
        metadata=await sharp(bytes,{limitInputPixels:64000000}).metadata();if(!['png','jpeg'].includes(metadata.format??'')||(metadata.pages??1)>1)throw new Error('unsupported image');
        const rendered=await sharp(bytes,{limitInputPixels:64000000}).rotate().resize({width:3840,height:2160,fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});preview=rendered.data;width=rendered.info.width;height=rendered.info.height;
      }catch{throw new ApiError(422,'Cannot read this image. Choose a valid PNG or JPG.','IMAGE_FORMAT');}
      if(preview.length>fileLimit)throw new ApiError(413,'Image preview exceeds 16 MB.','IMAGE_LIMIT');
      if(current.book.images.length>=64)throw new ApiError(413,'The project already has 64 source images.','IMAGE_CATALOG_LIMIT');
      const image=ImageSchema.parse({id,filename,sourceHash:id,previewHash:hash(preview),format:metadata.format,sourceWidth:metadata.width,sourceHeight:metadata.height,width,height,regions:[]});
      await immutable(root,id+'.source',bytes);await immutable(root,id+'.png',preview);
      return save(root,{version:1,images:[...current.book.images,image]});
    });return reply.code(201).send(result);
  });
  app.put<{Params:{name:string}}>(base+'/regions',async req=>{
    NoQuery.parse(req.query);const body=z.object({revision:z.string().min(1).max(64),imageId:Hash,regions:z.array(SurfaceRegionSchema).max(16)}).strict().parse(req.body);
    return context.mutateLocal(req.params.name,async root=>{
      const current=await readBook(root);revision(current.revision,body.revision);const image=current.book.images.find(i=>i.id===body.imageId);if(!image)throw new ApiError(404,'Source image not found.','NOT_FOUND');
      await imageBytes(root,image);await imageBytes(root,image,true);
      if(new Set(body.regions.map(r=>r.id)).size!==body.regions.length||body.regions.some(r=>r.cx-r.rx<0||r.cy-r.ry<0||r.cx+r.rx>image.width||r.cy+r.ry>image.height))throw new ApiError(422,'Each region must fit inside the image and have its own name.','IMAGE_REGION_BOUNDS');
      return save(root,{...current.book,images:current.book.images.map(i=>i.id===image.id?{...i,regions:body.regions}:i)});
    });
  });
  app.put<{Params:{name:string}}>(base+'/arms',async req=>{
    NoQuery.parse(req.query);const body=z.object({revision:z.string().min(1).max(64),imageId:Hash,definition:ArmDefinitionSchema}).strict().parse(req.body);
    return context.mutateLocal(req.params.name,async root=>{
      const current=await readBook(root);revision(current.revision,body.revision);const image=current.book.images.find(i=>i.id===body.imageId);if(!image)throw new ApiError(404,'Source image not found.','NOT_FOUND');
      const sourceBytes=await imageBytes(root,image);await imageBytes(root,image,true);
      let motion:Image['armMotion'];
      if(body.definition.arms.length){
        let recipe;try{recipe=armRecipe(body.definition,image.width,image.height);}catch(e){throw new ApiError(422,String((e as Error).message),'ARM_GEOMETRY');}
        const plate=body.definition.backgroundMode==='clean-plate'?current.book.images.find(i=>i.id===body.definition.cleanPlateImageId):undefined;
        if(body.definition.backgroundMode==='clean-plate'&&(!plate||plate.id===image.id||plate.width!==image.width||plate.height!==image.height))throw new ApiError(422,'Chọn ảnh nền sạch khác ảnh nguồn và cùng kích thước.','NEEDS_BACKGROUND');
        if(plate){await imageBytes(root,plate,true);await imageBytes(root,plate);}
        const key=hash({version:1,preparer:SOURCE_PART_VERSION,source:image.previewHash,definition:body.definition,plate:plate?.previewHash});
        const matteName='arm-mattes/'+image.id+'.png';await immutable(root,matteName,await sharp(sourceBytes).ensureAlpha().png().toBuffer());
        const output=await boundPath(root,prefix+'arm-previews/'+image.id+'/'+key,true),cache=await boundPath(root,prefix+'arm-layer-cache',true);
        try{await prepareCharacterSource(await boundPath(root,prefix+image.id+'.png'),await boundPath(root,prefix+matteName),output,recipe,cache,plate?await boundPath(root,prefix+plate.id+'.png'):undefined);}catch(e){const message=(e as Error).message;if(message.includes('integrity'))throw new ApiError(409,'Layer lưu bị thay đổi. Khôi phục cache trước khi tiếp tục.','IMAGE_INTEGRITY');throw new ApiError(422,message.includes('needs-background')?'Không đủ nền giấy sạch quanh tay. Chọn ảnh nền sạch.':'Không chuẩn bị được tay: '+message,message.includes('needs-background')?'NEEDS_BACKGROUND':'ARM_PREPARATION');}
        motion={definition:body.definition,key};
      }
      return save(root,{...current.book,images:current.book.images.map(i=>i.id===image.id?{...i,armMotion:motion}:i)});
    });
  });
  app.get<{Params:{name:string;imageId:string}}>(base+'/arms/:imageId/scene',async req=>{
    NoQuery.parse(req.query);const id=Hash.parse(req.params.imageId),root=await context.rootFor(req.params.name),image=(await readBook(root)).book.images.find(i=>i.id===id);if(!image)throw new ApiError(404,'Source image not found.','NOT_FOUND');const m=await armManifest(root,image),assets:Record<string,string>={};
    for(const name of [m.demo.scenes[0]!.original,m.demo.scenes[0]!.background,...m.demo.scenes[0]!.parts!.map(p=>p.image)]){if(!/^assets\/[a-z][a-z0-9-]*\.png$/.test(name)||!m.assetHashes[name])throw new ApiError(409,'Invalid layer manifest.','IMAGE_INTEGRITY');assets[name]='/api/projects/'+encodeURIComponent(req.params.name)+'/image-motion/arms/'+id+'/assets/'+image.armMotion!.key+'/'+name.slice(7);}
    return {demo:m.demo,assets,productionReady:false};
  });
  app.get<{Params:{name:string;imageId:string;key:string;filename:string}}>(base+'/arms/:imageId/assets/:key/:filename',async(req,reply)=>{
    NoQuery.parse(req.query);const id=Hash.parse(req.params.imageId),key=Hash.parse(req.params.key),filename=z.string().regex(/^[a-z][a-z0-9-]*\.png$/).parse(req.params.filename),root=await context.rootFor(req.params.name),image=(await readBook(root)).book.images.find(i=>i.id===id);if(!image)throw new ApiError(404,'Source image not found.','NOT_FOUND');
    if(key!==image.armMotion?.key)throw new ApiError(409,'Tay đã thay đổi. Tải lại bản xem trước.','REVISION_CONFLICT');const m=await armManifest(root,image),name='assets/'+filename;if(!m.assetHashes[name])throw new ApiError(404,'Layer not found.','NOT_FOUND');
    const file=await boundPath(root,previewDirectory(image)+'/'+name);if((await fs.stat(file)).size>fileLimit)throw new ApiError(413,'Layer exceeds image limit.','IMAGE_LIMIT');const bytes=await fs.readFile(file);if(hash(bytes)!==m.assetHashes[name])throw new ApiError(409,'Layer đã thay đổi. Khôi phục cache trước khi tiếp tục.','IMAGE_INTEGRITY');return reply.type('image/png').send(bytes);
  });
  app.get<{Params:{name:string}}>(base+'/arms/editor',async(req,reply)=>{
    NoQuery.parse(req.query);await context.rootFor(req.params.name);return reply.type('text/html; charset=utf-8').header('Content-Security-Policy',"default-src 'none'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'").send(imageMotionArmWorkbench(req.params.name));
  });
  app.get<{Params:{name:string;id:string;kind:string}}>(base+'/images/:id/:kind',async(req,reply)=>{
    NoQuery.parse(req.query);const id=Hash.parse(req.params.id),kind=z.enum(['original','preview']).parse(req.params.kind),root=await context.rootFor(req.params.name),current=await readBook(root),image=current.book.images.find(i=>i.id===id);if(!image)throw new ApiError(404,'Source image not found.','NOT_FOUND');
    return reply.type(kind==='original'&&image.format==='jpeg'?'image/jpeg':'image/png').send(await imageBytes(root,image,kind==='original'));
  });
  app.get<{Params:{name:string}}>(base+'/editor',async(req,reply)=>{
    NoQuery.parse(req.query);await context.rootFor(req.params.name);
    return reply.type('text/html; charset=utf-8').header('Content-Security-Policy',"default-src 'none'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'").send(imageMotionWorkbench(req.params.name));
  });
}
