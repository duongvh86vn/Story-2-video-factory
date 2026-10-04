import assert from 'node:assert/strict';
import test, {beforeEach} from 'node:test';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ConfigSchema} from '../packages/core/config.js';
import {ShotSchema} from '../packages/core/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {actorProfile} from '../packages/actors/model.js';
import {buildRig} from '../packages/host/rig.js';
import {ANIMATION_VERSION, PerformancePlanSchema} from '../packages/animation/schemas.js';
import {compilePerformance, samplePerformance} from '../packages/animation/compiler.js';
import {DIRECTION_VERSION} from '../packages/director/schemas.js';
import {stageModels} from '../packages/director/models.js';
import {modelExitParts, validatePropBindings} from '../packages/director/props.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {HyperFramesEngine} from '../packages/render/hyperframes.js';

const evidence=process.env.CINEMATIC_PROP_ORIGIN_EVIDENCE??mkdtempSync(path.join(tmpdir(),'cinematic-prop-origin-'));
const config=ConfigSchema.parse({presentation:{mode:'story-cinematic',character_mode:'actors'},rendering:{final:{width:1280,height:720,fps:30}}});
const ref={kind:'narration' as const,segmentId:'cue',quote:'Linh lifts a notebook and places the notebook on the table.'};
const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const kinds=['stick-man','mini-robot'] as const;
const actions=['pick-place','carry'] as const;
beforeEach(t=>{
  if(!('mock' in t))throw new Error('TestContext required for fail-closed process guards');
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('FORBIDDEN_NATIVE_PROVIDER');});
  for(const method of ['validate','renderDraft','renderFinal','snapshot','snapshots'] as const)
    t.mock.method(HyperFramesEngine.prototype,method,async()=>{throw new Error('FORBIDDEN_BROWSER_RENDER');});
});
function retain(name:string,value:unknown){writeFileSync(path.join(evidence,name+'.json'),JSON.stringify(value,null,2));}
function fixture(kind:typeof kinds[number],action:typeof actions[number]){
  const actor=ActorDefinitionSchema.parse({id:'linh',name:'Linh',role:'sourced notebook placement',identity:'illustrative',kind,sourceRefs:[ref],appearance:{outline:'#17363F',shell:'#F7E4BD',screen:'#203742',accent:'#ECFFFF',badge:'#DAB26B',headScale:1,bodyScale:1,strokeWidth:6},costume:[]});
  const profile=actorProfile(actor),origin={x:770,y:380.000016},destination={x:800,y:420};
  const plan=PerformancePlanSchema.parse({version:22,compilerVersion:ANIMATION_VERSION,id:'origin-audit',leadCharacterId:profile.id,profileHash:profile.profileHash,kind,durationMs:6000,fps:30,stage:{width:1280,height:720,groundY:550},root:{x:700,y:550},scale:1,facing:'right',walks:action==='carry'?[{startMs:1400,endMs:3000,fromX:700,toX:730}]:[],expressions:[],gazes:[],props:[{id:'notebook-prop',origin,destination,gripOffset:{x:0,y:0}}],gestures:[{id:'place-notebook',propId:'notebook-prop',hand:'right',action,startMs:500,endMs:4500,contactMs:1000,releaseMs:4000,target:origin,destination,...(action==='carry'?{carryOffset:{x:50,y:35}}:{})}]});
  const shot=ShotSchema.parse({id:plan.id,startMs:1000,endMs:7000,beatIds:['beat'],sceneType:'character-scene',subject:'Sourced notebook placement',characters:[profile.id],visualDescription:ref.quote,camera:{shotSize:'wide',movement:'locked',angle:'eye-level'},recipeId:'host-mechanism-explainer',renderer:'hyperframes',narrationSegmentIds:['cue'],sourceRefs:[ref],host:{id:profile.id,profileVersion:1,rigHash:buildRig(profile).rigHash,presence:'beside-model',actions:[{type:'operate-model',hand:'right',startMs:1500,endMs:5500,contactMs:2000,narrationAnchor:'cue',target:{modelId:'origin-model',partId:'notebook',anchor:'center'}}]},visualization:{type:'summary',modelId:'origin-model',provenance:'visualization',fidelity:'conceptual',parts:[{id:'notebook',label:'notebook',kind:'object',x:.6015625,y:.5277778,width:.078125,height:.0277778,sourceRefs:[ref]}],relations:[],events:[{type:'highlight',targetId:'notebook',contactPartId:'notebook',startMs:2001,endMs:5500,motion:'none',contactRequired:true,narrationAnchor:'cue',sourceRefs:[ref]}]}});
  shot.cinematic={version:22,producer:DIRECTION_VERSION,shotId:shot.id,leadCharacterId:profile.id,motivation:ref.quote,attentionPartId:'notebook',sourceRefs:[ref],setting:'workshop',provenance:'illustration',models:stageModels(shot),propBindings:[{propId:'notebook-prop',partId:'notebook',role:'illustrative-model',sourceRefs:[ref]}],actorScene:{primary:actor,speakingSegmentIds:[],continuity:'cut',supporting:[]},artDirection:{origin:'authored',brief:'Owned sourced notebook fixture with a reachable completed placement and visible physical floor.',useEnvironment:false,palette:{background:'#FFFFFF',surface:'#EEEEEE',ink:'#17363F',accent:'#DAB26B'},showHeading:false,layers:[],models:[]},continuity:{entry:{...plan.root},exit:{x:action==='carry'?730:700,y:550},facing:'right',carriedProps:[],models:[]},camera:{framing:'wide',movement:'locked',focus:'ensemble',anchor:{x:640,y:330},startScale:1,endScale:1,designIntent:'Keep the actor, notebook, hands and grounded feet visible.'},performance:plan};
  shot.cinematic.continuity.models=modelExitParts(shot).map(p=>({partId:p.id,x:p.x,y:p.y,width:p.width,height:p.height}));
  return {shot,profile,plan,part:shot.visualization!.parts[0]!,prop:plan.props[0]!,gesture:plan.gestures[0]!,owner:shot.host!.actions[0]!};
}
function next(value:number,steps:number){
  const bytes=new DataView(new ArrayBuffer(8));bytes.setFloat64(0,value);
  bytes.setBigUint64(0,bytes.getBigUint64(0)+BigInt(steps));return bytes.getFloat64(0);
}

for(const kind of kinds)for(const action of actions){
  test(`${kind}/${action}: actual native 5.68e-14px serialization difference passes sourced completed placement`,()=>{
    const f=fixture(kind,action),expected=f.part.y*720,error=f.prop.origin.y-expected;
    assert.equal(expected,380.00001599999996);assert.equal(error,2**-44);assert.notEqual(f.prop.origin.y,expected);
    assert.doesNotThrow(()=>validatePropBindings(f.shot));assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,config));
    const compiled=compilePerformance(f.plan,f.profile,silence);
    for(const ms of [1000,2000,3999.875,4000,4500]){
      const frame=samplePerformance(f.plan,f.profile,ms,silence);
      assert.doesNotMatch(JSON.stringify(frame),/NaN|Infinity/);
      assert.equal(frame.props[f.prop.id]!.attached,ms<4000);
      if(ms>=4000)assert.ok(Math.hypot(frame.props[f.prop.id]!.point.x-f.prop.destination!.x,frame.props[f.prop.id]!.point.y-f.prop.destination!.y)<1e-6);
    }
    retain(kind+'-'+action+'-native-roundtrip',{expected,origin:f.prop.origin,error,shot:f.shot,compiledReport:compiled.report});
  });
  for(const axis of ['x','y'] as const){
    for(const [name,steps,accepted] of [['exact',0,true],['one-ulp',1,true],['five-ulps',5,true],['seven-ulps',7,false]] as const)
      test(`${kind}/${action}: ${axis} ${name} stays a serialization comparison`,()=>{
        const f=fixture(kind,action),expected=f.part[axis]*(axis==='x'?1280:720);
        f.prop.origin[axis]=next(expected,steps);
        if(accepted)assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,config));
        else assert.throws(()=>validatePropBindings(f.shot),/world anchor/);
      });
    for(const delta of [1e-9,2e-6,10,-1e-9,-2e-6,-10])
      test(`${kind}/${action}: ${axis} genuine ${delta}px origin displacement rejects`,()=>{
        const f=fixture(kind,action);assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,config));
        f.prop.origin[axis]+=delta;
        assert.throws(()=>validatePropBindings(f.shot),/world anchor/);
        assert.throws(()=>validateCinematicShot(f.shot,f.profile,config),/world anchor/);
      });
  }
  for(const fault of ['source','bindingidentity','partidentity','attachment','carried','ownerhand','ownerclock','jointowner','contact','destination','grip','release','missingdestination','repeatedplacement','staletarget','actoridentity'] as const)
    test(`${kind}/${action}: serialization repair does not relax ${fault}`,()=>{
      const f=fixture(kind,action),c=f.shot.cinematic!;assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,config));
      if(fault==='source')c.propBindings[0]!.sourceRefs=[{...ref,quote:'Invented source.'}];
      if(fault==='bindingidentity')c.propBindings[0]!.propId='wrong';
      if(fault==='partidentity')c.propBindings[0]!.partId='wrong';
      if(fault==='attachment')f.prop.attachedTo='right-hand';
      if(fault==='carried')c.continuity.carriedProps=['notebook-prop'];
      if(fault==='ownerhand')f.owner.hand='left';
      if(fault==='ownerclock')f.owner.endMs--;
      if(fault==='jointowner')f.shot.host!.actions.push({...f.owner,hand:'left'});
      if(fault==='contact')f.owner.contactMs!++;
      if(fault==='destination')f.prop.destination!.x+=2e-6;
      if(fault==='grip')f.prop.gripOffset!.x=1;
      if(fault==='release')delete f.gesture.releaseMs;
      if(fault==='missingdestination')delete f.prop.destination;
      if(fault==='repeatedplacement')f.plan.gestures.push({...f.gesture,id:'repeat'});
      if(fault==='staletarget')f.shot.host!.actions.push({...f.owner,type:'point',contactMs:undefined,startMs:3000,endMs:5000});
      if(fault==='actoridentity')c.leadCharacterId='wrong';
      assert.throws(()=>validateCinematicShot(f.shot,f.profile,config),/source|pickup|binding|carried|placement|owner|anchor|destination|identity|hand|action|model/);
    });
}

test('retained completed native candidate supplements origin arithmetic without accepting a film',t=>{
  const file=process.env.CINEMATIC_PROP_ORIGIN_CANDIDATE;
  if(!file){t.skip('Retained native candidate supplemental supplied only in independent evidence runs');return;}
  const candidate=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(candidate.status,'domain-rejected');assert.match(candidate.error,/prop target\/destination changed its world anchor/);
  const shot=candidate.response.shots.find((s:{id:string})=>s.id==='ch002.s006');
  const prop=shot.cinematic.performance.props[0],part=shot.visualization.parts.find((p:{id:string})=>p.id==='notebook');
  assert.equal(prop.origin.y,380.000016);assert.equal(part.y,.5277778);assert.equal(prop.origin.y-part.y*720,2**-44);
  assert.equal(prop.attachedTo,undefined);assert.deepEqual(shot.cinematic.continuity.carriedProps,[]);
  for(const kind of kinds)for(const action of actions){
    const f=fixture(kind,action);f.prop.origin={...prop.origin};
    assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,config));
  }
  retain('retained-native-origin',{shotId:shot.id,part,prop,error:prop.origin.y-part.y*720,fullCandidateAccepted:false});
});
