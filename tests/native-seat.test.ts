// All callbacks, fixtures, samplers, renderer and media checks NOT RUN by the
// implementation agent. Runtime/motion/art acceptance belongs to user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {HostProfileSchema} from '../packages/host/schemas.js';
import {ActorDefinitionSchema} from '../packages/actors/schemas.js';
import {bodyCalibrationPlan,bodyWorkbench,type BodyAction} from '../packages/topics/body-workbench.js';
import {REGISTERED_BODY_VIEWS,registeredBodyView} from '../packages/animation/body-view-art.js';
import {NativeSeatCorrespondenceSchema,nativeSeatRegistration,nativeSeatMinimumArea} from '../packages/animation/native-seat-registration.js';
import {BODY_VIEW_SEAT_SELECTION,registeredNativeSeat,nativeSeatState,nativeSeatMatrixError,nativeSeatSvg,nativeSeatAssets,nativeSeatDescription} from '../packages/animation/body-view-seat.js';
import {samplePerformance,validatePerformance,compilePerformance} from '../packages/animation/compiler.js';
import {performanceSvg,rigMetrics} from '../packages/animation/rig.js';
import {legGeometry} from '../packages/animation/body-geometry.js';
import {performanceScene} from '../packages/animation/scene.js';
import {namespaceRigSvg} from '../packages/animation/svg-namespace.js';
import {clothTriangleArea} from '../packages/animation/view-cloth-geometry.js';
import {cameraHostBounds} from '../packages/director/camera.js';
import {pathCoordinates} from '../packages/animation/ink-limb.js';
import {referenceHeadAssets} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {secureSceneFiles,validateSceneFiles} from '../packages/scenes/security.js';
import {creativeActingBrief} from '../packages/director/acting-brief.js';
import {ConfigSchema} from '../packages/core/config.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {schemaLibrary} from '../library/schemas/index.js';
import type {Shot} from '../packages/core/schemas.js';

const silence={method:'segment-draft' as const,windowMs:20,intervals:[]};
const values=(text:string)=>text.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi)!.map(Number);
function candidate(actor:'lila'|'karo',view:typeof REGISTERED_BODY_VIEWS[number],action:BodyAction=view==='three-quarter-left'?'sit-walk-left':'sit-walk-right'){
  return bodyCalibrationPlan(actor,action,'happy',undefined,view,'cutout','silent','native','rest','native','registered-locomotion-v1','rigid',BODY_VIEW_SEAT_SELECTION);
}

test('seating is explicit in host/cast/schema/brief/context; native defaults and production gates persist',()=>{
  const {profile,plan}=candidate('karo','three-quarter-right');assert.equal(profile.appearance.bodySeat,BODY_VIEW_SEAT_SELECTION);
  assert.doesNotThrow(()=>HostProfileSchema.parse(profile));assert.doesNotThrow(()=>ActorDefinitionSchema.parse({id:'karo',name:'Karo',kind:'stick-man',role:'story participant',identity:'illustrative',sourceRefs:[{kind:'narration',segmentId:'cue',quote:'Karo sits.'}],appearance:profile.appearance}));
  for(const patch of [{bodyMotion:undefined},{artworkVersion:'forest-body-1'},{bodyView:undefined},{characterVariant:undefined},{sourceColour:'original-rgb-v2'}])assert.equal(HostProfileSchema.safeParse({...profile,appearance:{...profile.appearance,...patch}}).success,false);
  const unselected={...profile,appearance:{...profile.appearance,bodySeat:undefined}};assert.throws(()=>validatePerformance(plan,unselected),/needs-view-seat/);
  assert.throws(()=>bodyCalibrationPlan('karo','sit-right','happy',undefined,'three-quarter-right','cutout','silent','native','rest','native','registered-locomotion-v1'),/needs-view-seat/);
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);assert.equal(topicContext(config)!.bodyMotion.nativeSeatedSurface.productionReady,false);
  assert.equal(creativeActingBrief([], {mode:'script',durationMs:1,segments:[],words:[]},profile).nativeSeating.selected,true);assert.equal(schemaLibrary['native-seat-correspondence'],NativeSeatCorrespondenceSchema);
});

test('registration binds primary identity, independent native view, atlas/tile and pinned waist without mutable public alias',()=>{
  const geometry=nativeSeatRegistration(),before=hash(geometry);assert.equal(NativeSeatCorrespondenceSchema.safeParse(geometry).success,true);
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=registeredBodyView(profile),{c}=registeredNativeSeat(profile,source);
    assert.equal(c.standing.sha256,source.sha256);assert.equal(c.outline.rest.length,50);assert.ok(c.pieces.length<=400);
    for(const piece of c.pieces){assert.ok(clothTriangleArea(piece.rest)>0);assert.ok(clothTriangleArea(piece.seat)>0);assert.ok(nativeSeatMinimumArea(piece.rest,piece.target)>0);}
    assert.deepEqual(c.outline.rest.slice(0,9),c.outline.target.slice(0,9));
    assert.throws(()=>registeredNativeSeat(profile,{...source,sha256:'0'.repeat(64)}),/registration differs/);assert.throws(()=>registeredNativeSeat(profile,{...source,pelvis:{...source.pelvis,x:source.pelvis.x+1}}),/registration differs/);
  }
  geometry.actors.karo.views['three-quarter-left'].pieces[0]!.target[0].x++;assert.equal(hash(nativeSeatRegistration()),before);
  const changed=nativeSeatRegistration();changed.actors.lila.views['three-quarter-left'].tileId=changed.actors.lila.views['three-quarter-right'].tileId;assert.equal(NativeSeatCorrespondenceSchema.safeParse(changed).success,false);
});

test('invalid UV, flipped mesh, changed waist, atlas and false acceptance claims fail registration',()=>{
  for(const issue of ['UV','area','waist','atlas','approval'] as const){
    const data=nativeSeatRegistration(),c=data.actors.karo.views['three-quarter-left'];
    if(issue==='UV')c.pieces[0]!.seat[0].x=-1;
    if(issue==='area')[c.pieces[0]!.target[1],c.pieces[0]!.target[2]]=[c.pieces[0]!.target[2],c.pieces[0]!.target[1]];
    if(issue==='waist')c.outline.target[0]!.y++;
    if(issue==='atlas')data.actors.karo.material.sha256='0'.repeat(64);
    if(issue==='approval')Object.assign(data,{approved:true});
    assert.equal(NativeSeatCorrespondenceSchema.safeParse(data).success,false,issue);
  }
});

test('public seat metadata and registered geometry cannot mutate the active surface or fingerprint',()=>{
  const {profile}=candidate('karo','three-quarter-right'),source=registeredBodyView(profile),binding=registeredNativeSeat(profile,source),before=nativeSeatState(profile,source,{progress:.4,thighAngles:{left:0,right:0}}),fingerprint=nativeSeatDescription.fingerprint;
  assert.throws(()=>{binding.c.standing.waist++;},TypeError);assert.throws(()=>{binding.actor.material.width++;},TypeError);
  const metadata=nativeSeatDescription.bindings.karo!;assert.throws(()=>{metadata.material.width++;},TypeError);
  assert.equal(nativeSeatDescription.fingerprint,fingerprint);assert.deepEqual(nativeSeatState(profile,source,{progress:.4,thighAngles:{left:0,right:0}}),before);
});

test('standing/transfer/seated surfaces share pinned opaque contour and preserve positive areas during bounded thigh follow',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=registeredBodyView(profile),registration=registeredNativeSeat(profile,source),before=hash({profile,source});
    for(const progress of [0,.1,.38,.5,.9,1])for(const thighAngles of [{left:0,right:0},{left:80,right:-80},{left:-80,right:80}]){
      const state=nativeSeatState(profile,source,{progress,thighAngles});assert.equal(state.face['view-seat-material-rest']!.opacity,1);assert.equal(state.face['view-seat-material-seat']!.opacity,progress);
      assert.deepEqual(state.outline.slice(0,9),registration.c.outline.rest.slice(0,9));assert.ok(state.pieces.every(p=>p.areaRatio>=.25-1e-8));
      assert.equal(state.paths['view-seat-fill'],state.paths['view-seat-contour']);assert.equal(state.paths['view-seat-inset'],state.paths['view-seat-contour']);assert.doesNotMatch(state.paths['view-seat-edge']!,/Z$/);assert.equal(state.paths['view-seat-interior-edge'],state.paths['view-seat-edge']);
      assert.equal(nativeSeatMatrixError(profile,source,state.face,state.face,state.face,.41),0);
    }
    assert.equal(hash({profile,source}),before);for(const progress of [NaN,Infinity,-.1,1.1])assert.throws(()=>nativeSeatState(profile,source,{progress,thighAngles:{left:0,right:0}}),/invalid support/);
    assert.throws(()=>nativeSeatState(profile,source,{progress:0,thighAngles:{left:NaN,right:0}}),/invalid support/);
  }
});

test('seated texture and surface interpolate on the same geometry; missing baked transform cannot bypass error budget',()=>{
  const {profile}=candidate('lila','three-quarter-right'),source=registeredBodyView(profile),control={left:0,right:0},a=nativeSeatState(profile,source,{progress:0,thighAngles:control}),b=nativeSeatState(profile,source,{progress:1,thighAngles:control}),mid=nativeSeatState(profile,source,{progress:.37,thighAngles:control});
  assert.ok(nativeSeatMatrixError(profile,source,a.face,b.face,mid.face,.37)<5e-4);assert.throws(()=>nativeSeatMatrixError(profile,source,{},b.face,mid.face,.37),/missing baked/);
});

test('SVG uses one contour/edge and native torso, preserves resources, isolated namespaces and unselected rig',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile}=candidate(actor,view),source=registeredBodyView(profile),art=nativeSeatSvg(profile,source,(file,sha)=>'assets/rigs/'+sha+'.png'),svg=performanceSvg(profile,'scene'),scoped=namespaceRigSvg(svg,'seat-'+actor+'-');
    assert.equal([...svg.matchAll(/id="view-seat-edge"/g)].length,1);assert.match(art.artwork,/view-seat-upper-clip/);assert.doesNotMatch(art.artwork,/view-cloth-triangle|scale\(-|http/);
    assert.match(scoped,new RegExp('id="seat-'+actor+'-view-seat-edge"'));const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    assert.match(art.defs,/id="view-seat-inset"[^>]*fill="white" stroke="none"/);
    const resources=[...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)];assert.ok(resources.some(r=>r.sha256===nativeSeatAssets(profile.appearance)[0]!.sha256));
    const old=bodyCalibrationPlan(actor,'rest','happy',undefined,view,'cutout','silent','native','rest','native','registered-locomotion-v1').profile;
    assert.match(performanceSvg(old,'scene'),/view-cloth-triangle-11/);assert.deepEqual(nativeSeatAssets(old.appearance),[]);assert.notEqual(profile.profileHash,old.profileHash);
  }
});

test('physical sit/hold/rise/walk keeps sole/contact and fixed XYZ bones through random and reverse seeks in all views',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view),m=rigMetrics(profile),check=(time:number)=>{
      const frame=samplePerformance(plan,profile,time,silence),chest=values(frame.transforms.chest!),pelvis={x:chest[0]!,y:chest[1]!};
      for(const side of ['left','right'] as const){
        if(frame.stance[side])assert.ok(Math.abs(frame.feet[side].y-plan.stage.groundY)<1e-6);else assert.ok(frame.feet[side].y<=plan.stage.groundY+1e-6);
        const g=legGeometry(m,pelvis,frame.feet[side],side,plan.scale,profile.appearance.bodyScale,chest[2]);
        const lower=values(frame.transforms['leg-'+side+'-lower']!),joint={x:lower[0]!,y:lower[1]!},depth=frame.legProjection![side].kneeDepth;
        assert.ok(Math.abs(Math.hypot(joint.x-g.hip.x,joint.y-g.hip.y,depth)-g.bones.upper)<.02);assert.ok(Math.abs(Math.hypot(g.ankle.x-joint.x,g.ankle.y-joint.y,depth)-g.bones.lower)<.02);
      }
      assert.ok(frame.paths?.['view-seat-contour']);if(time>=1800&&time<=3000){assert.equal(frame.seatContact?.supportId,'calibration-log');assert.ok(frame.seatContact!.errorPx<.01);assert.equal(frame.face['view-seat-material-seat']!.opacity,1);}
      if(time<=300||time>=4500)assert.equal(frame.face['view-seat-material-seat']!.opacity,0);return frame;
    };
    const times=[0,299.99,300,615,1200,1799.99,1800,2491,3000,3751,4500,4600,5712,6600,7200],baseline=new Map(times.map(t=>[t,check(t)]));
    for(const t of [2491,615,7200,3751,...times.slice().reverse()])assert.deepEqual(check(t),baseline.get(t));
  }
});

test('selected support direction, missing supports, short transition and walking before rise remain blockers',()=>{
  const {profile,plan}=candidate('karo','three-quarter-right');
  for(const issue of ['facing','missing','short','walk'] as const){const p=structuredClone(plan);
    if(issue==='facing')p.supports![0]!.facing='left';if(issue==='missing')p.supports=[];if(issue==='short')p.postures![0]!.endMs=800;
    if(issue==='walk')p.walks=[{startMs:2000,endMs:2800,fromX:210,toX:215}];assert.throws(()=>validatePerformance(p,profile));
  }
  const c=structuredClone(plan);c.supports!.push({...c.supports![0]!,id:'unused-opposite-seat',facing:'left',center:{x:350,y:200}});assert.doesNotThrow(()=>validatePerformance(c,profile));
});

test('camera covers current shared cloth contour at calibrated scale and preserves subtitle clearance obligation',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view),c=registeredBodyView(profile),bounds=cameraHostBounds(plan,profile);
    for(const t of [0,1200,2500,3750,5000]){const frame=samplePerformance(plan,profile,t,silence),transform=values(frame.transforms.chest!),a=transform[2]!*Math.PI/180,k=transform[3]!*c.bodyScale,points=pathCoordinates(frame.paths!['view-seat-contour']!);
      for(let i=0;i<points.length;i+=2){const dx=(points[i]!-c.pelvis.x)*k,dy=(points[i+1]!-c.pelvis.y)*k,x=transform[0]!+dx*Math.cos(a)-dy*Math.sin(a),y=transform[1]!+dx*Math.sin(a)+dy*Math.cos(a);assert.ok(x>=bounds.body.left-.01&&x<=bounds.body.right+.01);assert.ok(y>=bounds.body.top-.01&&y<=bounds.body.bottom+.01);}
    }
    assert.ok(bounds.body.bottom<=plan.stage.height); // Final canonical framing/subtitles still require the later full tracer.
  }
});

test('workbench preserves explicit seat mode in form and action/time links; invalid combinations fail',()=>{
  const html=bodyWorkbench('sit-walk-left',2500,'happy','three-quarter-left','cutout','silent','native','rest','native','registered-locomotion-v1','registered-secondary-v1',BODY_VIEW_SEAT_SELECTION);
  assert.match(html,/name="seat"/);assert.match(html,/seat=registered-seated-v1/);assert.match(html,/secondary=registered-secondary-v1/);assert.match(html,/Chưa|chưa/);
  assert.throws(()=>bodyCalibrationPlan('lila','sit-left','happy',undefined,'source','cutout','silent','native','rest','native','registered-locomotion-v1','rigid',BODY_VIEW_SEAT_SELECTION),/native body view|native view/);
});

test('single-shot scene meets existing security/resources/2MB gate and compilation interpolation budget',()=>{
  for(const actor of ['lila','karo'] as const)for(const view of REGISTERED_BODY_VIEWS){
    const {profile,plan}=candidate(actor,view),scene=performanceScene(plan,profile,silence),result=scene.compiled;assert.ok(result.report.maxInterpolationGapPx<=.2);
    assert.equal(result.report.bodySeat!.motionVerified,false);assert.equal(result.report.bodySeat!.fingerprint,nativeSeatDescription.fingerprint);assert.ok(result.report.maxSeatContactErrorPx!<.01);
    const allowed=[...new Set([...referenceHeadAssets(profile.appearance),...referenceBodyAssets(profile.appearance)].map(r=>r.path))],secured=secureSceneFiles(scene.files);
    assert.ok(scene.files.files.reduce((bytes,f)=>bytes+Buffer.byteLength(f.content),0)<2_000_000,'baked seat stream must fit the scene gate; a large mesh must not raise the cap');
    assert.deepEqual(validateSceneFiles(secured,{id:plan.id,startMs:0,endMs:plan.durationMs} as Shot,2_000_000,allowed,plan.stage),[]);
  }
});
