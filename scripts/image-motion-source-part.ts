/** Prepare a manually selected original image part, then reuse its cached pixels. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {prepareCharacterSource,type CharacterSourceRecipe} from '../packages/image-motion/character-source.js';
import {outputPath} from '../packages/render/process.js';

const {values}=parseArgs({options:{source:{type:'string'},recipe:{type:'string'},output:{type:'string'},mask:{type:'string'}}});
if(!values.source||!values.recipe)throw Error('--source PNG and --recipe JSON are required');
const source=await fs.realpath(path.resolve(values.source)),recipeFile=await fs.realpath(path.resolve(values.recipe));
if((await fs.stat(source)).size>16*1024*1024||(await fs.stat(recipeFile)).size>256*1024)throw Error('Source/recipe exceeds size limit');
const recipe=JSON.parse(await fs.readFile(recipeFile,'utf8')) as CharacterSourceRecipe,meta=await sharp(source).metadata();
if(meta.format!=='png'||!meta.width||!meta.height||!Array.isArray(recipe.parts)||!recipe.parts.length||recipe.parts.length>32)throw Error('A PNG and 1–32 source parts are required');
const maskRoot=path.resolve('runtime/image-motion/character-mask-cache');await fs.mkdir(maskRoot,{recursive:true});
let mask:string;
if(values.mask)mask=await fs.realpath(path.resolve(values.mask));
else{
  const polygons=recipe.parts.map(p=>{if(!Array.isArray(p.polygon)||p.polygon.length<3||p.polygon.length>128||p.polygon.some(q=>!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||q[0]<0||q[0]>meta.width!||q[1]<0||q[1]>meta.height!))throw Error('Invalid source-space polygon');return '<polygon fill="white" points="'+p.polygon.map(q=>q.join(',')).join(' ')+'"/>';});
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+meta.width+'" height="'+meta.height+'">'+polygons.join('')+'</svg>';mask=path.join(maskRoot,hash(svg)+'.png');
  try{await fs.writeFile(mask,await sharp(Buffer.from(svg)).png().toBuffer(),{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
}
const outputRoot=path.resolve('runtime/image-motion'),output=path.resolve(values.output??'runtime/image-motion/source-parts/'+hash({source:hash(await fs.readFile(source)),mask:hash(await fs.readFile(mask)),recipe}).slice(0,24)),relative=path.relative(outputRoot,output);
if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Source-part output must be inside runtime/image-motion');
await outputPath(outputRoot,relative);await fs.mkdir(path.dirname(output),{recursive:true});
const prepared=await prepareCharacterSource(source,mask,output,recipe,maskRoot);
console.log(JSON.stringify({directory:prepared.directory,manifest:path.join(prepared.directory,'manifest.json'),sourceHash:prepared.sourceHash,layerCacheKey:prepared.layerCacheKey,productionReady:false,qualityAccepted:false}));
