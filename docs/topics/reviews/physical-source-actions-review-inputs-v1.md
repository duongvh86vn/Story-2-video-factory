# Frozen source0.67 review inputs v1

Source-only review. No geometry, fixtures, callbacks, server/browser, TTS/ASR, renderer or video execution. Preceding commit2162893f6b950afdd5034b271beb34f68ff97617. New physical evaluator shares original geometry and physical guards, omits all facial/voice encoding, returns no FrameState.face; camera and drop-release use geometry. Render guards stay intact. Source action references validate original slice/hand/contact clock only; cue/model/entity/continuity production binding remains blocked. Male bald/no beard and female assets unchanged; all art/final gates false. Omitted body/arm helpers are unchanged, except face-orientation is assigned only in render evaluation. Do not infer runtime acceptance from this packet.

## packages/animation/compiler.ts

Full text SHA256: 306024aefbe697abf8b2aa5da7b93086c22a474a68dcff4d53ccdd243ad216f6

```typescript
691: /** Pure random-access evaluation: no state accumulated from previous frames. */
692: /** Release may precede this camera shot. Re-evaluate the real original owned
693:  * palm under the full run/body/head/attention context, never clamp its time to
694:  * the current cut or invent a release anchor. No discarded voice/face frame is
695:  * evaluated and no narration interval is expanded for this geometry query. */
696: function originalManipulationContext(plan:PerformancePlan,clock:ViewActingClock){
697:   if(!plan.sourceManipulation)throw new Error('needs-source-manipulation: missing original ownership');
698:   validateViewActingClock(plan,clock);
699:   const start=clock.runStartMs,end=clock.runEndMs;
700:   const full:PerformancePlan={...plan,durationMs:end-start,gazes:projectViewGazes(clock.gazes,start,end),
701:     gestures:projectViewSourceGestures(clock.gestures,start,end,start,end),expressions:clock.expressions?projectViewExpressions(clock.expressions,start,end):[]};
702:   return {plan:full,clock:{...clock,startMs:start,endMs:end}};
703: }
704: type Evaluation={kind:'render';activity:SpeechActivity;sourceClock?:SpeechSourceClock}|{kind:'geometry'};
705: /** Deliberately lacks FrameState.face: this result cannot be used as a rendered
706:  * or speech-certified frame. Surface controls describe cloth/hair/hand depth. */
707: export type PhysicalPerformanceFrame=Omit<FrameState,'face'>&{purpose:'physical-geometry';surfaceState:FrameState['face']};
708: export const physicalPerformanceDescription={version:'physical-performance-1',
709:   scope:'camera envelopes and original release palm geometry only; no facial animation or narration evaluation',
710:   invariant:'same owned original body/head/expression/attention/hand/prop history and physical guards as rendered frames',
711:   voice:'no input, generated activity, expanded speech clock, mouth state or render fallback',motionVerified:false};
712: export function samplePhysicalPerformance(plan:PerformancePlan,profile:HostProfile,time:number,actingClock?:ViewActingClock):PhysicalPerformanceFrame{
713:   const {face,...geometry}=samplePerformanceState(plan,profile,time,actingClock,true,{kind:'geometry'});
714:   return {...geometry,purpose:'physical-geometry',surfaceState:face};
715: }
716: export function samplePerformance(plan:PerformancePlan,profile:HostProfile,time:number,activity:SpeechActivity,sourceClock?:SpeechSourceClock,actingClock?:ViewActingClock):FrameState {
717:   return samplePerformanceState(plan,profile,time,actingClock,true,{kind:'render',activity,sourceClock});
718: }
719: function samplePerformanceState(plan:PerformancePlan,profile:HostProfile,time:number,actingClock:ViewActingClock|undefined,includeProps:boolean,evaluation:Evaluation):FrameState {
720:   if(evaluation.kind==='geometry'&&(!Number.isFinite(time)||time<0||time>plan.durationMs))throw new Error('needs-physical-phase: seek is outside the owned shot');
721:   const sourceClock=evaluation.kind==='render'?evaluation.sourceClock:undefined;
722:   if(plan.sourceManipulation){validateManipulationSourcePlan(plan);if(!hasBodyViewManipulation(profile)||!actingClock)throw new Error('needs-source-manipulation: native selection and complete owned clock required');}
723:   if(plan.lunge)validateBodyViewLunge(profile);
724:   validateFixedBodyView(plan,profile);
725:   if(plan.sourceBody&&!actingClock)throw new Error('needs-view-body-phase: source body requires its complete storyboard/run context');
726:   if(plan.sourceHead&&!actingClock)throw new Error('needs-head-source-phase: source head requires its complete storyboard/run context');
727:   if(plan.gestures.some(g=>g.sourceSpan)&&!actingClock)throw new Error('needs-view-gesture-phase: source gesture requires its complete storyboard/run context');
728:   if(actingClock){
729:     if(!usesBodyView(profile)||!hasNativeHeadBank(profile)&&!hasBodyViewSpeech(profile)&&!hasBodyViewEyes(profile)&&!hasBodyViewLocomotion(profile)&&!hasBodyViewSecondary(profile)&&!hasBodyViewManipulation(profile))throw new Error('needs-view-acting-phase: select a registered native head/mouth/eyes/locomotion/secondary/manipulation candidate');
730:     if(actingClock.ownerId!==profile.id)throw new Error('needs-view-acting-phase: actor profile mismatch');
731:     validateViewActingClock(plan,actingClock);
732:     if((hasBodyViewExpressions(profile)||hasNativeHeadBank(profile))&&!actingClock.expressions)throw new Error('needs-view-expression-phase: selected expressions/head bank need the complete original run track');
733:     if(sourceClock&&(sourceClock.startMs!==actingClock.startMs||sourceClock.endMs!==actingClock.endMs||sourceClock.ownerId!==actingClock.ownerId))throw new Error('needs-view-acting-phase: speech and acting clocks disagree');
734:   }
735:   if(evaluation.kind==='render'){
736:   const {activity}=evaluation;
737:   if((hasBodyViewSpeech(profile)||hasBodyViewEyes(profile))&&sourceClock&&(sourceClock.ownerId!==profile.id||sourceClock.endMs-sourceClock.startMs!==plan.durationMs))throw new Error('needs-speech-phase: source owner or shot span does not match performer');
738:   if(hasBodyViewEyes(profile)&&sourceClock)validateSpeechSourceClock(activity,sourceClock,profile.id,plan.durationMs);
739:   if(hasNativeHeadBank(profile)&&(activity.intervals.length||sourceClock?.activity.intervals.length)&&!hasNativeHeadSpeech(profile))throw new Error('needs-head-turn-voice: cell-specific speech artwork is not registered; no silent fallback over supplied narration');
740:   if(hasNativeHeadSpeech(profile)){validateBodyViewMouthActivity(activity);if(!sourceClock)throw new Error('needs-speech-phase: source-cell speech requires the complete owned narration clock');validateSpeechSourceClock(activity,sourceClock,profile.id,plan.durationMs);}
741:   if(usesBodyView(profile)&&activity.intervals.length&&!hasBodyViewSpeech(profile)&&!hasNativeHeadSpeech(profile))throw new Error('needs-view-voice-animation: authored-view speech requires an explicit registered mouth candidate');
742:   }
743:   if(hasBodyViewManipulation(profile))validateNativeContactBodyClock(plan,actingClock);
744:   const t=clamp(time,0,plan.durationMs),{physical,m,s,root,walk,emotion,pose,air,orientation,bodyPosture,lean,pelvis,bend,kneeSeatWeight,seatProgress}=bodyStateAt(plan,profile,t,actingClock);
745:   const propTime=sourceManipulationTime(plan,actingClock,t),propGestures=plan.sourceManipulation?.gestures??plan.gestures;
746:   const resolvedGesture=(side:RigHand)=>{
747:     const source=actingClock?sourceViewGestureAt(actingClock.gestures,t+actingClock.startMs,side):undefined,contact=sourceManipulationGestureAt(plan,actingClock,t,side),gesture=source??contact??gestureAt(plan,t,side);
748:     return {gesture,timeMs:source?t+actingClock!.startMs:contact?propTime:t,entryTimeMs:source?source.startMs-actingClock!.startMs:contact?contact.startMs+plan.sourceManipulation!.startMs-actingClock!.startMs:gesture?.startMs??0};
... unchanged sections omitted ...
887:       const seatedWeight=Object.values(bodyPosture.seatWeights??{}).reduce((sum,w)=>sum+w,0);
888:       const role:SourceArmRole=spear?(side===spear.track.hand?'spear-front':'spear-rear'):gesture?.action==='think'?'chin':gesture?.action==='point'||gesture?.action==='inspect'?'point':nativeContact?'manipulate':gesture?'react':walk.running?'run':seatedWeight>.01?'lap':walk.activation>.01?'walk':'rest';
889:       armGeometry[side]=sourceArmShape(role,shoulder,projectedArm?.joint??arm.joint,wrist,lengths.upper*s,lengths.lower*s,projectedArm?.depth??0);
890:       if(spear){
891:         (spearArms[spear.track.id]??={})[side]={shoulder,elbow:projectedArm?.joint??arm.joint,wrist,grip:arm.end,upper:lengths.upper*s,lower:lengths.lower*s};
892:       }
893:     }
894:   }
895:   for(const {track,state} of spearStates)if(usesReferenceBody(profile)&&track.twoHands){
896:     const pair=spearArms[track.id]!,other=track.hand==='left'?'right':'left';
897:     spearGeometry[track.id]=sourceSpearPairShape(pair[track.hand]!,pair[other]!,state.angle);
898:   }
899:   const activeGestures={right:gestureStates.right.gesture,left:gestureStates.left.gesture};
900:   const activeGesture=activeGestures.right?.target?activeGestures.right:activeGestures.left??activeGestures.right;
901:   const nativeEyes=hasBodyViewEyes(profile)||hasNativeHeadEyes(profile);
902:   const sourceGaze=actingClock&&nativeEyes?sourceViewGazeAt(actingClock,t):undefined;
903:   const gazeCue=actingClock&&nativeEyes?sourceGaze:plan.gazes.find(g=>t>=g.startMs&&t<g.endMs);
904:   let actorGaze:FrameState['actorGaze'];
905:   const gazeTarget=()=>{
906:     if(!gazeCue)return undefined;if('target' in gazeCue)return gazeCue.target;
907:     if(!actingClock||!usesBodyView(profile)||!nativeEyes)throw new Error('needs-actor-gaze: dynamic eye target requires its complete storyboard/native context');
908:     const target=actingClock.actorTargets?.find(source=>source.actorId===gazeCue.actorTarget.id);if(!target)throw new Error('needs-actor-gaze: missing complete target source');
909:     const point=sourceActorEyeAnchor(target,t+actingClock.startMs);actorGaze={targetActorId:target.actorId,target:point,origin:nativeEyeOrigin(profile,headState,s,{plan,timeMs:t,clock:actingClock})};return point;
910:   };
911:   const resolvedTarget=gazeTarget(),explicitGaze=gazeCue&&resolvedTarget?{startMs:gazeCue.startMs,endMs:gazeCue.endMs,target:resolvedTarget}:undefined;
912:   const gazeOffset=(target:Point)=>{const angle=Math.atan2(target.y-head.y,target.x-head.x);return {x:Math.cos(angle)*3,y:Math.sin(angle)*2};};
913:   const gazeWeight=(cue:{startMs:number;endMs:number},at=t)=>smooth((at-cue.startMs)/140)*smooth((cue.endMs-at)/140);
914:   const activeGestureWeight=activeGesture?gazeWeight(activeGesture,gestureStates[rigHand(activeGesture)].timeMs):0;
915:   const explicitGazeWeight=(cue:{startMs:number;endMs:number})=>sourceGaze?smooth((t+actingClock!.startMs-cue.startMs)/VIEW_GAZE_RAMP_MS)*smooth((cue.endMs-t-actingClock!.startMs)/VIEW_GAZE_RAMP_MS):gazeWeight(cue);
916:   let gaze={x:0,y:0};
917:   if(spearStates[0])gaze=gazeOffset(spearStates[0].track.aim);
918:   if(activeGesture?.target)gaze=mix(gaze,gazeOffset(activeGesture.target),activeGestureWeight);
919:   if(explicitGaze)gaze=mix(gaze,gazeOffset(explicitGaze.target),explicitGazeWeight(explicitGaze));
920:   if(evaluation.kind==='render'){
921:   const {activity}=evaluation;
922:   if(drawn&&!usesReferenceHead(profile)){
923:     const view=headViewAt(plan,t),look=explicitGaze??activeGesture;
924:     const yaw=plan.headView||plan.headTurns?.length?view.yaw:look?.target?lerp(orientation,clamp((look.target.x-head.x)/70,-.85,.85),gazeWeight(look)):orientation;
925:     face['head-front']={opacity:1-view.back};face['head-back-view']={opacity:view.back};
926:     face['head-face-plane']={x:yaw*12,scaleX:1-Math.abs(yaw)*.42};
927:     face['head-fringe']={x:yaw*5,scaleX:1-Math.abs(yaw)*.1};
928:     face['head-nose']={opacity:0};
929:     paths['head-contour']=forestHeadContour(yaw);
930:     transforms['face-orientation']=transform({x:0,y:0});
931:   }
932:   const blinkClock=nativeEyes&&(sourceClock||actingClock)?t+(sourceClock?.startMs??actingClock!.startMs):t;
933:   const blinkPhase=(blinkClock+800+(usesReferenceBody(profile)&&profile.appearance.characterVariant==='karo'?520:0))%3500,blink=blinkPhase<140?Math.sin(Math.PI*blinkPhase/140):0;
934:   for(const [i,side] of (['left','right'] as const).entries()){
935:     face[`eye-${side}`]={x:gaze.x,y:gaze.y,scaleY:Math.max(.05,(1-blink)*lerp(1,pose.eyeOpen??1,emotion.weight))};
936:     face[`brow-${side}`]={y:pose.brow*emotion.weight,rotation:(i?-1:1)*(pose.browAngle??(emotion.mood==='concerned'?12:emotion.mood==='effort'?-12:0))*emotion.weight};
937:     face[`lid-${side}`]={opacity:pose.lid*emotion.weight};
938:     if(drawn&&!usesReferenceHead(profile)){const yaw=(face['head-face-plane']!.x??0)/12,far=i===0?Math.max(0,yaw):Math.max(0,-yaw),visible=1-smooth((far-.65)/.35);
939:       face[`eye-${side}`]!.opacity=visible;face[`brow-${side}`]!.opacity=visible;face[`lid-${side}`]!.opacity=visible*pose.lid*emotion.weight;}
940:   }
941:   const speech=activity.intervals.find(a=>t>=a.startMs&&t<a.endMs);
942:   face['mouth-talk']={opacity:speech?1:1-Math.max(pose.smile,pose.round,pose.frown??0)*emotion.weight,scaleY:speech?1+speech.level*2.3:.2};
943:   // Reflect the approved mouth curve about its own y=18 anchor. Explicit SVG
944:   // matrices seek deterministically and preserve the exact existing rig artwork.
945:   const frown=(pose.frown??0)*emotion.weight;
946:   face['mouth-smile']={opacity:Math.max(pose.smile,pose.frown??0)*emotion.weight,
947:     ...([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION].includes(plan.compilerVersion)?{attr:{transform:`translate(0 ${number(36*frown)}) scale(1 ${number(1-2*frown)})`}}:{})};
948:   face['mouth-round']={opacity:pose.round*emotion.weight};
949:   if(usesReferenceHead(profile)){
950:     if(hasNativeHeadBank(profile)){
951:       const {bank,cell}=nativeHeadBankCell(plan,profile,t,actingClock);
952:       for(const id of Object.keys(face))delete face[id];
953:       Object.assign(face,nativeHeadBankFace(bank,cell.id));
954:       if(bank.capabilities.speech&&bank.capabilities.directionalEyes){
955:         const origin=nativeEyeOrigin(profile,headState,s,{plan,timeMs:t,clock:actingClock!});
956:         const direction=(target:Point)=>{const local=rotate({x:target.x-origin.x,y:target.y-origin.y},-headAngle),length=Math.hypot(local.x,local.y);return length?{x:local.x/length,y:local.y/length}:{x:0,y:0};};
957:         let look={x:0,y:0};if(spearStates[0])look=direction(spearStates[0].track.aim);if(activeGesture?.target)look=mix(look,direction(activeGesture.target),activeGestureWeight);
958:         if(explicitGaze){const to=direction(explicitGaze.target),forward=registeredBodyView(profile).view==='three-quarter-left'?-1:1;if(to.x*forward<-.01)throw new Error('needs-head-turn-eyes: target is behind the registered source/body view');look=mix(look,to,explicitGazeWeight(explicitGaze));}
959:         const p=bank.capabilities.expressions?expressionAt(plan,t,actingClock,cell.restMood).pose:undefined,rest=expressionPose(cell.restMood);
960:         const emotion=p?{brow:clamp((p.brow-rest.brow)/8,-1,1),tilt:clamp(((p.browAngle??0)-rest.browAngle)/30,-1,1),smile:p.smile,frown:p.frown??0,round:p.round,
961:           closure:clamp(p.lid-rest.lid+Math.max(0,1-(p.eyeOpen??1)),0,.8)}:undefined;
962:         const state=nativeHeadBankFacialState(bank,{aperture:bodyViewMouthLevel(activity,t,sourceClock),blink,look,...(emotion?{emotion}:{})});Object.assign(face,state.face);Object.assign(paths,state.paths);
963:       }
964:     }else{
965:     const look=explicitGaze??activeGesture;
966:     const bodyHead=usesReferenceBody(profile);
967:     const yaw=plan.headView||plan.headTurns?.length?headViewAt(plan,t).yaw:look?.target?
968:       (bodyHead?lerp(orientation,clamp((look.target.x-head.x)/70,-1,1),gazeWeight(look)):clamp((look.target.x-head.x)/70,-1,1)):spearStates[0]?clamp((spearStates[0].track.aim.x-head.x)/70,-.65,.65):orientation;
969:     // The body retains its complete registered source face without inferred
970:     // yaw. Head-only studies retain their discrete authored views. Independent
971:     // hair motion and partner-facing body/head artwork are still pending.
972:     const sourceFace=referenceFaceState({view:referenceHeadViewForYaw(yaw),gaze,blink,
973:       // Source eyebrows rotate about their own center in SVG's downward Y:
974:       // angry inner ends move down, worried/sad inner ends move up.
975:       browY:pose.brow*emotion.weight,browAngle:-(pose.browAngle??0)*emotion.weight,
976:       eyeOpen:lerp(1,pose.eyeOpen??1,emotion.weight),smile:pose.smile*emotion.weight,
977:       round:pose.round*emotion.weight,frown:(pose.frown??0)*emotion.weight,speechLevel:speech?.level??null,
978:       ...(bodyHead?{sourceBody:true}:{})});
979:     for(const id of Object.keys(face))delete face[id];
980:     if(hasBodyViewSpeech(profile)){
981:       const mouth=sampleBodyViewMouth(profile,activity,t,sourceClock);Object.assign(face,mouth.face);Object.assign(paths,mouth.paths);
982:     }else Object.assign(face,usesBodyView(profile)?{'head-view-front':{opacity:1}}:sourceFace);
983:     if(hasBodyViewEyes(profile)){
984:       const eyes=registeredBodyViewEyes(profile),c=registeredBodyView(profile),origin=nativeEyeOrigin(profile,headState,s);
985:       const direction=(target:Point)=>{const local=rotate({x:target.x-origin.x,y:target.y-origin.y},-headAngle),length=Math.hypot(local.x,local.y);
986:         return length?{x:local.x/length,y:local.y/length}:{x:0,y:0};};
987:       let look={x:0,y:0};
988:       if(spearStates[0])look=direction(spearStates[0].track.aim);
989:       if(activeGesture?.target)look=mix(look,direction(activeGesture.target),activeGestureWeight);
990:       if(explicitGaze){const to=direction(explicitGaze.target),forward=c.view==='three-quarter-left'?-1:1;
991:         if(to.x*forward<-.01)throw new Error('needs-view-gaze: target is behind the fixed native view; author a matching view/turn');
992:         look=mix(look,to,explicitGazeWeight(explicitGaze));
993:       }
994:       const nativeExpression=hasBodyViewExpressions(profile)?bodyViewExpressionState(profile,{...expressionPose('neutral'),...pose},bodyViewMouthLevel(activity,t,sourceClock)):undefined;
995:       Object.assign(face,bodyViewEyesState(eyes,look,nativeExpression?Math.max(blink,nativeExpression.eyeClosure):blink).face);
996:       if(nativeExpression){Object.assign(face,nativeExpression.face);Object.assign(paths,nativeExpression.paths);}
997:     }
998:     }
999:     delete transforms['face-orientation'];
1000:   }
1001:   }
1002:   if(usesReferenceHead(profile)&&usesReferenceBody(profile))for(const side of ['left','right'] as const){
1003:       const cue=activeGestures[side];
1004:       // Use the same physical hand once in either painter slot, never a new
1005:       // offset clone. The slot is chosen for the whole chin gesture so entry
1006:       // and recovery do not teleport an occluded hand between layers.
1007:       face[`hand-${side}-front-slot`]={opacity:cue?.action==='think'?1:0};
1008:       face[`hand-${side}-back-slot`]={opacity:cue?.action==='think'?0:1};
1009:       face[`ink-arm-${side}-front-slot`]={opacity:cue?.action==='think'?1:0};
1010:       face[`ink-arm-${side}-back-slot`]={opacity:cue?.action==='think'?0:1};
1011:   }
1012:   if(viewCloth){
1013:     if(hasBodyViewSeat(profile)){const surface=nativeSeatState(profile,viewCloth,{progress:seatProgress,thighAngles:viewThighAngles});Object.assign(face,surface.face);Object.assign(paths,surface.paths);}
1014:     else Object.assign(face,nativeClothState(profile,viewCloth,viewThighAngles).face);
1015:   }
1016:   if(hasBodyViewSecondary(profile)){
1017:     const c=registeredBodyView(profile);registeredNativeSecondary(profile,c);
1018:     const offset=actingClock?.startMs??0,startMs=actingClock?.runStartMs??0,endMs=actingClock?.runEndMs??plan.durationMs;
1019:     const control=sampleSecondaryMotion({timeMs:t+offset,startMs,endMs,scale:c.headScale*s*headArtScale,sample:at=>{
1020:       const state=bodyStateAt(plan,profile,at-offset,actingClock),neck=add(state.pelvis,rotate({x:state.m.neckX!*state.s,y:state.m.torsoTop!*state.s},state.lean));
1021:       return {...neck,angle:state.lean};
1022:     }});
1023:     Object.assign(face,nativeSecondaryState(profile,c,control).face);
1024:   }
1025:   if(hasNativeHeadSecondary(profile)){
1026:     if(!actingClock)throw new Error('needs-head-secondary-phase: own rear motion requires the complete original actor clock');
1027:     if(actingClock.startMs!==actingClock.runStartMs&&!plan.sourceBody&&(plan.walks.length||plan.jumps?.length||plan.postures?.length||plan.lunge))throw new Error('needs-head-secondary-phase: moving camera slice needs complete original physical history');
1028:     if(plan.lunge&&(actingClock.startMs!==actingClock.runStartMs||actingClock.endMs!==actingClock.runEndMs))throw new Error('needs-head-secondary-phase: sliced lunge needs an owned original head/body history');
1029:     const {bank,cell}=nativeHeadBankCell(plan,profile,t,actingClock),offset=actingClock.startMs,angle=nativeHeadCellAngle(cell);
1030:     const control=sampleSecondaryMotion({timeMs:t+offset,startMs:actingClock.runStartMs,endMs:actingClock.runEndMs,scale:nativeHeadPixelScale(bank,cell)*s*headArtScale,sample:at=>{
1031:       const state=bodyStateAt(plan,profile,at-offset,actingClock),geometry=headGeometry(profile,state);return {...geometry.head,angle:geometry.headAngle+angle};
1032:     }});
1033:     Object.assign(face,nativeHeadBankRearState(bank,cell.id,control).face);
1034:   }
1035:   if(usesReferenceBody(profile)&&!usesBodyView(profile)){
1036:     const weight=clamp(Object.values(bodyPosture.seatWeights??{}).reduce((sum,n)=>sum+n,0));
1037:     const flex=Math.abs(thighAngles.reduce((sum,n)=>sum+n,0)/thighAngles.length-lean);
1038:     const folded=smooth((weight-.2)/.35)*smooth((flex-35)/35);
1039:     const hasSeat=[...(physical.entryPosture?[physical.entryPosture]:[]),...(physical.postures??[])].some(p=>p.pose==='seated');
1040:     for(const side of ['left','right'] as const){
1041:       transforms['garment-seated-'+side]=transform(pelvis,lean,s*profile.appearance.bodyScale);
1042:       const chosen=side===(bend===1?'right':'left'),surface=seatedGarmentState(profile,side,hasSeat&&chosen?folded:0,chosen?restCloth:undefined);
1043:       Object.assign(face,surface.face);Object.assign(paths,surface.paths);
1044:       face['garment-fold-'+side]={opacity:chosen?1:0};
1045:       face['garment-standing-'+side]={opacity:0};
1046:     }
1047:   }
1048:   const props:FrameState['props']={},contactErrors:FrameState['contactErrors']={left:0,right:0};let contactError=0;
1049:   for(const prop of includeProps?performanceProps(plan):[]){
1050:     const spear=spearStates.find(c=>c.track.propId===prop.id);
1051:     if(spear){
1052:       const state=spear.state;
1053:       props[prop.id]={point:state.center,attached:true,angle:state.angle,tip:state.tip,phase:state.phase};
1054:       transforms[`prop-${prop.id}`]=transform(state.center,state.angle,s);
1055:       for(const side of ['left','right'] as const)if(side===spear.track.hand||spear.track.twoHands){contactErrors[side]=distance(hands[side],side===spear.track.hand?state.primary:state.secondary);contactError=Math.max(contactError,contactErrors[side]);}
1056:       continue;
1057:     }
1058:     let point=prop.origin,attached=false;
1059:     const offset=prop.gripOffset??{x:0,y:0};
1060:     for(const g of chronological(propGestures).filter(g=>attaches(g)&&g.propId===prop.id)){
1061:       if(g.releaseMs!==undefined&&propTime>=g.releaseMs){
1062:         if(g.action==='drop'){
1063:           // Evaluate the actual hand without prop recursion; no assumed release anchor.
1064:           const original=plan.sourceManipulation?originalManipulationContext(plan,actingClock!):{plan,clock:actingClock};
1065:           const release=samplePerformanceState(original.plan,profile,g.releaseMs,original.clock,false,{kind:'geometry'}).hands[rigHand(g)];
1066:           const prior=samplePerformanceState(original.plan,profile,Math.max(0,g.releaseMs-1),original.clock,false,{kind:'geometry'}).hands[rigHand(g)];
1067:           const releasePoint={x:release.x-offset.x*s,y:release.y-offset.y*s},destination={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
1068:           point=sampleFallingObject({releaseMs:g.releaseMs,landingMs:g.landingMs!,release:releasePoint,destination,velocityY:(release.y-prior.y)*1000,velocityX:(release.x-prior.x)*1000},propTime);
1069:           if(point.x<0||point.x>plan.stage.width||point.y<0||point.y>plan.stage.groundY)throw new Error(g.id+': falling prop leaves the physical stage');
1070:         }else point={x:g.destination!.x-offset.x*s,y:g.destination!.y-offset.y*s};
1071:         attached=false;
1072:       }
1073:       else if(propTime>=g.contactMs!){const hand=hands[rigHand(g)];point={x:hand.x-offset.x*s,y:hand.y-offset.y*s};attached=true;}
1074:     }
1075:     props[prop.id]={point,attached};transforms[`prop-${prop.id}`]=transform(point,0,s);
1076:   }
1077:   // Reuse this physical source palm above its real owned glyph while held.
1078:   // Other arm/hand depth remains unchanged, and release restores that depth.
1079:   if(hasBodyViewManipulation(profile))for(const side of ['left','right'] as const){
1080:     const held=propGestures.some(g=>attaches(g)&&rigHand(g)===side&&g.propId&&props[g.propId]?.attached&&propTime>=g.contactMs!&&
1081:       (g.releaseMs===undefined?propTime<=g.endMs:propTime<g.releaseMs));
1082:     face[`hand-${side}-prop-slot`]={opacity:held?1:0};
1083:     if(held){face[`hand-${side}-front-slot`]={opacity:0};face[`hand-${side}-back-slot`]={opacity:0};}
1084:   }
1085:   for(const side of ['left','right'] as const){const gesture=activeGestures[side],contactTime=gestureStates[side].timeMs;
1086:   if(gesture&&contacts(gesture)&&contactTime>=gesture.contactMs!&&contactTime<=recoveryStart(gesture)){
1087:     const sourceShoulder=m.shoulders?.[side];
1088:     const shoulder=toWorld(sourceShoulder?.x??m.shoulderOffset*(side==='left'?-1:1),sourceShoulder?.y??m.shoulderY-m.pelvisY);
1089:     const anchor=add(shoulder,rotate({x:(gesture.carryOffset?.x??(side==='left'?-50:50))*s,y:(gesture.carryOffset?.y??35)*s},lean));
1090:     const expected=(gesture.action==='carry'||gesture.action==='drop')?goal(gesture,hands[side],chinAt(side),anchor,contactTime,s,shoulder):gesture.action==='operate'?gesture.target!:mix(gesture.target!,gesture.destination!,smooth((contactTime-gesture.contactMs!)/(gesture.releaseMs!-gesture.contactMs!)));
1091:     contactErrors[side]=distance(hands[side],expected);contactError=Math.max(contactError,contactErrors[side]);
1092:     if(contactErrors[side]>1)throw new Error(`${gesture.id}: ${side} hand misses contact anchor at ${t}ms (${contactErrors[side].toFixed(2)}px)`);
1093:   }
1094:   }
1095:   const heldSeat=Object.entries(bodyPosture.seatWeights??{}).find(([,weight])=>weight===1)?.[0],seat=physical.supports?.find(s=>s.id===heldSeat);
1096:   const seatOffset=m.seatContactOffset?rotate({x:-bend*m.seatContactOffset.x*s,y:m.seatContactOffset.y*s},lean):{x:0,y:0};
1097:   return {timeMs:t,...(actorGaze?{actorGaze}:{}),...(air?{airborne:{phase:air.phase,bodyVelocityY:air.bodyVelocityY}}:{}),root,feet:walk.feet,stance:walk.stance,bodyPosture,...(legProjection?{legProjection}:{}),...(Object.keys(armProjection).length?{armProjection}:{}),...(Object.keys(armGeometry).length?{armGeometry}:{}),...(Object.keys(spearGeometry).length?{spearGeometry}:{}),hands,...(wrists?{wrists}:{}),transforms,...(drawn?{paths}:{}),face,props,mood:emotion.mood,contactError,contactErrors,...(seat?{seatContact:{supportId:seat.id,errorPx:distance(add(pelvis,seatOffset),seat.center)}}:{})};
1098: }
1099: 
1100: function transformNumbers(value:string):number[] {return value.match(/-?\d+(?:\.\d+)?/g)!.map(Number);}
1101: function unwrapFrame(frame:FrameState,previous:FrameState):FrameState {
1102:   const transforms={...frame.transforms};
1103:   for(const [id,value] of Object.entries(transforms)){
1104:     const prior=previous.transforms[id];if(!prior)continue;
1105:     const angle=transformNumbers(value)[2]!,reference=transformNumbers(prior)[2]!;
1106:     const unwrapped=angle+Math.round((reference-angle)/360)*360;
1107:     transforms[id]=value.replace(/rotate\([^)]*\)/,`rotate(${number(unwrapped)})`);
1108:   }
1109:   return {...frame,transforms};
1110: }
```

## packages/director/camera.ts

Full text SHA256: ca33edc94c90cf48f161bd1c9357cf274d470fab0e2de2148a0fa41f066c51f1

```typescript
1: import type { Shot,Storyboard } from '../core/schemas.js';
2: import type { HostProfile } from '../host/schemas.js';
3: import type { PerformancePlan, Point } from '../animation/schemas.js';
4: import { rigMetrics } from '../animation/rig.js';
5: import { samplePhysicalPerformance } from '../animation/compiler.js';
6: import { validateViewActingClock, VIEW_GAZE_RAMP_MS, VIEW_BREATH_RAMP_MS, type ViewActingClock } from '../animation/view-acting-clock.js';
7: import { VIEW_EXPRESSION_RAMP_MS } from '../animation/view-expression-track.js';
8: import { sourceBodyPlan, bodyTrackOffsetMs, bodyRootAt } from '../animation/view-source-body.js';
9: import {supportMotionTimes} from '../animation/support.js';
10: import {sceneSeats} from '../stage/seats.js';
11: import {usesCutoutHead,cutoutHeadRegistration} from '../animation/forest-cutout-head.js';
12: import {nativeHeadTrackTimes} from '../animation/native-head-track.js';
13: import {hasBodyViewSecondary,nativeSecondaryBounds} from '../animation/body-view-secondary.js';
14: import {registeredBodyView} from '../animation/body-view-art.js';
15: import {hasBodyViewSeat} from '../animation/body-view-seat.js';
16: import {pathCoordinates} from '../animation/ink-limb.js';
17: import {SECONDARY_MOTION_DELAYS_MS} from '../animation/view-secondary-motion.js';
18: import { CameraSchema, type CinematicCamera } from './schemas.js';
19: import {viewGazeTargetTimes} from '../animation/view-gaze-target.js';
20: import { rendersModelLabel } from './art-direction-schemas.js';
21: import { cinematicActionGroups } from './actions.js';
22: import {boundProp} from './props.js';
23: import {actorProfile} from '../actors/model.js';
24: import {actorViewActingClock} from '../actors/view-acting-clock.js';
25: 
26: export const CAMERA_VIEWPORT={left:.04,right:.96,top:.14,bottom:.80,centerY:.46,pan:.025} as const;
27: export interface CameraMatrix { scale:number; x:number; y:number; }
28: const finite=(n:number)=>{if(!Number.isFinite(n))throw new Error('Camera values must be finite numbers.');return n;};
29: 
30: type Bounds={left:number;right:number;top:number;bottom:number};
31: const emptyBounds=():Bounds=>({left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
32: function include(bounds:Bounds,point:Point,pad=0){
33:   bounds.left=Math.min(bounds.left,point.x-pad);bounds.right=Math.max(bounds.right,point.x+pad);
34:   bounds.top=Math.min(bounds.top,point.y-pad);bounds.bottom=Math.max(bounds.bottom,point.y+pad);
35: }
36: /** Measure the shot interval, preserving original body/acting phase, headScale and antenna. */
37: export function cameraHostBounds(p:PerformancePlan,profile:HostProfile,actingClock?:ViewActingClock){
38:   if(p.sourceBody&&!actingClock)throw new Error('needs-view-body-phase: camera bounds require the complete storyboard/run context for source body');
39:   if(p.gestures.some(g=>g.sourceSpan)&&!actingClock)throw new Error('needs-view-gesture-phase: camera bounds require the complete storyboard/run context for source gesture');
40:   if(actingClock)validateViewActingClock(p,actingClock);
41:   const physical=sourceBodyPlan(p),motionOffset=p.sourceBody?bodyTrackOffsetMs(p,actingClock!.startMs):0;
42:   const times=new Set<number>([0,p.durationMs]);
43:   const secondaryTime=(at:number)=>{times.add(at);if(hasBodyViewSecondary(profile))for(const delay of SECONDARY_MOTION_DELAYS_MS)times.add(at+delay);};
44:   for(const at of supportMotionTimes(physical))secondaryTime(at+motionOffset);
45:   for(let ms=0;ms<p.durationMs;ms+=1000/p.fps)times.add(Number(ms.toFixed(4)));
46:   for(const clip of [...physical.walks,...(physical.jumps??[]),...(physical.postures??[])]){
47:     for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)secondaryTime(at+motionOffset);
48:   }
49:   for(const clip of [...(p.spears??[]),...p.gestures,...(p.turns??[]),...p.expressions]){
50:     for(const at of [clip.startMs,clip.endMs,clip.startMs+140,clip.endMs-140])if(at>=clip.startMs&&at<=clip.endMs)secondaryTime(at);
51:   }
52:   for(const jump of physical.jumps??[])for(const at of [jump.takeoffMs,jump.landingMs,(jump.takeoffMs+jump.landingMs)/2,jump.startMs+(jump.takeoffMs-jump.startMs)*2/3,jump.landingMs+(jump.endMs-jump.landingMs)/3])secondaryTime(at+motionOffset);
53:   for(const clip of physical.postures??[])secondaryTime((clip.startMs+clip.endMs)/2+motionOffset);
54:   for(const clip of p.spears??[])for(const at of [clip.readyMs,clip.contactMs,clip.recoverMs])if(at!==undefined)secondaryTime(at);
55:   for(const g of p.gestures){if(g.contactMs!==undefined)times.add(g.contactMs);if(g.releaseMs!==undefined)times.add(g.releaseMs);if(g.landingMs!==undefined)times.add(g.landingMs);
56:     if(g.action==='carry')for(const at of [g.contactMs!+250,(g.releaseMs??g.endMs)-250])if(at>=g.startMs&&at<=g.endMs)times.add(at);
57:   }
58:   if(actingClock){
59:     if(actingClock.manipulationMotion)for(const g of actingClock.manipulationMotion.gestures){
60:       for(const at of [g.startMs,g.contactMs,g.releaseMs,g.landingMs,g.endMs,g.action==='carry'||g.action==='drop'?g.contactMs!+250:undefined,g.action==='carry'&&g.releaseMs!==undefined?g.releaseMs-250:undefined])
61:         if(at!==undefined)for(const delta of [-.01,0,.01])times.add(actingClock.manipulationMotion.startMs+at-actingClock.startMs+delta);
62:     }
63:     if(actingClock.headMotion)for(const global of nativeHeadTrackTimes(actingClock.headMotion))for(const delta of [-.01,0,.01])times.add(global-actingClock.startMs+delta);
64:     for(const source of actingClock.actorTargets??[])for(const at of viewGazeTargetTimes(source))times.add(at-actingClock.startMs);
65:     for(const g of actingClock.gestures)for(const at of [g.startMs,g.reachMs,g.recoverMs,g.endMs])times.add(at-actingClock.startMs);
66:     for(const g of actingClock.gazes)for(const at of [g.startMs,g.startMs+VIEW_GAZE_RAMP_MS,g.endMs-VIEW_GAZE_RAMP_MS,g.endMs])times.add(at-actingClock.startMs);
67:     for(const clip of actingClock.expressions??[]){
68:       const window=Math.min(VIEW_EXPRESSION_RAMP_MS,(clip.endMs-clip.startMs)/2);
69:       for(const at of [clip.startMs,clip.startMs+window,clip.endMs-window,clip.endMs])secondaryTime(at-actingClock.startMs);
70:     }
71:     for(const at of [actingClock.runStartMs,actingClock.runStartMs+VIEW_BREATH_RAMP_MS,actingClock.runEndMs-VIEW_BREATH_RAMP_MS,actingClock.runEndMs])secondaryTime(at-actingClock.startMs);
72:   }
73:   const head=emptyBounds(),feet=emptyBounds(),bodyBounds=emptyBounds(),props:Record<string,Bounds>={},ratio={min:Infinity,max:-Infinity},stroke=profile.appearance.strokeWidth/2;
74:   for(const time of [...times].filter(at=>Number.isFinite(at)&&at>=0&&at<=p.durationMs)){
75:     const frame=samplePhysicalPerformance(p,profile,time,actingClock);
76:     for(const [id,prop] of Object.entries(frame.props)){
77:       const bound=props[id]??=emptyBounds();include(bound,prop.point);
78:       if(prop.tip){include(bound,prop.tip,6*p.scale);include(bound,{x:2*prop.point.x-prop.tip.x,y:2*prop.point.y-prop.tip.y},3*p.scale);}
79:     }
80:     const match=/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\)$/.exec(frame.transforms.head!);
81:     if(!match)throw new Error('Camera cannot measure the production head transform.');
82:     const x=Number(match[1]),y=Number(match[2]),angle=Number(match[3])*Math.PI/180,scale=Number(match[4]),local=emptyBounds();
83:     if(usesCutoutHead(profile)){
84:       const c=cutoutHeadRegistration(profile);
85:       const headBounds=hasBodyViewSecondary(profile)?nativeSecondaryBounds(profile,registeredBodyView(profile),frame.surfaceState):c.bounds;
86:       for(const px of [headBounds.left,headBounds.right])for(const py of [headBounds.top,headBounds.bottom]){
87:         const dx=(px-c.neck.x)*c.scale,dy=(py-c.neck.y)*c.scale;
88:         include(local,{x:x+(dx*Math.cos(angle)-dy*Math.sin(angle))*scale,y:y+(dx*Math.sin(angle)+dy*Math.cos(angle))*scale});
89:       }
90:     }else if(profile.kind==='stick-man'){include(local,{x,y},(40+stroke)*scale);}
91:     else {
92:       const point=(px:number,py:number)=>({x:x+(px*Math.cos(angle)-py*Math.sin(angle))*scale,y:y+(px*Math.sin(angle)+py*Math.cos(angle))*scale});
93:       for(const px of [-50,50])for(const py of [-42,42])include(local,point(px,py),stroke*scale);
94:       include(local,point(0,-63),(5+stroke)*scale);
95:     }
96:     include(head,{x:local.left,y:local.top});include(head,{x:local.right,y:local.bottom});
97:     const body={...local};
98:     if(hasBodyViewSeat(profile)){
99:       const contour=frame.paths?.['view-seat-contour'],chest=/^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+)\)$/.exec(frame.transforms.chest!);
100:       if(!contour||!chest)throw new Error('needs-view-seat: camera cannot measure the shared garment contour');
```

## packages/host/schemas.ts

Full text SHA256: f484a43ad7b05c3842e33fd7482a1da81b892c55331db9ed62b90fe52d8edf91

```typescript
59:   sourceManipulation:ManipulationActionRefSchema.optional() })
60:   .superRefine((action,ctx)=>{
61:     if(action.endMs<=action.startMs)ctx.addIssue({code:'custom',message:'Host action interval must be positive'});
62:     if(action.sourceManipulation&&(action.type!=='operate-model'||!action.hand||!action.narrationAnchor||!action.target||action.target.anchor!=='center'||action.secondTarget))
63:       ctx.addIssue({code:'custom',path:['sourceManipulation'],message:'Original contact action requires operate-model, explicit own hand, cue and one model center target'});
64:   });
65: export const ShotHostSchema = z.object({ id: Id, profileVersion: z.number().int().positive(), rigHash: z.string(),
66:   presence: z.enum(['beside-model', 'inset', 'absent']), actions: z.array(HostActionSchema).min(1) });
67: export type ShotHost = z.infer<typeof ShotHostSchema>;
68: export const HostTimelineSchema = z.object({ version: z.literal(2), hostId: Id, profileVersion: z.number().int().positive(),
69:   rigHash: z.string(), durationMs: z.number().int().positive(), speechVisibility: z.number().min(0).max(1),
70:   synchronization: z.enum(['audio-activity', 'word', 'segment']),
71:   shots: z.array(z.object({ shotId: Id, startMs: z.number().int(), endMs: z.number().int(), host: ShotHostSchema })).min(1) });
72: 
```

## packages/director/source-manipulation-actions.ts

Full text SHA256: 5424a11cb28abcea3f9f3421014cd0459d54d4dfb88fa070f180f449c324548f

```typescript
import {HostActionSchema,type ShotHost} from '../host/schemas.js';
import {rigHand} from '../core/identifiers.js';
import type {PerformancePlan,Gesture} from '../animation/schemas.js';
import {validateManipulationSourcePlan} from '../animation/view-source-manipulation.js';

type Action=ShotHost['actions'][number];
type Context={shotStartMs:number;target:NonNullable<Action['target']>;narrationAnchor:string};
function ownedSlice(plan:PerformancePlan,gesture:Gesture,shotStartMs:number){
  const source=plan.sourceManipulation!;
  if(!Number.isSafeInteger(shotStartMs)||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  const startMs=Math.max(shotStartMs,source.startMs+gesture.startMs),endMs=Math.min(shotStartMs+plan.durationMs,source.startMs+gesture.endMs);
  if(startMs>=endMs)return;
  const contact=source.startMs+gesture.contactMs!;
  return {startMs,endMs,...(contact>=startMs&&contact<endMs?{contactMs:contact}:{})};
}
/** Source-only authoring contract. Target/cue are supplied from the sourced
 * storyboard, never inferred from coordinates or manufactured after a cut. */
export function projectManipulationAction(plan:PerformancePlan,gestureId:string,context:Context):Action{
  validateManipulationSourcePlan(plan);
  const source=plan.sourceManipulation,gesture=source?.gestures.find(g=>g.id===gestureId);
  if(!source||!gesture)throw new Error('needs-source-action: missing original contact source/gesture');
  const slice=ownedSlice(plan,gesture,context.shotStartMs);
  if(!slice)throw new Error('needs-source-action: original gesture does not overlap this shot');
  return HostActionSchema.parse({type:'operate-model',hand:rigHand(gesture),...slice,
    target:context.target,narrationAnchor:context.narrationAnchor,sourceManipulation:{sourceId:source.id,gestureId:gesture.id}});
}
/** Exact per-shot projection only. This does not certify cue evidence, object
 * binding, contact reactions, model continuity, rendering or production. */
export function validateManipulationActionSlices(plan:PerformancePlan,actions:readonly Action[],shotStartMs:number):void{
  const selected=actions.filter(a=>a.sourceManipulation),source=plan.sourceManipulation;
  if(!source){if(selected.length)throw new Error('needs-source-action: reference has no original performance contact source');return;}
  validateManipulationSourcePlan(plan);
  // Validate even a slice that has no active contact gesture.
  if(!Number.isSafeInteger(shotStartMs)||shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)
    throw new Error('needs-source-action: shot is outside the original owned contact clock');
  const expected=source.gestures.flatMap(g=>{const slice=ownedSlice(plan,g,shotStartMs);return slice?[{gesture:g,slice}]:[];});
  if(selected.length!==expected.length)throw new Error('needs-source-action: each original contact slice requires exactly one explicit action reference');
  const seen=new Set<string>();
  for(const raw of selected){
    const action=HostActionSchema.parse(raw),ref=action.sourceManipulation!,entry=expected.find(e=>e.gesture.id===ref.gestureId);
    if(ref.sourceId!==source.id||!entry||seen.has(ref.gestureId)||rigHand(action)!==rigHand(entry.gesture)||
      action.startMs!==entry.slice.startMs||action.endMs!==entry.slice.endMs||action.contactMs!==entry.slice.contactMs)
      throw new Error('needs-source-action: original source/gesture/hand/clock/contact was changed or restarted at a cut');
    seen.add(ref.gestureId);
    if(actions.some(other=>other!==raw&&!other.sourceManipulation&&(!other.hand&&other.type==='idle'||rigHand(other)===rigHand(action))&&other.startMs<action.endMs&&other.endMs>action.startMs))
      throw new Error('needs-source-action: another shot-local action owns the original contact hand');
  }
}
export const sourceManipulationActionDescription={version:'source-manipulation-action-1',
  selection:'explicit host/supporting action.sourceManipulation sourceId + gestureId',
  clock:'exact shot intersection of original contact gesture; contact only in its actual half-open slice, never fabricated at a later cut',
  scope:'schema and projection validation only; original cue/model/entity/reaction/continuity production binding still pending',
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false};

```

## packages/director/props.ts

Full text SHA256: 435610d1391c0dab61a3e08ad8a9dd28f6e010f8502a0c1fcf102a51466bd9e4

```typescript
59: }
60: export function validatePropBindings(shot:Shot):void{
61:   const c=shot.cinematic;if(!c)return;
62:   const performances=[c.performance,...(c.actorScene?.supporting.map(a=>a.performance)??[])];
63:   if(performances.some(p=>p.sourceManipulation))throw new Error(`${shot.id}: needs-source-prop-binding: original contact clock requires sourced model/action/camera continuity binding; an unbound prop cannot enter production`);
64:   const declared=performances.flatMap(p=>p.props.map(prop=>prop.id));
65:   if(new Set(declared).size!==declared.length)throw new Error(`${shot.id}: prop IDs must be unique across the entire visible cast`);
66:   if(c.propBindings.length!==declared.length)throw new Error(`${shot.id}: every animated prop requires a sourced model binding`);
67:   const svgIds=c.propBindings.map(binding=>boundProp(shot,binding).svgId);
```

## packages/director/index.ts

Full text SHA256: ee6a035be8c9a2024f45432f016b3bcb3e77c130d66c11871ea3d5b1ea3de6e5

```typescript
230:     return;
231:   }
232:   if(hash(c.continuity.entry)!==hash(bodyRootAt(p,shot.startMs,0))||Math.abs(c.continuity.exit.x-bodyRootAt(p,shot.startMs,p.durationMs).x)>.01||c.continuity.exit.y!==p.stage.groundY)throw new Error(`${shot.id}: cinematic continuity disagrees with locomotion`);
233:   validateManipulationActionSlices(p,shot.host?.actions??[],shot.startMs);
234:   if(validateWorld)validatePropBindings(shot);
235:   if(validateWorld&&hash(c.continuity.models)!==hash(modelExitParts(shot).map(part=>({partId:part.id,x:part.x,y:part.y,width:part.width,height:part.height}))))throw new Error(`${shot.id}: model continuity disagrees with stage transforms`);
236:   const exitFacing=[...(p.turns??[])].sort((a,b)=>a.startMs-b.startMs).at(-1)?.direction??p.facing??'front';
```
