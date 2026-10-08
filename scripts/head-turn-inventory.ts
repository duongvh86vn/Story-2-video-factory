import {promises as fs} from 'node:fs';
import path from 'node:path';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {headTurnArtDescription,headTurnInventory,headTurnMaterialPath,headTurnPromptPath,measureHeadTurnPng,readHeadTurnSource,validateHeadTurnPromptSources} from '../packages/topics/head-turn-art.js';
import {HEAD_TURN_FOLDER,HEAD_TURN_MATERIAL_VERSION,HeadTurnMaterialSchema,HeadTurnPromptSchema} from '../packages/topics/head-turn-schemas.js';

// Static PNG/RGBA metadata and provenance only. Immutable material records;
// no tests, landmarks inferred from prompts, motion, browser or renderer.
const repo=await findRepoRoot();
for(const actor of ['lila','karo'] as const)for(const version of [1,2]){
  const file=`${actor}-head-turn-v${version}.png`,promptFile=headTurnPromptPath(file),promptBytes=await readHeadTurnSource(repo,promptFile),prompt=HeadTurnPromptSchema.parse(JSON.parse(promptBytes.toString('utf8')));
  await validateHeadTurnPromptSources(repo,actor,file,prompt);
  const bytes=await readHeadTurnSource(repo,`${HEAD_TURN_FOLDER}/${file}`),measured=await measureHeadTurnPng(bytes);
  const findings=actor==='lila'?[
    {cells:[8,9,10],note:version===1?'V1 source consultation: near-frontal to left-facing hair/ponytail/fringe change is abrupt; anatomical side and occlusion need redrawing.':'V2 parent static inspection: targeted repair still changes near-frontal hair/ponytail/fringe abruptly; anatomical side and occlusion remain unresolved.'},
    {cells:[1,16],note:'Ponytail proportions are not yet faithful to the longer primary/native-body hair silhouette; neck/body seam and skull scale need independent source landmarks.'},
    {cells:[1,2,3,4,9,10,11,12,13,14],note:'Perspective clusters and possibly nonmonotonic13→14 views; requested yaw is not measured or approved.'},
  ]:[
    {cells:[8,9],note:version===1?'V1 source consultation: near-frontal to strong left-facing view changes nose/ear/fringe/beard at once; intermediate perspectives are missing.':'V2 parent static inspection: near-frontal to strong left-facing nose/ear/fringe/beard remains an unresolved large visual step after targeted repair.'},
    {cells:[1,16],note:'Beard/neck stub alone cannot establish attachment seam to the original native body.'},
    {cells:[1,2,3,4,9,10,11,12,13,14],note:'Similar-angle clusters and possibly nonmonotonic13→14 views; no16 distinct measured yaw samples established.'},
  ];
  const record=HeadTurnMaterialSchema.parse({version:HEAD_TURN_MATERIAL_VERSION,actor,file,sha256:hash(bytes),promptFile,promptSha256:hash(promptBytes),references:prompt.referenceImages,
    ...measured,requestedYawDeg:prompt.requestedYawDeg,yawMeasured:false,findings,status:'held-needs-art-repair-and-landmarks',approved:false,registered:false,productionReady:false,motionVerified:false});
  const destination=path.join(repo,headTurnMaterialPath(file));
  try{const existing=JSON.parse(await fs.readFile(destination,'utf8')) as unknown;if(hash(existing)!==hash(record))throw new Error('Immutable head turn metadata changed; create a new version: '+file);}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await fs.writeFile(destination,JSON.stringify(record,null,2)+'\n',{flag:'wx'});}
}
const materials=await headTurnInventory(repo);
await writeJson(path.join(repo,HEAD_TURN_FOLDER,'inventory-v1.json'),{...headTurnArtDescription,fingerprint:hash(materials),materials,productionRig:null});
console.log(JSON.stringify({materials:materials.length,cells:materials.reduce((n,m)=>n+m.cells.length,0),alpha:'measured-original-RGBA',yawMeasured:false,registered:false,productionReady:false,motionVerified:false}));
