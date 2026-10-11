import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {writePackedBinary,readPackedBinary,PACKED_BINARY_DECODER_SOURCE} from '../packages/scenes/packed-binary.js';

const plain=(v:unknown)=>JSON.parse(JSON.stringify(v));
const browser=(bytes:Uint8Array)=>runInNewContext('('+PACKED_BINARY_DECODER_SOURCE+')(bytes)',{bytes,TextDecoder,DataView});
test('server and fixed browser reader retain Unicode, integer boundaries, doubles and nested literal values',()=>{
 const values=[null,false,true,0,127,128,16384,-1,-128,Number.MAX_SAFE_INTEGER,-Number.MAX_SAFE_INTEGER,Number.MIN_VALUE,Math.PI,1e100,'Tiếng Việt 日本語 한국어 👋','',[],[0,-1,1,123456789012345,-123456789012345],{a:{b:['x',true,null,1/3]}}];
 for(const v of values){const bytes=writePackedBinary(v);assert.deepEqual(plain(readPackedBinary(bytes)),plain(v));assert.deepEqual(plain(browser(bytes)),plain(v));}
 const special=Object.fromEntries([['__proto__',{polluted:true}],['constructor','data']]),decoded=readPackedBinary(writePackedBinary(special)) as Record<string,unknown>;
 assert.equal(Object.getPrototypeOf(decoded),null);assert.equal(Object.hasOwn(decoded,'__proto__'),true);assert.equal(({} as Record<string,unknown>).polluted,undefined);
});

test('both parsers reject truncated, overflowing, noncanonical and malformed binary, with no payload code execution',()=>{
 const nan=Buffer.alloc(9);nan[0]=5;nan.writeDoubleLE(NaN,1);
 const invalid=[[],[99],[3],[3,128,0],[3,255,255,255,255,255,255,255,255,1],[4,0],[6,2,65],[6,1,255],[7,127],[9,1],[0,0],[8,1,0,0],[8,2,6,1,97,0,6,1,97,0],...Array.from({length:8},(_,i)=>[5,...Array(i).fill(0)]),[...nan],Array.from({length:82},()=>[7,1]).flat().concat(0)];
 for(const v of invalid){const bytes=Uint8Array.from(v);assert.throws(()=>readPackedBinary(bytes),JSON.stringify(v));assert.throws(()=>browser(bytes),JSON.stringify(v));}
 for(const v of [NaN,Infinity,undefined,()=>1,'\ud800'])assert.throws(()=>writePackedBinary(v));
 const valid=writePackedBinary({v:2,a:[1,-2,'three']});for(let i=0;i<valid.length;i++){assert.throws(()=>readPackedBinary(valid.subarray(0,i)));assert.throws(()=>browser(valid.subarray(0,i)));}
});
