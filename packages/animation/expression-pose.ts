import type {Mood} from './schemas.js';

/** Authored expression controls, shared with static artwork documents. Merely
 * reading these controls does not sample any performance, clock or audio. */
export const moodPoses:Record<Mood,{brow:number;tilt:number;lean:number;smile:number;round:number;lid:number;frown?:number;browAngle?:number;eyeOpen?:number}>={
  neutral:{brow:0,tilt:0,lean:0,smile:0,round:0,lid:0},curious:{brow:-4,tilt:-7,lean:4,smile:0,round:0,lid:0},
  thinking:{brow:2,tilt:7,lean:-2,smile:0,round:0,lid:.3},concerned:{brow:4,tilt:-4,lean:-3,smile:0,round:0,lid:.25},
  effort:{brow:4,tilt:2,lean:5,smile:0,round:0,lid:.25},surprised:{brow:-7,tilt:-5,lean:-6,smile:0,round:1,lid:0},
  understanding:{brow:-1,tilt:3,lean:0,smile:1,round:0,lid:0},confident:{brow:-1,tilt:0,lean:0,smile:.7,round:0,lid:0},
  happy:{brow:-3,tilt:3,lean:0,smile:1,round:0,lid:.1,browAngle:-5},
  sad:{brow:1,tilt:9,lean:-3,smile:0,round:0,lid:.35,frown:1,browAngle:20,eyeOpen:.8},
  angry:{brow:3,tilt:-3,lean:3,smile:0,round:0,lid:.15,frown:.65,browAngle:-24,eyeOpen:.75},
  afraid:{brow:-5,tilt:-8,lean:-6,smile:0,round:.8,lid:0,browAngle:18,eyeOpen:1.2},
  excited:{brow:-6,tilt:4,lean:3,smile:1,round:0,lid:0,browAngle:-6,eyeOpen:1.15},
  disappointed:{brow:2,tilt:6,lean:-2,smile:0,round:0,lid:.4,frown:.8,browAngle:12,eyeOpen:.85},
  relieved:{brow:0,tilt:2,lean:0,smile:.8,round:0,lid:.3,browAngle:6,eyeOpen:.9},
  tired:{brow:2,tilt:8,lean:-4,smile:0,round:0,lid:.7,browAngle:5,eyeOpen:.55},
};
export const expressionPose=(mood:Mood)=>({...moodPoses[mood],frown:moodPoses[mood].frown??0,
  browAngle:moodPoses[mood].browAngle??(mood==='concerned'?12:mood==='effort'?-12:0),eyeOpen:moodPoses[mood].eyeOpen??1});
export type ExpressionPose=ReturnType<typeof expressionPose>;
