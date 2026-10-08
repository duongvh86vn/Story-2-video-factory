// NOT RUN: hash compatibility declarations for the user's test model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {jsonSha256} from '../packages/core/json-sha256.js';
test('shared schema JSON fingerprint matches native SHA-256 for UTF-8 and block boundaries',()=>{
  const values:unknown[]=[undefined,null,{},[],0,true,'', 'Lila — Karo / tiếng Việt 日本語 한국어 😀', {version:1,cells:[{x:.125,y:-45}]},'\ud800'];
  for(const n of [1,53,54,55,56,62,63,64,65,119,120,127,128,129,100000])values.push({text:'x'.repeat(n)});
  for(const value of values)assert.equal(jsonSha256(value),createHash('sha256').update(JSON.stringify(value)??'undefined').digest('hex'));
});
