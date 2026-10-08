/** Static native SVG artwork documents only. No performance/clock/activity,
 * browser, model, TTS/ASR or video is evaluated. Source PNG bytes stay intact. */
import path from 'node:path';
import {promises as fs} from 'node:fs';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import type {HostProfile} from '../packages/host/schemas.js';
import {Moods} from '../packages/animation/schemas.js';
import {expressionPose} from '../packages/animation/expression-pose.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-art.js';
import {bodyViewEyesSvg,bodyViewEyesState,registeredBodyViewEyes} from '../packages/animation/body-view-eyes.js';
import {bodyViewMouthSvg} from '../packages/animation/body-view-mouth.js';
import {bodyViewRestMouthAssets} from '../packages/animation/body-view-rest-mouth.js';
import {bodyViewExpressionsSvg,bodyViewExpressionState,bodyViewExpressionsDescription,BODY_VIEW_EXPRESSIONS_SELECTION} from '../packages/animation/body-view-expressions.js';

const root=process.cwd(),output=path.join(root,'docs/topics/reviews'),measurements:unknown[]=[],files=new Map<string,{bytes:Buffer;width:number;height:number}>();
await fs.mkdir(output,{recursive:true});
for(const actor of ['lila','karo'] as const)for(const view of ['three-quarter-right','three-quarter-left'] as const){
  const c=bodyViewRegistrations[actor][view],profile:Pick<HostProfile,'appearance'>={appearance:{outline:'#080604',shell:'#F2C58D',screen:'#F2C58D',accent:'#AE6E31',badge:'#4B2917',headScale:1,bodyScale:1,strokeWidth:6,
    characterVariant:actor,artworkVersion:'forest-body-view-1',bodyView:view,bodySpeech:'registered-rest-mouth-v1',bodyEyes:'registered-eyes-v1',bodyExpressions:BODY_VIEW_EXPRESSIONS_SELECTION}};
  for(const asset of [{file:c.file,sha256:c.sha256},...bodyViewRestMouthAssets(profile.appearance)]){
    if(files.has(asset.sha256))continue;const bytes=await fs.readFile(path.join(root,asset.file)),m=await sharp(bytes).metadata();
    if(hash(bytes)!==asset.sha256||!m.width||!m.height)throw new Error('Static expression art source hash/dimensions invalid: '+asset.file);
    files.set(asset.sha256,{bytes,width:m.width,height:m.height});measurements.push({file:asset.file,sha256:asset.sha256,width:m.width,height:m.height});
  }
  const url=(_file:string,sha:string)=>'data:image/png;base64,'+files.get(sha)!.bytes.toString('base64'),source={sha256:c.sha256,width:c.width,height:c.height,url:url(c.file,c.sha256)},base=`<image width="${c.width}" height="${c.height}" href="${source.url}"/>`;
  const art=base+bodyViewMouthSvg(profile,source,url)+bodyViewEyesSvg(profile,source)+bodyViewExpressionsSvg(profile,source,url),cells:string[]=[];
  const shapes=[{label:'original native',mood:null,amount:0},...Moods.map(mood=>({label:mood+' · closed',mood,amount:0})),...['neutral','happy','sad','angry','surprised','afraid'].map(mood=>({label:mood+' · authored aperture .65',mood:mood as typeof Moods[number],amount:.65}))];
  for(const [i,shape] of shapes.entries()){
    let content=base;
    if(shape.mood){const pose=expressionPose(shape.mood),state=bodyViewExpressionState(profile,pose,shape.amount),face={...bodyViewEyesState(registeredBodyViewEyes(profile),{x:0,y:0},state.eyeClosure).face,...state.face};content=art;
      for(const [id,d] of Object.entries(state.paths))content=content.replace(new RegExp('<path id="'+id+'"[^>]*/>'),tag=>tag.replace(/\s+d="[^"]*"/,' d="'+d+'"'));
      for(const [id,f] of Object.entries(face)){const a=f as {opacity?:number;x?:number;y?:number;rotation?:number;attr?:{transform:string}};
        content=content.replace(new RegExp('<g id="'+id+'"[^>]*>'),tag=>tag.replace(/\s+(?:transform|opacity)="[^"]*"/g,'').replace('>',(a.opacity===undefined?'':' opacity="'+a.opacity+'"')+' transform="'+(a.attr?.transform??'translate('+(a.x??0)+' '+(a.y??0)+') rotate('+(a.rotation??0)+')')+'">'));}
    }
    // Each cell is an independent SVG namespace. No scene/compiler is used.
    content=content.replace(/\bid="([^"]+)"/g,(_m,id:string)=>`id="doc-${i}-${id}"`).replace(/url\(#([^)]+)\)/g,(_m,id:string)=>`url(#doc-${i}-${id})`).replace(/href="#([^"]+)"/g,(_m,id:string)=>`href="#doc-${i}-${id}"`);
    const box=c.headBounds,viewBox=`${box.left} ${box.top} ${box.right-box.left} ${box.bottom-box.top}`;
    cells.push(`<g transform="translate(${(i%5)*260} ${48+Math.floor(i/5)*290})"><rect width="252" height="282" rx="10" fill="#FFF3D7"/><text x="9" y="20" font-size="12" fill="#302015">${shape.label}</text><svg x="8" y="28" width="236" height="246" viewBox="${viewBox}">${content}</svg></g>`);
  }
  const defs:string[]=[];const urls=new Map<string,string>();const allCells=cells.join('');for(const [sha,f] of files){const u=url('',sha);if(!allCells.includes(u))continue;const id='document-image-'+sha;urls.set(u,id);defs.push(`<image id="${id}" width="${f.width}" height="${f.height}" href="${u}"/>`);}
  const content=cells.join('').replace(/<image([^>]*?) href="(data:image\/png;base64,[^"]+)"\/>/g,(_m,attributes:string,u:string)=>`<use${attributes} href="#${urls.get(u)!}"/>`);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="1520"><defs>${defs.join('')}</defs><rect width="1300" height="1520" fill="#DCC49A"/><text x="12" y="28" font-size="17" fill="#302015">${actor} / ${view} / static authored shapes / UNAPPROVED / no motion or audio</text>${content}</svg>`;
  const name='native-expression-art-'+actor+'-'+view+'-v1';await fs.writeFile(path.join(output,name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(output,name+'.png'));
}
await fs.writeFile(path.join(output,'native-expression-art-v1.json'),JSON.stringify({kind:'static-native-svg-expression-artwork-document',approved:false,productionReady:false,motionEvaluated:false,audioEvaluated:false,measurements,expression:bodyViewExpressionsDescription},null,2)+'\n');
process.stdout.write('Saved four native expression artwork documents; no performance, audio or video evaluated.\n');
