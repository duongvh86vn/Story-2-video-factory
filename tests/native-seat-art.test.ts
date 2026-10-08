// User's model executes these declarations. All callbacks/fixtures NOT RUN here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import {NativeSeatMaterialSchema,nativeSeatArtDescription,nativeSeatMaterialCandidates,nativeSeatArtInventory} from '../packages/topics/native-seat-art.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-art.js';
import {requireTopicProductionReady,topicContext} from '../packages/topics/prehistoric-life.js';
import {schemaLibrary} from '../library/schemas/index.js';
import {temporary} from './support.js';

const repo=fileURLToPath(new URL('../',import.meta.url));
async function fixture(t:test.TestContext){
  const directory=await temporary(t),records=nativeSeatMaterialCandidates(),files=new Set(records.flatMap(record=>[record.file,record.promptFile,...record.references.map(ref=>ref.file)]));
  for(const file of files){const target=path.join(directory,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(repo,file),target);}
  return {directory,records};
}

test('native material records retain independent actors/views and never select or approve a pose',()=>{
  const records=nativeSeatMaterialCandidates();assert.deepEqual(records.map(r=>r.actor),['lila','karo']);assert.equal(schemaLibrary['native-seat-material'],NativeSeatMaterialSchema);
  for(const record of records){assert.equal(NativeSeatMaterialSchema.safeParse(record).success,true);assert.deepEqual(record.tiles.map(t=>[t.view,t.facing]),[['three-quarter-right','right'],['three-quarter-left','left']]);assert.notEqual(record.tiles[0]!.visibleBounds.width,record.tiles[1]!.visibleBounds.width);assert.equal(record.approved,false);assert.equal(record.registered,false);assert.equal(record.productionReady,false);assert.equal(record.motionVerified,false);}
  assert.equal(nativeSeatArtDescription.selection,null);assert.equal(nativeSeatArtDescription.tileCount,4);
  const config=ConfigSchema.parse({topic:{id:'prehistoric-life'}});assert.equal(topicContext(config)!.bodyMotion.nativeSeatedMaterials.fingerprint,nativeSeatArtDescription.fingerprint);assert.throws(()=>requireTopicProductionReady(config),/needs-art-direction/);
});

test('candidate records are detached from internal registration and approval state',()=>{
  const first=nativeSeatMaterialCandidates(),before=hash(first);first[0]!.tiles[0]!.visibleBounds.x++;first[0]!.references[0]!.sha256='0'.repeat(64);first[0]!.limits.length=0;
  assert.equal(hash(nativeSeatMaterialCandidates()),before);assert.equal(nativeSeatArtDescription.approved,false);
});

test('schema rejects approval flags, crossed actor ownership and image path substitution',()=>{
  const source=nativeSeatMaterialCandidates()[0]!;
  for(const patch of [{approved:true},{registered:true},{productionReady:true},{motionVerified:true},{file:'../external.png'},{promptFile:'other.json'},{actor:'karo'},{shape:undefined},{unknown:true}])assert.equal(NativeSeatMaterialSchema.safeParse({...source,...patch}).success,false);
  const duplicate=structuredClone(source);duplicate.tiles[1]=duplicate.tiles[0]!;assert.equal(NativeSeatMaterialSchema.safeParse(duplicate).success,false);
  const wrongFacing=structuredClone(source);wrongFacing.tiles[0]!.facing='left';assert.equal(NativeSeatMaterialSchema.safeParse(wrongFacing).success,false);
});

test('schema rejects cropped tiles, impossible alpha counts and stale native standing references',()=>{
  const source=nativeSeatMaterialCandidates()[1]!;
  for(const patch of [{transparentPixels:0},{opaquePixels:1},{width:source.width+1},{alphaBands:source.alphaBands.slice(1)}])assert.equal(NativeSeatMaterialSchema.safeParse({...source,...patch}).success,false);
  const cropped=structuredClone(source);cropped.tiles[0]!.region.width--;assert.equal(NativeSeatMaterialSchema.safeParse(cropped).success,false);
  const stale=structuredClone(source);stale.references[1]!.sha256='0'.repeat(64);assert.equal(NativeSeatMaterialSchema.safeParse(stale).success,false);
  const swapped=structuredClone(source);swapped.references.reverse();assert.equal(NativeSeatMaterialSchema.safeParse(swapped).success,false);
  assert.equal(source.references[1]!.sha256,bodyViewRegistrations.karo['three-quarter-right'].sha256);
});

test('static inventory verifies exact bytes, alpha/tile bounds and prompt provenance without motion approval',async t=>{
  const {directory,records}=await fixture(t),inventory=await nativeSeatArtInventory(directory);assert.equal(inventory.length,2);
  for(const [i,entry] of inventory.entries()){assert.equal(entry.sha256,records[i]!.sha256);assert.equal(entry.productionAllowed,false);assert.equal(entry.registered,false);assert.equal(entry.promptSha256,hash(await fs.readFile(path.join(directory,records[i]!.promptFile))));assert.ok(entry.transparentPixels>0);assert.ok(entry.alphaBands[6]!.pixels>entry.opaquePixels);}
});

test('altered or missing PNG fails static inventory before it can be used as a material',async t=>{
  const {directory,records}=await fixture(t),file=path.join(directory,records[0]!.file),bytes=await fs.readFile(file);bytes[0]=bytes[0]!^1;await fs.writeFile(file,bytes);
  await assert.rejects(nativeSeatArtInventory(directory),/Native seat material changed/);
  await fs.unlink(file);await assert.rejects(nativeSeatArtInventory(directory),/ENOENT/);
});

test('modified primary or construction reference invalidates the dependent folds',async t=>{
  const {directory,records}=await fixture(t),reference=records[0]!.references[0]!,file=path.join(directory,reference.file),bytes=await fs.readFile(file);await fs.writeFile(file,Buffer.concat([bytes,Buffer.from('changed')]));
  await assert.rejects(nativeSeatArtInventory(directory),/Native seat reference changed/);
  await fs.copyFile(path.join(repo,reference.file),file);const construction=records[1]!.references[3]!;await fs.writeFile(path.join(directory,construction.file),Buffer.from('wrong actor material'));
  await assert.rejects(nativeSeatArtInventory(directory),/Native seat reference changed/);
});

test('prompt reference or approval mismatch cannot be turned into material registration',async t=>{
  const {directory,records}=await fixture(t),file=path.join(directory,records[1]!.promptFile),source=JSON.parse(await fs.readFile(file,'utf8'));
  for(const patch of [{approved:true},{registered:true},{productionReady:true},{runtimeVerified:true},{provider:'different-provider'},{referenceImages:[]}]){await fs.writeFile(file,JSON.stringify({...source,...patch}));await assert.rejects(nativeSeatArtInventory(directory),/Native seat prompt provenance differs/);}
});
