import './style.css';
import { api, projectUrl, staticUrl, RequestError } from './api.js';
import { translator, type Locale, type TextKey } from './i18n.js';
import type { ArtifactDocument, ProjectDetail, ProjectSummary, SceneDocument } from '../../server/contracts.js';
import { SceneTypes, States, TransitionTypes, type Shot, type Storyboard, type ProjectStatus } from '../../../packages/core/schemas.js';
import { EXPLAINER_RECIPES } from '../../../packages/explainer/recipes.js';

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
let editorGeneration = 0, previewShotId = '', pollBusy = false;
let until: ProjectStatus = 'DONE';
let setupMode:'script'|'wav'|'srt'='script',scriptRevision='new',scriptFormat:'txt'|'md'='txt';
const v=(vi:string,en:string):string=>locale==='vi'?vi:en;
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (ms: number): string => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${(ms / 1000 % 60).toFixed(1).padStart(4, '0')}`;
const trStage = (stage: string): string => t(`stage${stage}` as TextKey);
const selected = (): Shot | undefined => project?.artifacts.storyboard?.shots.find(s => s.id === shotId);
const shots = (): Shot[] => project?.artifacts.storyboard?.shots ?? [];
const duration = (): number => project?.artifacts.narration?.durationMs ?? shots().at(-1)?.endMs ?? 1;
const locked = (shot: Shot): boolean => Boolean(project?.locked.storyboard || (project?.locked[shot.id] ?? shot.locked));
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
  <header class="project-header"><div><p class="eyebrow">${t('studio')} / ${trStage(p.state)}</p><h1>${esc(p.name)}</h1></div><div class="header-actions">${btn('setup',v('Nội dung · Host · Giọng','Input · Host · Voice'),p.busy?'disabled':'')}${btn('upload', t('inputs'))}${btn('refresh', '↻', `aria-label="${t('refresh')}"`, 'icon')}<label class="run-select">${t('stopAfter')}<select id="until" ${p.busy ? 'disabled' : ''}>${options(States.filter(s => s !== 'NEW'), until, trStage)}</select></label>${btn('run', p.busy ? t('running') : v('Tạo video','Create video'), p.busy || pending ? 'disabled' : '', 'primary')}</div></header>
  <section class="explainer-status"><span>${esc(p.settings.input.mode)} · ${esc(p.artifacts['host-profile']?.name ?? (p.settings.host.profile.includes('STICK-MAN')?v('Người que','Stick man'):v('Robot mini','Mini robot')))}</span><span>${v('Giọng','Voice')}: ${esc(p.artifacts['voice-report']?.status ?? v('Chưa tạo','Not created'))}</span>${p.waitingFor==='host-approval'?btn('approve-host',v('Duyệt host và tiếp tục','Approve host and continue'),p.busy?'disabled':''):''}${p.waitingFor==='voice'?btn('setup',v('Cấu hình giọng kể','Configure voice')):''}</section>
  <section class="production-status"><div class="progress"><span style="width:${p.progress.percent}%"></span></div><span>${p.progress.percent}% · ${trStage(p.state)}</span><span class="muted">${p.busy ? t('stopHint') : t('runHint')}</span></section>${p.job?.error || p.error ? `<p class="job-error" role="status">${esc(p.job?.error || p.error)}</p>` : ''}
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
  const url = mode === 'composition' ? shot && States.indexOf(project.state) >= States.indexOf('SCENES_READY') ? staticUrl(project.name, `scenes/${shot.id}/index.html`) : null : project.preview[mode];
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
function inspector(shot: Shot): string {
  const disabled = project!.busy || locked(shot);
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
  if (tab === 'inspector') { target.innerHTML = selected() ? inspector(selected()!) : empty(t('selectShot')); return; }
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
      target.innerHTML = panelIntro(t('scene'),s.host?v('Cảnh được tạo từ kế hoạch đã kiểm tra. Sửa target, layout hoặc camera trong storyboard rồi dựng lại shot.','This scene follows the validated plan. Edit targets, layout or camera in the storyboard and rebuild the shot.'):t('sceneHint'),s.host?btn('rebuild',t('rebuildShot'),p.busy?'disabled':''):btn('save-scene',t('saveScene'),p.busy || locked(s) ? 'disabled' : '', 'primary')) + `<div class="scene-editors">${doc.files.map(f=>`<label>${esc(f.path)}<textarea class="code-editor scene-code" data-file="${esc(f.path)}" spellcheck="false" ${p.busy || locked(s) || s.host ? 'readonly' : ''}>${esc(f.content)}</textarea></label>`).join('')}</div>`;
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
  const qc = p.artifacts['qc-report'] as {pass?:boolean;issues?:unknown[];warnings?:unknown[]} | undefined;
  const voice=p.artifacts['voice-report'],host=p.artifacts['host-profile'];
  const cost = p.artifacts['cost-report'] as Record<string,unknown> | undefined;
  return panelIntro(t('delivery'),'',p.preview.contactSheet ? `<a class="button" target="_blank" rel="noopener" href="${esc(p.preview.contactSheet)}">${t('viewContact')}</a>`:'')+`${voice||host?`<div class="report-grid"><article><h3>${v('Giọng và người dẫn','Voice and presenter')}</h3>${host?`<p>${esc(host.name)} · ${esc(host.kind)} · v${host.version}</p>`:''}<pre>${esc(JSON.stringify(voice??{},null,2))}</pre>${p.waitingFor?`<p>${v('Đang chờ','Waiting for')}: ${esc(p.waitingFor)}</p>`:''}</article></div>`:''}<div class="report-grid"><article><p class="eyebrow">${t('qc')}</p><h3>${qc ? t(qc.pass?'pass':'fail') : t('qcPending')}</h3>${qc ? `<pre>${esc(JSON.stringify(qc,null,2))}</pre>` : ''}</article><article><p class="eyebrow">${t('review')}</p><h3>${p.artifacts.review ? t(p.artifacts.review.pass?'pass':'fail') : t('qcPending')}</h3>${p.artifacts.review ? `<pre>${esc(JSON.stringify(p.artifacts.review,null,2))}</pre>`:''}</article><article><p class="eyebrow">${t('costs')}</p>${cost ? `<pre>${esc(JSON.stringify(cost,null,2))}</pre>`:`<p>${t('costPending')}</p>`}</article></div><h3>${t('downloads')}</h3><div class="downloads">${p.downloads.map(f=>`<a href="${projectUrl(p.name)}/downloads/${encodeURIComponent(f.name)}"><span>↓</span><b>${esc(f.name)}</b><small>${(f.size/1024).toFixed(1)} KB</small></a>`).join('') || `<p>${t('noDownloads')}</p>`}</div>`;
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
  const doc = await api.artifact<Storyboard>(p.name,'storyboard.json');
  const board = structuredClone(doc.data), index = board.shots.findIndex(s=>s.id===old.id), next = board.shots[index]!;
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
  modal.innerHTML = `<form id="create-form"><p class="eyebrow">STORY FACTORY</p><h2 id="modal-title">${t('newProject')}</h2>${field('name',t('name'),'')}<p class="muted">${t('nameHint')}</p><label class="check"><input type="checkbox" name="example" checked>${t('example')}</label><footer>${btn('close-modal',t('cancel'))}<button class="primary" type="submit">${t('create')}</button></footer></form>`; modal.showModal();
}
async function setupDialog():Promise<void>{
  const p=project!;setupMode=p.settings.input.mode==='auto'?(p.artifacts.narration?.mode==='srt'?'srt':p.artifacts.narration?'wav':'script'):p.settings.input.mode;
  const format=p.settings.input.script.endsWith('.md')?'md':'txt';scriptFormat=format;let script='';scriptRevision='new';
  try{const doc=await api.artifact<string>(p.name,`script.${format}`);script=doc.data;scriptRevision=doc.revision;}catch(error){if(!(error instanceof RequestError&&error.status===404))throw error;}
  const host=p.settings.host.profile.includes('STICK-MAN')?'stick-man':p.settings.host.profile.startsWith('library/')?'mini-robot':'custom',voice=p.settings.voice;
  modal.innerHTML=`<form id="setup-form"><h2>${v('Nhập nội dung và chọn người dẫn chuyện','Input and presenter')}</h2><nav class="input-tabs">${(['script','wav','srt']as const).map(k=>`<button type="button" data-input-mode="${k}" class="${setupMode===k?'active':''}">${k==='script'?v('Kịch bản','Script'):k.toUpperCase()}</button>`).join('')}</nav>
    <section data-mode-panel="script" ${setupMode!=='script'?'hidden':''}><label>${v('Lời kể hoàn chỉnh — đọc nguyên văn','Complete spoken script — read verbatim')}<textarea id="script-input" name="scriptText" rows="7">${esc(script)}</textarea></label><button type="button" data-action="script-preview">${v('Xem lời kể sẽ đọc','Preview spoken text')}</button><pre id="spoken-preview" class="script-preview" hidden></pre><label>${v('Định dạng','Format')}<select name="scriptFormat">${options(['txt','md'],format)}</select></label><label>${v('Hoặc tải kịch bản','Or upload a script')}<input type="file" name="script" accept=".txt,.md"></label></section>
    <section data-mode-panel="wav" ${setupMode!=='wav'?'hidden':''}><label>WAV<input name="narration" type="file" accept=".wav"></label><label>${v('SRT đi kèm (tùy chọn)','Companion SRT (optional)')}<input name="subtitles" type="file" accept=".srt"></label><p>${v('Giữ giọng trong WAV; SRT đi kèm được kiểm tra khớp audio.','Keep the WAV voice; companion SRT is checked against the audio.')}</p></section>
    <section data-mode-panel="srt" ${setupMode!=='srt'?'hidden':''}><label>SRT<input name="srt" type="file" accept=".srt"></label><p>${v('Giữ nguyên lời và clock; TTS đọc từng cue.','Preserve words and clock; TTS reads each cue.')}</p></section>
    <label>${v('Người dẫn chuyện','Presenter')}<select id="setup-host" name="host">${options(['mini-robot','stick-man','custom'],host,k=>k==='mini-robot'?v('Robot mini','Mini robot'):k==='stick-man'?v('Người que','Stick man'):v('Host từ MD riêng','Custom host MD'))}</select></label>
    <img id="host-choice-preview" class="host-choice-preview" alt="${v('Các pose của host','Host poses')}" src="${host==='custom'?staticUrl(p.name,'previews/host-preview-sheet.png'):`${projectUrl(p.name)}/hosts/${host}/preview`}"><label>${v('Host MD tùy chỉnh (tùy chọn)','Custom host MD (optional)')}<input type="file" name="host" accept=".md"></label>
    <fieldset class="voice-settings"><legend>${v('Giọng kể cho kịch bản/SRT','Voice for script/SRT')}</legend><label>${v('Dịch vụ giọng đọc','Speech provider')}<select name="tts_provider">${options(['none','windows-speech','http','command'],voice.tts_provider??'none',k=>k==='none'?v('Chưa cấu hình','Not configured'):k==='windows-speech'?v('Giọng cài trên Windows','Installed Windows voice'):k==='http'?'HTTP TTS':v('Trình đọc cục bộ đã cấu hình','Configured local speech program'))}</select></label>${field('voice_id',v('Tên/ID giọng (để trống dùng mặc định)','Voice name/ID (blank for default)'),voice.voice_id??'')}${field('base_url',v('Địa chỉ HTTP TTS','HTTP TTS address'),voice.base_url??'')}<details><summary>${v('Cấu hình nâng cao','Advanced settings')}</summary>${field('api_key_env',v('Tên biến môi trường chứa API key','API key environment variable'),voice.api_key_env)}${field('language',v('Ngôn ngữ','Language'),p.settings.language)}<label class="check"><input name="voiceDefault" type="checkbox">${v('Dùng giọng này làm mặc định cho dự án mới','Use this voice for new projects')}</label></details></fieldset>
    ${p.artifacts.script?`<details><summary>${v('Lời kể sau chuẩn hóa','Normalized spoken text')}</summary><pre class="script-preview">${esc(p.artifacts.script.text)}</pre></details>`:''}
    ${p.waitingFor==='host-approval'?`<p>${v('Host tùy chỉnh cần duyệt preview trước khi tiếp tục.','Approve the custom host preview before continuing.')}</p>`:''}
    <footer>${btn('close-modal',t('cancel'))}<button type="submit" name="intent" value="save">${v('Lưu','Save')}</button><button class="primary" type="submit" name="intent" value="run">${v('Tạo video','Create video')}</button></footer></form>`;modal.showModal();
}
async function saveSetup(form:HTMLFormElement,start:boolean):Promise<void>{
  const p=project!,data=new FormData(form),files=new FormData();
  for(const input of form.querySelectorAll<HTMLInputElement>('input[type=file]')){
    const section=input.closest<HTMLElement>('[data-mode-panel]');if(section?.hidden)continue;
    for(const file of input.files??[])files.append(input.name,file);
  }
  const hostFile=(form.querySelector<HTMLInputElement>('input[name=host]')?.files?.length??0)>0;
  const scriptFile=(form.querySelector<HTMLInputElement>('input[name=script]')?.files?.length??0)>0;
  if(Array.from(files.keys()).length)await api.upload(p.name,files);
  if(setupMode==='script'&&!scriptFile){const body=String(data.get('scriptText')??'');if(!body.trim())throw new Error(v('Nhập hoặc tải kịch bản trước.','Enter or upload a script first.'));const format=String(data.get('scriptFormat'))==='md'?'md':'txt';let revision=scriptRevision;if(format!==scriptFormat){try{revision=(await api.artifact(p.name,`script.${format}`)).revision;}catch(error){if(error instanceof RequestError&&error.status===404)revision='new';else throw error;}}await api.script(p.name,body,format,revision);}
  const refreshed=await api.project(p.name),provider=String(data.get('tts_provider')??'none');
  const voice={...refreshed.settings.voice,source:'auto',tts_provider:provider,voice_id:String(data.get('voice_id')??'')||null,api_key_env:String(data.get('api_key_env')??'TTS_API_KEY'),...(String(data.get('base_url')??'').trim()?{base_url:String(data.get('base_url')).trim()}:{})};
  await api.settings(p.name,{revision:refreshed.settings.revision,input:{mode:setupMode},host:hostFile?'custom':String(data.get('host')),language:String(data.get('language')??'vi'),voice,automatic:true});
  if(data.has('voiceDefault'))await api.voiceDefaults(voice);
  modal.close();if(start)await api.run(p.name,'DONE');
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
  if(action==='approve-host'){void operation(async()=>{await api.approve(p.name,'host');await api.run(p.name,'DONE');});return;}
  if(action==='mute'){muted=!muted;const voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');if(voice)voice.muted=muted;el.textContent=muted?'♪×':'♪';el.setAttribute('aria-label',t(muted?'unmute':'mute'));return;}
  if(action==='play'){if(mode!=='composition'){const video=window.document.querySelector<HTMLVideoElement>('#film-preview');if(video){if(video.paused)void video.play().catch(report);else video.pause();}return;}playing=!playing;lastFrame=performance.now();el.textContent=playing?'Ⅱ':'▶';el.setAttribute('aria-label',t(playing?'pause':'play'));const voice=window.document.querySelector<HTMLAudioElement>('#narration-preview');if(voice){voice.currentTime=clock/1000;if(playing)void voice.play().catch(report);else voice.pause();}return;}
  if(action==='previous'||action==='next'){const idx=shots().findIndex(s=>s.id===shotId), next=shots()[idx+(action==='next'?1:-1)];if(next)chooseShot(next.id);return;}
  if(action==='reload'){if(leaveEditor()){dirty=false;void loadEditor();}return;}
  if(action==='refresh'){if(leaveEditor()){dirty=false;void refresh().catch(report);}return;}
  if(action==='run'||action==='rebuild'){if(!leaveEditor())return;void operation(()=>api.run(p.name,action==='rebuild'?'SCENES_READY':until,action==='rebuild'?[shotId]:undefined),t('running'));return;}
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
  if(!['create-form','upload-form','shot-form','setup-form'].includes(form.id))return;event.preventDefault();
  if(form.id==='setup-form'){const start=(event as SubmitEvent).submitter?.getAttribute('value')==='run';void operation(()=>saveSetup(form,start));return;}
  if(form.id==='create-form'){
    const values=new FormData(form),name=String(values.get('name')??'');
    void operation(async()=>{await api.create(name,values.has('example'));project=await api.project(name);shotId='';clock=0;modal.close();},t('created'));
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
