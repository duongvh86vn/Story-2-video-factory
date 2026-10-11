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
  /** Source-space alpha parts; the array is also the back-to-front draw order. */
  parts?: ArticulatedPart[];
}
export interface ArticulatedPart {
  id:string;
  image:string;
  parent?:string;
  pivot:{x:number;y:number};
  /** Local angle relative to its parent; source rest pose is zero degrees. */
  frames:{timeMs:number;angle:number}[];
}
export interface ImageMotionDemo {version:1;fps:number;scenes:ImageMotionScene[]}

/** One painter for the editor, player and export. State comes only from absolute time. */
export function paintImageMotionFrame(ctx:CanvasRenderingContext2D,images:Map<string,CanvasImageSource>,scene:ImageMotionScene,timeMs:number):void {
  // Keep helpers inside the painter: the exact function is serialized into the browser.
  const angleAt=(part:ArticulatedPart)=>{
    const f=part.frames;
    for(let i=1;i<f.length;i++)if(timeMs<=f[i]!.timeMs){
      const a=f[i-1]!,b=f[i]!,u=Math.max(0,Math.min(1,(timeMs-a.timeMs)/(b.timeMs-a.timeMs))),e=u*u*u*(u*(u*6-15)+10);
      return a.angle+(b.angle-a.angle)*e;
    }
    return f[f.length-1]!.angle;
  };
  const parts=scene.parts??[],angles=new Map(parts.map(p=>[p.id,angleAt(p)]));
  const original=timeMs===0||(!scene.layers.length&&parts.length>0&&[...angles.values()].every(a=>a===0));
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.drawImage(images.get(original?scene.original:scene.background)!,0,0);
  if(original)return;
  for(const layer of scene.layers){
    ctx.save();ctx.beginPath();ctx.ellipse(layer.cx,layer.cy,layer.rx,layer.ry,0,0,Math.PI*2);ctx.clip();
    ctx.translate(layer.cx,layer.cy);ctx.scale(layer.rx,layer.ry);ctx.rotate(layer.direction*timeMs/layer.periodMs*Math.PI*2);ctx.scale(1/layer.rx,1/layer.ry);ctx.translate(-layer.cx,-layer.cy);
    if(layer.kind==='surface')ctx.drawImage(images.get(layer.image)!,0,0);
    else {const rect=layer.rect!;ctx.drawImage(images.get(layer.image)!,rect.x,rect.y,rect.width,rect.height);}
    ctx.restore();
  }
  type Matrix=[number,number,number,number,number,number];
  const multiply=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  const resolved=new Map<string,Matrix>(),byId=new Map(parts.map(p=>[p.id,p]));
  const world=(p:ArticulatedPart):Matrix=>{
    const cached=resolved.get(p.id);if(cached)return cached;
    const a=angles.get(p.id)!*Math.PI/180,c=Math.cos(a),s=Math.sin(a),{x,y}=p.pivot,local:Matrix=[c,s,-s,c,x-c*x+s*y,y-s*x-c*y];
    const matrix=p.parent?multiply(world(byId.get(p.parent)!),local):local;resolved.set(p.id,matrix);return matrix;
  };
  for(const part of parts){ctx.save();ctx.setTransform(...world(part));ctx.drawImage(images.get(part.image)!,0,0);ctx.restore();}
}
export function imageMotionPainterScript():string {
  // tsx/esbuild may wrap named local functions with its __name helper. Keep that
  // build-only helper scoped to our fixed code when serializing into the browser.
  return '(()=>{const __name=(fn)=>fn;return '+paintImageMotionFrame.toString()+';})()';
}

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
    const parts=s.parts??[],ids=new Set(parts.map(p=>p.id));
    if(parts.length>32||ids.size!==parts.length)throw new Error('Invalid articulated part identity');
    for(const p of parts){
      asset(p.image);
      if(!/^[a-z][a-z0-9-]{0,39}$/.test(p.id)||![p.pivot.x,p.pivot.y].every(finite)||p.pivot.x<0||p.pivot.x>s.width||p.pivot.y<0||p.pivot.y>s.height||p.frames.length<2||p.frames.length>128||p.frames[0]!.timeMs!==0||p.frames[0]!.angle!==0||p.frames[p.frames.length-1]!.timeMs!==s.durationMs||p.frames.some((f,i)=>!finite(f.timeMs)||!finite(f.angle)||Math.abs(f.angle)>170||(i>0&&f.timeMs<=p.frames[i-1]!.timeMs)))throw new Error('Invalid articulated part clock or pivot');
      const chain=new Set([p.id]);let parent=p.parent;
      while(parent){if(!ids.has(parent)||chain.has(parent))throw new Error('Invalid articulated parent graph');chain.add(parent);parent=parts.find(q=>q.id===parent)!.parent;}
    }
  }
}

/** Fixed browser code; manifests contain only data, never executable animation code. */
export function createImageMotionHtml(demo:ImageMotionDemo):string {
  validateDemo(demo);
  const json=JSON.stringify(demo).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Ảnh gốc → chuyển động — demo im lặng</title>
<style>body{margin:0;background:#18212b;color:#fff;font:16px Arial}main{max-width:1920px;margin:auto}canvas{display:block;width:100%;height:auto}nav{padding:16px;display:flex;gap:12px;align-items:center}input{flex:1}button{padding:8px 16px}p{padding:0 16px}</style>
<main><canvas id="stage" width="${demo.scenes[0]!.width}" height="${demo.scenes[0]!.height}"></canvas><nav><button id="play">Phát</button><button id="reset">Về đầu</button><input id="seek" aria-label="Tua demo" type="range" min="0" step="1"><output id="clock"></output></nav><p>Bản xem trước chuyển động; chưa có lời kể.</p></main>
<script>
const demo=${json},paint=${imageMotionPainterScript()},canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),slider=document.getElementById('seek'),clock=document.getElementById('clock');
const totalMs=demo.scenes.reduce((sum,s)=>sum+s.durationMs,0);slider.max=totalMs;
const images=new Map();
window.ready=Promise.all([...new Set(demo.scenes.flatMap(s=>[s.original,s.background,...s.layers.map(l=>l.image),...(s.parts||[]).map(p=>p.image)]))].map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{images.set(src,i);resolve();};i.onerror=()=>reject(new Error('Cannot load '+src));i.src=src;}))).then(()=>window.renderFrame(0));
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
