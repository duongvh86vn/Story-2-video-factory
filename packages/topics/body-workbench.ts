import {escapeHtml} from '../core/utils.js';
import {hash} from '../core/utils.js';
import {BODY_VIEW_VERSION,bodyViewDescription} from '../animation/body-view-art.js';
import {ANIMATION_VERSION,HUNT_ANIMATION_VERSION,type PerformancePlan,type Mood} from '../animation/schemas.js';
import {performanceSvg,rigMetrics} from '../animation/rig.js';
import {samplePerformance,validatePerformance,bodyPoseAnchors} from '../animation/compiler.js';
import {namespaceRigSvg} from '../animation/svg-namespace.js';
import {referenceBodyDescription} from '../animation/forest-body-art.js';
import {referenceImageUrl} from '../animation/forest-head-art.js';
import {topicPreviewProfile} from './preview.js';
import {SOURCE_WALK_POSES} from '../animation/source-walk.js';
import {RUN_POSES,runStepCount} from '../animation/running.js';
import {spearSvg} from '../animation/spear.js';
export const BODY_ACTIONS=['rest','point','think','crouch','walk','walk-left','run','run-left','jump','hunt-stalk','spear-hold','spear-hold-left','spear-thrust','spear-thrust-left','spear-lunge','hunt-aim','hunt-chase','head-turn','sit-right','sit-left','sit-walk-right','sit-walk-left'] as const;
export const BODY_WORKBENCH_VIEWS=['source','three-quarter-right'] as const;
export type BodyWorkbenchView=typeof BODY_WORKBENCH_VIEWS[number];
const HUNT_ACTIONS=['run','run-left','jump','hunt-stalk','spear-hold','spear-hold-left','spear-thrust','spear-thrust-left','hunt-aim','hunt-chase'];
export type BodyAction=typeof BODY_ACTIONS[number];
export const bodyActionDuration=(action:BodyAction)=>action.startsWith('sit-walk-')?7200:action.startsWith('sit-')?5000:4000;
/** Random-access pose inspection through the same evaluator as scenes. This
 * page neither renders an episode nor establishes smooth-motion acceptance. */
export function bodyCalibrationPlan(actor:'lila'|'karo',action:BodyAction,mood:Mood,gestureHand:'left'|'right'='right',view:BodyWorkbenchView='source') {
  const source=topicPreviewProfile(actor),authored=view!=='source'||action==='spear-lunge';
  const profile=authored?{...source,appearance:{...source.appearance,artworkVersion:BODY_VIEW_VERSION,bodyView:'three-quarter-right' as const},profileHash:hash({source:source.profileHash,registration:bodyViewDescription.fingerprint})}:source,m=rigMetrics(profile);
  const sitting=action.startsWith('sit-'),durationMs=bodyActionDuration(action);
  const plan:PerformancePlan={version:22,compilerVersion:ANIMATION_VERSION,id:'body-calibration-'+actor,leadCharacterId:actor,profileHash:profile.profileHash,
    kind:'stick-man',durationMs,fps:60,stage:{width:430,height:440,groundY:410},root:{x:210,y:410},scale:1,
    walks:[],gestures:[],props:[],gazes:[],expressions:[{startMs:0,endMs:durationMs,mood}]};
  if(authored)plan.headView='three-quarter-right';
  if(action==='point'){
    if(!authored)delete plan.headView;
    const shoulder=m.shoulders![gestureHand];
    const chain=m.arms![gestureHand],reach=(chain.upper+chain.lower)*.75;
    plan.gestures=[{id:'point-target',action:'point',hand:gestureHand,startMs:300,endMs:3600,target:{x:210+shoulder.x+(gestureHand==='right'?reach:-reach),y:410+m.pelvisY+shoulder.y+16}}];
  }
  if(action==='think')plan.gestures=[{id:'think-source',action:'think',hand:gestureHand,startMs:300,endMs:3600}];
  if(action==='crouch')plan.postures=[{pose:'crouch',intensity:.6,startMs:300,endMs:1000},{pose:'stand',startMs:3000,endMs:3700}];
  if(action==='walk'||action==='walk-left'){delete plan.headView;plan.facing=action==='walk-left'?'left':'right';plan.walks=[{startMs:300,endMs:3600,fromX:210,toX:210+(action==='walk-left'?-55:55)}];}
  if(HUNT_ACTIONS.includes(action))plan.compilerVersion=HUNT_ANIMATION_VERSION;
  if(action==='run'||action==='run-left'||action==='hunt-chase'){
    delete plan.headView;const direction=action==='run-left'?-1:1;
    plan.facing=direction===1?'right':'left';plan.walks=[{startMs:300,endMs:2100,fromX:210,toX:210+direction*100,gait:'run'}];
  }
  if(action==='jump'){
    delete plan.headView;plan.jumps=[{startMs:400,takeoffMs:850,landingMs:1500,endMs:2000,height:24,tuck:.28}];
    plan.gestures=[{id:'jump-arm-response',action:'react',hand:'right',startMs:400,endMs:2000},{id:'jump-left-response',action:'react',hand:'left',startMs:400,endMs:2000}];
  }
  if(action==='hunt-stalk'){
    delete plan.headView;plan.facing='right';
    plan.postures=[{pose:'crouch',intensity:.28,leanDeg:8,startMs:300,endMs:800},{pose:'stand',startMs:1300,endMs:1600},
      {pose:'crouch',intensity:.28,leanDeg:8,startMs:2800,endMs:3200},{pose:'stand',startMs:3500,endMs:3900}];
    plan.walks=[{startMs:1700,endMs:2700,fromX:210,toX:228}];
    plan.gazes=[{startMs:300,endMs:3900,target:{x:360,y:315}}];
  }
  if(action.startsWith('spear-')||action==='hunt-aim'||action==='hunt-chase'){
    if(!authored)delete plan.headView;
    const direction=action.endsWith('-left')?-1:1,hand=direction===1?'right':'left',thrust=action.startsWith('spear-thrust')||action==='spear-lunge';
    plan.facing=direction===1?'right':'left';
    // A full-length spear needs a wider world, rather than shortening the tool
    // or cropping its stone tip. Neither direction mirrors the source clothes.
    plan.stage.width=820;if(direction===-1)plan.root.x=610;
    // Separate the supporting/drive hands and keep the front wrist ahead of
    // its shoulder. The former (24,50)/30-unit span crushed a reachable elbow
    // against the torso. Fit these frontal candidates to actual actor units.
    // The support hand stays ahead and the drive wrist stays near the torso.
    // Lower the shaft below the face, with enough span to open the rear elbow.
    // Both source arms retain their measured total length.
    const lunge=action==='spear-lunge';if(lunge)plan.compilerVersion=HUNT_ANIMATION_VERSION;
    const b=profile.appearance.bodyScale,length=m.height*1.2,offset=-length*(lunge?.04:.18),grip={x:65*direction*b,y:60*b};
    const shoulder=m.shoulders![hand],primary={x:plan.root.x+shoulder.x+grip.x,y:plan.root.y+m.pelvisY+shoulder.y+grip.y};
    const tipDistance=length/2-offset;
    const aim={x:primary.x+direction*(tipDistance+(thrust?8*b:0)),y:primary.y};
    const prop={id:'calibration-spear',origin:{...primary},attachedTo:`${hand}-hand` as 'left-hand'|'right-hand',kind:'spear' as const,length,gripOffset:{x:offset,y:0}};
    plan.props=[prop];plan.spears=[{id:'calibration-grip',propId:prop.id,hand,action:thrust?'thrust':'hold',
      startMs:0,endMs:durationMs,grip,aim,twoHands:true,secondaryOffset:-(lunge?170:100)*b,
      elbowPoles:{primary:direction===1?-1:1,secondary:direction===1?-1:1},
      ...(thrust?{readyMs:1200,contactMs:1800,recoverMs:2200}:{})}];
    if(lunge){
      plan.lunge={version:'forest-planted-lunge-1',spearId:plan.spears[0]!.id,
        soles:{left:{x:plan.root.x-60*b,y:plan.root.y},right:{x:plan.root.x+60*b,y:plan.root.y}},
        kneePoles:{left:1,right:1},advanceX:10*b,dropY:5*b,entryLeanDeg:9,contactLeanDeg:16};
      // Measure the entry shoulder through the shared evaluator after the
      // planted legs determine pelvis height. No guessed front shoulder clock.
      const body=bodyPoseAnchors(plan,profile,0),shoulder=body.shoulders.right,a=body.lean*Math.PI/180;
      const primary={x:shoulder.x+grip.x*Math.cos(a)-grip.y*Math.sin(a),y:shoulder.y+grip.x*Math.sin(a)+grip.y*Math.cos(a)};
      const axis=18*Math.PI/180;
      plan.spears[0]!.aim={x:primary.x+Math.cos(axis)*(tipDistance+16*b),y:primary.y+Math.sin(axis)*(tipDistance+16*b)};
    }
    if(action==='hunt-aim')plan.postures=[{pose:'crouch',intensity:.22,leanDeg:7,startMs:300,endMs:800},{pose:'stand',startMs:3000,endMs:3500}];
    if(action==='hunt-chase')plan.spears[0]!.aim={x:780,y:primary.y};
  }
  if(action==='head-turn')throw new Error('needs-head-view: authored source-faithful partner-facing heads are pending.');
  if(sitting){
    const direction=action.endsWith('-left')?-1:1;
    plan.facing=direction===1?'right':'left';
    plan.supports=[{id:'calibration-log',kind:'seat',facing:plan.facing,width:64,center:{
      x:plan.root.x-direction*((m.legs!.left.upper+m.legs!.right.upper)/2+(m.seatContactOffset?.x??0)),
      y:plan.root.y-(m.legs!.left.lower+m.legs!.right.lower)/2-(m.footSoleOffset!.left+m.footSoleOffset!.right)*profile.appearance.bodyScale/2-(m.hips!.left.y+m.hips!.right.y)/2+(m.seatContactOffset?.y??0)}}];
    plan.postures=[{pose:'seated',supportId:'calibration-log',startMs:300,endMs:1800},{pose:'stand',startMs:3000,endMs:4500}];
    if(action.startsWith('sit-walk-'))plan.walks=[{startMs:4600,endMs:6600,fromX:210,toX:210+direction*55}];
  }
  if(plan.spears?.length){
    const entry=samplePerformance(plan,profile,0,{method:'segment-draft',windowMs:20,intervals:[]});
    for(const prop of plan.props)prop.origin=entry.props[prop.id]!.point;
  }
  validatePerformance(plan,profile);
  return {profile,plan};
}
export function bodyCalibrationSvg(actor:'lila'|'karo',action:BodyAction,timeMs:number,mood:Mood,options:{hand?:'left'|'right';instance?:string;detail?:boolean;view?:BodyWorkbenchView}={}):string {
  const {profile,plan}=bodyCalibrationPlan(actor,action,mood,options.hand,options.view);
  const frame=samplePerformance(plan,profile,timeMs,{method:'segment-draft',windowMs:20,intervals:[]});
  let svg=performanceSvg(profile,'embedded',plan.props.filter(p=>p.kind==='spear').map(spearSvg).join(''));
  // Preserve opacity on hidden physical bones. Dropping it would draw straight
  // bones over the clothing and falsely show a second set of visible limbs.
  for(const [id,transform] of Object.entries(frame.transforms))svg=svg.replace(new RegExp('<g id="'+id+'"[^>]*>'),tag=>tag.replace(/\s+transform="[^"]*"/,'').replace('>',' transform="'+transform+'">'));
  for(const [id,d] of Object.entries(frame.paths??{}))svg=svg.replace(new RegExp('<path id="'+id+'"[^>]*/>'),tag=>tag.replace(/\s+d="[^"]*"/,' d="'+d+'"')
    .replace('/>',(id.startsWith('ink-')?' stroke-width="'+(profile.appearance.strokeWidth*profile.appearance.bodyScale)+'"':'')+'/>'));
  for(const [id,face] of Object.entries(frame.face))svg=svg.replace(new RegExp('<g id="'+id+'"[^>]*>'),'<g id="'+id+'"'+(face.opacity===undefined?'':' opacity="'+face.opacity+'"')
    +' transform="'+(face.attr?.transform??'translate('+(face.x??0)+' '+(face.y??0)+') rotate('+(face.rotation??0)+') scale('+(face.scaleX??1)+' '+(face.scaleY??1)+')')+'">');
  const target=plan.spears?.[0]?.aim??plan.gazes[0]?.target??plan.gestures[0]?.target,marker=target?'<circle cx="'+target.x+'" cy="'+target.y+'" r="7" fill="none" stroke="#aa5928" stroke-width="1"/>':'';
  const seat=plan.supports?.[0],log=seat?'<g fill="#9b5e2f" stroke="#372011" stroke-width="2"><rect x="'+(seat.center.x-seat.width/2)+'" y="'+seat.center.y+'" width="'+seat.width+'" height="'+(plan.stage.groundY-seat.center.y)+'" rx="12"/><path d="M'+(seat.center.x-23)+' '+(seat.center.y+10)+'q24 7 46 0m-46 18q23 -6 46 0" fill="none" stroke="#754323"/></g>':'';
  const spear=!!plan.spears?.length,viewport=options.detail?`${plan.root.x-130} 65 320 350`:spear?'0 35 820 405':'0 35 430 405';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+viewport+'" role="img" aria-label="'+actor+' '+action+' '+timeMs+'ms"><path d="M20 410H'+(plan.stage.width-20)+'" stroke="#bfa782" stroke-width="1"/>'+log+marker+namespaceRigSvg(svg,(options.instance??actor)+'-calibration-')+'</svg>';
}

export const ARM_AUDIT_GROUPS=['gestures','locomotion','spear','seated'] as const;
export type ArmAuditGroup=typeof ARM_AUDIT_GROUPS[number];
export type ArmAuditPhase='entry'|'pose'|'recover';
/** Read-only static developer workbench. Includes both hands and error cards;
 * it is not a video render or continuous-motion/runtime acceptance test. */
export function armAuditWorkbench(group:ArmAuditGroup,phase:ArmAuditPhase,mood:Mood):string {
  const groups:Record<ArmAuditGroup,BodyAction[]>={gestures:['rest','point','think','crouch','head-turn'],locomotion:['walk','walk-left','run','run-left','jump','hunt-stalk'],spear:['spear-hold','spear-hold-left','spear-thrust','spear-thrust-left','spear-lunge','hunt-aim','hunt-chase'],seated:['sit-right','sit-left','sit-walk-right','sit-walk-left']};
  const at=(action:BodyAction)=>action==='jump'?({entry:600,pose:1175,recover:1667})[phase]:action.startsWith('sit-')?({entry:800,pose:2200,recover:4500})[phase]:action.startsWith('spear-thrust')||action==='spear-lunge'?({entry:500,pose:1800,recover:3000})[phase]:({entry:500,pose:1600,recover:3500})[phase];
  const rows=groups[group].flatMap(action=>(action==='point'||action==='think'?['left','right'] as const:[undefined]).map(hand=>({action,hand,time:at(action)})));
  const cards=rows.map(({action,hand,time})=>`<section><h2>${escapeHtml(action+(hand?' · rig-'+hand:''))} · ${time} ms</h2><div class="pair">${(['lila','karo'] as const).map(actor=>{
    try {
      const {profile,plan}=bodyCalibrationPlan(actor,action,mood,hand),frame=samplePerformance(plan,profile,time,{method:'segment-draft',windowMs:20,intervals:[]}),base=actor+'-'+action+'-'+(hand??'default')+'-'+time;
      const numbers=(['left','right'] as const).map(side=>{const g=frame.armGeometry![side]!;return `${side}: ${g.role} · gập ${g.flexionDeg.toFixed(1)}° · tỷ lệ nét ${g.upperRatio.toFixed(2)}/${g.lowerRatio.toFixed(2)}`;}).join('<br>');
      const pair=Object.values(frame.spearGeometry??{})[0],pairText=pair?`<p>Grip ${pair.gripSpan.toFixed(1)} / tối thiểu ${pair.minimumSpan.toFixed(1)}; khuỷu sau theo trục cán ${pair.rearElbowAlong.toFixed(1)} (≤0).</p>`:'';
      return `<figure><h3>${actor}</h3>${bodyCalibrationSvg(actor,action,time,mood,{hand,instance:base})}${bodyCalibrationSvg(actor,action,time,mood,{hand,instance:base+'-detail',detail:true})}<figcaption>Chi tiết thân/tay phía dưới chủ ý cắt phần giáo ở xa.<p>${numbers}</p>${pairText}Pose tĩnh ứng viên; chưa đạt nghiệm thu motion.</figcaption></figure>`;
    }catch(error){return `<figure class="blocked"><h3>${actor}</h3><p>${escapeHtml(error instanceof Error?error.message:'Pose unavailable.')}</p><p>Pose bị chặn; không thay bằng hình giả hoặc tự nới constraint.</p></figure>`;}
  }).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rà soát hai tay — Lila/Karo</title><style>body{font:16px system-ui;background:#ece5d6;color:#362215;margin:24px}main{max-width:1100px;margin:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:#fff7e5;border-radius:14px;padding:16px}svg{width:100%;height:260px}figcaption{font-size:14px}.blocked{border:2px solid #b45032}label{display:inline-block;margin:12px}a{color:#65461b}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><main><h1>Rà soát hai tay theo vai trò</h1><p>Mốc 0.19. Cùng evaluator/rig với Studio; tư thế theo từng clock, không phải video nghiệm thu. Luôn giữ chiều dài xương, clock và contact; lỗi hình dáng bị chặn dù tay tới được target. Ứng viên 3/4 phải đã có đăng ký kỹ thuật và lunge; các góc khác, identity và motion còn chờ. Mặt happy giữ cutout nguồn; ảnh AI là study riêng.</p><form method="get"><label>Nhóm <select name="group">${ARM_AUDIT_GROUPS.map(g=>`<option${g===group?' selected':''}>${g}</option>`).join('')}</select></label><label>Giai đoạn <select name="phase">${['entry','pose','recover'].map(p=>`<option${p===phase?' selected':''}>${p}</option>`).join('')}</select></label><label>Biểu cảm <select name="mood">${['happy','angry','thinking','neutral'].map(m=>`<option${m===mood?' selected':''}>${m}</option>`).join('')}</select></label><button>Xem nhóm pose</button></form>${cards}<p><a href="/api/topics/prehistoric-life/body?action=hunt-aim&amp;timeMs=500&amp;mood=happy">Hiệu chỉnh clock riêng</a> · <a href="/api/topics/prehistoric-life/pose-art">Pose AI</a></p></main></html>`;
}
function workbenchPose(actor:'lila'|'karo',action:BodyAction,timeMs:number,mood:Mood,view:BodyWorkbenchView){
  try{return bodyCalibrationSvg(actor,action,timeMs,mood,{view})+(action.startsWith('spear-')||action==='hunt-aim'||action==='hunt-chase'?'<div id="'+actor+'-detail-view"><p>Chi tiết cơ thể / tay '+actor+' — ứng viên (cắt phần cán xa)</p>'+bodyCalibrationSvg(actor,action,timeMs,mood,{view,detail:true,instance:actor+'-detail'})+'</div>':'');}
  catch(error){return '<p role="status">'+escapeHtml(error instanceof Error?error.message:'Pose unavailable')+'</p><p>Pose bị chặn. Không đổi xương, clock hay dùng góc front để che lỗi.</p>';}
}
export function bodyWorkbench(action:BodyAction,timeMs:number,mood:Mood,view:BodyWorkbenchView='source'):string {
  const run=action==='run'||action==='run-left'||action==='hunt-chase'?bodyCalibrationPlan('karo',action,mood).plan.walks[0]:undefined;
  const actionPoses=action==='jump'?[{label:'Lấy đà',at:600},{label:'Rời đất',at:850},{label:'Đỉnh nhảy',at:1175},{label:'Tiếp đất',at:1500},{label:'Hấp thụ',at:1667}]:action.startsWith('spear-thrust')||action==='spear-lunge'?[{label:'Giữ',at:0},{label:'Lấy đà',at:1200},{label:'Đưa giáo',at:1500},{label:'Chạm target',at:1800},{label:'Thu giáo',at:3000}]:run?RUN_POSES.map(p=>({label:p.id,at:Math.round(300+1800/runStepCount(run,rigMetrics(topicPreviewProfile('karo')),1)*p.phase)})):[];
  const actionLinks=actionPoses.length?'<nav aria-label="Pose hành động">'+actionPoses.map(p=>'<a href="?action='+action+'&amp;timeMs='+p.at+'&amp;mood='+escapeHtml(mood)+'&amp;view='+view+'">'+escapeHtml(p.label)+' ('+p.at+' ms)</a>').join(' · ')+'</nav>':'';
  const poseLinks=action==='walk'||action==='walk-left'?'<nav aria-label="Pose bước đầu"><strong>Pose bước đầu: </strong>'+SOURCE_WALK_POSES.map(pose=>{
    const metrics=rigMetrics(topicPreviewProfile('karo')),steps=Math.max(2,Math.ceil(55/Math.max(8,metrics.upperLeg*.32))),at=Math.round(300+3300/steps*pose.phase);
    return '<a href="?action='+action+'&amp;timeMs='+at+'&amp;mood='+escapeHtml(mood)+'&amp;view='+view+'">'+escapeHtml(pose.label)+' ('+at+' ms)</a>';
  }).join(' · ')+'</nav>':'';
  const toolAction=action.startsWith('spear-')||action==='hunt-aim'||action==='hunt-chase';
  const cards=action==='head-turn'?'<section><h2>Góc đầu nhìn bạn diễn đang chờ artwork</h2><p>Đầu trên rig toàn thân đã trở về cutout đăng ký với cổ. Không dùng lại mesh yaw bị người dùng chê lệch mặt; các góc nhìn đúng identity còn phải dựng và review. Chọn động tác khác để xem body pose.</p></section>':(['lila','karo'] as const).map(actor=>'<section><h2>'+(actor==='lila'?'Lila':'Karo')+'</h2><div class="pair'+(toolAction?' tool-pair':'')+'"><figure><img alt="Ảnh gốc '+actor+'" src="'
    +referenceImageUrl('docs/topics/assets/reference-'+actor+'-full.png',actor==='lila'?'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce':'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2')+'"><figcaption>Ảnh gốc</figcaption></figure><figure>'+workbenchPose(actor,action,timeMs,mood,view)
    +'<figcaption>Rig từ cutout · '+escapeHtml(action)+' · '+timeMs+' ms</figcaption></figure></div></section>').join('');
  return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rig toàn thân Lila &amp; Karo</title><style>'
    +'body{margin:24px;background:#ece5d6;color:#362215;font:16px system-ui}main{max-width:1100px;margin:auto}section{background:#fff7e5;border-radius:16px;padding:20px;margin:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;text-align:center}img,svg{width:100%;height:490px;object-fit:contain}.tool-pair{grid-template-columns:minmax(130px,210px) minmax(0,1fr);align-items:center}.tool-pair img{height:350px}.tool-pair svg{height:440px}figcaption{padding:12px}form{display:flex;gap:14px;align-items:end;flex-wrap:wrap}label{display:grid;gap:4px}input,select,button{font:inherit;padding:8px}a{color:#65461b} @media(max-width:620px){.pair,.tool-pair{grid-template-columns:1fr}img,svg{height:410px}.tool-pair img{height:230px}}</style><main><h1>Rig toàn thân — bản hiệu chỉnh</h1>'
    +(view==='source'&&action!=='spear-lunge'?'<p>Thân nguồn: nét tay/chân liên tục qua khớp IK, giữ xương gốc; tay think và mitten cùng lớp trước cằm. Preset front giữ hai grip giáo cách 100 × bodyScale. Đây là ứng viên pose tĩnh, chưa nghiệm thu chuyển động.</p>':'')
    +'<p><strong>Mốc 0.19:</strong> đã đăng ký ứng viên 3/4 phải cho hai actor với cổ, vai, hông và lớp tay gần/xa; xương và mitten/sole giữ từ nguồn. Spear-lunge dùng sole trụ từ đầu shot, chuyển pelvis/lean theo clock giáo và cán chéo, grip rộng 170 × bodyScale. Mặt happy giữ nguyên; view mới chỉ hỗ trợ pose im lặng, áo còn rigid và chưa duyệt identity/motion. Ba luồng input sản xuất vẫn chờ rig được duyệt. <a href="?action=spear-lunge&amp;view=three-quarter-right&amp;timeMs=1800&amp;mood=happy">Xem ứng viên lunge 3/4</a>.</p>'
    +'<form method="get"><label>Góc thân<select name="view">'+BODY_WORKBENCH_VIEWS.map(v=>'<option value="'+v+'"'+(view===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label>Động tác<select name="action">'+BODY_ACTIONS.map(value=>'<option value="'+value+'"'+(action===value?' selected':'')+'>'+value+'</option>').join('')+'</select></label>'
    +'<label>Thời điểm (ms)<input type="number" name="timeMs" min="0" max="'+bodyActionDuration(action)+'" step="1" value="'+timeMs+'"></label><label>Biểu cảm<select name="mood">'
    +(['neutral','happy','thinking','angry'] as const).map(value=>'<option value="'+value+'"'+(mood===value?' selected':'')+'>'+value+'</option>').join('')+'</select></label><button>Xem pose</button></form>'
    +poseLinks+(view==='source'&&action!=='spear-lunge'?'<p>Walk dùng chân trụ trên nền và gối chiếu theo chiều sâu. Run/jump/seat là ứng viên hiệu chỉnh, chưa nghiệm thu video. <a href="/api/topics/prehistoric-life/arm-audit">Rà soát hai tay theo nhóm pose</a>.</p>':'')
    +actionLinks+'<p>Vòng tròn là target hiệu chỉnh. Cán và hai grip dùng cùng frame, mũi giáo tới target ở contact. Đây không phải cảnh săn thú đã nghiệm thu.</p>'
    +(toolAction?'<p>Giáo dài 1,2 lần chiều cao rig. Xương giữ nguyên chiều dài nguồn; tỷ lệ 52/48 là suy luận. <a href="/api/topics/prehistoric-life/view-registration">Xem landmark và mask của góc 3/4</a>. Lunge cần chuẩn bị stance trước đầu shot; áo góc mới vẫn rigid, chưa có motion acceptance.</p>':'')
    +(toolAction?'<nav><a href="#lila-detail-view">Chi tiết tay Lila</a> · <a href="#karo-detail-view">Chi tiết tay Karo</a></nav>':'')+cards+'<p><a href="/api/topics/prehistoric-life/pose-art">Pose từ AI</a> · <a href="/api/topics/prehistoric-life/heads">Lớp đầu cũ để đối chiếu</a> · <a href="/api/topics/prehistoric-life/body/manifest">Số đo / mask / trạng thái</a> · <a href="/api/topics/prehistoric-life/compare">Các ảnh mẫu</a></p></main></html>';
}
export const bodyWorkbenchManifest=referenceBodyDescription;
