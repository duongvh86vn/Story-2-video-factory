import {HostProfileSchema,type HostProfile} from '../host/schemas.js';
import {HOST_COMPILER_VERSION} from '../host/profile.js';
import {HostActions} from '../host/schemas.js';
import {hash} from '../core/utils.js';
import {actorPoseSvg} from '../host/rig.js';
import {HeadViewSchema} from '../animation/schemas.js';
import {topicAppearance,PREHISTORIC_TOPIC_VERSION} from './prehistoric-life.js';
import {forestBackground,type ForestLight} from './forest-background.js';

export function topicPreviewProfile(id:'lila'|'karo'):HostProfile {
  const profile={id,version:1,kind:'stick-man',role:'story-actor',name:id==='lila'?'Lila':'Karo',description:`Forest Tribe ${PREHISTORIC_TOPIC_VERSION} visual model; calibration only`,
    appearance:topicAppearance(id),actions:[...HostActions],immutable:['model silhouette','palette','costume'],compilerVersion:HOST_COMPILER_VERSION,sourcePath:'docs/topics/CUOC-SONG-THOI-TIEN-SU.md'};
  return HostProfileSchema.parse({...profile,profileHash:hash(profile)});
}
const inner=(svg:string)=>svg.replace(/<svg[^>]*>/,'').replace(/<\/svg>$/,'');
export function topicPreviewSvg(light:ForestLight='day'):string {
  const actors=(['lila','karo'] as const).map((id,i)=>`<g transform="translate(${i?654:318} 109.2) scale(1.2)">${inner(actorPoseSvg(topicPreviewProfile(id),'happy',i?'three-quarter-left':'three-quarter-right'))}</g>`).join('');
  return forestBackground(1280,720,light,'forest').replace('</svg>',`${actors}<rect x="32" y="26" width="505" height="67" rx="12" fill="#2B1710" opacity=".9"/><text x="50" y="56" font-family="Arial" font-size="24" fill="#FFE08B">Lila &amp; Karo · ${PREHISTORIC_TOPIC_VERSION}</text><text x="50" y="78" font-family="Arial" font-size="15" fill="#FFFFFF">Proposed models / colours — visual acceptance pending</text></svg>`);
}
export function topicViewsSvg(id:'lila'|'karo'):string {
  const cells=HeadViewSchema.options.map((view,i)=>`<g transform="translate(${i%4*320} ${Math.floor(i/4)*450})">${inner(actorPoseSvg(topicPreviewProfile(id),'neutral',view))}<text x="160" y="429" text-anchor="middle" font-family="Arial" font-size="18" fill="#2B1710">${view}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900"><rect width="1280" height="900" fill="#E9D795"/>${cells}</svg>`;
}
