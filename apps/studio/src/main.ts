import './style.css';
import { api, projectUrl, staticUrl, RequestError } from './api.js';
import { translator, type Locale, type TextKey } from './i18n.js';
import type { ArtifactDocument, ProjectDetail, ProjectSummary, SceneDocument,VoiceCatalog } from '../../server/contracts.js';
import { SceneTypes, States, TransitionTypes, type Shot, type Storyboard, type ProjectStatus } from '../../../packages/core/schemas.js';
import { EXPLAINER_RECIPES } from '../../../packages/explainer/recipes.js';
import { Moods, type Mood } from '../../../packages/animation/schemas.js';
import { cinematicReview } from './cinematic.js';
import type {ActorDefinition} from '../../../packages/actors/schemas.js';
import { NARRATION_LANGUAGES,primaryLanguage } from '../../../packages/core/languages.js';

type Tab = 'inspector' | 'source' | 'narration' | 'storyboard' | 'scene' | 'characters' | 'reports' | 'logs';
type Mode = 'composition' | 'draft' | 'final';
const app = window.document.querySelector<HTMLDivElement>('#app')!;
const modal = window.document.querySelector<HTMLDialogElement>('#modal')!;
let locale: Locale = localStorage.getItem('story-factory.locale') === 'en' ? 'en' : 'vi';
let t = translator(locale);
let projects: ProjectSummary[] = [], project: ProjectDetail | undefined;
let tab: Tab = 'inspector', mode: Mode = 'composition', shotId = '', filter = '', chapterId = '';
let clock = 0, playing = false, lastFrame = 0, dirty = false, pending = false;
let muted = false;
let document: ArtifactDocument | undefined, scene: SceneDocument | undefined;
let inspectedBoard: ArtifactDocument<Storyboard> | undefined;
let editorGeneration = 0, previewShotId = '', pollBusy = false;
let until: ProjectStatus = 'DONE';
let setupMode:'script'|'wav'|'srt'='script',scriptRevision='new',scriptFormat:'txt'|'md'='txt';
let setupSnapshot:Pick<ProjectDetail,'name'|'settings'>|null=null;
let setupVoices:VoiceCatalog={windows:{status:'unavailable',voices:[]},profiles:{}};
let actorSnapshot:{name:string;id:string;revision:string}|null=null;
const v=(vi:string,en:string):string=>locale==='vi'?vi:en;
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (ms: number): string => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${(ms / 1000 % 60).toFixed(1).padStart(4, '0')}`;
const trStage = (stage: string): string => t(`stage${stage}` as TextKey);
const selected = (): Shot | undefined => project?.artifacts.storyboard?.shots.find(s => s.id === shotId);
const shots = (): Shot[] => project?.artifacts.storyboard?.shots ?? [];
const duration = (): number => project?.artifacts.narration?.durationMs ?? shots().at(-1)?.endMs ?? 1;
const locked = (shot: Shot): boolean => Boolean(project?.locked.storyboard || (project?.locked[shot.id] ?? project?.locked[`shot:${shot.id}`] ?? shot.locked));
const btn = (action: string, label: string, extra = '', className = ''): string => `<button type="button" class="${className}" data-action="${action}" ${extra}>${esc(label)}</button>`;
const options = (values: readonly string[], value: string, names?: (s: string) => string): string => values.map(v => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(names ? names(v) : v)}</option>`).join('');
const field = (name: string, label: string, value: unknown, type = 'text'): string => `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'step="0.001" min="0"' : ''}></label>`;
const text = (name: string, label: string, value: string): string => `<label>${esc(label)}<textarea name="${name}" rows="3">${esc(value)}</textarea></label>`;
function notice(message: string, error = false): void {
  const target = window.document.querySelector(error ? '#alerts' : '#notifications')!;
  if (error) target.classList.remove('sr-only');
  target.textContent = message;
  window.setTimeout(() => { if (target.textContent === message) { target.textContent = ''; if (error) target.classList.add('sr-only'); } }, error ? 12000 : 4500);
}
function report(error: unknown): void {
  const known: Record<string, TextKey> = { REVISION_CONFLICT: 'conflict', LOCKED: 'lockedError', PROJECT_BUSY: 'busyError' };
  const message = error instanceof RequestError ? (known[error.code] ? t(known[error.code]!) : `${error.message}${error.issues.length ? '\n' + error.issues.map(i => `${i.path}: ${i.message}`).join('\n') : ''}`) : error instanceof SyntaxError ? t('invalidJson') : error instanceof Error ? error.message : t('requestFailed');
  notice(message, true);
}
function leaveEditor(): boolean { return !dirty || window.confirm(t('discard')); }
function empty(title: string, help = ''): string { return `<div class="empty"><span class="empty-mark">◇</span><h2>${esc(title)}</h2><p>${esc(help)}</p></div>`; }
function render(): void {
  const p = project, shot = selected();
  playing=false;
  for(const media of window.document.querySelectorAll<HTMLMediaElement>('video,audio'))media.pause();
  window.document.documentElement.lang = locale;
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="/">STORY<span>FACTORY</span><i>●</i></a><div class="sidebar-label">${t('projects')} ${btn('create', '+', `aria-label="${t('newProject')}"`, 'icon')}</div><div class="project-list">${projects.map(item => `<button class="project-item ${item.name === p?.name ? 'active' : ''}" data-project="${esc(item.name)}"><span class="project-dot ${item.busy ? 'pulse' : ''}"></span><span>${esc(item.name)}<small>${trStage(item.state)}</small></span></button>`).join('') || `<p class="muted">${t('emptyProjects')}</p>`}</div><div class="sidebar-footer"><span>${t('local')}</span><select id="locale" aria-label="${t('language')}">${options(['vi','en'], locale, v => v === 'vi' ? 'Tiếng Việt' : 'English')}</select></div></aside>
  <main id="workspace" tabindex="-1">${!p ? `<section class="welcome"><p class="eyebrow">STORY → VIDEO</p><h1>${t('welcome')}</h1><p class="lede">${t('welcomeHelp')}</p>${btn('create', t('newProject'), '', 'primary')}<div class="welcome-steps">${(['input','board','deliver'] as const).map((k,i) => `<article><b>0${i+1}</b><h3>${t(`${k}Step`)}</h3><p>${t(`${k}Help`)}</p></article>`).join('')}</div></section>` : `
  <header class="project-header"><div><p class="eyebrow">${t('studio')} / ${trStage(p.state)}</p><h1>${esc(p.name)}</h1></div><div class="header-actions">${btn('setup',v('Nội dung · Diễn viên · Giọng','Input · Actors · Voice'),p.busy?'disabled':'')}${btn('upload', t('inputs'))}${btn('refresh', '↻', `aria-label="${t('refresh')}"`, 'icon')}<label class="run-select">${t('stopAfter')}<select id="until" ${p.busy ? 'disabled' : ''}>${options(States.filter(s => s !== 'NEW'), until, trStage)}</select></label>${btn('run', p.busy ? t('running') : v('Tạo video','Create video'), p.busy || pending ? 'disabled' : '', 'primary')}</div></header>
  <section class="explainer-status"><label class="presentation-select">${v('Phong cách trình bày','Presentation style')}<select id="presentation-style" ${p.busy||pending||p.settings.contentMode==='legacy'?'disabled':''}>${options(['diagram','story-cinematic'],p.settings.presentation.mode,k=>k==='diagram'?v('Sơ đồ (diagram)','Diagram'):v('Câu chuyện và diễn xuất (story-cinematic)','Story and performance (story-cinematic)'))}</select></label><span>${esc(p.settings.input.mode)} · ${esc(p.artifacts['host-profile']?.name ?? (p.settings.host.profile.includes('STICK-MAN')?v('Người que','Stick man'):v('Robot mini','Mini robot')))}</span><span>${v('Giọng','Voice')}: ${esc(p.artifacts['voice-report']?.status ?? v('Chưa tạo','Not created'))}</span>${p.waitingFor==='host-approval'?btn('approve-host',v('Duyệt host và tiếp tục','Approve host and continue'),p.busy?'disabled':''):''}${p.waitingFor==='voice'?btn('setup',v('Cấu hình giọng kể','Configure voice')):''}</section>
  <section class="production-status"><div class="progress"><span style="width:${p.progress.percent}%"></span></div><span>${p.progress.percent}% · ${trStage(p.state)}</span><span class="muted">${p.busy ? t('stopHint') : t('runHint')}</span></section>${p.job?.error || p.error ? `<p class="job-error" role="status">${esc(p.job?.error || p.error)}</p>${/model|provider|Codex CLI|Claude CLI/i.test(p.job?.error||p.error||'')?`<div class="model-retry">${btn('retry-model',v('Thử lại yêu cầu model đã lỗi','Retry failed model requests'),p.busy||pending?'disabled':'')}<p class="muted">${v('Dùng sau khi dịch vụ đã sẵn sàng hoặc bạn đã sửa cấu hình. Lần gọi mới vẫn tính vào giới hạn; lịch sử lỗi được giữ.','Use after the service is ready or its configuration is fixed. New calls count toward the limits; failure history is retained.')}</p></div>`:''}` : ''}
  ${p.cinematicMigration?.required?`<p class="job-error" role="status">${v('Kế hoạch diễn xuất thuộc phiên bản cũ. Bấm Tạo video để dựng lại; giọng kể còn hợp lệ được giữ nguyên.','The performance plan uses an earlier renderer. Click Create video to rebuild; valid narration is preserved.')} ${p.cinematicMigration.lockedShotIds.length?v('Các cảnh đã khóa cần được bạn mở khóa hoặc dùng lại renderer cũ:','Locked shots need an explicit unlock or their original renderer:')+' '+p.cinematicMigration.lockedShotIds.map(esc).join(', '):''}</p>`:''}
  <div class="desk"><section class="shot-panel"><div class="section-title"><h2>${t('shots')}</h2><span>${shots().length.toString().padStart(2,'0')}</span></div><input id="shot-filter" type="search" placeholder="${t('findShot')}" value="${esc(filter)}" aria-label="${t('findShot')}"><select id="chapter-filter" aria-label="${t('chapters')}"><option value="">${t('allChapters')}</option>${(p.artifacts.chapters ?? []).map(c => `<option value="${esc(c.id)}" ${c.id === chapterId ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select><div id="shot-list">${shotList()}</div></section>
  <section class="editing-area"><div class="preview-heading"><span class="eyebrow">${t('preview')}</span><select id="preview-mode" aria-label="${t('previewMode')}">${options(['composition','draft','final'], mode, v => t(v as TextKey))}</select></div><div id="preview" class="preview"></div><div class="transport">${btn('previous', '‹', `aria-label="${t('previous')}"`, 'icon')}${btn('play', playing ? 'Ⅱ' : '▶', `aria-label="${t(playing ? 'pause' : 'play')}"`, 'icon')}${btn('next', '›', `aria-label="${t('next')}"`, 'icon')}<output id="playhead">${fmt(clock)}</output><span>/ ${fmt(duration())}</span><span class="current-shot">${esc(shot?.id ?? '')}</span></div><section class="timeline"><div class="section-title"><h2>${t('timeline')}</h2><span>${shots().length} ${t('shots')}</span></div><div class="timeline-shots">${shots().map((s,i) => `<button data-shot="${esc(s.id)}" title="${esc(`${s.id} · ${s.subject}`)}" style="flex:${Math.max(1,s.endMs-s.startMs)}" class="${s.id === shotId ? 'selected' : ''}">${i+1}</button>`).join('')}</div><input id="scrub" type="range" min="0" max="${duration()}" step="1" value="${clock}" aria-label="${t('scrub')}"><div class="narration-line" id="narration-line"></div></section></section></div>
  <section class="document-panel"><nav class="tabs" aria-label="${t('editJson')}">${(['inspector','source','narration','storyboard','scene','characters','reports','logs'] as Tab[]).map(k => `<button data-tab="${k}" class="${tab === k ? 'active' : ''}" aria-current="${tab === k ? 'page' : 'false'}">${t(k)}</button>`).join('')}<span id="dirty" class="dirty">${dirty ? t('dirty') : ''}</span></nav><div id="editor" class="editor-body"></div></section>`}</main></div>`;
  if (p) { renderPreview(); updateClock(); void loadEditor().catch(report); }
}
function shotList(): string {
  const chapter = project?.artifacts.chapters?.find(c => c.id === chapterId);
  const rows = shots().filter(s => (!filter || `${s.id} ${s.subject} ${s.sceneType}`.toLowerCase().includes(filter.toLowerCase())) && (!chapter || s.startMs < chapter.endMs && s.endMs > chapter.startMs));
  return rows.map(s => `<button class="shot-item ${s.id === shotId ? 'selected' : ''}" data-shot="${esc(s.id)}"><span class="shot-index">${String(shots().indexOf(s)+1).padStart(2,'0')}</span><span><b>${esc(s.subject)}</b><small>${esc(s.sceneType)} · ${((s.endMs-s.startMs)/1000).toFixed(1)}s</small></span><i>${locked(s) ? '●' : '↗'}</i></button>`).join('') || empty(shots().length ? t('noMatches') : t('noShots'), shots().length ? '' : t('noShotsHelp'));
}
function renderPreview(): void {
  const box = window.document.querySelector('#preview'); if (!box || !project) return;
  const shot = selected(); previewShotId = shot?.id ?? '';
  const url = mode === 'composition' ? shot ? project.preview.shots[shot.id]?.composition : null : project.preview[mode];
  box.innerHTML = !url ? empty(t('noPreview'),t('noPreviewHelp')) : mode === 'composition' ? `<iframe id="scene-preview" title="${esc(shot?.subject ?? t('preview'))}" sandbox="allow-scripts" src="${esc(url)}"></iframe>` : `<video id="film-preview" controls playsinline preload="metadata" src="${esc(url)}"></video>`;
  const video = window.document.querySelector<HTMLVideoElement>('#film-preview');
  video?.addEventListener('timeupdate', () => { if (!dirty) { clock = Math.round(video.currentTime * 1000); updateClock(false); } });
  video?.addEventListener('ended', () => { playing = false; });
  video?.addEventListener('loadedmetadata', () => { video.currentTime = Math.min(clock/1000, video.duration); });
  let voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');
  const voiced=project.artifacts['voiced-narration']??project.artifacts.narration;
  if(mode==='composition' && voiced?.audioPath) {
    if(!voice){voice=window.document.createElement('audio');voice.id='narration-preview';voice.preload='metadata';voice.src=staticUrl(project.name,voiced.audioPath);window.document.querySelector('.transport')?.append(voice);}
    voice.muted=muted;
    if(!window.document.querySelector('[data-action="mute"]'))window.document.querySelector('.transport')?.insertAdjacentHTML('beforeend',btn('mute',muted?'♪×':'♪',`aria-label="${t(muted?'unmute':'mute')}"`,'icon'));
  }else if(voice){voice.pause();voice.remove();window.document.querySelector('[data-action="mute"]')?.remove();}
}
function updateClock(seek = true): void {
  const shot = selected(), output = window.document.querySelector('#playhead'), scrub = window.document.querySelector<HTMLInputElement>('#scrub');
  if (output) output.textContent = fmt(clock); if (scrub) scrub.value = String(clock);
  const narration = project?.artifacts.narration?.segments.find(s => s.startMs <= clock && s.endMs > clock);
  const line = window.document.querySelector('#narration-line'); if (line) line.textContent = narration?.text ?? '';
  if (!seek) return;
  window.document.querySelector<HTMLIFrameElement>('#scene-preview')?.contentWindow?.postMessage({ type: 'studio:seek', timeMs: Math.max(0, clock-(shot?.startMs ?? 0)) }, '*');
  const video = window.document.querySelector<HTMLVideoElement>('#film-preview');
  if (video && Number.isFinite(video.duration) && Math.abs(video.currentTime-clock/1000) > .2) video.currentTime = Math.min(clock/1000, video.duration);
  const voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');
  if(voice&&Number.isFinite(voice.duration)&&Math.abs(voice.currentTime-clock/1000)>.2)voice.currentTime=Math.min(clock/1000,voice.duration);
}
function chooseShot(id: string): void {
  if (id === shotId || !leaveEditor()) return;
  dirty = false; shotId = id; clock = selected()?.startMs ?? 0; document = undefined; scene = undefined;
  render();
}
function markDirty(): void { dirty = true; const tag = window.document.querySelector('#dirty'); if (tag) tag.textContent = t('dirty'); }
function panelIntro(title: string, help: string, actions = ''): string { return `<div class="panel-intro"><div><h2>${esc(title)}</h2><p>${esc(help)}</p></div><div class="panel-actions">${actions}</div></div>`; }
function actorCastPanel(shot:Shot):string{
  const scene=shot.cinematic?.actorScene;if(!scene)return '';
  const p=project!,actors=[...(scene.primary?[{character:scene.primary,speakingSegmentIds:scene.speakingSegmentIds}]:[]),...scene.supporting];
  const cast=p.artifacts['actor-cast'] as {actors?:Array<{character?:{id?:string};assetPath?:string;previewPath?:string;lockKey?:string}>}|undefined;
  const current=p.cinematicArtifacts['actor-cast.json']?.status==='current';
  return `<section class="actor-cast"><h3>${v('Diễn viên trong cảnh','Actors in this scene')}</h3><p>${scene.continuity==='cut'?v('Cắt sang tình huống mới','Cut to a new situation'):v('Hành động liên tục','Continuous action')}</p>${actors.length?`<div class="actor-cards">${actors.map(actor=>{
    const reference=current?cast?.actors?.find(a=>a.character?.id===actor.character.id):undefined;
    const blocked=p.busy||p.cinematicMigration?.required||p.locked.storyboard||!!reference?.lockKey&&p.locked[reference.lockKey]||shots().some(s=>locked(s)&&(s.cinematic?.actorScene?.primary?.id===actor.character.id||s.cinematic?.actorScene?.supporting.some(a=>a.character.id===actor.character.id)));
    return `<article>${reference?.assetPath?`<img src="${esc(staticUrl(p.name,reference.assetPath))}" alt="${esc(actor.character.name)}">`:''}<h4>${esc(actor.character.name)}</h4><p>${esc(actor.character.role)}</p><small>${actor.character.identity==='historical'?v('Vai lịch sử · tạo hình cách điệu','Historical role · stylized illustration'):v('Vai minh họa','Illustrative role')}</small><p>${actor.speakingSegmentIds.length?v('Nói lời được phân vai','Speaks assigned narration'):v('Giọng kể ngoài hình · nhân vật diễn im lặng','Offscreen narration · silent acting')}</p>${reference?.previewPath?`<a href="${esc(staticUrl(p.name,reference.previewPath))}" target="_blank" rel="noopener">${v('Xem biểu cảm và tạo hình','View expressions and design')}</a>`:''}<div class="panel-actions">${btn('edit-actor',v('Sửa tạo hình','Edit design'),`data-actor="${esc(actor.character.id)}" ${blocked||!current?'disabled':''}`)}${reference?.lockKey?btn('toggle-actor',p.locked[reference.lockKey]?v('Mở khóa vai','Unlock actor'):v('Khóa vai','Lock actor'),`data-actor-lock="${esc(reference.lockKey)}" ${p.busy?'disabled':''}`):''}</div><details><summary>${v('Nguồn của vai','Role evidence')}</summary>${actor.character.sourceRefs.map(ref=>`<p>${esc(ref.quote)}</p>`).join('')}</details></article>`;
  }).join('')}</div>`:`<p>${v('Cảnh cơ cấu hoặc bối cảnh, không có người dẫn trên hình.','Mechanism or environment shot without an on-screen presenter.')}</p>`}</section>`;
}
function inspector(shot: Shot): string {
  const disabled = project!.busy || project!.cinematicMigration?.required || locked(shot) || States.indexOf(project!.state)<States.indexOf('STORYBOARDED');
  if (shot.cinematic) {
    const c = shot.cinematic, p = project!, narration = p.artifacts.narration?.segments.filter(s => shot.narrationSegmentIds?.includes(s.id)).map(s => s.text).join(' ') ?? '';
    const preview = p.preview.shots[shot.id] ?? { composition: null, frames: null };
    const missingAssets = shot.assetNeeds.filter(need => need.required && !p.artifacts['asset-manifest']?.assets.some(a => a.id === need.id && a.status === 'approved')).map(need => need.id);
    return panelIntro(shot.subject, `${shot.id} · ${fmt(shot.startMs)} — ${fmt(shot.endMs)}`, btn('toggle-shot',t(locked(shot)?'unlockShot':'lockShot'),p.busy||p.locked.storyboard?'disabled':'') + btn('rebuild',t('rebuildShot'),disabled||States.indexOf(p.state)<States.indexOf('SCENES_READY')?'disabled':'')) +
      actorCastPanel(shot)+cinematicReview({shot,narration,locale,preview,clip:p.preview.final?'final':p.preview.draft?'draft':null,missingAssets}) +
      `<form id="shot-form"><fieldset ${disabled?'disabled':''}>${field('subject',t('subject'),shot.subject)}${text('explanationGoal',v('Mục tiêu giải thích','Explanation goal'),shot.explanationGoal??'')}${text('visualDescription',t('visual'),shot.visualDescription)}<div class="form-grid">${c.performance.expressions.map((e,i)=>`<label>${v('Tâm trạng','Mood')} · ${(e.startMs/1000).toFixed(2)}–${(e.endMs/1000).toFixed(2)}s<select name="mood-${i}">${options(Moods,e.mood)}</select></label>`).join('')}<label>Camera<select name="cinematicMovement">${options(['locked','push-in','pull-out','pan-left','pan-right'],c.camera.movement)}</select></label>${field('cameraStartScale',v('Camera: scale đầu','Camera: start scale'),c.camera.startScale,'number')}${field('cameraEndScale',v('Camera: scale cuối','Camera: end scale'),c.camera.endScale,'number')}</div><p class="muted">${v('Bản phác thảo dùng mức framing mặc định. Thiết kế riêng có thể dùng camera designIntent để thay đổi framing; khuôn mặt, target và phụ đề vẫn phải đọc rõ. Sửa các track trong storyboard; giữ clock và continuity.','Offline sketches use default framing. Authored designs can supply camera designIntent to choose framing; faces, targets and subtitles must remain readable. Edit tracks in the storyboard; preserve clock and continuity.')}</p><button type="submit" class="primary">${t('saveShot')}</button></fieldset></form>`;
  }
  if(shot.host&&shot.visualization){const narration=project!.artifacts.narration?.segments.filter(s=>shot.narrationSegmentIds?.includes(s.id)).map(s=>s.text).join(' ')??'';
    return panelIntro(shot.subject,`${shot.id} · ${fmt(shot.startMs)} — ${fmt(shot.endMs)}`,btn('toggle-shot',t(locked(shot)?'unlockShot':'lockShot'),project!.busy?'disabled':'')+btn('rebuild',t('rebuildShot'),disabled||States.indexOf(project!.state)<States.indexOf('SCENES_READY')?'disabled':''))+
      `<table class="explanation-table"><thead><tr><th>${v('Lời kể','Narration')}</th><th>${v('Hình giải thích','Explanation')}</th><th>${v('Hành động host','Host actions')}</th></tr></thead><tbody><tr><td>${esc(narration)}</td><td>${esc(shot.explanationGoal)}<p>${esc(shot.visualization.parts.map(p=>p.label).join(' · '))}</p></td><td>${shot.host.actions.map(a=>`<p>${esc(a.type)} → ${esc(shot.visualization!.parts.find(p=>p.id===a.target?.partId)?.label??'viewer')} · ${fmt(a.startMs)}–${fmt(a.endMs)}</p>`).join('')}</td></tr></tbody></table>
      <form id="shot-form"><fieldset ${disabled?'disabled':''}>${field('subject',t('subject'),shot.subject)}${text('explanationGoal',v('Mục tiêu giải thích','Explanation goal'),shot.explanationGoal??'')}${text('visualDescription',t('visual'),shot.visualDescription)}<details><summary>${v('Chỉnh hành động và mô hình','Edit actions and model')}</summary>${text('hostPlan',v('Hành động host','Host actions'),JSON.stringify(shot.host,null,2))}${text('visualizationPlan',v('Mô hình minh họa','Visualization model'),JSON.stringify(shot.visualization,null,2))}</details><button class="primary" type="submit">${t('saveShot')}</button></fieldset></form>`;
  }
  return panelIntro(shot.subject, `${shot.id} · ${fmt(shot.startMs)} — ${fmt(shot.endMs)}`, btn('toggle-shot', t(locked(shot) ? 'unlockShot' : 'lockShot'), project!.busy || project!.locked.storyboard ? 'disabled' : '') + btn('rebuild', t('rebuildShot'), project!.busy || locked(shot) || States.indexOf(project!.state)<States.indexOf('SCENES_READY') ? 'disabled' : '')) + `<form id="shot-form"><fieldset ${disabled ? 'disabled' : ''}><div class="form-grid">${field('subject',t('subject'),shot.subject)}<label>${t('type')}<select name="sceneType">${options(SceneTypes,shot.sceneType)}</select></label>${text('visualDescription',t('visual'),shot.visualDescription)}${text('motion',t('motion'),shot.motion.join('\n'))}${field('start',t('inPoint'),shot.startMs/1000,'number')}${field('end',t('outPoint'),shot.endMs/1000,'number')}${field('shotSize',t('shotSize'),shot.camera.shotSize)}${field('movement',t('movement'),shot.camera.movement)}${field('angle',t('angle'),shot.camera.angle)}<label>${t('recipe')}<select name="recipeId">${options(['','historical-map','patent-reveal','newspaper-headline','portrait-parallax','factory-conveyor','exploded-machine','timeline-zoom','before-after'],shot.recipeId ?? '', v => v || t('automatic'))}</select></label><label>${t('transitionIn')}<select name="transitionIn">${options(TransitionTypes,shot.transitionIn)}</select></label><label>${t('transitionOut')}<select name="transitionOut">${options(TransitionTypes,shot.transitionOut)}</select></label>${field('textOnScreen',t('caption'),shot.textOnScreen ?? '')}<label class="check"><input type="checkbox" name="intentionalStatic" ${shot.intentionalStatic ? 'checked' : ''}>${t('intentionalStatic')}</label></div><h3>${t('assets')}</h3><div class="asset-edit-grid">${shot.assetNeeds.map((need,i) => `<article><b>${esc(need.id)}</b><p>${esc(need.description)}</p>${field(`asset-${i}`,t('assetSource'),need.localPath ?? '')}${need.characterId ? field(`pose-${i}`,t('pose'),need.pose ?? '')+field(`version-${i}`,t('version'),need.versionId ?? '') : ''}</article>`).join('')}</div><p class="muted">${t('timingHint')}</p><button class="primary" type="submit">${t('saveShot')}</button></fieldset>${locked(shot) ? `<p>${t('shotLocked')}</p>` : ''}</form>`;
}
async function loadEditor(): Promise<void> {
  const target = window.document.querySelector('#editor'), p = project, current = ++editorGeneration;
  if (!target || !p) return;
  document = undefined; scene = undefined;
  inspectedBoard = undefined;
  if (tab === 'inspector') {
    const shot = selected(); if (!shot) { target.innerHTML = empty(t('selectShot')); return; }
    const doc = await api.artifact<Storyboard>(p.name,'storyboard.json'); if (current !== editorGeneration) return;
    inspectedBoard = doc; const canonical = doc.data.shots.find(s => s.id === shot.id);
    target.innerHTML = canonical ? inspector(canonical) : empty(t('selectShot')); return;
  }
  if (tab === 'reports') { target.innerHTML = reports(p); return; }
  if (tab === 'logs') {
    target.innerHTML = panelIntro(t('logs'), '', `<select id="log-source">${options(['orchestrator','models','renderer','ffmpeg'],'orchestrator',s=>t(s as TextKey))}</select>`) + '<pre id="log-content" class="log-content"></pre>';
    await loadLog('orchestrator'); return;
  }
  target.innerHTML = `<p>${t('loading')}</p>`;
  try {
    if (tab === 'scene') {
      const s = selected(); if (!s) { target.innerHTML = empty(t('selectShot')); return; }
      const doc = await api.scene(p.name,s.id); if (current !== editorGeneration) return;
      scene = doc;
      target.innerHTML = panelIntro(t('scene'),s.host?v('Cảnh được tạo từ kế hoạch đã kiểm tra. Sửa target, layout hoặc camera trong storyboard rồi dựng lại shot.','This scene follows the validated plan. Edit targets, layout or camera in the storyboard and rebuild the shot.'):t('sceneHint'),s.host?btn('rebuild',t('rebuildShot'),p.busy||locked(s)?'disabled':''):btn('save-scene',t('saveScene'),p.busy || locked(s) ? 'disabled' : '', 'primary')) + `<div class="scene-editors">${doc.files.map(f=>`<label>${esc(f.path)}<textarea class="code-editor scene-code" data-file="${esc(f.path)}" spellcheck="false" ${p.busy || locked(s) || s.host ? 'readonly' : ''}>${esc(f.content)}</textarea></label>`).join('')}</div>`;
    } else {
      const names: Partial<Record<Tab,string>> = {source:'source.md',narration:'narration.json',storyboard:'storyboard.json',characters:'character-bible.json'};
      const name = names[tab]!; const doc = await api.artifact(p.name,name); if (current !== editorGeneration) return;
      document = doc;
      if(tab==='narration'&&p.settings.contentMode==='narrated-explainer')doc.editable=false;
      const help: Partial<Record<Tab,TextKey>> = {source:'sourceHint',narration:'narrationHint',storyboard:'boardHint',characters:'characterHint'};
      const save: Partial<Record<Tab,TextKey>> = {source:'saveSource',narration:'saveNarration',storyboard:'saveBoard',characters:'saveCharacters'};
      const globalLock = tab === 'storyboard' ? p.locked.storyboard : tab === 'characters' ? p.locked.characterBible : false;
      const actions = (tab === 'storyboard' ? btn('approve-board',t('approveBoard'), p.busy ? 'disabled' : '')+btn('toggle-board',t(p.locked.storyboard?'unlockBoard':'lockBoard'),p.busy?'disabled':'') : tab === 'characters' ? btn('approve-characters',t('approveCharacters'),p.busy?'disabled':'')+btn('toggle-characters',t(p.locked.characterBible?'unlockCharacters':'lockCharacters'),p.busy?'disabled':'') : '') + btn('save-document',t(save[tab]!),p.busy||globalLock?'disabled':'','primary') + btn('reload',t('reload'));
      const characters = tab === 'characters' ? `<div class="character-cards">${(p.artifacts['character-bible']?.characters ?? []).map(c=>`<article><span class="eyebrow">${esc(c.id)}</span><h3>${esc(c.name)}</h3><p>${esc([c.identity.apparentAge,c.identity.hair,c.wardrobe.default].filter(Boolean).join(' · '))}</p>${btn('toggle-identity',t((p.locked[c.id] ?? c.locked)?'unlockIdentity':'lockIdentity'),`data-identity="${esc(c.id)}" ${p.busy || p.locked.characterBible ? 'disabled' : ''}`)}</article>`).join('')}</div>` : '';
      target.innerHTML = panelIntro(t(tab),t(help[tab]!),doc.editable?actions:btn('setup',v('Sửa đầu vào','Edit input')))+characters+`<textarea id="document-editor" class="code-editor" spellcheck="false" aria-label="${esc(t(tab))}" ${p.busy||globalLock||!doc.editable?'readonly':''}>${esc(typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data,null,2))}</textarea>`;
    }
  } catch (error) {
    if (current !== editorGeneration) return;
    target.innerHTML = empty(tab === 'scene' ? t('noScene') : t('noArtifact'));
    if (!(error instanceof RequestError && error.status === 404)) report(error);
  }
}
function reports(p: ProjectDetail): string {
  const qc = States.indexOf(p.state)>=States.indexOf('QC_PASSED') ? p.artifacts['qc-report'] as {pass?:boolean;issues?:unknown[];warnings?:unknown[]} | undefined : undefined;
  const voice=p.artifacts['voice-report'],host=p.artifacts['host-profile'];
  const statuses = {missing:v('Chưa tạo','Missing'),current:v('Khớp storyboard','Storyboard matches'),stale:v('Cần dựng lại','Stale'),unverified:v('Chưa xác minh','Unverified')};
  const cinematic = `<section class="cinematic-reports"><h3>${v('Kế hoạch và báo cáo diễn xuất (chỉ đọc)','Direction and performance reports (read-only)')}</h3>${Object.entries(p.cinematicArtifacts).map(([name,info])=>`<article><strong>${esc(name)}</strong><p>${esc(statuses[info.status])} · ${esc(info.reason)}</p>${p.downloads.some(f=>f.name===name)?`<a href="${projectUrl(p.name)}/downloads/${encodeURIComponent(name)}">${v('Tải artifact','Download artifact')}</a>`:''}${p.artifacts[name.replace(/\.json$/,'') as keyof ProjectDetail['artifacts']]?`<details><summary>${v('Xem dữ liệu','View data')}</summary><pre>${esc(JSON.stringify(p.artifacts[name.replace(/\.json$/,'') as keyof ProjectDetail['artifacts']],null,2))}</pre></details>`:''}</article>`).join('')}</section>`;
  const cost = p.artifacts['cost-report'] as Record<string,unknown> | undefined;
  const review = States.indexOf(p.state)>=States.indexOf('REVIEWED') ? p.artifacts.review : undefined;
  return panelIntro(t('delivery'),'',p.preview.contactSheet ? `<a class="button" target="_blank" rel="noopener" href="${esc(p.preview.contactSheet)}">${t('viewContact')}</a>`:'')+cinematic+`${voice||host?`<div class="report-grid"><article><h3>${v('Giọng và tạo hình gốc','Voice and base character')}</h3>${host?`<p>${esc(host.name)} · ${esc(host.kind)} · v${host.version}</p>`:''}<pre>${esc(JSON.stringify(voice??{},null,2))}</pre>${p.waitingFor?`<p>${v('Đang chờ','Waiting for')}: ${esc(p.waitingFor)}</p>`:''}</article></div>`:''}<div class="report-grid"><article><p class="eyebrow">${t('qc')}</p><h3>${qc ? t(qc.pass?'pass':'fail') : t('qcPending')}</h3>${qc ? `<pre>${esc(JSON.stringify(qc,null,2))}</pre>` : ''}</article><article><p class="eyebrow">${t('review')}</p><h3>${review ? t(review.pass?'pass':'fail') : t('qcPending')}</h3>${review ? `<pre>${esc(JSON.stringify(review,null,2))}</pre>`:''}</article><article><p class="eyebrow">${t('costs')}</p>${cost ? `<pre>${esc(JSON.stringify(cost,null,2))}</pre>`:`<p>${t('costPending')}</p>`}</article></div><h3>${t('downloads')}</h3><div class="downloads">${p.downloads.map(f=>`<a href="${projectUrl(p.name)}/downloads/${encodeURIComponent(f.name)}"><span>↓</span><b>${esc(f.name)}</b><small>${(f.size/1024).toFixed(1)} KB</small></a>`).join('') || `<p>${t('noDownloads')}</p>`}</div>`;
}
async function loadLog(key: string): Promise<void> {
  if (!project) return; const name = project.name, result = await api.log(name,key);
  if (project?.name !== name || tab !== 'logs') return;
  const pre = window.document.querySelector('#log-content'); if (pre) { pre.textContent = (result.truncated ? t('logTail')+'\n\n' : '')+(result.text || t('logEmpty')); pre.scrollTop = pre.scrollHeight; }
}
async function refresh(full = true): Promise<void> {
  const name = project?.name;
  const [listing, detail] = await Promise.all([api.projects(),name ? api.project(name) : Promise.resolve(undefined)]);
  projects = listing.projects;
  if (name !== project?.name) return;
  project = detail;
  if (!shotId || !shots().some(s=>s.id===shotId)) shotId=shots()[0]?.id ?? '';
  clock = Math.min(clock,duration());
  if (full) render();
}
async function operation(action: () => Promise<unknown>, message = t('saved')): Promise<void> {
  if (pending) return; pending = true;
  try { await action(); dirty = false; await refresh(); notice(message); } catch (error) { report(error); } finally { pending = false; }
}
async function saveShot(form: HTMLFormElement): Promise<void> {
  const p = project!, old = selected()!, values = new FormData(form);
  const get = (key: string) => String(values.get(key) ?? '');
  const doc = inspectedBoard; if (!doc) throw new Error(t('reload'));
  const board = structuredClone(doc.data), index = board.shots.findIndex(s=>s.id===old.id), next = board.shots[index]!;
  if (next.cinematic) {
    next.subject=get('subject');next.explanationGoal=get('explanationGoal');next.visualDescription=get('visualDescription');
    for (const [i,e] of next.cinematic.performance.expressions.entries()) e.mood=get(`mood-${i}`) as Mood;
    next.cinematic.camera.movement=get('cinematicMovement') as NonNullable<Shot['cinematic']>['camera']['movement'];
    next.cinematic.camera.startScale=Number(get('cameraStartScale'));next.cinematic.camera.endScale=Number(get('cameraEndScale'));
    next.camera.movement=next.cinematic.camera.movement;await api.save(p.name,'storyboard.json',board,doc.revision);return;
  }
  if(old.host&&old.visualization){next.subject=get('subject');next.explanationGoal=get('explanationGoal');next.visualDescription=get('visualDescription');next.host=JSON.parse(get('hostPlan')) as Shot['host'];next.visualization=JSON.parse(get('visualizationPlan')) as Shot['visualization'];next.recipeId=EXPLAINER_RECIPES[next.visualization!.type];await api.save(p.name,'storyboard.json',board,doc.revision);return;}
  const start = Math.round(Number(get('start'))*1000), end = Math.round(Number(get('end'))*1000);
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new Error(t('invalidTiming'));
  next.startMs=start; next.endMs=end;
  next.subject=get('subject'); next.visualDescription=get('visualDescription'); next.sceneType=get('sceneType') as Shot['sceneType'];
  next.camera={shotSize:get('shotSize'),movement:get('movement'),angle:get('angle')}; next.motion=get('motion').split('\n').filter(Boolean);
  next.transitionIn=get('transitionIn') as Shot['transitionIn'];next.transitionOut=get('transitionOut') as Shot['transitionOut']; next.recipeId=get('recipeId')||null; next.textOnScreen=get('textOnScreen')||null; next.intentionalStatic=values.has('intentionalStatic');
  for (let i=0;i<next.assetNeeds.length;i++) { const need=next.assetNeeds[i]!; need.localPath=get(`asset-${i}`)||undefined; if (need.characterId) { need.pose=get(`pose-${i}`)||undefined;need.versionId=get(`version-${i}`)||undefined; } }
  const before=board.shots[index-1], after=board.shots[index+1];
  if (start!==old.startMs) { if (!before || locked(before)) throw new Error(t('lockedError')); before.endMs=start; }
  if (end!==old.endMs) { if (!after || locked(after)) throw new Error(t('lockedError'));after.startMs=end; }
  for (const s of board.shots) s.beatIds=(p.artifacts.beats ?? []).filter(b=>b.startMs<s.endMs&&b.endMs>s.startMs).map(b=>b.id);
  await api.save(p.name,'storyboard.json',board,doc.revision);
}
function createDialog(): void {
  modal.innerHTML = `<form id="create-form"><p class="eyebrow">STORY FACTORY</p><h2 id="modal-title">${t('newProject')}</h2>${field('name',t('name'),'')}<p class="muted">${t('nameHint')}</p><label>${v('Phong cách trình bày','Presentation style')}<select name="presentationMode">${options(['story-cinematic','diagram'],'story-cinematic')}</select></label><label class="check"><input type="checkbox" name="example" checked>${t('example')}</label><footer>${btn('close-modal',t('cancel'))}<button class="primary" type="submit">${t('create')}</button></footer></form>`; modal.showModal();
}
function narrationLanguageField(language:string):string{
  const values=[...NARRATION_LANGUAGES.map(item=>item.id),...NARRATION_LANGUAGES.some(item=>item.id===language)?[]:[language]];
  return `<label>${v('Ngôn ngữ lời kể và nhận dạng WAV','Narration and WAV transcription language')}<select name="language" id="narration-language">${options(values,language,id=>NARRATION_LANGUAGES.find(item=>item.id===id)?.name??id)}</select></label>`;
}
function updateVoiceControls(changedLanguage=false,changedProvider=false):void{
  const form=modal.querySelector<HTMLFormElement>('#setup-form');if(!form)return;
  const language=form.querySelector<HTMLSelectElement>('[name=language]')!.value,provider=form.querySelector<HTMLSelectElement>('[name=tts_provider]')!;
  const voice=form.querySelector<HTMLInputElement>('[name=voice_id]')!,url=form.querySelector<HTMLInputElement>('[name=base_url]')!,key=form.querySelector<HTMLInputElement>('[name=api_key_env]')!;
  const windows=setupVoices.windows.voices.filter(item=>primaryLanguage(item.language)===primaryLanguage(language)&&(!language.includes('-')||item.language.toLowerCase()===language.toLowerCase()));
  const azure=NARRATION_LANGUAGES.find(item=>item.id===primaryLanguage(language))?.azureVoices??[];
  if(changedLanguage){
    const preset=setupVoices.profiles[language]??setupVoices.profiles[primaryLanguage(language)];
    if(preset){provider.value=preset.tts_provider??'none';voice.value=preset.voice_id??'';url.value=preset.base_url??'';key.value=preset.api_key_env;
      form.querySelector<HTMLInputElement>('[name=tts_model]')!.value=preset.model??'';
      form.querySelector<HTMLInputElement>('[name=tts_timeout]')!.value=String(preset.timeout_ms/1000);
      form.querySelector<HTMLTextAreaElement>('[name=http_fields]')!.value=preset.http_fields?JSON.stringify(preset.http_fields,null,2):'';
      form.querySelector<HTMLTextAreaElement>('[name=http_extra_body]')!.value=preset.http_extra_body?JSON.stringify(preset.http_extra_body,null,2):'';}
    else if(provider.value==='azure-speech')voice.value=azure[0]??'';
    else if(['http','openai-compatible','omnivoice-studio'].includes(provider.value))voice.value='';
    else {provider.value=windows.length?'windows-speech':'none';voice.value='';}
  }else if(changedProvider){
    if(provider.value==='azure-speech'&&!azure.some(id=>id===voice.value))voice.value=azure[0]??'';
    if(provider.value==='windows-speech'&&!windows.some(item=>item.id===voice.value))voice.value='';
    if(provider.value==='omnivoice-studio'){
      form.querySelector<HTMLInputElement>('[name=tts_model]')!.value='omnivoice';voice.value='default';
      if(!url.value.trim())url.value='http://127.0.0.1:3900';
    }
  }
  form.querySelector('#voice-choices')!.innerHTML=(provider.value==='windows-speech'?windows.map(item=>item.id):provider.value==='azure-speech'?[...azure]:[]).map(id=>`<option value="${esc(id)}"></option>`).join('');
  let message='';
  if(provider.value==='windows-speech')message=windows.length&&(!voice.value||windows.some(item=>item.id===voice.value))?v(`${windows.length} giọng Windows phù hợp. Để trống ID sẽ chọn giọng đầu tiên.`,`${windows.length} matching Windows voices. Leave the ID blank to select the first.`):v('Chưa có giọng Windows phù hợp với ngôn ngữ/ID này. Cài giọng hoặc chọn dịch vụ TTS khác.','No installed Windows voice matches this language/ID. Install a voice or choose another TTS provider.');
  else if(provider.value==='azure-speech')message=v('Cần endpoint Azure Speech và API key trong biến môi trường. ID gợi ý được lọc theo ngôn ngữ; chưa xác nhận kết nối tài khoản.','Requires an Azure Speech endpoint and an API key environment variable. Suggested IDs match the language; account connectivity has not been verified.');
  else if(provider.value==='none')message=v('Kịch bản/SRT cần giọng TTS trước khi xuất final. WAV giữ giọng trong file.','Script/SRT needs TTS before final export. WAV retains its original voice.');
  else if(provider.value==='omnivoice-studio')message=v('Dùng API /v1/audio/speech của OmniVoice Studio/VoiceStudio. Chọn model đã cài và voice profile của bạn; dịch vụ local phải đang chạy.','Uses OmniVoice Studio/VoiceStudio /v1/audio/speech. Select an installed model and your voice profile; the local service must be running.');
  else if(provider.value==='openai-compatible')message=v('Nhập base URL hoặc endpoint /v1/audio/speech, model và voice do server local hỗ trợ. Audio trả về phải là WAV.','Enter a base URL or /v1/audio/speech endpoint, with a model and voice supported by your local server. The response must be WAV audio.');
  else message=v('Dịch vụ/trình đọc phải hỗ trợ ngôn ngữ đã chọn. ID giọng phụ thuộc provider.','The service/program must support the selected language. Voice IDs depend on the provider.');
  form.querySelector('#voice-language-status')!.textContent=message;
}
async function setupDialog():Promise<void>{
  const p=project!;setupSnapshot={name:p.name,settings:structuredClone(p.settings)};setupMode=p.settings.input.mode==='auto'?(p.artifacts.narration?.mode==='srt'?'srt':p.artifacts.narration?'wav':'script'):p.settings.input.mode;
  const format=p.settings.input.script.endsWith('.md')?'md':'txt';scriptFormat=format;let script='';scriptRevision='new';
  try{const doc=await api.artifact<string>(p.name,`script.${format}`);script=doc.data;scriptRevision=doc.revision;}catch(error){if(!(error instanceof RequestError&&error.status===404))throw error;}
  setupVoices=await api.voices().catch(()=>({windows:{status:'unavailable' as const,voices:[]},profiles:{}}));
  if(project?.name!==p.name)throw new RequestError('Project changed before opening narration settings.',409,'REVISION_CONFLICT');
  const host=p.settings.host.profile.includes('STICK-MAN')?'stick-man':p.settings.host.profile.startsWith('library/')?'mini-robot':'custom',voice=p.settings.voice,director=p.settings.creativeModel;
  modal.innerHTML=`<form id="setup-form"><h2>${v('Nội dung, diễn viên và giọng kể','Story, actors and narration')}</h2><nav class="input-tabs">${(['script','wav','srt']as const).map(k=>`<button type="button" data-input-mode="${k}" class="${setupMode===k?'active':''}">${k==='script'?v('Kịch bản','Script'):k.toUpperCase()}</button>`).join('')}</nav>
    <section data-mode-panel="script" ${setupMode!=='script'?'hidden':''}><label>${v('Lời kể hoàn chỉnh — đọc nguyên văn','Complete spoken script — read verbatim')}<textarea id="script-input" name="scriptText" rows="7">${esc(script)}</textarea></label><button type="button" data-action="script-preview">${v('Xem lời kể sẽ đọc','Preview spoken text')}</button><pre id="spoken-preview" class="script-preview" hidden></pre><label>${v('Định dạng','Format')}<select name="scriptFormat">${options(['txt','md'],format)}</select></label><label>${v('Hoặc tải kịch bản','Or upload a script')}<input type="file" name="script" accept=".txt,.md"></label></section>
    <section data-mode-panel="wav" ${setupMode!=='wav'?'hidden':''}><label>WAV<input name="narration" type="file" accept=".wav"></label><label>${v('SRT đi kèm (tùy chọn)','Companion SRT (optional)')}<input name="subtitles" type="file" accept=".srt"></label><p>${v('Giữ giọng trong WAV; SRT đi kèm được kiểm tra khớp audio.','Keep the WAV voice; companion SRT is checked against the audio.')}</p></section>
    <section data-mode-panel="srt" ${setupMode!=='srt'?'hidden':''}><label>SRT<input name="srt" type="file" accept=".srt"></label><p>${v('Giữ nguyên lời và clock; TTS đọc từng cue.','Preserve words and clock; TTS reads each cue.')}</p></section>
    <label>${v('Kiểu tạo hình diễn viên','Actor visual style')}<select id="setup-host" name="host">${options(['mini-robot','stick-man','custom'],host,k=>k==='mini-robot'?v('Robot mini','Mini robot'):k==='stick-man'?v('Người que','Stick man'):v('Rig từ MD riêng','Custom character rig MD'))}</select></label>
    <img id="host-choice-preview" class="host-choice-preview" alt="${v('Tạo hình mẫu','Base character poses')}" src="${host==='custom'?staticUrl(p.name,'previews/host-preview-sheet.png'):`${projectUrl(p.name)}/hosts/${host}/preview`}"><label>${v('Tạo hình MD tùy chỉnh (tùy chọn)','Custom character MD (optional)')}<input type="file" name="host" accept=".md"></label>
    <fieldset class="voice-settings"><legend>${v('Ngôn ngữ và giọng kể','Narration language and voice')}</legend>${narrationLanguageField(p.settings.language)}<label>${v('Dịch vụ giọng đọc cho kịch bản/SRT','Speech provider for script/SRT')}<select name="tts_provider">${options(['none','windows-speech','azure-speech','omnivoice-studio','openai-compatible','http','command'],voice.tts_provider??'none',k=>k==='none'?v('Chưa cấu hình','Not configured'):k==='windows-speech'?v('Giọng cài trên Windows','Installed Windows voice'):k==='azure-speech'?'Azure Speech':k==='omnivoice-studio'?'OmniVoice Studio / VoiceStudio (local)':k==='openai-compatible'?v('TTS local tương thích OpenAI','OpenAI-compatible local TTS'):k==='http'?v('API TTS riêng (HTTP JSON)','Custom TTS API (HTTP JSON)'):v('Trình đọc cục bộ đã cấu hình','Configured local speech program'))}</select></label><label>${v('Tên/ID giọng (chọn gợi ý hoặc nhập riêng)','Voice name/ID (choose a suggestion or enter one)')}<input name="voice_id" list="voice-choices" value="${esc(voice.voice_id??'')}"><datalist id="voice-choices"></datalist></label><p id="voice-language-status" class="muted" role="status"></p>${field('base_url',v('Endpoint / base URL của dịch vụ TTS','TTS service endpoint / base URL'),voice.base_url??'')}${field('tts_model',v('Model TTS (API local)','TTS model (local API)'),voice.model??'')}<details><summary>${v('Cấu hình nâng cao','Advanced settings')}</summary>${field('api_key_env',v('Tên biến môi trường chứa API key','API key environment variable'),voice.api_key_env)}${field('tts_timeout',v('Thời gian chờ mỗi đoạn (giây)','Timeout per segment (seconds)'),voice.timeout_ms/1000,'number')}${text('http_fields',v('Tên trường API riêng (JSON, tùy chọn)','Custom API field names (JSON, optional)'),voice.http_fields?JSON.stringify(voice.http_fields,null,2):'')}${text('http_extra_body',v('Tham số thêm của provider (JSON, tùy chọn)','Additional provider parameters (JSON, optional)'),voice.http_extra_body?JSON.stringify(voice.http_extra_body,null,2):'')}<p class="muted">${v('API riêng trả WAV trực tiếp. Các tham số thêm không được thay lời kể, ngôn ngữ, giọng hoặc định dạng.','Custom APIs return WAV directly. Additional parameters cannot replace narration, language, voice or format.')}</p><label class="check"><input name="voiceDefault" type="checkbox">${v('Lưu giọng mặc định cho ngôn ngữ này ở dự án mới','Save the voice default for this language in new projects')}</label></details></fieldset>
    <fieldset class="voice-settings"><legend>${v('Thiết kế hình ảnh và diễn xuất','Visual design and acting')}</legend><label>${v('Cách dùng nhân vật','Character roles')}<select name="character_mode">${options(['actors','presenter'],p.settings.presentation.character_mode,k=>k==='actors'?v('Diễn viên trong câu chuyện','Actors within the story'):v('Người dẫn chuyện (bản cũ)','Presenter (legacy)'))}</select></label>${text('design_brief',v('Ý tưởng hình ảnh (tùy chọn, không giới hạn vào mẫu có sẵn)','Visual idea (optional, no required preset)'),p.settings.presentation.design_brief??'')}<details><summary>${v('Model thiết kế cảnh','Scene design model')}</summary><label>${v('Dịch vụ','Provider')}<select name="creative_provider">${options(['codex-cli','claude-cli','gateway','openai-compatible','gemini','deepseek','ollama','litellm','mock'],director.provider,k=>k==='mock'?v('Ngoại tuyến — bản phác thảo theo quy tắc','Offline — rule-based sketch'):k)}</select></label>${field('creative_model',v('Tên model','Model name'),director.model)}${field('creative_base_url',v('Địa chỉ dịch vụ (nếu dùng API)','Service address (for API providers)'),director.base_url??'')}${field('creative_api_key_env',v('Tên biến môi trường chứa API key','API key environment variable'),director.api_key_env)}<p class="muted">${v('CLI dùng tài khoản đã đăng nhập trên máy. Codex có thể dùng model “default”; Claude dùng model tài khoản hỗ trợ. Ngoại tuyến vẫn là bản phác thảo, không chứng minh chất lượng thiết kế của model.','CLI uses an account already signed in on this machine. Codex can use model “default”; Claude needs an available account model. Offline output is a sketch and does not demonstrate model design quality.')}</p></details></fieldset>
    ${p.artifacts.script?`<details><summary>${v('Lời kể sau chuẩn hóa','Normalized spoken text')}</summary><pre class="script-preview">${esc(p.artifacts.script.text)}</pre></details>`:''}
    ${p.waitingFor==='host-approval'?`<p>${v('Host tùy chỉnh cần duyệt preview trước khi tiếp tục.','Approve the custom host preview before continuing.')}</p>`:''}
    <footer>${btn('close-modal',t('cancel'))}<button type="submit" name="intent" value="save">${v('Lưu','Save')}</button><button class="primary" type="submit" name="intent" value="run">${v('Tạo video','Create video')}</button></footer></form>`;updateVoiceControls();modal.showModal();
}
async function saveSetup(form:HTMLFormElement,start:boolean):Promise<void>{
  const p=setupSnapshot;
  if(!p||p.name!==project?.name)throw new RequestError(v('Dự án đã thay đổi; mở lại form trước khi lưu.','Project changed; reopen this form before saving.'),409,'REVISION_CONFLICT');
  let settingsRevision=p.settings.revision;
  const data=new FormData(form),files=new FormData();
  for(const input of form.querySelectorAll<HTMLInputElement>('input[type=file]')){
    const section=input.closest<HTMLElement>('[data-mode-panel]');if(section?.hidden)continue;
    for(const file of input.files??[])files.append(input.name,file);
  }
  const hostFile=(form.querySelector<HTMLInputElement>('input[name=host]')?.files?.length??0)>0;
  const scriptFile=(form.querySelector<HTMLInputElement>('input[name=script]')?.files?.length??0)>0;
  if(Array.from(files.keys()).length)settingsRevision=(await api.upload(p.name,files,settingsRevision)).settingsRevision;
  if(setupMode==='script'&&!scriptFile){const body=String(data.get('scriptText')??'');if(!body.trim())throw new Error(v('Nhập hoặc tải kịch bản trước.','Enter or upload a script first.'));const format=String(data.get('scriptFormat'))==='md'?'md':'txt';let revision=scriptRevision;if(format!==scriptFormat){try{revision=(await api.artifact(p.name,`script.${format}`)).revision;}catch(error){if(error instanceof RequestError&&error.status===404)revision='new';else throw error;}}const saved=await api.script(p.name,body,format,revision,settingsRevision);if(!saved.settingsRevision)throw new Error('Missing script settings revision');settingsRevision=saved.settingsRevision;}
  const provider=String(data.get('tts_provider')??'none');
  const endpoint=String(data.get('base_url')??'').trim();
  if(['http','azure-speech','openai-compatible','omnivoice-studio'].includes(provider)&&!endpoint)throw new Error(v('Nhập endpoint cho dịch vụ TTS đã chọn.','Enter the endpoint for the selected TTS service.'));
  const jsonOption=(name:'http_fields'|'http_extra_body')=>{const value=String(data.get(name)??'').trim();return value?JSON.parse(value):p.settings.voice[name]===undefined?undefined:null;};
  const voice={...p.settings.voice,source:'auto',tts_provider:provider,voice_id:String(data.get('voice_id')??'')||null,api_key_env:String(data.get('api_key_env')??'TTS_API_KEY'),
    model:String(data.get('tts_model')??'').trim()||(p.settings.voice.model===undefined?undefined:null),timeout_ms:Number(data.get('tts_timeout'))*1000,http_fields:jsonOption('http_fields'),http_extra_body:jsonOption('http_extra_body'),...(endpoint?{base_url:endpoint}:{})};
  const creativeProvider=String(data.get('creative_provider')??p.settings.creativeModel.provider);
  const creativeModel={provider:creativeProvider,model:String(data.get('creative_model')??'').trim(),base_url:String(data.get('creative_base_url')??'').trim(),api_key_env:String(data.get('creative_api_key_env')??'MODEL_GATEWAY_KEY').trim(),timeout_ms:['codex-cli','claude-cli'].includes(creativeProvider)?900000:p.settings.creativeModel.timeout_ms};
  await api.settings(p.name,{revision:settingsRevision,input:{mode:setupMode},host:hostFile?'custom':String(data.get('host')),language:String(data.get('language')??'vi'),voice,automatic:true,presentation:{design_brief:String(data.get('design_brief')??''),character_mode:String(data.get('character_mode')??'actors')},models:{storyboard:creativeModel}});
  if(data.has('voiceDefault'))await api.voiceDefaults(voice,String(data.get('language')));
  modal.close();if(start)await api.run(p.name,'DONE');
}
async function actorDialog(id:string):Promise<void>{
  const p=project!,doc=await api.artifact<Storyboard>(p.name,'storyboard.json');
  if(project?.name!==p.name)throw new RequestError('Project changed before opening the actor editor.',409,'REVISION_CONFLICT');
  const cast=doc.data.shots.flatMap(s=>[...(s.cinematic?.actorScene?.primary?[s.cinematic.actorScene.primary]:[]),...(s.cinematic?.actorScene?.supporting.map(a=>a.character)??[])]);
  const actor=cast.find(a=>a.id===id);if(!actor)throw new Error('Actor is no longer in the cast.');
  actorSnapshot={name:p.name,id,revision:doc.revision};
  modal.innerHTML=`<form id="actor-form"><p class="eyebrow">${esc(id)}</p><h2 id="modal-title">${esc(actor.name)}</h2><p>${v('Tạo hình và trang phục áp dụng cho vai này ở mọi cảnh. Giọng kể và timestamp được giữ. Tên và vai lịch sử phải có nguồn; SVG trang phục chỉ chứa hình vẽ thụ động.','Design and costume apply to this actor in every scene. Narration and timestamps are preserved. Historical names and roles need evidence; costume SVG contains passive artwork only.')}</p><label>${v('Định nghĩa diễn viên','Actor definition')}<textarea class="code-editor" name="actor" rows="24" spellcheck="false">${esc(JSON.stringify(actor,null,2))}</textarea></label><footer>${btn('close-modal',t('cancel'))}<button class="primary" type="submit">${v('Lưu và cập nhật preview','Save and update preview')}</button></footer></form>`;
  modal.showModal();
}
async function saveActor(form:HTMLFormElement):Promise<void>{
  const snapshot=actorSnapshot;if(!snapshot||snapshot.name!==project?.name)throw new RequestError('Reload the actor editor before saving.',409,'REVISION_CONFLICT');
  const character=JSON.parse(String(new FormData(form).get('actor'))) as ActorDefinition;
  await api.actor(snapshot.name,snapshot.id,character,snapshot.revision);modal.close();actorSnapshot=null;
}
async function uploadDialog(): Promise<void> {
  const p=project!;
  modal.innerHTML=`<form id="upload-form"><p class="eyebrow">${esc(p.name)}</p><h2 id="modal-title">${t('uploadTitle')}</h2><p>${t('uploadHelp')}</p><div class="upload-grid">${[['source','sourceFile','.md'],['subtitles','subtitleFile','.srt'],['narration','audioFile','.wav'],['assets','assetFiles','.png,.jpg,.jpeg,.webp,.svg,.mp4,.webm,.wav,.mp3,.flac,.pdf,.md,.txt']].map(([name,label,accept])=>`<label>${t(label as TextKey)}<input name="${name}" type="file" accept="${accept}" ${name==='assets'?'multiple':''}></label>`).join('')}</div><p class="muted">${t('uploadLimits')}</p><p>${t('replaceHint')}</p><div id="asset-list"></div><footer>${btn('close-modal',t('cancel'))}<button class="primary" type="submit">${t('upload')}</button></footer></form>`;modal.showModal();
  try { const result=await api.assets(p.name); const list=window.document.querySelector('#asset-list');if(list)list.innerHTML=`<h3>${t('fileList')}</h3>${result.files.map(f=>`<div class="asset-file">${esc(f.path)} <small>${(f.size/1024).toFixed(1)} KB</small></div>`).join('')||`<p>${t('noAssets')}</p>`}`; } catch(error){report(error);}
}
window.document.addEventListener('click',event=>{
  const el=(event.target as Element).closest<HTMLElement>('button,a[data-action]');if(!el)return;
  if(el.dataset.action==='script-preview'){void operation(async()=>{const form=modal.querySelector<HTMLFormElement>('#setup-form')!,data=new FormData(form),file=form.querySelector<HTMLInputElement>('input[name=script]')?.files?.[0],format=file?(file.name.toLowerCase().endsWith('.md')?'md':'txt'):String(data.get('scriptFormat')),text=file?await file.text():String(data.get('scriptText')??'');const response=await fetch('/api/script-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,format})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??'Script preview failed');const preview=modal.querySelector<HTMLElement>('#spoken-preview')!;preview.textContent=result.text;preview.hidden=false;});return;}
  if(el.dataset.project){if(!leaveEditor())return;const name=el.dataset.project;dirty=false;playing=false;void api.project(name).then(p=>{project=p;shotId=shots()[0]?.id ?? '';clock=0;render();}).catch(report);return;}
  if(el.dataset.shot){chooseShot(el.dataset.shot);return;}
  if(el.dataset.tab){if(!leaveEditor())return;dirty=false;tab=el.dataset.tab as Tab;render();return;}
  const action=el.dataset.action, p=project;
  if(action==='create'){createDialog();return;}
  if(action==='close-modal'){modal.close();return;}
  if(!p)return;
  if(action==='upload'){if(leaveEditor())void uploadDialog();return;}
  if(el.dataset.inputMode){setupMode=el.dataset.inputMode as typeof setupMode;for(const panel of modal.querySelectorAll<HTMLElement>('[data-mode-panel]'))panel.hidden=panel.dataset.modePanel!==setupMode;for(const button of modal.querySelectorAll('[data-input-mode]'))button.classList.toggle('active',(button as HTMLElement).dataset.inputMode===setupMode);return;}
  if(action==='setup'){if(leaveEditor())void setupDialog().catch(report);return;}
  if(action==='edit-actor'){if(leaveEditor())void actorDialog(el.dataset.actor!).catch(report);return;}
  if(action==='toggle-actor'){if(leaveEditor())void operation(()=>api.locks(p.name,{[el.dataset.actorLock!]:!p.locked[el.dataset.actorLock!]}));return;}
  if(action==='approve-host'){void operation(async()=>{await api.approve(p.name,'host');await api.run(p.name,'DONE');});return;}
  if(action==='mute'){muted=!muted;const voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');if(voice)voice.muted=muted;el.textContent=muted?'♪×':'♪';el.setAttribute('aria-label',t(muted?'unmute':'mute'));return;}
  if(action==='preview-shot'||action==='preview-clip'){mode=action==='preview-shot'?'composition':el.dataset.mode==='final'?'final':'draft';playing=false;clock=selected()?.startMs??0;renderPreview();updateClock();const select=window.document.querySelector<HTMLSelectElement>('#preview-mode');if(select)select.value=mode;window.document.querySelector('#preview')?.scrollIntoView({block:'center'});return;}
  if(action==='play'){if(mode!=='composition'){const video=window.document.querySelector<HTMLVideoElement>('#film-preview');if(video){if(video.paused)void video.play().catch(report);else video.pause();}return;}playing=!playing;lastFrame=performance.now();el.textContent=playing?'Ⅱ':'▶';el.setAttribute('aria-label',t(playing?'pause':'play'));const voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');if(voice){voice.currentTime=clock/1000;if(playing)void voice.play().catch(report);else voice.pause();}return;}
  if(action==='previous'||action==='next'){const idx=shots().findIndex(s=>s.id===shotId), next=shots()[idx+(action==='next'?1:-1)];if(next)chooseShot(next.id);return;}
  if(action==='reload'){if(leaveEditor()){dirty=false;void loadEditor();}return;}
  if(action==='refresh'){if(leaveEditor()){dirty=false;void refresh().catch(report);}return;}
  if(action==='run'||action==='rebuild'||action==='retry-model'){if(!leaveEditor())return;void operation(()=>api.run(p.name,action==='rebuild'?'SCENES_READY':until,action==='rebuild'?[shotId]:undefined,action==='retry-model'),t('running'));return;}
  if(action==='approve-board'||action==='approve-characters'){void operation(()=>api.approve(p.name,action==='approve-board'?'storyboard':'characters'),t('approved'));return;}
  if(action?.startsWith('toggle-')){
    if(!leaveEditor())return;
    const key=action==='toggle-board'?'storyboard':action==='toggle-characters'?'characterBible':action==='toggle-identity'?el.dataset.identity!:shotId;
    const fallback=action==='toggle-identity'?p.artifacts['character-bible']?.characters.find(c=>c.id===key)?.locked:action==='toggle-shot'?selected()?.locked:false;
    void operation(()=>api.locks(p.name,{[key]:!(p.locked[key] ?? fallback ?? false)}));return;
  }
  if(action==='save-document'&&document){const doc=document, content=window.document.querySelector<HTMLTextAreaElement>('#document-editor')!.value;void operation(()=>api.save(p.name,doc.name,typeof doc.data==='string'?content:JSON.parse(content),doc.revision));return;}
  if(action==='save-scene'&&scene){const doc={...scene,files:Array.from(window.document.querySelectorAll<HTMLTextAreaElement>('.scene-code')).map(e=>({path:e.dataset.file!,content:e.value}))};void operation(()=>api.saveScene(p.name,doc));}
});
window.document.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;
  if(!['create-form','upload-form','shot-form','setup-form','actor-form'].includes(form.id))return;event.preventDefault();
  if(form.id==='actor-form'){void operation(()=>saveActor(form));return;}
  if(form.id==='setup-form'){const start=(event as SubmitEvent).submitter?.getAttribute('value')==='run';void operation(()=>saveSetup(form,start));return;}
  if(form.id==='create-form'){
    const values=new FormData(form),name=String(values.get('name')??'');
    void operation(async()=>{await api.create(name,values.has('example'),String(values.get('presentationMode')) as 'diagram'|'story-cinematic');project=await api.project(name);shotId='';clock=0;modal.close();},t('created'));
  }else if(form.id==='upload-form'){
    const data=new FormData();for(const input of form.querySelectorAll<HTMLInputElement>('input[type=file]'))for(const file of input.files??[])data.append(input.name,file);
    void operation(async()=>{await api.upload(project!.name,data);modal.close();},t('uploaded'));
  }else void operation(()=>saveShot(form));
});
window.document.addEventListener('input',event=>{
  const el=event.target as HTMLInputElement;
  if(el.id==='scrub'){clock=Number(el.value);const shot=shots().find(s=>s.startMs<=clock&&s.endMs>clock)||shots().at(-1);if(mode==='composition'&&shot&&shot.id!==shotId&&!dirty){shotId=shot.id;renderPreview();if(tab==='inspector'||tab==='scene')void loadEditor();}updateClock();return;}
  if(el.id==='shot-filter'){filter=el.value;window.document.querySelector('#shot-list')!.innerHTML=shotList();return;}
  if(el.closest('#shot-form')||el.id==='document-editor'||el.classList.contains('scene-code'))markDirty();
});
window.document.addEventListener('change',event=>{
  const el=event.target as HTMLSelectElement;
  if(el.name==='language'){updateVoiceControls(true);return;}
  if(el.name==='tts_provider'){updateVoiceControls(false,true);return;}
  if(el.name==='voice_id'){updateVoiceControls();return;}
  if(el.name==='creative_provider'){
    const model=modal.querySelector<HTMLInputElement>('input[name="creative_model"]');
    if(model&&(!model.value.trim()||/^offline-/.test(model.value)))model.value=el.value==='codex-cli'?'default':el.value==='claude-cli'?'opus':el.value==='mock'?'offline-director':'';
    return;
  }
  if(el.id==='presentation-style'&&project){const p=project;if(!leaveEditor()){el.value=p.settings.presentation.mode;return;}void operation(()=>api.settings(p.name,{revision:p.settings.revision,presentation:{mode:el.value}}),v('Đã đổi phong cách; tiếp tục production để dựng lại hình ảnh.','Style saved; resume production to rebuild visuals.'));return;}
  if(el.id==='setup-host'&&project){const image=modal.querySelector<HTMLImageElement>('#host-choice-preview');if(image)image.src=el.value==='custom'?staticUrl(project.name,'previews/host-preview-sheet.png'):`${projectUrl(project.name)}/hosts/${el.value}/preview`;return;}
  if(el.id==='locale'){if(!leaveEditor()){el.value=locale;return;}dirty=false;locale=el.value as Locale;localStorage.setItem('story-factory.locale',locale);t=translator(locale);render();}
  if(el.id==='until')until=el.value as ProjectStatus;
  if(el.id==='chapter-filter'){chapterId=el.value;window.document.querySelector('#shot-list')!.innerHTML=shotList();}
  if(el.id==='preview-mode'){mode=el.value as Mode;playing=false;renderPreview();updateClock();}
  if(el.id==='log-source')void loadLog(el.value).catch(report);
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('message',event=>{const frame=window.document.querySelector<HTMLIFrameElement>('#scene-preview');if(event.source===frame?.contentWindow&&event.data?.type==='studio:ready')updateClock();});
function tick(now:number):void{
  if(playing&&mode==='composition'&&project){clock=Math.min(duration(),clock+Math.max(0,now-lastFrame));const active=shots().find(s=>s.startMs<=clock&&s.endMs>clock)||shots().at(-1);if(active&&active.id!==previewShotId&&!dirty){shotId=active.id;renderPreview();if(tab==='inspector'||tab==='scene')void loadEditor();}if(clock>=duration())playing=false;updateClock();}lastFrame=now;requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.setInterval(()=>{if(pollBusy||dirty||pending||modal.open||!project)return;pollBusy=true;const oldJob=JSON.stringify(project.job);const oldRevision=project.updatedAt;void refresh(false).then(()=>{if(oldJob!==JSON.stringify(project?.job)||oldRevision!==project?.updatedAt)render();else if(tab==='logs')return loadLog(window.document.querySelector<HTMLSelectElement>('#log-source')?.value??'orchestrator');}).catch(report).finally(()=>{pollBusy=false;});},3000);
render();void refresh().catch(report);


