import ts from 'typescript';
import type { SceneFiles, Shot } from '../core/schemas.js';
import { SceneFilesSchema } from '../core/schemas.js';

export const SCENE_CSP = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
export const SCENE_FILENAMES = ['index.html','style.css','scene.js'] as const;
export const SCENE_SECURITY_VERSION = 4;
const animationKeys = new Set(['duration','delay','ease','stagger','opacity','autoAlpha','x','y','xPercent','yPercent','scale','scaleX','scaleY','rotation','rotationX','rotationY','transformOrigin','svgOrigin','width','height','visibility','strokeDashoffset','strokeDasharray','backgroundColor','color','borderColor','borderRadius','zIndex','immediateRender','overwrite','repeat','yoyo','paused','each','amount','from','grid']);
const tags = new Set(['html','head','meta','title','link','body','div','span','p','h1','h2','h3','h4','section','article','header','footer','main','blockquote','strong','em','b','i','br','ul','ol','li','img','video','source','svg','g','path','circle','ellipse','rect','line','polyline','polygon','text','tspan','defs','lineargradient','radialgradient','stop','clippath','mask','image','use','filter','fecolormatrix','script']);

function validTransform(value:string):boolean {
  const numeric='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
  const argumentsPattern=new RegExp(`^${numeric}(?:(?:\\s*,\\s*|\\s+)${numeric})*$`);
  let rest=value.trim(),count=0;
  while(rest){
    const operation=/^(translate|rotate|scale|matrix)\(([^()]*)\)/.exec(rest);
    if(!operation)return false;
    const body=operation[2]!.trim();
    if(!argumentsPattern.test(body))return false;
    const numbers=body.split(/[\s,]+/).map(Number);
    const arities=operation[1]==='matrix'?[6]:operation[1]==='rotate'?[1,3]:[1,2];
    if(!arities.includes(numbers.length)||!numbers.every(Number.isFinite))return false;
    if(operation[1]==='matrix'&&numbers.some(n=>Math.abs(n)>100000))return false;
    rest=rest.slice(operation[0].length).trim();count++;
  }
  return count>0;
}

function validBakedCurve(value:string):boolean {
  const numeric='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
  const point=numeric+'\\s+'+numeric,cubic='C'+point+'\\s+'+point+'\\s+'+point;
  const curve=new RegExp('^M'+point+'(?:\\s+'+cubic+'){2,9}$'),polyline=new RegExp('^M'+point+'(?:L'+point+'){2,95}Z?$');
  return value.length<=4096&&(curve.test(value)||polyline.test(value))
    &&(value.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)??[]).every(number=>Number.isFinite(Number(number))&&Math.abs(Number(number))<=100000);
}
function plainValue(node: ts.Expression, keys?: Set<string>): boolean {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind)) return true;
  if (ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken].includes(node.operator)) return plainValue(node.operand);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(element=>ts.isExpression(element)&&plainValue(element));
  if (ts.isObjectLiteralExpression(node)) return node.properties.every(property=>{
    if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name))) return false;
    const key=property.name.text;
    // Literal transforms and bounded finite baked cubic/open or closed polygon paths. No resource/style/
    // event mutation and no arbitrary AttrPlugin fields.
    if(key==='attr') return ts.isObjectLiteralExpression(property.initializer) && property.initializer.properties.length>=1 && property.initializer.properties.length<=2 && property.initializer.properties.every(p=>{
      if(!ts.isPropertyAssignment(p)||!(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)))return false;
      const field=p.name.text,value=p.initializer;
      if(field==='transform')return ts.isStringLiteral(value)&&validTransform(value.text);
      if(field==='d')return ts.isStringLiteral(value)&&validBakedCurve(value.text);
      return field==='stroke-width'&&ts.isNumericLiteral(value)&&Number(value.text)>0&&Number(value.text)<=200;
    });
    if(key==='repeat'&&!(ts.isNumericLiteral(property.initializer)&&Number(property.initializer.text)===0)) return false;
    if(['duration','delay','each','amount'].includes(key)&&!(ts.isNumericLiteral(property.initializer)&&Number(property.initializer.text)>=0&&Number(property.initializer.text)<=3600)) return false;
    return !['__proto__','prototype','constructor'].includes(key) && (!keys || keys.has(key)) && plainValue(property.initializer,keys);
  });
  return false;
}
/** Scene JS is a declarative GSAP subset, not arbitrary browser JavaScript. */
export function validateSceneScript(source: string, compositionId: string): string[] {
  const file=ts.createSourceFile('scene.js',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS), errors:string[]=[];
  const diagnostics=(file as ts.SourceFile & {parseDiagnostics:readonly ts.Diagnostic[]}).parseDiagnostics;
  for (const diagnostic of diagnostics) errors.push(`scene.js:${diagnostic.start??0}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
  let statements:readonly ts.Statement[]=file.statements;
  // The trusted IIFE keeps sub-composition variable names out of the shared global scope.
  if (statements.length===1 && ts.isExpressionStatement(statements[0]!) && ts.isCallExpression(statements[0]!.expression)) {
    const call=statements[0]!.expression;
    const expression=ts.isParenthesizedExpression(call.expression)?call.expression.expression:call.expression;
    if (ts.isFunctionExpression(expression) && expression.parameters.length===0 && call.arguments.length===0) statements=expression.body.statements;
  }
  let timeline=false, initialized=false, registered=false;
  const selectorPrefix=`[data-composition-id="${compositionId}"]`;
  for (const statement of statements) {
    if (ts.isEmptyStatement(statement)) continue;
    if (ts.isVariableStatement(statement)) {
      const declarations=statement.declarationList.declarations;
      const declaration=declarations[0];
      if (timeline || !(statement.declarationList.flags&ts.NodeFlags.Const) || declarations.length!==1 || !declaration || !ts.isIdentifier(declaration.name) || declaration.name.text!=='tl' || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) { errors.push('scene.js: only const tl = gsap.timeline({paused:true}) is permitted');continue; }
      const init=declaration.initializer;
      if (init.expression.getText(file)!=='gsap.timeline' || init.arguments.length!==1 || !ts.isObjectLiteralExpression(init.arguments[0]!) || init.arguments[0]!.getText(file).replace(/\s/g,'')!=='{paused:true}') errors.push('scene.js: timeline must have exactly {paused:true}');
      else timeline=true;
      continue;
    }
    if (!ts.isExpressionStatement(statement)) {errors.push(`scene.js: ${ts.SyntaxKind[statement.kind]} is outside the allowed timeline contract`);continue;}
    const expression=statement.expression;
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind===ts.SyntaxKind.EqualsToken) {
      const left=expression.left.getText(file).replace(/\s/g,'');
      if (left==='window.__timelines' && expression.right.getText(file).replace(/\s/g,'')==='window.__timelines||{}') { initialized=true;continue; }
      if (ts.isElementAccessExpression(expression.left) && expression.left.expression.getText(file)==='window.__timelines' && expression.left.argumentExpression && ts.isStringLiteral(expression.left.argumentExpression) && expression.left.argumentExpression.text===compositionId && ts.isIdentifier(expression.right) && expression.right.text==='tl' && timeline && initialized) {registered=true;continue;}
      errors.push('scene.js: assignments may only initialize/register the composition timeline');continue;
    }
    if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression) || !ts.isIdentifier(expression.expression.expression) || expression.expression.expression.text!=='tl' || !['set','to','from','fromTo'].includes(expression.expression.name.text) || !timeline) { errors.push('scene.js: only tl.set/to/from/fromTo calls are permitted');continue; }
    const target=expression.arguments[0];
    if (!target || !(ts.isStringLiteral(target) && target.text.startsWith(`${selectorPrefix} `) && !/[,~+]/.test(target.text) && !/^\s*[>~+]/.test(target.text.slice(selectorPrefix.length)) || ts.isObjectLiteralExpression(target) && target.properties.length===0)) errors.push('scene.js: every target must be scoped to this composition (or an empty duration sentinel)');
    const args=expression.arguments.slice(1);
    if (!args.every(arg=>plainValue(arg,animationKeys))) errors.push('scene.js: tween values must be literal data with allowed animation properties');
    if (expression.arguments.length < 2 || expression.arguments.length > 4) errors.push('scene.js: invalid GSAP argument count');
  }
  if (!timeline || !registered) errors.push('scene.js: missing paused timeline registration');
  return errors;
}
function validateCss(css: string): string[] {
  const normalized=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\\([\da-f]{1,6})\s?/gi,(_,hex:string)=>String.fromCodePoint(Number.parseInt(hex,16))).replace(/\\([^\n\r])/g,'$1');
  const errors:string[]=[];
  if (/@|(?:^|[;{\s])(?:animation|transition)(?:-[\w-]+)?\s*:|expression\s*\(|-moz-binding|behavior\s*:/i.test(normalized)) errors.push('style.css: imports, at-rules and clock-driven CSS animation are forbidden');
  for (const match of normalized.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) if (!/^#[a-z\w.-]+$/i.test(match[2]??'')) errors.push('style.css: URL resources are forbidden; use approved local img/video assets');
  return errors;
}
export function validateSceneFiles(input: SceneFiles, shot: Shot, maxBytes=500000, allowedAssets: readonly string[]=[],expectedSize?:{width:number;height:number}): string[] {
  const parsed=SceneFilesSchema.safeParse(input); if (!parsed.success) return parsed.error.issues.map(issue=>`scene-files: ${issue.path.join('.')}: ${issue.message}`);
  const errors:string[]=[], files=new Map<string,string>();
  for (const file of input.files) {
    if (!(SCENE_FILENAMES as readonly string[]).includes(file.path)) errors.push(`Forbidden scene file path: ${file.path}`);
    if (files.has(file.path)) errors.push(`Duplicate scene file: ${file.path}`);
    files.set(file.path,file.content);
  }
  if (input.dependencies.length) errors.push('Scene dependencies are forbidden; GSAP is supplied locally');
  if (input.files.reduce((size,file)=>size+Buffer.byteLength(file.content),0)>maxBytes) errors.push('Scene exceeds max_scene_bytes');
  for (const name of SCENE_FILENAMES) if (!files.has(name)) errors.push(`Missing ${name}`);
  const html=files.get('index.html')??'';
  const allowed=new Set(['style.css','scene.js','vendor/gsap.min.js',...allowedAssets]);
  let roots=0; const scripts:string[]=[];
  if (/<!--|<!ENTITY|<\?/.test(html)) errors.push('HTML comments, XML declarations and entities are forbidden');
  for (const match of html.matchAll(/<([^>]*)>/g)) {
    const raw=match[1]!;
    if (/^!doctype html$/i.test(raw.trim())) continue;
    const start=/^\/?([a-z][\w-]*)([\s\S]*)$/i.exec(raw);
    if (!start || !tags.has(start[1]!.toLowerCase())) { errors.push(`Forbidden or malformed HTML tag: ${raw.slice(0,70)}`);continue; }
    const tag=start[1]!.toLowerCase(); let tail=start[2]!.replace(/\/$/,''); const attributes=new Map<string,string>();
    while(tail.trim()) {
      const attribute=/^\s+([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/.exec(tail);
      if (!attribute) {errors.push(`Malformed/unquoted ${tag} attribute`);break;}
      const key=attribute[1]!.toLowerCase(), value=attribute[2]??attribute[3]??'';
      if (attributes.has(key)) errors.push(`Duplicate ${tag} attribute: ${key}`);
      attributes.set(key,value); tail=tail.slice(attribute[0].length);
      if (/^on/i.test(key) || ['autoplay','srcdoc','action','formaction','nonce','integrity','is'].includes(key)) errors.push(`Forbidden HTML attribute: ${key}`);
      if (['src','href','xlink:href','poster'].includes(key) && !allowed.has(value) && !/^#[a-z\w.-]+$/i.test(value)) errors.push(`Unapproved local resource: ${value}`);
      if (key==='srcset' || key==='ping') errors.push(`Forbidden HTML attribute: ${key}`);
      if (key==='style') errors.push(...validateCss(value));
    }
    if(tag==='use'&&!raw.startsWith('/')&&!/^#[a-z\w.-]+$/i.test(attributes.get('href')??attributes.get('xlink:href')??''))errors.push('SVG use must reference a local definition.');
    if(tag==='fecolormatrix'&&!raw.startsWith('/')){
      const values=(attributes.get('values')??'').trim().split(/\s+/).map(Number);
      if(attributes.get('type')!=='matrix'||values.length!==20||!values.every(value=>Number.isFinite(value)&&Math.abs(value)<=10))errors.push('SVG color matrix must contain 20 bounded finite numbers.');
    }
    if (tag==='script' && !raw.startsWith('/')) {
      const src=attributes.get('src'); if (src && !['vendor/gsap.min.js','scene.js'].includes(src)) errors.push('Only local GSAP and scene.js script tags are permitted');else if (src) scripts.push(src);
      if (attributes.has('type') && attributes.get('type')!=='text/javascript') errors.push('Module/importmap scripts are forbidden');
    }
    if (attributes.has('data-composition-src')) errors.push('A generated shot cannot load additional compositions');
    if (attributes.has('data-composition-id')) {
      roots++;if (attributes.get('data-composition-id')!==shot.id) errors.push('Composition ID must equal shot ID');
      if(Number(attributes.get('data-duration'))!==(shot.endMs-shot.startMs)/1000 || Number(attributes.get('data-start')??'0')!==0) errors.push('Shot composition timing must match the canonical local interval');
      const width=Number(attributes.get('data-width')),height=Number(attributes.get('data-height'));
      if(!(width>0&&height>0)||(expectedSize&&(width!==expectedSize.width||height!==expectedSize.height))) errors.push('Shot composition dimensions do not match the render profile');
    }
    if (tag==='meta' && attributes.has('http-equiv') && attributes.get('http-equiv')!.toLowerCase()!=='content-security-policy') errors.push('Meta refresh/headers are forbidden');
    if (tag==='link' && attributes.get('rel')!=='stylesheet') errors.push('Only local stylesheet links are permitted');
  }
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    const inline = match[1]!.trim();
    if (inline && !/^window\.__timelines\s*=\s*window\.__timelines\s*\|\|\s*\{\};?$/.test(inline)) errors.push('Inline authored JS is forbidden; use scene.js');
  }
  if (roots!==1) errors.push('Exactly one shot composition root is required');
  if (scripts.join('|')!=='vendor/gsap.min.js|scene.js') errors.push('Scripts must load GSAP then scene.js exactly once');
  const css=files.get('style.css')??'',scope=`[data-composition-id="${shot.id}"]`;
  for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)) for(const selector of rule[1]!.split(',').map(value=>value.trim())) {
    if(selector==='html'||selector==='body') {
      if(!rule[2]!.split(';').filter(Boolean).every(declaration=>/^\s*(?:margin\s*:\s*0|overflow\s*:\s*hidden|background(?:-color)?\s*:\s*#[\da-f]{3,8})\s*$/i.test(declaration))) errors.push('Global html/body CSS may only reset margin/overflow/background');
    } else if(!(selector===scope||selector.startsWith(`${scope} `))||/[,~+]/.test(selector)||/^\s*[>~+]/.test(selector.slice(scope.length))) errors.push('CSS selectors must stay inside this composition namespace');
  }
  errors.push(...validateCss(css),...validateSceneScript(files.get('scene.js')??'',shot.id));
  return [...new Set(errors)];
}
export function secureSceneFiles(input: SceneFiles): SceneFiles {
  return {...input,files:input.files.map(file=>{
    if (file.path==='index.html') {
      const content=file.content.replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])content-security-policy\1[^>]*>/gi,'').replace(/<head\b[^>]*>/i,`$&<meta http-equiv="Content-Security-Policy" content="${SCENE_CSP}">`);
      return {...file,content};
    }
    if (file.path==='scene.js' && !/^\s*\(function\s*\(/.test(file.content)) return {...file,content:`(function(){\n${file.content}\n})();\n`};
    return file;
  })};
}
