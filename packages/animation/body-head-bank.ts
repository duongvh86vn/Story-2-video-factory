import type {HostProfile} from '../host/schemas.js';
import type {PerformancePlan} from './schemas.js';
import type {ViewActingClock} from './view-acting-clock.js';
import {NativeHeadBankSchema,nativeHeadSources,nativeHeadSourceForCell,nativeHeadPixelScale,type NativeHeadBank} from './native-head-bank.js';
import {NativeHeadTrackSchema,nativeHeadCellAt,validateNativeHeadSource} from './native-head-track.js';
import {nativeHeadFaceSvg,nativeHeadFaceState,nativeHeadFaceMatrixError,type NativeFaceState,type NativeFaceEmotion} from './native-head-face.js';
import {nativeHeadIdentityMatches,isNativeHeadFaceVersion} from './native-head-identity.js';
import {nativeHeadPaintDefs} from './native-head-paint.js';
import {nativeRearFollowSvg,nativeRearFollowMargin,nativeRearFollowState,nativeRearFollowMatrixError} from './native-head-follow.js';

export function hasNativeHeadBank(profile:Pick<HostProfile,'appearance'>){return profile.appearance.bodyHeadBank!==undefined;}
export function hasNativeHeadSpeech(profile:Pick<HostProfile,'appearance'>){return hasNativeHeadBank(profile)&&registeredNativeHeadBank(profile).capabilities.speech;}
export function hasNativeHeadEyes(profile:Pick<HostProfile,'appearance'>){return hasNativeHeadBank(profile)&&registeredNativeHeadBank(profile).capabilities.directionalEyes;}
export function hasNativeHeadRear(profile:Pick<HostProfile,'appearance'>){return hasNativeHeadBank(profile)&&registeredNativeHeadBank(profile).cells.some(c=>c.paint?.rear.length);}
export function hasNativeHeadSecondary(profile:Pick<HostProfile,'appearance'>){return hasNativeHeadBank(profile)&&registeredNativeHeadBank(profile).capabilities.secondary;}
export function registeredNativeHeadBank(profile:Pick<HostProfile,'appearance'>):NativeHeadBank{
  const a=profile.appearance,b=NativeHeadBankSchema.parse(a.bodyHeadBank);
  if(a.artworkVersion!=='forest-body-view-1'||!nativeHeadIdentityMatches(a,b.actor)||!a.bodyView||!b.bodyViews.some(v=>v.view===a.bodyView))throw new Error('needs-head-turn-registration: head bank has another actor or incompatible body source');
  if(a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary)throw new Error('needs-head-turn-registration: fixed-view face/hair overlays cannot be used on different head cells');
  return b;
}
export function validateNativeHeadBankTrack(plan:PerformancePlan,profile:Pick<HostProfile,'appearance'>){
  if(!hasNativeHeadBank(profile)&&!plan.sourceHead)return;
  if(!hasNativeHeadBank(profile)||!plan.sourceHead)throw new Error('needs-head-turn-registration: head bank and complete source track must be selected together');
  const bank=registeredNativeHeadBank(profile),track=NativeHeadTrackSchema.parse(plan.sourceHead),known=new Set(bank.cells.map(c=>c.id));
  if(bank.capabilities.secondary&&new Set(track.samples.map(s=>s.cell)).size>1)throw new Error('needs-head-turn-secondary: source-cell changes need authored continuous rear-hair correspondence');
  if(track.ownerId!==plan.leadCharacterId||track.bankFingerprint!==bank.fingerprint||plan.headTurns?.length)throw new Error('needs-head-source-phase: head source actor/bank differs or local turn conflicts');
  const permitted=new Set(bank.routes.flatMap(route=>route.slice(1).map((id,i)=>route[i]+'\0'+id)));
  for(const [i,sample] of track.samples.entries()){
    if(!known.has(sample.cell))throw new Error('needs-head-turn-registration: head route requests an unregistered cell');
    if(i&&!permitted.has(track.samples[i-1]!.cell+'\0'+sample.cell))throw new Error('needs-head-turn-registration: head route skips an authored transition');
  }
  if(plan.gazes.length&&!bank.capabilities.directionalEyes)throw new Error('needs-head-turn-eyes: cell-specific directional eyes/occlusion are not registered');
  if(!bank.capabilities.expressions&&plan.expressions.some(e=>e.mood!=='neutral'&&!bank.cells.every(c=>c.restMood===e.mood)))throw new Error('needs-head-turn-expression: cell-specific emotional artwork is not registered');
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
  const a=nativeHeadCellAngle(cell)*Math.PI/180,scale=nativeHeadPixelScale(bank,cell),x=(point.x-cell.neck.x)*scale,y=(point.y-cell.neck.y)*scale;
  return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};
}
export function nativeHeadBankBounds(bank:NativeHeadBank){
  const points=bank.cells.flatMap(cell=>{const margin=cell.paint?nativeRearFollowMargin(cell.paint):0;return [cell.crop.x-margin,cell.crop.x+cell.crop.width+margin].flatMap(x=>[cell.crop.y-margin,cell.crop.y+cell.crop.height+margin].map(y=>nativeHeadCellPoint(bank,cell,{x,y})));});
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
export function nativeHeadBankFace(bank:NativeHeadBank,cellId:string){
  if(!bank.cells.some(c=>c.id===cellId))throw new Error('needs-head-turn-registration: selected face cell is missing');
  return Object.fromEntries(bank.cells.flatMap((cell,i)=>[['head-view-bank-'+i,{opacity:cell.id===cellId?1:0}],...(cell.paint?.rear.length?[['head-back-view-bank-'+i,{opacity:cell.id===cellId?1:0}]]:[])]));
}
/** Every cell retains stable path/selector keys across discrete view changes. */
export function nativeHeadBankFacialState(bank:NativeHeadBank,input:{aperture:number;blink:number;look:{x:number;y:number};emotion?:NativeFaceEmotion}):NativeFaceState{
  if(!isNativeHeadFaceVersion(bank.version)||!bank.capabilities.speech||!bank.capabilities.directionalEyes||bank.cells.some(c=>!c.face))throw new Error('needs-head-face-registration: complete source-face bank3/4/5/6 capabilities required');
  if(input.emotion&&!bank.capabilities.expressions)throw new Error('needs-head-turn-expression: explicit bank5 emotions required');
  const face:NativeFaceState['face']={},paths:Record<string,string>={};
  for(const [i,cell] of bank.cells.entries())if(cell.face){const a=-nativeHeadCellAngle(cell)*Math.PI/180,look={x:input.look.x*Math.cos(a)-input.look.y*Math.sin(a),y:input.look.x*Math.sin(a)+input.look.y*Math.cos(a)};
    const state=nativeHeadFaceState(cell.face,{...input,look},'native-face-'+i);Object.assign(face,state.face);Object.assign(paths,state.paths);
  }return {face,paths};
}
export function nativeHeadBankFacialError(bank:NativeHeadBank,from:NativeFaceState['face'],to:NativeFaceState['face'],wanted:NativeFaceState['face'],progress:number){
  let error=0;for(const [i,cell] of bank.cells.entries())if(cell.face)error=Math.max(error,nativeHeadFaceMatrixError(cell.face,'native-face-'+i,from,to,wanted,progress)*nativeHeadPixelScale(bank,cell));return error;
}
export function nativeHeadBankRearState(bank:NativeHeadBank,cellId:string,control:{x:number;y:number;angle:number}){
  const index=bank.cells.findIndex(c=>c.id===cellId),cell=bank.cells[index];if(!cell?.paint||!bank.capabilities.secondary)throw new Error('needs-head-secondary: selected own rear motion is missing');
  return nativeRearFollowState(cell.paint,index,control);
}
export function nativeHeadBankRearError(bank:NativeHeadBank,from:Record<string,unknown>,to:Record<string,unknown>,wanted:Record<string,unknown>,progress:number){
  if(!bank.capabilities.secondary)return 0;
  const selected=(state:Record<string,unknown>)=>{
    const active=bank.cells.flatMap((cell,i)=>{
      const front=(state['head-view-bank-'+i] as {opacity?:number}|undefined)?.opacity;
      if(cell.paint?.rear.length&&(state['head-back-view-bank-'+i] as {opacity?:number}|undefined)?.opacity!==front)throw new Error('needs-head-secondary: front/rear cell opacity differs');
      return front===1?[i]:[];
    });
    if(active.length!==1)throw new Error('needs-head-secondary: exactly one original cell must be active');return active[0]!;
  },index=selected(from);
  if(selected(to)!==index||selected(wanted)!==index)throw new Error('needs-head-turn-secondary: matrix interpolation cannot replace continuous rear-hair cell correspondence');
  const cell=bank.cells[index]!;return cell.paint?nativeRearFollowMatrixError(cell.paint,index,from,to,wanted,progress)*nativeHeadPixelScale(bank,cell):0;
}
/** Every exact source asset is drawn once, then referenced by its cell crop and
 * uniform attachment. No anatomical labels or coordinates are mirrored. */
export function nativeHeadBankSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string){
  const bank=registeredNativeHeadBank(profile),sources=nativeHeadSources(bank),sourceIndex=new Map(sources.map((s,i)=>[s.id,i]));
  const images=sources.map((s,i)=>{
    const url=imageUrl(s.file,s.sha256);
    if(url!=='assets/rigs/'+s.sha256+'.png'&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(url))throw new Error('Unapproved native head bank image URL');
    return `<image id="native-head-bank-source-${i}" width="${s.width}" height="${s.height}" href="${url}"/>`;
  }).join('');
  return `<g data-head-bank="${bank.fingerprint}" stroke="none"><defs>${images}${bank.cells.map((c,i)=>`<clipPath id="native-head-bank-clip-${i}" clipPathUnits="userSpaceOnUse"><rect x="${c.crop.x}" y="${c.crop.y}" width="${c.crop.width}" height="${c.crop.height}"/></clipPath>${c.paint?nativeHeadPaintDefs(c.paint,c.crop,i):''}`).join('')}</defs>${bank.cells.map((c,i)=>{
    const imageId='native-head-bank-source-'+sourceIndex.get(nativeHeadSourceForCell(bank,c).id)!,rest=c.face?.mouth.rest,restId=rest?'native-head-bank-source-'+sourceIndex.get(rest.sourceId)!:undefined,
      emotionId=c.face?.emotions?'native-head-bank-source-'+sourceIndex.get(c.face.emotions.mouth.repair.sourceId)!:undefined;
    return `<g id="head-view-bank-${i}" opacity="0"><g transform="scale(${nativeHeadPixelScale(bank,c)}) rotate(${nativeHeadCellAngle(c)}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#native-head-bank-clip-${i})"><use href="#${imageId}"${c.paint?.rear.length?` mask="url(#native-head-paint-${i}-front)"`:''}/>${c.face?nativeHeadFaceSvg(c.face,imageId,'native-face-'+i,restId,emotionId):''}</g></g>`;
  }).join('')}</g>`;
}
/** Paint IDs/images are defined by the foreground bank exactly once. Caller
 * places this sibling BEFORE the body, with the same head attachment. It is
 * not a second independent rig or an inferred secondary-hair animation. */
export function nativeHeadBankRearSvg(profile:HostProfile){
  const bank=registeredNativeHeadBank(profile),sources=nativeHeadSources(bank),sourceIndex=new Map(sources.map((s,i)=>[s.id,i]));
  return bank.cells.flatMap((c,i)=>{if(!c.paint?.rear.length)return [];const imageId='native-head-bank-source-'+sourceIndex.get(nativeHeadSourceForCell(bank,c).id)!;
    const artwork=c.paint.version==='native-head-paint-2'?nativeRearFollowSvg(c.paint,i,imageId):`<g clip-path="url(#native-head-bank-clip-${i})"><g clip-path="url(#native-head-paint-${i}-rear)"><use href="#${imageId}"/></g></g>`;
    return [`<g id="head-back-view-bank-${i}" opacity="0" stroke="none"><g transform="scale(${nativeHeadPixelScale(bank,c)}) rotate(${nativeHeadCellAngle(c)}) translate(${-c.neck.x} ${-c.neck.y})">${artwork}</g></g>`];
  }).join('');
}
