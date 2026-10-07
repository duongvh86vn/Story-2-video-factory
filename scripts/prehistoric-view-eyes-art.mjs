// Native PNG pixel readings and static SVG document authoring only.
// Never calls a clock/body evaluator, GSAP, browser, audio or scene renderer.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {bodyViewRegistrations} from '../packages/animation/body-view-art.ts';
import {bodyViewEyesRegistration,bodyViewEyesSvg,bodyViewEyesState,bodyViewEyesDescription} from '../packages/animation/body-view-eyes.ts';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.ts';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/topics/reviews');
const samples={lila:{'three-quarter-right':[[676,315],[765,304]],'three-quarter-left':[[363,333],[432,337]]},karo:{'three-quarter-right':[[539,349],[638,336]],'three-quarter-left':[[333,355],[439,362]]}};
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1540"><rect width="1200" height="1540" fill="#FFF5DD"/><text x="30" y="35" font-size="24" fill="#46230F" font-family="sans-serif">Native eyes — registration study only, unapproved</text><text x="30" y="62" font-size="16" fill="#46230F" font-family="sans-serif">Whole native head / eye regions. No animation, audio or video evaluation.</text>';
const measurements=[];let row=0;
let artwork='<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1500"><rect width="1440" height="1500" fill="#FFF5DD"/><text x="30" y="35" font-size="24" fill="#46230F" font-family="sans-serif">Native eye controls — static artwork candidate, unapproved</text><text x="30" y="62" font-size="16" fill="#46230F" font-family="sans-serif">Source / 55% blink / closed lid / forward pupil look. No clocks, actor poses, audio or video.</text>';
const eyeMeasurements=[];
for(const actor of ['lila','karo'])for(const view of ['three-quarter-right','three-quarter-left']){
  const c=bodyViewRegistrations[actor][view],bytes=await fs.readFile(path.join(root,c.file)),sha256=createHash('sha256').update(bytes).digest('hex');
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(sha256!==c.sha256||info.width!==c.width||info.height!==c.height)throw new Error('Native eye source changed');
  const nativeId=actor+'-'+view,eyePoints=samples[actor][view],url='data:image/png;base64,'+bytes.toString('base64'),readings=[];
  svg+=`<defs><image id="${nativeId}" width="${c.width}" height="${c.height}" href="${url}"/></defs>`;
  const y=90+row*356,h=c.headBounds;
  svg+=`<text x="30" y="${y}" font-size="19" fill="#46230F" font-family="sans-serif">${actor} / ${view}</text>`;
  svg+=`<svg x="30" y="${y+12}" width="300" height="315" viewBox="${h.left-10} ${h.top-10} ${h.right-h.left+20} ${h.bottom-h.top+20}"><use href="#${nativeId}"/></svg>`;
  for(const [i,[cx,cy]] of eyePoints.entries()){
    const area={x:cx-40,y:cy-48,width:80,height:96},rows=[];
    for(let py=cy-30;py<=cy+30;py+=3){const ink=[];for(let px=cx-22;px<=cx+22;px++){const n=(py*info.width+px)*4;
      if(data[n]<60&&data[n+1]<50&&data[n+2]<40&&data[n+3]>220)ink.push(px);}
      rows.push({y:py,ink:ink.length?[ink[0],ink.at(-1)]:null});}
    readings.push({seed:[cx,cy],rows,caveat:'Bounded dark readings may include adjoining nose/hair; manual registration is required.'});
    svg+=`<svg x="${355+i*400}" y="${y+16}" width="335" height="300" viewBox="${area.x} ${area.y} ${area.width} ${area.height}"><use href="#${nativeId}"/><path d="M${cx-2} ${cy}H${cx+2}M${cx} ${cy-2}V${cy+2}" fill="none" stroke="#40B0F0" stroke-width=".5"/></svg><text x="${355+i*400}" y="${y+337}" font-size="16" fill="#46230F" font-family="sans-serif">native center ${cx},${cy}</text>`;
  }
  measurements.push({actor,view,file:c.file,sha256,width:c.width,height:c.height,readings});row++;
  const eyeRegistration=bodyViewEyesRegistration[actor][view],eyeReadings=[];
  for(const [slot,e] of eyeRegistration.eyes.entries()){
    let darkPixels=0,transparentPixels=0;const sum=[0,0,0],min=[255,255,255],max=[0,0,0],s=e.strip;
    for(let py=s.y;py<s.y+s.height;py++)for(let px=s.x;px<s.x+s.width;px++){const n=(py*info.width+px)*4;
      if(data[n]<60&&data[n+1]<50&&data[n+2]<40&&data[n+3]>220)darkPixels++;if(data[n+3]<220)transparentPixels++;
      for(let k=0;k<3;k++){sum[k]+=data[n+k];min[k]=Math.min(min[k],data[n+k]);max[k]=Math.max(max[k],data[n+k]);}}
    eyeReadings.push({slot:slot?'screen-right':'screen-left',registration:e,stripPixels:s.width*s.height,darkPixels,transparentPixels,minRGB:min,maxRGB:max,meanRGB:sum.map(v=>Number((v/(s.width*s.height)).toFixed(2)))});
  }
  eyeMeasurements.push({actor,view,file:c.file,sha256,width:c.width,height:c.height,eyes:eyeReadings,caveat:'Manual region excludes neighboring ink; colour means and pixel counts do not verify seamless animation or anatomy.'});
  const nativeImage=`<image width="${c.width}" height="${c.height}" href="${url}"/>`,profile={appearance:{artworkVersion:'forest-body-view-1',characterVariant:actor,bodyView:view,bodyEyes:'registered-eyes-v1'}};
  artwork+=`<defs><image id="${nativeId}" width="${c.width}" height="${c.height}" href="${url}"/></defs><text x="30" y="${y}" font-size="19" fill="#46230F" font-family="sans-serif">${actor} / ${view}</text>`;
  for(const [col,blink,look] of [[0,0,{x:0,y:0}],[1,.55,{x:0,y:0}],[2,1,{x:0,y:0}],[3,0,{x:view==='three-quarter-left'?-1:1,y:0}]]){
    let art=bodyViewEyesSvg(profile,{sha256,width:c.width,height:c.height,url});
    for(const [id,face] of Object.entries(bodyViewEyesState(eyeRegistration,look,blink).face))art=art.replace(new RegExp('<g id="'+id+'"[^>]*>'),tag=>tag.replace(/\s+(?:opacity|transform)="[^"]*"/g,'').replace('>',(face.opacity===undefined?'':' opacity="'+face.opacity+'"')+(face.attr?.transform?' transform="'+face.attr.transform+'"':'')+'>'));
    const content=(`<use href="#${nativeId}"/>`+art).replaceAll(nativeImage,`<use href="#${nativeId}"/>`),prefix=actor+'-'+view+'-'+col+'-';
    const namespaced=namespaceRigSvg(content,prefix).replaceAll('href="#'+prefix+nativeId+'"','href="#'+nativeId+'"');
    artwork+=`<svg x="${30+350*col}" y="${y+14}" width="330" height="300" viewBox="${h.left-10} ${h.top-10} ${h.right-h.left+20} ${h.bottom-h.top+20}">${namespaced}</svg>`;
  }
}
svg+='</svg>';await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'native-view-eyes-registration-study-v1.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'native-view-eyes-registration-study-v1.png'));
await fs.writeFile(path.join(root,'library/topics/prehistoric-life/body-views/eyes-registration-study-v1.json'),JSON.stringify({version:'native-eye-registration-study-1',productionReady:false,approved:false,kind:'bounded-native-pixel-readings-and-static-document',measurements},null,2)+'\n');
console.log(JSON.stringify({kind:'static-native-eye-document',rows:measurements.length,approved:false}));
artwork+='</svg>';
await fs.writeFile(path.join(out,'native-view-eyes-art-v1.svg'),artwork);
await sharp(Buffer.from(artwork)).png().toFile(path.join(out,'native-view-eyes-art-v1.png'));
await fs.writeFile(path.join(root,'library/topics/prehistoric-life/body-views/eyes-registration-v1.json'),JSON.stringify({version:bodyViewEyesDescription.version,fingerprint:bodyViewEyesDescription.fingerprint,productionReady:false,approved:false,kind:'static-native-eye-controls-and-strip-readings',measurements:eyeMeasurements},null,2)+'\n');
console.log(JSON.stringify({kind:'static-native-eye-artwork',rows:eyeMeasurements.length,strips:eyeMeasurements.flatMap(m=>m.eyes.map(e=>({actor:m.actor,view:m.view,slot:e.slot,darkPixels:e.darkPixels,transparentPixels:e.transparentPixels}))),approved:false}));
