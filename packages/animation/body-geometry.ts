import type {RigHand} from '../core/identifiers.js';
import type {RigMetrics} from './rig.js';
import type {Point} from './schemas.js';

/** One physical definition for validation, IK and cloth attachments. Source
 * hips follow the torso; foot anchors remain soles, never mistaken for ankles. */
export function legGeometry(m:RigMetrics,pelvis:Point,sole:Point,side:RigHand,scale:number,bodyScale:number,leanDeg=0){
  const sourceHip=m.hips?.[side],offset=sourceHip??{x:(side==='left'?-1:1)*m.hipOffset,y:0};
  const angle=sourceHip?leanDeg*Math.PI/180:0;
  return {hip:{x:pelvis.x+(offset.x*Math.cos(angle)-offset.y*Math.sin(angle))*scale,
    y:pelvis.y+(offset.x*Math.sin(angle)+offset.y*Math.cos(angle))*scale},
    ankle:{x:sole.x,y:sole.y-(m.footSoleOffset?.[side]??0)*bodyScale*scale},
    bones:{upper:(m.legs?.[side].upper??m.upperLeg)*scale,lower:(m.legs?.[side].lower??m.lowerLeg)*scale}};
}
