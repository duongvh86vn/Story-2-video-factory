// Declarations only. Runtime execution belongs to the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {solveChain} from '../packages/animation/compiler.js';
import {seatedRestArm} from '../packages/animation/seated-rest-arm.js';

const shoulder={x:0,y:0},standing={x:65,y:0},lap={x:0,y:65};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('an inactive seat preserves the exact standing solve without evaluating its lap target',()=>{
  let calls=0;
  const solve:typeof solveChain=(...args)=>{calls++;return solveChain(...args);};
  const expected=solveChain(shoulder,standing,80,20,1);
  assert.deepEqual(seatedRestArm(shoulder,standing,{x:NaN,y:Infinity},80,20,0,1,solve),expected);
  assert.equal(calls,1);
  // Legacy standing output includes the original unreachable diagnostic.
  assert.deepEqual(seatedRestArm(shoulder,{x:200,y:0},lap,80,20,0,1,solve),solveChain(shoulder,{x:200,y:0},80,20,1));
});

test('angular seat transfer stays on fixed bones where a straight wrist path crosses the inner annulus',()=>{
  assert.equal(solveChain(shoulder,{x:32.5,y:32.5},80,20,1).reachable,false);
  for(const pole of [-1,1])for(const weight of [0,.1,.25,.5,.75,.9,1]){
    const chain=seatedRestArm(shoulder,standing,lap,80,20,weight,pole,solveChain);
    near(distance(shoulder,chain.joint),80);near(distance(chain.joint,chain.end),20);
    assert.equal(chain.reachable,true);
    assert.ok(distance(shoulder,chain.end)>60);
    if(weight===0)assert.deepEqual(chain,solveChain(shoulder,standing,80,20,pole));
    if(weight===1){const expected=solveChain(shoulder,lap,80,20,pole);assert.deepEqual(chain.end,expected.end);assert.deepEqual(chain.joint,expected.joint);}
    // SVG chain angles are offset by -90; directions must add it back.
    near(chain.joint.x,80*Math.cos((chain.upper+90)*Math.PI/180));
    near(chain.joint.y,80*Math.sin((chain.upper+90)*Math.PI/180));
    const flexion=Math.atan2(Math.sin((chain.lower-chain.upper)*Math.PI/180),Math.cos((chain.lower-chain.upper)*Math.PI/180));
    assert.ok(flexion*pole>0);
  }
});

test('seat arm transfer uses the supplied weight once and remains deterministic under reverse seeks and scaling',()=>{
  for(const pole of [-1,1]){
    const baseline=seatedRestArm(shoulder,standing,lap,80,20,.3,pole,solveChain);
    for(const weight of [1,.8,.3,.1,0,.3]){
      const frame=seatedRestArm(shoulder,standing,lap,80,20,weight,pole,solveChain);
      if(weight===.3)assert.deepEqual(frame,baseline);
    }
    const translated=seatedRestArm({x:20,y:40},{x:150,y:40},{x:20,y:170},160,40,.3,pole,solveChain);
    near(translated.joint.x,20+2*baseline.joint.x);near(translated.joint.y,40+2*baseline.joint.y);
    near(translated.end.x,20+2*baseline.end.x);near(translated.end.y,40+2*baseline.end.y);
    const rest=solveChain(shoulder,standing,80,20,pole),active=solveChain(shoulder,lap,80,20,pole);
    near(baseline.upper,rest.upper+(active.upper-rest.upper)*.3);
  }
});

test('unreachable, invalid and unsupported seat keyposes require authored correction without clamping the targets',()=>{
  for(const weight of [-.1,1.1,NaN])assert.throws(()=>seatedRestArm(shoulder,standing,lap,80,20,weight,1,solveChain),/needs-seated-arm-pose/);
  assert.throws(()=>seatedRestArm(shoulder,standing,lap,80,20,.5,0,solveChain),/authored elbow branch/);
  assert.throws(()=>seatedRestArm(shoulder,standing,{x:10,y:0},80,20,.5,1,solveChain),/cannot be reached/);
  assert.throws(()=>seatedRestArm(shoulder,{x:200,y:0},lap,80,20,.5,1,solveChain),/cannot be reached/);
  const angle=91*Math.PI/180;
  assert.throws(()=>seatedRestArm(shoulder,standing,{x:65*Math.cos(angle),y:65*Math.sin(angle)},80,20,.5,1,solveChain),/90deg corridor/);
});

test('wrapped endpoint directions retain one continuous numeric branch for baked arm rotations',()=>{
  const target=(angle:number)=>({x:65*Math.cos(angle*Math.PI/180),y:65*Math.sin(angle*Math.PI/180)});
  for(const pole of [-1,1]){
    const rest=target(170),seated=target(190),weights=[0,.0001,.25,.5,.75,.9999,1];
    const frames=weights.map(weight=>seatedRestArm(shoulder,rest,seated,80,20,weight,pole,solveChain));
    for(let i=1;i<frames.length;i++)for(const segment of ['upper','lower'] as const)
      assert.ok(Math.abs(frames[i]![segment]-frames[i-1]![segment])<21);
    assert.deepEqual(frames.at(-1)!.end,solveChain(shoulder,seated,80,20,pole).end);
    for(const frame of frames){near(distance(shoulder,frame.joint),80);near(distance(frame.joint,frame.end),20);}
  }
});
