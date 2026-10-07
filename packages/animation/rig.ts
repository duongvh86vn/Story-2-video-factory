import type { HostProfile } from '../host/schemas.js';
import { faceLayers } from './face.js';
import { artworkSvg } from '../director/art-direction.js';
import {forestTribeArt} from './forest-tribe-art.js';
import {forestHeadSvg,usesReferenceHead} from './forest-head-art.js';
import {forestBodyArt,usesReferenceBody,referenceBodyMetrics} from './forest-body-art.js';

type Point={x:number;y:number};
export interface RigMetrics {
  height:number;pelvisY:number;upperLeg:number;lowerLeg:number;hipOffset:number;stance:number;
  shoulderY:number;shoulderOffset:number;upperArm:number;lowerArm:number;headY:number;headRadius:number;
  torsoTop?:number;neckX?:number;headArtworkScale?:number;strokeWidth?:number;
  shoulders?:Record<'left'|'right',Point>;arms?:Record<'left'|'right',{upper:number;lower:number}>;
  hips?:Record<'left'|'right',Point>;legs?:Record<'left'|'right',{upper:number;lower:number}>;
  handRestRotation?:Record<'left'|'right',number>;
  /** Sole-to-ankle offset in foot artwork units, before its bodyScale. */
  footSoleOffset?:Record<'left'|'right',number>;
  armRest?:Record<'left'|'right',Point>;footOffsets?:Record<'left'|'right',number>;
  /** Positive X is the distance behind the facing direction; Y is below belt. */
  seatContactOffset?:Point;
}
export function rigMetrics(profile: HostProfile):RigMetrics {
  if(usesReferenceBody(profile))return referenceBodyMetrics(profile);
  const robot = profile.kind === 'mini-robot', b = profile.appearance.bodyScale;
  return { height: (robot ? 300 : 318) * b, pelvisY: (robot ? -78 : -128) * b,
    upperLeg: (robot ? 40 : 65) * b, lowerLeg: (robot ? 44 : 70) * b,
    hipOffset: (robot ? 15 : 7) * b, stance: (robot ? 19 : 18) * b,
    shoulderY: (robot ? -160 : -206) * b, shoulderOffset: (robot ? 44 : 25) * b,
    upperArm: 55 * b, lowerArm: 50 * b, headY: (robot ? -240 : -270) * b,
    headRadius: (robot ? 50 : 40) * profile.appearance.headScale,
  };
}

/** Logical parent transforms are baked by the compiler into independent world-space bones. */
export function performanceSvg(profile: HostProfile,imageMode:'embedded'|'scene'='embedded'): string {
  const m = rigMetrics(profile), a = profile.appearance, robot = profile.kind === 'mini-robot';
  const costume=(joint:string)=>(profile.costume??[]).filter(layer=>layer.joint===joint).map((layer,i)=>`<g data-costume-joint="${joint}" stroke="none" fill="#000000">${artworkSvg(layer.svg,`costume.${profile.id}.${joint}.${i}`)}</g>`).join('');
  const drawn=!!a.characterVariant,body=usesReferenceBody(profile)?forestBodyArt(profile,imageMode):null,art=drawn&&!body?forestTribeArt(profile):null;
  const bone = (id: string, length: number) => `<g id="${id}"${drawn?' opacity="0"':''}><path d="M0 0V${length}"/></g>`;
  const limbs = (['left', 'right'] as const).map(side => bone(`leg-${side}-upper`, m.legs?.[side].upper??m.upperLeg)
    + bone(`leg-${side}-lower`, m.legs?.[side].lower??m.lowerLeg) + `<g id="foot-${side}">${body?.feet[side]??`<path d="M-9 0H9" stroke-width="${robot ? 12 : 6}"/>`}</g>`
    + bone(`arm-${side}-upper`, m.arms?.[side].upper??m.upperArm) + bone(`arm-${side}-lower`, m.arms?.[side].lower??m.lowerArm)
    + `<g id="hand-${side}">${body?.hands[side]??`<circle r="${robot ? 9 : drawn?3.2:5}" fill="${drawn?a.outline:a.shell}"/>`}${costume(`hand-${side}`)}</g>`).join('');
  const torso = body?.torso??art?.torso??(robot ? `<rect x="-43" y="-94" width="86" height="94" rx="22" fill="${a.shell}"/><g id="badge"><circle cx="0" cy="-49" r="11" fill="${a.badge}"/></g>`
    : `<path d="M0 0V-92"/>${profile.role==='story-actor'?'':`<g id="neck-scarf"><path d="M-10 -92H10L20 -69L6 -73L0 -88Z" stroke-width="3" fill="${a.accent}"/></g>`}`);
  const head = usesReferenceHead(profile)?forestHeadSvg(profile,imageMode):art?.head??(robot ? `<g id="antenna"><path d="M0 -42V-59"/><circle cy="-63" r="5" fill="${a.accent}"/></g><rect x="-50" y="-42" width="100" height="84" rx="23" fill="${a.shell}"/><rect x="-40" y="-28" width="80" height="55" rx="12" fill="${a.screen}" stroke="none"/>`
    : `<circle r="40" fill="${a.shell}"/>`);
  const ink=(part:'leg'|'arm')=>(['left','right'] as const).map(side=>`<path id="ink-${part}-${side}" d="M0 0C0 0 0 0 0 0C0 0 0 0 0 0"/>`).join('');
  const inkPaths=drawn?(body?ink('leg'):(['left','right'] as const).map(side=>`<path id="ink-leg-${side}" d="M0 0C0 0 0 0 0 0C0 0 0 0 0 0"/><path id="ink-arm-${side}" d="M0 0C0 0 0 0 0 0C0 0 0 0 0 0"/>`).join('')):'';
  const neck=`<g id="neck"${body?' opacity="0"':''}><path d="M0 0V1" vector-effect="non-scaling-stroke"/></g>`;
  return `<g id="performer" data-profile-hash="${profile.profileHash}" fill="none" stroke="${a.outline}" stroke-width="${a.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`
    + `${body?.defs??''}${inkPaths}<g id="pelvis"><ellipse rx="8" ry="3" stroke="none"/>${costume('pelvis')}</g>`
    + (body?`<g id="garment-left"><g id="garment-standing-left">${body.garments.left}</g></g><g id="garment-right"><g id="garment-standing-right">${body.garments.right}</g></g>`:'')
    + `${body?`<g id="neck-art">${body.neck}</g>${neck}`:''}<g id="chest">${torso}${costume('chest')}</g>${body?.seatedGarments??''}${body?'':neck}${body?ink('arm'):''}${limbs}`
    + `<g id="head">${head}${costume('head')}${drawn?'':`<g id="face-orientation">${faceLayers(0, -4, 18, robot ? a.accent : a.outline, robot ? a.screen : a.shell, 15)}</g>`}</g></g>`;
}
