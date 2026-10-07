import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import sharp from 'sharp';
import dotenv from 'dotenv';
import {z} from 'zod';
import {hash} from '../packages/core/utils.js';
import {generateNineRouterReferenceImage} from '../packages/models/nine-router-image.js';

const {values}=parseArgs({options:{actor:{type:'string'},view:{type:'string'},version:{type:'string',default:'v1'},model:{type:'string',default:'cx/gpt-image-2'},env:{type:'string'},edit:{type:'string'}}});
if(values.env)dotenv.config({path:path.resolve(values.env),quiet:true});
const actor=z.enum(['lila','karo']).parse(values.actor);
const view=z.enum(['three-quarter-left','three-quarter-right','left','right','back']).parse(values.view);
const version=z.string().regex(/^v\d+$/).parse(values.version),model=values.model!;
const root=process.cwd(),dir=path.join(root,'library/topics/prehistoric-life/body-views'),stem=`${actor}-${view}-${version}`;
await fs.mkdir(dir,{recursive:true});
const reservation=await fs.open(path.join(dir,stem+'.reserved'),'wx');await reservation.close();
const reference=`docs/topics/assets/reference-${actor}-full.png`,referenceBytes=await fs.readFile(reference);
// One identity reference: router ag/cx reference workflow consumes one image.
let referencePng=await sharp(referenceBytes).png().toBuffer();
const references=[{file:reference,role:'primary-character-identity',sha256:hash(referenceBytes)}];
let editTargetFrame:{width:number;height:number}|undefined;
if(values.edit){
  // A labelled reference board is required because the router adapter consumes
  // one inline image. It is an input guide; generated output bytes stay intact.
  const editName=z.string().regex(new RegExp(`^${actor}-${view}-v\\d+\\.png$`)).parse(values.edit);
  const editFile=path.join(dir,editName),editBytes=await fs.readFile(editFile);
  const editMeta=await fs.readFile(editFile.replace(/\.png$/,'.json'),'utf8').then(JSON.parse);
  if(editMeta.sha256!==hash(editBytes))throw new Error('Edit target changed; use an immutable version');
  const targetDimensions=await sharp(editBytes).metadata();
  editTargetFrame={width:targetDimensions.width!,height:targetDimensions.height!};
  const board=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1600"><rect width="1400" height="1600" fill="#fff7e5"/><text x="40" y="50" font-size="28">ORIGINAL IDENTITY — black ink limbs, chest skin patch only</text><image x="40" y="90" width="580" height="1460" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${referenceBytes.toString('base64')}"/><text x="720" y="50" font-size="28">EDIT TARGET — retain this exact view</text><image x="720" y="90" width="640" height="1460" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${editBytes.toString('base64')}"/></svg>`;
  referencePng=await sharp(Buffer.from(board)).png().toBuffer();
  const boardFile=stem+'-edit-reference.png';await fs.writeFile(path.join(dir,boardFile),referencePng,{flag:'wx'});
  references.push({file:path.relative(root,editFile).replaceAll('\\','/'),role:'edit-target-preserve-view',sha256:hash(editBytes)},
    {file:path.relative(root,path.join(dir,boardFile)).replaceAll('\\','/'),role:'single-image-labelled-reference-board',sha256:hash(referencePng)});
}
const identity=actor==='lila'
  ?'Lila: warm peach/orange round face, original tiny black oval eyes, small nose and gentle smile, long dark brown messy painted hair and low side ponytail, original ragged brown one-shoulder fur dress, narrow plain braided belt, slim black ink arms/legs, black mitten silhouettes and oval black feet'
  :'Karo: warm peach/orange face, original tiny black oval eyes, broad friendly smiling mouth inside his full dark brown beard, messy short dark brown hair, original ragged brown one-shoulder tunic and separate ragged shorts with two legs, narrow plain belt, slim black ink arms/legs, black mitten silhouettes and oval black feet';
const direction:Record<typeof view,string>={
  'three-quarter-left':'Turn BOTH head and torso 45 degrees toward SCREEN LEFT. Eyes and nose look at an imagined partner on the left, not at the camera. Both eyes are still visible with the far eye naturally smaller. The torso is truly turned with near/far shoulders, not a front torso with only a shifted face.',
  'three-quarter-right':'Turn BOTH head and torso 45 degrees toward SCREEN RIGHT. Eyes and nose look at an imagined partner on the right, not at the camera. Both eyes are still visible with the far eye naturally smaller. The torso is truly turned with near/far shoulders, not a front torso with only a shifted face.',
  left:'Strict left PROFILE: nose, face, chest and feet point toward SCREEN LEFT. One eye visible, natural cheek and smile profile; correct ear and jaw/beard silhouette. Near and far arms separated slightly for registration, not extra limbs.',
  right:'Strict right PROFILE: nose, face, chest and feet point toward SCREEN RIGHT. One eye visible, natural cheek and smile profile; correct ear and jaw/beard silhouette. Near and far arms separated slightly for registration, not extra limbs.',
  back:'BACK view: back of head, hair, torso and garment, no face, no eyes or mouth visible. Two hands and two feet visible. Keep the ponytail on its actual anatomical side. Show the back of the original one-shoulder garment without adding a new costume.'};
const prompt=values.edit
  ?`Use case: localized character-art correction. EDIT ONLY THE CHARACTER IN THE RIGHT PANEL. The LEFT image explains the required original black ink arm style. Remove the RIGHT character's flesh-coloured upper-arm stumps: each black ink arm connects directly at its shoulder, exactly as in the LEFT original. The small original chest/neck skin patch may remain, but no skin-coloured limb length below either shoulder. Retain the RIGHT target's exact pose, facing, hair, face, garment, belt, feet, proportions, colours and painted line quality. Do not rotate it, mirror its clothes or redraw unrelated details. Preserve its ${editTargetFrame!.width}x${editTargetFrame!.height} canvas, relative scale and empty margins. Return only that corrected ${actor} with actual alpha, no board, text, scenery, props, shadow or checkerboard. This is an unapproved view candidate, not a production rig.`
  :`Use case: identity-preserving animation character turnaround. Asset: ONE full-body neutral standing view on actual transparent PNG background. The attached original is the AUTHORITATIVE identity, palette and costume, not a loose inspiration. Draw ${identity}. ${direction[view]}
Preserve exact painted line quality, original head-to-body ratio, warm saturated face and rich brown fur/hair. The limbs MUST remain single slim black drawn strokes with black mitten hands and oval feet; no flesh-coloured arms/legs, muscles, fingers, toes, boots, jewelry, fur collar, weapons or props. Exactly two arms and two legs. Neutral relaxed standing, arms resting low, both feet planted on one horizontal baseline, no walking/running/gesture. Preserve the garment's same anatomical bare shoulder and clothed shoulder when turning; DO NOT mirror the original one-shoulder garment. Preserve Lila's ponytail attachment and Karo's beard shape. Do not redesign the eyes, smile, nose, hair or belt. Smooth irregular painted outlines; no hard geometric mannequin or grey/desaturated wash.
One character only, no grid, no labels, no scenery, no leaf from the reference background, no title, no ground shadow, no fake checkerboard. Actual alpha background; generous empty margins with whole hair/hands/feet inside frame. This is a new authored VIEW candidate for a continuous rig, not an animated sprite or approved production asset.`;
const metadata={actor,view,version,model,prompt,references,...(editTargetFrame?{editTargetFrame}:{}),status:'requested',approved:false,productionReady:false,registered:false,requestedAt:new Date().toISOString()};
const json=path.join(dir,stem+'.json');await fs.writeFile(json,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
try{
  const bytes=await generateNineRouterReferenceImage({model,prompt,referencePng,size:'1024x1536'}),image=await sharp(bytes).metadata();
  if(!['png','jpeg','webp'].includes(image.format??''))throw new Error('Unsupported view image format');
  const file=stem+'.'+(image.format==='jpeg'?'jpg':image.format);
  await fs.writeFile(path.join(dir,file),bytes,{flag:'wx'});
  const stats=await sharp(bytes).stats(),actualTransparency=!!image.hasAlpha&&stats.channels.at(-1)!.min<255;
  const editFrameChanged=!!editTargetFrame&&(image.width!==editTargetFrame.width||image.height!==editTargetFrame.height);
  await fs.writeFile(json,JSON.stringify({...metadata,file,sha256:hash(bytes),width:image.width,height:image.height,hasAlpha:image.hasAlpha,actualTransparency,
    ...(editTargetFrame?{editFrameChanged}:{}),status:editFrameChanged?'candidate-edit-frame-changed-needs-review':actualTransparency?'candidate-needs-identity-and-registration-review':'candidate-needs-alpha-identity-and-registration-review',generatedAt:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({actor,view,file,width:image.width,height:image.height,actualTransparency,approved:false}));
}catch(error){
  const message=error instanceof Error?error.message:'View generation failed';
  await fs.writeFile(json,JSON.stringify({...metadata,status:'generation-failed',error:message},null,2)+'\n');throw error;
}
