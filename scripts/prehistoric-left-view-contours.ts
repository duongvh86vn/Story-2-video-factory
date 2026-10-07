import sharp from 'sharp';
import {promises as fs} from 'node:fs';
import {hash} from '../packages/core/utils.js';
/** Offline read-only pixel authoring; semantic ROIs are manually selected.
 * This measures colour boundaries, NOT anatomy/joints or motion acceptance. */
const inputs=[
  {actor:'lila',file:'library/topics/prehistoric-life/body-views/lila-three-quarter-left-v2.png',sha256:'ef90f6783d89a8e554c12605065a218faf4e0f6aae4411ae00cccf6825b686bf',width:1024,height:1536,
    start:560,end:1030,hemStart:970,hemEnd:1100,minX:(y:number)=>y<650?430:y<780?460:390,maxX:(y:number)=>y<780?625:680,
    top:[[469,520],[527,520]],inkPad:7},
  {actor:'karo',file:'library/topics/prehistoric-life/body-views/karo-three-quarter-left-v1.png',sha256:'bfcffe1fac13281de68ca11910407bb22fde02f8f5f5d867054713399166fdf4',width:910,height:1729,
    start:650,end:1230,hemStart:1150,hemEnd:1320,minX:()=>320,maxX:()=>665,
    top:[[416,625],[527,625]],inkPad:7},
];
const paths:Record<string,string>={},records=[];
for(const c of inputs){
  const bytes=await fs.readFile(c.file);if(hash(bytes)!==c.sha256)throw new Error('Changed left-view artwork');
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==c.width||info.height!==c.height||info.channels!==4)throw new Error('Left-view authoring canvas changed');
  const warm=(x:number,y:number)=>{const i=(y*info.width+x)*4;return data[i+3]!>160&&data[i]!>45&&data[i]!>data[i+1]!*1.12&&data[i+1]!>data[i+2]!*1.12;};
  const rows=[];
  for(let y=c.start;y<=c.end;y+=5){const xs=[];for(let x=c.minX(y);x<c.maxX(y);x++)if(warm(x,y))xs.push(x);if(xs.length)rows.push({y,left:xs[0]!,right:xs.at(-1)!});}
  const columns=[];
  for(let x=c.minX(c.end);x<c.maxX(c.end);x+=5){let bottom=-1;for(let y=c.hemStart;y<c.hemEnd;y++)if(warm(x,y))bottom=y;if(bottom>=0)columns.push({x,y:bottom});}
  const first=rows[0],last=rows.at(-1);if(!first||!last||!columns.length)throw new Error('No garment colour within authored ROI');
  const points=[...c.top,[first.right,first.y],...rows.map(r=>[r.right,r.y]),...columns.toReversed().map(p=>[p.x,p.y]),[last.left,last.y],...rows.toReversed().map(r=>[r.left,r.y])];
  const clothing=points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join('')+'Z';paths[c.actor]=clothing;
  records.push({actor:c.actor,view:'three-quarter-left',file:c.file,sha256:c.sha256,width:c.width,height:c.height,
    method:'warm-colour outer rows and per-column hem within explicit semantic garment ROI; black border via7px band',
    roi:{start:c.start,end:c.end,hemStart:c.hemStart,hemEnd:c.hemEnd,rows:rows.map(({y})=>({y,left:c.minX(y),right:c.maxX(y)}))},inkPad:c.inkPad,clothing,approved:false,productionReady:false});
}
await fs.writeFile('library/topics/prehistoric-life/body-views/left-garment-contours-v1.json',JSON.stringify({version:1,records},null,2)+'\n',{flag:'wx'});
await fs.writeFile('packages/animation/body-view-left-contours.ts','// Offline native-PNG colour authoring; not anatomy or artwork/motion acceptance.\nexport const bodyViewLeftClothingContours='+JSON.stringify(paths,null,2)+' as const;\n',{flag:'wx'});
console.log(JSON.stringify({output:'left-garment-contours-v1.json',actors:records.map(r=>r.actor),imagesModified:false,approved:false}));
