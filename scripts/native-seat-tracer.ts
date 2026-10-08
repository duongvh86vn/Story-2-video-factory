/** Opt-in diagnostic exporter. Never invoked by build, installation or Studio.
 * Runtime execution/media review are delegated to the user's test model. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify,parseArgs} from 'node:util';
import {performance} from 'node:perf_hooks';
import {findRepoRoot} from '../packages/core/config.js';
import {escapeHtml,hash,safeRealPath,timestamp,writeAtomic,writeJson} from '../packages/core/utils.js';
import {outputPath,redact} from '../packages/render/process.js';
import {HyperFramesEngine,HYPERFRAMES_VERSION} from '../packages/render/hyperframes.js';
import {probe,ffmpeg,type ProbeResult} from '../packages/audio/ffmpeg.js';
import {validateActorCast} from '../packages/actors/model.js';
import {actorRigResourcePaths} from '../packages/actors/rig-resources.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {rigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {referenceHeadAssets,readReferenceHeadAsset} from '../packages/animation/forest-head-art.js';
import {referenceBodyAssets} from '../packages/animation/forest-body-art.js';
import {sourceBodyPlan} from '../packages/animation/view-source-body.js';
import {supportMotionTimes} from '../packages/animation/support.js';
import {validateCinematicShot} from '../packages/director/index.js';
import {validateStoryActingCoverage} from '../packages/director/story-coverage.js';
import {cameraMatrixAt} from '../packages/director/camera.js';
import {renderCinematic} from '../library/shots/cinematic.js';
import {secureSceneFiles,validateSceneFiles,SCENE_SECURITY_VERSION} from '../packages/scenes/security.js';
import {buildMaster} from '../packages/scenes/index.js';
import {measureSpeech} from '../packages/voice/index.js';
import type {SpeechActivity} from '../packages/voice/schemas.js';
import {createNativeSeatTracer,createNativeHeadSeatTracer,NATIVE_SEAT_TRACER_DURATION_MS,NATIVE_SEAT_TRACER_SCOPE,NATIVE_SEAT_TRACER_VERSION,NATIVE_HEAD_SEAT_TRACER_SCOPE,NATIVE_HEAD_SEAT_TRACER_VERSION} from '../benchmarks/native-seat-tracer.js';
import {NativeDialogueSelectionSchema} from '../packages/topics/native-dialogue-candidates.js';

const require=createRequire(import.meta.url),execFileAsync=promisify(execFile);
export function nativeSeatTracerOptions(args:string[]){
  const {values}=parseArgs({args,strict:true,allowPositionals:false,options:{validate:{type:'boolean'},frames:{type:'boolean'},render:{type:'boolean'},wav:{type:'string'},help:{type:'boolean'},'native-heads':{type:'boolean'},staging:{type:'string'},acting:{type:'string'},face:{type:'string'}}});
  if(values.wav&&(!path.isAbsolute(values.wav)||path.extname(values.wav).toLowerCase()!=='.wav'))throw new Error('--wav requires an absolute path to an existing WAV file');
  const explicitDialogue=values.staging!==undefined||values.acting!==undefined||values.face!==undefined;
  if(explicitDialogue&&!values['native-heads'])throw new Error('--staging/--acting require --native-heads; legacy tracer is unchanged');
  const dialogue=explicitDialogue?NativeDialogueSelectionSchema.parse({...(values.staging!==undefined?{staging:values.staging}:{}),...(values.acting!==undefined?{acting:values.acting}:{}),...(values.face!==undefined?{face:values.face}:{})}):undefined;
  if(dialogue?.acting==='emotional-reactions'&&dialogue.face!=='expressions')throw new Error('--acting emotional-reactions requires explicit --face expressions');
  return {validate:!!(values.validate||values.frames||values.render),frames:!!values.frames,render:!!values.render,wav:values.wav,help:!!values.help,...(values['native-heads']?{nativeHeads:true as const}:{}),...(dialogue?{dialogue}:{})};
}
export type NativeSeatTracerOptions=ReturnType<typeof nativeSeatTracerOptions>;

/** Exclusive fresh destination. No existing project or server is modified. */
export async function reserveNativeSeatTracerRoot(repo:string){
  const parent=await outputPath(repo,'runtime/prehistoric-life/native-seat-tracers');
  await fs.mkdir(parent,{recursive:true});
  const id='tracer-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID();
  const root=await outputPath(repo,'runtime/prehistoric-life/native-seat-tracers/'+id);
  await fs.mkdir(root);return root;
}
function frameRate(value:string|undefined):number{
  if(!value)return NaN;const parts=value.split('/').map(Number);
  return parts.length===2&&parts[1]!==0?parts[0]!/parts[1]!:parts.length===1?parts[0]!:NaN;
}
export function checkNativeSeatTracerMedia(result:ProbeResult,hasAudio:boolean):string[]{
  const errors:string[]=[],video=result.streams.filter(s=>s.codec_type==='video'),audio=result.streams.filter(s=>s.codec_type==='audio');
  if(video.length!==1)errors.push('Expected exactly one video stream');
  const v=video[0];if(v?.codec_name!=='h264'||v.width!==1280||v.height!==720)errors.push('Expected H.264 1280x720');
  if(Math.abs(frameRate(v?.avg_frame_rate)-60)>1e-6||!Number.isFinite(frameRate(v?.avg_frame_rate)))errors.push('Expected 60fps');
  const duration=Number(result.format.duration)*1000;
  const clockMatches=(value:string|undefined)=>value!==undefined&&Number.isFinite(Number(value))&&Math.abs(Number(value)*1000-NATIVE_SEAT_TRACER_DURATION_MS)<=1000/60+.001;
  if(!Number.isFinite(duration)||Math.abs(duration-NATIVE_SEAT_TRACER_DURATION_MS)>1000/60+.001)errors.push('Container duration differs from the 7200ms source clock by more than one frame');
  if(!clockMatches(v?.duration))errors.push('Video-stream duration is unavailable or differs from the 7200ms source clock by more than one frame');
  if(hasAudio?audio.length!==1:audio.length!==0)errors.push(hasAudio?'Expected the diagnostic WAV audio stream':'Silent draft must not contain fabricated audio');
  if(hasAudio&&!clockMatches(audio[0]?.duration))errors.push('Audio-stream duration is unavailable or differs from the 7200ms source clock by more than one frame');
  return errors;
}
type TracerReport={scope:string;version:string;sourceSHA:string|null;trackedSourceDirty:boolean|null;productionAcceptance:false;finalExportAllowed:false;motionAccepted:false;phonemeLipSync:false;status:'exporting'|'exported'|'failed';phase:string;
  checks:Record<string,{status:'PASS'|'FAIL'|'NOT RUN';detail?:unknown}>;shots:unknown[];resources:unknown[];audio:unknown;headSelection?:unknown;dialogueSelection?:unknown;error?:string;outputRoot:string;elapsedMs?:number};

export async function exportNativeSeatTracer(repo:string,options:NativeSeatTracerOptions):Promise<string>{
  if(options.help)throw new Error('Help does not export a tracer');
  const root=await reserveNativeSeatTracerRoot(repo),started=performance.now();
  let sourceSHA:string|null=null,trackedSourceDirty:boolean|null=null;
  try{const result=await execFileAsync('git',['rev-parse','HEAD'],{cwd:repo,timeout:10000});const sha=result.stdout.trim();if(/^[a-f0-9]{40}$/.test(sha))sourceSHA=sha;
    const status=await execFileAsync('git',['status','--porcelain','--untracked-files=no'],{cwd:repo,timeout:10000});trackedSourceDirty=!!status.stdout.trim();
  }catch{/* A source archive may have no Git executable/history. */}
  const report:TracerReport={scope:options.nativeHeads?NATIVE_HEAD_SEAT_TRACER_SCOPE:NATIVE_SEAT_TRACER_SCOPE,version:options.nativeHeads?NATIVE_HEAD_SEAT_TRACER_VERSION:NATIVE_SEAT_TRACER_VERSION,sourceSHA,trackedSourceDirty,productionAcceptance:false,finalExportAllowed:false,motionAccepted:false,phonemeLipSync:false,status:'exporting',phase:'canonical',outputRoot:root,shots:[],resources:[],audio:{source:'silent-draft',speechActivity:'empty',contentAlignment:'NOT RUN'},
    checks:Object.fromEntries(['canonical','diagnostic-wav','cast-and-story','scene-security-and-byte-cap','master','hyperframes','snapshots','render-draft','video-probe','video-decode','visual-motion-review','source-clock-and-reverse-seek','full-factory-inputs'].map(k=>[k,{status:'NOT RUN' as const}]))};
  const save=()=>writeJson(path.join(root,'tracer-report.json'),JSON.parse(redact(JSON.stringify({...report,elapsedMs:Math.round(performance.now()-started)}))));
  await save();
  try{
    const f=options.nativeHeads?await createNativeHeadSeatTracer(repo,options.dialogue??{}):createNativeSeatTracer(),{config,board,beat,profile,rig,narration}=f;
    if('headSelection' in f)report.headSelection=f.headSelection;
    if('dialogueSelection' in f)report.dialogueSelection=f.dialogueSelection;
    report.checks.canonical={status:'PASS',detail:{storyboardHash:hash(board),narrationHash:hash(narration),headMode:options.nativeHeads?(options.dialogue?.face==='expressions'?'explicit-opposing-bank5-emotions':'explicit-opposing-bank3'):'legacy-fixed-view'}};
    let activity:SpeechActivity={method:'segment-draft',windowMs:20,intervals:[]};
    if(options.wav){
      report.phase='diagnostic-wav';await save();
      const source=await fs.realpath(options.wav);if(!(await fs.stat(source)).isFile())throw new Error('WAV is not a regular file');
      const input=await probe(root,config,source),audio=input.streams.filter(s=>s.codec_type==='audio'),duration=Number(input.format.duration)*1000;
      if(audio.length!==1||input.streams.some(s=>s.codec_type==='video')||!Number.isFinite(duration)||Math.abs(duration-narration.durationMs)>1000/60+.001)throw new Error('Diagnostic WAV must contain one audio stream and match the 7200ms cue clock within one frame; no fit, trimming or rewriting is performed');
      const bytes=await fs.readFile(source),sha256=hash(bytes);await writeAtomic(await outputPath(root,'input/narration.wav'),bytes);
      narration.audioPath='input/narration.wav';config.project.name+=' — supplied diagnostic WAV';
      activity=await measureSpeech(root,config,narration);
      report.audio={source:'user',sha256,durationMs:duration,bytesPreserved:true,speechActivity:activity.method,contentAlignment:'NOT RUN',inputProbe:input};
      report.checks['diagnostic-wav']={status:'PASS',detail:{byteHash:sha256,contentAlignment:'NOT RUN'}};
    }else config.project.name+=' — SILENT DRAFT / UNAPPROVED';
    report.phase='cast-and-story';await save();
    validateActorCast(board,narration);validateStoryActingCoverage(board,[beat],narration);
    report.checks['cast-and-story']={status:'PASS'};
    for(const [file,value] of Object.entries({'config.json':config,'storyboard.json':board,'beats.json':[beat],'narration.json':narration,'speech-activity.json':activity,'host-profile.json':profile,'host-rig.json':rig}))await writeJson(await outputPath(root,'work/'+file),value);
    const srt=narration.segments.map((c,i)=>`${i+1}\n${timestamp(c.startMs).replace('.',',')} --> ${timestamp(c.endMs).replace('.',',')}\n${c.text}\n`).join('\n');
    await writeAtomic(await outputPath(root,'output/native-seat-draft.srt'),srt);
    await writeJson(await outputPath(root,'work/voice-report.json'),{scope:f.scope,source:options.wav?'user-diagnostic-wav':'silent-draft',needsVoice:!options.wav,contentAlignment:'NOT RUN',phonemeLipSync:false,finalExportAllowed:false});
    const gsap=await fs.readFile(require.resolve('gsap/dist/gsap.min.js'));
    report.phase='scene-security-and-byte-cap';await save();
    for(const shot of board.shots){
      const shotStarted=performance.now();validateCinematicShot(shot,profile,config,board);
      const result=renderCinematic(shot,profile,rig,activity,config,undefined,narration,undefined,undefined,board),files=secureSceneFiles(result.files);
      const allowed=actorRigResourcePaths(shot,profile),bytes=files.files.reduce((sum,file)=>sum+Buffer.byteLength(file.content),0),errors=validateSceneFiles(files,shot,config.workflow.max_scene_bytes,allowed,config.rendering.final);
      const c=shot.cinematic!,actors=[c.actorScene!.primary!,...c.actorScene!.supporting.map(a=>a.character)];
      const details={shotId:shot.id,startMs:shot.startMs,endMs:shot.endMs,sceneBytes:bytes,capBytes:config.workflow.max_scene_bytes,compileMs:Math.round(performance.now()-shotStarted),errors,
        securityVersion:SCENE_SECURITY_VERSION,publicationBinding:rigSpeechPublicationBinding(shot,narration,board),camera:c.camera,
        cameraEndpoints:[0,c.performance.durationMs].map(at=>({atMs:at,...cameraMatrixAt(c.camera,c.performance.stage,c.performance.durationMs,at)})),
        clocks:actors.map(character=>({actorId:character.id,clock:actorViewActingClock(board,shot,character.id)}))};
      report.shots.push(details);await writeJson(await outputPath(root,`work/scene-reports/${shot.id}.json`),{...details,performance:result.report});await save();
      if(errors.length)throw new Error(`${shot.id}: scene validation failed: ${errors.join('; ')}`);
      for(const file of files.files)await writeAtomic(await outputPath(root,`scenes/${shot.id}/${file.path}`),file.content);
      await writeAtomic(await outputPath(root,`scenes/${shot.id}/vendor/gsap.min.js`),gsap);
      const resources=new Map(actors.flatMap(a=>[...referenceHeadAssets(a.appearance),...referenceBodyAssets(a.appearance)]).map(a=>[a.path,a]));
      if(allowed.some(p=>!resources.has(p))||resources.size!==allowed.length)throw new Error(`${shot.id}: rig resource allowlist mismatch`);
      for(const resource of resources.values()){
        const bytes=readReferenceHeadAsset(resource);await writeAtomic(await outputPath(root,`scenes/${shot.id}/${resource.path}`),bytes);
        report.resources.push({shotId:shot.id,...resource,byteCount:bytes.length});
      }
    }
    report.checks['scene-security-and-byte-cap']={status:'PASS'};
    report.phase='master';await save();
    await buildMaster(root,config,board,narration,{assets:[]});report.checks.master={status:'PASS'};
    await writeJson(await outputPath(root,'work/rig-resource-manifest.json'),{scope:f.scope,productionAcceptance:false,resources:report.resources});
    const engine=new HyperFramesEngine(config,root);
    if(options.validate){
      report.phase='hyperframes';await save();const validation=await engine.validate('scenes');
      await writeJson(await outputPath(root,'work/hyperframes-validation.json'),JSON.parse(redact(JSON.stringify(validation))));
      report.checks.hyperframes={status:validation.pass?'PASS':'FAIL',detail:{rendererVersion:HYPERFRAMES_VERSION,errors:validation.errors}};
      if(!validation.pass)throw new Error('HyperFrames lint/check failed; see work/hyperframes-validation.json');
    }
    if(options.frames){
      report.phase='snapshots';await save();
      const times=new Set([0,299,300,600,899,900,1200,1799,1800,2399,2400,2500,2999,3000,3799,3800,4200,4499,4500,4599,4600,4799,4800,5600,6599,6600,7199]);
      for(const at of supportMotionTimes(sourceBodyPlan(board.shots[0]!.cinematic!.performance)))for(const delta of [-1,0,1])if(at+delta>=0&&at+delta<narration.durationMs)times.add(Math.round(at+delta));
      // Inspect the authored source hand phases, including ones not coincident
      // with a camera cut or body support event. This only chooses snapshot
      // seeks; it does not round or modify any source gesture clock.
      const firstShot=board.shots[0]!,scene=firstShot.cinematic!.actorScene!;
      for(const id of [scene.primary!.id,...scene.supporting.map(a=>a.character.id)]){
        const clock=actorViewActingClock(board,firstShot,id);
        for(const gesture of clock?.gestures??[])for(const at of [gesture.startMs,gesture.reachMs,gesture.recoverMs,gesture.endMs])for(const delta of [-1,0,1]){
          const seek=Math.round(at+delta);if(seek>=0&&seek<narration.durationMs)times.add(seek);
        }
      }
      const frames=[...times].sort((a,b)=>a-b).map(timeMs=>({timeMs,output:`previews/at-${timeMs}.png`}));
      await engine.snapshots({project:'scenes',frames});
      await writeJson(await outputPath(root,'previews/manifest.json'),{scope:f.scope,productionAcceptance:false,seekOrderVerified:false,frames});
      await writeAtomic(await outputPath(root,'previews/index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>UNAPPROVED native seat tracer</title><style>body{background:#20190f;color:#fff;font:16px Arial;margin:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}img{width:100%}figure{margin:0}</style><h1>UNAPPROVED native seat tracer</h1><p>Actual master snapshots. Motion, identity and reverse-seek acceptance remain pending.</p><main>${frames.map(frame=>`<figure><img src="${escapeHtml(path.basename(frame.output))}" alt="${frame.timeMs} ms"><figcaption>${frame.timeMs} ms</figcaption></figure>`).join('')}</main></html>`);
      report.checks.snapshots={status:'PASS',detail:{count:frames.length,reverseSeekVerified:false}};
    }
    if(options.render){
      report.phase='render-draft';await save();const rendered=await engine.renderDraft('scenes'),media=await safeRealPath(root,path.relative(root,rendered.path));
      const dest=await outputPath(root,'output/native-seat-draft.mp4');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(media,dest);
      report.checks['render-draft']={status:'PASS',detail:{profile:rendered.profile,cacheKey:rendered.cacheKey,productionAcceptance:false}};
      report.phase='video-probe';await save();const data=await probe(root,config,dest),errors=checkNativeSeatTracerMedia(data,!!options.wav);
      await writeJson(await outputPath(root,'work/video-probe.json'),{probe:data,errors,productionAcceptance:false});report.checks['video-probe']={status:errors.length?'FAIL':'PASS',detail:errors};
      if(errors.length)throw new Error(errors.join('; '));
      report.phase='video-decode';await save();await ffmpeg(root,config,['-v','error','-xerror','-i',dest,'-map','0:v:0','-map','0:a?','-f','null','-']);
      report.checks['video-decode']={status:'PASS'};
    }
    report.phase='exported';report.status='exported';await save();return root;
  }catch(error){
    const message=redact(error instanceof Error?error.message:String(error));report.status='failed';report.error=message;
    if(report.checks[report.phase])report.checks[report.phase]={status:'FAIL',detail:message};await save();
    throw new Error(`${message}\nDiagnostic artifacts retained at ${root}`);
  }
}

async function main(){
  const options=nativeSeatTracerOptions(process.argv.slice(2));
  if(options.help){process.stdout.write('npm run tracer:native-seat -- [--native-heads [--staging lila-left|lila-right] [--acting rest|listening-think|emotional-reactions] [--face speech-eyes|expressions]] [--validate] [--frames] [--render] [--wav "ABSOLUTE.wav"]\nDefault exports an unapproved silent SRT tracer with legacy fixed-view overlays. --native-heads selects independent matching bank3 head/body views. Staging means screen position; it never mirrors artwork. Optional listening-think keeps original hand clocks across camera cuts. Explicit --face expressions selects own bank5 registrations; emotional-reactions keeps both original reaction clocks through the same canonical factory renderer. No synthetic speech; silent without WAV. Media/browser/ffmpeg execution is opt-in. Fresh runtime folder per invocation; never final/DONE.\n');return;}
  const root=await exportNativeSeatTracer(await findRepoRoot(),options);
  process.stdout.write(JSON.stringify({scope:options.nativeHeads?NATIVE_HEAD_SEAT_TRACER_SCOPE:NATIVE_SEAT_TRACER_SCOPE,outputRoot:root,report:path.join(root,'tracer-report.json'),productionAcceptance:false,finalExportAllowed:false})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(redact(error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;});
