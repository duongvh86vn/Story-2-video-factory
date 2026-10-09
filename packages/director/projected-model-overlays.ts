import type {Shot} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {rendersModelLabel} from './art-direction-schemas.js';
import {cameraModelLabel} from './model-label.js';
import {boundProp} from './prop-owner.js';
import {modelContactLocalBounds} from './model-contact-motion.js';
import {modelDecorationBounds,PROJECTED_MODEL_OVERLAY_VERSION,type ProjectedBounds} from './model-decorations.js';
import type {projectedModelGeometry} from './projected-model-geometry.js';
import {buildProjectedRelationTrack} from './projected-relation-track.js';

type Geometry=ReturnType<typeof projectedModelGeometry>;
const fail=(message:string):never=>{throw new Error(`needs-source-prop-binding: projected model overlays ${message}`);};
const union=(items:ProjectedBounds[]):ProjectedBounds=>({left:Math.min(...items.map(b=>b.left)),right:Math.max(...items.map(b=>b.right)),top:Math.min(...items.map(b=>b.top)),bottom:Math.max(...items.map(b=>b.bottom))});
function descriptor(shot:Shot,partId:string){
  const c=shot.cinematic,parts=shot.visualization?.parts.filter(p=>p.id===partId)??[],models=c?.artDirection?.models.filter(m=>m.partId===partId)??[];
  if(!c||parts.length!==1||models.length!==1||!models[0]!.contactFrame)return fail('requires the actual one-source whole projected entity');
  return {c,part:parts[0]!,frame:models[0]!.contactFrame!,index:shot.visualization!.parts.indexOf(parts[0]!)};
}
/** Without actual renderer channels this remains the existing physical camera
 * preflight envelope. Supplied geometry is preferred and revision-bound. */
export function projectedOverlayCameraBounds(shot:Shot,partId:string,physicalCenters?:ProjectedBounds,geometry?:Geometry){
  const {c,part,frame}=descriptor(shot,partId),{width,height,groundY}=c.performance.stage,w=part.width*width,h=part.height*height;
  if(geometry&&(geometry.shotHash!==hash(shot)||geometry.durationMs!==shot.endMs-shot.startMs))return fail('camera received foreign emitted geometry');
  const binding=c.propBindings.find(b=>b.partId===partId),canonical=c.sourceOwnership?.some(s=>s.partId===partId),owned=!!binding||!!canonical,scale=binding&&!canonical?boundProp(shot,binding).performance.scale:1;
  if(owned&&!physicalCenters&&!geometry)return fail('preflight lacks the actual physical parent envelope');
  const parent=physicalCenters??{left:part.x*width,right:part.x*width,top:part.y*height,bottom:part.y*height};
  const bounds=(box:ProjectedBounds)=>{
    if(geometry)return geometry.envelope(partId,box);
    const local=modelContactLocalBounds(shot,partId,box,w/scale,h/scale);
    if(binding&&!canonical){const ratio=Number(scale.toFixed(4)),r=Math.hypot(Math.max(Math.abs(local.left),Math.abs(local.right)),Math.max(Math.abs(local.top),Math.abs(local.bottom)))*(ratio+.000051)+.001;
      return {left:parent.left-r,right:parent.right+r,top:parent.top-r,bottom:parent.bottom+r};}
    return {left:parent.left+local.left,right:parent.right+local.right,top:parent.top+local.top,bottom:parent.bottom+local.bottom};
  };
  const glyph=bounds(frame.bounds),rawDecorated=bounds(modelDecorationBounds(part,frame)),stroke=height*.003*1.01+.001,
    decorated={left:rawDecorated.left-stroke,right:rawDecorated.right+stroke,top:rawDecorated.top-stroke,bottom:rawDecorated.bottom+stroke};
  const a=frame.anchors.center,center=geometry?geometry.centerEnvelope(partId):bounds({left:a.x,right:a.x,top:a.y,bottom:a.y});
  const baseline=owned?groundY-4:part.y*height+h*.53,shadow={left:center.left+w*.08-w*.48-.001,right:center.right+w*.08+w*.48+.001,top:baseline-h*.09-.001,bottom:baseline+h*.09+.001};
  const m=cameraModelLabel(part,height,width),label=rendersModelLabel(shot,partId)?{left:center.left-w*.56-.001,right:center.right+w*.56+.001,top:glyph.top+h*.06-m.font-.001,bottom:glyph.bottom+h*.06+m.labelHeight+.001}:undefined;
  return {version:PROJECTED_MODEL_OVERLAY_VERSION,glyph,decorated,center,shadow,label,model:union([decorated,shadow]),combined:union([decorated,shadow,...(label?[label]:[])]),
    scope:geometry?'actual-emitted-conservative-envelope-candidate' as const:'physical-preflight-conservative-envelope-candidate' as const,
    continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const};
}
/** Labels remain upright below the actually transformed declared bound. Ground
 * shadow follows horizontal center only; it never rotates or floats in hand. */
export function projectedModelOverlayTimeline(shot:Shot,partId:string,geometry:Geometry){
  const {c,part,index}=descriptor(shot,partId),{width,height}=c.performance.stage;
  if(geometry.shotHash!==hash(shot)||geometry.durationMs!==shot.endMs-shot.startMs)return fail('timeline received foreign emitted geometry');
  const x=part.x*width,m=cameraModelLabel(part,height,width),clock=geometry.times(partId),scope=`[data-composition-id="${shot.id}"] [id="object-${index}"]`,calls:string[]=[],tracks:unknown[]=[];
  const names=['shadow',...(rendersModelLabel(shot,partId)?['label']:[])] as const;
  for(const name of names){
    const selector=JSON.stringify(`${scope} .contact-model-${name}`),track=buildProjectedRelationTrack(clock,t=>{
      const s=geometry.at(partId,t),p={x:s.center.x-x,y:name==='label'?Math.max(...s.quad.map(p=>p.y))+part.height*height*.06-m.labelY:0};
      return {start:p,control:p,end:p,arrow:[p,p,p]};
    });
    for(const [i,f] of track.frames.entries()){
      const previous=track.frames[i-1],p=f.curve.start;
      calls.push(`tl.${previous?'to':'set'}(${selector},${JSON.stringify({attr:{transform:`translate(${p.x} ${p.y})`},...(previous?{duration:(f.timeMs-previous.timeMs)/1000,ease:'none'}:{immediateRender:true})})},${(previous?.timeMs??0)/1000});`);
    }
    // Opacity uses its original matrix clock, independently from adaptive
    // billboard position. Discrete visibility stays on the object wrapper.
    for(const [i,t] of clock.entries()){
      const previous=clock[i-1],opacity=geometry.at(partId,t).opacity;
      calls.push(`tl.${previous===undefined?'set':'to'}(${selector},${JSON.stringify({opacity,...(previous===undefined?{immediateRender:true}:{duration:(t-previous)/1000,ease:'none'})})},${(previous??0)/1000});`);
    }
    tracks.push({name,fingerprint:track.fingerprint,frames:track.frames.length,maxMeasuredGapPx:track.maxMeasuredGapPx});
  }
  return {calls,report:{version:PROJECTED_MODEL_OVERLAY_VERSION,partId,tracks,fingerprint:hash({shot:geometry.shotHash,geometry:geometry.fingerprint,tracks}),
    scope:'finite-probe-upright-label/ground-shadow-candidate' as const,continuousGeometryVerified:false as const,motionVerified:false as const,productionApproval:false as const}};
}
export const projectedOverlayDescription={version:PROJECTED_MODEL_OVERLAY_VERSION,status:'candidate',
  glyphEffects:'trusted generated focus/energy/thermal are inside the same post-projection whole-glyph matrix, drawn once in the base layer; foreground keeps only its own original art',
  billboards:'upright label below the actual transformed own declared bound, horizontal center-following shadow on its existing fixed/ground baseline; actual emitted owner/canonical parents and original opacity clocks',
  camera:'shared generated extents and conservative serialized matrix/owner/bake envelopes including labels and shadows; preflight without renderer channels retains a distinct physical-candidate scope',
  pending:['actual SVG/GSAP, text metrics, depth/occlusion/light and fractional/reverse/cut/60fps film acceptance','faithful native artwork/acting, integrated production audit and full three-input factory/voice/resume/final acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
