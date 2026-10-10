// Declarations only; runtime execution and PASS/FAIL belong to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSceneScript,SCENE_SECURITY_VERSION} from '../packages/scenes/security.js';

const source=(value:string)=>`const tl=gsap.timeline({paused:true});tl.set('[data-composition-id="seat"] #edge',{attr:{d:${JSON.stringify(value)}}},0);window.__timelines=window.__timelines||{};window.__timelines["seat"]=tl;`;

test('scene guard accepts bounded open garment contours and closed polygons',()=>{
  assert.equal(SCENE_SECURITY_VERSION,6);
  for(const d of ['M0 0L10 10L20 0','M0 0L10 10L20 0Z','M-1.5 2e1L0 -3L1 4',
    'M0 0C1 1 2 2 3 3C2 2 1 1 0 0Z',
    'M0 0 C1 1 2 2 3 3 C2 2 1 1 0 0',
    'M0 0'+Array.from({length:95},(_,i)=>'L'+i+' '+(i%4)).join('')])assert.deepEqual(validateSceneScript(source(d),'seat'),[],d);
});

test('open path permission retains finite, vertex, byte and literal-data bounds',()=>{
  for(const d of ['M0 0L10 10','M0 0C1 1 2 2 3 3Z','M0 0C1 1 2 2 3 3C2 2 1 1 100001 0Z','M0 0'+('C1 1 2 2 3 3'.repeat(10))+'Z','M0 0L10 10LNaN 0','M0 0L10 10L1e999 0','M0 0L10 10L100001 0',
    'M0 0L10 10L20 0 M30 0L40 0L50 0','M0 0L10 10L20 0url(https://example.org)',
    'M0 0'+Array.from({length:96},(_,i)=>'L'+i+' 0').join(''),
    'M0 0'+Array.from({length:95},()=>`L${'0'.repeat(50)} 0`).join('')])assert.ok(validateSceneScript(source(d),'seat').length,d.slice(0,80));
  for(const value of ['{attr:{d:window.path}}','{attr:{href:"https://example.org"}}','{attr:{d:"M0 0L1 1L2 2"},onUpdate:()=>{}}']){
    const script=`const tl=gsap.timeline({paused:true});tl.set('[data-composition-id="seat"] #edge',${value},0);window.__timelines=window.__timelines||{};window.__timelines["seat"]=tl;`;
    assert.ok(validateSceneScript(script,'seat').length);
  }
});
