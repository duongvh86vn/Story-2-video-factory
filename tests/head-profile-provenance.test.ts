// DECLARED / NOT RUN by implementation agent. Provenance checks do not accept
// identity, joints, motion, narration or final video quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {hash} from '../packages/core/utils.js';
import {HeadCellPromptSchema,readHeadCellSource,type HeadCellPrompt} from '../packages/topics/head-cell-art.js';
import {HEAD_PROFILE_FOLDER,readHeadProfileArtifact,validateGeminiHeadProvenance,GeminiHeadProvenanceSchema} from '../packages/topics/head-profile-provenance.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stem='lila-profile-right-v1';
type Prompt=Extract<HeadCellPrompt,{version:'native-head-cell-prompt-2'}>;
async function input(root:string):Promise<Prompt>{
  const generationFile=HEAD_PROFILE_FOLDER+'/'+stem+'.json',matteFile=HEAD_PROFILE_FOLDER+'/'+stem+'-matte-v1.json';
  const generationBytes=await fs.readFile(path.join(root,generationFile)),matteBytes=await fs.readFile(path.join(root,matteFile));
  const g=JSON.parse(generationBytes.toString()),m=JSON.parse(matteBytes.toString());
  const p=HeadCellPromptSchema.parse({version:'native-head-cell-prompt-2',actor:'lila',provider:'9router-gemini',model:g.model,prompt:g.prompt,referenceImages:[{file:g.referencePath,sha256:g.referenceSha256,role:'primary-character-identity'}],generatedOriginal:HEAD_PROFILE_FOLDER+'/'+m.output.file,requestedYawDeg:g.requestedYawDeg,
    provenance:{generation:{file:generationFile,sha256:hash(generationBytes)},matte:{file:matteFile,sha256:hash(matteBytes)}},scope:'static-art-authoring-only',approved:false,registered:false,productionReady:false,runtimeVerified:false});
  assert.equal(p.version,'native-head-cell-prompt-2');if(p.version!=='native-head-cell-prompt-2')throw Error('Wrong fixture version');return p;
}
async function withCopy(run:(root:string,p:Prompt)=>Promise<void>){
  const parent=path.resolve(os.tmpdir()),root=await fs.mkdtemp(path.join(parent,'gemini-provenance-'));
  try{
    const p=await input(repo),g=JSON.parse((await fs.readFile(path.join(repo,p.provenance.generation.file))).toString()),m=JSON.parse((await fs.readFile(path.join(repo,p.provenance.matte!.file))).toString());
    const files=[p.provenance.generation.file,p.provenance.matte!.file,g.referencePath,HEAD_PROFILE_FOLDER+'/'+g.image,HEAD_PROFILE_FOLDER+'/'+m.output.file,HEAD_PROFILE_FOLDER+'/'+m.mask.file];
    for(const file of files){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(path.join(repo,file),path.join(root,file));}
    await run(root,await input(root));
  }finally{assert.equal(path.dirname(path.resolve(root)),parent);assert.ok(path.basename(root).startsWith('gemini-provenance-'));await fs.rm(root,{recursive:true,force:true});}
}
async function rebound(root:string,p:Prompt,kind:'output'|'mask',bytes:Buffer){
  const descriptor=p.provenance.matte!,receiptPath=path.join(root,descriptor.file),m=JSON.parse((await fs.readFile(receiptPath)).toString());
  await fs.writeFile(path.join(root,HEAD_PROFILE_FOLDER,m[kind].file),bytes);m[kind].sha256=hash(bytes);
  const updated=Buffer.from(JSON.stringify(m,null,2)+'\n');await fs.writeFile(receiptPath,updated);descriptor.sha256=hash(updated);
}

test('JPEG generation plus local matte returns exact PNG while retaining unreviewed intent',async()=>{
  const p=await input(repo),bytes=await validateGeminiHeadProvenance(repo,p);
  assert.ok(bytes.equals(await fs.readFile(path.join(repo,p.generatedOriginal))));
  assert.equal(p.requestedYawDeg,90);for(const key of ['approved','registered','productionReady','runtimeVerified'] as const)assert.equal(p[key],false);
});
test('legacy prompt remains unchanged and new provenance refuses relabel/path/extra-field injection',async()=>{
  const old=JSON.parse((await fs.readFile(path.join(repo,'library/topics/prehistoric-life/head-cells/karo-head-source-angle-v1-prompt.json'))).toString());
  assert.deepEqual(HeadCellPromptSchema.parse(old),old);const p=await input(repo);
  assert.equal(HeadCellPromptSchema.safeParse({...p,version:'native-head-cell-prompt-1',provider:'builtin-imagegen'}).success,false);
  assert.equal(HeadCellPromptSchema.safeParse({...p,actor:'karo'}).success,false);
  assert.equal(GeminiHeadProvenanceSchema.safeParse({...p.provenance,generation:{...p.provenance.generation,extra:true}}).success,false);
  for(const file of ['../outside.json',p.provenance.generation.file+'\n',p.provenance.generation.file.replaceAll('/','\\')])await assert.rejects(readHeadProfileArtifact(repo,file),/Disallowed/);
  for(const limit of [NaN,Infinity,0,40*1024*1024+1]){
    await assert.rejects(readHeadProfileArtifact(repo,p.provenance.generation.file,limit),/read bounds/);
    await assert.rejects(readHeadCellSource(repo,'docs/topics/assets/reference-lila-full.png',limit),/read bound/);
  }
});
test('prompt, null yaw, and unrelated generation cannot change the source intent',async()=>{
  const p=await input(repo);
  await assert.rejects(validateGeminiHeadProvenance(repo,{...p,prompt:p.prompt+' changed'}),/request differs/);
  await assert.rejects(validateGeminiHeadProvenance(repo,{...p,requestedYawDeg:null}),/request differs/);
  await assert.rejects(validateGeminiHeadProvenance(repo,{...p,provenance:{...p.provenance,generation:{...p.provenance.generation,file:p.provenance.generation.file.replace('lila','karo')}}}),/actor\/path/);
});
test('receipt and primary mutations invalidate immutable source binding',async()=>{
  await withCopy(async(root,p)=>{await fs.appendFile(path.join(root,p.provenance.generation.file),' ');await assert.rejects(validateGeminiHeadProvenance(root,p),/Generation receipt hash/);});
  await withCopy(async(root,p)=>{await fs.appendFile(path.join(root,p.referenceImages[0]!.file),'x');await assert.rejects(validateGeminiHeadProvenance(root,p),/Primary reference changed/);});
});
test('rebinding PNG and receipt hashes cannot hide changed RGB',async()=>{
  await withCopy(async(root,p)=>{
    const {data,info}=await sharp(await fs.readFile(path.join(root,p.generatedOriginal))).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let i=0;while(i<data.length&&data[i+3]!<8)i+=4;assert.ok(i<data.length);data[i]=data[i]!^1;
    await rebound(root,p,'output',await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer());
    await assert.rejects(validateGeminiHeadProvenance(root,p),/changed source RGB/);
  });
});
test('rebinding a grayscale mask hash cannot hide alpha disagreement',async()=>{
  await withCopy(async(root,p)=>{
    const m=JSON.parse((await fs.readFile(path.join(root,p.provenance.matte!.file))).toString());
    const {data,info}=await sharp(await fs.readFile(path.join(root,HEAD_PROFILE_FOLDER,m.mask.file))).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
    data[0]=data[1]=data[2]=255-data[0]!;
    await rebound(root,p,'mask',await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer());
    await assert.rejects(validateGeminiHeadProvenance(root,p),/Mask grey pixels/);
  });
});
