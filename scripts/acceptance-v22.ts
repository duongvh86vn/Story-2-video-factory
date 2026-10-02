/** Opt-in real Vietnamese input/gate matrix. Requires configured TTS and cached ASR/alignment. */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { createProject, runPipeline, loadState } from '../packages/orchestrator/index.js';
import { loadConfig } from '../packages/core/config.js';
import { NarrationSchema } from '../packages/core/schemas.js';
import { readJson, writeJson, exists, hash } from '../packages/core/utils.js';
import { serializeSrt, parseSrt } from '../packages/ingest/srt.js';
import { ffmpeg, probe } from '../packages/audio/ffmpeg.js';
import { VoiceReportSchema } from '../packages/voice/schemas.js';
import { requireVoice } from '../packages/voice/index.js';

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
async function project(name:string,mode:'script'|'wav'|'srt'){
  const root=resumeName&&await exists(path.join(runDir,name,'project.yaml'))?path.join(runDir,name):await createProject(name,{root:runDir});
  const configFile=path.join(root,'project.yaml'),raw=YAML.parse(await fs.readFile(configFile,'utf8')) as Record<string,unknown>;
  raw.input={mode};raw.presentation={mode:'story-cinematic'};raw.host={profile:`library/characters/${host}.md`};
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
      }
    }else if(name==='mismatch'){
      assert.ok(error,'independent content verification must reject mismatched WAV/SRT');
      assert.match(String(error),/mismatch|similarity|content.*verif|does not match|alignment|word/i);
      assert.notEqual(state.state,'DONE');assert.equal(final,false);
    }else {
      assert.equal(state.state,timingOnly?'TIMED':'DONE',String(error??state.error??state.waitingFor));assert.equal(final,!timingOnly);
      const canonical=await readJson(path.join(root,'work/narration.json'),NarrationSchema);
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
        results.push({name,status:'PASS',root,state:state.state,scope:'real narration/clock; rendering/review/QC NOT RUN'});
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
    }
    const result={name,status:'PASS',root,state:state.state,waitingFor:state.waitingFor,timingOnly,expectedFailure:['mismatch','no-tts','srt-no-tts','fit-failed'].includes(name),...(error?{observedError:String(error)}:{})};
    results.push(result);console.log(JSON.stringify(result));
  }catch(error){results.push({name,status:'FAIL',root,error:String(error)});console.error(`${name}: ${String(error)}`);}
  await writeJson(resultPath,{base,sourceHash,host,voiceFixture:fixture.root,language:'vi',timingOnly,reviewLimit:'Technical/rule gates; not semantic or full story acceptance',results});
}
console.log(JSON.stringify({runDir,base,sourceHash,results},null,2));
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
