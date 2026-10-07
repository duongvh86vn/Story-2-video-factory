import sharp from 'sharp';
import {promises as fs} from 'node:fs';
import {hash} from '../packages/core/utils.js';
import {bodyViewRegistration} from '../packages/animation/body-view-art.js';
/** Read pixels only, author an SVG mask measurement. Never edit PNG bytes.
 * Semantic ROIs exclude Lila's ponytail and the neutral black limbs. The color
 * contour and narrow ink band are candidate masks for manual inspection. */
const paths:Record<string,string>={},records=[];
for(const actor of ['lila','karo'] as const){
  const c=bodyViewRegistration[actor],bytes=await fs.readFile(c.file);
  if(hash(bytes)!==c.sha256)throw new Error('View PNG changed');
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const warm=(x:number,y:number)=>{const i=(y*info.width+x)*4;return data[i+3]!>160&&data[i]!>45&&data[i]!>data[i+1]!*1.12&&data[i+1]!>data[i+2]!*1.12;};
  const minX=(y:number)=>actor==='karo'?300:y<580?530:y<740?565:y<780?530:450;
  const maxX=actor==='karo'?650:780,start=actor==='karo'?630:480,end=actor==='karo'?1190:940;
  const rows=[];
  for(let y=start;y<=end;y+=5){const xs=[];for(let x=minX(y);x<maxX;x++)if(warm(x,y))xs.push(x);if(xs.length)rows.push({y,left:xs[0]!,right:xs.at(-1)!});}
  const lowY=actor==='karo'?1290:1030,hemStart=actor==='karo'?1130:920;
  const columns=[];
  for(let x=actor==='karo'?315:450;x<=maxX;x+=5){let bottom=-1;for(let y=hemStart;y<lowY;y++)if(warm(x,y))bottom=y;if(bottom>=0)columns.push({x,y:bottom});}
  const first=rows[0]!,last=rows.at(-1)!;
  const top=actor==='lila'?[[574,456],[652,456],[first.right,first.y]]:[[397,600],[520,600],[first.right,first.y]];
  const points=[...top,...rows.map(r=>[r.right,r.y]),...columns.toReversed().map(p=>[p.x,p.y]),[last.left,last.y],...rows.toReversed().map(r=>[r.left,r.y])];
  const d=points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join('')+'Z';paths[actor]=d;
  records.push({actor,file:c.file,sha256:c.sha256,method:'warm-color outer rows and per-column hem in explicit garment ROI; black border via 7px band',inkPad:7,clothing:d,approved:false,productionReady:false});
}
await fs.writeFile('library/topics/prehistoric-life/body-views/garment-contours-v1.json',JSON.stringify({version:1,records},null,2)+'\n',{flag:'wx'});
await fs.writeFile('packages/animation/body-view-contours.ts','// Measured from immutable view PNGs by scripts/prehistoric-view-contours.ts.\n// Candidate masks; neither identity nor motion approval.\nexport const bodyViewClothingContours='+JSON.stringify(paths,null,2)+' as const;\n',{flag:'wx'});
console.log(JSON.stringify({output:'garment-contours-v1.json',actors:records.map(r=>r.actor),imagesModified:false}));
