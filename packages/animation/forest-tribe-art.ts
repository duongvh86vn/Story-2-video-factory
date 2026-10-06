import type { HostProfile } from '../host/schemas.js';
import {forestPalette as p} from '../topics/prehistoric-life.js';
import {faceLayers} from './face.js';
export function forestHeadContour(yaw:number):string {
  const right=Math.max(0,yaw),left=Math.max(0,-yaw),shift=-yaw*4;
  const points=[[0,-38],[18,-38],[35,-27],[36,-10],[36+right*2,-6],[37+right*8,-1],[37+right*8,4],[37+right*6,9],[34,16],[31,22],[24,32],[14,38],[0,38],[-14,38],[-25,32],[-31,22],[-34,16],[-37-left*6,9],[-37-left*8,4],[-37-left*8,-1],[-36-left*2,-6],[-36,-10],[-35,-27],[-18,-38],[0,-38]];
  return points.map(([x,y],i)=>`${i===0?'M':i%3===1?'C':''}${Number((x!+shift).toFixed(4))} ${y}`).join(' ');
}

/** Built-in passive artwork; actor coordinates share the physical rig anchors. */
export function forestTribeArt(profile:HostProfile):{torso:string;head:string} {
  const female=profile.appearance.characterVariant==='lila';
  const fur=female
    ?'M-27 -93 Q-9 -101 20 -93 L29 -30 36 18 20 9 12 26 1 13 -12 24 -19 8 -34 17 -30 -31Z'
    :'M-29 -95 L-13 -99 26 -94 30 -37 34 11 20 3 10 19 -3 7 -17 19 -23 4 -34 12 -29 -29Z';
  const torso=`<path d="${fur}" fill="${p.fur}" stroke-width="2.5"/><path d="M-26 -85Q-14 -68 -20 -46L-29 -22 -30 7 -22 0 -18 11 -14 -6 -19 -32Z" fill="${p.furShadow}" stroke="none"/><path d="M-7 -89Q3 -72 15 -56L21 -24 10 -34 3 -56Z" fill="${p.furLight}" stroke="none"/><path d="M-29 -30Q0 -17 28 -30" stroke-width="3.5"/><path d="M-21 -29L-18 -38M-6 -24L-3 -34M9 -24L13 -33M24 -29L26 -38" stroke-width="1.5"/><path d="M-15 -80l4 6m20 -3l-5 7m-17 18l4 4m19 -4l-4 6m-24 22l3 4m18 3l-2 5M-9 5l4 3" stroke="${p.furShadow}" stroke-width="1.6"/>`;
  const hairBack=female
    ?'M-38 -18Q-49 -36 -33 -48Q-7 -67 19 -49L34 -41Q51 -32 42 -6L47 16 37 8 43 37 30 31 26 63 16 50 13 66 7 54 16 24Q0 37 -16 24L-14 53 -21 69 -25 52 -36 60 -31 36 -42 46 -35 18 -45 29Z'
    :'M-43 -10L-50 -20 -39 -24 -45 -36 -30 -34 -26 -48 -15 -42 -5 -55 5 -45 19 -51 23 -40 39 -43 33 -31 47 -25 40 -13 47 -1 35 11 -35 12Z';
  const fringe=female
    ?'M-37 -11Q-24 -39 4 -38L23 -30Q14 -23 7 -14L5 -26Q-6 -11 -22 -4L-19 -18 -34 2Z'
    :'M-38 -14L-32 -32 -24 -25 -17 -38 -9 -25 -1 -40 6 -27 16 -36 22 -24 32 -26 37 -9 23 -19 17 -9 10 -22 0 -12 -6 -25 -18 -14 -24 -21Z';
  const beard=female?'':`<g id="head-beard"><path d="M-34 10Q-24 19 -15 13L-5 18 4 13 17 17 29 8 35 21 26 29 26 37 14 36 8 45 -3 41 -13 44 -19 34 -29 34 -29 25 -38 23Z" fill="${p.hair}" stroke-width="2"/><path d="M-26 24l5 6m10 2l3 6m17 -5l-2 5m16 -15l-4 7" stroke="${p.hairLight}" stroke-width="2"/><ellipse cy="23" rx="14" ry="9" fill="${p.skin}" stroke="none"/></g>`;
  const head=`<g id="head-hair-back"><path d="${hairBack}" fill="${p.hair}" stroke-width="2.5"/><path d="M-34 -30Q-13 -49 10 -44M-36 14Q-28 34 -28 45" stroke="${p.hairLight}" stroke-width="3" fill="none"/></g><g id="head-front"><path id="head-contour" d="M0 -38 C18 -38 35 -27 36 -10 C36 -6 37 -1 37 4 C37 9 34 16 31 22 C24 32 14 38 0 38 C-14 38 -25 32 -31 22 C-34 16 -37 9 -37 4 C-37 -1 -36 -6 -36 -10 C-35 -27 -18 -38 0 -38" fill="${p.skin}" stroke-width="2.5"/><path d="M-33 -16Q-37 20 -17 31Q-29 26 -27 6Z" fill="${p.skinShadow}" stroke="none"/><ellipse cx="-33" cy="6" rx="7" ry="10" fill="${p.skin}" stroke-width="2"/><ellipse cx="33" cy="6" rx="7" ry="10" fill="${p.skin}" stroke-width="2"/><g id="head-face-plane">${beard}<ellipse cx="-21" cy="14" rx="6" ry="3" fill="#E9905F" opacity=".55" stroke="none"/><ellipse cx="21" cy="14" rx="6" ry="3" fill="#E9905F" opacity=".55" stroke="none"/><g id="face-orientation">${faceLayers(0,-2,female?18:23,p.ink,p.skin,12)}</g><g id="head-nose" opacity="0"><path d="M26 -3Q45 4 32 10" fill="${p.skin}" stroke-width="2"/></g></g><g id="head-fringe"><path d="${fringe}" fill="${p.hair}" stroke-width="2"/><path d="M-21 -27Q-11 -37 0 -35" stroke="${p.hairLight}" stroke-width="2.2" fill="none"/></g></g><g id="head-back-view" opacity="0"><path d="${hairBack}" fill="${p.hair}" stroke-width="2.5"/><path d="M-18 -26Q-9 -10 -16 20M4 -30Q14 -1 6 29M24 -20Q32 4 22 20" stroke="${p.hairLight}" stroke-width="2" fill="none"/></g>`;
  return {torso,head};
}
