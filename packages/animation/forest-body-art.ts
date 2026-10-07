import type {HostProfile} from '../host/schemas.js';
import type {RigHand} from '../core/identifiers.js';
import {hash} from '../core/utils.js';
import {referenceImageUrl,referenceHeadDescription,type ReferenceHeadView} from './forest-head-art.js';
import {seatedGarmentAssets,seatedGarmentDescription,seatedGarmentSvg} from './forest-garment-art.js';
import {sourceWalkDescription} from './source-walk.js';
import {runningDescription} from './running.js';
import {spearDescription} from './spear.js';
type Point={x:number;y:number};
type Part={anchor:Point;clip:string};
const rect=(x:number,y:number,w:number,h:number)=>`M${x} ${y}h${w}v${h}h-${w}Z`;
export const FOREST_BODY_VERSION='forest-body-1' as const;
export const FOREST_BODY_COMPILER_VERSION='forest-source-body-motion-10';
export const FOREST_BODY_RENDER_VERSION='forest-source-body-svg-7';
const garments={
  lila:{upper:rect(100,240,250,225),left:'M100 455H235L241 540L235 620H100Z',right:'M235 455H350V620H235L241 540Z',follow:.8,maxRotation:78},
  karo:{upper:rect(100,240,230,219),left:'M100 450H215L223 482L214 570H100Z',right:'M215 450H330V570H214L223 482Z',follow:1,maxRotation:90},
} as const;
/** Source contours and per-side total limb lengths. Knees are not drawn, so
 * their split and the closed-hip seat contact are inferred candidate geometry.
 * Masks never rewrite the bitmap; supplemental seated art reconstructs folds. */
const bodies={
  lila:{file:'library/topics/prehistoric-life/lila-cutout-v1.png',sha256:'ef8b4a5f1445e0937bb41e661e8dc9de8a8a12a499e2eca87e3367807474d14e',width:430,height:766,unitScale:318/766,
    pelvis:{x:235,y:435},groundY:754,neck:{x:263,y:274},headArtworkScale:.88,
    shoulders:{left:{x:236,y:276},right:{x:294,y:294}},
    hips:{left:{x:205,y:440},right:{x:260,y:440}},
    // The source has no drawn knee. Preserve each total measured chain, but
    // infer a human thigh/shin ratio instead of the old very short shins.
    legs:{left:{upper:152,lower:139},right:{upper:147,lower:136}},ankleY:{left:719,right:719},seatContact:{x:12,y:32},
    hands:{left:{x:113,y:512},right:{x:376,y:516}},feet:{left:{x:135,y:751},right:{x:283,y:752}},
    arms:{left:{upper:145,lower:128},right:{upper:96,lower:144}},handRestRotation:{left:18.1,right:-16.4},
    hem:'M136 250H330V480L326 480L321 480L316 527L311 564L306 561L301 576L296 574L291 563L286 567L281 574L276 562L271 574L266 586L261 592L256 571L251 555L246 557L241 534L236 529L231 539L226 552L221 571L216 557L211 562L206 573L201 590L196 588L191 565L186 568L181 558L176 566L171 573L166 564L161 567L156 572L151 480L146 480L141 480L136 480Z',
    hemOutlinePad:0,
    parts:{neck:{anchor:{x:263,y:274},clip:rect(242,236,43,58)},clothing:{anchor:{x:235,y:435},clip:'M244 263L276 263L301 324L307 414L330 601H136L150 500L182 415L208 337Z'},
      'hand-left':{anchor:{x:113,y:512},clip:'M106 477H120L128 487Q148 502 140 524L126 542L104 544L89 531L85 511L94 490Z'},
      'hand-right':{anchor:{x:376,y:516},clip:'M369 482H383L391 492Q408 507 400 531L387 544L368 546L351 532L348 511L360 490Z'},
      'foot-left':{anchor:{x:135,y:751},clip:rect(74,714,91,45)},'foot-right':{anchor:{x:283,y:752},clip:rect(258,712,96,47)}},
  },
  karo:{file:'library/topics/prehistoric-life/karo-cutout-v1.png',sha256:'f190653ab448f89da80b7156ff7ee677d5788a16dca6126b7796bab3f845b665',width:377,height:716,unitScale:318/716,
    pelvis:{x:214,y:428},groundY:706,neck:{x:212,y:279},headArtworkScale:.8,
    shoulders:{left:{x:169,y:252},right:{x:269,y:286}},
    hips:{left:{x:190,y:437},right:{x:245,y:437}},
    legs:{left:{upper:132,lower:122},right:{upper:132,lower:121}},ankleY:{left:679,right:680},seatContact:{x:12,y:26},
    hands:{left:{x:77,y:493},right:{x:343,y:493}},feet:{left:{x:128,y:702},right:{x:266,y:698}},
    arms:{left:{upper:131,lower:131},right:{upper:88,lower:136}},handRestRotation:{left:14.0,right:-20.8},
    hem:'M124 250H304V463L299 463L294 463L289 463L284 527L279 530L274 516L269 521L264 521L259 532L254 525L249 530L244 541L239 519L234 519L229 503L224 489L219 475L214 478L209 488L204 501L199 517L194 522L189 519L184 532L179 545L174 535L169 528L164 537L159 523L154 526L149 519L144 525L139 535L134 463L129 463L124 463Z',
    // Color-derived hem coordinates lie inside the original black ink. Keep
    // that ink in a narrow mask band without reintroducing the old legs.
    hemOutlinePad:8,
    parts:{neck:{anchor:{x:212,y:279},clip:rect(185,250,53,51)},clothing:{anchor:{x:214,y:428},clip:'M158 250L228 273L270 277L282 420L298 447L303 566H119L120 482L130 431L135 402L139 369L145 340L151 308Z'},
      'hand-left':{anchor:{x:77,y:493},clip:'M69 464L83 464Q98 475 102 495L98 514Q83 527 58 516L55 501L59 483Z'},
      'hand-right':{anchor:{x:343,y:493},clip:'M335 465L349 465Q366 477 371 497L366 516Q347 528 322 516L319 501L324 483Z'},
      'foot-left':{anchor:{x:128,y:702},clip:rect(76,674,96,42)},'foot-right':{anchor:{x:266,y:698},clip:rect(250,672,91,42)}},
  },
} as const;
export function usesReferenceBody(profile:HostProfile):boolean {return profile.appearance.artworkVersion===FOREST_BODY_VERSION;}
export function referenceBodyMetrics(profile:Pick<HostProfile,'appearance'>){
  const actor=profile.appearance.characterVariant;if(!actor)throw new Error('Reference body variant missing.');
  const source=bodies[actor],u=source.unitScale,b=profile.appearance.bodyScale,k=u*b;
  const relative=(p:Point)=>({x:(p.x-source.pelvis.x)*k,y:(p.y-source.pelvis.y)*k});
  // The source arms are uninterrupted ink, with no measured elbow landmark.
  // Preserve each source shoulder-to-hand chain total; the previous arbitrary
  // split (Karo 88/136) made its upper arm collapse during two-handed work.
  const arms=Object.fromEntries((['left','right'] as const).map(side=>{
    const total=(source.arms[side].upper+source.arms[side].lower)*k;
    return [side,{upper:total*.52,lower:total*.48}];
  })) as Record<RigHand,{upper:number;lower:number}>;
  const legs=Object.fromEntries((['left','right'] as const).map(side=>[side,{upper:source.legs[side].upper*k,lower:source.legs[side].lower*k}])) as Record<RigHand,{upper:number;lower:number}>;
  return {height:318*b,pelvisY:(source.pelvis.y-source.groundY)*k,
    // Slight flexion reserve for ground contact. Foot anchors are at the sole,
    // with the lower ink stroke hidden underneath the source foot silhouette.
    upperLeg:Math.max(legs.left.upper,legs.right.upper),lowerLeg:Math.max(legs.left.lower,legs.right.lower),hipOffset:20*b,stance:31*b,
    shoulderY:(source.shoulders.right.y-source.groundY)*k,shoulderOffset:relative(source.shoulders.right).x,
    upperArm:Math.max(arms.left.upper,arms.right.upper),lowerArm:Math.max(arms.left.lower,arms.right.lower),
    headY:(source.neck.y-source.groundY)*k-2*b-(actor==='lila'?32:72)*profile.appearance.headScale*source.headArtworkScale,
    headRadius:40*profile.appearance.headScale,headArtworkScale:source.headArtworkScale,
    torsoTop:relative(source.neck).y,neckX:relative(source.neck).x,
    shoulders:{left:relative(source.shoulders.left),right:relative(source.shoulders.right)},arms,
    handRestRotation:{...source.handRestRotation},
    hips:{left:relative(source.hips.left),right:relative(source.hips.right)},legs,
    seatContactOffset:{x:source.seatContact.x*b,y:source.seatContact.y*b},
    armRest:{left:{x:(source.hands.left.x-source.shoulders.left.x)*k,y:(source.hands.left.y-source.shoulders.left.y)*k},
      right:{x:(source.hands.right.x-source.shoulders.right.x)*k,y:(source.hands.right.y-source.shoulders.right.y)*k}},
    footOffsets:{left:(source.feet.left.x-source.pelvis.x)*k,right:(source.feet.right.x-source.pelvis.x)*k},
    footSoleOffset:{left:(source.feet.left.y-source.ankleY.left)*u,right:(source.feet.right.y-source.ankleY.right)*u},
    strokeWidth:16*u,
  };
}
/** The attachment is under the actual authored chin/beard, off center from
 * the face anchor. A view swap is discrete; it is not a continuous head turn. */
export function referenceBodyHeadAttachment(profile:HostProfile,view:ReferenceHeadView):Point {
  const lila=profile.appearance.characterVariant==='lila';
  return {x:view==='front'?0:(view==='three-quarter-left'?1:-1)*(lila?14:10),y:lila?32:72};
}
export function referenceBodyAssets(appearance:HostProfile['appearance']){
  if(appearance.artworkVersion!==FOREST_BODY_VERSION)return [];
  const actor=appearance.characterVariant;if(!actor)throw new Error('Reference body actor variant missing.');
  const source=bodies[actor];return [{file:source.file,sha256:source.sha256,path:'assets/rigs/'+source.sha256+'.png'},...seatedGarmentAssets(appearance)];
}
export function forestBodyArt(profile:HostProfile,mode:'embedded'|'scene'){
  const actor=profile.appearance.characterVariant;if(!actor)throw new Error('Reference body actor variant missing.');
  const source=bodies[actor],imageId='forest-body-source';
  const clips=Object.entries(source.parts).map(([id,part])=>'<clipPath id="forest-body-'+id+'" clipPathUnits="userSpaceOnUse"><path d="'+part.clip+'"/></clipPath>').join('');
  // A clipPath ignores the stroke. Use a bounded luminance mask to retain the
  // painted garment outline around the measured color contour instead.
  const hemMask='<mask id="forest-body-hem" maskUnits="userSpaceOnUse" x="0" y="0" width="'+source.width+'" height="'+source.height+'"><path d="'+source.hem+'" fill="white" stroke="white" stroke-width="'+(source.hemOutlinePad*2)+'" stroke-linejoin="round"/></mask>';
  const garmentDefs=(['upper','left','right'] as const).map(layer=>'<clipPath id="forest-garment-'+layer+'" clipPathUnits="userSpaceOnUse"><path d="'+garments[actor][layer]+'"/></clipPath>').join('');
  const defs='<defs><image id="'+imageId+'" width="'+source.width+'" height="'+source.height+'" href="'+referenceImageUrl(source.file,source.sha256,mode)+'"/>'+clips+hemMask+garmentDefs+'</defs>';
  const part=(id:keyof typeof source.parts,layer?:'upper'|'left'|'right')=>{
    const region:Part=source.parts[id],anchor=layer&&layer!=='upper'?source.hips[layer]:region.anchor;
    return '<g stroke="none" fill="none" transform="scale('+source.unitScale+')"><g transform="translate('+(-anchor.x)+' '+(-anchor.y)+')" clip-path="url(#forest-body-'+id+')">'
      +(id==='clothing'?'<g mask="url(#forest-body-hem)">':'')+(layer?'<g clip-path="url(#forest-garment-'+layer+')">':'')+'<use href="#'+imageId+'"/>'+(layer?'</g>':'')+(id==='clothing'?'</g>':'')+'</g></g>';
  };
  const seated=seatedGarmentSvg(profile,mode);
  return {defs:defs+seated.defs,seatedGarments:seated.artwork,neck:part('neck'),torso:part('clothing','upper'),garments:{left:part('clothing','left'),right:part('clothing','right')},
    hands:{left:part('hand-left'),right:part('hand-right')},feet:{left:part('foot-left'),right:part('foot-right')}};
}
export function referenceGarmentMotion(profile:HostProfile){return {...garments[profile.appearance.characterVariant!],lagMs:100};}
export function referenceBodyDescription(){return {version:FOREST_BODY_VERSION,compilerVersion:FOREST_BODY_COMPILER_VERSION,
  rendererVersion:FOREST_BODY_RENDER_VERSION,
  fingerprint:hash({version:FOREST_BODY_VERSION,compiler:FOREST_BODY_COMPILER_VERSION,renderer:FOREST_BODY_RENDER_VERSION,bodies,garments,seated:seatedGarmentDescription(),head:referenceHeadDescription().fingerprint,walk:sourceWalkDescription,run:runningDescription,spear:spearDescription}),sources:bodies,garmentLayers:garments,seatedGarments:seatedGarmentDescription(),
  actionMotion:{run:runningDescription,spear:spearDescription,acceptance:'pending',hunting:'stalk/aim/chase actor calibration; authored quarry rig, sourced tool binding and contact/reaction in story shots pending'},
  anatomicalMapping:{'rig-left':'source-view anatomical right','rig-right':'source-view anatomical left'},
  status:'candidate-source-body-integration',productionReady:false,
  visibleLimbs:{method:'two joined cubics through the projected hidden IK joint; source knee depth preserves physical XYZ lengths',softness:.28,anatomicalGuarantee:false},
  secondaryMotion:{breath:'bounded continuous body lean',blink:'actor-staggered',hair:'Lila ponytail source masks with 120ms follow; no simulated hair physics',
    clothing:'all source body plans use one opaque shared cloth surface with a pinned waist and blended 100ms thigh follow below it, limited to 22 degrees; seat plans also use semantic UV correspondences through seated/rising, fading thigh follow into the seated pose; source/authored fold materials share that surface; legacy independently rotating panels are hidden to avoid opening a waist gap during ordinary walking; inverted triangles block evaluation; no fabric simulation or motion acceptance'},
  inferredAnatomy:{knees:'not visible in source; thigh/shin ratio approximately 52/48, original per-side total lengths preserved',
    elbows:'not visible in source; upper/forearm ratio 52/48, original per-side total lengths preserved; aimed spear uses 0.85 projection-plane weight to retain a readable down/back elbow',
    seat:'closed hip contact below/behind belt, not the pelvis anchor itself'},
  headAttachment:{neck:'original warm-skin neck crop, independently attached behind chin/beard and upper clothing; hidden physical neck bone'},
  footContact:{frameFeet:'sole anchors',inkEndpoint:'ankle',pelvisWalkDrop:'minimum fixed-leg reach plus small bob; not .23 of long thigh'},
  walkMotion:sourceWalkDescription,
  seatedMotion:{method:'asymmetric source chains, sole/ankle offsets, low C2 foot preparation, one knee branch; projection plane follows actual pelvis transfer onto support',minimumTransitionMs:1500,productionAcceptance:false},
  headMotion:referenceHeadDescription().projection,
  pending:['rear/side body artwork','projected head fidelity and continuous motion acceptance; body turns','remaining fringe/beard secondary motion','occluded clothing reconstruction','garment fold and seated motion acceptance','runtime anatomy and motion acceptance']};}
