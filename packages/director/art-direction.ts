import type { Shot } from '../core/schemas.js';
import { escapeHtml, hash } from '../core/utils.js';
import { ArtDirectionSchema, type ArtDirection, type ArtKeyframe } from './art-direction-schemas.js';
export { ArtDirectionSchema, type ArtDirection } from './art-direction-schemas.js';
export const ARTWORK_RENDER_VERSION='passive-svg-2.2.4';
const tags=new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','text','tspan','defs','lineargradient','radialgradient','stop','clippath','mask']);
function decodeAttribute(value:string):string{
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity:string)=>{
    if(entity.startsWith('#')){
      const numeric=/^#x/i.test(entity)?Number.parseInt(entity.slice(2),16):Number(entity.slice(1));
      if(numeric<=0||numeric>0x10ffff||numeric>=0xd800&&numeric<=0xdfff)throw new Error('Art SVG invalid character reference');
      return String.fromCodePoint(numeric);
    }
    return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[entity.toLowerCase()]!;
  });
}

/** Passive SVG, with local definitions. Namespacing prevents collisions with the character/camera. */
export function artworkSvg(svg:string,prefix:string):string {
  if(/<!--|<!|<\?|&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/i.test(svg))throw new Error('Art SVG declarations/entities are forbidden');
  const ids=new Set<string>(),refs:string[]=[],stack:string[]=[],tokens:Array<{start:number;end:number;tag:string;closing:boolean;selfClosing:boolean;attributes:Map<string,string>}>=[];
  for(const match of svg.matchAll(/<([^>]*)>/g)){
    const raw=match[1]!,start=/^(\/?)([a-z][\w-]*)([\s\S]*)$/i.exec(raw);
    if(!start||!tags.has(start[2]!.toLowerCase()))throw new Error(`Art SVG unsupported/executable tag ${start?.[2]??'malformed'}. Supported passive tags: ${[...tags].join(', ')}`);
    const tag=start[2]!.toLowerCase();
    if(start[1]){if(start[3]!.trim()||stack.pop()!==tag)throw new Error('Art SVG has unbalanced tags');tokens.push({start:match.index!,end:match.index!+match[0].length,tag,closing:true,selfClosing:false,attributes:new Map()});continue;}
    if(!/\/$/.test(raw))stack.push(tag);
    let tail=start[3]!.replace(/\/$/,'');const attributes=new Map<string,string>();
    while(tail.trim()){
      const a=/^\s+([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(tail);
      if(!a)throw new Error('Art SVG attributes must be quoted');
      const key=a[1]!.toLowerCase(),value=decodeAttribute(a[2]??a[3]??'');tail=tail.slice(a[0].length);
      if(attributes.has(key))throw new Error('Art SVG duplicate attribute');attributes.set(key,value);
      if(/^on|^data-(?:composition|duration|start|width|height)|^(?:href|xlink:href|src|style|autoplay)$/i.test(key))throw new Error('Art SVG executable/resource/factory attributes are forbidden');
      if(key==='class'&&/\b(?:camera-rig|environment|performer|ground-shadow)\b/.test(value))throw new Error('Art SVG uses a reserved factory class');
      if(key==='id'){
        if(!/^[a-z][\w.-]*$/i.test(value)||ids.has(value))throw new Error('Art SVG IDs must be valid and unique');
        ids.add(value);
      }
      for(const ref of value.matchAll(/url\s*\(([^)]*)\)/gi)){
        if(!/^#[a-z][\w.-]*$/i.test(ref[1]!))throw new Error('Art SVG may reference only its own local definitions');
        refs.push(ref[1]!.slice(1));
      }
      if(/javascript:|https?:|data:|expression\s*\(/i.test(value)&&!(key==='xmlns'&&value==='http://www.w3.org/2000/svg'))throw new Error('Art SVG foreign resources are forbidden');
    }
    tokens.push({start:match.index!,end:match.index!+match[0].length,tag,closing:false,selfClosing:/\/$/.test(raw),attributes});
  }
  if(stack.length||svg.replace(/<[^>]*>/g,'').includes('<'))throw new Error('Art SVG has malformed markup');
  if(refs.some(id=>!ids.has(id)))throw new Error('Art SVG has an unresolved local definition');
  let result='',cursor=0;
  const xmlTags:Record<string,string>={lineargradient:'linearGradient',radialgradient:'radialGradient',clippath:'clipPath'};
  const xmlAttributes:Record<string,string>={viewbox:'viewBox',preserveaspectratio:'preserveAspectRatio',gradientunits:'gradientUnits',gradienttransform:'gradientTransform',spreadmethod:'spreadMethod',clippathunits:'clipPathUnits',maskunits:'maskUnits',maskcontentunits:'maskContentUnits',textlength:'textLength',lengthadjust:'lengthAdjust',patternunits:'patternUnits',patterntransform:'patternTransform'};
  for(const token of tokens){
    result+=svg.slice(cursor,token.start);cursor=token.end;
    const attributes=[...token.attributes].map(([key,value])=>{
      const canonical=key==='id'?`${prefix}.${value}`:value.replace(/url\s*\(#([\w.-]+)\)/gi,(_,id:string)=>`url(#${prefix}.${id})`);
      return ` ${xmlAttributes[key]??key}="${escapeHtml(canonical)}"`;
    }).join('');
    const tag=xmlTags[token.tag]??token.tag;
    result+=token.closing?`</${tag}>`:`<${tag}${attributes}${token.selfClosing?'/':''}>`;
  }
  return result+svg.slice(cursor);
}

/** Structural check: a motion target must own drawable content in the visible SVG tree. */
export function hasRenderedMotionGeometry(canonical:string):boolean{
  const stack:Array<{definition:boolean;hidden:boolean;motion:boolean}>=[];
  let cursor=0;
  for(const match of canonical.matchAll(/<([^>]*)>/g)){
    const parent=stack.at(-1);
    if(parent?.motion&&!parent.definition&&!parent.hidden&&canonical.slice(cursor,match.index).trim())return true;
    cursor=match.index!+match[0].length;
    const raw=match[1]!;
    if(raw.startsWith('/')){stack.pop();continue;}
    const tag=/^([\w-]+)/.exec(raw)![1]!.toLowerCase(),attributes=new Map([...raw.matchAll(/([\w:-]+)="([^"]*)"/g)].map(a=>[a[1]!.toLowerCase(),a[2]!]));
    const state={definition:!!parent?.definition||['defs','mask','clippath','lineargradient','radialgradient'].includes(tag),
      hidden:!!parent?.hidden||attributes.get('display')==='none'||['hidden','collapse'].includes(attributes.get('visibility')??'')||attributes.has('opacity')&&Number(attributes.get('opacity'))<=0,
      motion:!!parent?.motion||(attributes.get('class')??'').split(/\s+/).includes('motion')};
    const positive=(key:string)=>Number.parseFloat(attributes.get(key)??'0')>0;
    const drawable=tag==='path'?!!attributes.get('d')?.trim():tag==='rect'?positive('width')&&positive('height'):tag==='circle'?positive('r'):
      tag==='ellipse'?positive('rx')&&positive('ry'):tag==='line'?attributes.get('x1')!==attributes.get('x2')||attributes.get('y1')!==attributes.get('y2'):
      ['polygon','polyline'].includes(tag)?(attributes.get('points')?.match(/[-+]?\d*\.?\d+/g)?.length??0)>=4:false;
    if(state.motion&&!state.definition&&!state.hidden&&drawable)return true;
    if(!raw.endsWith('/'))stack.push(state);
  }
  return false;
}

export function validateArtDirection(shot:Shot):void{
  const input=shot.cinematic?.artDirection;if(!input)return;
  const art=ArtDirectionSchema.parse(input),duration=shot.endMs-shot.startMs;
  const ids=new Set<string>(),models=new Set<string>(),known=shot.sourceRefs??[];
  const sourced=(refs:typeof known)=>refs.length>0&&refs.every(ref=>known.some(source=>hash(source)===hash(ref)));
  for(const layer of art.layers){
    if(ids.has(layer.id))throw new Error(`${shot.id}: art layer ID duplicated`);ids.add(layer.id);
    artworkSvg(layer.svg,`${shot.id}.art.${layer.id}`);
    if(layer.role==='explanation'&&!sourced(layer.sourceRefs??[]))throw new Error(`${shot.id}: art explanation lacks source evidence`);
    let previous=-1;
    for(const frame of layer.keyframes){if(frame.atMs<=previous||frame.atMs>duration)throw new Error(`${shot.id}: art keyframes must be increasing within the narration clock`);previous=frame.atMs;}
    if(layer.keyframes[0]!.atMs!==0)throw new Error(`${shot.id}: art layers require an explicit initial pose for deterministic seeking`);
  }
  for(const model of art.models){
    const part=shot.visualization?.parts.find(part=>part.id===model.partId);
    // The glyph retains this sourced subject, and may explain it using additional
    // verified story evidence (for example an earlier thermal cycle in a recap).
    if(!part||models.has(model.partId)||!sourced(model.sourceRefs)||!model.sourceRefs.some(ref=>part.sourceRefs.some(original=>hash(ref)===hash(original))))throw new Error(`${shot.id}: custom model changed its source identity`);
    models.add(model.partId);
    const canonical=artworkSvg(model.svg,`${shot.id}.art.model.${model.partId}`);
    if(shot.visualization!.events.some(event=>event.targetId===model.partId&&event.motion!=='none')&&
      !hasRenderedMotionGeometry(canonical))throw new Error(`${shot.id}: custom motion event has no rendered motion geometry`);
  }
}

export function artLayers(shot:Shot,plane:ArtDirection['layers'][number]['plane']){
  const layers=shot.cinematic?.artDirection?.layers.filter(layer=>layer.plane===plane)??[];
  const scope=`[data-composition-id="${shot.id}"]`,calls:string[]=[];
  const transform=(f:ArtKeyframe)=>`translate(${f.x} ${f.y}) rotate(${f.rotation}) scale(${f.scale})`;
  const html=layers.map(layer=>{
    const target=JSON.stringify(`${scope} [id="art-layer-${layer.id}"]`),first=layer.keyframes[0]!;
    calls.push(`tl.set(${target},{attr:{transform:${JSON.stringify(transform(first))}},opacity:${first.opacity},immediateRender:true},0);`);
    for(let i=1;i<layer.keyframes.length;i++){
      const frame=layer.keyframes[i]!,previous=layer.keyframes[i-1]!;
      calls.push(`tl.to(${target},{attr:{transform:${JSON.stringify(transform(frame))}},opacity:${frame.opacity},duration:${(frame.atMs-previous.atMs)/1000},ease:"sine.inOut"},${previous.atMs/1000});`);
    }
    return `<g id="art-layer-${escapeHtml(layer.id)}" data-art-layer="${escapeHtml(layer.id)}" data-art-role="${layer.role}">${artworkSvg(layer.svg,`${shot.id}.art.${layer.id}`)}</g>`;
  }).join('');
  return {html,calls};
}
export function customModelArt(shot:Shot,partId:string,width:number,height:number):string|undefined {
  const model=shot.cinematic?.artDirection?.models.find(model=>model.partId===partId);
  if(!model)return undefined;
  let svg=artworkSvg(model.svg,`${shot.id}.art.model.${partId}`);
  // A complete SVG is an image in the centered model box; fragments already use centered coordinates.
  if(/^<svg\b[^>]*>[\s\S]*<\/svg>$/.test(svg.trim())){
    svg=svg.trim().replace(/^<svg\b([^>]*)>/,(_,attributes:string)=>{
      const rest=attributes.replace(/\s(?:x|y|width|height)="[^"]*"/g,'');
      return `<svg x="-50" y="-50" width="100" height="100"${/\bviewbox=/i.test(rest)?'':' viewBox="-50 -50 100 100"'}${rest}>`;
    });
  }
  // A custom SVG owns its own paint. Stock-model outlines must not stroke its
  // typography or backing shapes. Explicit artist strokes still override these defaults.
  return `<g data-custom-model="${escapeHtml(partId)}" fill="#000000" stroke="none" stroke-width="1" transform="scale(${width/100} ${height/100})">${svg}</g>`;
}

/** GSAP SVG origins live in the motion group's own SVG coordinates, never stage pixels. */
export function customModelMotionOrigin(shot:Shot,partId:string):{x:number;y:number}{
  const model=shot.cinematic?.artDirection?.models.find(model=>model.partId===partId);
  if(model?.motionOrigin)return model.motionOrigin;
  if(model){
    const svg=artworkSvg(model.svg,`${shot.id}.art.model.${partId}`).trim();
    const viewbox=/^<svg\b[^>]*\bviewbox="([^"]+)"/i.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
    if(viewbox?.length===4&&viewbox.every(Number.isFinite)&&viewbox[2]!>0&&viewbox[3]!>0)return {x:viewbox[0]!+viewbox[2]!/2,y:viewbox[1]!+viewbox[3]!/2};
  }
  return {x:0,y:0};
}
