# Frozen native-head follow source review v1

No tools/execution/test/callback/geometry/fixture/compiler/sampler/server/browser/API/pipeline/TTS/ASR/media/render. This is source advice only, not pixel/art/identity/pose/yaw/film approval. Full arbitrary story/script/WAV -> voices -> actors -> final/QC remains mandatory.14 prior definitions and all raw PNGs are unchanged. New bank6 follows ONLY its own rear source texture; Karo has explicit rear=[]/secondary=false.

## packages/animation/compiler.ts [969..997] full SHA 1c89e049ef14cd4bdc1876fb93a5c46025cfccd642ae02692e748a7c62276060

```ts
    const c=registeredBodyView(profile);registeredNativeSecondary(profile,c);
    const offset=actingClock?.startMs??0,startMs=actingClock?.runStartMs??0,endMs=actingClock?.runEndMs??plan.durationMs;
    const control=sampleSecondaryMotion({timeMs:t+offset,startMs,endMs,scale:c.headScale*s*headArtScale,sample:at=>{
      const state=bodyStateAt(plan,profile,at-offset,actingClock),neck=add(state.pelvis,rotate({x:state.m.neckX!*state.s,y:state.m.torsoTop!*state.s},state.lean));
      return {...neck,angle:state.lean};
    }});
    Object.assign(face,nativeSecondaryState(profile,c,control).face);
  }
  if(hasNativeHeadSecondary(profile)){
    if(!actingClock)throw new Error('needs-head-secondary-phase: own rear motion requires the complete original actor clock');
    if(actingClock.startMs!==actingClock.runStartMs&&!plan.sourceBody&&(plan.walks.length||plan.jumps?.length||plan.postures?.length||plan.lunge))throw new Error('needs-head-secondary-phase: moving camera slice needs complete original physical history');
    if(plan.lunge&&(actingClock.startMs!==actingClock.runStartMs||actingClock.endMs!==actingClock.runEndMs))throw new Error('needs-head-secondary-phase: sliced lunge needs an owned original head/body history');
    const {bank,cell}=nativeHeadBankCell(plan,profile,t,actingClock),offset=actingClock.startMs,angle=nativeHeadCellAngle(cell);
    const control=sampleSecondaryMotion({timeMs:t+offset,startMs:actingClock.runStartMs,endMs:actingClock.runEndMs,scale:nativeHeadPixelScale(bank,cell)*s*headArtScale,sample:at=>{
      const state=bodyStateAt(plan,profile,at-offset,actingClock),geometry=headGeometry(profile,state);return {...geometry.head,angle:geometry.headAngle+angle};
    }});
    Object.assign(face,nativeHeadBankRearState(bank,cell.id,control).face);
  }
  if(usesReferenceBody(profile)&&!usesBodyView(profile)){
    const weight=clamp(Object.values(bodyPosture.seatWeights??{}).reduce((sum,n)=>sum+n,0));
    const flex=Math.abs(thighAngles.reduce((sum,n)=>sum+n,0)/thighAngles.length-lean);
    const folded=smooth((weight-.2)/.35)*smooth((flex-35)/35);
    const hasSeat=[...(physical.entryPosture?[physical.entryPosture]:[]),...(physical.postures??[])].some(p=>p.pose==='seated');
    for(const side of ['left','right'] as const){
      transforms['garment-seated-'+side]=transform(pelvis,lean,s*profile.appearance.bodyScale);
      const chosen=side===(bend===1?'right':'left'),surface=seatedGarmentState(profile,side,hasSeat&&chosen?folded:0,chosen?restCloth:undefined);
      Object.assign(face,surface.face);Object.assign(paths,surface.paths);
      face['garment-fold-'+side]={opacity:chosen?1:0};
      face['garment-standing-'+side]={opacity:0};
```

## packages/animation/compiler.ts [1098..1118] full SHA 1c89e049ef14cd4bdc1876fb93a5c46025cfccd642ae02692e748a7c62276060

```ts
  /^native-face-\d+-(?:mouth-(?:layer|generated|emotion-repair)|eyes-layer|brow-screen-(?:left|right)-layer)$/.test(id);

export function compilePerformance(plan:PerformancePlan,profile:HostProfile,activity:SpeechActivity,namespace='',sourceClock?:SpeechSourceClock,actingClock?:ViewActingClock) {
  if(plan.sourceBody&&!actingClock)throw new Error('needs-view-body-phase: source body requires its complete storyboard/run context');
  if(plan.sourceHead&&!actingClock)throw new Error('needs-head-source-phase: source head requires its complete storyboard/run context');
  validatePerformance(plan,profile);
  if(hasBodyViewSpeech(profile)||hasNativeHeadSpeech(profile))validateBodyViewMouthActivity(activity);
  if((hasBodyViewSpeech(profile)||hasBodyViewEyes(profile)||hasNativeHeadSpeech(profile)||hasNativeHeadEyes(profile))&&sourceClock)validateSpeechSourceClock(activity,sourceClock,profile.id,plan.durationMs);
  if(actingClock)validateViewActingClock(plan,actingClock);
  const times=new Set<number>([0,plan.durationMs]);
  if(actingClock?.headMotion)for(const global of nativeHeadTrackTimes(actingClock.headMotion))for(const delta of [-.01,0,.01])times.add(global-actingClock.startMs+delta);
  const physical=sourceBodyPlan(plan),motionOffset=plan.sourceBody?plan.sourceBody.startMs-actingClock!.startMs:0;
  const addSecondaryTime=(at:number)=>{times.add(at);if(hasBodyViewSecondary(profile)||hasNativeHeadSecondary(profile))for(const delay of SECONDARY_MOTION_DELAYS_MS)times.add(at+delay);};
  const addMotionTime=(at:number)=>{addSecondaryTime(at+motionOffset);if(hasBodyViewLocomotion(profile))times.add(at+motionOffset+VIEW_CLOTH_LAG_MS);};
  for(const at of supportMotionTimes(physical))for(const near of [at-.01,at,at+.01])addMotionTime(near);
  if(plan.sourceBody||hasBodyViewSecondary(profile)||hasNativeHeadSecondary(profile))for(const clip of [...physical.walks,...(physical.jumps??[]),...(physical.postures??[])])for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)addMotionTime(at);
  for(let ms=0;ms<plan.durationMs;ms+=1000/plan.fps)times.add(Number(ms.toFixed(4)));
  for(const clip of [...plan.gestures,...(plan.spears??[]),...plan.walks,...(plan.jumps??[]),...(plan.turns??[]),...(plan.headTurns??[]),...(plan.postures??[]),...plan.expressions,...plan.gazes,...activity.intervals]){
    for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)times.add(at);
  }
  if([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION].includes(plan.compilerVersion))for(const clip of expressionRanges(plan)){
```

## packages/animation/compiler.ts [1168..1187] full SHA 1c89e049ef14cd4bdc1876fb93a5c46025cfccd642ae02692e748a7c62276060

```ts
      const actual=frameAt(lerp(a.timeMs,b.timeMs,progress));
      if(hasBodyViewEyes(profile))error=Math.max(error,bodyViewEyesMatrixError(registeredBodyViewEyes(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(hasNativeHeadEyes(profile))error=Math.max(error,nativeHeadBankFacialError(registeredNativeHeadBank(profile),a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(hasBodyViewSeat(profile))error=Math.max(error,nativeSeatMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      else if(hasBodyViewLocomotion(profile))error=Math.max(error,nativeClothMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).bodyScale*plan.scale*profile.appearance.bodyScale/.2);
      if(hasBodyViewSecondary(profile))error=Math.max(error,nativeSecondaryMatrixError(profile,registeredBodyView(profile),a.face,b.face,actual.face,progress)*registeredBodyView(profile).headScale*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
      if(hasNativeHeadSecondary(profile))error=Math.max(error,nativeHeadBankRearError(registeredNativeHeadBank(profile),a.face,b.face,actual.face,progress)*plan.scale*profile.appearance.headScale*profile.appearance.bodyScale/.2);
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
```

## packages/actors/view-acting-clock.ts [35..81] full SHA b5fc56a68d7650ee9100b6f64d3958ad0e2719ddc41a25315c2b77fbe7eaaba7

```ts
  if(new Set(shots.map(s=>s.id)).size!==shots.length)throw new Error('needs-view-acting-phase: duplicate storyboard shot');
  for(let i=0;i<shots.length;i++)if(shots[i]!.endMs<=shots[i]!.startMs||i&&shots[i]!.startMs<shots[i-1]!.endMs)throw new Error('needs-view-acting-phase: overlapping or invalid storyboard clock');
  const at=shots.findIndex(s=>s.id===current.id);
  const entry=(s:Shot)=>{const a=performer(s,actorId);if(!a)return undefined;
    const p=PerformancePlanSchema.parse(a.performance);
    validateBodySourcePlan(p);
    validateNativeHeadBankTrack(p,a.character);
    if(p.sourceHead&&s.cinematic!.actorScene!.primary?.id===actorId&&s.host?.presence==='absent')throw new Error('needs-head-source-phase: source head actor is hidden in a declared camera slice');
    if(p.sourceBody&&s.cinematic!.actorScene!.primary?.id===actorId&&s.host?.presence==='absent')throw new Error('needs-view-body-phase: source body actor is hidden in a declared camera slice');
    if(p.leadCharacterId!==actorId||p.durationMs!==s.endMs-s.startMs)throw new Error('needs-view-acting-phase: performer does not cover its shot');
    if(normalizeViewGazes(p.gazes).some(g=>g.endMs>p.durationMs))throw new Error('needs-view-acting-phase: gaze outside authored shot');
    const scene=s.cinematic!.actorScene!,cast=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(actor=>actor.character)].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    return {shotId:s.id,startMs:s.startMs,endMs:s.endMs,continuity:scene.continuity??'cut',
      castHash:hash(cast.map(character=>ActorDefinitionSchema.parse(character))),geometryHash:hash({stage:p.stage,root:p.root,scale:p.scale,facing:p.facing??'front',headView:p.headView??null,kind:p.kind,profileHash:p.profileHash}),gazes:p.gazes,gestures:p.gestures,
      ...(hasBodyViewExpressions(currentActor.character)||hasNativeHeadBank(currentActor.character)?{expressions:p.expressions}:{}),
      sourceBody:p.sourceBody,
      sourceHead:p.sourceHead,
      ...(hasBodyViewSecondary(currentActor.character)||hasNativeHeadSecondary(currentActor.character)?{secondaryLunge:p.lunge??null}:{}),
      ...(hasBodyViewLocomotion(currentActor.character)?{locomotion:{walks:p.walks,jumps:p.jumps??[],postures:p.postures??[],entryPosture:p.entryPosture??null}}:{})};
  };
  const entries=shots.map(entry);
  const linked=(i:number)=>{
    if(i<=0||shots[i]!.cinematic?.actorScene?.continuity!=='continuous')return false;
    const a=entries[i-1],b=entries[i];
    if([a,b].some(e=>e?.secondaryLunge))throw new Error('needs-view-secondary-phase: a shot-local lunge cannot share secondary history across a continuous camera cut; its complete original body/tool track is not registered');
    if([a,b].some(e=>e?.locomotion&&(e.locomotion.walks.length||e.locomotion.jumps.length||e.locomotion.postures.length||e.locomotion.entryPosture)))throw new Error('needs-view-locomotion-cut: shot-local native motion cannot cross a cut; declare the identical complete sourceBody on every shot in the continuous run');
    if(!a||!b||a.endMs!==b.startMs||a.castHash!==b.castHash||a.geometryHash!==b.geometryHash)throw new Error('needs-view-acting-phase: declared continuous native actor changed clock, cast/view or geometry');
    return true;
  };
  let first=at,last=at;
  while(linked(first))first--;
  while(last+1<shots.length&&linked(last+1))last++;
  const run=entries.slice(first,last+1).map(e=>e!);
  const bodyMotion=collectViewSourceBody(run,run[0]!.startMs,run.at(-1)!.endMs);
  const headMotion=collectNativeHeadTracks(run,run[0]!.startMs,run.at(-1)!.endMs);
  const clock:ViewActingClock={version:VIEW_ACTING_CLOCK_VERSION,ownerId:actorId,startMs:current.startMs,endMs:current.endMs,
    runStartMs:run[0]!.startMs,runEndMs:run.at(-1)!.endMs,sourceIdentityHash:hash({version:VIEW_ACTING_CLOCK_VERSION,actorId,run}),
    gazes:normalizeViewGazes(run.flatMap(e=>e.gazes.map(g=>({...g,startMs:g.startMs+e.startMs,endMs:g.endMs+e.startMs})))),
    gestures:collectViewSourceGestures(run,run[0]!.startMs,run.at(-1)!.endMs),
    ...(bodyMotion?{bodyMotion}:{}),
    ...(headMotion?{headMotion}:{}),
    ...(hasBodyViewExpressions(currentActor.character)||hasNativeHeadBank(currentActor.character)?{expressions:normalizeViewExpressions(run.flatMap(e=>(e.expressions??[]).map(expression=>({...expression,startMs:expression.startMs+e.startMs,endMs:expression.endMs+e.startMs}))))}:{})};
  validateViewActingClockSource(currentActor.performance,clock);return clock;
}

/** Resolve complete source actors once without recursively evaluating their
 * attention. A and B may look at one another; neither gaze moves a body. */
```

## packages/animation/native-head-bank.ts [35..56] full SHA 2d31176e78176aa8792bb75c0dcbad905649edda32af70117406d27395c78ade

```ts
  capabilities:z.object({speech:z.boolean(),directionalEyes:z.boolean(),expressions:z.boolean(),secondary:z.boolean()}).strict(),
  status:z.literal('engineering-source-registration'),approved:z.literal(false),productionReady:z.literal(false),motionVerified:z.literal(false),
}).strict().superRefine((b,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  const faceVersion=isNativeHeadFaceVersion(b.version),identity=nativeHeadIdentities[b.actor];
  const motionVersion=b.version===NATIVE_MOTION_HEAD_BANK_VERSION,emotionVersion=b.version===NATIVE_EMOTION_HEAD_BANK_VERSION||motionVersion;
  if(b.cells.some(c=>'paint' in c)&&(!emotionVersion||b.cells.some(c=>!c.paint)))fail('Source paint requires an explicit complete bank5/6 partition; legacy registrations retain their bytes');
  if(motionVersion){
    if(b.cells.some(c=>c.paint?.version!=='native-head-paint-2')||b.capabilities.secondary!==b.cells.some(c=>c.paint?.rear.length))fail('Bank6 requires complete own paint2 and exact rear motion capability');
  }else if(b.capabilities.secondary||b.cells.some(c=>c.paint?.version==='native-head-paint-2'))fail('Only explicit bank6 may enable own source rear motion; bank1-5 retain no secondary capability');
  if(!emotionVersion&&identity.supporting!==(b.version===NATIVE_SUPPORTING_HEAD_BANK_VERSION))fail('Supporting head identity requires its own version 4 bank; principal banks retain versions 1–3');
  if(emotionVersion?(!b.capabilities.expressions||b.cells.some(c=>c.face?.version!=='native-head-face-2'||!c.face.emotions||c.restMood!=='happy')):(b.capabilities.expressions||b.cells.some(c=>c.face?.version==='native-head-face-2')))fail('Only explicit bank5/6 may declare complete own face2 emotions from a happy source rest; legacy bank bytes retain their capabilities');
  if(!faceVersion&&(b.cells.length<2||!b.routes.length||b.cells.some(c=>c.yawDeg===null||'face' in c)||b.capabilities.speech||b.capabilities.directionalEyes))fail('Legacy head banks require numeric turn cells and forbid source-face capabilities');
  if(faceVersion&&b.cells.length===1&&b.routes.length)fail('A single fixed source-angle cell cannot declare head turns');
  if(faceVersion&&b.cells.length>1&&(!b.routes.length||b.cells.some(c=>c.yawDeg===null)))fail('Multiple source cells need numeric measured angles and real routes');
  if(b.version===NATIVE_HEAD_BANK_VERSION){
    // Reject field presence even when its value is explicitly undefined. No
    // defaults or added keys may change version 1 canonical registration bytes.
    if('pixelScale' in b.source||'additionalSources' in b||b.cells.some(c=>'sourceId' in c))fail('Version 1 head banks forbid multi-source fields');
    if(!b.source.file.includes('/head-turn-studies/'))fail('Version 1 head banks require the original head-turn atlas path');
  }
  const sources=[{id:'primary',...b.source},...(b.additionalSources??[])],sourceById=new Map(sources.map(s=>[s.id,s]));
```

## packages/topics/head-face-source.ts [23..39] full SHA d023a0d94ac5d2116abb0011d0cd7d303945652c38c52353c08a24179975d732

```ts
 * it while geometry/runtime execution is delegated to the user's model. */
export async function headFaceCandidate(repo:string,actor:NativeHeadActor,view:HeadFaceView='three-quarter-right',mode:HeadFaceMode='speech-eyes'){
  if(!NATIVE_HEAD_ACTORS.includes(actor)||!HEAD_FACE_VIEWS.includes(view)||!HEAD_FACE_MODES.includes(mode))throw new Error('Invalid face candidate actor/view/mode');
  const entry=headFaceCandidatesForMode(mode).find(c=>c.actor===actor&&c.view===view);
  if(!entry)throw new Error(`needs-head-face-candidate: ${actor}/${view} has not been authored`);
  const bytes=await boundedHeadFaceFile(repo,entry.file,200*1024),definition=NativeHeadBankDefinitionSchema.parse(JSON.parse(bytes.toString('utf8')));
  const version=mode==='source-motion'?NATIVE_MOTION_HEAD_BANK_VERSION:mode!=='speech-eyes'?NATIVE_EMOTION_HEAD_BANK_VERSION:nativeHeadIdentities[actor].supporting?NATIVE_SUPPORTING_HEAD_BANK_VERSION:'native-head-bank-3';
  if(definition.cells.some(c=>!!c.paint)!==(['source-layers','source-motion'].includes(mode)))throw new Error('Face workbench paint must match the explicitly selected source-layers/motion candidate');
  if(definition.actor!==actor||definition.id!==entry.id||definition.version!==version||definition.cells.length!==1||definition.cells[0]!.yawDeg!==null||definition.routes.length||
    definition.bodyViews.length!==1||definition.bodyViews[0]!.view!==view||
    definition.source.file!=='library/topics/prehistoric-life/head-cells/'+entry.headFile)throw new Error('Face workbench needs the exact fixed source-angle candidate and compatible body view');
  if('sha256' in entry&&(definition.source.sha256!==entry.sha256||definition.source.width!==entry.width||definition.source.height!==entry.height))throw new Error('Supporting face candidate differs from its own current catalog artwork');
  const bank=nativeHeadBank(definition);
  for(const resource of nativeHeadResources(bank)){
    if(resource.nativeHeadSource)readNativeHeadSource(repo,{file:resource.file,sha256:resource.sha256,...resource.nativeHeadSource},bank.primary);
    else if(resource.nativeHeadPrimary&&resource.file===bank.primary.file&&resource.sha256===bank.primary.sha256)readNativeHeadPrimary(repo,bank.primary);
    else throw new Error('Unknown face candidate resource identity');
```

## Authored not validated lila-left-follow-v1

```json
{
  "version": "native-head-bank-6",
  "actor": "lila",
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/lila-head-left-dialogue-v1.png",
    "sha256": "0b95893960a2910fa0331db66431bfb828681d3a1b6ce03d9ba901e7d9e2b3a6",
    "width": 1168,
    "height": 1347,
    "pixelScale": 0.1516
  },
  "capabilities": {
    "speech": true,
    "directionalEyes": true,
    "expressions": true,
    "secondary": true
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
      "version": "native-head-paint-2",
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
          },
          "motion": {
            "pin": "top",
            "gain": 0.8,
            "maxDisplacement": 24
          }
        }
      ],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  }
}
```

## Authored not validated lila-right-follow-v1

```json
{
  "version": "native-head-bank-6",
  "actor": "lila",
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/lila-head-source-angle-v2.png",
    "sha256": "05b555d23110f2837888d49647038d779fd6e398c9dd31af2853dbd5479eb298",
    "width": 1167,
    "height": 1347,
    "pixelScale": 0.1516
  },
  "capabilities": {
    "speech": true,
    "directionalEyes": true,
    "expressions": true,
    "secondary": true
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
      "version": "native-head-paint-2",
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
          },
          "motion": {
            "pin": "top",
            "gain": 0.8,
            "maxDisplacement": 24
          }
        }
      ],
      "status": "engineering-paint-registration",
      "approved": false,
      "productionReady": false,
      "motionVerified": false
    }
  }
}
```

## Authored not validated karo-left-follow-v1

```json
{
  "version": "native-head-bank-6",
  "actor": "karo",
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/karo-head-left-dialogue-v1.png",
    "sha256": "2d0adfba965b08425d8c0312d674a997f8a7fa60b90d1532b4f62b58a0ac7410",
    "width": 1312,
    "height": 1199,
    "pixelScale": 0.124
  },
  "capabilities": {
    "speech": true,
    "directionalEyes": true,
    "expressions": true,
    "secondary": false
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
      "version": "native-head-paint-2",
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
  }
}
```

## Authored not validated karo-right-follow-v1

```json
{
  "version": "native-head-bank-6",
  "actor": "karo",
  "source": {
    "file": "library/topics/prehistoric-life/head-cells/karo-head-source-angle-v2.png",
    "sha256": "d4b417a194098670cc20beab4ef8a8488094fcb32ac29dd1725e933d90e17a23",
    "width": 1201,
    "height": 1309,
    "pixelScale": 0.11923
  },
  "capabilities": {
    "speech": true,
    "directionalEyes": true,
    "expressions": true,
    "secondary": false
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
      "version": "native-head-paint-2",
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
  }
}
```
