import type {HostProfile} from '../host/schemas.js';
import {prehistoricSupportingModel,prehistoricSupportingModels} from '../topics/supporting-models.js';
import {hash} from '../core/utils.js';
/** Manually authored coordinates on each new PNG, not copied main-actor ROIs.
 * Unvalidated engineering candidates. No yaw, reflection or anatomy acceptance. */
const heads={
  'prehistoric-male-bald':{scale:.25,neck:{x:475,y:593},chin:{left:{x:445,y:525},right:{x:619,y:534}},
    eyes:[{x:490,y:333},{x:632,y:320}],mouth:{x:545,y:445},bounds:{left:264,right:762,top:117,bottom:620},
    clip:'M264 117H762V535L640 555L560 569V592L535 620H408L383 600L387 575L429 539L353 505L264 440Z',
    mouthCover:'M453 405Q475 400 493 423Q550 447 629 421L637 467Q548 483 454 447Z',mouthColor:'#FFAA64'},
  'prehistoric-female-haired':{scale:.25,neck:{x:518,y:596},chin:{left:{x:481,y:523},right:{x:690,y:508}},
    eyes:[{x:553,y:391},{x:670,y:372}],mouth:{x:590,y:474},bounds:{left:210,right:852,top:75,bottom:705},
    clip:'M210 75H852V604L780 663L676 698L574 687L556 615L533 609L519 565L500 613L458 624L405 674L322 705L210 653Z',
    mouthCover:'M517 449Q585 441 659 449L663 487Q589 513 516 485Z',mouthColor:'#FFAC68'},
} as const;
export function supportingHeadRegistration(profile:HostProfile){
  const selected=profile.appearance.supportingModel;
  if(!selected)throw new Error('Supporting head model missing');
  const model=prehistoricSupportingModel(selected);
  if(profile.kind!=='stick-man'||profile.appearance.artworkVersion!=='forest-body-1'||profile.appearance.characterVariant!==model.bodyTemplate||profile.appearance.bodyView||profile.appearance.bodyHeadBank||profile.appearance.sourceColour)throw new Error('needs-supporting-head: use the matching source costume and this model head; no primary/fixed-view face fallback');
  return {...model,...heads[selected]};
}
export function supportingHeadAssets(appearance:HostProfile['appearance']){
  if(!appearance.supportingModel)return [];
  const m=prehistoricSupportingModel(appearance.supportingModel);
  return [{file:m.file,sha256:m.sha256,path:'assets/rigs/'+m.sha256+'.png'}];
}
export function supportingHeadSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const c=supportingHeadRegistration(profile),clipId='supporting-head-clip-'+hash({actorId:profile.id,model:c.id,source:c.sha256}).slice(0,24),local=(p:{x:number;y:number})=>`${(p.x-c.neck.x)*c.scale} ${(p.y-c.neck.y)*c.scale}`;
  const blink=c.eyes.map((p,i)=>`<g transform="translate(${local(p)})"><g id="source-blink-${i}" opacity="0"><ellipse rx="5" ry="7" fill="${c.mouthColor}"/><path d="M-4 0Q0 2 4 0" fill="none" stroke="#080604" stroke-width="1.5" stroke-linecap="round"/></g></g>`).join('');
  const cover=`<g id="source-mouth-cover" opacity="0" transform="scale(${c.scale}) translate(${-c.neck.x} ${-c.neck.y})"><path d="${c.mouthCover}" fill="${c.mouthColor}"/></g>`;
  const talk='<path d="M-12 -3Q0 -6 12 -3Q13 9 0 10Q-13 9 -12 -3Z" fill="#211009" stroke="#080604" stroke-width="1.4"/><path d="M-7 -2Q0 0 7 -2L6 1H-6Z" fill="#FFF6E5"/><path d="M-5 7Q0 4 5 7" fill="none" stroke="#BE5B32" stroke-width="2"/>';
  const round='<ellipse rx="6" ry="8" fill="#211009" stroke="#080604" stroke-width="1.3"/>';
  const frown='<path d="M-12 3Q0 -6 12 3" fill="none" stroke="#080604" stroke-width="2" stroke-linecap="round"/>';
  const mouths=[['talk',talk],['talk-tense',round],['talk-round',round],['round',round],['frown',frown]].map(([id,svg])=>`<g transform="translate(${local(c.mouth)})"><g id="mouth-${id}-front" opacity="0">${svg}</g></g>`).join('');
  return `<g data-supporting-model="${c.id}" data-head-source="${c.sha256}" stroke="none"><defs><clipPath id="${clipId}"><path d="${c.clip}"/></clipPath></defs><g id="head-view-front"><g transform="scale(${c.scale}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#${clipId})"><image width="${c.width}" height="${c.height}" href="${imageUrl(c.file,c.sha256)}"/></g>${blink}${cover}${mouths}</g></g>`;
}
export const supportingHeadDescription={version:'prehistoric-supporting-head-2',models:prehistoricSupportingModels,calibration:heads,
  status:'manual-unvalidated-source-head-candidate',approved:false,productionReady:false,motionVerified:false,
  face:'Native closed happy smile remains in silence. Existing provisional local blink/round/frown/activity overlays use each model source coordinates. Not registered bank3 face, verified gaze, phonemes or accepted motion.'} as const;
