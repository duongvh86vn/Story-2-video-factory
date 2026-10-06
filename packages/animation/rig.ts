import type { HostProfile } from '../host/schemas.js';
import { faceLayers } from './face.js';
import { artworkSvg } from '../director/art-direction.js';
import {forestTribeArt} from './forest-tribe-art.js';

export function rigMetrics(profile: HostProfile) {
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
export function performanceSvg(profile: HostProfile): string {
  const m = rigMetrics(profile), a = profile.appearance, robot = profile.kind === 'mini-robot';
  const costume=(joint:string)=>(profile.costume??[]).filter(layer=>layer.joint===joint).map((layer,i)=>`<g data-costume-joint="${joint}" stroke="none" fill="#000000">${artworkSvg(layer.svg,`costume.${profile.id}.${joint}.${i}`)}</g>`).join('');
  const drawn=!!a.characterVariant,art=drawn?forestTribeArt(profile):null;
  const bone = (id: string, length: number) => `<g id="${id}"${drawn?' opacity="0"':''}><path d="M0 0V${length}"/></g>`;
  const limbs = (['left', 'right'] as const).map(side => bone(`leg-${side}-upper`, m.upperLeg)
    + bone(`leg-${side}-lower`, m.lowerLeg) + `<g id="foot-${side}"><path d="M-9 0H9" stroke-width="${robot ? 12 : 6}"/></g>`
    + bone(`arm-${side}-upper`, m.upperArm) + bone(`arm-${side}-lower`, m.lowerArm)
    + `<g id="hand-${side}"><circle r="${robot ? 9 : drawn?3.2:5}" fill="${drawn?a.outline:a.shell}"/>${costume(`hand-${side}`)}</g>`).join('');
  const torso = art?.torso??(robot ? `<rect x="-43" y="-94" width="86" height="94" rx="22" fill="${a.shell}"/><g id="badge"><circle cx="0" cy="-49" r="11" fill="${a.badge}"/></g>`
    : `<path d="M0 0V-92"/>${profile.role==='story-actor'?'':`<g id="neck-scarf"><path d="M-10 -92H10L20 -69L6 -73L0 -88Z" stroke-width="3" fill="${a.accent}"/></g>`}`);
  const head = art?.head??(robot ? `<g id="antenna"><path d="M0 -42V-59"/><circle cy="-63" r="5" fill="${a.accent}"/></g><rect x="-50" y="-42" width="100" height="84" rx="23" fill="${a.shell}"/><rect x="-40" y="-28" width="80" height="55" rx="12" fill="${a.screen}" stroke="none"/>`
    : `<circle r="40" fill="${a.shell}"/>`);
  const inkPaths=drawn?(['left','right'] as const).map(side=>`<path id="ink-leg-${side}" d="M0 0C0 0 0 0 0 0C0 0 0 0 0 0"/><path id="ink-arm-${side}" d="M0 0C0 0 0 0 0 0C0 0 0 0 0 0"/>`).join(''):'';
  return `<g id="performer" data-profile-hash="${profile.profileHash}" fill="none" stroke="${a.outline}" stroke-width="${a.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`
    + `${inkPaths}<g id="pelvis"><ellipse rx="8" ry="3" stroke="none"/>${costume('pelvis')}</g><g id="chest">${torso}${costume('chest')}</g><g id="neck"><path d="M0 0V1" vector-effect="non-scaling-stroke"/></g>${limbs}`
    + `<g id="head">${head}${costume('head')}${drawn?'':`<g id="face-orientation">${faceLayers(0, -4, 18, robot ? a.accent : a.outline, robot ? a.screen : a.shell, 15)}</g>`}</g></g>`;
}
