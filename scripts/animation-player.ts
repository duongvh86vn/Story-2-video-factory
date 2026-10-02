/** Local inspection UI: seeks the production scene, does not implement a second animation engine. */
import Fastify from 'fastify';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PREVIEW_BRIDGE, withPreviewBridge } from '../apps/server/preview.js';
import { safeRealPath } from '../packages/core/utils.js';
const root=path.resolve('temp/animation-v22'),app=Fastify();
app.get('/',async(_,reply)=>reply.type('text/html').send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Diễn xuất V2.2</title><style>body{font:16px system-ui;margin:24px;background:#eee7da;color:#25313c}main{max-width:1280px;margin:auto}iframe{border:0;width:100%;aspect-ratio:16/9;background:#111}nav{display:flex;align-items:center;gap:12px;margin:16px 0;flex-wrap:wrap}button,select,input{font:inherit;padding:8px}p{margin:8px 0}</style></head><body><main><h1>Preview diễn xuất V2.2</h1><p>Benchmark chuyển động; chưa phải video kể chuyện hoàn chỉnh.</p><nav><label>Nhân vật <select id="host"><option value="stick-man">Người que</option><option value="mini-robot">Robot mini</option></select></label><label>Động tác <select id="variant"><option value="acting">Đi, quay, nhặt và đặt</option><option value="carry">Nhặt, cầm khi đi và đặt</option></select></label><label>Thời gian (ms) <input id="time" type="number" min="0" max="10000" step="1" value="0"></label><button id="seek">Tua tới</button><button id="play">Phát</button><button id="reset">Về đầu</button><output id="status" aria-live="polite">0 ms</output></nav><iframe title="Cảnh diễn xuất" src="/stick-man/scene/index.html"></iframe></main><script>
const frame=document.querySelector('iframe'),time=document.querySelector('#time'),status=document.querySelector('#status');let playing=false,last=0,position=0;
function seek(ms){position=Math.max(0,Math.min(10000,ms));time.value=Math.round(position);status.textContent=Math.round(position)+' ms';frame.contentWindow.postMessage({type:'studio:seek',timeMs:position},location.origin);}
document.querySelector('#seek').onclick=()=>{playing=false;seek(Number(time.value));};document.querySelector('#reset').onclick=()=>{playing=false;seek(0);};document.querySelector('#play').onclick=()=>{playing=!playing;last=performance.now();};
function selectClip(){playing=false;position=0;frame.src='/'+document.querySelector('#host').value+(document.querySelector('#variant').value==='carry'?'/carry':'')+'/scene/index.html';}
document.querySelector('#host').onchange=selectClip;document.querySelector('#variant').onchange=selectClip;
addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data.type==='studio:ready')seek(position);});
function tick(now){if(playing){seek(position+now-last);if(position>=10000)playing=false;}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
</script></body></html>`));
app.get('/preview-bridge.js',async(_,reply)=>reply.type('text/javascript').send(PREVIEW_BRIDGE));
app.get<{Params:{host:string;'*':string}}>('/:host/*',async(request,reply)=>{
  const params=request.params,relative=params['*'];
  const allowed=['index.html','style.css','scene.js','environment.png','vendor/gsap.min.js'].flatMap(file=>[`scene/${file}`,`carry/scene/${file}`]);
  if(!['stick-man','mini-robot'].includes(params.host)||!allowed.includes(relative))return reply.code(404).send();
  const file=await safeRealPath(root,`${params.host}/${relative}`),bytes=await fs.readFile(file);
  reply.type(relative.endsWith('.html')?'text/html':relative.endsWith('.css')?'text/css':relative.endsWith('.png')?'image/png':'text/javascript');
  return relative.endsWith('/index.html')?withPreviewBridge(bytes.toString('utf8')):bytes;
});
const port=Number(process.env.ANIMATION_PREVIEW_PORT??8842);await app.listen({host:'127.0.0.1',port});
console.log(`Animation preview: http://127.0.0.1:${port}`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void app.close());
