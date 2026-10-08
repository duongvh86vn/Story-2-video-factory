import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {HostProfile} from '../host/schemas.js';
import type {FrameState} from './compiler.js';
import type {HeadView} from './schemas.js';
import {hash} from '../core/utils.js';
import {cutoutHeadSvg,cutoutHeadFaceState,cutoutHeadDescription,usesCutoutHead} from './forest-cutout-head.js';
import {usesBodyView,registeredBodyView,bodyViewAsset} from './body-view-art.js';
import {usesSourceColour,sourceColourAssets} from './source-colour-art.js';
import {bodyViewRestMouthAssets} from './body-view-rest-mouth.js';
import {hasNativeHeadBank,registeredNativeHeadBank} from './body-head-bank.js';
import {nativeHeadResources,readNativeHeadSource,readNativeHeadPrimary,type NativeHeadResource} from './native-head-resources.js';
import {nativeHeadSources} from './native-head-bank.js';
import {projectedHeadSvg,projectedSkinPolygon,headProjectionCalibration,headProjectionGlyphLimits,HEAD_PROJECTION_UV_OVERLAP,HEAD_PROJECTION_VERSION} from './forest-head-projection.js';

export const FOREST_HEAD_VERSION='forest-head-1' as const;
// Bump these when render/evaluation logic changes after a pack is released.
export const FOREST_FACE_COMPILER_VERSION='forest-face-motion-10';
export const FOREST_HEAD_RENDER_VERSION='forest-head-svg-19';
export const FOREST_HEAD_VIEWS=['three-quarter-left','front','three-quarter-right'] as const;
export type ReferenceHeadView=typeof FOREST_HEAD_VIEWS[number];
type View=ReferenceHeadView;
type Actor='lila'|'karo';
type Point={x:number;y:number};
type Region={anchor:Point;clip:string};
type HeadTexture={file:string;sha256:string;width:number;height:number;anchor:Point;scale:number;
  eyes:[Point,Point];brows:[Point,Point];mouth:Point;mouthSkin?:string;featureScale:number};
const rect=(x:number,y:number,w:number,h:number)=>'M'+x+' '+y+'h'+w+'v'+h+'h-'+w+'Z';
const eyeStretch={x:1.25,y:1.4};
const inkMatrix='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 -3 -3 0 2.4';
// The source's "Angry" panel still has a grin. Keep the existing painted
// beard/skin aperture and replace only the mouth contour, without a beard patch.
const tenseMouth={karo:'M-18 3Q-2 -8 17 1L12 10Q-1 2 -13 12Q-17 9 -18 3Z',
  lowerLip:'M-12 12Q-1 5 11 10',lila:'M-10 1Q0 -6 10 1L8 7Q0 3 -8 7Z'};
/** Feature masks refer to the supplied primary close-ups, in original pixel
 * coordinates. Bitmap files are never cropped, painted over or resampled. */
const sources:Record<Actor,{file:string;sha256:string;width:number;height:number;eyes:[Region,Region];brows:[Region,Region];mouth:Region}>={
  lila:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',width:430,height:766,
    eyes:[{anchor:{x:285,y:158},clip:rect(274,142,23,33)},{anchor:{x:347,y:150},clip:rect(336,134,23,32)}],
    brows:[{anchor:{x:276,y:132},clip:'M260 140L271 124L291 119L292 128L270 142Z'},
      {anchor:{x:349,y:120},clip:'M334 122L337 116L343 112H350L358 117L365 124L364 130L356 128L351 122L341 124Z'}],
    mouth:{anchor:{x:305,y:201},clip:'M266 189L279 184L286 195Q311 211 339 191L344 208L316 221L279 215Z'}},
  karo:{file:'docs/topics/assets/reference-karo-full.png',sha256:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2',width:377,height:716,
    eyes:[{anchor:{x:216,y:141},clip:rect(205,124,23,34)},{anchor:{x:282,y:137},clip:rect(270,120,23,34)}],
    brows:[{anchor:{x:206,y:113},clip:'M189 125L195 116L208 107L218 103L225 105L227 112L213 120L202 126L195 130H189Z'},
      {anchor:{x:281,y:105},clip:'M267 110L271 104L278 99H286L293 103L301 112V119L290 118L283 110L274 112Z'}],
    mouth:{anchor:{x:245,y:201},clip:'M202 184Q244 173 291 183L287 211Q262 231 229 220L211 210Z'}},
};
/** Uniformly scaled head textures, with individually measured face anchors.
 * Glyphs have fixed parent anchors, so blink/rotation cannot move the face. */
const textures:Record<Actor,Record<View,HeadTexture>>={
  lila:{
    front:{file:'lila-head-front.png',sha256:'fef6dafeb68cdccecdb59970a42f007bed10193953b12a3789e4dfe8d1767ba1',width:1145,height:1374,
      anchor:{x:665,y:585},scale:.15,eyes:[{x:549,y:551},{x:751,y:551}],brows:[{x:543,y:486},{x:756,y:486}],mouth:{x:654,y:700},
      mouthSkin:'M444 560H864V692L834 738L804 759L774 772L744 783L714 791L684 797L654 799L624 797L594 791L564 783L534 772L504 757L474 735L444 638Z',featureScale:.45},
    'three-quarter-right':{file:'lila-head-three-quarter-right.png',sha256:'176614c1b7371809f264543aa72a6907e599b123b2691d54c571ca7e2140dfaf',width:1145,height:1374,
      anchor:{x:754,y:540},scale:.15,eyes:[{x:651,y:478},{x:887,y:466}],brows:[{x:647,y:414},{x:885,y:403}],mouth:{x:774,y:646},
      mouthSkin:'M564 570H924V624L894 659L864 683L834 702L804 716L774 726L744 733L714 738L684 740L654 739L624 735L594 728L564 717Z',featureScale:.46},
    'three-quarter-left':{file:'lila-head-three-quarter-left.png',sha256:'4646eec09d22a3d28480e9734ce33f070629a772ce272c8dc1c4d488c17a8e21',width:1145,height:1374,
      anchor:{x:423,y:520},scale:.15,eyes:[{x:314,y:462},{x:488,y:465}],brows:[{x:314,y:401},{x:487,y:405}],mouth:{x:409,y:626},
      mouthSkin:'M259 535H619V659L589 678L559 695L529 704L499 709L469 714L439 718L409 720L379 715L349 702L319 683L289 655L259 609Z',featureScale:.43},
  },
  karo:{
    front:{file:'karo-head-front.png',sha256:'38ebacdbf4e05c846c72de300caec6b332d00b5c12db9cfcc6ffc24c83f993bf',width:1312,height:1199,
      anchor:{x:665,y:598},scale:.135,eyes:[{x:530,y:554},{x:799,y:554}],brows:[{x:526,y:467},{x:805,y:467}],mouth:{x:675,y:835},featureScale:.45},
    'three-quarter-right':{file:'karo-head-three-quarter-right.png',sha256:'0957657e8518026009a9acade4679728a46e68cfa12a6c9390235826da155929',width:1312,height:1199,
      anchor:{x:755,y:590},scale:.135,eyes:[{x:614,y:557},{x:901,y:536}],brows:[{x:598,y:462},{x:900,y:446}],mouth:{x:777,y:826},featureScale:.45},
    'three-quarter-left':{file:'karo-head-three-quarter-left.png',sha256:'ed17eff1446ff3f537073356ca3855c54bc6655fbd89a37be9f573069c722d3f',width:1312,height:1199,
      anchor:{x:581,y:577},scale:.135,eyes:[{x:423,y:540},{x:656,y:530}],brows:[{x:423,y:458},{x:659,y:448}],mouth:{x:492,y:815},featureScale:.41},
  },
};
const tails:Record<View,{pivot:Point;clip:string}>={
  front:{pivot:{x:335,y:759},clip:'M250 745Q330 752 422 822L544 925L595 1060L495 1374H0V864L177 803Z'},
  'three-quarter-right':{pivot:{x:335,y:726},clip:'M252 723Q338 735 432 779L546 846L604 1010L634 1374H0V860L190 749Z'},
  'three-quarter-left':{pivot:{x:827,y:741},clip:'M704 747Q778 750 880 714L1001 778L1145 893V1374H602L588 1000L646 846Z'},
};
// Measured front jaw containment; the same projection moves this mask and lips.
const frontSkin=[{x:444,y:560},{x:864,y:560},{x:864,y:692},{x:834,y:738},{x:804,y:759},{x:774,y:772},{x:744,y:783},{x:714,y:791},{x:684,y:797},{x:654,y:799},{x:624,y:797},{x:594,y:791},{x:564,y:783},{x:534,y:772},{x:504,y:757},{x:474,y:735},{x:444,y:638}];
export function usesReferenceHead(profile:HostProfile):boolean {
  return profile.appearance.artworkVersion===FOREST_HEAD_VERSION||profile.appearance.artworkVersion==='forest-body-1'||usesBodyView(profile);
}
export function validateReferenceHead(profile:HostProfile,views:Array<HeadView|undefined>):void {
  if(!usesReferenceHead(profile))return;
  if(profile.kind!=='stick-man'||!profile.appearance.characterVariant)throw new Error('Reference head requires a Lila/Karo stick actor.');
  if(usesBodyView(profile)){
    const c=registeredBodyView(profile);
    if(views.some(view=>view!==undefined&&view!==c.view))throw new Error('needs-head-view: authored candidate needs its matching fixed body/head view; no front fallback');
    return;
  }
  if(usesCutoutHead(profile)&&views.some(view=>view&&view!=='front'))throw new Error('needs-head-view: registered source head has one source orientation; authored partner-facing/profile/rear views are pending. The rejected mesh yaw is not a fallback.');
  for(const view of views)if(view&&!FOREST_HEAD_VIEWS.includes(view as View))
    throw new Error('needs-head-view: forest-head-1 has authored front and three-quarter-left/right textures; profile/rear views are pending. No mirrored fallback.');
}
/** A front artwork bridges opposing views. Three drawings still make a stepped
 * turn, not a continuous mesh rotation or a crossfade of two opaque faces. */
export function referenceHeadViewForYaw(yaw:number):View {
  return Math.abs(yaw)<=.22?'front':yaw<0?'three-quarter-left':'three-quarter-right';
}
let root:string|undefined;
function assetRoot():string {
  if(root)return root;
  let candidate=path.dirname(fileURLToPath(import.meta.url));
  for(let i=0;i<7;i++,candidate=path.dirname(candidate))if(existsSync(path.join(candidate,'config/models.yaml'))){root=candidate;return candidate;}
  throw new Error('Cannot locate the versioned Forest Tribe asset library.');
}
const cache=new Map<string,string>();
export function referenceImageUrl(file:string,sha256:string,mode:'embedded'|'scene'='embedded'):string {
  if(mode==='scene')return 'assets/rigs/'+sha256+'.png';
  const key=file+':'+sha256,prior=cache.get(key);if(prior)return prior;
  const bytes=readFileSync(path.join(assetRoot(),file));
  if(hash(bytes)!==sha256)throw new Error('Artwork changed: remeasure/version '+file+' before rendering.');
  const value='data:image/png;base64,'+bytes.toString('base64');cache.set(key,value);return value;
}
const fmt=(n:number)=>String(Number(n.toFixed(5)));
const clipId=(region:Region)=>'glyph-'+hash(region).slice(0,12);
export function forestHeadSvg(profile:HostProfile,mode:'embedded'|'scene'='embedded'):string {
  validateReferenceHead(profile,[]);
  if(usesCutoutHead(profile)){
    const bank=hasNativeHeadBank(profile)?registeredNativeHeadBank(profile):undefined;
    const sources=bank?new Map(nativeHeadSources(bank).map(source=>[source.file,{sha256:source.sha256,bytes:readNativeHeadSource(assetRoot(),source,bank.primary)}])):undefined;
    return cutoutHeadSvg(profile,(file,sha)=>{
      if(sources){const source=sources.get(file);if(!source||source.sha256!==sha)throw new Error('Native head renderer requests a source outside its registered bank');
        return mode==='scene'?'assets/rigs/'+sha+'.png':'data:image/png;base64,'+source.bytes.toString('base64');}
      return referenceImageUrl(file,sha,mode);
    });
  }
  const actor=profile.appearance.characterVariant!,source=sources[actor],imageId='forest-source-face';
  const glyph=(region:Region,maskInk=true)=>'<g transform="translate('+(-region.anchor.x)+' '+(-region.anchor.y)+')" clip-path="url(#'+clipId(region)+')"><use href="#'+imageId+'"'+(maskInk?' filter="url(#forest-ink-only)"':'')+'/></g>';
  const regions=[...source.eyes,...source.brows,source.mouth];
  const clips=regions.map(region=>'<clipPath id="'+clipId(region)+'" clipPathUnits="userSpaceOnUse"><path d="'+region.clip+'"/></clipPath>').join('');
  const mouthSkinDefs=FOREST_HEAD_VIEWS.map(view=>{
    const texture=textures[actor][view],projected=profile.appearance.artworkVersion==='forest-body-1'&&view==='front';
    return texture.mouthSkin?'<clipPath id="forest-mouth-skin-'+view+'" clipPathUnits="userSpaceOnUse"><path '+(projected?'id="head-projection-skin" d="'+projectedSkinPolygon(actor,texture,frontSkin,0)+'"':'d="'+texture.mouthSkin+'" transform="translate('+fmt(-texture.anchor.x*texture.scale)+' '+fmt(-texture.anchor.y*texture.scale)+') scale('+texture.scale+')"')+'/></clipPath>':'';
  }).join('');
  const tailDefs=actor==='lila'&&profile.appearance.artworkVersion==='forest-body-1'?FOREST_HEAD_VIEWS.map(view=>{
    const texture=textures[actor][view],tail=tails[view];
    return '<clipPath id="forest-tail-'+view+'" clipPathUnits="userSpaceOnUse"><path d="'+tail.clip+'"/></clipPath>'
      +'<mask id="forest-static-hair-'+view+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+texture.width+'" height="'+texture.height+'"><rect width="'+texture.width+'" height="'+texture.height+'" fill="#fff"/><path d="'+tail.clip+'" fill="#000"/></mask>';
  }).join(''):'';
  const defs='<defs><image id="'+imageId+'" width="'+source.width+'" height="'+source.height+'" href="'+referenceImageUrl(source.file,source.sha256,mode)+'"/>'
    +'<linearGradient id="forest-mouth-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#130904"/><stop offset="1" stop-color="#402014"/></linearGradient>'
    +'<linearGradient id="forest-lip-warmth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC17F"/><stop offset=".6" stop-color="#E79552"/><stop offset="1" stop-color="#BB662F"/></linearGradient>'
    +'<filter id="forest-ink-only" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="'+inkMatrix+'"/></filter>'+clips+mouthSkinDefs+tailDefs+'</defs>';
  const viewSvg=FOREST_HEAD_VIEWS.map(view=>{
    const texture=textures[actor][view],projected=profile.appearance.artworkVersion==='forest-body-1'&&view==='front',at=(p:Point)=>fmt((p.x-texture.anchor.x)*texture.scale)+' '+fmt((p.y-texture.anchor.y)*texture.scale);
    const anchor=(p:Point,id:string,content:string)=>'<g '+(projected?'id="head-anchor-'+id+'" ':'')+'transform="translate('+at(p)+')"><g id="'+id+'-'+view+'">'+content+'</g></g>';
    const features=(['left','right'] as const).map((side,i)=>anchor(texture.eyes[i]!,'eye-'+side,'<g transform="scale('+fmt(texture.featureScale*eyeStretch.x)+' '+fmt(texture.featureScale*eyeStretch.y)+')">'+glyph(source.eyes[i]!)+'</g>')
      +anchor(texture.brows[i]!,'brow-'+side,'<g transform="scale('+texture.featureScale+')">'+glyph(source.brows[i]!)+'</g>')).join('');
    const sourceSmile='<g transform="scale('+texture.featureScale+')">'+glyph(source.mouth,actor==='lila')+'</g>';
    const tense=actor==='karo'?'<path d="'+tenseMouth.karo+'" fill="url(#forest-mouth-depth)" stroke="#120803" stroke-width="1.6" stroke-linejoin="round"/><path d="'+tenseMouth.lowerLip+'" fill="none" stroke="#BF733D" stroke-width="1.6" stroke-linecap="round"/>':
      '<path d="'+tenseMouth.lila+'" fill="url(#forest-mouth-depth)" stroke="#090503" stroke-width="1.5" stroke-linejoin="round"/>';
    // Karo's painted lip window is wide. A tiny centered O would leave two
    // bright lobes and read as an eye in his beard instead of an open mouth.
    const rounded=actor==='karo'?'<ellipse rx="17" ry="8" fill="url(#forest-lip-warmth)" stroke="#090503" stroke-width="1.3"/><ellipse rx="14.5" ry="5.9" fill="#170906"/>':
      '<ellipse rx="5.5" ry="7" fill="url(#forest-mouth-depth)" stroke="#090503" stroke-width="1.3"/>';
    const mouth=anchor(texture.mouth,'mouth-rest',actor==='lila'?sourceSmile:'<path d="M-11 -1Q0 3 11 -1" fill="none" stroke="#090503" stroke-width="1.7" stroke-linecap="round"/>')
      +anchor(texture.mouth,'mouth-smile',sourceSmile)
      +anchor(texture.mouth,'mouth-talk',actor==='karo'?sourceSmile:'<path d="M-10 -3Q0 -5 10 -3Q11 7 0 8Q-11 7 -10 -3Z" fill="#211009" stroke="#090503" stroke-width="1.2"/><path d="M-5 5Q0 3 5 5L4 7H-4Z" fill="#BC542B" stroke="none"/>')
      +anchor(texture.mouth,'mouth-talk-tense',tense)
      +anchor(texture.mouth,'mouth-talk-round',rounded)
      +anchor(texture.mouth,'mouth-round',rounded)
      +anchor(texture.mouth,'mouth-frown',actor==='karo'?tense:'<path d="M-11 3Q0 -6 11 3" fill="none" stroke="#090503" stroke-width="1.8" stroke-linecap="round"/>');
    const neckAlign=profile.appearance.artworkVersion==='forest-body-1'&&view!=='front'?(view==='three-quarter-right'?1:-1)*(actor==='lila'?14:10):0;
    const image='<image width="'+texture.width+'" height="'+texture.height+'" href="'+referenceImageUrl('library/topics/prehistoric-life/rig-v1/'+texture.file,texture.sha256,mode)+'"';
    let hair='<g transform="translate('+fmt(-texture.anchor.x*texture.scale)+' '+fmt(-texture.anchor.y*texture.scale)+') scale('+texture.scale+')">'+image+'/></g>';
    if(actor==='lila'&&profile.appearance.artworkVersion==='forest-body-1'){
      const tail=tails[view];
      hair='<g transform="translate('+at(tail.pivot)+')"><g id="hair-tail-'+view+'"><g transform="scale('+texture.scale+') translate('+(-tail.pivot.x)+' '+(-tail.pivot.y)+')" clip-path="url(#forest-tail-'+view+')">'+image+'/></g></g></g>'
        +'<g transform="translate('+fmt(-texture.anchor.x*texture.scale)+' '+fmt(-texture.anchor.y*texture.scale)+') scale('+texture.scale+')">'+image+' mask="url(#forest-static-hair-'+view+')"/></g>';
    }
    if(projected)hair=projectedHeadSvg(actor,texture,referenceImageUrl('library/topics/prehistoric-life/rig-v1/'+texture.file,texture.sha256,mode),actor==='lila'?tails.front.pivot:undefined);
    const containedMouth=texture.mouthSkin?'<g clip-path="url(#forest-mouth-skin-'+view+')">'+mouth+'</g>':mouth;
    return '<g id="head-view-'+view+'" opacity="'+(profile.appearance.artworkVersion==='forest-body-1'?(view==='front'?1:0):(view==='three-quarter-right'?1:0))+'" data-authored-view="'+view+'"><g transform="translate('+neckAlign+' 0)">'+hair+features+containedMouth+'</g></g>';
  }).join('');
  return '<g data-head-artwork="'+FOREST_HEAD_VERSION+'" stroke="none" fill="none">'+defs+viewSvg+'</g>';
}
export interface ReferenceFaceInput {view:View;gaze:Point;blink:number;browY:number;browAngle:number;eyeOpen:number;smile:number;round:number;frown:number;speechLevel:number|null;sourceBody?:boolean;}
/** Shared pure evaluator: no accumulated frames, whole-head mirroring or claim
 * of phoneme synchronization. Unsupported views fail before rendering. */
export function referenceFaceState(input:ReferenceFaceInput):FrameState['face'] {
  if(input.sourceBody)return cutoutHeadFaceState(input);
  const face:FrameState['face']={};
  for(const view of FOREST_HEAD_VIEWS){
    face['head-view-'+view]={opacity:input.view===view?1:0};
    for(const [i,side] of (['left','right'] as const).entries()){
      face['eye-'+side+'-'+view]={x:input.gaze.x,y:input.gaze.y,scaleY:Math.max(.035,(1-input.blink)*input.eyeOpen)};
      face['brow-'+side+'-'+view]={y:input.browY,rotation:(i?-1:1)*input.browAngle*2.2};
    }
    const speaking=input.speechLevel!==null,round=!speaking?Math.min(1,input.round*1.25):0,frown=!speaking?Math.min(1,input.frown*1.6):0;
    const smile=!speaking?input.smile*(1-round)*(1-frown):0;
    face['mouth-rest-'+view]={opacity:!speaking?(1-round)*(1-frown)*(1-input.smile):0};
    face['mouth-smile-'+view]={opacity:smile};
    const tenseSpeaking=speaking&&input.frown>=.35;
    const roundedSpeaking=speaking&&!tenseSpeaking&&input.round>=.5;
    face['mouth-talk-'+view]={opacity:speaking&&!tenseSpeaking&&!roundedSpeaking?1:0,scaleY:speaking ? .55+input.speechLevel!*.65 : 1};
    face['mouth-talk-tense-'+view]={opacity:tenseSpeaking?1:0,scaleY:tenseSpeaking ? .7+input.speechLevel!*.8 : 1};
    face['mouth-talk-round-'+view]={opacity:roundedSpeaking?1:0,scaleY:roundedSpeaking ? .6+input.speechLevel!*.55 : 1};
    face['mouth-round-'+view]={opacity:round*(1-frown)};
    face['mouth-frown-'+view]={opacity:frown};
  }
  return face;
}
/** Fixed pack resources only. Stage original bytes and retain their hashes. */
export function referenceHeadAssets(appearance:HostProfile['appearance']):NativeHeadResource[] {
  if(usesSourceColour(appearance))return sourceColourAssets(appearance);
  if(usesBodyView({appearance}))return [bodyViewAsset(appearance),...(hasNativeHeadBank({appearance})?nativeHeadResources(registeredNativeHeadBank({appearance})):bodyViewRestMouthAssets(appearance))];
  if(appearance.artworkVersion!==FOREST_HEAD_VERSION&&appearance.artworkVersion!=='forest-body-1')return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Reference head actor variant missing.');
  if(appearance.artworkVersion==='forest-body-1'){
    const c=cutoutHeadDescription().calibration[actor];
    return [{file:c.file,sha256:c.sha256,path:'assets/rigs/'+c.sha256+'.png'}];
  }
  const source=sources[actor];
  return [{file:source.file,sha256:source.sha256},...FOREST_HEAD_VIEWS.map(view=>({file:'library/topics/prehistoric-life/rig-v1/'+textures[actor][view].file,sha256:textures[actor][view].sha256}))]
    .map(asset=>({...asset,path:'assets/rigs/'+asset.sha256+'.png'}));
}
export function readReferenceHeadAsset(asset:{file:string;sha256:string;nativeHeadSource?:NativeHeadResource['nativeHeadSource'];nativeHeadPrimary?:true}):Buffer {
  if(asset.nativeHeadSource)return readNativeHeadSource(assetRoot(),{file:asset.file,sha256:asset.sha256,...asset.nativeHeadSource},asset.nativeHeadSource.primary);
  if(asset.nativeHeadPrimary)return readNativeHeadPrimary(assetRoot(),asset);
  if(asset.file.includes('/head-turn-studies/')||asset.file.includes('/head-cells/'))throw new Error('Native head source requires registered resource metadata');
  const bytes=readFileSync(path.join(assetRoot(),asset.file));
  if(hash(bytes)!==asset.sha256)throw new Error('Versioned head asset changed: '+asset.file);
  return bytes;
}
export function referenceHeadDescription(){
  return {version:FOREST_HEAD_VERSION,views:FOREST_HEAD_VIEWS,assets:textures,features:sources,
    faceCompilerVersion:FOREST_FACE_COMPILER_VERSION,rendererVersion:FOREST_HEAD_RENDER_VERSION,
    facialCalibration:{eyeStretch,inkMatrix,browResponse:2.2,tenseMouth,speechShapes:'relaxed, tense for frown, rounded for surprise/fear; audio activity only'},secondaryHair:{tails,scope:'Lila ponytail mask; neck/fringe/back hair remain one painted layer'},
    projection:{version:HEAD_PROJECTION_VERSION,activeForBody:false,calibration:headProjectionCalibration,glyphLimits:headProjectionGlyphLimits,uvOverlapPixels:HEAD_PROJECTION_UV_OVERLAP,scope:'Historical rejected inferred-yaw candidate; not active in source-body calibration. Its utility and review evidence remain for comparison.',notReconstructed3D:true,maxYawDeg:headProjectionCalibration.maxYawDeg},
    bodyHead:cutoutHeadDescription(),
    fingerprint:hash({version:FOREST_HEAD_VERSION,faceCompiler:FOREST_FACE_COMPILER_VERSION,renderer:FOREST_HEAD_RENDER_VERSION,textures,sources,eyeStretch,inkMatrix,tenseMouth,tails,frontSkin,cutout:cutoutHeadDescription(),projection:headProjectionCalibration,projectionVersion:HEAD_PROJECTION_VERSION,glyphLimits:headProjectionGlyphLimits,uvOverlapPixels:HEAD_PROJECTION_UV_OVERLAP}),
    status:'candidate-head-layer-integration',productionReady:false,turnRendering:'registered-cutout-source-orientation-for-body; stepped-authored-views-for-head-only',
    pending:['authored partner-facing body/head views, profile/back textures','registered source cutout fidelity and accepted expression layers','full-body views and seated rig acceptance','separate fringe/beard/clothing secondary motion','authored continuous turns','runtime motion acceptance']};
}
