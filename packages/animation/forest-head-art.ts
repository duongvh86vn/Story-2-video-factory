import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {HostProfile} from '../host/schemas.js';
import type {FrameState} from './compiler.js';
import type {HeadView} from './schemas.js';
import {hash} from '../core/utils.js';

export const FOREST_HEAD_VERSION='forest-head-1' as const;
// Bump these when render/evaluation logic changes after a pack is released.
export const FOREST_FACE_COMPILER_VERSION='forest-face-motion-3';
export const FOREST_HEAD_RENDER_VERSION='forest-head-svg-4';
export const FOREST_HEAD_VIEWS=['three-quarter-left','three-quarter-right'] as const;
type View=typeof FOREST_HEAD_VIEWS[number];
type Actor='lila'|'karo';
type Point={x:number;y:number};
type Region={anchor:Point;clip:string};
type HeadTexture={file:string;sha256:string;width:number;height:number;anchor:Point;scale:number;
  eyes:[Point,Point];brows:[Point,Point];mouth:Point;featureScale:number};
const rect=(x:number,y:number,w:number,h:number)=>'M'+x+' '+y+'h'+w+'v'+h+'h-'+w+'Z';
const eyeStretch={x:1.25,y:1.4};
const inkMatrix='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 -3 -3 0 2.4';
const angryMouth={file:'docs/topics/assets/reference-expressions.png',sha256:'fbc6c963252786216689c48a3c7fb09dd258eb6ae0d43b9d777d57587fb69094',width:1026,height:688,
  region:{anchor:{x:657,y:537},clip:'M617 522Q655 516 697 522L696 543Q678 559 648 557L625 547Z'}};
/** Feature masks refer to the supplied primary close-ups, in original pixel
 * coordinates. Bitmap files are never cropped, painted over or resampled. */
const sources:Record<Actor,{file:string;sha256:string;width:number;height:number;eyes:[Region,Region];brows:[Region,Region];mouth:Region}>={
  lila:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce',width:430,height:766,
    eyes:[{anchor:{x:285,y:158},clip:rect(274,142,23,33)},{anchor:{x:347,y:150},clip:rect(336,134,23,32)}],
    brows:[{anchor:{x:276,y:132},clip:'M260 140L271 124L291 119L292 128L270 142Z'},
      {anchor:{x:349,y:120},clip:rect(333,107,34,23)}],
    mouth:{anchor:{x:305,y:201},clip:'M266 189L279 184L286 195Q311 211 339 191L344 208L316 221L279 215Z'}},
  karo:{file:'docs/topics/assets/reference-karo-full.png',sha256:'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2',width:377,height:716,
    eyes:[{anchor:{x:216,y:141},clip:rect(205,124,23,34)},{anchor:{x:282,y:137},clip:rect(270,120,23,34)}],
    brows:[{anchor:{x:206,y:113},clip:'M187 123L188 111L204 103L228 102L227 112L210 118L195 129Z'},
      {anchor:{x:281,y:105},clip:rect(263,91,39,28)}],
    mouth:{anchor:{x:245,y:201},clip:'M202 184Q244 173 291 183L287 211Q262 231 229 220L211 210Z'}},
};
/** Uniformly scaled head textures, with individually measured face anchors.
 * Glyphs have fixed parent anchors, so blink/rotation cannot move the face. */
const textures:Record<Actor,Record<View,HeadTexture>>={
  lila:{
    'three-quarter-right':{file:'lila-head-three-quarter-right.png',sha256:'176614c1b7371809f264543aa72a6907e599b123b2691d54c571ca7e2140dfaf',width:1145,height:1374,
      anchor:{x:754,y:540},scale:.15,eyes:[{x:651,y:478},{x:887,y:466}],brows:[{x:647,y:414},{x:885,y:403}],mouth:{x:774,y:666},featureScale:.46},
    'three-quarter-left':{file:'lila-head-three-quarter-left.png',sha256:'4646eec09d22a3d28480e9734ce33f070629a772ce272c8dc1c4d488c17a8e21',width:1145,height:1374,
      anchor:{x:423,y:520},scale:.15,eyes:[{x:314,y:462},{x:488,y:465}],brows:[{x:314,y:401},{x:487,y:405}],mouth:{x:409,y:646},featureScale:.43},
  },
  karo:{
    'three-quarter-right':{file:'karo-head-three-quarter-right.png',sha256:'0957657e8518026009a9acade4679728a46e68cfa12a6c9390235826da155929',width:1312,height:1199,
      anchor:{x:755,y:590},scale:.135,eyes:[{x:614,y:557},{x:901,y:536}],brows:[{x:598,y:462},{x:900,y:446}],mouth:{x:777,y:826},featureScale:.45},
    'three-quarter-left':{file:'karo-head-three-quarter-left.png',sha256:'ed17eff1446ff3f537073356ca3855c54bc6655fbd89a37be9f573069c722d3f',width:1312,height:1199,
      anchor:{x:581,y:577},scale:.135,eyes:[{x:423,y:540},{x:656,y:530}],brows:[{x:423,y:458},{x:659,y:448}],mouth:{x:492,y:815},featureScale:.41},
  },
};
const tails:Record<View,{pivot:Point;clip:string}>={
  'three-quarter-right':{pivot:{x:335,y:726},clip:'M252 723Q338 735 432 779L546 846L604 1010L634 1374H0V860L190 749Z'},
  'three-quarter-left':{pivot:{x:827,y:741},clip:'M704 747Q778 750 880 714L1001 778L1145 893V1374H602L588 1000L646 846Z'},
};
export function usesReferenceHead(profile:HostProfile):boolean {
  return profile.appearance.artworkVersion===FOREST_HEAD_VERSION||profile.appearance.artworkVersion==='forest-body-1';
}
export function validateReferenceHead(profile:HostProfile,views:Array<HeadView|undefined>):void {
  if(!usesReferenceHead(profile))return;
  if(profile.kind!=='stick-man'||!profile.appearance.characterVariant)throw new Error('Reference head requires a Lila/Karo stick actor.');
  for(const view of views)if(view&&!FOREST_HEAD_VIEWS.includes(view as View))
    throw new Error('needs-head-view: forest-head-1 has only authored three-quarter-left/right textures; other views are pending. No mirrored/front-circle fallback.');
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
  const actor=profile.appearance.characterVariant!,source=sources[actor],imageId='forest-source-face';
  const glyph=(region:Region,maskInk=true)=>'<g transform="translate('+(-region.anchor.x)+' '+(-region.anchor.y)+')" clip-path="url(#'+clipId(region)+')"><use href="#'+imageId+'"'+(maskInk?' filter="url(#forest-ink-only)"':'')+'/></g>';
  const regions=[...source.eyes,...source.brows,source.mouth,...(actor==='karo'?[angryMouth.region]:[])];
  const clips=regions.map(region=>'<clipPath id="'+clipId(region)+'" clipPathUnits="userSpaceOnUse"><path d="'+region.clip+'"/></clipPath>').join('');
  const tailDefs=actor==='lila'&&profile.appearance.artworkVersion==='forest-body-1'?FOREST_HEAD_VIEWS.map(view=>{
    const texture=textures[actor][view],tail=tails[view];
    return '<clipPath id="forest-tail-'+view+'" clipPathUnits="userSpaceOnUse"><path d="'+tail.clip+'"/></clipPath>'
      +'<mask id="forest-static-hair-'+view+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+texture.width+'" height="'+texture.height+'"><rect width="'+texture.width+'" height="'+texture.height+'" fill="#fff"/><path d="'+tail.clip+'" fill="#000"/></mask>';
  }).join(''):'';
  const defs='<defs><image id="'+imageId+'" width="'+source.width+'" height="'+source.height+'" href="'+referenceImageUrl(source.file,source.sha256,mode)+'"/>'
    +(actor==='karo'?'<image id="forest-angry-mouth-source" width="'+angryMouth.width+'" height="'+angryMouth.height+'" href="'+referenceImageUrl(angryMouth.file,angryMouth.sha256,mode)+'"/>':'')
    +'<filter id="forest-ink-only" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="'+inkMatrix+'"/></filter>'+clips+tailDefs+'</defs>';
  const viewSvg=FOREST_HEAD_VIEWS.map(view=>{
    const texture=textures[actor][view],at=(p:Point)=>fmt((p.x-texture.anchor.x)*texture.scale)+' '+fmt((p.y-texture.anchor.y)*texture.scale);
    const anchor=(p:Point,id:string,content:string)=>'<g transform="translate('+at(p)+')"><g id="'+id+'-'+view+'">'+content+'</g></g>';
    const features=(['left','right'] as const).map((side,i)=>anchor(texture.eyes[i]!,'eye-'+side,'<g transform="scale('+fmt(texture.featureScale*eyeStretch.x)+' '+fmt(texture.featureScale*eyeStretch.y)+')">'+glyph(source.eyes[i]!)+'</g>')
      +anchor(texture.brows[i]!,'brow-'+side,'<g transform="scale('+texture.featureScale+')">'+glyph(source.brows[i]!)+'</g>')).join('');
    const sourceSmile='<g transform="scale('+texture.featureScale+')">'+glyph(source.mouth,actor==='lila')+'</g>';
    const mouth=anchor(texture.mouth,'mouth-rest',actor==='lila'?sourceSmile:'<path d="M-11 -1Q0 3 11 -1" fill="none" stroke="#090503" stroke-width="1.7" stroke-linecap="round"/>')
      +anchor(texture.mouth,'mouth-smile',sourceSmile)
      +anchor(texture.mouth,'mouth-talk',actor==='karo'?sourceSmile:'<path d="M-11 -3Q0 -6 11 -3Q12 12 0 13Q-12 12 -11 -3Z" fill="#211009" stroke="#090503" stroke-width="1.2"/><path d="M-6 8Q0 5 6 8L5 11H-5Z" fill="#BC542B" stroke="none"/>')
      +anchor(texture.mouth,'mouth-round','<ellipse cy="1" rx="5.5" ry="8.5" fill="#211009" stroke="#090503" stroke-width="1.3"/>')
      +anchor(texture.mouth,'mouth-frown',actor==='karo'?'<g transform="scale('+fmt(texture.featureScale*1.12)+')"><g transform="translate('+(-angryMouth.region.anchor.x)+' '+(-angryMouth.region.anchor.y)+')" clip-path="url(#'+clipId(angryMouth.region)+')"><use href="#forest-angry-mouth-source"/></g></g>':'<path d="M-11 3Q0 -6 11 3" fill="none" stroke="#090503" stroke-width="1.8" stroke-linecap="round"/>');
    const neckAlign=profile.appearance.artworkVersion==='forest-body-1'?(view==='three-quarter-right'?1:-1)*(actor==='lila'?14:10):0;
    const image='<image width="'+texture.width+'" height="'+texture.height+'" href="'+referenceImageUrl('library/topics/prehistoric-life/rig-v1/'+texture.file,texture.sha256,mode)+'"';
    let hair='<g transform="translate('+fmt(-texture.anchor.x*texture.scale)+' '+fmt(-texture.anchor.y*texture.scale)+') scale('+texture.scale+')">'+image+'/></g>';
    if(actor==='lila'&&profile.appearance.artworkVersion==='forest-body-1'){
      const tail=tails[view];
      hair='<g transform="translate('+at(tail.pivot)+')"><g id="hair-tail-'+view+'"><g transform="scale('+texture.scale+') translate('+(-tail.pivot.x)+' '+(-tail.pivot.y)+')" clip-path="url(#forest-tail-'+view+')">'+image+'/></g></g></g>'
        +'<g transform="translate('+fmt(-texture.anchor.x*texture.scale)+' '+fmt(-texture.anchor.y*texture.scale)+') scale('+texture.scale+')">'+image+' mask="url(#forest-static-hair-'+view+')"/></g>';
    }
    return '<g id="head-view-'+view+'" opacity="'+(view==='three-quarter-right'?1:0)+'" data-authored-view="'+view+'"><g transform="translate('+neckAlign+' 0)">'+hair+features+mouth+'</g></g>';
  }).join('');
  return '<g data-head-artwork="'+FOREST_HEAD_VERSION+'" stroke="none" fill="none">'+defs+viewSvg+'</g>';
}
export interface ReferenceFaceInput {view:View;gaze:Point;blink:number;browY:number;browAngle:number;eyeOpen:number;smile:number;round:number;frown:number;speechLevel:number|null;}
/** Shared pure evaluator: no accumulated frames, whole-head mirroring or claim
 * of phoneme synchronization. Unsupported views fail before rendering. */
export function referenceFaceState(input:ReferenceFaceInput):FrameState['face'] {
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
    face['mouth-talk-'+view]={opacity:speaking?1:0,scaleY:speaking ? .55+input.speechLevel!*.65 : 1};
    face['mouth-round-'+view]={opacity:round*(1-frown)};
    face['mouth-frown-'+view]={opacity:frown};
  }
  return face;
}
/** Fixed pack resources only. Stage original bytes and retain their hashes. */
export function referenceHeadAssets(appearance:HostProfile['appearance']):Array<{file:string;sha256:string;path:string}> {
  if(appearance.artworkVersion!==FOREST_HEAD_VERSION&&appearance.artworkVersion!=='forest-body-1')return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Reference head actor variant missing.');
  const source=sources[actor];
  return [{file:source.file,sha256:source.sha256},...(actor==='karo'?[{file:angryMouth.file,sha256:angryMouth.sha256}]:[]),...FOREST_HEAD_VIEWS.map(view=>({file:'library/topics/prehistoric-life/rig-v1/'+textures[actor][view].file,sha256:textures[actor][view].sha256}))]
    .map(asset=>({...asset,path:'assets/rigs/'+asset.sha256+'.png'}));
}
export function readReferenceHeadAsset(asset:{file:string;sha256:string}):Buffer {
  const bytes=readFileSync(path.join(assetRoot(),asset.file));
  if(hash(bytes)!==asset.sha256)throw new Error('Versioned head asset changed: '+asset.file);
  return bytes;
}
export function referenceHeadDescription(){
  return {version:FOREST_HEAD_VERSION,views:FOREST_HEAD_VIEWS,assets:textures,features:sources,
    faceCompilerVersion:FOREST_FACE_COMPILER_VERSION,rendererVersion:FOREST_HEAD_RENDER_VERSION,
    facialCalibration:{eyeStretch,inkMatrix,browResponse:2.2,angryMouth},secondaryHair:{tails,scope:'Lila ponytail mask; neck/fringe/back hair remain one painted layer'},
    fingerprint:hash({version:FOREST_HEAD_VERSION,faceCompiler:FOREST_FACE_COMPILER_VERSION,renderer:FOREST_HEAD_RENDER_VERSION,textures,sources,eyeStretch,inkMatrix,angryMouth,tails}),
    status:'candidate-head-layer-integration',productionReady:false,turnRendering:'discrete-authored-views',
    pending:['front/profile/back textures','full-body reference rig','separate fringe/ponytail secondary motion','continuous turn inbetweens','runtime motion acceptance']};
}
