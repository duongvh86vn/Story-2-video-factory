// DECLARATION ONLY / NOT RUN. No factory is invoked at module scope.
import assert from 'node:assert/strict';
import {ShotSchema,type Shot,type Storyboard,type Narration} from '../../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../../packages/actors/schemas.js';
import {actorProfile} from '../../packages/actors/model.js';
import {bodyCalibrationPlan} from '../../packages/topics/body-workbench.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../../packages/animation/body-view-cloth.js';
import {BODY_SOURCE_VERSION,SPEAR_SOURCE_VERSION,type SpearSource,type PerformancePlan} from '../../packages/animation/schemas.js';
import {SOURCE_SPEAR_BINDING_VERSION} from '../../packages/director/source-spear-binding-schemas.js';
import {DIRECTION_VERSION} from '../../packages/director/schemas.js';
import {projectSpearAction} from '../../packages/director/source-spear-actions.js';

export function originalSpearFixture(mode:'hold'|'thrust'='hold'){
  const stageWidth=1200; // Room for both original full-length shafts; no shortening.
  const text=mode==='hold'?'Lila and Karo hold their spears in the forest.':'Lila holds her spear while Karo thrusts his spear at a target.',ref={kind:'narration' as const,segmentId:'cue',quote:text};
  const raw=(['lila','karo'] as const).map(actor=>bodyCalibrationPlan(actor,mode==='thrust'&&actor==='karo'?'spear-thrust':'spear-hold','happy','right','three-quarter-right','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION));
  const characters=raw.map((f,i)=>ActorDefinitionSchema.parse({id:i?'karo-person':'lila-person',name:i?'Karo':'Lila',role:'forest actor holding own spear',identity:'illustrative',kind:'stick-man',appearance:f.profile.appearance,costume:[],sourceRefs:[ref]}));
  const profiles=characters.map(c=>actorProfile(c));
  const plans=raw.map((f,i)=>{
    const p=structuredClone(f.plan),shift=i?400:0;p.stage.width=stageWidth;p.root.x+=shift;
    const props=p.props.map(prop=>{assert.ok(prop.kind==='spear'&&prop.length&&prop.attachedTo&&prop.gripOffset);return {id:prop.id,kind:'spear' as const,length:prop.length,attachedTo:prop.attachedTo,origin:{x:prop.origin.x+shift,y:prop.origin.y},gripOffset:{x:prop.gripOffset.x,y:0 as const}};});
    const source:SpearSource={version:SPEAR_SOURCE_VERSION,id:characters[i]!.id+'-shaft-run',ownerId:characters[i]!.id,startMs:0,endMs:4000,props,
      spears:p.spears!.map(s=>{assert.ok(s.elbowPoles);return {id:s.id,propId:s.propId,startMs:0,endMs:4000,action:s.action,hand:s.hand,twoHand:s.twoHands,grip:{...s.grip},aim:{x:s.aim.x+shift,y:s.aim.y},secondaryOffset:s.secondaryOffset,readyMs:s.readyMs,contactMs:s.contactMs,recoverMs:s.recoverMs,
        elbowPoles:s.hand==='right'?{right:s.elbowPoles.primary,left:s.elbowPoles.secondary}:{left:s.elbowPoles.primary,right:s.elbowPoles.secondary}};})};
    return {...p,leadCharacterId:characters[i]!.id,profileHash:profiles[i]!.profileHash,props:[],spears:[],walks:[],jumps:[],postures:[],lunge:undefined,gestures:[],gazes:[],expressions:[],
      sourceBody:{version:BODY_SOURCE_VERSION,id:characters[i]!.id+'-body-run',startMs:0,endMs:4000,walks:[],jumps:[],postures:[]},sourceSpear:source} satisfies PerformancePlan;
  });
  const parts=plans.map((p,i)=>{const prop=p.sourceSpear.props[0]!;return {id:i?'karo-spear':'lila-spear',label:i?'Karo spear':'Lila spear',kind:'object' as const,x:prop.origin.x/stageWidth,y:prop.origin.y/p.stage.height,width:prop.length*p.scale/stageWidth,height:14*p.scale/p.stage.height,sourceRefs:[ref]};});
  if(mode==='thrust'){
    const aim=plans[1]!.sourceSpear.spears[0]!.aim;
    parts.push({id:'target',label:'target',kind:'object',x:aim.x/stageWidth,y:aim.y/plans[1]!.stage.height,width:.06,height:.12,sourceRefs:[ref]});
  }
  const intent={participants:characters.map(c=>({id:c.id,name:c.name,role:c.role,identity:c.identity,sourceRefs:c.sourceRefs})),action:text,objective:text,sourceRefs:[ref],
    acting:characters.map((c,i)=>({participantId:c.id,kind:'manipulation' as const,operation:mode==='thrust'&&i===1?'thrust-tool' as const:'hold-tool' as const,statement:text,sourceRefs:[ref],targetIds:[mode==='thrust'&&i===1?'target':parts[i]!.id]}))};
  const shots:Shot[]=[],cuts=mode==='thrust'?[0,900,1800,2200,4000]:[0,900,2700,4000];
  for(let i=0;i<cuts.length-1;i++){
    const primary=i%2,support=1-primary,id='tool-camera-'+i,startMs=cuts[i]!,endMs=cuts[i+1]!,local=plans.map(p=>({...structuredClone(p),durationMs:endMs-startMs,id}));
    const actions=local.map((p,j)=>[projectSpearAction(p,p.sourceSpear.spears[0]!.id,{shotStartMs:startMs,shaftPartId:parts[j]!.id,
      target:{modelId:'forest-model-'+i,partId:mode==='thrust'&&j===1?'target':parts[j]!.id,anchor:'center'},narrationAnchor:'cue'})]);
    shots.push(ShotSchema.parse({id,startMs,endMs,beatIds:['beat'],sceneType:'character-scene',subject:text,characters:characters.map(c=>c.id),visualDescription:text,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],
      host:{id:characters[primary]!.id,profileVersion:1,rigHash:'source-candidate',presence:'beside-model',actions:actions[primary]!},visualization:{type:'summary',modelId:'forest-model-'+i,provenance:'visualization',fidelity:'conceptual',sceneIntent:intent,parts:structuredClone(parts),relations:[],events:[]},
      cinematic:{version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:characters[primary]!.id,motivation:text,sceneIntent:intent,attentionPartId:parts[0]!.id,sourceRefs:[ref],setting:'forest',provenance:'illustration',models:parts.map(p=>({partId:p.id,variant:'conceptual',sourceRefs:[ref]})),
        propBindings:plans.map((p,j)=>({ownerId:characters[j]!.id,propId:p.sourceSpear.props[0]!.id,partId:parts[j]!.id,role:'illustrative-model',sourceRefs:[ref]})),
        sourceSpearBindings:plans.map((p,j)=>({version:SOURCE_SPEAR_BINDING_VERSION,id:characters[j]!.id+'-entity',ownerId:characters[j]!.id,sourceId:p.sourceSpear.id,trackId:p.sourceSpear.spears[0]!.id,propId:p.sourceSpear.props[0]!.id,partId:parts[j]!.id,artwork:'forest-spear-grips-4',sourceRefs:[ref]})),
        actorScene:{primary:characters[primary]!,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[{character:characters[support]!,performance:local[support]!,actions:actions[support]!,speakingSegmentIds:[]}]},performance:local[primary]!,
        continuity:{entry:{...local[primary]!.root},exit:{...local[primary]!.root},facing:'right',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:500,y:220},startScale:1,endScale:1},
        artDirection:{origin:'authored',brief:'Source-only physical shaft model binding fixture, not an accepted film.',useEnvironment:false,palette:{background:'#71CFF0',surface:'#DB9B4D',ink:'#2B1710',accent:'#F97316'},showHeading:false,layers:[],models:[]}}}));
  }
  const board:Storyboard={shots},narration:Narration={mode:'script',durationMs:4000,segments:[{id:'cue',startMs:0,endMs:4000,text}],words:[]};
  return {board,narration};
}
