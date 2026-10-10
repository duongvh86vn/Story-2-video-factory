import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {NativeHeadBankDefinitionSchema,nativeHeadBank} from '../packages/animation/native-head-bank.js';
import {HEAD_FACE_MODES,headFaceCandidatesForMode} from '../packages/topics/head-face-candidates.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(repo,file),'utf8'));

test('all selected face modes pass strict edit/protected-paint and complete motion-hull validation',async()=>{
  let count=0;
  for(const mode of HEAD_FACE_MODES)for(const entry of headFaceCandidatesForMode(mode)){
    const definition=NativeHeadBankDefinitionSchema.parse(await read(entry.file)),bank=nativeHeadBank(definition);
    assert.equal(bank.id,entry.id);assert.equal(bank.actor,entry.actor);
    assert.equal(hash(await fs.readFile(path.join(repo,bank.source.file))),bank.source.sha256);
    assert.equal(bank.approved,false);assert.equal(bank.motionVerified,false);assert.equal(bank.productionReady,false);
    count++;
  }
  assert.equal(count,18);
});

test('registration repair keeps source artwork, facial anchors, motion ranges and original invalid versions',async()=>{
  let corrected=0;
  for(const mode of HEAD_FACE_MODES)for(const entry of headFaceCandidatesForMode(mode)){
    if(!entry.id.endsWith('-v2'))continue;
    const previous=await read(entry.file.replace(/-v2.json$/,'-v1.json')),current=await read(entry.file);
    assert.equal(NativeHeadBankDefinitionSchema.safeParse(previous).success,false,'old invalid data must remain rejected');
    const preserved=structuredClone(current);
    preserved.id=previous.id;
    const face=preserved.cells[0].face,old=previous.cells[0].face;
    for(const side of ['screen-left','screen-right']){
      face.eyes[side].region=old.eyes[side].region;
      if(face.emotions){
        face.emotions.brows[side].region=old.emotions.brows[side].region;
        face.emotions.brows[side].strip=old.emotions.brows[side].strip;
      }
    }
    assert.deepEqual(preserved,previous,'only explicit skin regions and sampling strips may change');
    corrected++;
  }
  assert.equal(corrected,13);
});
