import { faceLayers } from '../animation/face.js';
import { performanceSvg } from '../animation/rig.js';
import { samplePerformance } from '../animation/compiler.js';
import type {PerformancePlan,Mood} from '../animation/schemas.js';
import { ANIMATION_VERSION, Moods } from '../animation/schemas.js';
import { escapeHtml, hash } from '../core/utils.js';
import { HostRigSchema, type HostProfile, type HostRig } from './schemas.js';
const eyeCenters = [137,180] as const;
export const HOST_RIG_IDENTITY_VERSION = 'host-rig-identity-2.2.1';
// These released hashes included the runtime version despite identical rig art.
// Compatibility is bounded and recomputed from the complete current profile.
const LEGACY_RIG_ANIMATION_VERSIONS = ['performance-2.2.7','performance-2.2.8','performance-2.2.9'] as const;

const rotations = (upperRight = 0, lowerRight = 0, upperLeft = 0, lowerLeft = 0) => ({
  'arm-right-upper': upperRight, 'arm-right-lower': lowerRight, 'arm-left-upper': upperLeft, 'arm-left-lower': lowerLeft,
});
export const poses: HostRig['poses'] = {
  idle: { rotations: rotations(), rootX: 0, gaze: 0 },
  greet: { rotations: rotations(-145, -15), rootX: 0, gaze: 0 },
  explain: { rotations: rotations(-75, -25, 25, -25), rootX: 0, gaze: 4 },
  point: { rotations: rotations(-90, 0), rootX: 0, gaze: 5 },
  'operate-model': { rotations: rotations(-70, -50), rootX: 0, gaze: 5 },
  compare: { rotations: rotations(-90, 0, 90, 0), rootX: 0, gaze: 0 },
  think: { rotations: rotations(-155, 115), rootX: 0, gaze: -3 },
  react: { rotations: rotations(-110, -20, 110, 20), rootX: 0, gaze: 0 },
  summarize: { rotations: rotations(-65, -25), rootX: 0, gaze: 0 },
  'walk-to-marker': { rotations: rotations(-30, 20, 30, -20), rootX: 0, gaze: 4 },
};
export function rigParts(kind: HostProfile['kind']): HostRig['parts'] {
  const robot=kind==='mini-robot',shoulder=robot?177:143,eye=robot?90:73,mouth=robot?117:94;
  const part = (id: string, x: number, y: number, width: number, height: number, parent?: string) => ({
    id, ...(parent ? { parent } : {}), pivot: { x, y }, bounds: { x, y, width, height },
  });
  return [part('host-root', 160, 350, 280, 380), part('head', 160, robot?90:73, robot?140:80, robot?110:80, 'host-root'),
    part('eye-left', eyeCenters[0], eye, 12, 15, 'head'), part('eye-right', eyeCenters[1], eye, 12, 15, 'head'), part('mouth', 160, mouth, 32, 10, 'head'),
    part('brow-left',eyeCenters[0],eye-16,16,4,'head'),part('brow-right',eyeCenters[1],eye-16,16,4,'head'),
    part('lid-left',eyeCenters[0],eye-4,14,7,'head'),part('lid-right',eyeCenters[1],eye-4,14,7,'head'),
    part('mouth-talk',160,mouth,18,6,'mouth'),part('mouth-smile',160,mouth,20,11,'head'),part('mouth-round',160,mouth,12,18,'head'),
    part('body', 160, 165, 100, 120, 'host-root'),
    part('arm-left-upper', 112, shoulder, 10, 55, 'body'), part('arm-left-lower', 112, shoulder+55, 10, 50, 'arm-left-upper'),
    part('hand-left', 112, shoulder+105, 22, 18, 'arm-left-lower'),
    part('arm-right-upper', 208, shoulder, 10, 55, 'body'), part('arm-right-lower', 208, shoulder+55, 10, 50, 'arm-right-upper'),
    part('hand-right', 208, shoulder+105, 22, 18, 'arm-right-lower'),
    ...(kind === 'mini-robot' ? [part('antenna', 160, 40, 8, 32, 'head'), part('face-screen', 105, 62, 110, 70, 'head'),
      part('badge', 160, 220, 20, 20, 'body'), part('leg-left', 137, 284, 20, 64, 'body'), part('leg-right', 182, 284, 20, 64, 'body')]
      : [part('neck-scarf', 160, 124, 24, 20, 'body'), part('leg-left-upper', 160, 235, 12, 65, 'body'),
        part('leg-left-lower', 140, 300, 12, 70, 'leg-left-upper'), part('leg-right-upper', 160, 235, 12, 65, 'body'),
        part('leg-right-lower', 180, 300, 12, 70, 'leg-right-upper')]),
    part('foot-left', robot?137:126, robot?344:370, 32, 12, kind === 'mini-robot' ? 'leg-left' : 'leg-left-lower'),
    part('foot-right', robot?182:194, robot?344:370, 32, 12, kind === 'mini-robot' ? 'leg-right' : 'leg-right-lower')];
}
export function hostSvg(profile: HostProfile, poseName = 'idle', embedded = false): string {
  const p = poses[poseName] ?? poses.idle!, a = profile.appearance, robot = profile.kind === 'mini-robot';
  const shoulder=robot?177:143,eye=robot?90:73,mouth=robot?117:94,headY=robot?90:73,view=hostViewBox(profile);
  const rotation = (id: string, x: number, y: number) => `transform="rotate(${p.rotations[id] ?? 0} ${x} ${y})"`;
  const arms = (side: 'left' | 'right', x: number) => `<g id="arm-${side}-upper" ${rotation(`arm-${side}-upper`, x, shoulder)}><path d="M${x} ${shoulder}V${shoulder+55}"/><g id="arm-${side}-lower" ${rotation(`arm-${side}-lower`, x, shoulder+55)}><path d="M${x} ${shoulder+55}V${shoulder+105}"/><g id="hand-${side}"><circle cx="${x}" cy="${shoulder+105}" r="${robot ? 11 : 7}" fill="${a.shell}"/></g></g></g>`;
  const body = robot ? `<g id="body"><rect x="112" y="160" width="96" height="124" rx="25" fill="${a.shell}"/><g id="badge"><circle cx="160" cy="220" r="13" fill="${a.badge}"/></g></g>`
    : `<g id="body"><path d="M160 113V235"/><g id="neck-scarf"><path d="M147 120H172L181 140L168 136L160 123Z" fill="${a.accent}" stroke-width="3"/></g></g>`;
  const legs = robot ? `<g id="leg-left"><path d="M137 284V344"/><g id="foot-left"><rect x="116" y="341" width="42" height="16" rx="7" fill="${a.shell}"/></g></g><g id="leg-right"><path d="M182 284V344"/><g id="foot-right"><rect x="164" y="341" width="42" height="16" rx="7" fill="${a.shell}"/></g></g>`
    : `<g id="leg-left-upper"><path d="M160 235L140 300"/><g id="leg-left-lower"><path d="M140 300L126 370"/><g id="foot-left"><path d="M126 370H112"/></g></g></g><g id="leg-right-upper"><path d="M160 235L180 300"/><g id="leg-right-lower"><path d="M180 300L194 370"/><g id="foot-right"><path d="M194 370H207"/></g></g></g>`;
  const headShape = robot ? `<g id="antenna"><path d="M160 40V23"/><circle cx="160" cy="19" r="7" fill="${a.accent}"/></g><rect x="90" y="40" width="140" height="106" rx="25" fill="${a.shell}"/><g id="face-screen"><rect x="105" y="62" width="110" height="70" rx="15" fill="${a.screen}" stroke="none"/></g>`
    : `<circle cx="160" cy="73" r="40" fill="${a.shell}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.join(' ')}"${embedded ? ` data-host-id="${escapeHtml(profile.id)}"` : ''}><g id="host-root" fill="none" stroke="${a.outline}" stroke-width="${a.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><g id="body-frame" transform="translate(${160 * (1 - a.bodyScale)} ${shoulder * (1 - a.bodyScale)}) scale(${a.bodyScale})">${legs}${body}${arms('left', 112)}${arms('right', 208)}</g><g id="head" transform="translate(${160 * (1 - a.headScale)} ${headY * (1 - a.headScale)}) scale(${a.headScale})">${headShape}${faceLayers(160, eye, mouth, robot ? a.accent : a.outline, robot ? a.screen : a.shell, eyeCenters, p.gaze)}</g></g></svg>`;
}
export function hostViewBox(profile:HostProfile):HostRig['viewBox']{const shoulder=profile.kind==='mini-robot'?177:143,bottom=profile.kind==='mini-robot'?357:370;return [-20,-20,360,Math.max(420,shoulder+(bottom-shoulder)*profile.appearance.bodyScale+40)];}
export function buildRig(profile: HostProfile): HostRig {
  const folder = `assets/host/${profile.id}/${profile.version}`;
  const parts = rigParts(profile.kind);
  return HostRigSchema.parse({ id: profile.id, profileVersion: profile.version, profileHash: profile.profileHash,
    rigHash: hash({ identityVersion:HOST_RIG_IDENTITY_VERSION, profile, svg:hostSvg(profile), performanceSvg:performanceSvg(profile), parts, poses }), compilerVersion: profile.compilerVersion,
    viewBox: hostViewBox(profile), assetPath: `${folder}/host.svg`, posePath: `${folder}/poses.json`, parts, poses });
}
/** Animation upgrades do not change the approved artwork, bones or pose identity. */
export function rigHashMatchesProfile(profile:HostProfile,candidate:string):boolean {
  if(candidate===buildRig(profile).rigHash)return true;
  // hash() uses JSON serialization: preserve the released field order exactly.
  const svg=hostSvg(profile),art=performanceSvg(profile),parts=rigParts(profile.kind);
  return LEGACY_RIG_ANIMATION_VERSIONS.some(animationVersion=>candidate===hash({profile,svg,performanceSvg:art,animationVersion,parts,poses}));
}
export function hostPreviewSvg(profile: HostProfile): string {
  if(profile.role==='story-actor'){
    const moods: readonly Mood[]=Moods;
    const cells=moods.map((mood,i)=>`<g transform="translate(${(i%4)*320} ${Math.floor(i/4)*450})">${actorPoseSvg(profile,mood).replace(/<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g><text x="${(i%4)*320+160}" y="${Math.floor(i/4)*450+430}" text-anchor="middle" font-family="Arial" font-size="18" fill="#172B36">${mood}</text>`).join('');
    const height=Math.ceil(moods.length/4)*450;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${height}" viewBox="0 0 1280 ${height}"><rect width="1280" height="${height}" fill="#E8EEF1"/>${cells}</svg>`;
  }
  const entries=[{name:'front',pose:'idle',gaze:0},{name:'left (3/4 schematic)',pose:'point',gaze:-5},{name:'right (3/4 schematic)',pose:'point',gaze:5},...Object.keys(poses).map(name=>({name,pose:name,gaze:undefined}))];
  const cells = entries.map(({name,pose,gaze}, i) => {
    const x=(i%4)*320,y=Math.floor(i/4)*290;
    let svg=hostSvg(profile,pose).replace(/<svg[^>]*>/,'').replace(/<\/svg>$/,'');
    if(gaze!==undefined)svg=svg.replace(/(id="eye-(?:left|right)" transform="translate\()[^)]*\)/g,`$1${gaze} 0)`);
    const mirror=gaze===-5?'translate(320 0) scale(-1 1)':'';
    return `<g transform="translate(${x+60} ${y+18}) scale(.60)"><g transform="${mirror}">${svg}</g></g><text x="${x+160}" y="${y+276}" text-anchor="middle" fill="#172B36" font-family="Arial" font-size="16">${escapeHtml(name)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1160" viewBox="0 0 1280 1160"><rect width="1280" height="1160" fill="#E8EEF1"/>${cells}</svg>`;
}
/** Cast previews use the same skeleton and pose evaluator as the rendered movie. */
export function actorPoseSvg(profile:HostProfile,mood:Mood='neutral'):string{
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'cast-preview',leadCharacterId:profile.id,profileHash:profile.profileHash,kind:profile.kind,
    durationMs:1200,fps:30,stage:{width:320,height:420,groundY:380},root:{x:160,y:380},scale:.9,walks:[],gestures:[],props:[],gazes:[],expressions:[{startMs:0,endMs:1200,mood}]};
  const frame=samplePerformance(plan,profile,600,{method:'segment-draft',windowMs:20,intervals:[]});
  let svg=performanceSvg(profile);
  for(const [id,transform] of Object.entries(frame.transforms))svg=svg.replace(`id="${id}"`,`id="${id}" transform="${transform}"`);
  for(const [id,face] of Object.entries(frame.face))svg=svg.replace(new RegExp(`<g id="${id}"[^>]*>`),`<g id="${id}"${face.opacity===undefined?'':` opacity="${face.opacity}"`} transform="${face.attr?.transform??`translate(${face.x??0} ${face.y??0}) rotate(${face.rotation??0}) scale(1 ${face.scaleY??1})`}">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420">${svg}</svg>`;
}
