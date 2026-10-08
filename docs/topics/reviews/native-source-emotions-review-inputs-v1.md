# Native source emotion review excerpts

Source-only frozen data; no runtime execution or registration acceptance. Original clock and full-story factory remain mandatory.

## packages/animation/compiler.ts

Source SHA256: c6899b8d9eeb51e6f2ef9a10ebf787836ba5700c47e3526672c33abb94ec4e57

```ts
function expressionAt(plan:PerformancePlan,time:number,actingClock?:ViewActingClock,restMood:Mood='neutral') {
  if(![HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION].includes(plan.compilerVersion)){
    const legacy=moodAt(plan,time);return {...legacy,pose:moodPoses[legacy.mood]};
  }
  const at=actingClock?time+actingClock.startMs:time;
  const ranges=actingClock?.expressions??expressionRanges(plan),index=ranges.findIndex(clip=>at>=clip.startMs&&at<clip.endMs),neutral=expressionPose(restMood);
  if(index<0)return {mood:restMood,weight:0,pose:neutral};
  const clip=ranges[index]!,previous=ranges[index-1],next=ranges[index+1],window=expressionBlendMs(clip);
  const from=previous?.endMs===clip.startMs?expressionPose(previous.mood):neutral;
  let pose=blendExpression(from,expressionPose(clip.mood),smooth((at-clip.startMs)/window));
  // Adjacent reactions blend directly after the new cue begins. Actual gaps and
  // the end of the last clip still recover to neutral without extending clocks.
  if(next?.startMs!==clip.endMs)pose=blendExpression(neutral,pose,smooth((clip.endMs-at)/window));
  return {mood:clip.mood,weight:1,pose};
}

        const p=bank.capabilities.expressions?expressionAt(plan,t,actingClock,cell.restMood).pose:undefined,rest=expressionPose(cell.restMood);
        const emotion=p?{brow:clamp((p.brow-rest.brow)/8,-1,1),tilt:clamp(((p.browAngle??0)-rest.browAngle)/30,-1,1),smile:p.smile,frown:p.frown??0,round:p.round,
          closure:clamp(p.lid-rest.lid+Math.max(0,1-(p.eyeOpen??1)),0,.8)}:undefined;
        const state=nativeHeadBankFacialState(bank,{aperture:bodyViewMouthLevel(activity,t,sourceClock),blink,look,...(emotion?{emotion}:{})});Object.assign(face,state.face);Object.assign(paths,state.paths);
      }

```

## benchmarks/native-seat-tracer.ts

Source SHA256: 31d07a231119f666acec7d1aff9c42464998cab9bafbef9cf761594fe69a0594

```ts
function buildNativeSeatTracer(heads?:Record<NativeSeatActor,NativeHeadBank>,selection:NativeDialogueSelection={staging:'lila-left',acting:'rest'}){
  const config=ConfigSchema.parse({project:{name:'Native seat motion tracer',language:'en'},input:{mode:'srt'},presentation:{mode:'story-cinematic',character_mode:'actors',actor_renderer:'rig'},
    rendering:{draft:{width:1280,height:720,fps:60,quality:'looks'},final:{width:1280,height:720,fps:60,quality:'delivery'}},captions:{mode:'burned',font:'Arial',font_size:20}});
  const thinking=!!heads&&selection.acting==='listening-think';
  const emotional=!!heads&&selection.acting==='emotional-reactions';
  if(emotional&&(!heads!.lila.capabilities.expressions||!heads!.karo.capabilities.expressions))throw new Error('needs-head-turn-expression: diagnostic reactions require both explicitly selected own emotion banks');
  const first=emotional?'Lila and Karo sit down together. Lila speaks excitedly; Karo listens with curiosity and surprise.':thinking?'Lila and Karo sit down together. Lila talks while Karo listens and thinks.':'Lila and Karo sit down together. Lila talks while Karo listens.',
    last=emotional?'Karo replies confidently. Lila is concerned, then relieved. They stand and walk together.':thinking?'Karo replies while Lila considers his words. They stand and walk together.':'Karo replies. They stand and walk together.',text=first+' '+last;
  const narration=NarrationSchema.parse({mode:'srt',durationMs:NATIVE_SEAT_TRACER_DURATION_MS,segments:[{id:'lila-cue',startMs:0,endMs:3000,text:first},{id:'karo-cue',startMs:3000,endMs:7200,text:last}]});
  const refs=narration.segments.map(cue=>({kind:'narration' as const,segmentId:cue.id,quote:cue.text}));
  const templates=nativeDialogueLayouts[selection.staging].map(({actor,view,rootX})=>{
    const f=nativeSeatPhysicalActor(actor,view,.8,rootX),appearance={...f.profile.appearance};
    if(heads){
      // These overlays are registered on other painted heads. Keep the native
      // body/seat source, never attach old eyes/mouth/hair to the new head.
      delete appearance.bodySpeech;delete appearance.bodyEyes;delete appearance.bodyExpressions;delete appearance.bodySecondary;
      appearance.bodyHeadBank=heads[actor];
    }
    const character=ActorDefinitionSchema.parse({id:actor,name:actor,role:'illustration',kind:'stick-man',identity:'illustrative',appearance,sourceRefs:refs});
    f.plan.profileHash=actorProfile(character).profileHash;
    const gestures:ViewSourceGesture[]=thinking?[{...nativeDialogueThinkingWindows[actor],action:'think',hand:registeredBodyView(character).nearHand}]:[];
    const expressions=emotional?nativeDialogueExpressionWindows[actor].map(e=>({...e})):[];
    return {character,plan:f.plan,gestures,expressions};
  });
  const profile=actorProfile(templates[0]!.character),rig=buildRig(profile);
  const intent:SceneIntent={participants:templates.map(({character})=>({id:character.id,name:character.name,role:character.role,identity:character.identity,sourceRefs:refs})),action:text,objective:text,sourceRefs:refs,
    acting:templates.flatMap(({character})=>[{participantId:character.id,kind:'posture' as const,statement:first,sourceRefs:[refs[0]!]},{participantId:character.id,kind:'posture' as const,statement:last,sourceRefs:[refs[1]!]},{participantId:character.id,kind:'locomotion' as const,movement:'walk' as const,statement:last,sourceRefs:[refs[1]!]}])};
  if(thinking)for(const actor of ['karo','lila'] as const){const index=actor==='karo'?0:1;intent.acting!.push({participantId:actor,kind:'observation',statement:index?last:first,sourceRefs:[refs[index]!]});}
  const beat=BeatSchema.parse({id:'seat-beat',chapterId:'seat-chapter',startMs:0,endMs:7200,narrationText:text,meaning:'Two actors share a seated conversation, stand and walk.',visualGoal:'Preserve both physical runs through camera and lead changes.',importance:1,segmentIds:narration.segments.map(c=>c.id),
    explanationGoal:'Show physical support transfer and continuous movement.',narrationSegmentIds:narration.segments.map(c=>c.id),sourceRefs:refs,entities:[],relations:[],visualMethod:'event-sequence',hostIntent:'Lila and Karo are actors within this diagnostic story.',sceneIntent:intent});
  const shots=NATIVE_SEAT_TRACER_CUTS.slice(0,-1).map((startMs,i)=>{
    const endMs=NATIVE_SEAT_TRACER_CUTS[i+1]!,id='native-seat-canonical-'+i,segments=narration.segments.filter(cue=>cue.startMs<endMs&&cue.endMs>startMs).map(cue=>cue.id);
    const actors=templates.map(({character,plan,gestures,expressions})=>{
      const p=structuredClone(plan);p.id=id;p.durationMs=endMs-startMs;
      p.sourceBody={version:BODY_SOURCE_VERSION,id:character.id+'-complete-seat',startMs:0,endMs:7200,walks:p.walks,postures:p.postures,supports:p.supports,entryPosture:p.entryPosture};
      if(heads){const bank=heads[character.id as NativeSeatActor];
        p.sourceHead={version:NATIVE_HEAD_SOURCE_VERSION,id:character.id+'-complete-head',ownerId:character.id,bankFingerprint:bank.fingerprint,startMs:0,endMs:7200,samples:[{atMs:0,cell:bank.cells[0]!.id}]};
      }
      p.walks=[];p.jumps=[];p.postures=[];p.supports=[];delete p.entryPosture;
      p.gestures=projectViewSourceGestures(gestures,startMs,endMs,0,NATIVE_SEAT_TRACER_DURATION_MS);p.expressions=projectViewExpressions(expressions,startMs,endMs);
      p.gazes=[{startMs:0,endMs:p.durationMs,actorTarget:{id:character.id==='lila'?'karo':'lila',anchor:'eyes'}}];
      return {character,performance:p,actions:[{type:'idle' as const,startMs,endMs}],speakingSegmentIds:segments.filter(cue=>cue===character.id+'-cue')};
    });
    const primary=actors[i%2]!,other=actors[1-i%2]!,p=primary.performance;
    const shot=ShotSchema.parse({id,startMs,endMs,beatIds:[beat.id],sceneType:'character-scene',subject:text,visualDescription:text,characters:actors.map(a=>a.character.id),camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},
      narrationSegmentIds:segments,explanationGoal:beat.explanationGoal,sourceRefs:refs,captionRegion:'bottom-safe',
      host:{id:primary.character.id,profileVersion:1,rigHash:rig.rigHash,presence:'beside-model',actions:primary.actions},
      visualization:{type:'event-sequence',modelId:'seated-actors',parts:[],relations:[],events:[],provenance:'visualization',fidelity:'conceptual',sceneIntent:intent},
      cinematic:{version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:primary.character.id,motivation:'Keep the original seated performance through camera cuts.',sourceRefs:refs,sceneIntent:intent,setting:'camp',provenance:'illustration',models:[],propBindings:[],
        performance:p,actorScene:ActorSceneSchema.parse({primary:primary.character,speakingSegmentIds:primary.speakingSegmentIds,continuity:i?'continuous':'cut',supporting:[other]}),
        continuity:{entry:bodyRootAt(p,startMs,0),exit:bodyRootAt(p,startMs,p.durationMs),facing:p.facing!,carriedProps:[],models:[]},
        camera:{framing:'wide',movement:'locked',anchor:{x:640,y:360},startScale:1,endScale:1},artDirection:forestDirection()}});
    bindActorShot(shot,profile,rig);return shot;
  });
  const board=StoryboardSchema.parse({shots});
  for(const shot of board.shots){
    const c=shot.cinematic!,scene=c.actorScene!,lead=actorProfile(scene.primary!);
    c.camera=planCamera(c.performance,lead,{framing:'wide',movement:'locked',actingClock:actorViewActingClock(board,shot,lead.id),supporting:scene.supporting.map(actor=>({performance:actor.performance,profile:actorProfile(actor.character),actingClock:actorViewActingClock(board,shot,actor.character.id)}))});
    shot.camera={shotSize:c.camera.framing,movement:c.camera.movement,angle:'eye-level'};
  }
  return {scope:heads?NATIVE_HEAD_SEAT_TRACER_SCOPE:NATIVE_SEAT_TRACER_SCOPE,version:heads?NATIVE_HEAD_SEAT_TRACER_VERSION:NATIVE_SEAT_TRACER_VERSION,productionAcceptance:false as const,finalExportAllowed:false as const,config,profile,rig,narration,board,beat};
}

/** Existing fixed-view source remains the default diagnostic. */
export function createNativeSeatTracer(){return buildNativeSeatTracer();}

/** Explicit opposing bank3 heads, using the same canonical body, cast, camera
 * and factory renderer as the old diagnostic. No selection in production.
 * Loading/builder/geometry execution is reserved for the user's test model. */
export async function createNativeHeadSeatTracer(repo:string,input:Partial<NativeDialogueSelection>={}){
  const selection=NativeDialogueSelectionSchema.parse(input),layout=nativeDialogueLayouts[selection.staging];
  if(selection.acting==='emotional-reactions'&&selection.face!=='expressions')throw new Error('needs-head-turn-expression: emotional reactions need explicit face=expressions; no automatic bank promotion');
  const lila=await headFaceCandidate(repo,'lila',layout[0].view,selection.face??'speech-eyes');
  const karo=await headFaceCandidate(repo,'karo',layout[1].view,selection.face??'speech-eyes');
  const f=buildNativeSeatTracer({lila:lila.bank,karo:karo.bank},selection);
  f.config.project.name='Native opposing-head seated conversation';
  return {...f,dialogueSelection:selection,headSelection:([
    {actorId:'lila',view:layout[0].view,candidate:lila},
    {actorId:'karo',view:layout[1].view,candidate:karo},
  ] as const).map(({actorId,view,candidate})=>({actorId,view,definitionFile:candidate.definitionFile,definitionHash:candidate.definitionHash,bankFingerprint:candidate.bank.fingerprint,
    sourceFile:candidate.bank.source.file,sourceSHA256:candidate.bank.source.sha256,artApproved:false,motionVerified:false}))};
}

```

## packages/animation/body-head-bank.ts

Source SHA256: 5ddb5dd3c5052778bb7f14cfa8df312503d2f3733d63c889491fadc41aec92aa

```ts
export function nativeHeadBankFacialState(bank:NativeHeadBank,input:{aperture:number;blink:number;look:{x:number;y:number};emotion?:NativeFaceEmotion}):NativeFaceState{
  if(!isNativeHeadFaceVersion(bank.version)||!bank.capabilities.speech||!bank.capabilities.directionalEyes||bank.cells.some(c=>!c.face))throw new Error('needs-head-face-registration: complete source-face bank3/4 capabilities required');
  if(input.emotion&&!bank.capabilities.expressions)throw new Error('needs-head-turn-expression: explicit bank5 emotions required');
  const face:NativeFaceState['face']={},paths:Record<string,string>={};
  for(const [i,cell] of bank.cells.entries())if(cell.face){const a=-nativeHeadCellAngle(cell)*Math.PI/180,look={x:input.look.x*Math.cos(a)-input.look.y*Math.sin(a),y:input.look.x*Math.sin(a)+input.look.y*Math.cos(a)};
    const state=nativeHeadFaceState(cell.face,{...input,look},'native-face-'+i);Object.assign(face,state.face);Object.assign(paths,state.paths);
  }return {face,paths};
}
export function nativeHeadBankFacialError(bank:NativeHeadBank,from:NativeFaceState['face'],to:NativeFaceState['face'],wanted:NativeFaceState['face'],progress:number){
  let error=0;for(const [i,cell] of bank.cells.entries())if(cell.face)error=Math.max(error,nativeHeadFaceMatrixError(cell.face,'native-face-'+i,from,to,wanted,progress)*nativeHeadPixelScale(bank,cell));return error;
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
  return `<g data-head-bank="${bank.fingerprint}" stroke="none"><defs>${images}${bank.cells.map((c,i)=>`<clipPath id="native-head-bank-clip-${i}" clipPathUnits="userSpaceOnUse"><rect x="${c.crop.x}" y="${c.crop.y}" width="${c.crop.width}" height="${c.crop.height}"/></clipPath>`).join('')}</defs>${bank.cells.map((c,i)=>{
    const imageId='native-head-bank-source-'+sourceIndex.get(nativeHeadSourceForCell(bank,c).id)!,rest=c.face?.mouth.rest,restId=rest?'native-head-bank-source-'+sourceIndex.get(rest.sourceId)!:undefined,
      emotionId=c.face?.emotions?'native-head-bank-source-'+sourceIndex.get(c.face.emotions.mouth.repair.sourceId)!:undefined;
    return `<g id="head-view-bank-${i}" opacity="0"><g transform="scale(${nativeHeadPixelScale(bank,c)}) rotate(${nativeHeadCellAngle(c)}) translate(${-c.neck.x} ${-c.neck.y})" clip-path="url(#native-head-bank-clip-${i})"><use href="#${imageId}"/>${c.face?nativeHeadFaceSvg(c.face,imageId,'native-face-'+i,restId,emotionId):''}</g></g>`;
  }).join('')}</g>`;
}

```
