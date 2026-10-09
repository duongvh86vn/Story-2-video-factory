// DECLARED / NOT RUN. Only the human's tester may invoke these factories,
// schemas, physical geometry, compiler channels and relation rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {ShotSchema,type Shot,type Storyboard,type Narration} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {bodyCalibrationPlan} from '../packages/topics/body-workbench.js';
import {BODY_VIEW_LOCOMOTION_SELECTION} from '../packages/animation/body-view-cloth.js';
import {BODY_SOURCE_VERSION,SPEAR_SOURCE_VERSION,type SpearSource,type PerformancePlan} from '../packages/animation/schemas.js';
import {SourceSpearBindingSchema,SOURCE_SPEAR_BINDING_VERSION} from '../packages/director/source-spear-binding-schemas.js';
import {sourceSpearBinding,validateSourceSpearBindings} from '../packages/director/source-spear-bindings.js';
import {sourcePropBindingIdentity} from '../packages/director/source-prop-identity.js';
import {validateSourceSpearProductionBinding} from '../packages/director/props.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {compiledModelFrames,compiledRigidProp,mergeModelMotionFrames,validateModelMotionFrames,type CompiledModelSource,type CompiledPropFrame} from '../packages/director/prop-motion.js';
import {modelRelationRadius} from '../library/shots/cinematic-models.js';

function rigidFixture():CompiledModelSource{
  const frame=(timeMs:number,x:number,raw:number,emitted:number):CompiledPropFrame=>({timeMs,props:{shaft:{point:{x,y:30},attached:true,angle:raw,tip:{x:x-100,y:30}}},transforms:{'prop-shaft':`translate(${Number(x.toFixed(4))} 30) rotate(${emitted}) scale(0.8)`}});
  return {partId:'actual-spear',ownerId:'karo-person',propId:'shaft',rigid:{transformKey:'prop-shaft',scale:.8},frames:[frame(0,100.123456,170,170),frame(100,200.123456,-150,210)]};
}
function bindingFixture(){
  const text='Lila and Karo hold their spears in the forest.',ref={kind:'narration' as const,segmentId:'cue',quote:text};
  const raw=(['lila','karo'] as const).map(actor=>bodyCalibrationPlan(actor,'spear-hold','happy','right','three-quarter-right','cutout','silent','native','rest','native',BODY_VIEW_LOCOMOTION_SELECTION));
  const characters=raw.map((f,i)=>ActorDefinitionSchema.parse({id:i?'karo-person':'lila-person',name:i?'Karo':'Lila',role:'forest actor holding own spear',identity:'illustrative',kind:'stick-man',appearance:f.profile.appearance,costume:[],sourceRefs:[ref]}));
  const profiles=characters.map(c=>actorProfile(c));
  const plans=raw.map((f,i)=>{
    const p=structuredClone(f.plan),shift=i?400:0;p.stage.width=1000;p.root.x+=shift;
    const props=p.props.map(prop=>{assert.ok(prop.kind==='spear'&&prop.length&&prop.attachedTo&&prop.gripOffset);return {id:prop.id,kind:'spear' as const,length:prop.length,attachedTo:prop.attachedTo,origin:{x:prop.origin.x+shift,y:prop.origin.y},gripOffset:{x:prop.gripOffset.x,y:0 as const}};});
    const source:SpearSource={version:SPEAR_SOURCE_VERSION,id:characters[i]!.id+'-shaft-run',ownerId:characters[i]!.id,startMs:0,endMs:4000,props,
      spears:p.spears!.map(s=>{assert.ok(s.elbowPoles);return {id:s.id,propId:s.propId,startMs:0,endMs:4000,action:s.action,hand:s.hand,twoHand:s.twoHands,grip:{...s.grip},aim:{x:s.aim.x+shift,y:s.aim.y},secondaryOffset:s.secondaryOffset,
        elbowPoles:s.hand==='right'?{right:s.elbowPoles.primary,left:s.elbowPoles.secondary}:{left:s.elbowPoles.primary,right:s.elbowPoles.secondary}};})};
    return {...p,leadCharacterId:characters[i]!.id,profileHash:profiles[i]!.profileHash,props:[],spears:[],walks:[],jumps:[],postures:[],lunge:undefined,gestures:[],gazes:[],expressions:[],
      sourceBody:{version:BODY_SOURCE_VERSION,id:characters[i]!.id+'-body-run',startMs:0,endMs:4000,walks:[],jumps:[],postures:[]},sourceSpear:source} satisfies PerformancePlan;
  });
  const parts=plans.map((p,i)=>{const prop=p.sourceSpear.props[0]!;return {id:i?'karo-spear':'lila-spear',label:i?'Karo spear':'Lila spear',kind:'object' as const,x:prop.origin.x/1000,y:prop.origin.y/p.stage.height,width:prop.length*p.scale/1000,height:14*p.scale/p.stage.height,sourceRefs:[ref]};});
  const shots:Shot[]=[],cuts=[0,900,2700,4000];
  for(let i=0;i<cuts.length-1;i++){
    const primary=i%2,support=1-primary,id='tool-camera-'+i,startMs=cuts[i]!,endMs=cuts[i+1]!,local=plans.map(p=>({...structuredClone(p),durationMs:endMs-startMs,id}));
    shots.push(ShotSchema.parse({id,startMs,endMs,beatIds:['beat'],sceneType:'character-scene',subject:text,characters:characters.map(c=>c.id),visualDescription:text,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],
      host:{id:characters[primary]!.id,profileVersion:1,rigHash:'source-candidate',presence:'beside-model',actions:[]},visualization:{type:'summary',modelId:'forest-model-'+i,provenance:'visualization',fidelity:'conceptual',parts:structuredClone(parts),relations:[],events:[]},
      cinematic:{version:22,producer:DIRECTION_VERSION,shotId:id,leadCharacterId:characters[primary]!.id,motivation:text,attentionPartId:parts[0]!.id,sourceRefs:[ref],setting:'forest',provenance:'illustration',models:parts.map(p=>({partId:p.id,variant:'conceptual',sourceRefs:[ref]})),
        propBindings:plans.map((p,j)=>({ownerId:characters[j]!.id,propId:p.sourceSpear.props[0]!.id,partId:parts[j]!.id,role:'illustrative-model',sourceRefs:[ref]})),
        sourceSpearBindings:plans.map((p,j)=>({version:SOURCE_SPEAR_BINDING_VERSION,id:characters[j]!.id+'-entity',ownerId:characters[j]!.id,sourceId:p.sourceSpear.id,trackId:p.sourceSpear.spears[0]!.id,propId:p.sourceSpear.props[0]!.id,partId:parts[j]!.id,artwork:'forest-spear-grips-4',sourceRefs:[ref]})),
        actorScene:{primary:characters[primary]!,speakingSegmentIds:[],continuity:i?'continuous':'cut',supporting:[{character:characters[support]!,performance:local[support]!,actions:[],speakingSegmentIds:[]}]},performance:local[primary]!,
        continuity:{entry:{...local[primary]!.root},exit:{...local[primary]!.root},facing:'right',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:500,y:220},startScale:1,endScale:1},
        artDirection:{origin:'authored',brief:'Source-only physical shaft model binding fixture, not an accepted film.',useEnvironment:false,palette:{background:'#71CFF0',surface:'#DB9B4D',ink:'#2B1710',accent:'#F97316'},showHeading:false,layers:[],models:[]}}}));
  }
  const board:Storyboard={shots},narration:Narration={mode:'script',durationMs:4000,segments:[{id:'cue',startMs:0,endMs:4000,text}],words:[]};
  return {board,narration};
}

test('rigid entity reads the rounded emitted center and unwrapped angle, including fractional union times',()=>{
  const s=rigidFixture(),before=hash(s),base=[{timeMs:0,props:{}},{timeMs:25.25,props:{}},{timeMs:100,props:{}}],frames=compiledModelFrames(base,[s]);
  assert.equal(frames[0]!.centers[s.partId]!.x,100.1235);assert.equal(frames[1]!.rotations![s.partId],180.1);assert.equal(frames[2]!.rotations![s.partId],210);
  validateModelMotionFrames(frames,[s.partId],100);assert.equal(hash(s),before);
});
test('a missing, mismatched, rescaled or detached rigid glyph cannot borrow raw physics as a drawn transform',()=>{
  for(const mutate of [(s:CompiledModelSource)=>{delete s.frames[0]!.transforms;},(s:CompiledModelSource)=>{s.frames[0]!.transforms!['prop-shaft']='translate(101 30) rotate(170) scale(0.8)';},(s:CompiledModelSource)=>{s.rigid!.scale=1;},(s:CompiledModelSource)=>{s.frames[0]!.props.shaft!.attached=false;},(s:CompiledModelSource)=>{s.frames[0]!.props.shaft!.angle=NaN;},(s:CompiledModelSource)=>{s.frames[0]!.transforms=Object.create(s.frames[0]!.transforms!); }]){
    const s=rigidFixture();mutate(s);assert.throws(()=>compiledRigidProp(s.frames[0]!,s));
  }
});
test('mixed canonical and rigid channels preserve entity keys, unwrapped angle and full clock without inferred rotation',()=>{
  const s=rigidFixture(),f=compiledModelFrames(s.frames,[s]),merged=mergeModelMotionFrames(100,[{partIds:[s.partId],frames:f},{partIds:['basket'],frames:[{timeMs:0,centers:{basket:{x:400,y:30}}},{timeMs:50,centers:{basket:{x:410,y:30}}},{timeMs:100,centers:{basket:{x:420,y:30}}}]}]);
  assert.equal(merged[1]!.rotations![s.partId],190);assert.equal(Object.hasOwn(merged[1]!.rotations!,'basket'),false);
  const broken=structuredClone(merged);delete broken[1]!.rotations;assert.throws(()=>validateModelMotionFrames(broken,[s.partId,'basket'],100),/rotation/);
});
test('relation ray uses local rotated shaft dimensions without applying owner scale twice',()=>{
  assert.equal(modelRelationRadius(200,14,1,0,0),106);assert.ok(Math.abs(modelRelationRadius(200,14,1,0,90)-7.42)<1e-8);
  assert.ok(Math.abs(modelRelationRadius(200,14,0,1,90)-106)<1e-8);assert.throws(()=>modelRelationRadius(200,14,1,0,NaN));
});
test('actual two-person spear entity/model/source registration survives complete primary and supporting camera swaps',()=>{
  const f=bindingFixture(),before=hash(f);
  for(const shot of f.board.shots){validateSourceSpearBindings(shot,f.board,f.narration);assert.equal(sourceSpearBinding(shot,shot.cinematic!.propBindings[1]!)!.owner.id,'karo-person');}
  assert.equal(hash(f),before);
});
test('full binding rejects sibling art, dimensions, foreign owner, orphan registration, changed source and narration evidence',()=>{
  const mutations:Array<(f:ReturnType<typeof bindingFixture>)=>void>=[
    f=>{f.board.shots[1]!.visualization!.parts[1]!.width+=.01;},
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings![1]!.ownerId='foreign';},
    f=>{f.board.shots[1]!.cinematic!.sourceSpearBindings!.push({...f.board.shots[1]!.cinematic!.sourceSpearBindings![1]!,id:'orphan',partId:'missing'});},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models.push({partId:'karo-spear',sourceRefs:f.board.shots[1]!.visualization!.parts[1]!.sourceRefs,svg:'<circle r="20"/>'});},
    f=>{f.board.shots[1]!.cinematic!.performance.sourceSpear!.props[0]!.length+=1;},
    f=>{f.narration.segments[0]!.text='Another story entirely.';},
  ];
  for(const mutate of mutations){const f=bindingFixture();mutate(f);assert.throws(()=>validateSourceSpearBindings(f.board.shots[0]!,f.board,f.narration));}
});
test('tool cache identity changes with the actual sibling model, phase, owner and cue; no approval is created',()=>{
  const f=bindingFixture(),shot=f.board.shots[0]!,first=sourcePropBindingIdentity(shot,f.board,f.narration)!;
  f.board.shots[2]!.visualization!.parts[0]!.height+=.01;
  assert.notEqual(first.fingerprint,sourcePropBindingIdentity(shot,f.board,f.narration)!.fingerprint);assert.equal(first.approved,false);
});
test('model binding candidates still block production on both camera roles and never synthesize acceptance',()=>{
  const f=bindingFixture();for(const shot of f.board.shots){assert.throws(()=>validateSourceSpearProductionBinding(shot),/needs-source-prop-binding/);}
  const declared=f.board.shots[0]!.cinematic!.sourceSpearBindings![0]!;
  assert.equal(SourceSpearBindingSchema.safeParse({...declared,approved:true}).success,false);
});
