import {ActorMotionSchema, SpriteClipSchema, type ActorMotion} from './schemas.js';
import {compileActorMotion, sampleMotionFrame} from './player.js';

const quantize=(seconds:number)=>Math.round(seconds*10000000)/10000000;
const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const scriptJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

/** Trusted candidate UI only. The compiler's scene fragment is kept literal and unchanged. */
export function motionWorkbench(input:ActorMotion, rate=1) {
  const motion=ActorMotionSchema.parse(input);
  // Validate rate before deriving the preview clock. Native metadata stays unrounded.
  const selectedRate=SpriteClipSchema.innerType().shape.rate.parse(rate);
  const nativeDurationMs=motion.frames.reduce((sum,frame)=>sum+frame.durationMs,0);
  const periodMs=nativeDurationMs/selectedRate;
  const durationMs=motion.playback.mode==='once'?periodMs:Math.min(2*periodMs,120000);
  const clip=SpriteClipSchema.parse({id:'candidate',compositionId:'motion-workbench',startMs:0,endMs:durationMs,
    rate:selectedRate,placement:{x:0,y:0,scale:1,rotation:0}});
  // Preflight parsing, once-span and compiler event caps before returning any HTML.
  const compiled=compileActorMotion(motion,clip,'sheet');
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
    speechSync:'none',rate:selectedRate,nativeDurationMs,previewDurationMs:durationMs,
    previewLimit:'max 2 cycles / 120 seconds',fingerprint:motion.fingerprint};
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Candidate motion workbench</title><style>
body{font:16px system-ui;margin:24px;background:#f4f1e9;color:#252525}main{max-width:920px;margin:auto}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 20px}dd{margin:0;overflow-wrap:anywhere}
.stage{height:420px;background:white;border:1px solid #ccc}.stage svg{width:100%;height:100%}
.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:16px 0}input{flex:1;min-width:160px}button{padding:8px 16px}
</style></head><body><main><h1>Candidate motion workbench</h1>
<p>Candidate only. Identity, anatomy, fluidity, contact and speech synchronization require review.</p>
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
