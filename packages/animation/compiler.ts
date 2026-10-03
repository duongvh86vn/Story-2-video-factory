import type { HostProfile } from '../host/schemas.js';
import type { SpeechActivity } from '../voice/schemas.js';
import { hash } from '../core/utils.js';
import { rigHand, type RigHand } from '../core/identifiers.js';
import { rigMetrics } from './rig.js';
import { ANIMATION_VERSION, LEGACY_ANIMATION_VERSION, PerformancePlanSchema, type Gesture, type Mood, type PerformancePlan, type Point, type PostureTarget } from './schemas.js';
import { selectedClips } from './library.js';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const degrees = (n: number) => n * 180 / Math.PI;
const rad = (n: number) => n * Math.PI / 180;
const rotate = (p: Point, angle: number): Point => ({ x: p.x * Math.cos(rad(angle)) - p.y * Math.sin(rad(angle)), y: p.x * Math.sin(rad(angle)) + p.y * Math.cos(rad(angle)) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const chronological = <T extends {startMs:number}>(items:T[]):T[] => [...items].sort((a,b)=>a.startMs-b.startMs);
export interface BodyPosture { pelvisDropRatio:number; leanDeg:number; }
/** Body transitions finish in a held pose. They do not restart at subtitle boundaries. */
export function postureAt(plan:PerformancePlan,timeMs:number):BodyPosture {
  const target=(pose:PostureTarget):BodyPosture=>{
    const intensity=pose.intensity??1,direction=plan.facing==='left'?-1:1;
    return {pelvisDropRatio:(pose.pose==='crouch'?.42:pose.pose==='lean'?.04:0)*intensity,
      leanDeg:(pose.leanDeg??(pose.pose==='crouch'?8:pose.pose==='lean'?16:0)*direction)*intensity};
  };
  let value=target(plan.entryPosture??{pose:'stand'});
  for(const clip of chronological(plan.postures??[])){
    if(timeMs<clip.startMs)break;
    const next=target(clip),weight=smooth((timeMs-clip.startMs)/(clip.endMs-clip.startMs));
    value={pelvisDropRatio:lerp(value.pelvisDropRatio,next.pelvisDropRatio,weight),leanDeg:lerp(value.leanDeg,next.leanDeg,weight)};
  }
  return value;
}
const recoveryStart = (g:Gesture) => g.releaseMs ?? (g.action==='carry'?g.endMs:g.endMs-Math.min(220,(g.endMs-g.startMs)*.18));
const attaches = (g:Gesture) => g.action==='pick-place'||g.action==='carry';
const contacts = (g:Gesture) => g.action==='operate'||attaches(g);
const CARRY_TRANSITION_MS=250;
const enteringCarry=(g:Gesture)=>g.action==='carry'&&g.startMs===0&&g.contactMs===0;
const gestureAt=(plan:PerformancePlan,t:number,hand:RigHand='right')=>plan.gestures.find(g=>rigHand(g)===hand&&t>=g.startMs&&(t<g.endMs||g.action==='carry'&&g.releaseMs===undefined&&t===plan.durationMs&&g.endMs===plan.durationMs));
export interface Chain { joint: Point; end: Point; upper: number; lower: number; reachable: boolean; error: number }

/** Fixed lengths, explicit bend direction. Inputs and outputs are all in world space. */
export function solveChain(start: Point, target: Point, upper: number, lower: number, bend = 1): Chain {
  if (!(upper > 0 && lower > 0)) throw new Error('Bone lengths must be positive');
  const dx = target.x-start.x, dy = target.y-start.y, actual = Math.hypot(dx,dy);
  const reach = Math.min(upper+lower-1e-6, Math.max(Math.abs(upper-lower)+1e-6,actual));
  const theta = Math.atan2(dy,dx), alpha = Math.acos(clamp((upper*upper+reach*reach-lower*lower)/(2*upper*reach),-1,1));
  const direction = theta-bend*alpha;
  const joint = { x:start.x+upper*Math.cos(direction), y:start.y+upper*Math.sin(direction) };
  const end = { x:start.x+reach*Math.cos(theta), y:start.y+reach*Math.sin(theta) };
  return { joint, end, upper:degrees(direction)-90, lower:degrees(Math.atan2(end.y-joint.y,end.x-joint.x))-90,
    reachable:actual<=upper+lower && actual>=Math.abs(upper-lower),error:distance(end,target) };
}

function overlaps(items: Array<{startMs:number;endMs:number}>, label:string, duration:number) {
  let end = 0;
  for (const item of [...items].sort((a,b)=>a.startMs-b.startMs)) {
    if (item.startMs<end || item.endMs<=item.startMs || item.endMs>duration) throw new Error(`${label}: overlapping or invalid interval ${item.startMs}–${item.endMs}`);
    end=item.endMs;
  }
}
export function validatePerformance(plan: PerformancePlan, profile:HostProfile):void {
  PerformancePlanSchema.parse(plan);
  if(plan.kind!==profile.kind || plan.leadCharacterId!==profile.id || plan.profileHash!==profile.profileHash) throw new Error('Performance identity/profile mismatch');
  if(Math.abs(plan.root.y-plan.stage.groundY)>1e-6) throw new Error('Performer root must use the ground anchor');
  for(const [name, items] of [['locomotion',plan.walks],['expression',plan.expressions],['gaze',plan.gazes]] as const) overlaps(items,name,plan.durationMs);
  for(const hand of ['left','right'] as const)overlaps(plan.gestures.filter(g=>rigHand(g)===hand),`${hand}-arm gesture`,plan.durationMs);
  if(new Set(plan.gestures.map(g=>g.id)).size!==plan.gestures.length)throw new Error('Duplicate gesture identity across arm tracks');
  overlaps(plan.turns??[],'turn',plan.durationMs);
  overlaps(plan.postures??[],'body posture',plan.durationMs);
  if(plan.compilerVersion===LEGACY_ANIMATION_VERSION&&(plan.entryPosture||plan.postures?.length||plan.gestures.some(g=>g.elbowPole)))throw new Error('Body posture/elbow pole data requires animation2.2.8 or newer');
  if(plan.compilerVersion!==ANIMATION_VERSION&&(plan.gestures.some(g=>g.hand)||plan.props.some(p=>p.attachedTo==='left-hand')))throw new Error('Hand tracks require the current animation compiler version');
  for(const pose of [...(plan.entryPosture?[plan.entryPosture]:[]),...(plan.postures??[])]){
    if(pose.pose==='stand'&&pose.leanDeg)throw new Error('Standing posture must return to zero body lean; use a lean clip');
  }
  for(const pose of plan.postures??[])if(pose.endMs-pose.startMs<280)throw new Error('Body posture transition must be at least 280ms');
  for(const turn of plan.turns??[]){
    if(turn.endMs-turn.startMs<280)throw new Error('Turn window must be at least 280ms');
    if(plan.walks.some(w=>w.startMs<turn.endMs&&w.endMs>turn.startMs))throw new Error('Stationary turn overlaps walk locomotion');
    if(plan.gestures.some(g=>contacts(g)&&g.startMs<turn.endMs&&g.endMs>turn.startMs))throw new Error('Turn overlaps hand contact or attachment');
  }
  let rootX=plan.root.x;
  for(const walk of chronological(plan.walks)){
    const body=postureAt(plan,walk.startMs);
    if(body.pelvisDropRatio!==0||body.leanDeg!==0||(plan.postures??[]).some(p=>p.startMs<walk.endMs&&p.endMs>walk.startMs))throw new Error('Walking requires a standing body posture; finish returning to stand before locomotion');
    if(Math.abs(walk.fromX-rootX)>.001)throw new Error('Walk entry position breaks continuity');
    const m=rigMetrics(profile), speed=Math.abs(walk.toX-walk.fromX)/plan.scale/((walk.endMs-walk.startMs)/1000);
    if(speed>m.upperLeg*3)throw new Error('Walk window too short for the distance; shorten the path');
    rootX=walk.toX;
  }
  const props=new Set(plan.props.map(p=>p.id));
  if(props.size!==plan.props.length)throw new Error('Duplicate prop identity');
  for(const hand of ['left','right'] as const)if(plan.props.filter(p=>p.attachedTo===`${hand}-hand`).length>1)throw new Error(`Only one prop can own the ${hand}-hand entry grip`);
  for(const prop of plan.props.filter(p=>p.attachedTo)){
    if(!plan.gestures.some(g=>enteringCarry(g)&&g.propId===prop.id&&`${rigHand(g)}-hand`===prop.attachedTo))throw new Error(`${prop.id}: attached entry prop requires matching hand carry ownership from time zero`);
  }
  const propPoints=new Map(plan.props.map(p=>[p.id,p.origin]));
  for(const g of chronological(plan.gestures)){
    if(['point','inspect','operate','pick-place','carry'].includes(g.action)&&!g.target)throw new Error(`${g.id}: missing gesture target`);
    if(contacts(g) && (g.contactMs===undefined||g.contactMs<=g.startMs&&!enteringCarry(g)||g.contactMs>=g.endMs))throw new Error(`${g.id}: contact must follow approach`);
    if(attaches(g) && (!g.propId||!props.has(g.propId)))throw new Error(`${g.id}: attachment requires a known prop`);
    if(enteringCarry(g)&&plan.props.find(p=>p.id===g.propId)?.attachedTo!==`${rigHand(g)}-hand`)throw new Error(`${g.id}: entry carry requires a prop attached to the same hand`);
    if(attaches(g)&&(g.action==='pick-place'||g.releaseMs!==undefined)&&(!g.destination||g.releaseMs===undefined||g.releaseMs<=g.contactMs!||g.releaseMs>=g.endMs))throw new Error(`${g.id}: released attachment requires destination and release`);
    if(g.action==='carry'&&g.releaseMs===undefined&&(g.endMs!==plan.durationMs||g.destination))throw new Error(`${g.id}: unreleased carry must own the arm through the scene exit`);
    if(g.propId&&!props.has(g.propId))throw new Error(`${g.id}: unknown prop`);
    if(contacts(g)){
      const release=recoveryStart(g);
      if(release-g.contactMs!<80 || (g.action!=='carry'||g.releaseMs!==undefined)&&g.endMs-release<120)throw new Error(`${g.id}: contact schedule needs at least 80ms of hold and 120ms of recovery`);
    }
    if(g.carryOffset&&g.action!=='carry')throw new Error(`${g.id}: carry offset requires carry ownership`);
    if(g.action==='carry'&&(!g.carryOffset||recoveryStart(g)-g.contactMs!<(enteringCarry(g)?0:CARRY_TRANSITION_MS)+(g.releaseMs===undefined?0:CARRY_TRANSITION_MS)+80))throw new Error(`${g.id}: carry needs a lift/hold/lowering window and local grip offset`);
    if(attaches(g)){
      const prop=plan.props.find(p=>p.id===g.propId)!;
      const offset=prop.gripOffset??{x:0,y:0},current=propPoints.get(prop.id)!;
      const grip={x:current.x+offset.x*plan.scale,y:current.y+offset.y*plan.scale};
      if(distance(grip,g.target!)>.01)throw new Error(`${g.id}: prop ${prop.id} grip anchor does not match pickup target`);
      if(g.destination)propPoints.set(prop.id,{x:g.destination.x-offset.x*plan.scale,y:g.destination.y-offset.y*plan.scale});
    }
    for(const walk of plan.walks.filter(w=>w.startMs<g.endMs&&w.endMs>g.startMs)){
      if(['operate','pick-place'].includes(g.action))throw new Error(`${g.id}: moving while attached requires a carry clip; not supported by this clip`);
      if(g.action==='carry'&&(walk.startMs<g.contactMs!+(enteringCarry(g)?0:CARRY_TRANSITION_MS)||walk.endMs>recoveryStart(g)-(g.releaseMs===undefined?0:CARRY_TRANSITION_MS)))throw new Error(`${g.id}: carry locomotion must fit after lift and before lowering window`);
    }
  }
  for(const prop of plan.props)overlaps(plan.gestures.filter(g=>attaches(g)&&g.propId===prop.id).map(g=>({startMs:g.contactMs!,endMs:g.releaseMs??g.endMs})),`prop ${prop.id} ownership`,plan.durationMs);
  for(const prop of plan.props.filter(p=>p.attachedTo)){
    const side=prop.attachedTo==='left-hand'?'left':'right';
    const hand=samplePerformance(plan,profile,0,{method:'segment-draft',windowMs:20,intervals:[]}).hands[side],offset=prop.gripOffset??{x:0,y:0};
    if(distance(hand,{x:prop.origin.x+offset.x*plan.scale,y:prop.origin.y+offset.y*plan.scale})>.01)throw new Error(`${prop.id}: entry grip anchor does not match the carried hand pose`);
  }
}

export interface FrameState {
  timeMs:number; root:Point; feet:Record<'left'|'right',Point>; stance:Record<'left'|'right',boolean>;
  bodyPosture:BodyPosture;
  hands:Record<'left'|'right',Point>; contactError:number; contactErrors:Record<RigHand,number>; mood:Mood;
  transforms:Record<string,string>; face:Record<string,{opacity?:number;scaleY?:number;rotation?:number;x?:number;y?:number}>;
  props:Record<string,{point:Point;attached:boolean}>;
}
const number = (n:number)=>String(Number(n.toFixed(4)));
function transform(p:Point,angle=0,scale=1):string {return `translate(${number(p.x)} ${number(p.y)}) rotate(${number(angle)}) scale(${number(scale)})`;}
function rootAt(plan:PerformancePlan,timeMs:number):Point {
  let x=plan.root.x;
  for(const walk of chronological(plan.walks)){ if(timeMs<walk.startMs)break; x=lerp(walk.fromX,walk.toX,smooth((timeMs-walk.startMs)/(walk.endMs-walk.startMs))); }
  return {x,y:plan.root.y};
}
function walkSteps(plan:PerformancePlan,profile:HostProfile,walk:PerformancePlan['walks'][number]){
  const m=rigMetrics(profile),stepLength=Math.max(8,m.upperLeg*.32)*plan.scale;
  const steps=Math.max(2,Math.ceil(Math.abs(walk.toX-walk.fromX)/stepLength)),span=(walk.endMs-walk.startMs)/steps;
  return Array.from({length:steps},(_,i)=>{
    const startMs=walk.startMs+i*span,endMs=i===steps-1?walk.endMs:walk.startMs+(i+1)*span,side=i%2?'right' as const:'left' as const;
    const landing=(i>=steps-2?walk.toX:rootAt(plan,endMs).x)+(side==='left'?-m.stance:m.stance)*plan.scale;
    return {i,startMs,endMs,side,landing};
  });
}
function gait(plan:PerformancePlan,profile:HostProfile,timeMs:number) {
  const m=rigMetrics(profile), scale=plan.scale;
  let feet={left:{x:plan.root.x-m.stance*scale,y:plan.root.y},right:{x:plan.root.x+m.stance*scale,y:plan.root.y}};
  const stance={left:true,right:true};let activation=0,phase=0,direction=1;
  for(const walk of chronological(plan.walks)){
    if(timeMs<walk.startMs)break;
    direction=Math.sign(walk.toX-walk.fromX)||1;
    for(const {i,startMs:start,endMs:end,side,landing} of walkSteps(plan,profile,walk)){
      if(timeMs<start)break;
      // Last two placements establish the final balanced stance, preserving shot-boundary continuity.
      const p=clamp((timeMs-start)/(end-start));
      feet={...feet,[side]:{x:lerp(feet[side].x,landing,smooth(p)),y:plan.root.y-Math.sin(Math.PI*p)*m.upperLeg*.25*scale}};
      if(p<1){stance[side]=false;phase=i+p;}
    }
    if(timeMs<walk.endMs){
      const transition=Math.min(180,(walk.endMs-walk.startMs)/4);
      activation=smooth((timeMs-walk.startMs)/transition)*smooth((walk.endMs-timeMs)/transition);
    }
  }
  return {feet,stance,activation,phase,direction};
}
function moodAt(plan:PerformancePlan,time:number):{mood:Mood;weight:number} {
  const e=plan.expressions.find(e=>time>=e.startMs&&time<e.endMs);
  if(!e)return {mood:'neutral',weight:0};
  return {mood:e.mood,weight:smooth((time-e.startMs)/140)*smooth((e.endMs-time)/140)};
}
function orientationAt(plan:PerformancePlan,time:number):number {
  const value={front:0,left:-1,right:1};let current=value[plan.facing??'front'];
  for(const turn of chronological(plan.turns??[])){
    if(time<turn.startMs)break;
    const next=value[turn.direction];
    if(time<turn.endMs)return lerp(current,next,smooth((time-turn.startMs)/(turn.endMs-turn.startMs)));
    current=next;
  }
  return current;
}
const moodPoses:Record<Mood,{brow:number;tilt:number;lean:number;smile:number;round:number;lid:number}>={
  neutral:{brow:0,tilt:0,lean:0,smile:0,round:0,lid:0},curious:{brow:-4,tilt:-7,lean:4,smile:0,round:0,lid:0},
  thinking:{brow:2,tilt:7,lean:-2,smile:0,round:0,lid:.3},concerned:{brow:4,tilt:-4,lean:-3,smile:0,round:0,lid:.25},
  effort:{brow:4,tilt:2,lean:5,smile:0,round:0,lid:.25},surprised:{brow:-7,tilt:-5,lean:-6,smile:0,round:1,lid:0},
  understanding:{brow:-1,tilt:3,lean:0,smile:1,round:0,lid:0},confident:{brow:-1,tilt:0,lean:0,smile:.7,round:0,lid:0},
};
function goal(g:Gesture,neutral:Point,chin:Point,carryAnchor:Point,time:number,scale:number,shoulder:Point):Point {
  const side=rigHand(g)==='left'?-1:1;
  const settle=Math.min(220,(g.endMs-g.startMs)*.18),recover=smooth((g.endMs-time)/settle);
  if(g.action==='pick-place'){
    const contact=g.contactMs!,release=g.releaseMs!,source=g.target!,dest=g.destination!;
    if(time<contact)return mix(neutral,source,smooth((time-g.startMs)/(contact-g.startMs)));
    if(time<release)return mix(source,dest,smooth((time-contact)/(release-contact)));
    return mix(dest,neutral,smooth((time-release)/(g.endMs-release)));
  }
  if(g.action==='carry'){
    const contact=g.contactMs!,release=g.releaseMs,source=g.target!,dest=g.destination;
    if(time<contact)return mix(neutral,source,smooth((time-g.startMs)/(contact-g.startMs)));
    if(!enteringCarry(g)&&time<contact+CARRY_TRANSITION_MS)return mix(source,carryAnchor,smooth((time-contact)/CARRY_TRANSITION_MS));
    if(release===undefined)return carryAnchor;
    if(time<release-CARRY_TRANSITION_MS)return carryAnchor;
    if(time<release)return mix(carryAnchor,dest!,smooth((time-release+CARRY_TRANSITION_MS)/CARRY_TRANSITION_MS));
    return mix(dest!,neutral,smooth((time-release)/(g.endMs-release)));
  }
  // A think target owns attention, while the hand owns the thoughtful chin pose.
  const aim=g.action==='think'?chin:g.target??(g.action==='react'?{x:neutral.x+25*side,y:neutral.y-110}:{x:neutral.x+55*side,y:neutral.y-45});
  if(g.action==='operate'){
    const contact=g.contactMs!,release=recoveryStart(g);
    return time<contact?mix(neutral,aim,smooth((time-g.startMs)/(contact-g.startMs))):time<=release?aim:mix(aim,neutral,smooth((time-release)/(g.endMs-release)));
  }
  const reach=g.contactMs??Math.min(g.endMs-settle,g.startMs+Math.min(320,(g.endMs-g.startMs)*.3));
  const progress=smooth((time-g.startMs)/(reach-g.startMs))*recover;
  if(g.action==='think'){
    // Follow an outward arc in shoulder space. A Cartesian curve can pass
    // almost through the shoulder on custom rigs and spin the IK elbow.
    if(progress===0)return neutral;
    if(progress===1)return chin;
    const start=Math.atan2(neutral.y-shoulder.y,neutral.x-shoulder.x);
    let end=Math.atan2(chin.y-shoulder.y,chin.x-shoulder.x);
    if(side===1){while(end>start)end-=Math.PI*2;}else{while(end<start)end+=Math.PI*2;}
    const angle=lerp(start,end,progress),radius=lerp(distance(shoulder,neutral),distance(shoulder,chin),progress);
    return {x:shoulder.x+Math.cos(angle)*radius,y:shoulder.y+Math.sin(angle)*radius};
  }
  return mix(neutral,aim,progress);
}

/** Rest elbows open away from the torso. Changing the IK pole passes through
 * extension; flipping two bent solutions directly would teleport the elbow. */
function armPose(shoulder:Point,neutral:Point,target:Point,gesture:Gesture|undefined,time:number,upper:number,lower:number,side:'left'|'right',aimAt:(time:number)=>Point):Chain{
  const restBend=side==='right'?1:-1;
  if(!gesture)return solveChain(shoulder,target,upper,lower,restBend);
  const activeBend=gesture.elbowPole==='rest'?restBend:-restBend;
  // Reaching below the shoulder can keep the outward rest elbow. Its fixed
  // pole needs no extension transition because it never changes branch.
  if(activeBend===restBend)return solveChain(shoulder,target,upper,lower,restBend);
  // Carried entry/exit must preserve the established grip at the cut.
  if(enteringCarry(gesture)&&time<gesture.startMs+80||gesture.action==='carry'&&gesture.releaseMs===undefined&&time>=gesture.endMs-80)
    return solveChain(shoulder,target,upper,lower,activeBend);
  const approachEnd=gesture.contactMs??gesture.startMs+(gesture.endMs-gesture.startMs)*.3;
  const enter=Math.min(80,(approachEnd-gesture.startMs)*.3);
  const exit=Math.min(80,(gesture.endMs-recoveryStart(gesture))*.5,(gesture.endMs-gesture.startMs)*.2);
  const dx=neutral.x-shoulder.x,dy=neutral.y-shoulder.y,r=Math.hypot(dx,dy);
  const extended={x:shoulder.x+dx/r*(upper+lower-1e-6),y:shoulder.y+dy/r*(upper+lower-1e-6)};
  let point=target,bend=activeBend;
  if(!enteringCarry(gesture)&&enter>0&&time<gesture.startMs+enter){
    const phase=(time-gesture.startMs)/enter;
    point=phase<.5?mix(neutral,extended,smooth(phase*2)):mix(extended,aimAt(gesture.startMs+enter),smooth((phase-.5)*2));
    bend=phase<.5?restBend:activeBend;
  }else if(exit>0&&time>gesture.endMs-exit){
    const phase=(time-gesture.endMs+exit)/exit;
    point=phase<.5?mix(aimAt(gesture.endMs-exit),extended,smooth(phase*2)):mix(extended,neutral,smooth((phase-.5)*2));
    bend=phase<.5?activeBend:restBend;
  }
  return solveChain(shoulder,point,upper,lower,bend);
}

/** Pure random-access evaluation: no state accumulated from previous frames. */
export function samplePerformance(plan:PerformancePlan,profile:HostProfile,time:number,activity:SpeechActivity):FrameState {
  const t=clamp(time,0,plan.durationMs),m=rigMetrics(profile),s=plan.scale,root=rootAt(plan,t),walk=gait(plan,profile,t),emotion=moodAt(plan,t),pose=moodPoses[emotion.mood];
  const transforms:Record<string,string>={},face:FrameState['face']={},hands={} as FrameState['hands'];
  transforms['ground-shadow']=transform({x:root.x,y:root.y+4});
  const orientation=orientationAt(plan,t);
  const bodyPosture=postureAt(plan,t);
  const lean=bodyPosture.leanDeg+pose.lean*emotion.weight+Math.sin(walk.phase*Math.PI)*walk.activation*1.5+orientation*3;
  const pelvis={x:root.x,y:root.y+m.pelvisY*s+Math.abs(m.pelvisY)*bodyPosture.pelvisDropRatio*s+walk.activation*m.upperLeg*.23*s};
  transforms.pelvis=transform(pelvis);transforms.chest=transform(pelvis,lean,s*profile.appearance.bodyScale);
  const toWorld=(x:number,y:number)=>add(pelvis,rotate({x:x*s,y:y*s},lean));
  const headAngle=lean+pose.tilt*emotion.weight,headBottom=(profile.kind==='mini-robot'?42:40)*profile.appearance.headScale;
  const torsoTop=(profile.kind==='mini-robot'?-94:-92)*profile.appearance.bodyScale;
  const neckStart=toWorld(0,torsoTop);
  const neckEnd=toWorld(0,Math.min(m.headY-m.pelvisY+headBottom,torsoTop-10*profile.appearance.bodyScale));
  const head=add(neckEnd,rotate({x:0,y:-headBottom*s},headAngle));
  transforms.neck=`translate(${number(neckStart.x)} ${number(neckStart.y)}) rotate(${number(degrees(Math.atan2(neckEnd.y-neckStart.y,neckEnd.x-neckStart.x))-90)}) scale(${number(s)} ${number(distance(neckStart,neckEnd))})`;
  transforms.head=transform(head,headAngle,s*profile.appearance.headScale);
  transforms['face-orientation']=transform({x:orientation*5,y:0},0,1-Math.abs(orientation)*.1);
  const chinAt=(side:RigHand)=>add(head,rotate({x:m.headRadius*.3*s*(side==='left'?-1:1),y:m.headRadius*.875*s},lean+pose.tilt*emotion.weight));
  for(const [i,side] of (['left','right'] as const).entries()){
    // One continuous bend branch, including rest, walk entry and recovery.
    const hip={x:pelvis.x+(i?1:-1)*m.hipOffset*s,y:pelvis.y},leg=solveChain(hip,walk.feet[side],m.upperLeg*s,m.lowerLeg*s,1);
    if(leg.error>1)throw new Error(`${plan.id}: ${side} foot cannot reach ground at ${t}ms (${leg.error.toFixed(2)}px)`);
    transforms[`leg-${side}-upper`]=transform(hip,leg.upper,s);transforms[`leg-${side}-lower`]=transform(leg.joint,leg.lower,s);
    transforms[`foot-${side}`]=transform(walk.feet[side],0,s);
    const shoulder=toWorld((i?1:-1)*m.shoulderOffset,m.shoulderY-m.pelvisY);
    const swing=Math.sin(walk.phase*Math.PI)*(i?-1:1)*25*walk.activation;
    const neutral=add(shoulder,rotate({x:(i?12:-12)*s,y:(m.upperArm+m.lowerArm-8)*s},swing));
    const gesture=gestureAt(plan,t,side),chin=chinAt(side);
    const carryAnchor=add(shoulder,rotate({x:(gesture?.carryOffset?.x??(i?50:-50))*s,y:(gesture?.carryOffset?.y??35)*s},lean));
    const target=gesture?goal(gesture,neutral,chin,carryAnchor,t,s,shoulder):neutral;
    const arm=armPose(shoulder,neutral,target,gesture,t,m.upperArm*s,m.lowerArm*s,side,
      at=>goal(gesture!,neutral,chin,carryAnchor,at,s,shoulder));
    if(gesture&&contacts(gesture)&&t>=gesture.contactMs!&&t<=recoveryStart(gesture)&&arm.error>1)throw new Error(`${gesture.id}: hand cannot reach contact at ${t}ms (${arm.error.toFixed(2)}px)`);
    transforms[`arm-${side}-upper`]=transform(shoulder,arm.upper,s);transforms[`arm-${side}-lower`]=transform(arm.joint,arm.lower,s);
    transforms[`hand-${side}`]=transform(arm.end,0,s);hands[side]=arm.end;
  }
  const activeGestures={right:gestureAt(plan,t,'right'),left:gestureAt(plan,t,'left')};
  const activeGesture=activeGestures.right?.target?activeGestures.right:activeGestures.left??activeGestures.right,explicitGaze=plan.gazes.find(g=>t>=g.startMs&&t<g.endMs);
  const gazeOffset=(target:Point)=>{const angle=Math.atan2(target.y-head.y,target.x-head.x);return {x:Math.cos(angle)*3,y:Math.sin(angle)*2};};
  const gazeWeight=(cue:{startMs:number;endMs:number})=>smooth((t-cue.startMs)/140)*smooth((cue.endMs-t)/140);
  let gaze={x:0,y:0};
  if(activeGesture?.target)gaze=mix(gaze,gazeOffset(activeGesture.target),gazeWeight(activeGesture));
  if(explicitGaze)gaze=mix(gaze,gazeOffset(explicitGaze.target),gazeWeight(explicitGaze));
  const blinkPhase=(t+800)%3500,blink=blinkPhase<140?Math.sin(Math.PI*blinkPhase/140):0;
  for(const [i,side] of (['left','right'] as const).entries()){
    face[`eye-${side}`]={x:gaze.x,y:gaze.y,scaleY:Math.max(.05,1-blink)};
    face[`brow-${side}`]={y:pose.brow*emotion.weight,rotation:(i?-1:1)*(emotion.mood==='concerned'?12:emotion.mood==='effort'?-12:0)*emotion.weight};
    face[`lid-${side}`]={opacity:pose.lid*emotion.weight};
  }
  const speech=activity.intervals.find(a=>t>=a.startMs&&t<a.endMs);
  face['mouth-talk']={opacity:speech?1:1-Math.max(pose.smile,pose.round)*emotion.weight,scaleY:speech?1+speech.level*2.3:.2};
  face['mouth-smile']={opacity:pose.smile*emotion.weight};
  face['mouth-round']={opacity:pose.round*emotion.weight};
  const props:FrameState['props']={},contactErrors:FrameState['contactErrors']={left:0,right:0};let contactError=0;
  for(const prop of plan.props){
    let point=prop.origin,attached=false;
    const offset=prop.gripOffset??{x:0,y:0};
    for(const g of chronological(plan.gestures).filter(g=>attaches(g)&&g.propId===prop.id)){
      if(g.releaseMs!==undefined&&t>=g.releaseMs){point={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};attached=false;}
      else if(t>=g.contactMs!){const hand=hands[rigHand(g)];point={x:hand.x-offset.x*s,y:hand.y-offset.y*s};attached=true;}
    }
    props[prop.id]={point,attached};transforms[`prop-${prop.id}`]=transform(point,0,s);
  }
  for(const side of ['left','right'] as const){const gesture=activeGestures[side];
  if(gesture&&contacts(gesture)&&t>=gesture.contactMs!&&t<=recoveryStart(gesture)){
    const shoulder=toWorld(m.shoulderOffset*(side==='left'?-1:1),m.shoulderY-m.pelvisY);
    const anchor=add(shoulder,rotate({x:(gesture.carryOffset?.x??(side==='left'?-50:50))*s,y:(gesture.carryOffset?.y??35)*s},lean));
    const expected=gesture.action==='carry'?goal(gesture,hands[side],chinAt(side),anchor,t,s,shoulder):gesture.action==='operate'?gesture.target!:mix(gesture.target!,gesture.destination!,smooth((t-gesture.contactMs!)/(gesture.releaseMs!-gesture.contactMs!)));
    contactErrors[side]=distance(hands[side],expected);contactError=Math.max(contactError,contactErrors[side]);
    if(contactErrors[side]>1)throw new Error(`${gesture.id}: ${side} hand misses contact anchor at ${t}ms (${contactErrors[side].toFixed(2)}px)`);
  }
  }
  return {timeMs:t,root,feet:walk.feet,stance:walk.stance,bodyPosture,hands,transforms,face,props,mood:emotion.mood,contactError,contactErrors};
}

function transformNumbers(value:string):number[] {return value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);}
function unwrapFrame(frame:FrameState,previous:FrameState):FrameState {
  const transforms={...frame.transforms};
  for(const [id,value] of Object.entries(transforms)){
    const prior=previous.transforms[id];if(!prior)continue;
    const angle=transformNumbers(value)[2]!,reference=transformNumbers(prior)[2]!;
    const unwrapped=angle+Math.round((reference-angle)/360)*360;
    transforms[id]=value.replace(/rotate\([^)]*\)/,`rotate(${number(unwrapped)})`);
  }
  return {...frame,transforms};
}
function interpolationGap(a:FrameState,b:FrameState,profile:HostProfile):number {
  const m=rigMetrics(profile);let gap=0;
  for(const progress of [.17,.5,.83]){
    const at=(id:string)=>{const x=transformNumbers(a.transforms[id]!),y=transformNumbers(b.transforms[id]!);return x.map((n,i)=>lerp(n,y[i]!,progress));};
    const end=(values:number[],length:number)=>({x:values[0]!-Math.sin(rad(values[2]!))*length*values[3]!,y:values[1]!+Math.cos(rad(values[2]!))*length*values[3]!});
    const origin=(values:number[])=>({x:values[0]!,y:values[1]!});
    for(const side of ['left','right']){
      for(const part of ['arm','leg']){
        const upper=at(`${part}-${side}-upper`),lower=at(`${part}-${side}-lower`),tip=at(`${part==='arm'?'hand':'foot'}-${side}`);
        gap=Math.max(gap,distance(end(upper,part==='arm'?m.upperArm:m.upperLeg),origin(lower)),
          distance(end(lower,part==='arm'?m.lowerArm:m.lowerLeg),origin(tip)));
      }
    }
    const neck=at('neck'),head=at('head'),bottom=(profile.kind==='mini-robot'?42:40)*head[3]!;
    gap=Math.max(gap,distance({x:neck[0]!-Math.sin(rad(neck[2]!))*neck[4]!,y:neck[1]!+Math.cos(rad(neck[2]!))*neck[4]!},
      {x:head[0]!-Math.sin(rad(head[2]!))*bottom,y:head[1]!+Math.cos(rad(head[2]!))*bottom}));
  }
  return gap;
}

export function compilePerformance(plan:PerformancePlan,profile:HostProfile,activity:SpeechActivity) {
  validatePerformance(plan,profile);
  const times=new Set<number>([0,plan.durationMs]);
  for(let ms=0;ms<plan.durationMs;ms+=1000/plan.fps)times.add(Number(ms.toFixed(4)));
  for(const clip of [...plan.gestures,...plan.walks,...(plan.turns??[]),...(plan.postures??[]),...plan.expressions,...plan.gazes,...activity.intervals]){
    for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)times.add(at);
  }
  for(const g of plan.gestures)for(const at of [g.contactMs,g.releaseMs,recoveryStart(g)])if(at!==undefined){times.add(at);times.add(at-.01);times.add(at+.01);}
  for(const g of plan.gestures.filter(g=>g.action==='carry')){
    if(!enteringCarry(g))times.add(g.contactMs!+CARRY_TRANSITION_MS);
    if(g.releaseMs!==undefined)times.add(g.releaseMs-CARRY_TRANSITION_MS);
  }
  for(const walk of plan.walks)for(const step of walkSteps(plan,profile,walk))for(const at of [step.startMs,step.endMs])times.add(at);
  // Audio RMS is a sampled signal: its boundaries are explicit, without blending across silence.
  for(const cue of activity.intervals)for(const at of [cue.startMs,cue.endMs]){times.add(at);times.add(at-.01);}
  const samples=[...new Set([...times].filter(t=>t>=0&&t<=plan.durationMs).map(t=>Number(t.toFixed(4))))].sort((a,b)=>a-b).map(t=>samplePerformance(plan,profile,t,activity));
  const frames:FrameState[]=[samples[0]!];
  const refine=(a:FrameState,raw:FrameState,depth=0):FrameState[]=>{
    const b=unwrapFrame(raw,a),gap=interpolationGap(a,b,profile);
    if(gap<=.2)return [b];
    const middle=Number(((a.timeMs+b.timeMs)/2).toFixed(4));
    if(depth>=12||middle<=a.timeMs||middle>=b.timeMs)throw new Error(`${plan.id}: needs-animation: interpolation cannot maintain connected bones near ${middle}ms (${gap.toFixed(2)}px)`);
    const left=refine(a,samplePerformance(plan,profile,middle,activity),depth+1);
    return [...left,...refine(left.at(-1)!,raw,depth+1)];
  };
  for(const sample of samples.slice(1))frames.push(...refine(frames.at(-1)!,sample));
  const calls:string[]=[],scope=`[data-composition-id="${plan.id}"]`,selector=(id:string)=>JSON.stringify(`${scope} #${id}`);
  for(const [i,f] of frames.entries()){
    const at=i?(frames[i-1]!.timeMs/1000):0,duration=i?Number(((f.timeMs-frames[i-1]!.timeMs)/1000).toFixed(6)):0,method=i?'to':'set';
    for(const [id,value] of Object.entries(f.transforms))if(!i||value!==frames[i-1]!.transforms[id])calls.push(`tl.${method}(${selector(id)},${JSON.stringify({attr:{transform:value},...(i?{duration,ease:'none'}:{immediateRender:true})})},${Number(at.toFixed(6))});`);
    for(const [id,value] of Object.entries(f.face))if(!i||JSON.stringify(value)!==JSON.stringify(frames[i-1]!.face[id]))calls.push(`tl.${method}(${selector(id)},${JSON.stringify({...value,...(i?{duration,ease:'none'}:{immediateRender:true})})},${Number(at.toFixed(6))});`);
  }
  return {js:calls.join('\n'),frames,report:{compilerVersion:ANIMATION_VERSION,planHash:hash(plan),profileHash:profile.profileHash,
    durationMs:plan.durationMs,fps:plan.fps,frames:frames.length,maxContactError:Math.max(...frames.map(f=>f.contactError)),
    maxHandContactError:{left:Math.max(...frames.map(f=>f.contactErrors.left)),right:Math.max(...frames.map(f=>f.contactErrors.right))},gestureHands:[...new Set(plan.gestures.map(rigHand))],
    maxInterpolationGapPx:Math.max(...frames.slice(1).map((f,i)=>interpolationGap(frames[i]!,f,profile))),interpolationGapLimitPx:.2,selectedClips:selectedClips(plan),
    source:'compiled-fixed-length-bones',synchronization:activity.method,phonemeLipSync:false}};
}
