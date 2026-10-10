import type {SceneFiles} from '../core/schemas.js';

export const SOURCE_PREVIEW_SCOPE='original-source-preview-v1' as const;
export const SOURCE_PREVIEW_META='story-factory-scope' as const;
export const SOURCE_PREVIEW_LABEL='UNAPPROVED SOURCE PREVIEW — AUDIO NOT INCLUDED' as const;

/** Diagnostic bytes have a durable HTML marker, even when a scene reader drops
 * notes. Ordinary production validation must never accept this scope. */
export function markSourcePreview(files:SceneFiles,shotId:string):SceneFiles{
  const scope=`[data-composition-id="${shotId}"]`;
  return {...files,files:files.files.map(file=>{
    if(file.path==='index.html'){
      if(!file.content.includes('</svg></div>')||!file.content.includes(`data-composition-id="${shotId}"`))throw new Error('Source preview requires the canonical cinematic composition structure');
      return {...file,content:file.content
      .replace(/<head\b[^>]*>/i,`$&<meta name="${SOURCE_PREVIEW_META}" content="${SOURCE_PREVIEW_SCOPE}">`)
      .replace(/(<[a-z][\w-]*\b[^>]*\bdata-composition-id="[^"]*"[^>]*)(>)/i,`$1 data-source-preview="${SOURCE_PREVIEW_SCOPE}"$2`)
      // The label belongs inside the composition, outside its moving camera.
      .replace('</svg></div>',`</svg><div data-source-preview-label="${SOURCE_PREVIEW_SCOPE}" class="source-preview-label">${SOURCE_PREVIEW_LABEL}</div></div>`)};
    }
    if(file.path==='style.css')return {...file,content:file.content+`\n${scope} .source-preview-label{position:absolute;left:12px;top:12px;padding:6px 10px;background:#251A12;color:#FFF2CF;font:600 14px sans-serif;z-index:1000;pointer-events:none;}`};
    return {...file};
  }),notes:[...files.notes,SOURCE_PREVIEW_SCOPE,SOURCE_PREVIEW_LABEL]};
}

export const sourcePreviewDescription={version:SOURCE_PREVIEW_SCOPE,
  scope:'opt-in complete original project source; shared cinematic HTML5/GSAP emitter; diagnostic scene files only',
  prerequisites:'all source audit checks passed; exact complete storyboard/narration and shot membership; actual activity, rig resources and background receipts',
  limits:'no source edits/providers/audio generation/browser/render/media/approval; optimistic freshness, not an OS snapshot; actual playback/art/motion still delegated to user QA',
  productionBinding:'needs-source-prop-binding',canPublish:false,approved:false,productionReady:false,productionRig:null,availableBanks:[],motionVerified:false,productionApproval:false};
