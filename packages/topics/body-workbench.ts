import {escapeHtml} from '../core/utils.js';
import {ANIMATION_VERSION,type PerformancePlan,type Mood} from '../animation/schemas.js';
import {performanceSvg,rigMetrics} from '../animation/rig.js';
import {samplePerformance,validatePerformance} from '../animation/compiler.js';
import {namespaceRigSvg} from '../animation/svg-namespace.js';
import {referenceBodyDescription} from '../animation/forest-body-art.js';
import {referenceImageUrl} from '../animation/forest-head-art.js';
import {topicPreviewProfile} from './preview.js';
import {SOURCE_WALK_POSES} from '../animation/source-walk.js';
export const BODY_ACTIONS=['rest','point','think','crouch','walk','walk-left','head-turn','sit-right','sit-left','sit-walk-right','sit-walk-left'] as const;
export type BodyAction=typeof BODY_ACTIONS[number];
export const bodyActionDuration=(action:BodyAction)=>action.startsWith('sit-walk-')?7200:action.startsWith('sit-')?5000:4000;
/** Random-access pose inspection through the same evaluator as scenes. This
 * page neither renders an episode nor establishes smooth-motion acceptance. */
export function bodyCalibrationPlan(actor:'lila'|'karo',action:BodyAction,mood:Mood) {
  const profile=topicPreviewProfile(actor),m=rigMetrics(profile),view=actor==='lila'?'three-quarter-right':'three-quarter-left';
  const sitting=action.startsWith('sit-'),durationMs=bodyActionDuration(action);
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'body-calibration-'+actor,leadCharacterId:actor,profileHash:profile.profileHash,
    kind:'stick-man',durationMs,fps:60,stage:{width:430,height:440,groundY:410},root:{x:210,y:410},scale:1,
    headView:view,walks:[],gestures:[],props:[],gazes:[],expressions:[{startMs:0,endMs:durationMs,mood}]};
  if(action==='point'){
    delete plan.headView;
    plan.gestures=[{id:'point-target',action:'point',hand:'right',startMs:300,endMs:3600,target:{x:210+m.shoulderOffset+68,y:410+m.shoulderY+16}}];
  }
  if(action==='think')plan.gestures=[{id:'think-source',action:'think',hand:'right',startMs:300,endMs:3600}];
  if(action==='crouch')plan.postures=[{pose:'crouch',intensity:.6,startMs:300,endMs:1000},{pose:'stand',startMs:3000,endMs:3700}];
  if(action==='walk'||action==='walk-left'){delete plan.headView;plan.facing=action==='walk-left'?'left':'right';plan.walks=[{startMs:300,endMs:3600,fromX:210,toX:210+(action==='walk-left'?-55:55)}];}
  if(action==='head-turn')plan.headTurns=[{startMs:300,endMs:1500,direction:actor==='lila'?'three-quarter-left':'three-quarter-right'}];
  if(sitting){
    const direction=action.endsWith('-left')?-1:1;
    plan.facing=direction===1?'right':'left';plan.headView=direction===1?'three-quarter-right':'three-quarter-left';
    plan.supports=[{id:'calibration-log',kind:'seat',facing:plan.facing,width:64,center:{
      x:plan.root.x-direction*((m.legs!.left.upper+m.legs!.right.upper)/2+(m.seatContactOffset?.x??0)),
      y:plan.root.y-(m.legs!.left.lower+m.legs!.right.lower)/2-(m.footSoleOffset!.left+m.footSoleOffset!.right)*profile.appearance.bodyScale/2-(m.hips!.left.y+m.hips!.right.y)/2+(m.seatContactOffset?.y??0)}}];
    plan.postures=[{pose:'seated',supportId:'calibration-log',startMs:300,endMs:1800},{pose:'stand',startMs:3000,endMs:4500}];
    if(action.startsWith('sit-walk-'))plan.walks=[{startMs:4600,endMs:6600,fromX:210,toX:210+direction*55}];
  }
  validatePerformance(plan,profile);
  return {profile,plan};
}
export function bodyCalibrationSvg(actor:'lila'|'karo',action:BodyAction,timeMs:number,mood:Mood):string {
  const {profile,plan}=bodyCalibrationPlan(actor,action,mood),sitting=action.startsWith('sit-');
  const frame=samplePerformance(plan,profile,timeMs,{method:'segment-draft',windowMs:20,intervals:[]});
  let svg=performanceSvg(profile);
  // Preserve opacity on hidden physical bones. Dropping it would draw straight
  // bones over the clothing and falsely show a second set of visible limbs.
  for(const [id,transform] of Object.entries(frame.transforms))svg=svg.replace(new RegExp('<g id="'+id+'"[^>]*>'),tag=>tag.replace(/\s+transform="[^"]*"/,'').replace('>',' transform="'+transform+'">'));
  for(const [id,d] of Object.entries(frame.paths??{}))svg=svg.replace(new RegExp('<path id="'+id+'"[^>]*/>'),tag=>tag.replace(/\s+d="[^"]*"/,' d="'+d+'"')
    .replace('/>',(id.startsWith('ink-')?' stroke-width="'+(profile.appearance.strokeWidth*profile.appearance.bodyScale)+'"':'')+'/>'));
  for(const [id,face] of Object.entries(frame.face))svg=svg.replace(new RegExp('<g id="'+id+'"[^>]*>'),'<g id="'+id+'"'+(face.opacity===undefined?'':' opacity="'+face.opacity+'"')
    +' transform="'+(face.attr?.transform??'translate('+(face.x??0)+' '+(face.y??0)+') rotate('+(face.rotation??0)+') scale('+(face.scaleX??1)+' '+(face.scaleY??1)+')')+'">');
  const target=plan.gestures[0]?.target,marker=target?'<circle cx="'+target.x+'" cy="'+target.y+'" r="7" fill="none" stroke="#aa5928" stroke-width="1"/>':'';
  const seat=plan.supports?.[0],log=seat?'<g fill="#9b5e2f" stroke="#372011" stroke-width="2"><rect x="'+(seat.center.x-seat.width/2)+'" y="'+seat.center.y+'" width="'+seat.width+'" height="'+(plan.stage.groundY-seat.center.y)+'" rx="12"/><path d="M'+(seat.center.x-23)+' '+(seat.center.y+10)+'q24 7 46 0m-46 18q23 -6 46 0" fill="none" stroke="#754323"/></g>':'';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(sitting?'20 60 390 360':'105 60 230 360')+'" role="img" aria-label="'+actor+' '+action+' '+timeMs+'ms"><path d="M20 410H410" stroke="#bfa782" stroke-width="1"/>'+log+marker+namespaceRigSvg(svg,actor+'-calibration-')+'</svg>';
}
export function bodyWorkbench(action:BodyAction,timeMs:number,mood:Mood):string {
  const poseLinks=action==='walk'||action==='walk-left'?'<nav aria-label="Pose bước đầu"><strong>Pose bước đầu: </strong>'+SOURCE_WALK_POSES.map(pose=>{
    const metrics=rigMetrics(topicPreviewProfile('karo')),steps=Math.max(2,Math.ceil(55/Math.max(8,metrics.upperLeg*.32))),at=Math.round(300+3300/steps*pose.phase);
    return '<a href="?action='+action+'&amp;timeMs='+at+'&amp;mood='+escapeHtml(mood)+'">'+escapeHtml(pose.label)+' ('+at+' ms)</a>';
  }).join(' · ')+'</nav>':'';
  const cards=(['lila','karo'] as const).map(actor=>'<section><h2>'+(actor==='lila'?'Lila':'Karo')+'</h2><div class="pair"><figure><img alt="Ảnh gốc '+actor+'" src="'
    +referenceImageUrl('docs/topics/assets/reference-'+actor+'-full.png',actor==='lila'?'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce':'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2')+'"><figcaption>Ảnh gốc</figcaption></figure><figure>'+bodyCalibrationSvg(actor,action,timeMs,mood)
    +'<figcaption>Rig từ cutout · '+escapeHtml(action)+' · '+timeMs+' ms</figcaption></figure></div></section>').join('');
  return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rig toàn thân Lila &amp; Karo</title><style>'
    +'body{margin:24px;background:#ece5d6;color:#362215;font:16px system-ui}main{max-width:1100px;margin:auto}section{background:#fff7e5;border-radius:16px;padding:20px;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;text-align:center}img,svg{width:100%;height:490px;object-fit:contain}figcaption{padding:12px}form{display:flex;gap:14px;align-items:end;flex-wrap:wrap}label{display:grid;gap:4px}input,select,button{font:inherit;padding:8px}a{color:#65461b} @media(max-width:620px){.pair{grid-template-columns:1fr}img,svg{height:410px}}</style><main><h1>Rig toàn thân — bản hiệu chỉnh</h1>'
    +'<p>Trang phục, bàn tay và bàn chân giữ texture/nét nguồn. Luồng ngồi dùng các điểm UV tương ứng và một đường bao vải đục, liên tục từ đứng đến ngồi và đứng lại; chỉ texture/nếp bên trong chuyển giữa source và artwork bổ sung. Thân áo che đường cắt trên của vải. Vải dưới eo theo từng đùi với độ trễ 100 ms; eo được ghim và ảnh hưởng giảm dần khi ngồi. Karo dùng artwork hai miệng ống quần có viền đen riêng. Cả luồng đi thông thường cũng dùng bề mặt eo ghim; hai panel xoay riêng được ẩn để không mở khe ở eo. Tổng chiều dài chân được giữ, vị trí gối không có trong ảnh nên phân bổ đùi/cẳng chân gần 52/48. Điểm tựa mông nằm dưới/sau dây lưng, giữ trên support khi nghiêng thân. Sit-left/right: thu chân, ngồi 300–1800 ms, giữ, đứng 3000–4500 ms rồi mở chân. Sit-walk thêm bước 4600–6600 ms để kiểm vạt sau khi đứng. Head-turn hiện dùng một lớp đầu biến dạng liên tục trong góc giới hạn, chính diện ở 900 ms. Đây là bản thử; review trước sửa mắt chưa đạt. Đây là ảnh pose tĩnh; texture, anatomy và độ mượt chưa nghiệm thu video. Góc thân nghiêng/lưng và các lớp tóc/râu còn thiếu.</p>'
    +'<form method="get"><label>Động tác<select name="action">'+BODY_ACTIONS.map(value=>'<option value="'+value+'"'+(action===value?' selected':'')+'>'+value+'</option>').join('')+'</select></label>'
    +'<label>Thời điểm (ms)<input type="number" name="timeMs" min="0" max="'+bodyActionDuration(action)+'" step="20" value="'+timeMs+'"></label><label>Biểu cảm<select name="mood">'
    +(['neutral','happy','thinking','angry'] as const).map(value=>'<option value="'+value+'"'+(mood===value?' selected':'')+'>'+value+'</option>').join('')+'</select></label><button>Xem pose</button></form>'
    +poseLinks+'<p>Walk v2: pose chuyển lực → rời đất → đưa chân qua → đặt chân → nhận lực. Bước ngắn nhấc thấp theo quãng chân thực, chân trụ cố định trên nền; hông dịch nhỏ về chân trụ. Gối front gập theo chiều sâu, giữ chiều dài xương trong XYZ; độ dài hiện trên ảnh ngắn lại do phép chiếu. Không vẽ toàn bộ độ gập sang bên thành chân vòng kiềng. Khi ngồi, mặt phẳng gập chuyển liên tục theo support. Tay đánh theo tốc độ. Đây là geometry suy luận và bước ngang của thân front, chưa có dáng đi profile, rig 3D đầy đủ hoặc nghiệm thu độ mượt.</p>'
    +cards+'<p><a href="/api/topics/prehistoric-life/heads">Lớp đầu</a> · <a href="/api/topics/prehistoric-life/body/manifest">Số đo / mask / trạng thái</a> · <a href="/api/topics/prehistoric-life/compare">Các ảnh mẫu</a></p></main></html>';
}
export const bodyWorkbenchManifest=referenceBodyDescription;
