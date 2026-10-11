/** Local prototype. This contract is separate from production scene security. */
export interface RotationLayer {
  id: string;
  image: string;
  kind: 'surface' | 'cutout';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  periodMs: number;
  direction: 1 | -1;
  /** Source-space rectangle for a transparent cutout; surface uses the full image. */
  rect?: {x:number;y:number;width:number;height:number};
}
export interface ImageMotionScene {
  id: string;
  width: number;
  height: number;
  durationMs: number;
  original: string;
  background: string;
  layers: RotationLayer[];
}
export interface ImageMotionDemo {version:1;fps:number;scenes:ImageMotionScene[]}

/** One painter for the editor, player and export. State comes only from absolute time. */
export function paintImageMotionFrame(ctx:CanvasRenderingContext2D,images:Map<string,CanvasImageSource>,scene:ImageMotionScene,timeMs:number):void {
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.drawImage(images.get(timeMs===0?scene.original:scene.background)!,0,0);
  if(timeMs===0)return;
  for(const layer of scene.layers){
    ctx.save();ctx.beginPath();ctx.ellipse(layer.cx,layer.cy,layer.rx,layer.ry,0,0,Math.PI*2);ctx.clip();
    ctx.translate(layer.cx,layer.cy);ctx.scale(layer.rx,layer.ry);ctx.rotate(layer.direction*timeMs/layer.periodMs*Math.PI*2);ctx.scale(1/layer.rx,1/layer.ry);ctx.translate(-layer.cx,-layer.cy);
    if(layer.kind==='surface')ctx.drawImage(images.get(layer.image)!,0,0);
    else {const rect=layer.rect!;ctx.drawImage(images.get(layer.image)!,rect.x,rect.y,rect.width,rect.height);}
    ctx.restore();
  }
}
export function imageMotionPainterScript():string {return paintImageMotionFrame.toString();}

const finite=(n:number)=>Number.isFinite(n);
export function validateDemo(demo:ImageMotionDemo):void {
  if(demo.version!==1||!Number.isInteger(demo.fps)||demo.fps<1||demo.fps>60||!demo.scenes.length)throw new Error('Invalid demo clock');
  const asset=(url:string)=>{
    if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)&&!/^assets\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg)$/.test(url))throw new Error('Only bundled image assets are allowed');
  };
  for(const s of demo.scenes){
    if(!Number.isInteger(s.width)||!Number.isInteger(s.height)||s.width<1||s.height<1||s.width>3840||s.height>2160||!finite(s.durationMs)||s.durationMs<=0)throw new Error('Invalid scene dimensions or duration');
    asset(s.original);asset(s.background);
    if(s.width!==demo.scenes[0]!.width||s.height!==demo.scenes[0]!.height)throw new Error('All demo scenes must have the same dimensions');
    for(const l of s.layers){
      asset(l.image);
      if(!['surface','cutout'].includes(l.kind)||![l.cx,l.cy,l.rx,l.ry,l.periodMs].every(finite)||l.rx<=0||l.ry<=0||l.periodMs<=0||![1,-1].includes(l.direction)||l.cx-l.rx<0||l.cy-l.ry<0||l.cx+l.rx>s.width||l.cy+l.ry>s.height)throw new Error('Invalid rotation region');
      if(l.kind==='cutout'&&(!l.rect||![l.rect.x,l.rect.y,l.rect.width,l.rect.height].every(finite)||l.rect.width<=0||l.rect.height<=0))throw new Error('A cutout requires a source rectangle');
    }
  }
}

/** Fixed browser code; manifests contain only data, never executable animation code. */
export function createImageMotionHtml(demo:ImageMotionDemo):string {
  validateDemo(demo);
  const json=JSON.stringify(demo).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Ảnh gốc → chuyển động — demo im lặng</title>
<style>body{margin:0;background:#18212b;color:#fff;font:16px Arial}main{max-width:1920px;margin:auto}canvas{display:block;width:100%;height:auto}nav{padding:16px;display:flex;gap:12px;align-items:center}input{flex:1}button{padding:8px 16px}p{padding:0 16px}</style>
<main><canvas id="stage" width="${demo.scenes[0]!.width}" height="${demo.scenes[0]!.height}"></canvas><nav><button id="play">Phát</button><button id="reset">Về đầu</button><input id="seek" aria-label="Tua demo" type="range" min="0" step="1"><output id="clock"></output></nav><p>Demo im lặng; vùng chọn thủ công. Giữ nguyên hình nguồn. Chưa nối narration hoặc Studio.</p></main>
<script>
const demo=${json},paint=${imageMotionPainterScript()},canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),slider=document.getElementById('seek'),clock=document.getElementById('clock');
const totalMs=demo.scenes.reduce((sum,s)=>sum+s.durationMs,0);slider.max=totalMs;
const images=new Map();
window.ready=Promise.all([...new Set(demo.scenes.flatMap(s=>[s.original,s.background,...s.layers.map(l=>l.image)]))].map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{images.set(src,i);resolve();};i.onerror=()=>reject(new Error('Cannot load '+src));i.src=src;}))).then(()=>window.renderFrame(0));
window.renderFrame=function(timeMs){
  if(!Number.isFinite(timeMs))throw new Error('Invalid frame time');
  let remaining=Math.max(0,Math.min(totalMs,timeMs)),index=0;
  while(index<demo.scenes.length-1&&remaining>=demo.scenes[index].durationMs){remaining-=demo.scenes[index].durationMs;index++;}
  const s=demo.scenes[index];paint(ctx,images,s,remaining);
  slider.value=timeMs;clock.textContent=(timeMs/1000).toFixed(2)+' / '+(totalMs/1000).toFixed(2)+' s';
  return {scene:s.id,localMs:remaining};
};
let playing=false,start=0,current=0;
function tick(now){if(!playing)return;current=Math.min(totalMs,now-start);window.renderFrame(current);if(current>=totalMs){playing=false;document.getElementById('play').textContent='Phát';}else requestAnimationFrame(tick);}
document.getElementById('play').onclick=()=>{playing=!playing;document.getElementById('play').textContent=playing?'Dừng':'Phát';if(playing){if(current>=totalMs)current=0;start=performance.now()-current;requestAnimationFrame(tick);}};
document.getElementById('reset').onclick=()=>{playing=false;document.getElementById('play').textContent='Phát';current=0;window.renderFrame(0);};
slider.oninput=()=>{current=Number(slider.value);if(playing)start=performance.now()-current;window.renderFrame(current);};
</script></html>`;
}
