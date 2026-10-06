import sharp from 'sharp';
import path from 'node:path';
import {findRepoRoot} from '../packages/core/config.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {promises as fs} from 'node:fs';

// Read-only alpha analysis. Images are never rewritten or cropped by this script.
const repo=await findRepoRoot(),directory=path.join(repo,'library/topics/prehistoric-life');
const layouts=[];
for(const id of ['lila','karo']) {
  const file=`${id}-parts-candidate-v1.png`,bytes=await fs.readFile(path.join(directory,file));
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const width=info.width,height=info.height,seen=new Uint8Array(width*height),stack:number[]=[];
  const components:Array<{x:number;y:number;width:number;height:number;area:number}>=[];
  for(let origin=0;origin<seen.length;origin++) {
    if(seen[origin]||data[origin*info.channels+info.channels-1]!<160)continue;
    seen[origin]=1;stack.push(origin);
    let minX=width,minY=height,maxX=0,maxY=0,area=0;
    while(stack.length) {
      const pixel=stack.pop()!,x=pixel%width,y=Math.floor(pixel/width);area++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const next of [x?pixel-1:-1,x+1<width?pixel+1:-1,y?pixel-width:-1,y+1<height?pixel+width:-1]) {
        if(next>=0&&!seen[next]&&data[next*info.channels+info.channels-1]!>=160) {seen[next]=1;stack.push(next);}
      }
    }
    if(area>500)components.push({x:Math.max(0,minX-8),y:Math.max(0,minY-8),width:Math.min(width,maxX+9)-Math.max(0,minX-8),height:Math.min(height,maxY+9)-Math.max(0,minY-8),area});
  }
  components.sort((a,b)=>b.area-a.area);
  layouts.push({id,file,sha256:hash(bytes),width,height,alphaThreshold:160,padding:8,status:'measurement-only-not-approved',components});
}
await writeJson(path.join(directory,'parts-measurements-v1.json'),{version:1,layouts});
console.log(JSON.stringify(layouts));
