import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {emptyTimestampMotion,validateTimestampMotion} from '../packages/image-motion/timestamp-definition.js';
import {prepareTimestampMotion} from '../packages/image-motion/timestamp-prepare.js';
import {hash} from '../packages/core/utils.js';

test('closed motion definition rejects empty, executable, non-finite and out-of-image data',()=>{
  const d={...emptyTimestampMotion(),rotations:[{id:'wheel',cx:40,cy:40,rx:10,ry:12,periodMs:1200,direction:1}]};
  assert.equal(validateTimestampMotion(d,100,100).rotations.length,1);
  assert.throws(()=>validateTimestampMotion(emptyTimestampMotion(),100,100),/ít nhất/);
  assert.throws(()=>validateTimestampMotion({...d,script:'alert(1)'},100,100));
  assert.throws(()=>validateTimestampMotion({...d,rotations:[{...d.rotations[0],cx:NaN}]},100,100));
  assert.throws(()=>validateTimestampMotion({...d,rotations:[{...d.rotations[0],rx:70}]},100,100),/nằm trong/);
  assert.throws(()=>validateTimestampMotion({...d,rotations:[d.rotations[0],d.rotations[0]]},100,100));
});
test('preparing source parts retains pixels/clock and reuses cutout layers after angle changes',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'timestamp-parts-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const source=path.join(root,'source.png'),png=await sharp(Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="#a4cff1"/><path d="M30 30L55 55L65 45" stroke="black" stroke-width="6" fill="none"/></svg>')).png().toBuffer();await fs.writeFile(source,png);
  const definition={...emptyTimestampMotion(),parts:[{id:'arm',polygon:[[20,20],[75,20],[75,65],[20,65]],pivot:{x:30,y:30},angle:-15}]},clock={startMs:1250,endMs:2400,startFrame:75,endFrame:144,fps:60};
  const a=await prepareTimestampMotion(source,path.join(root,'first'),definition,clock,path.join(root,'cache'));
  const b=await prepareTimestampMotion(source,path.join(root,'second'),{...definition,parts:[{...definition.parts[0],angle:20}]},clock,path.join(root,'cache'));
  assert.equal(a.layerCacheKey,b.layerCacheKey);assert.equal(a.assetHashes['assets/arm.png'],b.assetHashes['assets/arm.png']);assert.equal(a.sourceHash,hash(png));assert.equal(hash(await fs.readFile(source)),hash(png));
  assert.equal(a.demo.scenes[0]!.durationMs,1150);assert.equal(a.demo.fps,60);assert.notDeepEqual(a.demo.scenes[0]!.parts,b.demo.scenes[0]!.parts);
  const repeated=await prepareTimestampMotion(source,path.join(root,'first'),definition,clock,path.join(root,'cache'));assert.equal(repeated.assetHashes['assets/arm.png'],a.assetHashes['assets/arm.png']);
  await assert.rejects(prepareTimestampMotion(source,path.join(root,'third'),{...definition,background:{mode:'clean-plate',cleanPlateId:'0'.repeat(64)}},clock,path.join(root,'cache')),/nền sạch/);
});
