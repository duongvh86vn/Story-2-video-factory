import {ActorMotionSchema, SpriteClipSchema, type ActorMotion} from './schemas.js';
import {compileActorMotion, sampleMotionFrame} from './player.js';
import type {ActorSpeech} from './speech-schemas.js';
import {SPRITE_SPEECH_CLOCK_VERSION,type SpriteSpeechSchedule} from './speech-clock.js';
import {hash} from '../core/utils.js';

const quantize=(seconds:number)=>Math.round(seconds*10000000)/10000000;
const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const scriptJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

/** Trusted candidate UI only. The compiler's scene fragment is kept literal and unchanged. */
export function motionWorkbench(input:ActorMotion, rate=1, mouth?:ActorSpeech) {
  const motion=ActorMotionSchema.parse(input);
  // Validate rate before deriving the preview clock. Native metadata stays unrounded.
  const selectedRate=SpriteClipSchema.innerType().shape.rate.parse(rate);
  const nativeDurationMs=motion.frames.reduce((sum,frame)=>sum+frame.durationMs,0);
  const periodMs=nativeDurationMs/selectedRate;
  const durationMs=motion.playback.mode==='once'?periodMs:Math.min(2*periodMs,120000);
  const clip=SpriteClipSchema.parse({id:'candidate',compositionId:'motion-workbench',startMs:0,endMs:durationMs,
    rate:selectedRate,placement:{x:0,y:0,scale:1,rotation:0}});
  // Preflight parsing, once-span and compiler event caps before returning any HTML.
  // Diagnostic artwork comparison only: each native frame shows rest then open.
  // No narration, speaker or audio evidence is manufactured by this workbench.
  const intervals:Array<{startMs:number;endMs:number}>=[];
  if(mouth)for(let cycle=0;cycle<(motion.playback.mode==='loop'?2:1);cycle++){
    let offsetMs=cycle*periodMs;
    for(const frame of motion.frames){
      const endMs=Math.min(durationMs,offsetMs+frame.durationMs/selectedRate),startMs=offsetMs+frame.durationMs/selectedRate/2;
      if(startMs<endMs)intervals.push({startMs,endMs});
      offsetMs+=frame.durationMs/selectedRate;
    }
  }
  const marker=hash({purpose:'diagnostic-mouth-artwork-only',motion:motion.fingerprint,variant:mouth?.fingerprint});
  const schedule:SpriteSpeechSchedule={version:SPRITE_SPEECH_CLOCK_VERSION,slot:{shotStartMs:0,startMs:0,endMs:durationMs,segmentIds:['art-preview']},synchronization:'segment-draft',narrationHash:marker,activityHash:marker,intervals};
  const compiled=compileActorMotion(motion,clip,mouth?'native-sheet':'sheet',mouth?{variant:mouth,schedule,sheetUrl:'sheet'}:undefined);
  const duration=quantize(durationMs/1000);

  // At most two cycles × 512 logical positions + terminal. Labels use the shared sampler,
  // including repeated rectangles; no frame-selection algorithm is shipped to the browser.
  const times=new Set<number>([0,duration]);
  for(let cycle=0;cycle<(motion.playback.mode==='loop'?2:1);cycle++) {
    let offsetMs=0;
    for(const frame of motion.frames) {
      const time=quantize((cycle*periodMs+offsetMs/selectedRate)/1000);
      if(time<duration)times.add(time);
      offsetMs+=frame.durationMs;
    }
  }
  const labelTrack=[...times].sort((a,b)=>a-b).map(seconds=>({seconds,frame:sampleMotionFrame(motion,clip,seconds*1000)}));
  const bounds=motion.frames.reduce((b,f)=>({left:Math.min(b.left,-f.anchor.x),top:Math.min(b.top,-f.anchor.y),
    right:Math.max(b.right,f.rect.w-f.anchor.x),bottom:Math.max(b.bottom,f.rect.h-f.anchor.y)}),
  {left:0,top:0,right:0,bottom:0});
  const svg=compiled.svg.replace('<svg ',`<svg viewBox="${bounds.left-10} ${bounds.top-10} ${bounds.right-bounds.left+20} ${bounds.bottom-bounds.top+20}" role="img" aria-label="Candidate motion" `);
  const details={actor:motion.actorId,state:motion.state,view:motion.view,status:motion.review.status,
    productionReady:false,sourceLoop:motion.source.loop,playback:motion.playback.mode,end:motion.playback.end,
    speechSync:mouth?'diagnostic-rest-open':'none',rate:selectedRate,nativeDurationMs,previewDurationMs:durationMs,
    ...(mouth?{previewPurpose:'artwork comparison only; no narration or audio',variantId:mouth.id,variantFingerprint:mouth.fingerprint}:{}),
    previewLimit:'max 2 cycles / 120 seconds',fingerprint:motion.fingerprint};
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${mouth?'Candidate mouth artwork':'Candidate motion workbench'}</title><style>
body{font:16px system-ui;margin:24px;background:#f4f1e9;color:#252525}main{max-width:920px;margin:auto}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 20px}dd{margin:0;overflow-wrap:anywhere}
.stage{height:420px;background:white;border:1px solid #ccc}.stage svg{width:100%;height:100%}
.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:16px 0}input{flex:1;min-width:160px}button{padding:8px 16px}
</style></head><body><main><h1>${mouth?'Candidate mouth artwork':'Candidate motion workbench'}</h1>
<p>Candidate only. Identity, anatomy, fluidity, contact and speech synchronization require review.</p>${mouth?'\n<p>Diagnostic rest/open switching within every native frame. No narration or audio; not a speech synchronization test or accepted acting.</p>':''}
<dl>${Object.entries(details).map(([key,value])=>`<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>
<div class="stage" data-composition-id="${clip.compositionId}">${svg}</div>
<div class="controls"><button id="play" type="button">Play</button><button id="pause" type="button">Pause</button><button id="reset" type="button">Reset</button>
<label for="seek">Seek</label><input id="seek" type="range" min="0" max="${duration}" step="0.0000001" value="0"><output id="frame" aria-live="off"></output></div>
<ul>${compiled.report.warnings.map(w=>`<li>${escapeHtml(w)}</li>`).join('')}</ul>
</main><script src="/api/motions/runtime/gsap.min.js"></script><script>
const labelTrack=${scriptJson(labelTrack)};
const duration=${duration}, frameCount=${motion.frames.length};
const labelState={frame:labelTrack[0].frame??-1}, clockState={seconds:0};
const seek=document.getElementById('seek'), output=document.getElementById('frame');
function update(){seek.value=String(tl.time());output.textContent='Frame '+(labelState.frame<0?'hidden':(labelState.frame+1)+' / '+frameCount)+' · '+tl.time().toFixed(4)+' s';}
const tl=gsap.timeline({paused:true,onUpdate:update,onComplete:update});
${compiled.js}
// Workbench controls and logical labels are separate from the literal scene fragment above.
tl.to(clockState,{seconds:duration,duration:duration,ease:'none'},0);
for(const label of labelTrack)tl.set(labelState,{frame:label.frame??-1,immediateRender:label.seconds===0},label.seconds);
document.getElementById('play').addEventListener('click',()=>{if(tl.time()>=duration)tl.pause(0);tl.play();});
document.getElementById('pause').addEventListener('click',()=>tl.pause());
document.getElementById('reset').addEventListener('click',()=>{tl.pause();tl.time(0,false);update();});
seek.addEventListener('input',()=>{tl.pause();tl.time(Number(seek.value),false);update();});
tl.pause();tl.time(0,false);update();
</script></body></html>`;
  return {html,clip,labelTrack,report:compiled.report};
}
