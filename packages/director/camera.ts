import type { Shot } from '../core/schemas.js';
import type { HostProfile } from '../host/schemas.js';
import type { PerformancePlan, Point } from '../animation/schemas.js';
import { rigMetrics } from '../animation/rig.js';
import { samplePerformance } from '../animation/compiler.js';
import { CameraSchema, type CinematicCamera } from './schemas.js';
import { rendersModelLabel } from './art-direction-schemas.js';
import { cinematicActionGroups } from './actions.js';

export const CAMERA_VIEWPORT={left:.04,right:.96,top:.14,bottom:.80,centerY:.46,pan:.025} as const;
export interface CameraMatrix { scale:number; x:number; y:number; }
const finite=(n:number)=>{if(!Number.isFinite(n))throw new Error('Camera values must be finite numbers.');return n;};

type Bounds={left:number;right:number;top:number;bottom:number};
const emptyBounds=():Bounds=>({left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
function include(bounds:Bounds,point:Point,pad=0){
  bounds.left=Math.min(bounds.left,point.x-pad);bounds.right=Math.max(bounds.right,point.x+pad);
  bounds.top=Math.min(bounds.top,point.y-pad);bounds.bottom=Math.max(bounds.bottom,point.y+pad);
}
/** Measure the existing rig on its narrative frame clock, including headScale and antenna. */
export function cameraHostBounds(p:PerformancePlan,profile:HostProfile){
  const times=new Set<number>([0,p.durationMs]);
  for(let ms=0;ms<p.durationMs;ms+=1000/p.fps)times.add(Number(ms.toFixed(4)));
  for(const clip of [...p.walks,...p.gestures,...(p.turns??[]),...(p.postures??[]),...p.expressions]){
    for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)times.add(at);
  }
  for(const clip of p.postures??[])times.add((clip.startMs+clip.endMs)/2);
  for(const g of p.gestures){if(g.contactMs!==undefined)times.add(g.contactMs);if(g.releaseMs!==undefined)times.add(g.releaseMs);
    if(g.action==='carry')for(const at of [g.contactMs!+250,(g.releaseMs??g.endMs)-250])if(at>=g.startMs&&at<=g.endMs)times.add(at);
  }
  const head=emptyBounds(),feet=emptyBounds(),bodyBounds=emptyBounds(),props:Record<string,Bounds>={},ratio={min:Infinity,max:-Infinity},stroke=profile.appearance.strokeWidth/2;
  for(const time of times){
    const frame=samplePerformance(p,profile,time,{method:'segment-draft',windowMs:20,intervals:[]});
    for(const [id,prop] of Object.entries(frame.props))include(props[id]??=emptyBounds(),prop.point);
    const match=/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\)$/.exec(frame.transforms.head!);
    if(!match)throw new Error('Camera cannot measure the production head transform.');
    const x=Number(match[1]),y=Number(match[2]),angle=Number(match[3])*Math.PI/180,scale=Number(match[4]),local=emptyBounds();
    if(profile.kind==='stick-man'){include(local,{x,y},(40+stroke)*scale);}
    else {
      const point=(px:number,py:number)=>({x:x+(px*Math.cos(angle)-py*Math.sin(angle))*scale,y:y+(px*Math.sin(angle)+py*Math.cos(angle))*scale});
      for(const px of [-50,50])for(const py of [-42,42])include(local,point(px,py),stroke*scale);
      include(local,point(0,-63),(5+stroke)*scale);
    }
    include(head,{x:local.left,y:local.top});include(head,{x:local.right,y:local.bottom});
    const body={...local};
    for(const foot of Object.values(frame.feet)){
      const pad=(profile.kind==='mini-robot'?6:stroke)*p.scale;
      include(feet,{x:foot.x-9*p.scale,y:foot.y},pad);include(feet,{x:foot.x+9*p.scale,y:foot.y},pad);
      include(body,foot,pad);
    }
    for(const hand of Object.values(frame.hands))include(body,hand,(profile.kind==='mini-robot'?9:5)*p.scale);
    for(const [id,transform] of Object.entries(frame.transforms))if(/^(?:arm|leg)-/.test(id)){
      const joint=/^translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform)!;
      include(body,{x:Number(joint[1]),y:Number(joint[2])},stroke*p.scale);
    }
    include(bodyBounds,{x:body.left,y:body.top});include(bodyBounds,{x:body.right,y:body.bottom});
    const height=(body.bottom-body.top)/p.stage.height;ratio.min=Math.min(ratio.min,height);ratio.max=Math.max(ratio.max,height);
  }
  return {head,feet,body:bodyBounds,props,ratio};
}

/** Keep wrapping and clearance identical to the production model labels. */
export function cameraModelLabel(part:NonNullable<Shot['visualization']>['parts'][number],height:number,width:number){
  const font=height*.021,maxChars=Math.max(12,Math.floor(part.width*width/font*1.6)),lines:string[]=[];let line='';
  for(const word of part.label.split(/\s+/)){if(line&&line.length+word.length+1>maxChars){lines.push(line);line='';}line=line?`${line} ${word}`:word;}if(line)lines.push(line);
  return {font,lines,labelY:part.y*height+part.height*height*.56,labelHeight:lines.length*font*1.15};
}

/** Pure local-clock transform. Host, contact anchors, props and floor share this matrix. */
export function cameraMatrixAt(camera:CinematicCamera,stage:{width:number;height:number},durationMs:number,timeMs:number):CameraMatrix {
  CameraSchema.parse(camera);finite(timeMs);finite(durationMs);finite(stage.width);finite(stage.height);
  if(durationMs<=0||stage.width<=0||stage.height<=0)throw new Error('Camera duration and stage dimensions must be positive.');
  const progress=Math.max(0,Math.min(1,timeMs/durationMs)),ease=(1-Math.cos(Math.PI*progress))/2;
  const scale=camera.startScale+(camera.endScale-camera.startScale)*ease;
  const pan=camera.movement==='pan-left'?-CAMERA_VIEWPORT.pan:camera.movement==='pan-right'?CAMERA_VIEWPORT.pan:0;
  return {scale,x:stage.width*.5-camera.anchor.x*scale+stage.width*pan*ease,y:stage.height*CAMERA_VIEWPORT.centerY-camera.anchor.y*scale};
}
export function cameraPoint(point:Point,matrix:CameraMatrix):Point {return {x:point.x*matrix.scale+matrix.x,y:point.y*matrix.scale+matrix.y};}
export function cameraTransform(matrix:CameraMatrix):string {
  const number=(n:number)=>String(Number(finite(n).toFixed(6)));
  return `translate(${number(matrix.x)} ${number(matrix.y)}) scale(${number(matrix.scale)})`;
}
export function cameraTimeline(camera:CinematicCamera,performance:PerformancePlan,selector:string):string[] {
  const first=cameraMatrixAt(camera,performance.stage,performance.durationMs,0),last=cameraMatrixAt(camera,performance.stage,performance.durationMs,performance.durationMs);
  const calls=[`tl.set(${JSON.stringify(selector)},{attr:{transform:${JSON.stringify(cameraTransform(first))}},immediateRender:true},0);`];
  if(cameraTransform(first)!==cameraTransform(last))calls.push(`tl.to(${JSON.stringify(selector)},{attr:{transform:${JSON.stringify(cameraTransform(last))}},duration:${performance.durationMs/1000},ease:"sine.inOut"},0);`);
  return calls;
}

/** Extend the background in world space to cover every camera endpoint, including bounded pan. */
export function cameraEnvironmentBounds(camera:CinematicCamera,stage:{width:number;height:number},durationMs:number){
  const matrices=[cameraMatrixAt(camera,stage,durationMs,0),cameraMatrixAt(camera,stage,durationMs,durationMs)];
  // Coordinates are affine in eased progress; inverse edge extrema occur at these endpoints.
  const left=Math.min(0,...matrices.map(matrix=>-matrix.x/matrix.scale))-2;
  const top=Math.min(0,...matrices.map(matrix=>(stage.height*CAMERA_VIEWPORT.top-matrix.y)/matrix.scale))-2;
  const right=Math.max(stage.width,...matrices.map(matrix=>(stage.width-matrix.x)/matrix.scale))+2;
  const bottom=Math.max(stage.height,...matrices.map(matrix=>(stage.height*CAMERA_VIEWPORT.bottom-matrix.y)/matrix.scale))+2;
  return {left,top,width:right-left,height:bottom-top};
}
export function planCamera(performance:PerformancePlan,profile:HostProfile,options:{framing:CinematicCamera['framing'];movement:CinematicCamera['movement'];focus?:CinematicCamera['focus'];target?:Point;parts?:NonNullable<Shot['visualization']>['parts']}):CinematicCamera {
  const {width,height}=performance.stage,m=rigMetrics(profile),roots=[performance.root.x,...performance.walks.flatMap(w=>[w.fromX,w.toX])];
  const focus=options.focus??'ensemble',framing=options.framing;
  const bounds=cameraHostBounds(performance,profile),wideCap=.39/bounds.ratio.max;
  const scales=framing==='wide'?[Math.min(1,wideCap),Math.min(1.04,wideCap)]:framing==='medium'?[1.25,1.32]:focus==='face'?[2.4,2.5]:[2.1,2.2];
  // Keep purposeful motion even when a larger approved head limits the wide scale.
  if(framing==='wide'&&scales[0]===scales[1])scales[0]=scales[1]!*.97;
  const moving=['push-in','pull-out'].includes(options.movement),startScale=moving&&options.movement==='pull-out'?scales[1]!:scales[0]!,endScale=moving?(options.movement==='push-in'?scales[1]!:scales[0]!):startScale;
  const maxScale=Math.max(startScale,endScale);
  let anchor:Point;
  if(focus==='face')anchor={x:(bounds.head.left+bounds.head.right)/2,y:(bounds.head.top+bounds.head.bottom)/2};
  else if(focus==='contact'){if(!options.target)throw new Error('Contact camera requires a world contact target.');anchor=options.target;}
  else {
    const xs=[...roots.map(x=>x-(m.upperArm+m.lowerArm)*performance.scale),...roots.map(x=>x+(m.upperArm+m.lowerArm)*performance.scale),
      ...(performance.supports??[]).flatMap(seat=>[seat.center.x-seat.width*.6,seat.center.x+seat.width*.6]),
      ...(options.parts??[]).flatMap(p=>[(p.x-p.width*.56)*width,(p.x+p.width*.56)*width])];
    anchor={x:(Math.min(...xs)+Math.max(...xs))/2,y:bounds.feet.bottom-height*((framing==='wide'?.76:.78)-CAMERA_VIEWPORT.centerY)/maxScale};
  }
  return CameraSchema.parse({framing,movement:options.movement,focus,anchor,startScale,endScale});
}

/** Geometric envelopes cover both transform endpoints, bounded pan and the complete locomotion path. */
export function validateCamera(shot:Shot,profile:HostProfile) {
  const c=shot.cinematic;if(!c)throw new Error(`${shot.id}: camera requires canonical cinematic data`);
  const camera=CameraSchema.parse(c.camera),p=c.performance,{width,height,groundY}=p.stage;
  const fail=(message:string):never=>{throw new Error(`${shot.id}: camera ${message}`);};
  if(shot.camera.angle!=='eye-level')fail('supports only eye-level 2D framing; other angles require a different renderer.');
  if(camera.anchor.x<0||camera.anchor.x>width||camera.anchor.y<0||camera.anchor.y>height)fail('anchor must be inside the world stage.');
  const delta=camera.endScale-camera.startScale;
  if(camera.movement==='push-in'&&delta<=0||camera.movement==='pull-out'&&delta>=0||['locked','pan-left','pan-right'].includes(camera.movement)&&delta!==0)fail('movement contradicts its start/end scale.');
  const bounds=cameraHostBounds(p,profile),worldRatio=bounds.ratio.max;
  const matrices=[cameraMatrixAt(camera,p.stage,p.durationMs,0),cameraMatrixAt(camera,p.stage,p.durationMs,p.durationMs)];
  const inView=(point:Point,padX=0,padY=padX)=>matrices.every(matrix=>{
    const screen=cameraPoint(point,matrix);
    return screen.x-padX*matrix.scale>=width*CAMERA_VIEWPORT.left-.01&&screen.x+padX*matrix.scale<=width*CAMERA_VIEWPORT.right+.01&&
      screen.y-padY*matrix.scale>=height*CAMERA_VIEWPORT.top-.01&&screen.y+padY*matrix.scale<=height*CAMERA_VIEWPORT.bottom+.01;
  });
  const boundsInView=(b:Bounds)=>inView({x:b.left,y:b.top})&&inView({x:b.right,y:b.bottom});
  const movingBounds=(part:NonNullable<Shot['visualization']>['parts'][number])=>{
    const binding=c.propBindings.find(b=>b.partId===part.id),motion=binding&&bounds.props[binding.propId];
    return motion??{left:part.x*width,right:part.x*width,top:part.y*height,bottom:part.y*height};
  };
  const modelInView=(part:NonNullable<Shot['visualization']>['parts'][number])=>{
    const b=movingBounds(part);return boundsInView({left:b.left-part.width*width*.56,right:b.right+part.width*width*.56,top:b.top-part.height*height*.6,bottom:b.bottom+part.height*height*.6});
  };
  const labelInView=(part:NonNullable<Shot['visualization']>['parts'][number])=>{
    if(!rendersModelLabel(shot,part.id))return;
    const {font,lines,labelY,labelHeight}=cameraModelLabel(part,height,width);
    if(lines.length>4)fail(`model ${part.id} label is too long for the cinematic stage.`);
    const b=movingBounds(part),labelOffset=labelY-part.y*height;
    if(!boundsInView({left:b.left-part.width*width*.56,right:b.right+part.width*width*.56,top:b.top+labelOffset-font,bottom:b.bottom+labelOffset+labelHeight}))fail(`model ${part.id} label leaves the safe viewport/subtitle clearance; use a wider framing or replan its layout.`);
  };
  if(camera.framing!=='close'){
    const [min,max]=camera.framing==='wide'?[.25,.4]:[.4,.65];
    if(!c.actorScene&&!camera.designIntent&&matrices.some(matrix=>bounds.ratio.min*matrix.scale<min-1e-6||bounds.ratio.max*matrix.scale>max+1e-6))fail(`${camera.framing} host height must occupy ${min*100}–${max*100}% of the frame, including headScale/body bounds.`);
    if(!c.actorScene||c.actorScene.primary){
      if(!boundsInView(bounds.head))fail('head would be cropped or enter the heading region.');
      if(!boundsInView(bounds.feet))fail('feet/visual ground enter the subtitle region or leave the frame.');
      if(!boundsInView(bounds.body))fail('hands/body leave the safe action region; use a wider camera or replan its layout.');
      for(const g of p.gestures)if(g.target&&!inView(g.target,8*p.scale))fail(`${g.id} target is outside the safe action region.`);
      for(const seat of p.supports??[])if(!boundsInView({left:seat.center.x-seat.width*.6-2,right:seat.center.x+seat.width*.6+2,top:seat.center.y-(seat.backHeight??0)-2,bottom:groundY+9}))fail(`seat ${seat.id} leaves the safe action region; preserve its support and ground in ensemble framing.`);
    }
    for(const part of shot.visualization?.parts??[]){
      if(!modelInView(part))fail(`model ${part.id} is cropped during its motion; use a wider camera or replan its world layout.`);
      labelInView(part);
    }
  }else if(camera.focus==='face'){
    if(p.gestures.some(g=>['operate','pick-place','carry'].includes(g.action)))fail('face close would hide contact; use contact focus or medium.');
    if(!p.expressions.some(e=>['curious','thinking','surprised','understanding'].includes(e.mood)))fail('face close requires an informative expression/discovery.');
    if(!boundsInView(bounds.head))fail('face close crops the face; move the anchor to the face, preserving subtitle clearance.');
  }else if(camera.focus==='object'){
    if(c.actorScene?.primary!==null||c.actorScene.supporting.length)fail('object close must explicitly be a mechanism-only actor scene.');
    for(const part of shot.visualization?.parts??[]){
      if(!modelInView(part))fail(`model ${part.id} is cropped in object focus.`);
      labelInView(part);
    }
  }else {
    const contacts=p.gestures.filter(g=>['operate','pick-place','carry'].includes(g.action)&&g.target&&g.contactMs!==undefined);
    if(!contacts.length)fail('contact close requires a validated contact action.');
    for(const g of p.gestures)if(g.target&&!inView(g.target,12*p.scale))fail(`${g.id} target/hand is cropped; contact close must show explanatory targets.`);
    const actions=new Map(cinematicActionGroups(shot.host?.actions??[],p,shot.startMs).flatMap(group=>group.gestures.map(g=>[g.id,group.action] as const)));
    for(const g of contacts){
      const a=actions.get(g.id),part=shot.visualization?.parts.find(part=>part.id===a?.target?.partId);
      if(!part||!modelInView(part))fail('contact close crops its manipulated object.');
      labelInView(part!);
    }
  }
  return {framing:camera.framing,focus:camera.focus??'ensemble',viewport:CAMERA_VIEWPORT,worldHostHeightRatio:worldRatio,
    screenHostHeightRatio:{start:worldRatio*camera.startScale,end:worldRatio*camera.endScale},
    minimumScreenHostHeightRatio:{start:bounds.ratio.min*camera.startScale,end:bounds.ratio.min*camera.endScale},
    groundScreenY:matrices.map(matrix=>cameraPoint({x:p.root.x,y:groundY},matrix).y),intentionalBodyCrop:camera.framing==='close'};
}
