import type {HostProfile} from '../host/schemas.js';
import {hash} from '../core/utils.js';

export const SOURCE_COLOUR_VERSION='original-rgb-v2' as const;
export type SourceColourActor='lila'|'karo';
/** Original RGB stays byte-for-byte intact. The matte remains a candidate;
 * native source units are distinct from the high-resolution extraction pixels. */
export const sourceColourCalibration={
  lila:{rgb:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',width:430,height:766},
    matte:{file:'library/topics/prehistoric-life/lila-cutout-v1.png',sha256:'ef8b4a5f1445e0937bb41e661e8dc9de8a8a12a499e2eca87e3367807474d14e',width:939,height:1675},
    protectedInterior:'M245 147L263 126L289 104L309 95L348 100L367 123L378 152L377 186L361 211L338 230L297 237L261 224L239 204L237 177Z'},
  karo:{rgb:{file:'docs/topics/assets/reference-karo-full.png',sha256:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2',width:377,height:716},
    matte:{file:'library/topics/prehistoric-life/karo-cutout-v1.png',sha256:'f190653ab448f89da80b7156ff7ee677d5788a16dca6126b7796bab3f845b665',width:910,height:1728},
    protectedInterior:'M161 132L191 116L222 92L264 94L290 113L310 143L314 177L297 209L276 229L244 248L211 231L181 212L161 184Z'},
} as const;
// Two bounded matrices compose the threshold without widening the canonical
// renderer's existing |coefficient|<=10 security contract.
const paperAlpha=['0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 -8 0 0 6.2125',
  '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 4 0'] as const;
const whiteAlpha='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0';
export function usesSourceColour(appearance:HostProfile['appearance']):boolean {
  if(appearance.sourceColour===undefined)return false;
  if(appearance.sourceColour!==SOURCE_COLOUR_VERSION||appearance.artworkVersion!=='forest-body-1'||!appearance.characterVariant)throw new Error('needs-source-colour-profile: original colour requires a source body and actor');
  return true;
}
export function sourceColourAssets(appearance:HostProfile['appearance']){
  if(!usesSourceColour(appearance))return [];
  const source=sourceColourCalibration[appearance.characterVariant!];
  return [source.rgb,source.matte].map(asset=>({file:asset.file,sha256:asset.sha256,path:'assets/rigs/'+asset.sha256+'.png'}));
}
/** Passive, bounded native SVG masks only. No geometry, narration or timeline is evaluated. */
export function sourceColourSvg(actor:SourceColourActor,prefix:string,imageUrl:(file:string,sha256:string)=>string){
  if(!/^[a-z][a-z0-9-]{0,79}$/.test(prefix))throw new Error('Invalid source-colour SVG namespace');
  const source=sourceColourCalibration[actor];if(!source)throw new Error('Unknown source-colour actor');
  const url=(asset:{file:string;sha256:string})=>{
    const value=imageUrl(asset.file,asset.sha256);
    if(value!=='assets/rigs/'+asset.sha256+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('Unapproved source-colour image URL');
    return value;
  };
  const {width:w,height:h}=source.rgb,rgb=prefix+'-rgb',matte=prefix+'-matte',paper=prefix+'-paper';
  const image=(id:string,href:string)=>`<image id="${id}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" href="${href}"/>`;
  const region=`maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"`;
  const filter=(id:string,matrix:string|readonly string[])=>`<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB">${(typeof matrix==='string'?[matrix]:matrix).map(values=>`<feColorMatrix type="matrix" values="${values}"/>`).join('')}</filter>`;
  const defs=image(rgb,url(source.rgb))+image(matte,url(source.matte))+filter(prefix+'-matte-white',whiteAlpha)+filter(prefix+'-paper-alpha',paperAlpha)
    +`<mask id="${matte}-mask" ${region}><use href="#${matte}" filter="url(#${prefix}-matte-white)"/></mask>`
    +`<mask id="${paper}-mask" ${region}><use href="#${rgb}" filter="url(#${prefix}-paper-alpha)"/><path d="${source.protectedInterior}" fill="#ffffff"/></mask>`;
  return {defs,artwork:`<g mask="url(#${matte}-mask)"><g mask="url(#${paper}-mask)"><use href="#${rgb}"/></g></g>`,width:w,height:h};
}
export const sourceColourDescription={version:SOURCE_COLOUR_VERSION,productionReady:false,approved:false,
  sources:sourceColourCalibration,paperAlpha,whiteAlpha,
  contract:'Original RGB is never repainted; existing AI alpha is a separate candidate matte in original source units, refined by source-colour paper rejection with protected interior regions.',
  limitations:['Matte alignment, fringes, outline clipping and protected-interior regions still need artwork acceptance.','Existing source joint/layer landmarks remain inferred candidates; this is not new anatomy registration.','Source orientation only; authored views, mouth/blink, occluded cloth, poses and acting remain unapproved.'],
  fingerprint:hash({version:SOURCE_COLOUR_VERSION,sourceColourCalibration,paperAlpha,whiteAlpha})};
