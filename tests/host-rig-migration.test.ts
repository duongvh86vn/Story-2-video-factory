import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ConfigSchema } from '../packages/core/config.js';
import { hash, writeJson } from '../packages/core/utils.js';
import { compileHost, loadHost } from '../packages/host/index.js';
import { buildRig, rigHashMatchesProfile, hostSvg, rigParts, poses } from '../packages/host/rig.js';
import { performanceSvg } from '../packages/animation/rig.js';
import { ModelRouter } from '../packages/models/registry.js';
import { temporary } from './support.js';

for(const kind of ['stick-man','mini-robot'] as const){
  for(const version of ['current','performance-2.2.7','performance-2.2.8','performance-2.2.9'] as const)test(`${kind}: canonical ${version} rig loads and compiler preserves exact artifact bytes`,async t=>{
    const root=await temporary(t),config=ConfigSchema.parse({host:{profile:`library/characters/${kind==='stick-man'?'STICK-MAN':'MINI-ROBOT'}.md`}}),router=new ModelRouter(config,root),{profile,rig}=await compileHost(root,config,router);
    const rigHash=version==='current'?rig.rigHash:hash({profile,svg:hostSvg(profile),performanceSvg:performanceSvg(profile),animationVersion:version,parts:rigParts(profile.kind),poses});
    assert.equal(rigHashMatchesProfile(profile,rigHash),true);assert.equal(rigHashMatchesProfile(profile,'unknown'),false);
    await writeJson(path.join(root,'work/host-rig.json'),{...rig,rigHash});await writeJson(path.join(root,rig.posePath),{profileId:profile.id,profileVersion:profile.version,rigHash,poses:rig.poses});
    const files=['work/host-profile.json','work/host-rig.json','work/host-compile-cache.json',rig.assetPath,rig.posePath,'previews/host-preview-sheet.png'];const before=await Promise.all(files.map(file=>fs.readFile(path.join(root,file))));
    assert.equal((await loadHost(root)).rig.rigHash,rigHash);assert.equal((await compileHost(root,config,router)).rig.rigHash,rigHash);
    for(const [i,file] of files.entries())assert.deepEqual(await fs.readFile(path.join(root,file)),before[i],file);
    assert.equal(buildRig(profile).rigHash,version==='current'?rigHash:rig.rigHash);
  });
}
for(const defect of ['profile','parts','viewBox','assetPath','posePath','pose metadata','compiler metadata','unknown hash','SVG','pose file'] as const)test(`canonical load rejects tampered ${defect}`,async t=>{
  const root=await temporary(t),config=ConfigSchema.parse({host:{profile:'library/characters/STICK-MAN.md'}}),{profile,rig}=await compileHost(root,config,new ModelRouter(config,root));
  if(defect==='profile'){profile.appearance.outline='#123456';await writeJson(path.join(root,'work/host-profile.json'),profile);}
  else if(defect==='SVG')await fs.appendFile(path.join(root,rig.assetPath),'<!-- changed -->');
  else if(defect==='pose file')await writeJson(path.join(root,rig.posePath),{profileId:profile.id,profileVersion:profile.version,rigHash:rig.rigHash,poses:{...rig.poses,idle:{...rig.poses.idle,rootX:17}}});
  else{
    if(defect==='parts')rig.parts[0]!.pivot.x+=1;
    if(defect==='viewBox')rig.viewBox[0]+=1;
    if(defect==='assetPath'){await fs.copyFile(path.join(root,rig.assetPath),path.join(root,'altered.svg'));rig.assetPath='altered.svg';}
    if(defect==='posePath'){await fs.copyFile(path.join(root,rig.posePath),path.join(root,'altered-poses.json'));rig.posePath='altered-poses.json';}
    if(defect==='pose metadata')rig.poses.idle!.rootX+=1;
    if(defect==='compiler metadata')rig.compilerVersion='forged';
    if(defect==='unknown hash')rig.rigHash='a'.repeat(64);
    await writeJson(path.join(root,'work/host-rig.json'),rig);
  }
  await assert.rejects(loadHost(root),/integrity mismatch|SVG\/poses changed/);
});
