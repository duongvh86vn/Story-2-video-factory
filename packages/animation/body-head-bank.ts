import type {HostProfile} from '../host/schemas.js';
import type {PerformancePlan} from './schemas.js';
import type {ViewActingClock} from './view-acting-clock.js';
import {NativeHeadBankSchema,type NativeHeadBank} from './native-head-bank.js';
import {NativeHeadTrackSchema,nativeHeadCellAt,validateNativeHeadSource} from './native-head-track.js';

export function hasNativeHeadBank(profile:Pick<HostProfile,'appearance'>){return profile.appearance.bodyHeadBank!==undefined;}
export function registeredNativeHeadBank(profile:Pick<HostProfile,'appearance'>):NativeHeadBank{
  const a=profile.appearance,b=NativeHeadBankSchema.parse(a.bodyHeadBank);
  if(a.artworkVersion!=='forest-body-view-1'||a.characterVariant!==b.actor||!a.bodyView||!b.bodyViews.some(v=>v.view===a.bodyView))throw new Error('needs-head-turn-registration: head bank has another actor or incompatible body source');
  if(a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary)throw new Error('needs-head-turn-registration: fixed-view face/hair overlays cannot be used on different head cells');
  return b;
}
export function validateNativeHeadBankTrack(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>){
  if(!hasNativeHeadBank(profile)&&!plan.sourceHead)return;
  if(!hasNativeHeadBank(profile)||!plan.sourceHead)throw new Error('needs-head-turn-registration: head bank and complete source track must be selected together');
  const bank=registeredNativeHeadBank(profile),track=NativeHeadTrackSchema.parse(plan.sourceHead),known=new Set(bank.cells.map(c=>c.id));
  if(track.ownerId!==plan.leadCharacterId||track.bankFingerprint!==bank.fingerprint||plan.headTurns?.length)throw new Error('needs-head-source-phase: head source actor/bank differs or local turn conflicts');
  const permitted=new Set(bank.routes.flatMap(route=>route.slice(1).map((id,i)=>route[i]+'\0'+id)));
  for(const [i,sample] of track.samples.entries()){
    if(!known.has(sample.cell))throw new Error('needs-head-turn-registration: head route requests an unregistered cell');
    if(i&&!permitted.has(track.samples[i-1]!.cell+'\0'+sample.cell))throw new Error('needs-head-turn-registration: head route skips an authored transition');
  }
  if(plan.gazes.length)throw new Error('needs-head-turn-eyes: cell-specific directional eyes/occlusion are not registered');
  if(plan.expressions.some(e=>e.mood!=='neutral'&&!bank.cells.every(c=>c.restMood===e.mood)))throw new Error('needs-head-turn-expression: cell-specific emotional artwork is not registered');
}
export function nativeHeadBankCell(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>,timeMs:number,clock?:ViewActingClock){
  if(!Number.isFinite(timeMs)||timeMs<0||timeMs>plan.durationMs)throw new Error('needs-head-source-phase: head seek is outside the local shot');
  return nativeHeadBankCellAtGlobal(plan,profile,timeMs+(clock?.startMs??0),clock);
}
/** Original-history references (for a source-owned chin gesture) may precede
 * a camera slice, but can never leave the explicitly owned complete source. */
export function nativeHeadBankCellAtGlobal(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>,globalMs:number,clock?:ViewActingClock){
  const bank=registeredNativeHeadBank(profile);validateNativeHeadBankTrack(plan,profile);
  if(!clock?.headMotion)throw new Error('needs-head-source-phase: head cells require their complete storyboard source context');
  if(clock.ownerId!==plan.leadCharacterId)throw new Error('needs-head-source-phase: head clock owner differs');
  validateNativeHeadSource(plan,clock.headMotion,clock.startMs,clock.endMs,clock.runStartMs,clock.runEndMs);
  // A discrete artwork switch also switches its measured chin. Until smooth
  // correspondence/contact tracks exist, do not ask continuous arm refinement
  // to hide that finite discontinuity by stretching or teleporting the hand.
  for(const g of plan.gestures.filter(g=>g.action==='think')){
    const start=g.sourceSpan?.startMs??g.startMs+clock.startMs,end=g.sourceSpan?.endMs??g.endMs+clock.startMs;
    if(clock.headMotion.samples.slice(1).some(s=>{const at=s.atMs+clock.headMotion!.startMs;return at>start&&at<end;}))throw new Error('needs-head-turn-interaction: a head cell change during chin contact needs a registered continuous contact track');
  }
  const track=clock.headMotion,sample=nativeHeadCellAt(track,track.startMs,globalMs-track.startMs,track.endMs-track.startMs),cell=bank.cells.find(c=>c.id===sample.cell);
  if(!cell)throw new Error('needs-head-turn-registration: source cell is missing');
  return {bank,cell,sample};
}
export function nativeHeadCellAngle(cell:NativeHeadBank['cells'][number]){return -90-Math.atan2(cell.neckTop.y-cell.neck.y,cell.neckTop.x-cell.neck.x)*180/Math.PI;}
export function nativeHeadCellPoint(bank:NativeHeadBank,cell:NativeHeadBank['cells'][number],point:{x:number;y:number}){
  const a=nativeHeadCellAngle(cell)*Math.PI/180,x=(point.x-cell.neck.x)*bank.unitScale,y=(point.y-cell.neck.y)*bank.unitScale;
  return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};
}
export function nativeHeadBankBounds(bank:NativeHeadBank){
  const points=bank.cells.flatMap(cell=>[cell.crop.x,cell.crop.x+cell.crop.width].flatMap(x=>[cell.crop.y,cell.crop.y+cell.crop.height].map(y=>nativeHeadCellPoint(bank,cell,{x,y}))));
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
export function nativeHeadBankFace(bank:NativeHeadBank,cellId:string){
  if(!bank.cells.some(c=>c.id===cellId))throw new Error('needs-head-turn-registration: selected face cell is missing');
  return Object.fromEntries(bank.cells.map((cell,i)=>['head-view-bank-'+i,{opacity:cell.id===cellId?1:0}]));
}
/** Source asset is drawn once, then referenced by each cell's own crop and
 * uniform attachment. No anatomical labels or coordinates are mirrored. */
export function nativeHeadBankSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const bank=registeredNativeHeadBank(profile),s=bank.source,url=imageUrl(s.file,s.sha256);
  if(url!=='assets/rigs/'+s.sha256+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))throw new Error('Unapproved native head bank image URL');
  return `<g data-head-bank="${bank.fingerprint}" stroke="none"><defs><image id="native-head-bank-source" width="${s.width}" height="${s.height}" href="${url}"/>${bank.cells.map((c,i)=>`<clipPath id="native-head-bank-clip-${i}"><rect x="${c.crop.x}" y="${c.crop.y}" width="${c.crop.width}" height="${c.crop.height}"/></clipPath>`).join('')}</defs>${bank.cells.map((c,i)=>`<g id="head-view-bank-${i}" opacity="0"><g transform="scale(${bank.unitScale}) rotate(${nativeHeadCellAngle(c)}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#native-head-bank-clip-${i})"><use href="#native-head-bank-source"/></g></g>`).join('')}</g>`;
}
