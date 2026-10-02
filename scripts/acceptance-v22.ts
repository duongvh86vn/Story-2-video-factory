/** Opt-in real Vietnamese input/gate matrix. Requires configured TTS and cached ASR/alignment. */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { createProject, runPipeline, loadState } from '../packages/orchestrator/index.js';
import { loadConfig } from '../packages/core/config.js';
import { NarrationSchema,StoryboardSchema } from '../packages/core/schemas.js';
import { readJson, writeJson, exists, hash } from '../packages/core/utils.js';
import { serializeSrt, parseSrt } from '../packages/ingest/srt.js';
import { ffmpeg, probe } from '../packages/audio/ffmpeg.js';
import { VoiceReportSchema } from '../packages/voice/schemas.js';
import { requireVoice } from '../packages/voice/index.js';
import { ActorCastManifestSchema } from '../packages/actors/assets.js';
import { verifyLiteralSubtitles } from '../packages/captions/literal.js';

const cases=['script','srt','wav','aligned','mismatch','no-tts','srt-no-tts','fit-failed'] as const;
const args=process.argv.slice(2),requested=args.includes('--case')?args[args.indexOf('--case')+1]:undefined;
const timingOnly=args.includes('--timing-only');
if(requested&&!cases.includes(requested as typeof cases[number]))throw new Error('--case must name a matrix case');
const resumeName=args.includes('--resume-run')?args[args.indexOf('--resume-run')+1]:undefined;
if(args.includes('--resume-run')&&(!resumeName||!/^run-\d+$/.test(resumeName)))throw new Error('--resume-run must name an existing generated run-NNN folder');
const runDir=path.resolve('temp/acceptance-v22',resumeName??`run-${Date.now()}`),host=args.includes('--robot')?'MINI-ROBOT':'STICK-MAN';
if(resumeName&&!(await exists(runDir)))throw new Error('Requested acceptance run does not exist');
const resultPath=path.join(runDir,resumeName?'matrix-render.json':'matrix.json');
await fs.mkdir(runDir,{recursive:true});
const base=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/);
const sourceHash=hash(await Promise.all([...new Set(names)].sort().map(async name=>[name,hash(await fs.readFile(name))])));
const text='Hơi nước được dẫn đến bình ngưng riêng. Xi-lanh được giữ nóng.';
const words=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();
async function actorEvidence(root:string,delivered=true){
  const config=await loadConfig(root);
  assert.equal(config.presentation.mode,'story-cinematic');assert.equal(config.presentation.character_mode,'actors','Matrix must render actors, never silently substitute a presenter');
  const board=await readJson(path.join(root,'work/storyboard.json'),StoryboardSchema);
  const artifactDirectory=delivered?'output':'work';
  const cast=await readJson(path.join(root,artifactDirectory,'actor-cast.json'),ActorCastManifestSchema);
  const timeline=await readJson<{storyboardHash:string;shots:Array<{shotId:string;startMs:number;endMs:number;scene:unknown}>}>(path.join(root,artifactDirectory,'actor-timeline.json'));
  assert.equal(cast.storyboardHash,hash(board));assert.equal(timeline.storyboardHash,hash(board));
  assert.ok(cast.actors.length>0,'This fixture requires actual story actors');
  const expectedKind=host==='STICK-MAN'?'stick-man':'mini-robot';
  assert.ok(cast.actors.every(actor=>actor.character.kind===expectedKind),'Cast must use the selected rig style');
  assert.deepEqual(timeline.shots,board.shots.map(shot=>({shotId:shot.id,startMs:shot.startMs,endMs:shot.endMs,scene:shot.cinematic?.actorScene})));
  const used=new Set<string>();
  for(const shot of board.shots){
    const scene=shot.cinematic?.actorScene;assert.ok(scene,`${shot.id}: actorScene is required in actors mode`);
    const actors=[...(scene.primary?[scene.primary]:[]),...scene.supporting.map(item=>item.character)];
    assert.equal(scene.speakingSegmentIds.length,0,'Narration in this fixture is offscreen voiceover');
    for(const supporting of scene.supporting)assert.equal(supporting.speakingSegmentIds.length,0);
    const html=await fs.readFile(path.join(root,`scenes/${shot.id}/index.html`),'utf8');
    const report=await readJson<{actors:Array<{actorId:string;profileHash:string;rigHash:string}>}>(path.join(root,`scenes/${shot.id}/performance-report.json`));
    assert.equal(report.actors.length,actors.length);
    for(const actor of actors){
      used.add(actor.id);const asset=cast.actors.find(item=>item.character.id===actor.id);assert.ok(asset);
      assert.ok(html.includes(`data-actor-id="${actor.id}"`),`${shot.id}: production HTML must contain the actual actor`);
      assert.ok(report.actors.some(item=>item.actorId===asset.profile.id&&item.profileHash===asset.profile.profileHash&&item.rigHash===asset.rig.rigHash));
    }
  }
  assert.deepEqual([...used].sort(),cast.actors.map(actor=>actor.character.id).sort());
  for(const actor of cast.actors)for(const [relative,digest] of [[actor.assetPath,actor.assetHash],[actor.previewPath,actor.previewHash],[actor.posePath,actor.poseHash],[actor.profilePath,actor.profileFileHash]])
    assert.equal(hash(await fs.readFile(delivered?path.join(root,'output',relative!):path.join(root,relative!))),digest);
  return {mode:config.presentation.character_mode,castCount:cast.actors.length,shotCount:board.shots.length,kind:expectedKind,actorIds:[...used].sort()};
}
async function project(name:string,mode:'script'|'wav'|'srt'){
  const root=resumeName&&await exists(path.join(runDir,name,'project.yaml'))?path.join(runDir,name):await createProject(name,{root:runDir});
  const configFile=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(configFile,'utf8')) as Record<string,unknown>;
  raw.input={mode};raw.presentation={...(raw.presentation as Record<string,unknown>??{}),mode:'story-cinematic',character_mode:'actors'};raw.host={profile:`library/characters/${host}.md`};
  raw.rendering={draft:{width:960,height:540,fps:30},final:{width:1280,height:720,fps:30}};
  raw.asr={engine:'faster-whisper',model:'small',language:'vi',device:'cpu',compute_type:'int8',allow_downloads:false};
  await fs.writeFile(configFile,YAML.stringify(raw));
  return {root,raw,configFile};
}
const fixture=await project('fixture-clock','script');
await fs.writeFile(path.join(fixture.root,'input/script.txt'),text);
assert.equal((await runPipeline(fixture.root,{until:'TIMED'})).state,'TIMED','Fixture requires real configured Vietnamese TTS');
const narration=await readJson(path.join(fixture.root,'work/narration.json'),NarrationSchema);
assert.equal(narration.mode,'script');assert.equal(narration.segments.map(s=>s.text).join(' '),text);
const audio=await fs.readFile(path.join(fixture.root,narration.audioPath!)),subtitles=serializeSrt(narration.segments);
const results:Array<Record<string,unknown>>=[];
for(const name of requested?[requested as typeof cases[number]]:cases){
  const mode=name==='script'||name==='no-tts'?'script':name==='wav'||name==='aligned'||name==='mismatch'?'wav':'srt';
  const item=await project(name,mode),{root,raw,configFile}=item;
  const observations:Record<string,unknown>={};
  try {
    if(mode==='script')await fs.writeFile(path.join(root,'input/script.txt'),text);
    if(mode==='wav')await fs.writeFile(path.join(root,'input/narration.wav'),audio);
    if(mode==='srt'||name==='aligned'||name==='mismatch'){
      const cues=structuredClone(narration.segments);
      if(name==='mismatch')cues[0]!.text='Một con mèo đang chạy trong khu rừng.';
      if(name==='fit-failed')for(const [i,cue] of cues.entries()){cue.startMs=i*100;cue.endMs=(i+1)*100;}
      await fs.writeFile(path.join(root,'input/narration.srt'),name==='srt'||name==='aligned'||name==='srt-no-tts'?subtitles:serializeSrt(cues));
    }
    if(name==='no-tts'||name==='srt-no-tts') {raw.voice={tts_provider:'none'};await fs.writeFile(configFile,YAML.stringify(raw));}
    let error:unknown,state;
    try {state=await runPipeline(root,{...(timingOnly?{until:'TIMED' as const}:{}),onProgress:s=>console.log(`${name}: ${s.state}`)});}catch(caught){error=caught;state=await loadState(root);}
    const final=await exists(path.join(root,'output/final.mp4'));
    if(name==='no-tts'){
      assert.equal(state.state,'INGESTED');assert.equal(state.waitingFor,'voice');assert.equal(final,false);
      assert.equal(await exists(path.join(root,'work/timeline.json')),false);
    }else if(name==='srt-no-tts'||name==='fit-failed'){
      const report=await readJson(path.join(root,'work/voice-report.json'),VoiceReportSchema);
      assert.equal(report.status,name==='fit-failed'?'fit-failed':'needs-voice');
      assert.notEqual(state.state,'DONE');assert.equal(final,false);
      await assert.rejects(requireVoice(root,await readJson(path.join(root,'work/narration.json'),NarrationSchema)));
      if(!timingOnly){
        assert.equal(state.waitingFor,'voice',String(error??state.error??'Voice gate must be reached after a silent draft'));
        assert.equal(await exists(path.join(root,'work/draft.mp4')),true);
        observations.actors=await actorEvidence(root,false);
      }
    }else if(name==='mismatch'){
      assert.ok(error,'independent content verification must reject mismatched WAV/SRT');
      assert.match(String(error),/mismatch|similarity|content.*verif|does not match|alignment|word/i);
      assert.notEqual(state.state,'DONE');assert.equal(final,false);
    }else {
      assert.equal(state.state,timingOnly?'TIMED':'DONE',String(error??state.error??state.waitingFor));assert.equal(final,!timingOnly);
      const canonical=await readJson(path.join(root,'work/narration.json'),NarrationSchema);
      observations.narrationContent={expected:text,actual:canonical.segments.map(s=>s.text).join(' '),wordsMatch:words(canonical.segments.map(s=>s.text).join(' '))===words(text)};
      assert.equal(canonical.mode,name==='aligned'?'aligned':mode);
      if(mode==='script')assert.equal(canonical.segments.map(s=>s.text).join(' '),text);
      if(name==='srt'||name==='aligned')assert.deepEqual(canonical.segments,parseSrt(subtitles).segments);
      if(mode==='wav'){assert.equal(hash(await fs.readFile(path.join(root,'input/narration.wav'))),hash(audio));assert.equal(canonical.audioPath,'input/narration.wav');assert.ok(canonical.words.length>0);}
      const voiced=await readJson(path.join(root,'work/voiced-narration.json'),NarrationSchema);
      const voice=await requireVoice(root,voiced);assert.equal(voice.status,'ready');
      assert.deepEqual(voiced.segments,canonical.segments);
      const voicedMedia=await probe(root,await loadConfig(root),path.join(root,voiced.audioPath!));
      assert.ok(voicedMedia.streams.some(s=>s.codec_type==='audio'));
      assert.ok(Math.abs(Number(voicedMedia.format.duration)*1000-canonical.durationMs)<=2);
      if(timingOnly){
        if(name==='wav')assert.equal(words(canonical.segments.map(s=>s.text).join(' ')),words(text),'WAV ASR must preserve fixture words even in timing-only scope');
        results.push({name,status:'PASS',root,state:state.state,observations,scope:'real narration/clock and fixture word fidelity; rendering/review/QC NOT RUN'});
        await writeJson(resultPath,{base,sourceHash,host,language:'vi',timingOnly,results});
        continue;
      }
      const qc=await readJson<{pass:boolean}>(path.join(root,'output/qc-report.json'));assert.equal(qc.pass,true);
      const config=await loadConfig(root),media=path.join(root,'output/final.mp4');
      await ffmpeg(root,config,['-v','error','-xerror','-i',media,'-f','null','-']);
      const metadata=await probe(root,config,media);
      assert.ok(metadata.streams.some(s=>s.codec_type==='audio'));
      assert.ok(metadata.streams.some(s=>s.codec_name==='mov_text'));
      assert.equal(metadata.streams.find(s=>s.codec_type==='video')!.r_frame_rate,'30/1');
      observations.actors=await actorEvidence(root);
      await verifyLiteralSubtitles(root,config,media,voiced);
      if(name==='wav')assert.equal(words(canonical.segments.map(s=>s.text).join(' ')),words(text),'WAV ASR must preserve fixture words; a technical media PASS cannot hide wrong narration content');
    }
    const result={name,status:'PASS',root,state:state.state,waitingFor:state.waitingFor,timingOnly,observations,expectedFailure:['mismatch','no-tts','srt-no-tts','fit-failed'].includes(name),...(error?{observedError:String(error)}:{})};
    results.push(result);console.log(JSON.stringify(result));
  }catch(error){results.push({name,status:'FAIL',root,observations,error:String(error)});console.error(`${name}: ${String(error)}`);}
  await writeJson(resultPath,{base,sourceHash,host,characterMode:'actors',voiceFixture:fixture.root,language:'vi',timingOnly,reviewLimit:'Real input/actor/media gates and fixture word fidelity; not aesthetic/native full story acceptance',results});
}
console.log(JSON.stringify({runDir,base,sourceHash,results},null,2));
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
