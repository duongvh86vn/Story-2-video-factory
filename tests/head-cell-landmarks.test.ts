// DECLARED ONLY, NOT RUN. Source-only manual geometry, not pose/video acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {HeadCellMaterialSchema} from '../packages/topics/head-cell-art.js';
import {HeadCellDraftSchema,HeadCellSourceBindingSchema,headCellDraft,headCellSourceBinding,checkHeadCellDraft,checkBoundHeadCellDraft,type HeadCellDraft} from '../packages/topics/head-cell-landmarks.js';
function material(){
  const alphaHistogram=Array<number>(256).fill(0);alphaHistogram[0]=5100;alphaHistogram[128]=900;alphaHistogram[255]=4000;
  return HeadCellMaterialSchema.parse({version:'native-head-cell-material-1',actor:'lila',file:'lila-head-simple-v1.png',sha256:'a'.repeat(64),
    promptFile:'library/topics/prehistoric-life/head-cells/lila-head-simple-v1-prompt.json',promptSha256:'b'.repeat(64),
    references:[{file:'docs/topics/assets/reference-lila-full.png',sha256:'c'.repeat(64),role:'primary-character-identity'}],
    width:100,height:100,hasAlpha:true,alphaThreshold:8,transparentPixels:5100,visiblePixels:4900,opaquePixels:4000,partialPixels:900,edgePixels:0,
    alphaHistogram,pixelSha256:'d'.repeat(64),visibleBounds:{x:10,y:10,width:70,height:70},requestedYawDeg:8,yawMeasured:false,findings:['Synthetic source contract only'],
    status:'unreviewed-source-candidate',approved:false,registered:false,productionReady:false,motionVerified:false});
}
function box(x:number,y:number,width:number,height:number){return [{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height}];}
function complete():HeadCellDraft{
  return {...headCellDraft(material()),crop:{x:0,y:0,width:100,height:100},skull:{x:20,y:10,width:60,height:65},
    neck:{x:50,y:82},neckTop:{x:50,y:72},chin:{x:50,y:68},nose:{x:50,y:40},mouth:{x:50,y:56},
    eyes:{'screen-left':{visible:true,center:{x:40,y:30}},'screen-right':{visible:true,center:{x:60,y:30}}},
    faceContour:box(25,15,50,55),seam:box(45,77,10,12),mouthContour:box(45,52,10,8),mouthEditMask:box(43,50,14,12),
    eyeEditMasks:{'screen-left':box(35,25,10,10),'screen-right':box(55,25,10,10)},protectedContours:[box(15,15,5,10)],
    yawDeg:0,pixelScale:1,ponytailSide:'anatomical-left',review:'candidate'};
}
test('blank measurements stay blank, requested yaw is never copied',()=>{
  const d=headCellDraft(material()),r=checkHeadCellDraft(d,material());
  assert.equal(d.yawDeg,undefined);assert.equal(d.crop,undefined);assert.equal(d.neck,undefined);assert.equal(r.landmarksComplete,false);assert.ok(r.pending.some(p=>p.reason.includes('yawDeg')));
});
test('exact binding rejects raw bytes, immutable record, actor/file and dimensions mismatch',()=>{
  const d=headCellDraft(material());
  for(const source of [{...d.source,sha256:'e'.repeat(64)},{...d.source,materialFingerprint:'f'.repeat(64)},{...d.source,file:'lila-head-other-v1.png'},{...d.source,width:99},{...d.source,actor:'karo'}])
    assert.throws(()=>checkHeadCellDraft({...d,source},material()));
  assert.throws(()=>checkBoundHeadCellDraft({source:{...d.source,sha256:'e'.repeat(64)},draft:d},material()),/source mismatch/);
  assert.throws(()=>checkBoundHeadCellDraft({source:d.source,draft:{...d,source:{...d.source,sha256:'e'.repeat(64)}}},material()),/source mismatch/);
});
test('strict paths/limits/false flags prevent unearned claims',()=>{
  const d=headCellDraft(material());
  assert.equal(HeadCellSourceBindingSchema.safeParse({...d.source,file:d.source.file+'\n'}).success,false);
  assert.equal(HeadCellSourceBindingSchema.safeParse({...d.source,width:8192,height:8192}).success,false);
  for(const flag of ['approved','registered','productionReady','motionVerified'])assert.equal(HeadCellDraftSchema.safeParse({...d,[flag]:true}).success,false);
  assert.equal(HeadCellDraftSchema.safeParse({...d,unearned:'accepted'}).success,false);
  for(const alteration of [{yawDeg:NaN},{pixelScale:Infinity},{pixelScale:0},{nose:{x:100,y:2}},{crop:{x:0,y:0,width:101,height:100}}])
    assert.throws(()=>checkHeadCellDraft({...d,...alteration},material()));
});
test('crop preserves all original paint and constrains every supplied point/polygon/eye mask',()=>{
  const d=complete();
  assert.throws(()=>checkHeadCellDraft({...d,crop:{x:11,y:10,width:69,height:70}},material()),/outside|truncates/);
  assert.throws(()=>checkHeadCellDraft({...headCellDraft(material()),crop:{x:20,y:20,width:40,height:40}},material()),/truncates/);
  for(const alteration of [{neck:{x:100,y:82}},{eyes:{'screen-left':{visible:true,center:{x:101,y:30}}}},{eyeEditMasks:{'screen-left':box(98,25,4,10)}}])
    assert.throws(()=>checkHeadCellDraft({...d,...alteration},material()));
});
test('eyes use screen order and explicit occlusion, never a fake invisible-eye mask',()=>{
  const d=complete();
  assert.throws(()=>checkHeadCellDraft({...d,eyes:{'screen-left':{visible:true,center:{x:60,y:30}},'screen-right':{visible:true,center:{x:40,y:30}}}},material()),/swapped/);
  assert.throws(()=>checkHeadCellDraft({...d,eyes:{'screen-left':{visible:false}}},material()));
  assert.throws(()=>checkHeadCellDraft({...d,eyes:{...d.eyes,'screen-left':{visible:false,occludedBy:'hair'}}},material()),/Occluded/);
  const r=checkHeadCellDraft({...d,eyes:{...d.eyes,'screen-left':{visible:false,occludedBy:'hair'}},eyeEditMasks:{'screen-right':d.eyeEditMasks!['screen-right']}},material());
  assert.equal(r.landmarksComplete,true);assert.equal(r.productionReady,false);
});
test('face points and neck socket are validated in their own geometry',()=>{
  const d=complete();assert.equal(checkHeadCellDraft(d,material()).landmarksComplete,true);
  assert.throws(()=>checkHeadCellDraft({...d,nose:{x:20,y:40}},material()),/Facial feature/);
  assert.throws(()=>checkHeadCellDraft({...d,neckTop:{x:50,y:83}},material()),/above/);
  assert.throws(()=>checkHeadCellDraft({...d,seam:box(10,10,10,10)},material()),/Socket/);
  assert.throws(()=>checkHeadCellDraft({...d,mouthEditMask:box(30,50,5,5)},material()),/Mouth/);
  assert.throws(()=>checkHeadCellDraft({...d,eyeEditMasks:{'screen-left':box(25,25,5,5)}},material()),/Eye/);
});
test('polygons reject crossing/touching/zero area/retraced edges and protected-paint overlap',()=>{
  const d=complete();
  for(const poly of [[{x:10,y:10},{x:20,y:20},{x:10,y:20},{x:20,y:10}],
    [{x:10,y:10},{x:20,y:10},{x:15,y:10},{x:15,y:20}],
    [{x:10,y:10},{x:20,y:10},{x:30,y:10}],
    [{x:10,y:10},{x:20,y:10},{x:20,y:10},{x:10,y:20}],
    [{x:10,y:10},{x:30,y:10},{x:30,y:30},{x:20,y:10},{x:10,y:30}]])
    assert.throws(()=>checkHeadCellDraft({...d,protectedContours:[poly]},material()),/Polygon/);
  assert.throws(()=>checkHeadCellDraft({...d,protectedContours:[box(46,53,2,2)]},material()),/protected paint/);
});
test('hair side is actor-owned and complete coordinates are still unaccepted art/motion',()=>{
  const d=complete();
  assert.throws(()=>checkHeadCellDraft({...d,ponytailSide:'not-applicable'},material()),/Lila/);
  const m=material(),karo=HeadCellMaterialSchema.parse({...m,actor:'karo',file:'karo-head-simple-v1.png',promptFile:m.promptFile.replace('lila','karo'),references:m.references.map(r=>({...r,file:r.file.replace('lila','karo')}))});
  assert.throws(()=>checkHeadCellDraft({...headCellDraft(karo),ponytailSide:'anatomical-left'},karo),/Karo/);
  const r=checkHeadCellDraft(d,material());
  assert.equal(r.pending.length,0);assert.equal(r.landmarksComplete,true);
  for(const flag of ['approved','registered','productionReady','motionVerified'] as const)assert.equal(r[flag],false);
  assert.ok(r.blockers.some(b=>b.includes('speech')));assert.equal(checkHeadCellDraft({...d,review:'needs-redraw'},material()).landmarksComplete,false);
});
