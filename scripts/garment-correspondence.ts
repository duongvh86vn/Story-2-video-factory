import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {referenceBodyDescription} from '../packages/animation/forest-body-art.js';
import {hash} from '../packages/core/utils.js';

// Read existing alpha to measure SVG geometry. Never rewrite any raster asset.
type P={x:number;y:number};
const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const area=(p:P[])=>p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length]!;return sum+a.x*b.y-b.x*a.y;},0)/2;
const inside=(p:P,poly:P[])=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i]!,b=poly[j]!;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
}return yes;};
function linearPath(d:string){
  const tokens=d.match(/[MLHVZ]|-?\d+(?:\.\d+)?/g)!,out:P[]=[];let x=0,y=0,i=0,command='';
  while(i<tokens.length){if(/[A-Z]/.test(tokens[i]!))command=tokens[i++]!;if(command==='Z')break;
    if(command==='H')x=Number(tokens[i++]);else if(command==='V')y=Number(tokens[i++]);else{x=Number(tokens[i++]);y=Number(tokens[i++]);}
    out.push({x,y});
  }return out;
}
const edgeDistance=(p:P,poly:P[])=>Math.min(...poly.map((a,i)=>{const b=poly[(i+1)%poly.length]!,dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}));
async function contour(file:string,region:{x:number;y:number;width:number;height:number},include:(p:P)=>boolean=()=>true,canvas?:{width:number;height:number}){
  const {data,info}=await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const width=canvas?.width??info.width,height=canvas?.height??info.height;
  const filled=new Set<number>(),key=(x:number,y:number)=>y*(width+1)+x;
  for(let y=region.y;y<Math.min(height,region.y+region.height);y++)for(let x=region.x;x<Math.min(width,region.x+region.width);x++){
    const sx=Math.min(info.width-1,Math.floor((x+.5)*info.width/width)),sy=Math.min(info.height-1,Math.floor((y+.5)*info.height/height));
    if(data[(sy*info.width+sx)*info.channels+3]!>=160&&include({x:x+.5,y:y+.5}))filled.add(key(x,y));
  }
  const edges=new Map<number,number[]>(),has=(x:number,y:number)=>filled.has(key(x,y));
  const edge=(from:number,to:number)=>edges.set(from,[...(edges.get(from)??[]),to]);
  for(const k of filled){const x=k%(width+1),y=Math.floor(k/(width+1));
    if(!has(x,y-1))edge(key(x,y),key(x+1,y));
    if(!has(x+1,y))edge(key(x+1,y),key(x+1,y+1));
    if(!has(x,y+1))edge(key(x+1,y+1),key(x,y+1));
    if(!has(x-1,y))edge(key(x,y+1),key(x,y));
  }
  const rings:P[][]=[];
  while(edges.size){const start=edges.keys().next().value!,ring:P[]=[];let next=start,previous=start-1;
    do{ring.push({x:next%(width+1),y:Math.floor(next/(width+1))});const choices=edges.get(next);if(!choices?.length)break;
      const direction=(from:number,to:number)=>Math.atan2(Math.floor(to/(width+1))-Math.floor(from/(width+1)),to%(width+1)-from%(width+1));
      const turn=(to:number)=>(direction(next,to)-direction(previous,next)+Math.PI*2)%(Math.PI*2);
      choices.sort((a,b)=>{const rank=(to:number)=>Math.abs(turn(to)-Math.PI/2)<.01?0:Math.abs(turn(to))<.01?1:2;return rank(a)-rank(b);});
      const following=choices.shift()!;if(!choices.length)edges.delete(next);previous=next;next=following;
    }while(next!==start&&ring.length<=filled.size*4);
    if(next===start&&ring.length>3)rings.push(ring);
  }
  const ring=rings.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)))[0];if(!ring)throw new Error('No closed cloth contour: '+file);
  return area(ring)>0?ring:ring.reverse();
}
const counts=[2,3,2,2,2,2,3];
function resample(ring:P[],anchors:P[],label:string,samples=counts){
  const indices=anchors.map(a=>ring.reduce((best,p,i)=>Math.hypot(p.x-a.x,p.y-a.y)<Math.hypot(ring[best]!.x-a.x,ring[best]!.y-a.y)?i:best,0));
  const spans=indices.map((n,i)=>(indices[(i+1)%indices.length]!-n+ring.length)%ring.length);
  if(spans.reduce((a,b)=>a+b,0)!==ring.length||spans.includes(0))throw new Error(label+': anchors do not follow the contour: '+JSON.stringify({indices,spans,length:ring.length}));
  const out:P[]=[];
  for(let i=0;i<indices.length;i++){
    const points=Array.from({length:spans[i]!+1},(_,k)=>ring[(indices[i]!+k)%ring.length]!);
    const lengths=[0];for(let k=1;k<points.length;k++)lengths.push(lengths.at(-1)!+Math.hypot(points[k]!.x-points[k-1]!.x,points[k]!.y-points[k-1]!.y));
    for(let k=0;k<samples[i]!;k++){const wanted=lengths.at(-1)!*k/samples[i]!;let at=1;while(lengths[at]!<wanted)at++;
      const a=points[at-1]!,b=points[at]!,t=(wanted-lengths[at-1]!)/(lengths[at]!-lengths[at-1]!||1);
      out.push({x:Number((a.x+(b.x-a.x)*t).toFixed(4)),y:Number((a.y+(b.y-a.y)*t).toFixed(4))});
    }
  }return out;
}
function commonTriangles(rest:P[],seat:P[]){
  const stages=[0,.25,.5,.75,1].map(t=>rest.map((p,i)=>({x:p.x+(seat[i]!.x-p.x)*t,y:p.y+(seat[i]!.y-p.y)*t})));
  const n=rest.length,diagonal=new Map<string,boolean>();
  const ok=(i:number,j:number)=>{const key=i+':'+j;if(diagonal.has(key))return diagonal.get(key)!;
    const valid=i===j||Math.abs(i-j)===1||i===0&&j===n-1||stages.every(poly=>{
      const a=poly[i]!,b=poly[j]!;
      if(!inside({x:(a.x+b.x)/2,y:(a.y+b.y)/2},poly))return false;
      return poly.every((p,k)=>{const l=(k+1)%n;if(k===i||k===j||l===i||l===j)return true;const q=poly[l]!;
        return !(cross(a,b,p)*cross(a,b,q)<-1e-7&&cross(p,q,a)*cross(p,q,b)<-1e-7);
      });
    });diagonal.set(key,valid);return valid;
  };
  const triangle=(i:number,j:number,k:number)=>{
    // Signed area is quadratic in interpolation time. Include its true minimum.
    const f=(t:number)=>{const p=[i,j,k].map(index=>({x:rest[index]!.x+(seat[index]!.x-rest[index]!.x)*t,y:rest[index]!.y+(seat[index]!.y-rest[index]!.y)*t}));return cross(p[0]!,p[1]!,p[2]!);};
    const c=f(0),end=f(1),mid=f(.5),a=2*(end+c-2*mid),b=end-c-a,t=a>0?-b/(2*a):-1;
    return Math.min(c,end,...(t>0&&t<1?[f(t)]:[]))>1e-5;
  };
  const memo=new Map<string,number[][]|null>();
  const solve=(i:number,j:number):number[][]|null=>{if(j<=i+1)return [];const key=i+':'+j;if(memo.has(key))return memo.get(key)!;
    for(let k=i+1;k<j;k++){if(!ok(i,k)||!ok(k,j)||!triangle(i,k,j))continue;const a=solve(i,k),b=solve(k,j);if(a&&b){const result=[...a,...b,[i,k,j]];memo.set(key,result);return result;}}
    memo.set(key,null);return null;
  };
  const result=solve(0,n-1);if(!result)throw new Error('No shared non-inverting garment triangulation');return result;
}
function triangulate(poly:P[]){
  const indices=poly.map((_,i)=>i),triangles:number[][]=[];
  while(indices.length>3){let found=false;
    for(let at=0;at<indices.length;at++){
      const i=indices[(at+indices.length-1)%indices.length]!,j=indices[at]!,k=indices[(at+1)%indices.length]!,a=poly[i]!,b=poly[j]!,c=poly[k]!;
      if(cross(a,b,c)<1e-8||indices.some(n=>n!==i&&n!==j&&n!==k&&cross(a,b,poly[n]!)>=-1e-8&&cross(b,c,poly[n]!)>=-1e-8&&cross(c,a,poly[n]!)>=-1e-8))continue;
      triangles.push([i,j,k]);indices.splice(at,1);found=true;break;
    }
    if(!found)throw new Error('Cannot triangulate measured outline');
  }
  triangles.push(indices);return triangles;
}
function compatibleMesh(rest:P[],seat:P[]){
  // Overlay two triangulations in a convex parameter domain. Intersections
  // add Steiner vertices, so concave outlines need not share their diagonals.
  const n=rest.length,uv=rest.map((_,i)=>({x:Math.cos(2*Math.PI*i/n),y:Math.sin(2*Math.PI*i/n)}));
  const bary=(p:P,ids:number[],target:P[])=>{
    const a=uv[ids[0]!]!,b=uv[ids[1]!]!,c=uv[ids[2]!]!,det=cross(a,b,c);
    const weights=[cross(p,b,c)/det,cross(a,p,c)/det,cross(a,b,p)/det];
    return {x:weights.reduce((sum,w,i)=>sum+w*target[ids[i]!]!.x,0),y:weights.reduce((sum,w,i)=>sum+w*target[ids[i]!]!.y,0)};
  };
  const clip=(poly:P[],ids:number[])=>{
    let out=poly;
    for(let i=0;i<3;i++){const a=uv[ids[i]!]!,b=uv[ids[(i+1)%3]!]!,input=out;out=[];
      for(let j=0;j<input.length;j++){const p=input[j]!,q=input[(j+1)%input.length]!,d=cross(a,b,p),e=cross(a,b,q);
        if(d>=-1e-9)out.push(p);
        if((d>=0)!==(e>=0)){const t=d/(d-e);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
      }
    }return out;
  };
  const pieces:Array<{rest:P[];seat:P[]}>=[];
  for(const a of triangulate(rest))for(const b of triangulate(seat)){
    const polygon=clip(a.map(i=>uv[i]!),b);if(polygon.length<3||Math.abs(area(polygon))<1e-9)continue;
    for(let i=1;i<polygon.length-1;i++){
      const tri=[polygon[0]!,polygon[i]!,polygon[i+1]!];if(Math.abs(area(tri))<1e-9)continue;
      pieces.push({rest:tri.map(p=>bary(p,a,rest)),seat:tri.map(p=>bary(p,b,seat))});
    }
  }
  return pieces;
}
const anchors={
  lila:{rest:[[173,455],[311,455],[303,584],[261,592],[236,535],[202,595],[151,577]],right:[[200,115],[480,115],[915,640],[710,640],[627,485],[400,640],[262,609]],left:[[1690,115],[1950,110],[1810,640],[1730,600],[1540,520],[1320,620],[1200,630]]},
  karo:{rest:[[134,450],[290,450],[284,541],[234,527],[214,475],[196,537],[134,535]],right:[[200,260],[420,300],[790,460],[690,500],[672,485],[620,655],[245,575]],left:[[1355,300],[1574,260],[1530,575],[1140,655],[1100,485],[1085,500],[980,460]]},
} as const;
const p=(coordinates:readonly (readonly [number,number])[])=>coordinates.map(([x,y])=>({x,y}));
const body=referenceBodyDescription(),result:Record<string,unknown>={};
for(const actor of ['lila','karo'] as const){
  const source=body.sources[actor],asset=body.seatedGarments.assets[actor],clip=linearPath(source.parts.clothing.clip),hem=linearPath(source.hem),start=actor==='lila'?455:450;
  if(hash(await readFile(source.file))!==source.sha256||hash(await readFile(asset.file))!==asset.sha256)throw new Error('Garment bitmap differs from its declared source hash');
  const bitmap=await sharp(await readFile(source.file)).metadata();
  const restRing=await contour(source.file,{x:100,y:start,width:250,height:180},point=>inside(point,clip)&&(inside(point,hem)||edgeDistance(point,hem)<=source.hemOutlinePad),source);
  const rest=resample(restRing,p(anchors[actor].rest),actor+'/rest');
  const local=(points:P[],anchor:P,scale:number)=>points.map(point=>({x:(point.x-anchor.x)*scale,y:(point.y-anchor.y)*scale}));
  const views:Record<string,unknown>={};
  for(const facing of ['left','right'] as const){
    const ring=await contour(asset.file,asset[facing].region),uv=resample(ring,p(anchors[actor][facing]),actor+'/'+facing);
    let pieces:Array<{rest:P[];seat:P[]}>;
    try {pieces=commonTriangles(local(rest,source.pelvis,source.unitScale),local(uv,asset[facing].anchor,asset.scale)).map(ids=>({rest:ids.map(i=>rest[i]!),seat:ids.map(i=>uv[i]!)}));}
    catch {pieces=compatibleMesh(rest,uv);}
    const minimumArea=Math.min(...pieces.map(piece=>{
      const a=local(piece.rest,source.pelvis,source.unitScale),b=local(piece.seat,asset[facing].anchor,asset.scale);
      const f=(t:number)=>{const points=a.map((p,i)=>({x:p.x+(b[i]!.x-p.x)*t,y:p.y+(b[i]!.y-p.y)*t}));return cross(points[0]!,points[1]!,points[2]!);};
      const c=f(0),end=f(1),mid=f(.5),q=2*(end+c-2*mid),l=end-c-q,at=q>0?-l/(2*q):-1;
      return Math.min(c,end,...(at>0&&at<1?[f(at)]:[]))/2;
    }));
    console.log(actor+'/'+facing+' pieces='+pieces.length+' minimum area='+minimumArea.toFixed(6));
    if(minimumArea<=0)throw new Error('Cloth correspondence inverts: '+actor+'/'+facing);
    views[facing]={uv,pieces,outline:resample(ring,p(anchors[actor][facing]),actor+'/'+facing+'/outline',[8,8,6,6,6,8,8]),minimumTriangleArea:minimumArea};
  }
  result[actor]={rest:{file:source.file,sha256:source.sha256,width:source.width,height:source.height,bitmapWidth:bitmap.width,bitmapHeight:bitmap.height,scale:source.unitScale,anchor:source.pelvis,uv:rest,outline:resample(restRing,p(anchors[actor].rest),actor+'/rest/outline',[8,8,6,6,6,8,8])},views};
}
await writeFile('library/topics/prehistoric-life/rig-v1/garment-correspondence-v2.json',JSON.stringify({version:2,status:'candidate-geometry',method:'logical SVG alpha contours with hand-selected semantic anchors; 16 cage vertices, 50 outline vertices, common triangles or compatible triangulations with Steiner vertices; exact quadratic minimum area for the undeformed standing/seated interpolation; original bitmap files unchanged',actors:result},null,2)+'\n');
console.log('Saved garment correspondence geometry for both actors / both seated directions.');
