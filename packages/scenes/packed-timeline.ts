import ts from 'typescript';
import {gzipSync,gunzipSync} from 'node:zlib';
import {PAKO_INFLATE_SOURCE} from './vendor/pako-inflate.js';

// Transport only: exact GSAP values and call order survive the round trip.
// No code/eval is stored in the payload. security.ts validates the expanded
// declarative calls before allowing the byte-exact browser decoder below.
const SCALE=10000000,MAX_BYTES=64*1024*1024,MAX_CALLS=250000;
type Literal=null|boolean|number|string|Literal[]|{[key:string]:Literal};
type Step=[string,Literal];
type Column=[Literal,Step[]];
interface Packed {v:1;templates:string[][];columns:Column[];order:number[];}
const methods=new Set(['set','to','from','fromTo']);
const decimal=(n:number)=>{
 const a=Math.abs(n),s=String(a%SCALE).padStart(7,'0').replace(/0+$/,'');
 return (n<0?'-':'')+Math.floor(a/SCALE)+(s?'.'+s:'');
};
function literal(n:ts.Expression):Literal{
 if(ts.isStringLiteral(n))return n.text;
 if(ts.isNumericLiteral(n)){const value=Number(n.text);if(!Number.isFinite(value))throw Error('Non-finite literal');return value;}
 if(n.kind===ts.SyntaxKind.TrueKeyword)return true;if(n.kind===ts.SyntaxKind.FalseKeyword)return false;if(n.kind===ts.SyntaxKind.NullKeyword)return null;
 if(ts.isPrefixUnaryExpression(n)&&[ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken].includes(n.operator)){
  const value=literal(n.operand);if(typeof value!=='number')throw Error('Non-numeric unary literal');return n.operator===ts.SyntaxKind.MinusToken?-value:value;
 }
 if(ts.isArrayLiteralExpression(n))return n.elements.map(e=>{if(!ts.isExpression(e))throw Error('Non-literal array');return literal(e);});
 if(ts.isObjectLiteralExpression(n)){
  const out:Record<string,Literal>=Object.create(null);
  for(const p of n.properties){if(!ts.isPropertyAssignment(p)||!(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name))||Object.hasOwn(out,p.name.text))throw Error('Non-literal/duplicate property');out[p.name.text]=literal(p.initializer);}return out;
 }
 throw Error('Non-literal GSAP argument');
}
function encode(value:Literal,path:string,state:Map<string,number[]>,templates:string[][],ids:Map<string,number>):Literal{
 if(typeof value==='string'){
  const matches=[...value.matchAll(/-?\d+(?:\.\d+)?/g)];
  const nums=matches.map(m=>{const [i,d='']=m[0].replace('-','').split('.');return (m[0][0]==='-'?-1:1)*(Number(i)*SCALE+Number(d.padEnd(7,'0')));});
  if(matches.length>=2&&matches.every((m,i)=>Number.isSafeInteger(nums[i])&&Math.abs(nums[i]!)<=1e14&&decimal(nums[i]!)===m[0])){
   let at=0;const parts=matches.map(m=>{const s=value.slice(at,m.index);at=m.index!+m[0].length;return s;});parts.push(value.slice(at));
   const key=JSON.stringify(parts);let id=ids.get(key);if(id===undefined){id=templates.length;ids.set(key,id);templates.push(parts);}
   const sk=path+':'+id,previous=state.get(sk)??nums.map(()=>0),delta=nums.map((n,i)=>n-previous[i]!);state.set(sk,nums);return [1,id,delta];
  }return [0,value];
 }
 if(Array.isArray(value))return [2,...value.map((v,i)=>encode(v,path+'.'+i,state,templates,ids))];
 if(value&&typeof value==='object')return [3,...Object.entries(value).flatMap(([key,v])=>[key,encode(v,path+'.'+key,state,templates,ids)])];
 return value;
}

// Kept as literal JS so its exact bytes are identical in tsx and built Node.
// Browser reconstructs columns first, then replays ORIGINAL interleaving. Each
// empty target is fresh, just as in the uncompressed duration sentinels.
export const PACKED_TIMELINE_PREFIX='(function(tl,encoded){const module={exports:{}},exports=module.exports;'+PAKO_INFLATE_SOURCE+`;const p=JSON.parse(module.exports.ungzip(atob(encoded),{to:"string"}));
function decimal(n){const a=Math.abs(n),s=String(a%10000000).padStart(7,"0").replace(/0+$/,"");return(n<0?"-":"")+Math.floor(a/10000000)+(s?"."+s:"");}
function decode(v,path,state){if(!Array.isArray(v))return v;if(v[0]===0)return v[1];if(v[0]===1){const key=path+":"+v[1],prev=state.get(key)||v[2].map(()=>0),nums=v[2].map((n,i)=>n+prev[i]);state.set(key,nums);const parts=p.templates[v[1]];return parts[0]+nums.map((n,i)=>decimal(n)+parts[i+1]).join("");}if(v[0]===2)return v.slice(1).map((e,i)=>decode(e,path+"."+i,state));const o={};for(let i=1;i<v.length;i+=2)o[v[i]]=decode(v[i+1],path+"."+v[i],state);return o;}
const columns=p.columns.map(c=>{const state=new Map();return[c[0],c[1].map(s=>[s[0],decode(s[1],"",state)])];}),cursors=columns.map(()=>0);
for(const index of p.order){const c=columns[index],s=c[1][cursors[index]++];tl[s[0]](typeof c[0]==="string"?c[0]:{},...s[1]);}
})(tl,`;

function packCalls(calls:ts.CallExpression[]):string{
 const columns:Column[]=[],order:number[]=[],targets=new Map<string,number>(),templates:string[][]=[],ids=new Map<string,number>(),states:Map<string,number[]>[]=[];
 for(const call of calls){
  const method=(call.expression as ts.PropertyAccessExpression).name.text,args=call.arguments.map(literal),target=args.shift()!;
  const key=JSON.stringify(target);let index=targets.get(key);
  if(index===undefined){index=columns.length;targets.set(key,index);columns.push([target,[]]);states.push(new Map());}
  columns[index]![1].push([method,encode(args,'',states[index]!,templates,ids)]);order.push(index);
 }
 const data:Packed={v:1,templates,columns,order},json=JSON.stringify(data);
 if(Buffer.byteLength(json)>MAX_BYTES||calls.length>MAX_CALLS)throw Error('Packed timeline exceeds bounds');
 return PACKED_TIMELINE_PREFIX+JSON.stringify(gzipSync(json,{level:9}).toString('base64'))+');';
}

/** Unsupported authored code is left intact for the normal security rejection. */
export function packTimelineScript(source:string,threshold=250000):string{
 if(Buffer.byteLength(source)<threshold)return source;
 try{
  const file=ts.createSourceFile('scene.js',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  let statements:readonly ts.Statement[]=file.statements;
  if(statements.length===1&&ts.isExpressionStatement(statements[0]!)&&ts.isCallExpression(statements[0]!.expression)){
   const call=statements[0]!.expression,e=ts.isParenthesizedExpression(call.expression)?call.expression.expression:call.expression;
   if(ts.isFunctionExpression(e)&&e.parameters.length===0&&call.arguments.length===0)statements=e.body.statements;
  }
  const edits:{start:number;end:number;text:string}[]=[],group:ts.ExpressionStatement[]=[];
  const flush=()=>{
   if(!group.length)return;const start=group[0]!.getStart(file),end=group.at(-1)!.end,original=source.slice(start,end);
   if(Buffer.byteLength(original)>=threshold){const text=packCalls(group.map(s=>s.expression as ts.CallExpression));if(Buffer.byteLength(text)<Buffer.byteLength(original)*.9)edits.push({start,end,text});}group.length=0;
  };
  for(const statement of statements){
   const e=ts.isExpressionStatement(statement)?statement.expression:undefined;
   if(e&&ts.isCallExpression(e)&&ts.isPropertyAccessExpression(e.expression)&&ts.isIdentifier(e.expression.expression)&&e.expression.expression.text==='tl'&&methods.has(e.expression.name.text))group.push(statement as ts.ExpressionStatement);else flush();
  }flush();for(const edit of edits.reverse())source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);return source;
 }catch{return source;}
}

const check=(ok:unknown,message:string):void=>{if(!ok)throw Error(message);};
/** Returns declarative calls, never executable payload code. Bounded before AST validation. */
export function unpackTimelineCall(source:string):string|null{
 if(!source.startsWith(PACKED_TIMELINE_PREFIX))return null;
 const tail=source.slice(PACKED_TIMELINE_PREFIX.length),match=/^"([A-Za-z0-9+/]*={0,2})"\);?$/.exec(tail);
 check(match&&match[1]!.length<=MAX_BYTES,'Invalid packed payload');const b64=match![1]!;
 const bytes=Buffer.from(b64,'base64');check(bytes.toString('base64')===b64,'Non-canonical packed base64');
 const p=JSON.parse(gunzipSync(bytes,{maxOutputLength:MAX_BYTES}).toString('utf8')) as Packed;
 check(p&&p.v===1&&Object.keys(p).sort().join(',')==='columns,order,templates,v','Invalid packed schema');
 check(Array.isArray(p.templates)&&p.templates.length<=2000&&p.templates.every(t=>Array.isArray(t)&&t.length>=3&&t.length<=1000&&t.every(s=>typeof s==='string'&&s.length<=4096)),'Invalid packed templates');
 check(Array.isArray(p.columns)&&p.columns.length<=10000&&Array.isArray(p.order)&&p.order.length<=MAX_CALLS,'Invalid packed columns/order');
 function decode(v:Literal,path:string,state:Map<string,number[]>,depth=0):Literal{
  check(depth<=32,'Packed value nesting exceeds bounds');
  if(!Array.isArray(v)){check(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v),'Invalid packed scalar');return v;}
  if(v[0]===0){check(v.length===2&&typeof v[1]==='string','Invalid packed string');return v[1]!;}
  if(v[0]===1){
   const id=v[1],deltas=v[2];check(v.length===3&&typeof id==='number'&&Number.isInteger(id)&&id>=0&&id<p.templates.length&&Array.isArray(deltas),'Invalid packed vector');
   const parts=p.templates[id as number]!,ns=deltas as number[];check(ns.length===parts.length-1&&ns.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=2e14),'Invalid packed deltas');
   const key=path+':'+id,prev=state.get(key)??ns.map(()=>0),nums=ns.map((n,i)=>n+prev[i]!);
   check(nums.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1e14),'Packed vector overflow');state.set(key,nums);
   return parts[0]!+nums.map((n,i)=>decimal(n)+parts[i+1]!).join('');
  }
  if(v[0]===2)return v.slice(1).map((e,i)=>decode(e,path+'.'+i,state,depth+1));
  check(v[0]===3&&v.length%2===1,'Invalid packed object');const out:Record<string,Literal>=Object.create(null);
  for(let i=1;i<v.length;i+=2){const key=v[i];check(typeof key==='string'&&!Object.hasOwn(out,key),'Invalid packed object key');out[key as string]=decode(v[i+1]!,path+'.'+key,state,depth+1);}return out;
 }
 let count=0,totalBytes=0;
 const columns=p.columns.map(c=>{
  check(Array.isArray(c)&&c.length===2&&(typeof c[0]==='string'||c[0]!==null&&typeof c[0]==='object'&&!Array.isArray(c[0])&&Object.keys(c[0]).length===0)&&Array.isArray(c[1]),'Invalid packed column');
  const state=new Map<string,number[]>();
  const steps=c[1].map(s=>{check(++count<=MAX_CALLS&&Array.isArray(s)&&s.length===2&&methods.has(s[0]),'Invalid packed step');const args=decode(s[1],'',state);check(Array.isArray(args)&&args.length>=1&&args.length<=3,'Invalid packed arguments');
   const line=`tl.${s[0]}(${[c[0],...(args as Literal[])].map(v=>JSON.stringify(v)).join(',')});`;
   totalBytes+=Buffer.byteLength(line);check(totalBytes<=MAX_BYTES,'Expanded timeline exceeds bounds');return line;});return steps;
 });
 check(count===p.order.length,'Packed call count mismatch');const cursors=columns.map(()=>0),lines:string[]=[];
 for(const i of p.order){check(Number.isInteger(i)&&i>=0&&i<columns.length&&cursors[i]!<columns[i]!.length,'Invalid packed call order');lines.push(columns[i]![cursors[i]!]!);cursors[i]=cursors[i]!+1;}
 check(cursors.every((n,i)=>n===columns[i]!.length),'Packed calls were omitted');return lines.join('\n');
}
