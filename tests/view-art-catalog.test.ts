// DECLARED / NOT RUN by implementation. All filesystem/API fixtures stay in callbacks.
import assert from 'node:assert/strict';
import test from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {findRepoRoot} from '../packages/core/config.js';
import {hash} from '../packages/core/utils.js';
import {REQUIRED_BODY_VIEWS,ViewArtStudySchema,viewArtCoverage,viewArtInventory,viewArtImage} from '../packages/topics/view-art-workbench.js';
import {temporary} from './support.js';

test('all seven requested native directions have source candidates and never count those as production ready',async()=>{
  const inventory=await viewArtInventory(await findRepoRoot()),coverage=viewArtCoverage(inventory);
  assert.deepEqual(REQUIRED_BODY_VIEWS,['front','three-quarter-left','three-quarter-right','left','right','back-three-quarter-left','back-three-quarter-right']);
  assert.equal(coverage.requiredSlots,14);assert.equal(coverage.productionReadySlots,0);assert.equal(coverage.productionReady,false);
  assert.equal(coverage.sourceCandidateSlots,14);assert.deepEqual(coverage.missingSources,[]);
  for(const actor of ['lila','karo']){
    const sources=coverage.actors.find(a=>a.actor===actor)!;
    assert.equal(sources.views.find(v=>v.view==='right')!.sourceCandidatePresent,true);
    assert.ok(sources.views.every(v=>v.sourceCandidatePresent));
    assert.ok(sources.views.every(v=>!v.artApproved&&!v.registeredForProduction));
  }
  assert.equal(coverage.actors[0]!.views.find(v=>v.view==='right')!.file,'lila-right-v3.png');
  assert.equal(coverage.actors[0]!.views.find(v=>v.view==='back-three-quarter-left')!.file,'lila-back-three-quarter-left-v2.png');
  assert.equal(coverage.actors[1]!.views.find(v=>v.view==='back-three-quarter-right')!.file,'karo-back-three-quarter-right-v2.png');
  // A partial catalog must still expose absent directions rather than filling
  // them from the actor's primary image or another source view.
  const partial=viewArtCoverage(inventory.filter(s=>s.view!=='front'));
  assert.equal(partial.sourceCandidateSlots,12);
  assert.deepEqual(partial.missingSources,[{actor:'lila',view:'front'},{actor:'karo',view:'front'}]);
  assert.deepEqual(coverage.availableBanks,[]);
});

test('view source records reject foreign primary, self edit, wrong requested direction and actor aliases',async()=>{
  const repo=await findRepoRoot(),raw=JSON.parse(await fs.readFile(path.join(repo,'library/topics/prehistoric-life/body-views/lila-right-v2.json'),'utf8'));
  assert.equal(ViewArtStudySchema.parse(raw).provenance!.measuredYawDeg,null);
  assert.throws(()=>ViewArtStudySchema.parse({...raw,actor:'karo'}));
  assert.throws(()=>ViewArtStudySchema.parse({...raw,provenance:{...raw.provenance,requestedView:'left'}}));
  const primary=structuredClone(raw);primary.provenance.referenceImages.find((r:{role:string})=>r.role==='primary').file='docs/topics/assets/reference-karo-full.png';
  assert.throws(()=>ViewArtStudySchema.parse(primary));
  const self=structuredClone(raw);self.provenance.referenceImages.find((r:{role:string})=>r.role==='edit-target').file='library/topics/prehistoric-life/body-views/'+raw.file;
  assert.throws(()=>ViewArtStudySchema.parse(self));
  assert.throws(()=>ViewArtStudySchema.parse({...raw,productionReady:true}));
});

test('latest requested source selection keeps exact order beyond safe integer versions',()=>{
  const row=(version:string)=>({actor:'lila' as const,view:'right' as const,version,file:`lila-right-${version}.png`,sha256:'a'.repeat(64),
    model:'ordering-fixture',width:1,height:1,status:'candidate',actualTransparency:false,approved:false as const,productionReady:false as const,registered:false as const,reviewNotes:[]});
  const older=row('v9007199254740992'),newer=row('v9007199254740993');
  const source=(rows:ReturnType<typeof row>[])=>viewArtCoverage(rows).actors[0]!.views.find(v=>v.view==='right')!.file;
  assert.equal(source([older,newer]),newer.file);assert.equal(source([newer,older]),newer.file);
  const longest=row('v1'+'0'.repeat(100)),preceding=row('v'+'9'.repeat(100));
  assert.equal(source([preceding,longest]),longest.file);
});

test('new RGBA sources retain exact bytes and stale primary/edit references block delivery',async t=>{
  const repo=await findRepoRoot(),root=await temporary(t),folder='library/topics/prehistoric-life/body-views';
  const source=JSON.parse(await fs.readFile(path.join(repo,folder,'lila-right-v2.json'),'utf8'));
  for(const file of [folder+'/lila-right-v2.png',folder+'/lila-right-v2.json',...source.provenance.referenceImages.map((r:{file:string})=>r.file)]){
    const target=path.join(root,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(repo,file),target);
  }
  const delivered=await viewArtImage(root,'lila-right-v2.png');
  assert.equal(delivered.type,'image/png');assert.equal(hash(delivered.bytes),source.sha256);
  const edit=path.join(root,source.provenance.referenceImages.find((r:{role:string})=>r.role==='edit-target').file);
  await fs.appendFile(edit,Buffer.from('changed'));
  await assert.rejects(()=>viewArtImage(root,'lila-right-v2.png'),/source changed/);
});

test('legacy JPEG artwork named PNG receives the actual image MIME and still checks canvas',async t=>{
  const repo=await findRepoRoot(),root=await temporary(t),folder=path.join(root,'library/topics/prehistoric-life/body-views');
  // A held source screenshot supplies genuine JPEG bytes; this fixture tests
  // MIME/header integrity only and does not establish a character identity.
  const bytes=await fs.readFile(path.join(repo,'docs/topics/reviews/ai-pose-gallery-run-v1.png')),metadata=await sharp(bytes).metadata();
  assert.equal(metadata.format,'jpeg');await fs.mkdir(folder,{recursive:true});
  const row={actor:'lila',view:'right',version:'v9',file:'lila-right-v9.png',sha256:hash(bytes),model:'legacy-fixture',width:metadata.width,height:metadata.height,
    status:'candidate',actualTransparency:false,approved:false,productionReady:false,registered:false};
  await fs.writeFile(path.join(folder,row.file),bytes);await fs.writeFile(path.join(folder,'lila-right-v9.json'),JSON.stringify(row));
  const asset=await viewArtImage(root,row.file);assert.equal(asset.type,'image/jpeg');assert.deepEqual(asset.bytes,bytes);
  await fs.writeFile(path.join(folder,'lila-right-v9.json'),JSON.stringify({...row,width:row.width!+1}));
  await assert.rejects(()=>viewArtImage(root,row.file),/canvas differs/);
});

test('linked view source folders cannot expose artwork even within the repository',async t=>{
  const repo=await findRepoRoot(),root=await temporary(t),parent=path.join(root,'library/topics/prehistoric-life');
  await fs.mkdir(parent,{recursive:true});
  try{await fs.symlink(path.join(repo,'library/topics/prehistoric-life/body-views'),path.join(parent,'body-views'),process.platform==='win32'?'junction':'dir');}
  catch(error){if(['EPERM','EACCES'].includes((error as NodeJS.ErrnoException).code??'')){t.skip('OS disallowed the test link');return;}throw error;}
  await assert.rejects(()=>viewArtInventory(root),/Linked\/invalid/);
});
