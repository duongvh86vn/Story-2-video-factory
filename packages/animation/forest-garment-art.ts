import type {HostProfile} from '../host/schemas.js';
import {referenceImageUrl} from './forest-head-art.js';

/** Supplemental seated views are candidates, not pixel-exact extractions.
 * Standing cutouts stay unchanged. Known blend ghosting blocks production. */
const garments={
  lila:{file:'library/topics/prehistoric-life/rig-v1/lila-seated-garment-v1.png',sha256:'9db3501a16c1c4d4f36b504cbea99ad7b52a3eb855bd656029ff7d3f73c451c2',width:2172,height:724,scale:.105,
    right:{anchor:{x:350,y:145},region:{x:80,y:60,width:920,height:630}},
    left:{anchor:{x:1810,y:145},region:{x:1180,y:60,width:920,height:630}}},
  karo:{file:'library/topics/prehistoric-life/rig-v1/karo-seated-garment-v1.png',sha256:'06e01182df8bb332ce95d5fc765a4e3b236d2d08c5565e8f00b133374377cd0e',width:1774,height:887,scale:.1,
    right:{anchor:{x:305,y:298},region:{x:50,y:220,width:770,height:480}},
    left:{anchor:{x:1470,y:298},region:{x:950,y:220,width:770,height:480}}},
} as const;
export function seatedGarmentAssets(appearance:HostProfile['appearance']){
  if(appearance.artworkVersion!=='forest-body-1')return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Seated garment actor missing.');
  const asset=garments[actor];return [{file:asset.file,sha256:asset.sha256,path:'assets/rigs/'+asset.sha256+'.png'}];
}
export function seatedGarmentSvg(profile:HostProfile,mode:'embedded'|'scene'){
  const asset=garments[profile.appearance.characterVariant!],imageId='forest-seated-garment-source';
  const clips=(['left','right'] as const).map(facing=>{
    const r=asset[facing].region;
    return '<clipPath id="forest-seated-garment-'+facing+'" clipPathUnits="userSpaceOnUse"><rect x="'+r.x+'" y="'+r.y+'" width="'+r.width+'" height="'+r.height+'"/></clipPath>';
  }).join('');
  const defs='<defs><image id="'+imageId+'" width="'+asset.width+'" height="'+asset.height+'" href="'+referenceImageUrl(asset.file,asset.sha256,mode)+'"/>'+clips+'</defs>';
  const artwork=(['left','right'] as const).map(facing=>{
    const anchor=asset[facing].anchor;
    return '<g id="garment-seated-'+facing+'"><g id="garment-fold-'+facing+'" opacity="0"><g stroke="none" fill="none" transform="scale('+asset.scale+')"><g transform="translate('+(-anchor.x)+' '+(-anchor.y)+')" clip-path="url(#forest-seated-garment-'+facing+')"><use href="#'+imageId+'"/></g></g></g></g>';
  }).join('');
  return {defs,artwork};
}
export function seatedGarmentDescription(){return {version:'forest-seated-garment-1',assets:garments,status:'candidate-authored-folds',productionReady:false,
  method:'independently authored seated left/right lower garments; waist attachment with bend-dependent opacity; no bitmap rewrite or fabric simulation',
  prompts:'library/topics/prehistoric-life/rig-v1/seated-garment-prompts.json'};}