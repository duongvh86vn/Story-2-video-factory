// DECLARED / NOT RUN. All schemas, fixtures, SVG/state/geometry callbacks and
// physical/render/film acceptance are delegated to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HEAD_FACE_FOLLOW_CANDIDATES} from '../packages/topics/head-face-candidates.js';
import {NativeHeadBankDefinitionSchema} from '../packages/animation/native-head-bank.js';
import {NativeHeadFaceSchema,nativeHeadEyeRegistrations,nativeHeadBrowRegistrations,nativeHeadFaceSvg,nativeHeadFaceState,nativeHeadFaceMatrixError} from '../packages/animation/native-head-face.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function contract(){
  const entry=HEAD_FACE_FOLLOW_CANDIDATES.find(c=>c.actor==='lila'&&c.view==='three-quarter-right')!;
  const original=NativeHeadBankDefinitionSchema.parse(JSON.parse(await fs.readFile(path.join(repo,entry.file),'utf8')));
  const raw=structuredClone(original),cell=raw.cells[0]!,face=cell.face!;
  raw.version='native-head-bank-7';face.version='native-head-face-3';
  // Deliberately copied declaration for isolated protocol tests. Its copied
  // two-eye artwork is NOT evidence that an eye is optically hidden, and this
  // object is never written/registered as an actual performer or QA release.
  const hidden={visibility:'occluded' as const,reason:'head-profile' as const,contour:structuredClone(face.protectedContours[0]!)};
  face.eyes['screen-left']=hidden;face.emotions!.brows['screen-left']=structuredClone(hidden);
  const eye=face.eyes['screen-right'];assert.ok(!('visibility' in eye));
  cell.eyeTarget={...eye.center};
  return {original,raw,face,hidden};
}

test('legacy banks/face data round-trip unchanged and retain both visible eye/brow channels',async()=>{
  const {original}=await contract(),before=structuredClone(original);
  assert.deepEqual(NativeHeadBankDefinitionSchema.parse(original),before);
  const face=original.cells[0]!.face!;
  assert.deepEqual(nativeHeadEyeRegistrations(face).map(([side])=>side),['screen-left','screen-right']);
  assert.deepEqual(nativeHeadBrowRegistrations(face).map(([side])=>side),['screen-left','screen-right']);
});

test('explicit face3 creates no hidden glyph, skin strip, lid, brow or matrix channel',async()=>{
  const {face}=await contract(),parsed=NativeHeadFaceSchema.parse(face),before=structuredClone(parsed),prefix='own-profile';
  const svg=nativeHeadFaceSvg(parsed,'own-png',prefix,undefined,'own-png');
  assert.doesNotMatch(svg,/own-profile-screen-left|own-profile-brow-screen-left/);
  assert.match(svg,/own-profile-screen-right-glyph/);assert.match(svg,/own-profile-brow-screen-right-glyph/);
  const inputs=[0,.5,1].map(u=>({aperture:u,blink:u,look:{x:u,y:0}}));
  const states=inputs.map(input=>nativeHeadFaceState(parsed,input,prefix));
  for(const state of states)assert.ok(Object.keys(state.face).every(key=>!key.includes('screen-left')));
  assert.equal(nativeHeadFaceMatrixError(parsed,prefix,states[0]!.face,states[0]!.face,states[0]!.face,.5),0);
  assert.deepEqual(parsed,before);
});

test('legacy occlusion, missing/both-hidden features, invented geometry and foreign contour evidence reject',async()=>{
  const {face,hidden}=await contract();
  for(const version of ['native-head-face-1','native-head-face-2'])assert.equal(NativeHeadFaceSchema.safeParse({...face,version}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{'screen-left':hidden}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{'screen-left':hidden,'screen-right':hidden},emotions:{...face.emotions,brows:{'screen-left':hidden,'screen-right':hidden}}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{...face.eyes,'screen-left':{...hidden,center:{x:0,y:0}}}}).success,false);
  const different={...hidden,contour:hidden.contour.map(p=>({...p,x:p.x+.25}))};
  assert.equal(NativeHeadFaceSchema.safeParse({...face,eyes:{...face.eyes,'screen-left':different},emotions:{...face.emotions,brows:{...face.emotions!.brows,'screen-left':different}}}).success,false);
  assert.equal(NativeHeadFaceSchema.safeParse({...face,emotions:{...face.emotions,brows:{...face.emotions!.brows,'screen-left':{...hidden,reason:'hair'}}}}).success,false);
});

test('bank7 requires face3, its visible eye anchor, complete own source/emotions/paint and false production flags',async()=>{
  const {original,raw}=await contract(),before=structuredClone(raw),parsed=NativeHeadBankDefinitionSchema.parse(raw);
  assert.deepEqual(parsed,before);assert.equal(parsed.productionReady,false);assert.equal(parsed.approved,false);
  assert.equal(parsed.motionVerified,false);
  for(const version of ['native-head-bank-3','native-head-bank-5','native-head-bank-6'])assert.equal(NativeHeadBankDefinitionSchema.safeParse({...raw,version}).success,false);
  const oldFace=structuredClone(raw);oldFace.cells[0]!.face=original.cells[0]!.face!;
  assert.equal(NativeHeadBankDefinitionSchema.safeParse(oldFace).success,false);
  const badAnchor=structuredClone(raw);badAnchor.cells[0]!.eyeTarget.x+=1;
  assert.equal(NativeHeadBankDefinitionSchema.safeParse(badAnchor).success,false);
  assert.equal(NativeHeadBankDefinitionSchema.safeParse({...raw,productionReady:true}).success,false);
});

// Bounded coder proposal via 9router; parent reviewed source, callbacks NOT RUN.
test('face3 rejects a visible-eye erase strip covering the exact protected hidden contour',async()=>{
  const {face,hidden}=await contract();
  assert.equal(NativeHeadFaceSchema.safeParse(face).success,true);
  const xs=hidden.contour.map(p=>p.x),ys=hidden.contour.map(p=>p.y);
  const contaminated=structuredClone(face);
  const visible=contaminated.eyes['screen-right'];assert.ok(!('visibility' in visible));
  visible.strip={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  assert.equal(NativeHeadFaceSchema.safeParse(contaminated).success,false);
});

test('with screen-left hidden, screen-right brow tilt uses its slot-specific direction',async()=>{
  const {face}=await contract(),registered=nativeHeadBrowRegistrations(face);
  assert.deepEqual(registered.map(([side])=>side),['screen-right']);
  const brow=registered[0]![1];assert.ok(brow.tiltDeg>0);
  const prefix='slot-direction',state=nativeHeadFaceState(face,{aperture:0,blink:0,look:{x:0,y:0},emotion:{brow:0,tilt:.5,smile:1,frown:0,round:0,closure:0}},prefix);
  const transform=state.face[prefix+'-brow-screen-right-glyph']?.attr?.transform;
  assert.ok(transform);
  const matrix=transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number);assert.ok(matrix);assert.equal(matrix.length,6);
  const angle=.5*brow.tiltDeg*Math.PI/180;
  assert.ok(Math.abs(matrix[1]!-Math.sin(angle))<1e-5);
  assert.ok(Math.abs(matrix[2]!+Math.sin(angle))<1e-5);
});
