// Test data authoring only. Invoked exclusively inside human-owned callbacks.
import {ActorDefinitionSchema} from '../../packages/actors/schemas.js';
import {actorProfile} from '../../packages/actors/model.js';
import {ShotSchema,type Shot,type Storyboard,type Narration} from '../../packages/core/schemas.js';
import {ConfigSchema} from '../../packages/core/config.js';
import {bodyCalibrationPlan} from '../../packages/topics/body-workbench.js';
import {BODY_SOURCE_VERSION,MANIPULATION_SOURCE_VERSION,type PerformancePlan} from '../../packages/animation/schemas.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../../packages/animation/body-view-cloth.js';
import {BODY_VIEW_MANIPULATION_SELECTION} from '../../packages/animation/native-contact-arm.js';
import {projectManipulationAction} from '../../packages/director/source-manipulation-actions.js';
import {stageModels} from '../../packages/director/models.js';
import {DIRECTION_VERSION} from '../../packages/director/schemas.js';

export function sourceInteractionFixture(drop=false,cuts=[1000,2300,4100,5000]){
  const text=drop?'Lila carries the basket while Karo drops the bowl.':'Lila carries the basket while Karo carries the bowl and both place their objects down.';
  const ref={kind:'narration' as const,segmentId:'cue',quote:text},narration:Narration={mode:'script',durationMs:5000,segments:[{id:'cue',startMs:1000,endMs:5000,text}],words:[]};
  const raw=(['lila','karo'] as const).map((actor,i)=>bodyCalibrationPlan(actor,i&&drop?'drop':'carry','happy','right','three-quarter-right','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION,'rigid','unregistered',BODY_VIEW_MANIPULATION_SELECTION));
  const characters=raw.map((f,i)=>ActorDefinitionSchema.parse({id:i?'karo-person':'lila-person',name:i?'Karo':'Lila',role:'sourced forest actor',identity:'illustrative',kind:'stick-man',appearance:f.profile.appearance,costume:[],sourceRefs:[ref]}));
  const profiles=characters.map(c=>actorProfile(c));
  const full=raw.map((f,i)=>{
    const p=structuredClone(f.plan),shift=i?400:0,propId=i?'bowl-prop':'basket-prop';p.stage.width=1000;p.root.x+=shift;
    for(const w of p.walks){w.fromX+=shift;w.toX+=shift;}
    for(const prop of p.props){prop.id=propId;prop.origin.x+=shift;if(prop.destination)prop.destination.x+=shift;}
    for(const g of p.gestures){g.id=characters[i]!.id+'-contact';g.propId=propId;if(g.target)g.target.x+=shift;if(g.destination)g.destination.x+=shift;}
    const source={version:MANIPULATION_SOURCE_VERSION,id:characters[i]!.id+'-original-props',startMs:1000,endMs:5000,props:p.props,gestures:p.gestures};
    const body={version:BODY_SOURCE_VERSION,id:characters[i]!.id+'-original-body',startMs:1000,endMs:5000,walks:p.walks,jumps:p.jumps??[]};
    return {...p,leadCharacterId:characters[i]!.id,profileHash:profiles[i]!.profileHash,walks:[],jumps:[],props:[],gestures:[],gazes:[],expressions:[],sourceBody:body,sourceManipulation:source} satisfies PerformancePlan;
  });
  const parts=full.map((p,i)=>({id:i?'bowl':'basket',label:i?'bowl':'basket',kind:'object' as const,x:p.sourceManipulation.props[0]!.origin.x/1000,y:p.sourceManipulation.props[0]!.origin.y/440,width:.032,height:20/440,sourceRefs:[ref]}));
  const intent={participants:characters.map(c=>({id:c.id,name:c.name,role:c.role,identity:c.identity,sourceRefs:[ref]})),action:text,objective:'Perform the original sourced actions with two distinct objects.',sourceRefs:[ref],acting:characters.map((c,i)=>({participantId:c.id,kind:'manipulation' as const,operation:i&&drop?'drop' as const:'carry' as const,statement:text,sourceRefs:[ref],targetIds:[parts[i]!.id]}))};
  const shots:Shot[]=[];
  for(let i=0;i<cuts.length-1;i++){
    const startMs=cuts[i]!,endMs=cuts[i+1]!,primary=i%2,support=1-primary,id='source-prop-shot-'+i;
    const plans=full.map((p,j)=>({...p,id:id+'-'+characters[j]!.id,durationMs:endMs-startMs}));
    plans[primary]!.id=id;
    const actions=plans.map((p,j)=>[projectManipulationAction(p,p.sourceManipulation.gestures[0]!.id,{shotStartMs:startMs,target:{modelId:'forest-model-'+i,partId:parts[j]!.id,anchor:'center'},narrationAnchor:'cue'})]);
    const shot=ShotSchema.parse({id,startMs,endMs,beatIds:['beat'],sceneType:'character-scene',subject:text,characters:characters.map(c=>c.id),visualDescription:text,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],host:{id:characters[primary]!.id,profileVersion:1,rigHash:'candidate-rig',presence:'beside-model',actions:actions[primary]},visualization:{type:'summary',modelId:'forest-model-'+i,provenance:'visualization',fidelity:'conceptual',parts:structuredClone(parts),relations:[],events:[],sceneIntent:intent}});
    shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:characters[primary]!.id,motivation:text,attentionPartId:'basket',sourceRefs:[ref],setting:'forest',provenance:'illustration',models:stageModels(shot),sceneIntent:intent,propBindings:plans.map((p,j)=>({propId:p.sourceManipulation.props[0]!.id,ownerId:characters[j]!.id,partId:parts[j]!.id,role:'illustrative-model',sourceRefs:[ref]})),actorScene:{primary:characters[primary]!,speakingSegmentIds:primary===0?['cue']:[],continuity:i?'continuous':'cut',supporting:[{character:characters[support]!,performance:plans[support]!,actions:actions[support]!,speakingSegmentIds:support===0?['cue']:[]}]},performance:plans[primary]!,artDirection:{origin:'authored',brief:'Candidate two-person forest prop continuity, not approved animation.',useEnvironment:false,palette:{background:'#71CFF0',surface:'#DB9B4D',ink:'#2B1710',accent:'#F97316'},showHeading:false,layers:[],models:parts.map(p=>({partId:p.id,sourceRefs:[ref],svg:'<path d="M-16 -10H16L12 10H-12Z" fill="#AE6E31"/>',labelMode:'none',controlMode:'none'}))},continuity:{entry:plans[primary]!.root,exit:plans[primary]!.root,facing:plans[primary]!.facing!,carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:500,y:220},startScale:1,endScale:1,designIntent:'Keep two actual performers and their own objects in the same world.'}};
    shots.push(shot);
  }
  const board:Storyboard={shots};
  return {board,narration,characters,profiles,full,ref,config:ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1000,height:440,fps:60}}})};
}
