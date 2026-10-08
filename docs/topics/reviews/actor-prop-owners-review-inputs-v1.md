# Frozen source excerpts — actor prop owners v1

Source data only; never executed. Runtime/tests/native art are unverified. Compiler blocks native gesture modes without registered poses; cross-cut/contact/final gates stay active.

## library/shots/cinematic.ts [57..151] full SHA eb7e69cf0048f6a5507dcbe250e3a19240aad9757c6f496f9897fbd30661e2d2

```ts
    }else {validateSpeechActivityTrack(activity);primaryClock={version:SPEECH_SOURCE_CLOCK_VERSION,ownerId:profile.id,scope:'narration',cueIds:[],startMs:shot.startMs,endMs:shot.endMs,
      sourceActivityHash:hash(activity),activity:windowSpeechActivity(activity,shot.startMs,shot.endMs)};}
  }
  const primaryActingClock=board?actorViewActingClock(board,shot,profile.id):undefined;
  const performerSpeech=new Map<string,{activity:SpeechActivity;sourceClock?:SpeechSourceClock;actingClock?:ViewActingClock}>([[profile.id,{activity:localActivity,sourceClock:primaryClock,actingClock:primaryActingClock}]]);
  const supports=c.propBindings.length?c.propBindings.flatMap(binding=>{
    const part=v.parts.find(part=>part.id===binding.partId)!,{prop,performance:ownerPlan}=boundProp(shot,binding);
    // A dropped object has no invented table underneath its held entry or floor landing.
    // Authored scenery supplies any actual narrated support.
    if(ownerPlan.gestures.some(g=>g.propId===prop.id&&g.action==='drop'))return [];
    return [prop.origin,...(prop.destination?[prop.destination]:[])].map(center=>({x:center.x,y:center.y+part.height*height*.5,width:part.width*width*1.12}));
  }):undefined;
  const seats=sceneSeats(shot),result=performanceScene(p,profile,localActivity,background,supports,{items:seats,palette},primaryClock,primaryActingClock),scope=`[data-composition-id="${shot.id}"]`,selector=(s:string)=>JSON.stringify(`${scope} ${s.replace(/#([a-zA-Z][\w.-]*)/g,(_,id:string)=>`[id=${JSON.stringify(id)}]`)}`);
  const decoration=c.setting==='road'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#A78C66"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#E8D6AF" stroke-width="5" stroke-dasharray="45 24"/>`
    :c.setting==='workshop'?`<path d="M0 ${p.stage.groundY}H${width}V${height}H0Z" fill="#B79C72"/><path d="M${width*.6} ${height*.26}H${width*.9}V${height*.63}H${width*.6}Z" fill="#836D52" opacity=".3"/><path d="M0 ${p.stage.groundY}H${width}" stroke="#876E4F" stroke-width="3"/>`
    :`<path d="M0 ${p.stage.groundY}H${width}" stroke="#A38B65" stroke-width="3"/>`;
  const calls:string[]=Object.values(planes).flatMap(plane=>plane.calls);
  const actorReports:Array<{actorId:string;profileHash:string;rigHash:string;report:ReturnType<typeof compilePerformance>['report']}>=[];
  const ownerCompilations=new Map<string,ReturnType<typeof compilePerformance>>([[profile.id,result.compiled]]);
  const supporting=(c.actorScene?.supporting??[]).map(actor=>{
    const definition=actorProfile(actor.character,profile),prefix=`actor-${actor.character.id}-`;
    let local=actorSpeech(activity,narration,actor.speakingSegmentIds,shot.startMs,shot.endMs);
    local.intervals=local.intervals.map(interval=>({...interval,startMs:interval.startMs-shot.startMs,endMs:interval.endMs-shot.startMs}));
    let sourceClock:SpeechSourceClock|undefined;
    if(actorUsesViewActingClock(definition)){const projected=actorShotSpeech(activity,narration,definition.id,actor.speakingSegmentIds,shot.startMs,shot.endMs,owners?.get(definition.id)??(owners?[]:undefined));
      local=projected.activity;sourceClock=projected.sourceClock;
    }
    const actingClock=board?actorViewActingClock(board,shot,definition.id):undefined;
    performerSpeech.set(definition.id,{activity:local,sourceClock,actingClock});
    const compiled=compilePerformance(actor.performance,definition,local,prefix,sourceClock,actingClock);
    ownerCompilations.set(definition.id,compiled);
    actorReports.push({actorId:definition.id,profileHash:definition.profileHash,rigHash:buildRig(definition).rigHash,report:compiled.report});
    calls.push(compiled.js);
    const props=actor.performance.props.map(prop=>`<g id="${prefix}prop-${prop.id}"></g>`).join('');
    return `<g data-actor-id="${escapeHtml(actor.character.id)}"><ellipse id="${prefix}ground-shadow" cx="0" cy="0" rx="54" ry="10" fill="${palette.ink}" opacity=".18"/>${namespaceRigSvg(performanceSvg(definition,'scene'),prefix)}${props}</g>`;
  }).join('');
  const propArt=new Map<string,string>(),foregroundModels:string[]=[];
  const foregroundParts=new Set(art?.models.filter(model=>model.foregroundSvg!==undefined).map(model=>model.partId));
  const modelTargets=(partId:string,base:string,suffix:string)=>[selector(`${base} ${suffix}`),...(foregroundParts.has(partId)?[selector(`#foreground-object-${v.parts.findIndex(part=>part.id===partId)} ${suffix}`)]:[])];
  const objects=v.parts.map((part,i)=>{
    const x=part.x*width,y=part.y*height,w=part.width*width,h=part.height*height,handle=partAnchor(shot,part.id,'handle',width,height);
    const focal=part.id===c.attentionPartId;
    const model=c.models.find(m=>m.partId===part.id)!;
    const illustration=cinematicModel(part,model,w,h);
    const authoredGlyph=customModelArt(shot,part.id,w,h);
    if(authoredGlyph){illustration.svg=authoredGlyph;illustration.motionAnchors=[...authoredGlyph.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion'))?[{selector:'.motion',...customModelMotionOrigin(shot,part.id)}]:[];}
    const binding=c.propBindings.find(binding=>binding.partId===part.id),showLabel=rendersModelLabel(shot,part.id);
    const foreground=customModelForegroundArt(shot,part.id,w,h);
    if(foreground){
      foregroundModels.push(`<g id="foreground-object-${i}" data-sourced-foreground="${escapeHtml(part.id)}"${binding?` data-bound-prop-id="${escapeHtml(binding.propId)}"`:''} transform="translate(${x} ${y})">${foreground}</g>`);
      if([...foreground.matchAll(/class="([^"]*)"/g)].some(match=>match[1]!.split(/\s+/).includes('motion')))calls.push(`tl.set(${selector(`#foreground-object-${i} .motion`)},{svgOrigin:${JSON.stringify(`${customModelMotionOrigin(shot,part.id).x} ${customModelMotionOrigin(shot,part.id).y}`)}},0);`);
    }
    if(binding){
      const owner=boundProp(shot,binding),scale=owner.performance.scale,compiled=ownerCompilations.get(owner.id);
      if(!compiled)throw new Error(`${shot.id}: bound model has no compiled owner ${owner.id}`);
      const art=cinematicModel(part,model,w/scale,h/scale);
      art.svg=customModelArt(shot,part.id,w/scale,h/scale)??art.svg;
      propArt.set(owner.svgId,`<g id="${owner.svgId}" data-prop-entity="${escapeHtml(part.id)}" data-prop-role="${binding.role}"${binding.ownerId?` data-prop-owner="${escapeHtml(owner.id)}"`:''} fill="none" stroke="#644931" stroke-width="${height*.003/scale}" stroke-linecap="round" stroke-linejoin="round">${art.svg}${modelThermal(part,w/scale,h/scale)}</g>`);
      // Model labels, emphasis and effects share the exact adaptive prop clock.
      for(const [frameIndex,frame] of compiled.frames.entries()){
        const prop=frame.props[binding.propId]!,previous=compiled.frames[frameIndex-1],at=(previous?.timeMs??0)/1000;
        const interpolation=previous?{duration:Number(((frame.timeMs-previous.timeMs)/1000).toFixed(6)),ease:'none'}:{immediateRender:true};
        const method=previous?'to':'set',deltaY=prop.point.y-y;
        calls.push(`tl.${method}(${selector(`#object-${i}`)},${JSON.stringify({attr:{transform:`translate(${prop.point.x-x} ${deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
        if(foreground)calls.push(`tl.${method}(${selector(`#foreground-object-${i}`)},${JSON.stringify({attr:{transform:`translate(${prop.point.x} ${prop.point.y})`},...interpolation})},${Number(at.toFixed(6))});`);
        calls.push(`tl.${method}(${selector(`#object-${i} .bound-model-shadow`)},${JSON.stringify({attr:{transform:`translate(0 ${-deltaY})`},...interpolation})},${Number(at.toFixed(6))});`);
      }
    }
    for(const anchor of illustration.motionAnchors)calls.push(`tl.set(${selector(`${binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`} ${anchor.selector}`)},{svgOrigin:${JSON.stringify(`${anchor.x} ${anchor.y}`)}},0);`);
    const {font,lines,labelY,labelHeight}=cameraModelLabel(part,height,width);
    if(showLabel&&lines.length>4)throw new Error(`${shot.id}: model label too long for the cinematic stage`);
    if(showLabel&&labelY+labelHeight>height*.79)throw new Error(`${shot.id}: cinematic label crosses subtitle clearance`);
    const renderControl=rendersModelControl(shot,part.id);
    const controlled=renderControl&&actorActions(shot).some(a=>a.type==='operate-model'&&a.target?.partId===part.id);
    const thermal=modelThermal(part,w,h);
    const control=binding||!renderControl?'':controlled?`<g data-control="illustrative" aria-label="${escapeHtml(sceneText.control)}" transform="translate(${handle.x} ${handle.y})"><circle r="${height*.011}" fill="#FFF3DB"/><g class="control-turn"><path d="M${-height*.007} 0H${height*.007}"/></g></g>`:`<circle class="handle" cx="${handle.x}" cy="${handle.y}" r="${height*.005}" fill="#B7803D"/>`;
    return `<g id="object-${i}" data-entity-id="${escapeHtml(part.id)}" data-model-variant="${model.variant}" fill="none" stroke="#644931" stroke-width="${height*.003}" stroke-linecap="round" stroke-linejoin="round"><ellipse ${binding?'class="bound-model-shadow" ':''}data-model-shadow="${escapeHtml(part.id)}" cx="${x+w*.08}" cy="${binding?p.stage.groundY-4:y+h*.53}" rx="${w*.48}" ry="${h*.09}" fill="${palette.ink}" opacity=".14" stroke="none"/><g class="focus-${i}" opacity="0"><ellipse cx="${x}" cy="${y}" rx="${w*.53}" ry="${h*.6}" fill="${palette.accent}" opacity=".35" stroke="none"/></g><g transform="translate(${x} ${y})">${binding?'':illustration.svg+thermal}<ellipse class="energy-effect" rx="${w*.4}" ry="${h*.4}" fill="#F0C545" opacity="0" stroke="none"/></g>${!binding&&!art&&focal&&c.setting==='workshop'?`<path d="M${x-w*.5} ${y+h*.5}H${x+w*.5}M${x-w*.45} ${y+h*.5}V${p.stage.groundY}M${x+w*.45} ${y+h*.5}V${p.stage.groundY}" stroke="#765438"/>`:''}${control}${showLabel?`<g class="model-label"><rect x="${x-w*.56}" y="${labelY-font}" width="${w*1.12}" height="${labelHeight+font*.35}" rx="6" fill="${palette.surface}" stroke="none"/><text x="${x}" y="${labelY}" text-anchor="middle" stroke="none" fill="${palette.ink}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${font}">${lines.map((text,j)=>`<tspan x="${x}" dy="${j?font*1.15:0}">${escapeHtml(text)}</tspan>`).join('')}</text></g>`:''}</g>`;
  }).join('');
  const supportingBindings=c.propBindings.filter(binding=>boundProp(shot,binding).prefix);
  const relationClock=supportingBindings.length?compiledPropFrames(result.compiled.frames,new Map(c.propBindings.map(binding=>{
    const owner=boundProp(shot,binding);return [binding.propId,ownerCompilations.get(owner.id)!.frames] as const;
  }))):result.compiled.frames;
  const relation=cinematicRelations(shot,width,height,relationClock),connections=relation.html;
  calls.push(...relation.calls);
  for(const e of v.events){
    const i=v.parts.findIndex(part=>part.id===e.targetId),start=(e.startMs-shot.startMs)/1000,end=(e.endMs-shot.startMs)/1000,span=end-start;
    const binding=c.propBindings.find(binding=>binding.partId===e.targetId),motionTargets=modelTargets(e.targetId,binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`,'.motion');
    calls.push(`tl.set(${selector(`.focus-${i}`)},{opacity:1},${start});tl.set(${selector(`.focus-${i}`)},{opacity:0},${end});`);
    if(e.type==='state'){
      const thermalTarget=binding?`#${boundProp(shot,binding).svgId}`:`#object-${i}`;
      for(const state of ['hot','cold'])for(const target of modelTargets(e.targetId,thermalTarget,`.thermal-${state}-coat`))calls.push(`tl.to(${target},{opacity:${e.state===state?.62:0},duration:${Math.min(.28,span)},ease:"sine.inOut"},${start});`);
      const hotTargets=modelTargets(e.targetId,thermalTarget,'.thermal-hot'),coldTargets=modelTargets(e.targetId,thermalTarget,'.thermal-cold');
      for(const [index,target] of hotTargets.entries())calls.push(`tl.set(${target},{opacity:${e.state==='hot'?1:0}},${start});tl.set(${coldTargets[index]},{opacity:${e.state==='cold'?1:0}},${start});`);
    }
    if(e.motion==='rotate')for(const motionTarget of motionTargets)calls.push(`tl.to(${motionTarget},{rotation:120,duration:${span},ease:"none"},${start});`);
```

## library/shots/cinematic.ts [182..194] full SHA eb7e69cf0048f6a5507dcbe250e3a19240aad9757c6f496f9897fbd30661e2d2

```ts
      const clip=`${shot.id}.camera-viewport`,top=height*CAMERA_VIEWPORT.top,bottom=height*CAMERA_VIEWPORT.bottom;
      const title=art?.showHeading===false?'':`<rect x="0" y="0" width="${width}" height="${top}" fill="${palette.background}"/><rect x="0" y="${bottom}" width="${width}" height="${height-bottom}" fill="${palette.background}"/><rect x="${width*.033}" y="${height*.032}" width="${width*.38}" height="${height*.085}" rx="10" fill="${palette.surface}"/><text x="${width*.045}" y="${height*.07}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${height*.028}" fill="${palette.ink}">${heading[v.type]}</text><text x="${width*.045}" y="${height*.102}" font-family="${escapeHtml(sceneText.fontFamily)}" font-size="${height*.017}" fill="${palette.ink}">${escapeHtml(sceneText.setting)}</text>`;
      const foreground=planes.foreground.html||(!art?`<path d="M${width*.82} ${height*.78}Q${width*.90} ${height*.75} ${width} ${height*.77}V${height}H${width*.82}Z" fill="#644931" opacity=".18"/>`:'');
      let base=file.content;
      if(art&&!background)base=base.replace(/<rect width="[^"]+" height="[^"]+" fill="url\(#stage-light\)"\/>/, '').replace(/<path d="M0 [^"]+" stroke="#8F7852" stroke-width="2"\/>/,'');
      const content=base.replace('</defs>',`<clipPath id="${clip}"><rect x="0" y="${top}" width="${width}" height="${bottom-top}"/></clipPath></defs>${art&&!background?`<rect width="${width}" height="${height}" fill="${palette.background}"/>`:''}<g data-stage-plane="background">${planes.background.html}</g><g clip-path="url(#${clip})"><g class="camera-rig" data-light-direction="upper-left" data-framing="${c.camera.framing}" data-focus="${c.camera.focus??'ensemble'}">${planes.worldBackground.html?`<g data-stage-plane="background" data-art-space="world">${planes.worldBackground.html}</g>`:''}`)
        .replace('<ellipse id="ground-shadow"',`<g data-stage-plane="midground">${!background&&!art?decoration:''}${planes.midground.html}${connections}${objects}</g><ellipse id="ground-shadow"`)
        .replace('</svg></div>',`${supporting}<g data-stage-plane="foreground">${foregroundModels.join('')}${foreground}</g></g></g><g data-stage-plane="overlay">${planes.overlay.html}</g>${title}</svg></div>`);
      let authored=content;for(const [id,svg] of propArt)authored=authored.replace(new RegExp(`<g id="${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">[\\s\\S]*?</g>`),()=>svg);
      if(c.actorScene?.primary===null)authored=authored.replace('<g id="performer"','<g opacity="0" id="performer"').replace('<ellipse id="ground-shadow"','<ellipse visibility="hidden" id="ground-shadow"');
      else if(c.actorScene?.primary)authored=authored.replace('<g id="performer"',`<g data-actor-id="${escapeHtml(c.actorScene.primary.id)}" id="performer"`);
      return {...file,content:authored};
    }
```

## library/shots/cinematic.ts [208..225] full SHA eb7e69cf0048f6a5507dcbe250e3a19240aad9757c6f496f9897fbd30661e2d2

```ts
    const f=samplePerformance(performer.performance,performer.profile,reach,performer.activity,performer.sourceClock,performer.actingClock),anchor=g.target!,handSide=rigHand(g),hand=f.hands[handSide];
    geometry.interactions.push({actorId:performer.id,handSide,type:a.type,startMs:g.startMs+shot.startMs,reachMs:Math.round(reach)+shot.startMs,endMs:g.endMs+shot.startMs,partId:target.partId,
      target:anchor,hand,errorPx:Math.hypot(hand.x-anchor.x,hand.y-anchor.y),root:f.root,gaze:anchor,
      ...(sourceGesture?{sourceGesture:{id:sourceGesture.id,originalReachMs:sourceGesture.reachMs,originalRecoverMs:sourceGesture.recoverMs,
        samplePhase:reach+shot.startMs<sourceGesture.reachMs?'approach' as const:reach+shot.startMs>sourceGesture.recoverMs?'recovery' as const:'hold' as const,contactVerified:false as const}}:{}),
      ...(a.contactMs===undefined?{}:{contactMs:a.contactMs})});
  }
  if(c.actorScene?.primary!==null)actorReports.unshift({actorId:profile.id,profileHash:profile.profileHash,rigHash:rig.rigHash,report:result.compiled.report});
  return {files,geometry,report:{...result.compiled.report,camera:validateCamera(shot,profile,primaryActingClock,{worldShot:shot,board}),actors:actorReports,...(foregroundParts.size?{modelForegroundVersion:MODEL_FOREGROUND_VERSION,foregroundModels:[...foregroundParts].map(partId=>({partId,...(c.propBindings.find(binding=>binding.partId===partId)?{propId:c.propBindings.find(binding=>binding.partId===partId)!.propId}:{})}))}:{}),...(seats.length?{seatSupportVersion:SEAT_SUPPORT_VERSION,seatSupports:seats}:{}),...(c.propBindings.length?{boundModelMotionVersion:PROP_BINDING_VERSION,boundModels:c.propBindings.map(binding=>{
    const owner=boundProp(shot,binding),prop=owner.prop,g=owner.performance.gestures.find(g=>g.propId===prop.id)!;
    return {...binding,actorId:owner.id,ownerScale:owner.performance.scale,gestureId:g.id,action:g.action,hand:rigHand(g),gripOffset:prop.gripOffset??{x:0,y:0},origin:prop.origin,gripDestination:g.destination,placedCenter:prop.destination,contactMs:g.contactMs,releaseMs:g.releaseMs};
  })}:{})}};
}

// Legacy seven-argument callers retain the rig report type and byte contract.
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration):ReturnType<typeof renderRigCinematic>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background:string|undefined,narration:Narration|undefined,motions:ReadonlyMap<string,ActorMotion>|undefined,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard):ReturnType<typeof renderRigCinematic>|ReturnType<typeof renderSpriteScene>;
export function renderCinematic(shot:Shot,profile:HostProfile,rig:HostRig,activity:SpeechActivity,config:FactoryConfig,background?:string,narration?:Narration,motions?:ReadonlyMap<string,ActorMotion>,speech?:ReadonlyMap<string,import('../../packages/motion/speech-schemas.js').ActorSpeech>,board?:Storyboard){
```

## library/shots/cinematic-models.ts [50..74] full SHA 1e87d63790cd8129358d2490b894349122a01da5914d03c70c336cc08ebc4de1

```ts
  return `<path class="arrowhead" d="M${tip.x} ${tip.y}L${tip.x-dx*size-dy*size*.45} ${tip.y-dy*size+dx*size*.45}L${tip.x-dx*size+dy*size*.45} ${tip.y-dy*size-dx*size*.45}Z" fill="#765438"/>`;
};

/** Directed relations use arrowheads; compare and part-of do not imply causality. */
export function cinematicRelations(shot:Shot,width:number,height:number,frames?:PropMotionFrame[]) {
  const v=shot.visualization!,html:string[]=[],calls:string[]=[],scope=`[data-composition-id="${shot.id}"]`;
  const bindings=shot.cinematic?.propBindings??[];
  const centerAt=(part:Part,time:number)=>{
    const binding=bindings.find(binding=>binding.partId===part.id);
    if(!binding||!frames?.length)return point(part.x*width,part.y*height);
    let low=0,high=frames.length-1;
    while(low<high){const middle=Math.floor((low+high)/2);if(frames[middle]!.timeMs<time)low=middle+1;else high=middle;}
    const right=frames[low]!,left=frames[Math.max(0,low-1)]!,a=left.props[binding.propId]?.point,b=right.props[binding.propId]?.point;
    if(!a||!b)throw new Error(`${shot.id}: relation lacks compiled prop ${binding.propId}`);
    const mix=left.timeMs===right.timeMs?0:Math.max(0,Math.min(1,(time-left.timeMs)/(right.timeMs-left.timeMs)));
    return point(a.x+(b.x-a.x)*mix,a.y+(b.y-a.y)*mix);
  };
  const geometryAt=(a:Part,b:Part,time:number)=>{
    const ca=centerAt(a,time),cb=centerAt(b,time),dx=cb.x-ca.x,dy=cb.y-ca.y,length=Math.hypot(dx,dy);
    if(length<1)throw new Error(`${shot.id}: relation endpoints overlap during model motion at ${time}ms`);
    const ux=dx/length,uy=dy/length,radius=(part:Part)=>Math.min(part.width*width*.53/Math.max(.001,Math.abs(ux)),part.height*height*.53/Math.max(.001,Math.abs(uy)));
    const start=point(ca.x+ux*radius(a),ca.y+uy*radius(a)),end=point(cb.x-ux*radius(b),cb.y-uy*radius(b));
    return {start,end,control:point((start.x+end.x)/2,Math.min(start.y,end.y)-height*.055)};
  };
  const curvePoint=(g:ReturnType<typeof geometryAt>,t:number)=>point((1-t)**2*g.start.x+2*(1-t)*t*g.control.x+t*t*g.end.x,(1-t)**2*g.start.y+2*(1-t)*t*g.control.y+t*t*g.end.y);
```

## library/shots/cinematic-models.ts [127..139] full SHA 1e87d63790cd8129358d2490b894349122a01da5914d03c70c336cc08ebc4de1

```ts
    const explicit=v.events.some(e=>e.targetId===r.to&&e.motion!=='none'&&e.startMs<event.endMs&&e.endMs>event.startMs+span*1000);
    if(!explicit&&['wheel','gear'].includes(b.kind))calls.push(`tl.to(${motion},{rotation:100,duration:${remaining},ease:"none"},${begin+span});`);
    else if(!explicit&&b.kind==='engine')calls.push(`tl.to(${motion},{opacity:.3,duration:${remaining/2},ease:"sine.inOut"},${begin+span});tl.to(${motion},{opacity:1,duration:${remaining/2},ease:"sine.inOut"},${begin+span+remaining/2});`);
    }
  }
  return {html:html.join(''),calls};
}


```

## packages/director/camera.ts [203..237] full SHA 399bc3a0ecd5894a00de3025a355ec0a115ebaee5ab8d66036e27f866fc67e30

```ts

/** Geometric envelopes cover both transform endpoints, bounded pan and the complete locomotion path. */
export function validateCamera(shot:Shot,profile:HostProfile,actingClock?:ViewActingClock,context?:{worldShot:Shot;board?:Storyboard}) {
  const c=shot.cinematic;if(!c)throw new Error(`${shot.id}: camera requires canonical cinematic data`);
  const camera=CameraSchema.parse(c.camera),p=c.performance,{width,height,groundY}=p.stage;
  const fail=(message:string):never=>{throw new Error(`${shot.id}: camera ${message}`);};
  if(shot.camera.angle!=='eye-level')fail('supports only eye-level 2D framing; other angles require a different renderer.');
  if(camera.anchor.x<0||camera.anchor.x>width||camera.anchor.y<0||camera.anchor.y>height)fail('anchor must be inside the world stage.');
  const delta=camera.endScale-camera.startScale;
  if(camera.movement==='push-in'&&delta<=0||camera.movement==='pull-out'&&delta>=0||['locked','pan-left','pan-right'].includes(camera.movement)&&delta!==0)fail('movement contradicts its start/end scale.');
  const bounds=cameraHostBounds(p,profile,actingClock),worldRatio=bounds.ratio.max;
  const matrices=[cameraMatrixAt(camera,p.stage,p.durationMs,0),cameraMatrixAt(camera,p.stage,p.durationMs,p.durationMs)];
  const inView=(point:Point,padX=0,padY=padX)=>matrices.every(matrix=>{
    const screen=cameraPoint(point,matrix);
    return screen.x-padX*matrix.scale>=width*CAMERA_VIEWPORT.left-.01&&screen.x+padX*matrix.scale<=width*CAMERA_VIEWPORT.right+.01&&
      screen.y-padY*matrix.scale>=height*CAMERA_VIEWPORT.top-.01&&screen.y+padY*matrix.scale<=height*CAMERA_VIEWPORT.bottom+.01;
  });
  const boundsInView=(b:Bounds)=>inView({x:b.left,y:b.top})&&inView({x:b.right,y:b.bottom});
  const worldShot=context?.worldShot??shot,world=worldShot.cinematic!,ownerBounds=new Map<string,ReturnType<typeof cameraHostBounds>>();
  const movingBounds=(part:NonNullable<Shot['visualization']>['parts'][number])=>{
    const binding=world.propBindings.find(b=>b.partId===part.id);
    let motion:Bounds|undefined;
    if(binding){
      const owner=boundProp(worldShot,binding);
      if(!ownerBounds.has(owner.id)){
        const definition=owner.character?actorProfile(owner.character):profile;
        const clock=context?.board?actorViewActingClock(context.board,worldShot,owner.id):owner.id===profile.id?actingClock:undefined;
        ownerBounds.set(owner.id,cameraHostBounds(owner.performance,definition,clock));
      }
      motion=ownerBounds.get(owner.id)!.props[binding.propId];
      if(!motion)fail(`bound model ${part.id} has no motion envelope from its real owner.`);
    }
    return motion??{left:part.x*width,right:part.x*width,top:part.y*height,bottom:part.y*height};
  };
  const modelBounds=(part:NonNullable<Shot['visualization']>['parts'][number])=>{
```

## packages/director/index.ts [227..249] full SHA 65aff5f300494a660271e9227f38506d0bb305a96fd5f59cfe1c4d411c84629e

```ts
    validateSpriteScenePlan(shot);
    if(c.camera.framing!==shot.camera.shotSize||c.camera.movement!==shot.camera.movement)throw new Error(`${shot.id}: camera plan differs from shot`);
    return;
  }
  if(hash(c.continuity.entry)!==hash(bodyRootAt(p,shot.startMs,0))||Math.abs(c.continuity.exit.x-bodyRootAt(p,shot.startMs,p.durationMs).x)>.01||c.continuity.exit.y!==p.stage.groundY)throw new Error(`${shot.id}: cinematic continuity disagrees with locomotion`);
  if(validateWorld)validatePropBindings(shot);
  if(validateWorld&&hash(c.continuity.models)!==hash(modelExitParts(shot).map(part=>({partId:part.id,x:part.x,y:part.y,width:part.width,height:part.height}))))throw new Error(`${shot.id}: model continuity disagrees with stage transforms`);
  const exitFacing=[...(p.turns??[])].sort((a,b)=>a.startMs-b.startMs).at(-1)?.direction??p.facing??'front';
  if(c.continuity.facing!==exitFacing)throw new Error(`${shot.id}: cinematic facing disagrees with turn exit`);
  if(c.camera.framing!==shot.camera.shotSize||c.camera.movement!==shot.camera.movement)throw new Error(`${shot.id}: camera plan differs from shot`);
  validatePerformance(p,profile);
  if(sourceBodyPlan(p).supports?.length&&(!c.actorScene?.primary||!c.artDirection||!['authored','model'].includes(c.artDirection.origin)))throw new Error(`${shot.id}: seated acting requires a story actor and authored/model stage direction`);
  sceneSeats(shot);
  validateCamera(shot,profile,actingClock,{worldShot:clockSourceShot,board});
  if(c.actorScene?.primary!==null)validateComparisonReadability(shot,profile,actingClock);
  for(const actor of c.actorScene?.supporting??[]){
    const actorDefinition=actorProfile(actor.character,profile);
    validateCinematicActorShot({...shot,host:{...shot.host!,id:actorDefinition.id,rigHash:shot.host!.rigHash,actions:actor.actions},
      cinematic:{...c,leadCharacterId:actorDefinition.id,performance:actor.performance,propBindings:[],
        continuity:{...c.continuity,entry:bodyRootAt(actor.performance,shot.startMs,0),exit:bodyRootAt(actor.performance,shot.startMs,actor.performance.durationMs),facing:actor.performance.turns?.at(-1)?.direction??actor.performance.facing??'front'},
        actorScene:{primary:actor.character,speakingSegmentIds:actor.speakingSegmentIds,continuity:'cut',supporting:[]}}},actorDefinition,config,false,board,clockSourceShot);
  }
  const consumed=new Set<string>();
```

## packages/animation/compiler.ts [129..138] full SHA 1c89e049ef14cd4bdc1876fb93a5c46025cfccd642ae02692e748a7c62276060

```ts
  if(!usesBodyView(profile))return;
  if(plan.headTurns?.length)throw new Error('needs-head-turn-registration: authored head cells still need continuity repair, source landmarks and original head-clock registration; see /api/topics/prehistoric-life/head-turn-art');
  if(plan.headView!==registeredBodyView(profile).view||plan.turns?.length)throw new Error('needs-body-registration: candidate uses one matching fixed head/body view');
  if(hasBodyViewLocomotion(profile))validateNativeLocomotion(sourceBodyPlan(plan),profile,registeredBodyView(profile));
  else if(plan.walks.length||plan.jumps?.length||plan.supports?.length||plan.postures?.length||plan.entryPosture)throw new Error('needs-view-motion: authored-view cloth/locomotion/seated registration is pending; select registered-locomotion-v1 for the native candidate');
  if(!hasNativeHeadBank(profile)&&plan.expressions.some(e=>e.mood!=='happy')&&!hasBodyViewExpressions(profile))throw new Error('needs-view-expression: authored-view candidate needs explicit registered expressions for non-happy emotions');
  if(plan.gazes.length&&!hasBodyViewEyes(profile)&&!hasNativeHeadEyes(profile))throw new Error('needs-view-gaze: explicit target gaze needs its registered fixed-view or source-cell eyes');
  if(plan.facing!==undefined&&plan.facing!==bodyViewFacing(profile))throw new Error('needs-body-registration: fixed authored artwork cannot portray the opposite body direction');
  if(plan.gestures.some(g=>g.action!=='point'&&g.action!=='think'&&!(hasBodyViewLocomotion(profile)&&g.action==='react')))throw new Error('needs-view-motion: native gesture has no registered point/think/react candidate');
  if(bodyViewFacing(profile)==='left'&&(plan.spears?.length||plan.props.some(p=>p.kind==='spear')))throw new Error('needs-view-tool-pose: left-view spear grip and contact have not been authored');
```

## apps/server/cinematic.ts [33..49] full SHA ee9b45f5909b68a6a732705130bb767d6207618bd2dcf8962fb5ee7c0ffa49fa

```ts
  }
  for (const [i, shot] of board.shots.entries()) {
    const c = shot.cinematic;
    if (!c) throw new ApiError(422, `${shot.id}: cinematic plan is missing. Replan in story-cinematic mode.`, 'CINEMATIC_INVALID');
    try{validateArtDirection(shot);}catch(error){throw new ApiError(422,error instanceof Error?error.message:String(error),'CINEMATIC_INVALID');}
    const unsupported = (message: string): never => { throw new ApiError(422, `${shot.id}: ${message}`, 'CINEMATIC_UNSUPPORTED'); };
    if (shot.camera.angle !== 'eye-level') unsupported('The cinematic camera supports only eye-level 2D framing; other angles require a different renderer.');
    if (c.continuity.carriedProps.length) unsupported('Carried props are not supported by the current cinematic clips.');
    if (shot.host?.presence !== 'beside-model'&&!(c.actorScene?.primary===null&&shot.host?.presence==='absent')) unsupported('Absent performance requires an explicit mechanism-only actor scene.');
    const performances=[c.performance,...(c.actorScene?.supporting.map(actor=>actor.performance)??[])];
    if (performances.reduce((count,p)=>count+p.props.length,0)!==c.propBindings.length || performances.some(p=>p.gestures.some(g => !CINEMATIC_CLIPS.includes(g.action)))) {
      unsupported('Animated props need a sourced model binding. Unsupported clips and cross-cut carry require a production continuity plan.');
    }
    try{validatePropBindings(shot);}catch(error){throw new ApiError(422,error instanceof Error?error.message:String(error),'CINEMATIC_INVALID');}
    const old = previous?.shots.find(s => s.id === shot.id)?.cinematic;
    if(old&&old.artDirection?.useEnvironment!==c.artDirection?.useEnvironment&&old.environmentAssetId)unsupported('Changing the background asset source requires production replanning; preserve the environment setting during direct edits.');
    if (old && (old.setting !== c.setting || old.environmentAssetId !== c.environmentAssetId)) unsupported('Environment changes require replanning through the production asset resolver; direct environment replacement is not supported.');
```
