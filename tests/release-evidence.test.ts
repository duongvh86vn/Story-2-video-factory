import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import test,{type TestContext} from 'node:test';
import {StorySchema,NarrationSchema,type Review} from '../packages/core/schemas.js';
import {hash,writeJson} from '../packages/core/utils.js';
import {beginReviewEvidence,captureReviewSource,commitReviewEvidence,requireCurrentReview,requireCurrentPassingReview,recordFinalEvidence,requireCurrentFinalEvidence} from '../packages/review/evidence.js';
import {config,shot,temporary} from './support.js';

// Human-owned callbacks only. All resources below are byte markers, not art,
// captures, narration or video. No renderer, provider, geometry or media tool.
async function fixture(t:TestContext){
  const root=await temporary(t),settings=config(),board={shots:[shot()]};
  const story=StorySchema.parse({title:'Evidence boundary',story:'Two actors share a meal.'}),characters={characters:[]};
  const narration=NarrationSchema.parse({mode:'wav',durationMs:4000,audioPath:'input/original.wav',segments:[{id:'cue',startMs:0,endMs:4000,text:story.story}],words:[]});
  const bytes=Buffer.from('CONTROLLED SOURCE BYTES; NOT ART OR MEDIA');
  const assets={assets:[{id:'identity',type:'image' as const,path:'assets/actor.png',hash:hash(bytes),source:'user' as const,status:'approved' as const,shotIds:['shot001']}]};
  const files=['input/original.wav','work/voice/narrated.wav','assets/actor.png','scenes/index.html','scenes/master.js','scenes/shot001/scene.js','scenes/shot001/assets/actor.png','scenes/shot001/assets/font.woff2','previews/frame.png','previews/sheet.jpg'];
  for(const file of files){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),bytes);}
  for(const [name,value]of Object.entries({'story':story,'storyboard':board,'character-bible':characters,'asset-manifest':assets,'narration':narration,'voiced-narration':{...narration,audioPath:'work/voice/narrated.wav'},'beats':[],'voice-report':{status:'controlled-byte-fixture'}}))await writeJson(path.join(root,'work',name+'.json'),value);
  const sealPreview=async()=>writeJson(path.join(root,'previews/manifest.json'),{sourceInputHash:hash(await captureReviewSource(root,settings,board)),frames:[{path:'previews/frame.png'}],sheetHashes:{'previews/sheet.jpg':hash(await fs.readFile(path.join(root,'previews/sheet.jpg')))},global:'previews/sheet.jpg'});
  await sealPreview();
  const review:Review={pass:true,issues:[],mode:'rule-based',warnings:['Controlled byte evidence only; visual/motion acceptance NOT RUN.']};
  const accept=async(value=review)=>commitReviewEvidence(root,settings,board,await beginReviewEvidence(root,settings,board,{story,characters,assets}),value);
  const final=async()=>{
    await accept();const evidence=await requireCurrentPassingReview(root,settings,board);
    for(const file of ['work/rendered.mp4','output/final.mp4','output/final.srt','output/thumbnail.png']){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'SYNTHETIC FINAL BOUNDARY; NOT A VIDEO');}
    await recordFinalEvidence(root,settings,board,evidence);return evidence;
  };
  return {root,settings,board,story,characters,assets,review,sealPreview,accept,final};
}

test('review binds actual source, staged image/font/audio and preview bytes without approving film',async t=>{
  const f=await fixture(t);await f.accept();
  const evidence=await requireCurrentPassingReview(f.root,f.settings,f.board);
  for(const file of ['assets/actor.png','input/original.wav','work/voice/narrated.wav'])assert.ok(evidence.input.sourceFiles[file]);
  assert.ok(evidence.input.sceneFiles['scenes/shot001/assets/font.woff2']);
  assert.ok(evidence.input.previewFiles['previews/frame.png']);
  assert.equal(evidence.visualAcceptance,false);assert.equal(evidence.motionVerified,false);assert.equal(evidence.productionApproval,false);
  await fs.appendFile(path.join(f.root,'previews/frame.png'),'changed frame after review');
  await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/needs-current-review/);
});

test('a changed provider-wait revision cannot publish review or reuse an earlier PASS',async t=>{
  for(const file of ['assets/actor.png','scenes/shot001/assets/actor.png','scenes/shot001/assets/font.woff2','input/original.wav','work/voice/narrated.wav','scenes/shot001/scene.js','work/beats.json','work/voice-report.json','previews/frame.png','previews/sheet.jpg','work/storyboard.json'])await t.test(file,async sub=>{
    const f=await fixture(sub);await f.accept();const input=await beginReviewEvidence(f.root,f.settings,f.board);
    if(file==='work/storyboard.json'){const changed=structuredClone(f.board);changed.shots[0]!.subject='Different event';await writeJson(path.join(f.root,file),changed);}
    else await fs.appendFile(path.join(f.root,file),'changed during provider wait');
    await assert.rejects(commitReviewEvidence(f.root,f.settings,f.board,input,f.review),/needs-current-review/);
    const marker=JSON.parse(await fs.readFile(path.join(f.root,'work/review-evidence.json'),'utf8'));
    assert.notEqual(marker.status,'accepted');
    await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/needs-current-review/);
  });
});

test('legacy previews, mismatched canonical context and credential sources close before review',async t=>{
  await t.test('legacy preview has no complete-resource binding',async sub=>{
    const f=await fixture(sub),file=path.join(f.root,'previews/manifest.json'),manifest=JSON.parse(await fs.readFile(file,'utf8'));
    delete manifest.sourceInputHash;await writeJson(file,manifest);
    await assert.rejects(beginReviewEvidence(f.root,f.settings,f.board),/previews.*current complete scene resources/);
  });
  await t.test('passed source differs from canonical document',async sub=>{
    const f=await fixture(sub);
    await assert.rejects(beginReviewEvidence(f.root,f.settings,f.board,{story:{...f.story,story:'An invented scene.'},characters:f.characters,assets:f.assets}),/context differs/);
  });
  await t.test('a configured env file is not a narration source',async sub=>{
    const f=await fixture(sub);f.settings.input.source='.env';await fs.writeFile(path.join(f.root,'.env'),'CONTROLLED MARKER; NOT A KEY');
    await assert.rejects(captureReviewSource(f.root,f.settings,f.board),/credential files/);
  });
});

test('missing, pending, tampered and high-issue receipts cannot authorize final',async t=>{
  const f=await fixture(t);await f.accept();const file=path.join(f.root,'work/review-evidence.json'),original=await fs.readFile(file);
  for(const marker of [null,{status:'reviewing'}, {...JSON.parse(original.toString()),reviewHash:'0'.repeat(64)}]){
    if(marker===null)await fs.unlink(file);else await writeJson(file,marker);
    await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/needs-current-review/);
    await fs.writeFile(file,original);
  }
  await f.accept({...f.review,issues:[{shotId:'shot001',type:'camera-source',severity:'high',description:'Missing owner source',repair:'Restore the original source'}]});
  await requireCurrentReview(f.root,f.settings,f.board); // recorded FAIL is not permission
  await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/passing draft review/);
  await f.accept({...f.review,pass:false});
  await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/passing draft review/);
});

test('final binds raw render, MP4, SRT and thumbnail and rejects each later byte change',async t=>{
  const f=await fixture(t);await f.final();
  const evidence=await requireCurrentFinalEvidence(f.root,f.settings,f.board);
  assert.equal(evidence.productionApproval,false);assert.equal(evidence.motionVerified,false);
  for(const file of ['work/rendered.mp4','output/final.mp4','output/final.srt','output/thumbnail.png']){
    const target=path.join(f.root,file),original=await fs.readFile(target);
    await fs.appendFile(target,'modified after final');
    await assert.rejects(requireCurrentFinalEvidence(f.root,f.settings,f.board),/final artifact bytes changed/);
    await fs.writeFile(target,original);
  }
  await fs.appendFile(path.join(f.root,'scenes/shot001/assets/actor.png'),'a different actor after QC');
  await assert.rejects(requireCurrentFinalEvidence(f.root,f.settings,f.board),/needs-current-review/);
});

test('an in-flight render cannot adopt a later review even with identical source bytes',async t=>{
  const f=await fixture(t),original=await f.final();
  const originalFinal=await requireCurrentFinalEvidence(f.root,f.settings,f.board);
  await f.accept({...f.review,warnings:['A different review result for the same revision.']});
  await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board,original),/review evidence changed during final production/);
  await assert.rejects(recordFinalEvidence(f.root,f.settings,f.board,original),/review evidence changed during final production/);
  await assert.rejects(requireCurrentFinalEvidence(f.root,f.settings,f.board),/different review\/source revision/);
  await recordFinalEvidence(f.root,f.settings,f.board,await requireCurrentPassingReview(f.root,f.settings,f.board));
  await assert.rejects(requireCurrentFinalEvidence(f.root,f.settings,f.board,originalFinal),/final evidence changed during QC\/export/);
});

test('a superseded provider cannot replace a newer failed or unfinished review attempt',async t=>{
  for(const status of ['failed','unfinished'] as const)await t.test(status,async sub=>{
    const f=await fixture(sub),older=await beginReviewEvidence(f.root,f.settings,f.board),newer=await beginReviewEvidence(f.root,f.settings,f.board);
    assert.notEqual(older.attemptId,newer.attemptId);
    if(status==='failed')await commitReviewEvidence(f.root,f.settings,f.board,newer,{...f.review,pass:false});
    const marker=await fs.readFile(path.join(f.root,'work/review-evidence.json'));
    await assert.rejects(commitReviewEvidence(f.root,f.settings,f.board,older,f.review),/attempt was superseded/);
    assert.deepEqual(await fs.readFile(path.join(f.root,'work/review-evidence.json')),marker,'newer attempt retained');
    if(status==='failed')assert.equal(JSON.parse(await fs.readFile(path.join(f.root,'work/review.json'),'utf8')).pass,false);
    await assert.rejects(requireCurrentPassingReview(f.root,f.settings,f.board),/needs-current-review/);
  });
});

test('reserved record keys cannot silently omit configured input, voice or actor bytes',async t=>{
  for(const field of ['configured-input','narration-audio','approved-asset'] as const)await t.test(field,async sub=>{
    const f=await fixture(sub);await fs.writeFile(path.join(f.root,'__proto__'),'CONTROLLED SOURCE; NOT A KEY');
    if(field==='configured-input')f.settings.input.source='__proto__';
    else if(field==='narration-audio'){const file=path.join(f.root,'work/narration.json'),n=JSON.parse(await fs.readFile(file,'utf8'));n.audioPath='__proto__';await writeJson(file,n);}
    else {f.assets.assets[0]!.path='__proto__';await writeJson(path.join(f.root,'work/asset-manifest.json'),f.assets);}
    await assert.rejects(captureReviewSource(f.root,f.settings,f.board),/reserved source record key/);
  });
});
