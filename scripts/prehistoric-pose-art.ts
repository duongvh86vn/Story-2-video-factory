import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import {parseArgs} from 'node:util';
import {hash} from '../packages/core/utils.js';
import {discoverNineRouterImages,generateNineRouterReferenceImage} from '../packages/models/nine-router-image.js';

const {values}=parseArgs({options:{actor:{type:'string'},action:{type:'string',default:'sheet'},env:{type:'string'},model:{type:'string',default:'ag/gemini-3.1-flash-image'},
  version:{type:'string',default:'v1'},'pose-reference':{type:'string'},discover:{type:'boolean',default:false}}});
if(values.env)dotenv.config({path:path.resolve(values.env),quiet:true});
if(values.discover){console.log(JSON.stringify({models:await discoverNineRouterImages()}));process.exit(0);}
const actor=values.actor;
if(actor!=='lila'&&actor!=='karo')throw new Error('--actor must be lila or karo.');
if(!/^v\d+$/.test(values.version!))throw new Error('--version must be v1, v2, etc.');
const action=values.action!;
if(!['sheet','point','think','run-left','jump','spear-lunge-left'].includes(action))throw new Error('Unknown --action.');
const root=process.cwd(),output=path.join(root,'library/topics/prehistoric-life/pose-studies'),name=`${actor}-${action==='sheet'?'poses':action}-${values.version}`;
await fs.mkdir(output,{recursive:true});
const reserve=await fs.open(path.join(output,name+'.reserved'),'wx');await reserve.close();
const reference=path.join(root,`docs/topics/assets/reference-${actor}-full.png`),source=await fs.readFile(reference);
const pose=values['pose-reference']?await fs.readFile(path.resolve(values['pose-reference'])):undefined;
const label=(text:string,width:number)=>Buffer.from(`<svg width="${width}" height="44"><rect width="100%" height="100%" fill="white"/><text x="14" y="29" font-family="Arial" font-size="19" fill="black">${text}</text></svg>`);
const primary=await sharp(source).resize({width:520,height:900,fit:'inside',withoutEnlargement:true}).png().toBuffer();
const pm=await sharp(primary).metadata();
const inserts=[{input:label('PRIMARY: preserve this exact character',550),left:0,top:0},{input:primary,left:15,top:55}];
const refs=[{role:'primary-character-identity',file:`docs/topics/assets/reference-${actor}-full.png`,sha256:hash(source)}];
if(pose){inserts.push({input:label('POSE ONLY: body mechanics, not character style',680),left:560,top:0},
  {input:await sharp(pose).resize({width:660,height:550,fit:'inside'}).png().toBuffer(),left:570,top:55});
  refs.push({role:'user-spear-pose-mechanics',file:path.basename(values['pose-reference']!),sha256:hash(pose)});}
const board=await sharp({create:{width:pose?1240:550,height:Math.max(700,(pm.height??0)+70),channels:4,background:'#fff'}}).composite(inserts).png().toBuffer();
await fs.writeFile(path.join(output,name+'-reference.png'),board,{flag:'wx'});
const identity=actor==='lila'?'female Lila with the exact warm peach face, two simple black oval eyes, original smile and nose, dark messy brown hair tied low on her left, ragged brown one-shoulder fur dress and belt':'male Karo with the exact warm peach face, simple black oval eyes, original broad smile and brown beard, messy dark brown hair, ragged brown one-shoulder fur tunic and shorts with belt';
const sheetPrompt=`Create an animation DESIGN REFERENCE, one clean 3-column by 2-row pose sheet of ONLY ${identity}. The LEFT image is the authoritative character design. Preserve its face proportions, eyes/nose/mouth positions, clothing silhouette, warm skin, saturated brown palette, painted linework and original simple black ink limbs/hands/feet. Do not add boots, jewelry, fur collar, realistic muscles, white skin or extra detail. Do not replace the face with a generic face. The RIGHT image, if present, is ONLY a reference for the spear lunge mechanics, not for identity or scenery.
Each cell shows the entire same character with unclipped hair, hands, feet and spear. Plain light cream background, no scenery, no shadows obscuring feet, no titles or labels. Readable silhouette with generous margins. Cells in exact reading order: 1 neutral relaxed standing with original happy face; 2 point toward a partner with a soft naturally bent arm, relaxed other arm; 3 thinking with fingertips near chin and elbow naturally below the hand; 4 running left with opposite arm/leg swing and a forward lean; 5 jumping with believable takeoff/air pose and coordinated arms; 6 two-handed SPEAR LUNGE toward lower left, front knee bent and shin nearly vertical, back leg extended, body weight forward. In cell 6 spear is a continuous long wooden shaft with stone point at lower-left, butt up-right; front hand low/forward nearer shaft center, rear hand up/back, rear elbow raised/back as in the pose reference. Both hands grip this SAME shaft with no gap. Spear total length about 1.2 character heights.
Limbs remain smooth continuous black drawn strokes, subtle curves instead of harsh zigzag corners. Exactly two arms and two legs per character, one natural elbow/knee each, no reverse elbow, no broken wrist, no crossing the face, no impossible arm lengths. This is a pose study, not a final animation, not a sprite sheet for a slideshow. Match the reference character extremely closely.`;
const poses:Record<string,string>={
  point:'Point toward screen-left at chest height, one soft naturally bent black ink arm, the other arm relaxed downward.',
  think:'Thinking: one small black mitten hand beside the chin, elbow below the hand, other arm relaxed. No arm across the face.',
  'run-left':'Run toward screen-left, torso leaning forward, one foot forward and the opposite hand forward. Both legs made of slim BLACK ink lines, black mitten hands and black oval feet. Do not invent skin-colored arms/legs or muscles.',
  jump:'Jump in the air with knees comfortably bent and coordinated lifted arms, slim BLACK ink limbs with black mitten hands and black oval feet.',
  'spear-lunge-left':'Match the RIGHT POSE REFERENCE: wide stable SPEAR LUNGE toward lower-left, front knee bent with nearly vertical shin, rear leg extended to the right, body leaning forward left. A continuous long wooden spear runs from stone tip lower-left to butt upper-right, length about 1.2 character heights. Front hand low/forward near shaft middle; rear hand up/back on the same shaft; rear elbow raised/back near shoulder. Both BLACK MITTEN HANDS visibly grip the same shaft. Preserve the exact simple black line limbs of the LEFT character.'};
const prompt=action==='sheet'?sheetPrompt:`Generate ONE full-body drawing of ${identity}, in the requested pose, using the LEFT reference as the exact character identity. The RIGHT image supplies pose mechanics only. This is a STICK FIGURE, not a flesh-limbed cartoon caveman. ARMS AND LEGS ARE SINGLE SLIM SOLID BLACK INK STROKES. Hands are simple black mitten silhouettes, feet simple black oval silhouettes. No skin-colored limbs, fingers, toes, muscles, boots or realistic anatomy details. Keep the original face, eye spacing, original nose and smile, hair outline, beard if present, ragged fur garment and belt from the LEFT image. Do not simplify or redesign the head, hair or clothes. Preserve rich warm skin and brown colors. Smooth softly curved ink strokes, natural elbows, exactly two arms and two legs, no backwards joints, no abrupt zigzag bends. ${poses[action]} Plain cream background. One character only, ample empty margins, whole spear/hair/hands/feet inside canvas, no text, no grid, no other poses. Face remains original happy for this mechanical pose study. This is a design reference pending review, not finished video.`;
const request={actor,action,model:values.model,endpoint:'http://127.0.0.1:20128/v1/images/generations',adapter:values.model!.split('/')[0]+'-one-inline-reference-board',prompt,references:refs,
  status:'requested',approved:false,productionReady:false,requestedAt:new Date().toISOString()};
await fs.writeFile(path.join(output,name+'.json'),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
try{
  const image=await generateNineRouterReferenceImage({model:values.model!,prompt,referencePng:board});
  const metadata=await sharp(image).metadata();
  if(!['png','jpeg','webp'].includes(metadata.format??''))throw new Error('Unsupported image format.');
  const file=name+'.'+(metadata.format==='jpeg'?'jpg':metadata.format);
  await fs.writeFile(path.join(output,file),image,{flag:'wx'});
  await fs.writeFile(path.join(output,name+'.json'),JSON.stringify({...request,status:'generated-needs-fidelity-and-anatomy-review',file,sha256:hash(image),width:metadata.width,height:metadata.height,generatedAt:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({actor,model:values.model,file:path.join(output,file),width:metadata.width,height:metadata.height,approved:false}));
}catch(error){
  const message=error instanceof Error?error.message:'Image generation failed.';
  await fs.writeFile(path.join(output,name+'.json'),JSON.stringify({...request,status:'generation-failed',error:message},null,2)+'\n');
  throw error;
}
