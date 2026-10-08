/** Pure authored texture/mesh documents. No time, actor pose sampling, compiler,
 * animation, audio, server, browser or acceptance pipeline invocation. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-art.js';
import {nativeClothBindings,nativeClothSvg,nativeClothState,BODY_VIEW_LOCOMOTION_SELECTION,nativeClothDescription} from '../packages/animation/body-view-cloth.js';
import type {HostProfile} from '../packages/host/schemas.js';
const out=resolve('docs/topics/reviews');await mkdir(out,{recursive:true});
const controls=[{label:'Native garment',left:0,right:0},{label:'Pinned neutral mesh',left:0,right:0},{label:'Both thighs +14 deg',left:14,right:14},{label:'Both thighs -14 deg',left:-14,right:-14},{label:'Opposing +14 / -14',left:14,right:-14},{label:'Opposing -14 / +14',left:-14,right:14}];
const documents=[];
for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
  const source=bodyViewRegistrations[actor][view],binding=nativeClothBindings[actor][view],bytes=await readFile(resolve(source.file)),sha=createHash('sha256').update(bytes).digest('hex'),metadata=await sharp(bytes).metadata();
  if(sha!==source.sha256||metadata.width!==source.width||metadata.height!==source.height)throw new Error('Native artwork source differs: '+actor+'/'+view);
  const profile:Pick<HostProfile,'appearance'>={appearance:{outline:'#080604',shell:'#F2C58D',screen:'#F2C58D',accent:'#AE6E31',badge:'#4B2917',headScale:1,bodyScale:1,strokeWidth:7,characterVariant:actor,artworkVersion:'forest-body-view-1',bodyView:view,bodyMotion:BODY_VIEW_LOCOMOTION_SELECTION}};
  const art=nativeClothSvg(profile,source),url='data:image/png;base64,'+bytes.toString('base64');
  const artDefs='<defs><image id="view-body-source" width="'+source.width+'" height="'+source.height+'" href="'+url+'"/><mask id="view-clothing-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="'+source.width+'" height="'+source.height+'"><path d="'+source.clothing+'" fill="white" stroke="white" stroke-width="'+source.inkPad*2+'" stroke-linejoin="round"/></mask></defs>';
  const top=source.neck.y-30,left=binding.left-50,width=binding.right-binding.left+100,height=binding.bottom-top+40,scale=Math.min(260/width,330/height),records:Array<{label:string;angles:{left:number;right:number};influence:number;minimumAreaRatio:number}>=[];
  const cells=controls.map((control,i)=>{
    const state=nativeClothState(profile,source,{left:control.left,right:control.right});let artwork=i===0?'<g mask="url(#view-clothing-mask)"><use href="#view-body-source"/></g>':art.artwork;
    if(i!==0)for(const [id,value] of Object.entries(state.face))artwork=artwork.replace('<g id="'+id+'">','<g id="'+id+'" transform="'+value.attr.transform+'">');
    // All repeated IDs and references receive an authored document-cell scope.
    let cell=art.defs+artwork;cell=cell.replace(/\bid="([^"]+)"/g,(_,id:string)=>'id="c'+i+'-'+id+'"').replace(/url\(#([^)]*)\)/g,(_,id:string)=>'url(#'+(['view-clothing-mask'].includes(id)?id:'c'+i+'-'+id)+')');
    records.push({label:control.label,angles:{left:control.left,right:control.right},influence:state.influence,minimumAreaRatio:Math.min(...state.pieces.map(p=>p.areaRatio))});
    const x=(i%3)*300,y=Math.floor(i/3)*410+72;
    return '<g transform="translate('+x+' '+y+')"><rect x="8" y="8" width="284" height="390" rx="12" fill="#fff3d2" stroke="#d1ae76"/><text x="150" y="32" text-anchor="middle" font-size="14">'+control.label+'</text><g transform="translate('+(150-width*scale/2)+' 50) scale('+scale+') translate('+(-left)+' '+(-top)+')">'+cell+'</g></g>';
  }).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="#efe4c9"/><g font-family="Arial,sans-serif" fill="#352015"><text x="24" y="29" font-size="23">'+actor+' / '+view+' — native garment authoring</text><text x="24" y="54" font-size="14">Direct geometry controls; no pose clock, motion, video or artwork approval.</text></g>'+artDefs+'<g font-family="Arial,sans-serif" fill="#352015">'+cells+'</g></svg>';
  const basename='native-cloth-art-'+actor+'-'+view+'-v1';await writeFile(resolve(out,basename+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,basename+'.png'));
  documents.push({actor,view,source:{file:source.file,sha256:sha,width:metadata.width,height:metadata.height},binding,files:[basename+'.svg',basename+'.png'],controls:records});
}
await writeFile(resolve(out,'native-cloth-art-v1.json'),JSON.stringify({version:'native-cloth-art-documents-1',selection:BODY_VIEW_LOCOMOTION_SELECTION,fingerprint:nativeClothDescription.fingerprint,method:'direct authored thigh angles on immutable masked garment texture; no actor/clock sampling',approved:false,productionReady:false,limitations:nativeClothDescription.limitations,documents},null,2)+'\n');
process.stdout.write('Wrote four native garment shape documents and manifest; no motion or acceptance executed.\n');
