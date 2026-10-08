/** Static artwork document only: no actor pose, timeline, speech activity,
 * animation evaluator, browser, model, audio or video is executed here. */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import type {HostProfile} from '../packages/host/schemas.js';
import {bodyViewMouthRegistration,bodyViewMouthPaths,bodyViewMouthSvg,registeredBodyViewMouth} from '../packages/animation/body-view-mouth.js';
import {BODY_VIEW_REST_SPEECH_SELECTION,bodyViewRestMouthRegistration,bodyViewRestMouthDescription} from '../packages/animation/body-view-rest-mouth.js';

const root=process.cwd(),output=path.join(root,'docs/topics/reviews'),measurements:unknown[]=[],cells:string[]=[];
const files=new Map<string,Buffer>();
for(const view of ['three-quarter-right','three-quarter-left'] as const){
  const rest=bodyViewRestMouthRegistration[view],base=bodyViewMouthRegistration.karo[view];
  const sourceFile='library/topics/prehistoric-life/body-views/karo-'+view+'-v1.png';
  for(const asset of [{file:sourceFile,sha256:base.sourceHash,width:base.sourceSize[0],height:base.sourceSize[1]},rest]){
    const bytes=await fs.readFile(path.join(root,asset.file)),metadata=await sharp(bytes).metadata();
    if(hash(bytes)!==asset.sha256||metadata.width!==asset.width||metadata.height!==asset.height)throw new Error('Static artwork source hash/dimensions changed: '+asset.file);
    files.set(asset.sha256,bytes);
    measurements.push({file:asset.file,sha256:asset.sha256,width:metadata.width,height:metadata.height,channels:metadata.channels,hasAlpha:metadata.hasAlpha});
  }
  const profile:{appearance:HostProfile['appearance']}={appearance:{outline:'#160B05',shell:'#A55B25',screen:'#F9A04D',accent:'#E96A12',badge:'#306D2D',headScale:1,bodyScale:1,strokeWidth:5,characterVariant:'karo',artworkVersion:'forest-body-view-1',bodyView:view,bodySpeech:BODY_VIEW_REST_SPEECH_SELECTION}};
  const url=(file:string,sha:string)=>{const bytes=files.get(sha);if(!bytes)throw new Error('Unregistered static plate: '+file);return 'data:image/png;base64,'+bytes.toString('base64');};
  const source={sha256:base.sourceHash,width:base.sourceSize[0],height:base.sourceSize[1],url:url(sourceFile,base.sourceHash)};
  const native=`<image width="${source.width}" height="${source.height}" href="${source.url}"/>`;
  // This is an explicit aperture SHAPE parameter, not a sampled audio/time frame.
  for(const [index,amount] of [undefined,0,.55,1].entries()){
    let artwork=native;
    if(amount!==undefined){
      let overlay=bodyViewMouthSvg(profile,source,url);
      for(const [id,d] of Object.entries(bodyViewMouthPaths(registeredBodyViewMouth(profile),amount)))overlay=overlay.replace(new RegExp(`(id="${id}" d=")[^"]*"`),'$1'+d+'"');
      artwork+=overlay;
    }
    const row=view==='three-quarter-right'?0:1,x=20+index*310,y=50+row*475,viewBox=view==='three-quarter-right'?'485 395 200 175':'285 410 200 175';
    const prefix='static-'+row+'-'+index+'-';artwork=artwork.replace(/id="([^"]+)"/g,(_,id:string)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id:string)=>`url(#${prefix}${id})`).replace(/href="#([^"]+)"/g,(_,id:string)=>`href="#${prefix}${id}"`);
    cells.push(`<g><rect x="${x}" y="${y}" width="290" height="395" rx="12" fill="#FFF6DF" stroke="#A16B32"/><text x="${x+12}" y="${y+27}" font-size="17" fill="#302015">${view} / ${amount===undefined?'original':`shape ${amount}`}</text><svg x="${x+5}" y="${y+40}" width="280" height="330" viewBox="${viewBox}">${artwork}</svg></g>`);
  }
}
await fs.mkdir(output,{recursive:true});
// Deduplicate immutable native images in this DOCUMENT. Runtime actor SVGs
// keep their existing independent namespace/resource policy.
const documentImages=new Map<string,string>(),definitions:string[]=[];
for(const [sha,bytes] of files){const m=await sharp(bytes).metadata(),url='data:image/png;base64,'+bytes.toString('base64'),id='document-image-'+sha;documentImages.set(url,id);definitions.push(`<image id="${id}" width="${m.width}" height="${m.height}" href="${url}"/>`);}
const content=cells.join('').replace(/<image([^>]*?) href="(data:image\/png;base64,[^"]+)"\/>/g,(_match,attributes:string,url:string)=>{const id=documentImages.get(url);if(!id)throw new Error('Unregistered document image');return `<use${attributes} href="#${id}"/>`;});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1260" height="1020" viewBox="0 0 1260 1020"><defs>${definitions.join('')}</defs><rect width="1260" height="1020" fill="#E8D3A9"/><text x="20" y="30" font-size="20" fill="#302015">Static native mouth artwork / unapproved / no motion or audio evaluated</text>${content}<text x="20" y="1000" font-size="17" fill="#302015">Uniform tile placement; no face warp. Shape amounts are authored geometry, never playback evidence.</text></svg>`;
await fs.writeFile(path.join(output,'native-rest-mouth-art-v1.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(output,'native-rest-mouth-art-v1.png'));
await fs.writeFile(path.join(output,'native-rest-mouth-art-v1.json'),JSON.stringify({version:bodyViewRestMouthDescription.version,kind:'static-native-png-measurements-and-svg-artwork-document',approved:false,productionReady:false,fingerprint:bodyViewRestMouthDescription.fingerprint,measurements,registrations:bodyViewRestMouthRegistration,limitations:bodyViewRestMouthDescription.limitations},null,2)+'\n');
process.stdout.write('Saved static mouth artwork document and native image measurements; no animation/audio acceptance.\n');
