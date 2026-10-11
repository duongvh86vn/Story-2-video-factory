import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {hash,writeAtomic} from '../core/utils.js';
import {validateDemo,type ArticulatedPart,type ImageMotionDemo} from './scene.js';
export interface InkArmReplacement {
  type:'ink-arm';
  from:{x:number;y:number};
  to:{x:number;y:number};
  width:number;
  hand?:{width:number;height:number;thumbSide?:'left'|'right'};
}
export interface SourcePart extends ArticulatedPart {polygon:[number,number][];inkOnly?:boolean;remove?:boolean;replacement?:InkArmReplacement}
export interface CharacterSourceRecipe {width:number;height:number;durationMs:number;fps:number;patchSampleX:number;patchMode?:'column'|'paper-interpolate'|'paper-harmonic';repairRegion?:'ink'|'polygon';repairMargin?:number;protectSubject?:boolean;parts:SourcePart[]}
export interface PreparedCharacter {directory:string;demo:ImageMotionDemo;layerCacheKey:string;assetHashes:Record<string,string>;sourceHash:string;maskHash:string}
export async function prepareCharacterSource(source:string,mask:string,directory:string,recipe:CharacterSourceRecipe,cacheRoot:string):Promise<PreparedCharacter>{
  const sourceBytes=await fs.readFile(source),maskBytes=await fs.readFile(mask),sourceHash=hash(sourceBytes),maskHash=hash(maskBytes);
  if(sourceBytes.length>16*1024*1024||maskBytes.length>16*1024*1024)throw new Error('Source or mask exceeds 16 MB');
  const metadata=await sharp(sourceBytes,{limitInputPixels:64000000}).metadata(),alphaMeta=await sharp(maskBytes,{limitInputPixels:64000000}).metadata();
  if(metadata.format!=='png'||alphaMeta.format!=='png'||!alphaMeta.hasAlpha||metadata.width!==alphaMeta.width||metadata.height!==alphaMeta.height||!metadata.width||!metadata.height||recipe.width<metadata.width||recipe.height<metadata.height)throw new Error('Source and alpha mask must be matching PNG images inside the canvas');
  if(!Number.isInteger(recipe.patchSampleX)||recipe.patchSampleX<0||recipe.patchSampleX>=metadata.width)throw new Error('Choose a valid background sample column');
  const parts=recipe.parts.map(({polygon,inkOnly,remove,replacement,...p})=>p);if(recipe.protectSubject)parts.push({id:'static-subject',image:'assets/static-subject.png',pivot:{x:0,y:0},frames:[{timeMs:0,angle:0},{timeMs:recipe.durationMs,angle:0}]});
  const demo:ImageMotionDemo={version:1,fps:recipe.fps,scenes:[{id:'character',width:recipe.width,height:recipe.height,durationMs:recipe.durationMs,original:'assets/original.png',background:'assets/background.png',layers:[],parts}]};validateDemo(demo);
  for(const p of recipe.parts)if(p.image!==`assets/${p.id}.png`||['original','source-original','background'].includes(p.id)||p.polygon.length<3||p.polygon.length>128||p.polygon.some(q=>q.length!==2||!q.every(Number.isFinite)||q[0]<0||q[0]>metadata.width!||q[1]<0||q[1]>metadata.height!))throw new Error('Invalid source part polygon or image name');
  for(const p of recipe.parts){
    const r=p.replacement;if(!r)continue;
    const validPoint=(q:{x:number;y:number})=>q&&Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>=0&&q.y>=0&&q.x<=recipe.width&&q.y<=recipe.height;
    if(r.type!=='ink-arm'||p.remove===false||!validPoint(r.from)||!validPoint(r.to)||!Number.isFinite(r.width)||r.width<1||r.width>64||Math.hypot(r.to.x-r.from.x,r.to.y-r.from.y)<r.width||r.from.x!==p.pivot.x||r.from.y!==p.pivot.y)throw new Error('Invalid replacement arm or pivot');
    if(r.hand&&(!Number.isFinite(r.hand.width)||!Number.isFinite(r.hand.height)||r.hand.width<2||r.hand.height<2||r.hand.width>128||r.hand.height>128||r.hand.thumbSide!==undefined&&!['left','right'].includes(r.hand.thumbSide)))throw new Error('Invalid replacement hand');
    const parent=recipe.parts.find(q=>q.id===p.parent)?.replacement;
    if(parent&&(parent.to.x!==r.from.x||parent.to.y!==r.from.y))throw new Error('Replacement arm segments must meet at their shared joint');
  }
  // Motion/pivots are excluded: changing the acting must not regenerate pixels.
  if(recipe.patchMode!==undefined&&!['column','paper-interpolate','paper-harmonic'].includes(recipe.patchMode))throw new Error('Unknown source background repair');
  const margin=recipe.repairMargin??1;if(!Number.isInteger(margin)||margin<0||margin>32||recipe.repairRegion!==undefined&&!['ink','polygon'].includes(recipe.repairRegion))throw new Error('Invalid source repair region');
  const layerCacheKey=hash({version:'source-parts-6',sourceHash,maskHash,width:recipe.width,height:recipe.height,patchSampleX:recipe.patchSampleX,patchMode:recipe.patchMode??'column',repairRegion:recipe.repairRegion??'ink',margin,protectSubject:recipe.protectSubject??false,parts:recipe.parts.map(({id,polygon,inkOnly,remove,replacement})=>({id,polygon,inkOnly,remove,replacement}))}),cache=path.join(path.resolve(cacheRoot),layerCacheKey);
  const names=['assets/source-original.png','assets/original.png','assets/background.png',...parts.map(p=>p.image)];
  let assetHashes:Record<string,string>|undefined;
  const verify=async(dir:string,hashes:Record<string,string>)=>{
    if(Object.keys(hashes).sort().join('|')!==[...names].sort().join('|')||hashes['assets/source-original.png']!==sourceHash)throw new Error('Layer cache integrity metadata mismatch');
    for(const name of names){let bytes:Buffer;try{bytes=await fs.readFile(path.join(dir,name));}catch{throw new Error('Layer cache integrity missing asset: '+name);}if(hash(bytes)!==hashes[name])throw new Error('Layer cache integrity mismatch: '+name);}
  };
  try{const existing=JSON.parse(await fs.readFile(path.join(cache,'cache.json'),'utf8'));if(existing.layerCacheKey!==layerCacheKey)throw new Error('Layer cache integrity identity mismatch');assetHashes=existing.assetHashes;await verify(cache,assetHashes!);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if(!assetHashes){
    const w=recipe.width,h=recipe.height,sw=metadata.width,sh=metadata.height,sourceRaw=await sharp(sourceBytes).ensureAlpha().raw().toBuffer(),alpha=await sharp(maskBytes).ensureAlpha().raw().toBuffer();
    const original=Buffer.alloc(w*h*4),sample=(Math.floor(sh/2)*sw+recipe.patchSampleX)*4,paper=[sourceRaw[sample]!,sourceRaw[sample+1]!,sourceRaw[sample+2]!];
    for(let i=0;i<original.length;i+=4)original.set([...paper,255],i);
    for(let y=0;y<sh;y++)original.set(sourceRaw.subarray(y*sw*4,(y+1)*sw*4),y*w*4);
    const remove=new Uint8Array(w*h),region=new Uint8Array(w*h),assets=new Map<string,Buffer>([['assets/source-original.png',sourceBytes],['assets/original.png',await sharp(original,{raw:{width:w,height:h,channels:4}}).png().toBuffer()]]);
    for(const p of recipe.parts){
      const polygon=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><polygon fill="white" points="${p.polygon.map(q=>q.join(',')).join(' ')}"/></svg>`)).ensureAlpha().raw().toBuffer(),layer=Buffer.alloc(w*h*4);
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
        const si=(y*sw+x)*4,di=(y*w+x)*4;
        if(p.remove!==false&&polygon[si+3]!>0)region[y*w+x]=1;
        if(p.inkOnly){const r=sourceRaw[si]!,g=sourceRaw[si+1]!,b=sourceRaw[si+2]!;if((r+g+b)/3>100||Math.max(r,g,b)-Math.min(r,g,b)>45)continue;}
        let a=Math.round((p.inkOnly?sourceRaw[si+3]!:alpha[si+3]!)*polygon[si+3]!/255);if(!a)continue;
        // Static occlusion keeps baked source pixels opaque. Applying a second
        // fractional matte over the same RGB introduces premultiplication color
        // rounding when Canvas paints the moving pose.
        if(p.remove===false)a=Math.round(sourceRaw[si+3]!*polygon[si+3]!/255);
        layer.set(sourceRaw.subarray(si,si+3),di);layer[di+3]=a;if(p.remove!==false)remove[y*w+x]=1;
      }
      if(p.replacement){
        const r=p.replacement,angle=Math.atan2(r.to.y-r.from.y,r.to.x-r.from.x)*180/Math.PI-90;
        const hand=r.hand?`<g transform="translate(${r.to.x} ${r.to.y}) rotate(${angle})"><ellipse cx="0" cy="${r.hand.height*.25}" rx="${r.hand.width*.38}" ry="${r.hand.height*.45}"/><circle cx="${r.hand.width*.32*(r.hand.thumbSide==='right'?1:-1)}" cy="${r.hand.height*.13}" r="${r.hand.width*.23}"/></g>`:'';
        // Closed, numeric drawing contract: no model-authored SVG or runtime code.
        assets.set(p.image,await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g fill="#030202"><path d="M ${r.from.x} ${r.from.y} L ${r.to.x} ${r.to.y}" fill="none" stroke="#030202" stroke-width="${r.width}" stroke-linecap="round"/>${hand}</g></svg>`)).png().toBuffer());
      }else assets.set(p.image,await sharp(layer,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
    }
    const dilate=(input:Uint8Array,r:number)=>{
      const row=new Uint8Array(w*h),out=new Uint8Array(w*h);
      for(let y=0;y<h;y++){let sum=0;for(let x=0;x<=Math.min(r,w-1);x++)sum+=input[y*w+x]!;for(let x=0;x<w;x++){row[y*w+x]=sum>0?1:0;if(x-r>=0)sum-=input[y*w+x-r]!;if(x+r+1<w)sum+=input[y*w+x+r+1]!;}}
      for(let x=0;x<w;x++){let sum=0;for(let y=0;y<=Math.min(r,h-1);y++)sum+=row[y*w+x]!;for(let y=0;y<h;y++){out[y*w+x]=sum>0?1:0;if(y-r>=0)sum-=row[(y-r)*w+x]!;if(y+r+1<h)sum+=row[(y+r+1)*w+x]!;}}return out;
    };
    const background=Buffer.from(original),repair=dilate(recipe.repairRegion==='polygon'?region:remove,margin);
    const paperAt=(x:number,y:number)=>{if(x<0||x>=sw||y<0||y>=sh||repair[y*w+x])return false;const i=(y*sw+x)*4,r=sourceRaw[i]!,g=sourceRaw[i+1]!,b=sourceRaw[i+2]!;return (recipe.patchMode!=='paper-harmonic'||alpha[i+3]!<8)&&r>170&&g>140&&b>90&&Math.max(r,g,b)-Math.min(r,g,b)<100;};
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(repair[y*w+x]){
      const at=(y*w+x)*4;let left=-1,right=-1;
      if(recipe.patchMode==='paper-interpolate'||recipe.patchMode==='paper-harmonic'){for(let d=1;d<=64&&(left<0||right<0);d++){if(left<0&&paperAt(x-d,y))left=x-d;if(right<0&&paperAt(x+d,y))right=x+d;}}
      if(left>=0||right>=0){if(left<0)left=right;if(right<0)right=left;const a=(y*sw+left)*4,b=(y*sw+right)*4,u=left===right?0:(x-left)/(right-left);for(let c=0;c<3;c++)background[at+c]=Math.round(sourceRaw[a+c]!*(1-u)+sourceRaw[b+c]!*u);}
      else{const sample=(y*sw+recipe.patchSampleX)*4;background.set(sourceRaw.subarray(sample,sample+3),at);}
      background[at+3]=255;
    }
    if(recipe.patchMode==='paper-harmonic'){
      // Simple paper only: interpolate the missing background from its valid
      // surrounding paper in both axes. Do not copy skin/clothing into it.
      // This is not semantic inpainting for a textured scene.
      const values=new Float32Array(w*h*3),cells:number[][]=[[],[]];
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const n=y*w+x;for(let c=0;c<3;c++)values[n*3+c]=background[n*4+c]!;if(repair[n])cells[(x+y)%2]!.push(n);}
      for(let iteration=0;iteration<800;iteration++){
        let delta=0;
        for(const parity of cells)for(const n of parity){
          const x=n%w,y=Math.floor(n/w),neighbors:number[]=[];
          for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx!,ny=y+dy!,m=ny*w+nx;if(nx>=0&&nx<sw&&ny>=0&&ny<sh&&(repair[m]||paperAt(nx,ny)))neighbors.push(m);}
          if(!neighbors.length)continue;
          for(let c=0;c<3;c++){let sum=0;for(const m of neighbors)sum+=values[m*3+c]!;const i=n*3+c,before=values[i]!,next=before+1.65*(sum/neighbors.length-before);values[i]=next;delta=Math.max(delta,Math.abs(next-before));}
        }
        if(delta<.015)break;
      }
      for(const parity of cells)for(const n of parity)for(let c=0;c<3;c++)background[n*4+c]=Math.min(255,Math.max(0,Math.round(values[n*3+c]!)));
    }
    assets.set('assets/background.png',await sharp(background,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
    if(recipe.protectSubject){const layer=Buffer.alloc(w*h*4),excluded=dilate(region,2);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const si=(y*sw+x)*4,di=(y*w+x)*4;if(!repair[y*w+x]||excluded[y*w+x]||!alpha[si+3])continue;layer.set(sourceRaw.subarray(si,si+4),di);}assets.set('assets/static-subject.png',await sharp(layer,{raw:{width:w,height:h,channels:4}}).png().toBuffer());}
    if(recipe.parts.some(p=>p.replacement)){
      // The rest image must also contain the replacement, otherwise seeking to
      // frame zero or holding a neutral pose would bring back the old arm.
      const rest=await sharp(assets.get('assets/background.png')!).composite(parts.map(p=>({input:assets.get(p.image)!}))).png().toBuffer();
      assets.set('assets/original.png',rest);
    }
    await fs.mkdir(path.join(cache,'assets'),{recursive:true});assetHashes={};
    for(const [name,bytes]of assets){assetHashes[name]=hash(bytes);try{await fs.writeFile(path.join(cache,name),bytes,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||hash(await fs.readFile(path.join(cache,name)))!==hash(bytes))throw new Error('Layer cache integrity conflict: '+name);}}
    await writeAtomic(path.join(cache,'cache.json'),JSON.stringify({layerCacheKey,assetHashes},null,2)+'\n');
  }
  const prepared:PreparedCharacter={directory:path.resolve(directory),demo,layerCacheKey,assetHashes,sourceHash,maskHash},identity=hash(demo);
  try{const old=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));if(old.identity!==identity||old.layerCacheKey!==layerCacheKey)throw new Error('Output already contains a different motion. Choose a new directory; cached source layers will be reused.');await verify(directory,assetHashes);return prepared;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  await fs.mkdir(directory,{recursive:false});await fs.mkdir(path.join(directory,'assets'));
  for(const name of names)await fs.copyFile(path.join(cache,name),path.join(directory,name),fs.constants.COPYFILE_EXCL);
  await writeAtomic(path.join(directory,'manifest.json'),JSON.stringify({...prepared,identity,recipe,productionReady:false,replacedParts:recipe.parts.filter(p=>p.replacement).map(p=>p.id),notes:['Candidate source matte and manual polygons; ink selection uses the original dark pixels. Not semantic part segmentation.','Replacement arms use rounded straight ink segments; raw source bytes are preserved separately.','Background repaired from nearby paper pixels or specified column; complex occlusion needs a supplied clean plate.','One fixed source orientation; no authored head turn or lip-sync.']},null,2)+'\n');return prepared;
}
