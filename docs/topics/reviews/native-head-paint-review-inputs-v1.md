# Frozen source-head paint review inputs v1

Source/static advice only. No tools, tests, callbacks, geometry, fixture/compiler/sampler/server/browser/API/pipeline/TTS/ASR/render/audio/video. Actual runtime/art acceptance belongs to human test model. Preserve exact source/identity/clock/approval gates. Do not claim pose/art/source geometry validated.

## packages/animation/compiler.ts [720..742] SHA aa8678f741bd5825d7766b142168e85114f8c09d1d5351565f1bcfeffbeb0f73

```ts
  const spearStates=(plan.spears??[]).map(track=>{
    const point=m.shoulders?.[track.hand],shoulder=toWorld(point?.x??m.shoulderOffset*(track.hand==='left'?-1:1),point?.y??m.shoulderY-m.pelvisY);
    const state=sampleSpear(track,plan.props.find(p=>p.id===track.propId)!,t,s,shoulder,lean);
    if(track.action==='thrust'&&(state.extension<0||state.extension>m.upperArm*s*.6))throw new Error(track.id+': aim must require a forward strike within rig reach');
    const half=(plan.props.find(p=>p.id===track.propId)!.length??120)*s/2,angle=state.angle*Math.PI/180;
    for(const end of [-1,1]){const p={x:state.center.x+end*half*Math.cos(angle),y:state.center.y+end*half*Math.sin(angle)};if(p.x<0||p.x>plan.stage.width||p.y<0||p.y>plan.stage.groundY)throw new Error(track.id+': spear shaft leaves the physical stage');}
    return {track,state};
  });
  const headState=headGeometry(profile,{physical,m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend,kneeSeatWeight,seatProgress});
  const {headArtScale,headAngle,headBottom,neckStart,neckEnd,head}=headState;
  if(usesReferenceBody(profile))transforms['neck-art']=transform(neckStart,lean,s*profile.appearance.bodyScale);
  transforms.neck=`translate(${number(neckStart.x)} ${number(neckStart.y)}) rotate(${number(degrees(Math.atan2(neckEnd.y-neckStart.y,neckEnd.x-neckStart.x))-90)}) scale(${number(s)} ${number(distance(neckStart,neckEnd))})`;
  transforms.head=transform(head,headAngle,s*headArtScale);
  if(hasNativeHeadRear(profile))transforms['head-back']=transforms.head;
  transforms['face-orientation']=transform({x:orientation*5,y:0},0,1-Math.abs(orientation)*.1);
  const chinAt=(side:RigHand)=>add(head,rotate(usesCutoutHead(profile)?{x:sourceChinPoint(plan,profile,t,side,actingClock).x*s*headArtScale,y:sourceChinPoint(plan,profile,t,side,actingClock).y*s*headArtScale}:{x:m.headRadius*.3*s*(side==='left'?-1:1),y:(usesReferenceBody(profile)?headBottom*.85:m.headRadius*.875)*s},headAngle));
  const garment=usesReferenceBody(profile)&&!usesBodyView(profile)?referenceGarmentMotion(profile):undefined,viewCloth=hasBodyViewLocomotion(profile)?registeredBodyView(profile):undefined;
  // Source-owned body tracks and attention can precede this camera slice.
  // Clamp cloth lag at the original run entry, never at an interior cut.
  const lagFloor=viewCloth&&actingClock?actingClock.runStartMs-actingClock.startMs:0;
  const lagged=garment||viewCloth?bodyStateAt(plan,profile,Math.max(lagFloor,t-(viewCloth?VIEW_CLOTH_LAG_MS:garment!.lagMs)),actingClock):undefined;
  const viewThighAngles={left:0,right:0};
  const thighAngles:number[]=[];
```

## packages/animation/compiler.ts [1160..1179] SHA aa8678f741bd5825d7766b142168e85114f8c09d1d5351565f1bcfeffbeb0f73

```ts
      if(hasBodyViewSeat(profile))error=Math.max(error,nativeSeatMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      else if(hasBodyViewLocomotion(profile))error=Math.max(error,nativeClothMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      if(hasBodyViewSecondary(profile))error=Math.max(error,nativeSecondaryMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(usesReferenceBody(profile)&&!usesBodyView(profile))error=Math.max(error,seatedGarmentMatrixError(profile,a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.bodyScale/.2);
      if(usesReferenceBody(profile)&&!usesCutoutHead(profile))error=Math.max(error,headProjectionMatrixError(profile.appearance.characterVariant!,a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.headScale*rigMetrics(profile).headArtworkScale!/.2);
      for(const [id,from] of Object.entries(a.face)){
        // Audio activity is intentionally stepped at its own explicit boundaries.
        if(id==='mouth-talk'||isPainterSlot(id)||isNativeFacePainterSlot(profile,id))continue;
        // Authored-view swaps and voice-gated mouth selection are discrete. Eye
        // and brow interpolation is still checked against the pure evaluator.
        if(usesReferenceHead(profile)&&(id.startsWith('head-view-')||id.startsWith('head-back-view-bank-')||id.startsWith('mouth-')))continue;
        const to=b.face[id]!,wanted=actual.face[id]!;
        for(const key of ['opacity','scaleX','scaleY','rotation','x','y'] as const){
          if(from[key]===undefined||to[key]===undefined||wanted[key]===undefined)continue;
          const limit=(key==='rotation'||key==='x'||key==='y')?.02:.002;
          error=Math.max(error,Math.abs(lerp(from[key]!,to[key]!,progress)-wanted[key]!)/limit);
        }
      }
    }
    return error;
```

## packages/animation/compiler.ts [1201..1225] SHA aa8678f741bd5825d7766b142168e85114f8c09d1d5351565f1bcfeffbeb0f73

```ts
      duration=precise?interval:Number(interval.toFixed(6)),position=precise?at:Number(at.toFixed(6)),method=i?'to':'set';
    for(const [id,value] of Object.entries(f.transforms))if(!i||value!==frames[i-1]!.transforms[id])calls.push(`tl.${method}(${selector(id)},${JSON.stringify({attr:{transform:value},...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);
    for(const [id,value] of Object.entries(f.paths??{}))if(!i||value!==frames[i-1]!.paths?.[id])calls.push(`tl.${method}(${selector(id)},${JSON.stringify({attr:{d:value,...(id.startsWith('ink-')?{'stroke-width':profile.appearance.strokeWidth*plan.scale*(usesReferenceBody(profile)?profile.appearance.bodyScale:1)}:{})},...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);
    for(const [id,value] of Object.entries(f.face))if(!i||JSON.stringify(value)!==JSON.stringify(frames[i-1]!.face[id])){
      if(!usesReferenceHead(profile)){calls.push(`tl.${method}(${selector(id)},${JSON.stringify({...value,...(i?{duration,ease:'none'}:{immediateRender:true})})},${position});`);continue;}
      const voiceChange=i&&Object.keys(f.face).some(key=>key.startsWith('mouth-talk-')&&f.face[key]!.opacity!==frames[i-1]!.face[key]!.opacity);
      const discrete=isPainterSlot(id)||isNativeFacePainterSlot(profile,id)||id.startsWith('head-view-')||id.startsWith('head-back-view-bank-')||id.startsWith('mouth-talk-')||id.startsWith('mouth-')&&voiceChange;
      const attrs={...value.attr,...(value.x!==undefined||value.y!==undefined||value.rotation!==undefined||value.scaleX!==undefined||value.scaleY!==undefined?
        {transform:`translate(${number(value.x??0)} ${number(value.y??0)}) rotate(${number(value.rotation??0)}) scale(${number(value.scaleX??1)} ${number(value.scaleY??1)})`}:{})};
      // SVG matrices are local to the fixed feature anchor. GSAP's CSS transform
      // origin/bounding-box inference cannot displace eyes or move the mouth.
      calls.push(`tl.${discrete?'set':method}(${selector(id)},${JSON.stringify({...(Object.keys(attrs).length?{attr:attrs}:{}),...(value.opacity===undefined?{}:{opacity:value.opacity}),
        ...(i&&!discrete?{duration,ease:'none'}:{immediateRender:!i})})},${discrete?f.timeMs/1000:position});`);
    }
  }
  return {js:calls.join('\n'),frames,report:{compilerVersion:plan.compilerVersion===HUNT_ANIMATION_VERSION?HUNT_ANIMATION_VERSION:plan.compilerVersion===AIRBORNE_ANIMATION_VERSION?AIRBORNE_ANIMATION_VERSION:ANIMATION_VERSION,planHash:hash(plan),profileHash:profile.profileHash,
    ...(hasNativeHeadBank(profile)?{nativeHeadBank:{fingerprint:registeredNativeHeadBank(profile).fingerprint,sources:nativeHeadSources(registeredNativeHeadBank(profile)),sourceTrack:plan.sourceHead,method:'authored cells on the original run clock; uniform registered pixel-scale and neck-axis attachment, local source-face masks; single unknown-angle cell is fixed, no face crossfade',capabilities:registeredNativeHeadBank(profile).capabilities,
      ...(hasNativeHeadSpeech(profile)?{sourceFace:{versions:[...new Set(registeredNativeHeadBank(profile).cells.map(c=>c.face!.version))],version:registeredNativeHeadBank(profile).capabilities.expressions?'native-head-face-2':'native-head-face-1',activityMethod:activity.method,sourceAudioHash:activity.audioHash??null,sourcePhase:sourceClock?speechSourceClockDescription(sourceClock):null,blinkClock:'original absolute clock',
        ...(registeredNativeHeadBank(profile).capabilities.expressions?{expressionClock:'complete original actor expressions; return to this cell rest mood',browInterpolation:'own glyph matrices included in source-pixel refinement',expressionVerified:false}:{}),phonemeLipSync:false,audioVerified:false,opticalGazeVerified:false}}:{}),approved:false,productionReady:false,motionVerified:false}}:{}),
    ...(hasNativeHeadBank(profile)&&registeredNativeHeadBank(profile).cells.some(c=>c.paint)?{nativeHeadPaint:{...nativeHeadPaintDescription,bankFingerprint:registeredNativeHeadBank(profile).fingerprint,cells:registeredNativeHeadBank(profile).cells.map(c=>({id:c.id,paint:c.paint})),rearPresent:hasNativeHeadRear(profile),attachment:'exact head transform and original source cell opacity; head-back before all body paint'}}:{}),
    durationMs:plan.durationMs,fps:plan.fps,frames:frames.length,maxContactError:Math.max(...frames.map(f=>f.contactError)),
    maxHandContactError:{left:Math.max(...frames.map(f=>f.contactErrors.left)),right:Math.max(...frames.map(f=>f.contactErrors.right))},gestureHands:[...new Set(plan.gestures.map(rigHand))],
    maxInterpolationGapPx:Math.max(...frames.slice(1).map((f,i)=>interpolationGap(frames[i]!,f,profile,plan))),interpolationGapLimitPx:.2,interpolationIncludes:['bones/cuff','spear palms/shared shaft','tip during contact hold'],selectedClips:selectedClips(plan),
    ...(physical.supports?.length?{seatSupports:physical.supports,maxSeatContactErrorPx:Math.max(0,...frames.flatMap(f=>f.seatContact?[f.seatContact.errorPx]:[]))}:{}),
    ...(usesReferenceHead(profile)?{headArtwork:{version:referenceHeadDescription().version,fingerprint:referenceHeadDescription().fingerprint,
```

## packages/topics/head-face-source.ts [20..50] SHA b64e44c694a3d7704e7d35e5bbd028b8d6c6454215de7380729e071ce80f5edb

```ts

/** Fixed catalog lookup, with exact actor/view/head/body/resource identity.
 * This invokes registration validation; implementation agents must not call
 * it while geometry/runtime execution is delegated to the user's model. */
export async function headFaceCandidate(repo:string,actor:NativeHeadActor,view:HeadFaceView='three-quarter-right',mode:HeadFaceMode='speech-eyes'){
  if(!NATIVE_HEAD_ACTORS.includes(actor)||!HEAD_FACE_VIEWS.includes(view)||!HEAD_FACE_MODES.includes(mode))throw new Error('Invalid face candidate actor/view/mode');
  const entry=headFaceCandidatesForMode(mode).find(c=>c.actor===actor&&c.view===view);
  if(!entry)throw new Error(`needs-head-face-candidate: ${actor}/${view} has not been authored`);
  const bytes=await boundedHeadFaceFile(repo,entry.file,200*1024),definition=NativeHeadBankDefinitionSchema.parse(JSON.parse(bytes.toString('utf8')));
  const version=mode!=='speech-eyes'?NATIVE_EMOTION_HEAD_BANK_VERSION:nativeHeadIdentities[actor].supporting?NATIVE_SUPPORTING_HEAD_BANK_VERSION:'native-head-bank-3';
  if(definition.cells.some(c=>!!c.paint)!==(mode==='source-layers'))throw new Error('Face workbench paint must match the explicitly selected source-layers candidate');
  if(definition.actor!==actor||definition.id!==entry.id||definition.version!==version||definition.cells.length!==1||definition.cells[0]!.yawDeg!==null||definition.routes.length||
    definition.bodyViews.length!==1||definition.bodyViews[0]!.view!==view||
    definition.source.file!=='library/topics/prehistoric-life/head-cells/'+entry.headFile)throw new Error('Face workbench needs the exact fixed source-angle candidate and compatible body view');
  if('sha256' in entry&&(definition.source.sha256!==entry.sha256||definition.source.width!==entry.width||definition.source.height!==entry.height))throw new Error('Supporting face candidate differs from its own current catalog artwork');
  const bank=nativeHeadBank(definition);
  for(const resource of nativeHeadResources(bank)){
    if(resource.nativeHeadSource)readNativeHeadSource(repo,{file:resource.file,sha256:resource.sha256,...resource.nativeHeadSource},bank.primary);
    else if(resource.nativeHeadPrimary&&resource.file===bank.primary.file&&resource.sha256===bank.primary.sha256)readNativeHeadPrimary(repo,bank.primary);
    else throw new Error('Unknown face candidate resource identity');
  }
  return {bank,definitionFile:entry.file,definitionHash:hash(bytes)};
}

```

## packages/topics/head-face-workbench.ts [45..67] SHA c67a921cf861945f8092e2a5f867685fa591dedfe2b9f1c3f4b397258546fbc9

```ts
  const selection=HeadFaceSelectionSchema.parse(input);
  if(selection.face==='speech-eyes'&&selection.mood!=='happy')throw new Error('needs-head-turn-expression: select own expressions candidate before changing the source mood');
  const candidate=await headFaceCandidate(repo,selection.actor,selection.view,selection.face),{bank}=candidate;
  const modelIdentity=nativeHeadIdentities[selection.actor];
  const {profile:base,plan:original}=bodyCalibrationPlan(modelIdentity.bodyTemplate,selection.action,'happy',selection.view==='three-quarter-left'?'left':'right',selection.view);
  const {profileHash:discarded,...profileData}=base;
  const appearance=modelIdentity.supporting?supportingNativeTopicAppearance({...base.appearance,supportingModel:selection.actor as keyof typeof prehistoricSupportingModels,bodyHeadBank:bank}):{...base.appearance,bodyHeadBank:bank};
  const data={...profileData,...(modelIdentity.supporting?{id:'workbench-'+selection.actor,name:prehistoricSupportingModels[selection.actor as keyof typeof prehistoricSupportingModels].label,
    description:'Supporting source-head engineering candidate; geometry and video not accepted.',sourcePath:candidate.definitionFile}:{}),appearance};
  const profile=HostProfileSchema.parse({...data,profileHash:hash(data)}),startMs=selection.slice==='whole'?0:2000,endMs=4000;
  const headMotion={version:'native-head-source-1' as const,id:'workbench-source-head',ownerId:profile.id,bankFingerprint:bank.fingerprint,startMs:0,endMs:4000,samples:[{atMs:0,cell:bank.cells[0]!.id}]};
  const originalGestures=original.gestures.map(g=>({...g,sourceSpan:{id:g.id,startMs:g.startMs,endMs:g.endMs}}));
  const gestures=originalGestures.map(viewSourceGestureDefinition);
  const direction=selection.view==='three-quarter-left'?-1:1;
  const gazes=selection.look==='rest'?[]:[{startMs:300,endMs:3600,target:{x:210+direction*(selection.look==='ahead'?160:80),y:selection.look==='up'?100:selection.look==='down'?395:260}}];
  const expressions=selection.face!=='speech-eyes'?[{startMs:300,endMs:3700,mood:selection.mood}]:original.expressions;
  const identity={version:HEAD_FACE_WORKBENCH_VERSION,actor:profile.id,profileHash:profile.profileHash,bank:bank.fingerprint,definitionHash:candidate.definitionHash,
    view:selection.view,action:selection.action,look:selection.look,stage:original.stage,root:original.root,scale:original.scale,headMotion,gestures,gazes,expressions,activity:BODY_MOUTH_PREVIEW_ACTIVITY};
  const plan=PerformancePlanSchema.parse({...original,id:'face-workbench-'+selection.actor,profileHash:profile.profileHash,leadCharacterId:profile.id,
    durationMs:endMs-startMs,sourceHead:headMotion,
    gestures:originalGestures.flatMap(g=>{
      const start=Math.max(startMs,g.startMs),end=Math.min(endMs,g.endMs);
      return end>start?[{...g,startMs:start-startMs,endMs:end-startMs}]:[];
```

## apps/server/index.ts [304..322] SHA 5f8abd921a4ad4d2b40a4e9cf1765a56e024a8d2be01e0d554deef6659dff616

```ts
      .header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'").send(result.bytes);
  }
  // Literal "views" keeps legacy nested asset URLs unambiguous.
  app.get<{Params:{actor:string;view:string;action:string;look:string;slice:string;mood:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/views/:view/:action/:look/:slice/source-layers/:mood/*',async(request,reply)=>{
    const {actor,view,action,look,slice,mood}=request.params;
    return sendHeadFacePreview(reply,{actor,view,action,look,slice,mood,face:'source-layers'},request.params['*'],request.query);
  });
  app.get<{Params:{actor:string;view:string;action:string;look:string;slice:string;mood:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/views/:view/:action/:look/:slice/expressions/:mood/*',async(request,reply)=>{
    const {actor,view,action,look,slice,mood}=request.params;
    return sendHeadFacePreview(reply,{actor,view,action,look,slice,mood,face:'expressions'},request.params['*'],request.query);
  });
  app.get<{Params:{actor:string;view:string;action:string;look:string;slice:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/views/:view/:action/:look/:slice/*',async(request,reply)=>{
    const {actor,view,action,look,slice}=request.params;
    return sendHeadFacePreview(reply,{actor,view,action,look,slice},request.params['*'],request.query);
  });
  // Source0.53 URLs explicitly mean the right-facing source; never infer left.
  app.get<{Params:{actor:string;action:string;look:string;slice:string;'*':string}}>('/api/topics/prehistoric-life/head-face-preview/:actor/:action/:look/:slice/*',async(request,reply)=>{
    const {actor,action,look,slice}=request.params;
    return sendHeadFacePreview(reply,{actor,view:'three-quarter-right',action,look,slice},request.params['*'],request.query);
```

## Authored, unvalidated lila-left-layers-v1

```json
{
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/lila-head-left-dialogue-v1.png",
    "sha256": "0b95893960a2910fa0331db66431bfb828681d3a1b6ce03d9ba901e7d9e2b3a6",
    "width": 1168,
    "height": 1347,
    "pixelScale": 0.1516
  },
  "cell": {
    "id": "left-source-angle",
    "sourceId": "primary",
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1168,
      "height": 1347
    },
    "neck": {
      "x": 575,
      "y": 800
    },
    "neckTop": {
      "x": 575,
      "y": 775
    },
    "chin": {
      "x": 435,
      "y": 741
    },
    "eyeTarget": {
      "x": 386.5,
      "y": 495
    },
    "skull": {
      "x": 160,
      "y": 140,
      "width": 820,
      "height": 650
    },
    "yawDeg": null,
    "seam": [
      {
        "x": 548,
        "y": 750
      },
      {
        "x": 605,
        "y": 755
      },
      {
        "x": 619,
        "y": 794
      },
      {
        "x": 568,
        "y": 814
      }
    ],
    "restMood": "happy",
    "paint": {
      "version": "native-head-paint-1",
      "source": {
        "sha256": "0b95893960a2910fa0331db66431bfb828681d3a1b6ce03d9ba901e7d9e2b3a6",
        "width": 1168,
        "height": 1347
      },
      "rear": [
        {
          "id": "ponytail-behind-body",
          "region": {
            "x": 660,
            "y": 815,
            "width": 508,
            "height": 532
          },
          "frontCut": {
            "x": 662,
            "y": 817,
            "width": 506,
            "height": 530
          }
        }
      ],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  },
  "faceRegions": {
    "mouth": [
      {
        "x": 321,
        "y": 585
      },
      {
        "x": 527,
        "y": 585
      },
      {
        "x": 550,
        "y": 680
      },
      {
        "x": 500,
        "y": 705
      },
      {
        "x": 360,
        "y": 698
      },
      {
        "x": 321,
        "y": 660
      }
    ],
    "eyes": [
      [
        {
          "x": 273,
          "y": 440
        },
        {
          "x": 338,
          "y": 440
        },
        {
          "x": 338,
          "y": 524
        },
        {
          "x": 273,
          "y": 524
        }
      ],
      [
        {
          "x": 431,
          "y": 455
        },
        {
          "x": 506,
          "y": 455
        },
        {
          "x": 506,
          "y": 551
        },
        {
          "x": 431,
          "y": 551
        }
      ]
    ],
    "protectedContours": [
      [
        {
          "x": 310,
          "y": 525
        },
        {
          "x": 370,
          "y": 525
        },
        {
          "x": 370,
          "y": 583
        },
        {
          "x": 310,
          "y": 583
        }
      ]
    ]
  }
}
```

## Authored, unvalidated lila-right-layers-v1

```json
{
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/lila-head-source-angle-v2.png",
    "sha256": "05b555d23110f2837888d49647038d779fd6e398c9dd31af2853dbd5479eb298",
    "width": 1167,
    "height": 1347,
    "pixelScale": 0.1516
  },
  "cell": {
    "id": "source-angle",
    "sourceId": "primary",
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1167,
      "height": 1347
    },
    "neck": {
      "x": 637,
      "y": 815
    },
    "neckTop": {
      "x": 637,
      "y": 780
    },
    "chin": {
      "x": 730,
      "y": 757
    },
    "eyeTarget": {
      "x": 800.5,
      "y": 500
    },
    "skull": {
      "x": 260,
      "y": 180,
      "width": 770,
      "height": 600
    },
    "yawDeg": null,
    "seam": [
      {
        "x": 600,
        "y": 770
      },
      {
        "x": 680,
        "y": 770
      },
      {
        "x": 680,
        "y": 860
      },
      {
        "x": 600,
        "y": 860
      }
    ],
    "restMood": "happy",
    "paint": {
      "version": "native-head-paint-1",
      "source": {
        "sha256": "05b555d23110f2837888d49647038d779fd6e398c9dd31af2853dbd5479eb298",
        "width": 1167,
        "height": 1347
      },
      "rear": [
        {
          "id": "ponytail-behind-body",
          "region": {
            "x": 0,
            "y": 750,
            "width": 585,
            "height": 597
          },
          "frontCut": {
            "x": 0,
            "y": 752,
            "width": 583,
            "height": 595
          }
        }
      ],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  },
  "faceRegions": {
    "mouth": [
      {
        "x": 637,
        "y": 600
      },
      {
        "x": 879,
        "y": 600
      },
      {
        "x": 872,
        "y": 680
      },
      {
        "x": 818,
        "y": 712
      },
      {
        "x": 637,
        "y": 712
      }
    ],
    "eyes": [
      [
        {
          "x": 666,
          "y": 468
        },
        {
          "x": 743,
          "y": 468
        },
        {
          "x": 743,
          "y": 556
        },
        {
          "x": 666,
          "y": 556
        }
      ],
      [
        {
          "x": 861,
          "y": 445
        },
        {
          "x": 935,
          "y": 445
        },
        {
          "x": 935,
          "y": 533
        },
        {
          "x": 861,
          "y": 533
        }
      ]
    ],
    "protectedContours": [
      [
        {
          "x": 827,
          "y": 527
        },
        {
          "x": 875,
          "y": 527
        },
        {
          "x": 875,
          "y": 591
        },
        {
          "x": 827,
          "y": 591
        }
      ]
    ]
  }
}
```

## Authored, unvalidated karo-left-layers-v1

```json
{
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/karo-head-left-dialogue-v1.png",
    "sha256": "2d0adfba965b08425d8c0312d674a997f8a7fa60b90d1532b4f62b58a0ac7410",
    "width": 1312,
    "height": 1199,
    "pixelScale": 0.124
  },
  "cell": {
    "id": "left-source-angle",
    "sourceId": "primary",
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1312,
      "height": 1199
    },
    "neck": {
      "x": 570,
      "y": 1100
    },
    "neckTop": {
      "x": 570,
      "y": 1060
    },
    "chin": {
      "x": 503,
      "y": 1085
    },
    "eyeTarget": {
      "x": 462,
      "y": 556.5
    },
    "skull": {
      "x": 230,
      "y": 200,
      "width": 850,
      "height": 900
    },
    "yawDeg": null,
    "seam": [
      {
        "x": 520,
        "y": 1055
      },
      {
        "x": 620,
        "y": 1055
      },
      {
        "x": 620,
        "y": 1145
      },
      {
        "x": 520,
        "y": 1145
      }
    ],
    "restMood": "happy",
    "paint": {
      "version": "native-head-paint-1",
      "source": {
        "sha256": "2d0adfba965b08425d8c0312d674a997f8a7fa60b90d1532b4f62b58a0ac7410",
        "width": 1312,
        "height": 1199
      },
      "rear": [],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  },
  "faceRegions": {
    "mouth": [
      {
        "x": 344,
        "y": 710
      },
      {
        "x": 645,
        "y": 710
      },
      {
        "x": 680,
        "y": 759
      },
      {
        "x": 671,
        "y": 831
      },
      {
        "x": 609,
        "y": 893
      },
      {
        "x": 405,
        "y": 898
      },
      {
        "x": 350,
        "y": 845
      },
      {
        "x": 330,
        "y": 781
      }
    ],
    "eyes": [
      [
        {
          "x": 328,
          "y": 509
        },
        {
          "x": 386,
          "y": 509
        },
        {
          "x": 386,
          "y": 600
        },
        {
          "x": 328,
          "y": 600
        }
      ],
      [
        {
          "x": 529,
          "y": 504
        },
        {
          "x": 609,
          "y": 504
        },
        {
          "x": 609,
          "y": 609
        },
        {
          "x": 529,
          "y": 609
        }
      ]
    ],
    "protectedContours": [
      [
        {
          "x": 432,
          "y": 578
        },
        {
          "x": 447,
          "y": 594
        },
        {
          "x": 389,
          "y": 632
        },
        {
          "x": 410,
          "y": 681
        },
        {
          "x": 366,
          "y": 695
        },
        {
          "x": 340,
          "y": 635
        },
        {
          "x": 345,
          "y": 618
        },
        {
          "x": 388,
          "y": 606
        },
        {
          "x": 405,
          "y": 587
        }
      ]
    ]
  }
}
```

## Authored, unvalidated karo-right-layers-v1

```json
{
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/karo-head-source-angle-v2.png",
    "sha256": "d4b417a194098670cc20beab4ef8a8488094fcb32ac29dd1725e933d90e17a23",
    "width": 1201,
    "height": 1309,
    "pixelScale": 0.11923
  },
  "cell": {
    "id": "source-angle",
    "sourceId": "primary",
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1201,
      "height": 1309
    },
    "neck": {
      "x": 690,
      "y": 1140
    },
    "neckTop": {
      "x": 690,
      "y": 1100
    },
    "chin": {
      "x": 709,
      "y": 1103
    },
    "eyeTarget": {
      "x": 739,
      "y": 582.5
    },
    "skull": {
      "x": 220,
      "y": 205,
      "width": 860,
      "height": 905
    },
    "yawDeg": null,
    "seam": [
      {
        "x": 632,
        "y": 1080
      },
      {
        "x": 750,
        "y": 1080
      },
      {
        "x": 750,
        "y": 1180
      },
      {
        "x": 632,
        "y": 1180
      }
    ],
    "restMood": "happy",
    "paint": {
      "version": "native-head-paint-1",
      "source": {
        "sha256": "d4b417a194098670cc20beab4ef8a8488094fcb32ac29dd1725e933d90e17a23",
        "width": 1201,
        "height": 1309
      },
      "rear": [],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  },
  "faceRegions": {
    "mouth": [
      {
        "x": 545,
        "y": 766
      },
      {
        "x": 925,
        "y": 766
      },
      {
        "x": 925,
        "y": 938
      },
      {
        "x": 545,
        "y": 938
      }
    ],
    "eyes": [
      [
        {
          "x": 562,
          "y": 540
        },
        {
          "x": 651,
          "y": 540
        },
        {
          "x": 651,
          "y": 645
        },
        {
          "x": 562,
          "y": 645
        }
      ],
      [
        {
          "x": 829,
          "y": 521
        },
        {
          "x": 917,
          "y": 521
        },
        {
          "x": 917,
          "y": 626
        },
        {
          "x": 829,
          "y": 626
        }
      ]
    ],
    "protectedContours": [
      [
        {
          "x": 769,
          "y": 607
        },
        {
          "x": 852,
          "y": 642
        },
        {
          "x": 863,
          "y": 694
        },
        {
          "x": 821,
          "y": 736
        },
        {
          "x": 772,
          "y": 735
        }
      ]
    ]
  }
}
```
