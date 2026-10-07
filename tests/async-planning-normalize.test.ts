// Runtime delegated. Test setup and assertions execute only inside callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {temporary} from './support.js';
import {ConfigSchema} from '../packages/core/config.js';
import {planWithValidation} from '../packages/story/request.js';
import type {ModelRouter} from '../packages/models/registry.js';
import {walk} from '../packages/core/utils.js';

test('async domain gate resolves before accepted receipt is written, not as an empty Promise object',async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({retry:{structured_output:0}});
  const router={structured:async()=>({value:'source'})} as unknown as ModelRouter;
  const result=await planWithValidation(root,config,router,'storyboard','async-sprite',{system:'Test',prompt:'Test',context:{}},z.object({value:z.string()}),async value=>{await Promise.resolve();return {bound:value.value};});
  assert.deepEqual(result,{bound:'source'});
  const file=(await walk(path.join(root,'work/attempts/async-sprite'))).find(file=>file.endsWith('.json'))!;
  const receipt=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(receipt.status,'accepted');assert.deepEqual(receipt.result,result);
});

test('async rejection is journaled and enters domain repair instead of being accepted early',async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({retry:{structured_output:1}});let calls=0;
  const router={structured:async()=>({value:++calls})} as unknown as ModelRouter;
  const result=await planWithValidation(root,config,router,'storyboard','async-sprite',{system:'Test',prompt:'Test',context:{}},z.object({value:z.number()}),async value=>{await Promise.resolve();if(value.value===1)throw new Error('Invalid sprite descriptor');return value;});
  assert.equal(result.value,2);assert.equal(calls,2);
  const receipts=await Promise.all((await walk(path.join(root,'work/attempts/async-sprite'))).filter(file=>file.endsWith('.json')).sort().map(async file=>JSON.parse(await fs.readFile(file,'utf8'))));
  assert.deepEqual(receipts.map(receipt=>receipt.status),['domain-rejected','accepted']);
});
