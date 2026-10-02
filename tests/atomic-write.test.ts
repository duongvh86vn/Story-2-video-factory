import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { temporary } from './support.js';
import { writeAtomic } from '../packages/core/utils.js';

test('atomic writes survive a transient Windows rename lock without deleting the previous state',async t=>{
  const root=await temporary(t),file=path.join(root,'state.json');
  await fs.writeFile(file,'previous state');
  const original=fs.rename;let calls=0;
  t.mock.method(fs,'rename',async (...args:Parameters<typeof fs.rename>)=>{
    if(++calls<=2){
      assert.equal(await fs.readFile(file,'utf8'),'previous state');
      throw Object.assign(new Error('transient Windows sharing lock'),{code:'EPERM'});
    }
    return original(...args);
  });
  await writeAtomic(file,'next complete state');
  assert.equal(calls,3);assert.equal(await fs.readFile(file,'utf8'),'next complete state');
  assert.deepEqual(await fs.readdir(root),['state.json']);
});

test('concurrent writes use different temporary files and leave a complete JSON record',async t=>{
  const root=await temporary(t),file=path.join(root,'state.json');
  const records=Array.from({length:8},(_,id)=>({id,payload:String(id).repeat(8192)}));
  await Promise.all(records.map(record=>writeAtomic(file,JSON.stringify(record))));
  const actual=JSON.parse(await fs.readFile(file,'utf8'));
  assert.deepEqual(actual,records[actual.id]);
  assert.deepEqual(await fs.readdir(root),['state.json']);
});

test('a permanent rename error propagates and cleans only its own temporary file',async t=>{
  const root=await temporary(t),file=path.join(root,'state.json');
  await fs.writeFile(file,'previous state');let calls=0;
  t.mock.method(fs,'rename',async()=>{calls++;throw Object.assign(new Error('device error'),{code:'EIO'});});
  await assert.rejects(writeAtomic(file,'uncommitted state'),{code:'EIO'});
  assert.equal(calls,1);assert.equal(await fs.readFile(file,'utf8'),'previous state');
  assert.deepEqual(await fs.readdir(root),['state.json']);
});
