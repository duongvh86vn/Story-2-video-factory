import type {RigHand} from '../core/identifiers.js';
import type {Point} from './schemas.js';

/** Candidate landmarks measured in the existing source SVG canvases, NOT the
 * larger PNG pixel grids. A cuff is where the 16–19px arm widens into mitten.
 * Grip lies in the solid palm; the former anchor was closer to a thumb/lobe.
 * Source pixels stay immutable. These measurements are not anatomy approval. */
export const forestHandRegistration={
  lila:{
    left:{wrist:{x:117,y:474},grip:{x:113,y:501},clip:'M82 468H141V548H82Z'},
    right:{wrist:{x:373,y:474},grip:{x:376,y:501},clip:'M344 467H409V549H344Z'},
  },
  karo:{
    left:{wrist:{x:77,y:453},grip:{x:76,y:480},clip:'M49 447H105V522H49Z'},
    right:{wrist:{x:335,y:450},grip:{x:340,y:479},clip:'M314 444H375V522H314Z'},
  },
} as const;

export function forestHandMetrics(actor:keyof typeof forestHandRegistration,unitScale:number,bodyScale:number){
  return Object.fromEntries((['left','right'] as const).map(side=>{
    const {wrist,grip}=forestHandRegistration[actor][side];
    const dx=grip.x-wrist.x,dy=grip.y-wrist.y;
    return [side,{length:Math.hypot(dx,dy)*unitScale*bodyScale,
      angleDeg:Math.atan2(dy,dx)*180/Math.PI,
      // Hand artwork transform already contains bodyScale; do not apply it twice.
      wristOffset:{x:-dx*unitScale,y:-dy*unitScale}}];
  })) as Record<RigHand,{length:number;angleDeg:number;wristOffset:Point}>;
}

/** Migration removes the old cuff-to-hand anchor span from the old chain,
 * independent of any target. 52/48 is still an inferred, unapproved elbow.
 * The new hand segment is explicit and constant; neither shaft nor targets
 * are moved to disguise a reach error. Existing source plan caches must rebuild. */
export function forestWristChainTotal(legacyTotal:number,legacyHand:Point,wrist:Point){
  const total=legacyTotal-Math.hypot(legacyHand.x-wrist.x,legacyHand.y-wrist.y);
  if(total<=0)throw new Error('Invalid source wrist registration');
  return total;
}

export const forestHandDescription={version:'forest-wrist-palm-1',landmarks:forestHandRegistration,
  coordinates:'virtual source SVG canvas: Lila 430x766, Karo 377x716; cuff/palm candidates measured against immutable high-resolution cutouts',
  contract:'FrameState.hands and hand-* transform origins remain palm/grip contacts; FrameState.wrists is the actual lower-arm endpoint. Hidden upper/lower bones and visible ink end at wrist, not palm.',
  migration:'subtract old cuff-to-old-hand-anchor span from old shoulder-to-hand total, then infer upper/lower 52/48; append measured cuff-to-palm segment. Changes source profiles/renderer fingerprints; do not reuse 0.19 evidence or cached plans.',
  rotation:'one rigid source mitten follows the forearm tangent; no shaft +/-90deg hand kink, no independent palm translation',
  grasp:'solid source mitten occludes owned shaft at registered palm; articulated thumb/fingers and nonzero wrist flexion remain pending',
  productionReady:false};
