import type {HostProfile} from '../host/schemas.js';
import type {Mood,PerformancePlan} from '../animation/schemas.js';
import {ANIMATION_VERSION} from '../animation/schemas.js';
import {forestHeadSvg,referenceHeadDescription,FOREST_HEAD_VIEWS} from '../animation/forest-head-art.js';
import {samplePerformance} from '../animation/compiler.js';
import {namespaceRigSvg} from '../animation/svg-namespace.js';
import {topicAppearance} from './prehistoric-life.js';
import {hash,escapeHtml} from '../core/utils.js';

/** A face assembly inspection, not a narrated episode or motion acceptance. */
export function headCalibrationSvg(actor:'lila'|'karo',view:typeof FOREST_HEAD_VIEWS[number],mood:Mood,timeMs=600,mouth=false):string {
  const appearance={...topicAppearance(actor),artworkVersion:'forest-head-1' as const};
  const profile:HostProfile={id:actor,version:1,kind:'stick-man',role:'story-actor',name:actor,description:'Source head calibration only.',appearance,
    actions:['idle'],immutable:['identity'],profileHash:hash({actor,appearance}),compilerVersion:'head-calibration-1',sourcePath:'reference'};
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'head-calibration',leadCharacterId:actor,profileHash:profile.profileHash,
    kind:'stick-man',durationMs:4000,fps:60,stage:{width:320,height:440,groundY:400},root:{x:160,y:400},scale:1,
    headView:view,walks:[],gestures:[],props:[],gazes:[],expressions:[{startMs:0,endMs:4000,mood}]};
  const frame=samplePerformance(plan,profile,timeMs,{method:'segment-draft',windowMs:20,intervals:mouth?[{startMs:0,endMs:4000,level:.65}]:[]});
  let svg=forestHeadSvg(profile);
  for(const [id,face] of Object.entries(frame.face))svg=svg.replace(new RegExp('<g id="'+id+'"[^>]*>'),'<g id="'+id+'"'+(face.opacity===undefined?'':' opacity="'+face.opacity+'"')
    +' transform="'+(face.attr?.transform??'translate('+(face.x??0)+' '+(face.y??0)+') rotate('+(face.rotation??0)+') scale('+(face.scaleX??1)+' '+(face.scaleY??1)+')')+'">');
  const angle=frame.transforms.head!.match(/rotate\(([^)]+)\)/)![1];
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+actor+' '+view+' '+mood+'" viewBox="-125 -100 250 245"><g transform="rotate('+angle+')">'+namespaceRigSvg(svg,actor+'-'+view+'-')+'</g></svg>';
}
export function headWorkbench(mood:Mood,timeMs:number,mouth:boolean):string {
  const moods=['neutral','happy','thinking','surprised','sad','angry','afraid','relieved','tired'] as const;
  const cards=(['lila','karo'] as const).map(actor=>'<section><h2>'+ (actor==='lila'?'Lila':'Karo') +'</h2><div class="views">'
    +FOREST_HEAD_VIEWS.map(view=>'<figure>'+headCalibrationSvg(actor,view,mood,timeMs,mouth)+'<figcaption>'+ (view==='three-quarter-left'?'Nhìn sang trái':'Nhìn sang phải') +'</figcaption></figure>').join('')
    +'</div></section>').join('');
  return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lớp đầu Lila &amp; Karo</title><style>'
    +'body{margin:24px;background:#ece5d6;color:#362215;font:16px system-ui}main{max-width:1100px;margin:auto}section{background:#fff7e5;border-radius:16px;padding:16px;margin:16px 0}.views{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;text-align:center}svg{width:100%;height:380px}figcaption{padding:8px}h2{margin:0}form{display:flex;align-items:end;gap:16px;flex-wrap:wrap}label{display:grid;gap:5px}input,select,button{font:inherit;padding:8px}a{color:#65461b}.note{max-width:85ch} @media(max-width:620px){.views{grid-template-columns:1fr}svg{height:340px}}</style><main>'
    +'<h1>Lớp đầu và biểu cảm — bản nháp</h1><p class="note">Giữ màu da ấm, texture tóc/râu; mắt và chân mày lấy qua mask từ ảnh cận gốc. Hai góc là artwork riêng. Thời điểm dưới đây lấy từ cùng bộ đánh giá pose của renderer. Chuyển góc hiện là thay hình; chưa có chuyển đầu liên tục, rig toàn thân hoặc nghiệm thu video.</p>'
    +'<form method="get"><label>Biểu cảm<select name="mood">'+moods.map(value=>'<option value="'+value+'"'+(value===mood?' selected':'')+'>'+escapeHtml(value)+'</option>').join('')+'</select></label>'
    +'<label>Thời điểm (ms)<input type="number" name="timeMs" value="'+timeMs+'" min="0" max="4000" step="20"></label>'
    +'<label><span>Miệng giả lập, chưa có audio</span><input type="checkbox" name="mouth" value="1"'+(mouth?' checked':'')+'></label><button type="submit">Xem biểu cảm</button></form>'
    +cards+'<p><a href="/api/topics/prehistoric-life/compare?variant=assembly">Đối chiếu toàn thân với ảnh gốc</a> · <a href="/api/topics/prehistoric-life/heads/manifest">Manifest lớp đầu</a></p></main></html>';
}
export const headWorkbenchManifest=referenceHeadDescription;
