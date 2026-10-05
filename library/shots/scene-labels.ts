import type {FactoryConfig} from '../../packages/core/config.js';
import {primaryLanguage,captionFonts} from '../../packages/core/languages.js';
import type {Shot} from '../../packages/core/schemas.js';
import type {Visualization} from '../../packages/explainer/schemas.js';
import {rendersModelLabel,rendersModelControl} from '../../packages/director/art-direction-schemas.js';

export const SCENE_LABELS_VERSION='scene-labels-1';
type Language='vi'|'en'|'ja'|'ko';
type Labels={heading:Readonly<Record<Visualization['type'],string>>;setting:string;concept:string;control:string};
const labels:Record<Language,Labels>={
  vi:{heading:{question:'Cùng tìm hiểu',mechanism:'Quan sát cách hoạt động',process:'Theo từng bước',evolution:'Qua các mốc được kể',comparison:'Cùng xem điểm khác nhau',breakdown:'Khám phá từng bộ phận','event-sequence':'Theo mạch câu chuyện',summary:'Nhớ lại điều vừa khám phá'},setting:'Bối cảnh và mô hình minh họa',concept:'Minh họa khái niệm',control:'Nút điều khiển mô hình minh họa'},
  en:{heading:{question:'Let’s explore',mechanism:'How it works',process:'Step by step',evolution:'Through the milestones',comparison:'Compare the differences',breakdown:'Explore the parts','event-sequence':'Follow the story',summary:'What we discovered'},setting:'Setting and illustration',concept:'Conceptual illustration',control:'Illustrative model control'},
  ja:{heading:{question:'一緒に考えよう',mechanism:'しくみを見てみよう',process:'順を追って',evolution:'発展の歩み',comparison:'違いを比べよう',breakdown:'各部分を見てみよう','event-sequence':'物語をたどろう',summary:'わかったこと'},setting:'場面と図解',concept:'概念の図解',control:'図解の操作部'},
  ko:{heading:{question:'함께 알아봐요',mechanism:'작동 원리',process:'단계별로 살펴봐요',evolution:'발전 과정',comparison:'차이를 비교해요',breakdown:'각 부분을 살펴봐요','event-sequence':'이야기를 따라가요',summary:'알게 된 내용'},setting:'장면과 설명 그림',concept:'개념 설명',control:'설명용 모형 조작부'},
};
/** Only factory labels are translated; narration and authored artwork stay verbatim. */
export function sceneLabels(language='vi'){
  const primary=primaryLanguage(language);
  const locale:Language=primary==='vi'||primary==='ja'||primary==='ko'?primary:'en';
  const fontFamily=captionFonts('Arial',locale).map(font=>font.includes(' ')?`'${font}'`:font).join(', ');
  return {...labels[locale],heading:{...labels[locale].heading},language:locale,fontFamily};
}
/** Localize only scenes that actually emit factory text; unrelated artwork keeps its cache. */
export function sceneLabelIdentity(shot:Shot,config:FactoryConfig):{version:string;language:Language}|undefined{
  if(config.content.mode!=='narrated-explainer'||!shot.host)return undefined;
  const locale=sceneLabels(config.project.language).language;
  if(locale==='vi')return undefined;
  const c=shot.cinematic;
  const actions=[...(c?.actorScene?.primary===null?[]:shot.host.actions),...(c?.actorScene?.supporting.flatMap(actor=>actor.actions)??[])];
  const builtinText=!c||c.artDirection?.showHeading!==false||shot.visualization?.parts.some(part=>(locale==='ja'||locale==='ko')&&rendersModelLabel(shot,part.id)||
    !c.propBindings.some(binding=>binding.partId===part.id)&&rendersModelControl(shot,part.id)&&actions.some(action=>action.type==='operate-model'&&action.target?.partId===part.id));
  return builtinText?{version:SCENE_LABELS_VERSION,language:locale}:undefined;
}
