// Static SVG asset authoring / native PNG measurements only. No activity,
// body pose evaluator, browser, audio, GSAP, scenes or video rendering.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {bodyViewRegistrations} from '../packages/animation/body-view-art.ts';
import {bodyViewMouthRegistration,bodyViewMouthPaths,bodyViewMouthSvg,bodyViewMouthDescription} from '../packages/animation/body-view-mouth.ts';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.ts';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/topics/reviews');
const measurements=[];let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1480" viewBox="0 0 1440 1480"><rect width="1440" height="1480" fill="#FFF6E1"/><g font-family="sans-serif" fill="#502705"><text x="30" y="35" font-size="24">Native mouth artwork — static candidate, unapproved</text><text x="30" y="61" font-size="16">Source / 35% / 90% opening / mouth close-up. No audio, actor pose or video evaluation.</text></g>';
let row=0;
for(const actor of ['lila','karo'])for(const view of ['three-quarter-right','three-quarter-left']){
  const source=bodyViewRegistrations[actor][view],c=bodyViewMouthRegistration[actor][view],bytes=await fs.readFile(path.join(root,source.file));
  const sha256=createHash('sha256').update(bytes).digest('hex'),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(sha256!==c.sourceHash||info.width!==source.width||info.height!==source.height)throw new Error('Native mouth source changed');
  const q=c.bounds,readings=[];
  for(let y=q.y;y<q.y+q.height;y+=3){const ink=[],teeth=[];
    for(let x=q.x;x<q.x+q.width;x++){const n=(y*info.width+x)*4,[r,g,b,a]=data.subarray(n,n+4);
      if(a>220&&r<55&&g<40&&b<30)ink.push(x);if(a>220&&r>210&&g>190&&b>155)teeth.push(x);}
    readings.push({y,ink:ink.length?[ink[0],ink.at(-1)]:null,teeth:teeth.length?[teeth[0],teeth.at(-1)]:null});
  }
  measurements.push({actor,view,file:source.file,sha256,width:info.width,height:info.height,mouth:c,readings,
    caveat:'Dark readings can include face/hair/beard boundaries; row extents are measurements, not inferred anatomical mouth bounds.'});
  const url='data:image/png;base64,'+bytes.toString('base64'),profile={appearance:{artworkVersion:'forest-body-view-1',characterVariant:actor,bodyView:view,bodySpeech:'registered-mouth-v1'}};
  const native=bodyViewMouthSvg(profile,{sha256,width:source.width,height:source.height,url});
  const nativeId='native-'+actor+'-'+view,nativeImage=`<image width="${source.width}" height="${source.height}" href="${url}"/>`;
  svg+=`<defs><image id="${nativeId}" width="${source.width}" height="${source.height}" href="${url}"/></defs>`;
  const head=source.headBounds,y=90+row*342;
  svg+=`<text x="30" y="${y+18}" fill="#502705" font-family="sans-serif" font-size="18">${actor} / ${view}</text>`;
  for(const [col,amount] of [0,.35,.9,.9].entries()){
    let art=native.replace('id="view-mouth-layer" opacity="0"',`id="view-mouth-layer" opacity="${amount?1:0}"`);
    const curves=bodyViewMouthPaths(c,amount);
    for(const [id,d] of Object.entries(curves))art=art.replace(new RegExp(`(id="${id}" d=")[^"]*"`),'$1'+d+'"');
    const crop=col===3?{x:q.x-8,y:q.y-8,w:q.width+16,h:q.height+16}:{x:head.left-15,y:head.top-10,w:head.right-head.left+30,h:head.bottom-head.top+20};
    const content=(`<use href="#${nativeId}"/>`+art).replaceAll(nativeImage,`<use href="#${nativeId}"/>`),prefix=actor+'-'+view+'-'+col+'-';
    const namespaced=namespaceRigSvg(content,prefix).replaceAll('href="#'+prefix+nativeId+'"','href="#'+nativeId+'"');
    svg+=`<svg x="${30+col*350}" y="${y+26}" width="330" height="285" viewBox="${crop.x} ${crop.y} ${crop.w} ${crop.h}">${namespaced}</svg>`;
  }
  row++;
}
svg+='</svg>';
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'fixed-view-mouth-native-art-v1.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'fixed-view-mouth-native-art-v1.png'));
await fs.writeFile(path.join(root,'library/topics/prehistoric-life/body-views/mouth-registration-v1.json'),JSON.stringify({version:bodyViewMouthDescription.version,
  fingerprint:bodyViewMouthDescription.fingerprint,productionReady:false,approved:false,kind:'static-native-png-readings-and-manual-mouth-svg-artwork',measurements},null,2)+'\n');
console.log(JSON.stringify({kind:'static asset authoring',actors:measurements.length,version:bodyViewMouthDescription.version,approved:false}));
