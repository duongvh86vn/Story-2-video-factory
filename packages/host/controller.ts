import type { Shot } from '../core/schemas.js';
import type { HostProfile, HostRig } from './schemas.js';
import type { SpeechActivity } from '../voice/schemas.js';
import { ModelHandleAnchorSchema } from '../director/art-direction-schemas.js';
import {ModelContactFrameSchema} from '../director/model-contact-reference.js';
import type {SourceInteractionRecord} from '../director/source-interactions.js';
import type {SourceSpearInteractionRecord} from '../director/source-spear-interactions.js';

export const HOST_CONTROLLER_VERSION = 'host-controller-2.1.1';
const radians = (n: number) => n * Math.PI / 180;
const degrees = (n: number) => n * 180 / Math.PI;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export interface Anchor { x: number; y: number; }
export interface HostGeometry { controllerVersion: string; profileHash: string; rigHash: string; shotId: string; hostHeightRatio: number;
  interactions: Array<{ actorId?:string; handSide?:'left'|'right'; type: string; startMs: number; reachMs: number; endMs: number; partId: string; target: Anchor; hand: Anchor; errorPx: number; root: Anchor; gaze: Anchor; contactMs?: number;
    sourceGesture?:{id:string;originalReachMs:number;originalRecoverMs:number;samplePhase:'approach'|'hold'|'recovery';contactVerified:false};sourceManipulation?:SourceInteractionRecord;sourceSpear?:SourceSpearInteractionRecord }> }

/** Two fixed-length bones. All calculations run at compile time, never in scene JS. */
export function solveArm(dx: number, dy: number): { upper: number; lower: number; hand: Anchor; reachable: boolean } {
  const actual = Math.hypot(dx, dy), distance = clamp(actual, 5.001, 104.999), angle = Math.atan2(dy, dx);
  const lower = Math.acos(clamp((distance * distance - 55 * 55 - 50 * 50) / (2 * 55 * 50), -1, 1));
  const absolute = angle - Math.atan2(50 * Math.sin(lower), 55 + 50 * Math.cos(lower));
  return { upper: degrees(absolute) - 90, lower: degrees(lower),
    hand: { x: 55 * Math.cos(absolute) + 50 * Math.cos(absolute + lower), y: 55 * Math.sin(absolute) + 50 * Math.sin(absolute + lower) }, reachable: actual <= 105 && actual >= 5 };
}
export function partAnchor(shot: Shot, partId: string, kind: 'center' | 'handle' | 'label', width: number, height: number): Anchor {
  const p = shot.visualization?.parts.find(p => p.id === partId); if (!p) throw new Error(`${shot.id}: unknown anchor part ${partId}`);
  const art=shot.cinematic?.artDirection?.models.find(model=>model.partId===partId),frame=art?.contactFrame?ModelContactFrameSchema.parse(art.contactFrame):undefined;
  const declared=kind==='label'?undefined:frame?.anchors[kind]??(kind==='handle'?art?.handleAnchor:undefined);
  if(frame&&kind==='handle'&&!declared)throw new Error(`${shot.id}: projected contact frame has no own handle`);
  if (declared !== undefined) {
    const anchor = ModelHandleAnchorSchema.parse(declared);
    return { x: width * (p.x + (anchor.x - .5) * p.width), y: height * (p.y + (anchor.y - .5) * p.height) };
  }
  return { x: width * (p.x + (kind === 'handle' ? -p.width * .35 : 0)), y: height * (p.y + (kind === 'label' ? -p.height / 2 - .025 : 0)) };
}
export function hostController(shot: Shot, profile: HostProfile, rig: HostRig, width: number, height: number, activity: SpeechActivity): { js: string; pointers: string; geometry: HostGeometry } {
  if (!shot.host || !shot.visualization) throw new Error('Host controller requires an explainer shot');
  if(shot.host.actions.some(a=>a.sourceSpear||['hold-tool','thrust-tool'].includes(a.type)))throw new Error(`${shot.id}: needs-source-prop-binding: original tool actions require their own cinematic actor/shaft clock; legacy host poses cannot replace them`);
  const scope = `[data-composition-id="${shot.id}"]`, target = (s: string) => JSON.stringify(`${scope} ${s}`), scale = height * .36 / rig.viewBox[3], bodyScale = profile.appearance.bodyScale;
  const pivot=(id:string)=>rig.parts.find(p=>p.id===id)!.pivot,shoulderY=pivot('arm-right-upper').y;
  const base = { x: width * .055, y: height * .39 }, calls: string[] = [], lines: string[] = [];
  const relative = (ms: number) => Number(((ms - shot.startMs) / 1000).toFixed(6));
  const set = (s: string, vars: object, at: number) => calls.push(`tl.set(${target(s)},${JSON.stringify(vars)},${at});`);
  const to = (s: string, vars: object, at: number) => calls.push(`tl.to(${target(s)},${JSON.stringify(vars)},${at});`);
  const geometry: HostGeometry = { controllerVersion: HOST_CONTROLLER_VERSION, profileHash: profile.profileHash, rigHash: rig.rigHash, shotId: shot.id, hostHeightRatio: .36, interactions: [] };
  set('.host-carrier', { x: base.x, y: base.y, opacity: shot.host.presence === 'absent' ? 0 : 1 }, 0);
  for (const [id, x] of [['arm-right-upper',208],['arm-left-upper',112],['arm-right-lower',208],['arm-left-lower',112]] as const) {
    set(`#${id}`, { rotation: 0, svgOrigin: `${x} ${pivot(id).y}` }, 0);
  }
  set('#mouth', { scaleY: .2, svgOrigin: `160 ${pivot('mouth').y}` }, 0);
  for (const [i, action] of shot.host.actions.entries()) {
    const targets = action.target ? [action.target, ...(action.secondTarget ? [action.secondTarget] : [])] : [];
    const span = action.endMs - action.startMs;
    const pose=rig.poses[action.type]??rig.poses.explain!;
    for(const id of ['arm-left-upper','arm-left-lower'])to(`#${id}`,{rotation:pose.rotations[id]??0,duration:Math.min(.25,span/2000),ease:'sine.inOut'},relative(action.startMs));
    if (!targets.length) {
      const pose = rig.poses[action.type] ?? rig.poses.explain!;
      for (const [id, rotation] of Object.entries(pose.rotations)) to(`#${id}`, { rotation, duration: Math.min(.25, span / 2000), ease: 'sine.inOut' }, relative(action.startMs));
      continue;
    }
    for (const [j, t] of targets.entries()) {
      const startMs = action.startMs + Math.floor(j * span / targets.length), endMs = action.startMs + Math.floor((j + 1) * span / targets.length);
      const anchor = partAnchor(shot, t.partId, t.anchor, width, height);
      const moving = ['operate-model', 'walk-to-marker'].includes(action.type);
      const shoulderLocal = { x: 160 + 48 * bodyScale-rig.viewBox[0], y: shoulderY-rig.viewBox[1] };
      const root = moving ? { x: clamp(anchor.x - (shoulderLocal.x + 78 * bodyScale) * scale, width * .02, width - rig.viewBox[2] * scale - width * .02),
        y: clamp(anchor.y - shoulderLocal.y * scale, height * .02, height * .78 - height*.36) } : base;
      if(moving){const dy=(anchor.y-root.y-shoulderLocal.y*scale)/(scale*bodyScale),reachX=Math.min(78,Math.sqrt(Math.max(0,95*95-dy*dy)));root.x=clamp(anchor.x-(shoulderLocal.x+reachX*bodyScale)*scale,width*.02,width-rig.viewBox[2]*scale-width*.02);}
      const shoulder = { x: root.x + shoulderLocal.x * scale, y: root.y + shoulderLocal.y * scale };
      const arm = solveArm((anchor.x - shoulder.x) / (scale * bodyScale), (anchor.y - shoulder.y) / (scale * bodyScale));
      const hand = { x: shoulder.x + arm.hand.x * scale * bodyScale, y: shoulder.y + arm.hand.y * scale * bodyScale };
      const errorPx = Math.hypot(hand.x - anchor.x, hand.y - anchor.y);
      if (action.type === 'operate-model' && (!arm.reachable || errorPx > 2)) throw new Error(`${shot.id}: host cannot reach ${t.partId} without stretching its arm`);
      const reachMs = action.type === 'operate-model' ? action.contactMs! : startMs + Math.min(280, Math.floor((endMs - startMs) * .25));
      const duration = Math.max(.001, (reachMs - startMs) / 1000), at = relative(startMs);
      to('.host-carrier', { x: root.x, y: root.y, duration, ease: 'sine.inOut' }, at);
      to('#arm-right-upper', { rotation: arm.upper, duration, ease: 'sine.inOut' }, at);
      to('#arm-right-lower', { rotation: arm.lower, duration, ease: 'sine.inOut' }, at);
      const gaze = { x: root.x + (160-rig.viewBox[0]) * scale, y: root.y + (pivot('eye-left').y-rig.viewBox[1]) * scale }, direction = Math.atan2(anchor.y - gaze.y, anchor.x - gaze.x);
      for (const eye of ['eye-left','eye-right']) to(`#${eye}`, { x: Math.cos(direction) * 5, y: Math.sin(direction) * 3, duration, ease: 'sine.inOut' }, at);
      const pointerId = `pointer-${i}-${j}`;
      lines.push(`<g class="pointer" id="${pointerId}"><path d="M${hand.x.toFixed(3)} ${hand.y.toFixed(3)}L${anchor.x.toFixed(3)} ${anchor.y.toFixed(3)}"/><circle cx="${anchor.x.toFixed(3)}" cy="${anchor.y.toFixed(3)}" r="${Math.max(3,height*.004)}"/></g>`);
      set(`#${pointerId}`, { opacity: 0 }, 0);
      set(`#${pointerId}`, { opacity: action.type === 'operate-model' ? 0 : 1 }, relative(reachMs));
      set(`#${pointerId}`, { opacity: 0 }, relative(endMs));
      if (action.type === 'walk-to-marker') {
        const robot = profile.kind === 'mini-robot';
        const joints = robot ? [['leg-left','137 284'],['leg-right','182 284']] : [['leg-left-upper','160 235'],['leg-right-upper','160 235']];
        for (const [k, [id,pivot]] of joints.entries()) {
          set(`#${id}`, { svgOrigin: pivot }, at);
          to(`#${id}`, { rotation: k ? -12 : 12, duration: duration / 2 }, at);
          to(`#${id}`, { rotation: 0, duration: duration / 2 }, at + duration / 2);
        }
      }
      geometry.interactions.push({ type: action.type, startMs, reachMs, endMs, partId: t.partId, target: anchor, hand, errorPx,
        root, gaze, ...(action.contactMs !== undefined ? { contactMs: action.contactMs } : {}) });
    }
  }
  for (const interval of activity.intervals) {
    const start = Math.max(shot.startMs, interval.startMs), end = Math.min(shot.endMs, interval.endMs); if (end <= start) continue;
    set('#mouth', { scaleY: .8 + interval.level * 2.2 }, relative(start));
    set('#mouth', { scaleY: .2 }, relative(end));
  }
  for (let at = 2.4; at + .15 < (shot.endMs - shot.startMs) / 1000; at += 3.2) for (const eye of ['eye-left','eye-right']) {
    set(`#${eye}`, { scaleY: .08, svgOrigin: `${eye === 'eye-left' ? 137 : 180} ${pivot(eye).y}` }, at);
    set(`#${eye}`, { scaleY: 1 }, at + .12);
  }
  return { js: calls.join('\n'), pointers: lines.join(''), geometry };
}
