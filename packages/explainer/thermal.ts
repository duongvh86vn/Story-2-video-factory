import type { ExplanationBeat } from './schemas.js';

const fold=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
type Entity=ExplanationBeat['entities'][number];
/** Keep a predicate's subject. Cooling assigned to the condenser must not cool the cylinder. */
export function thermalEvidence(entity:Pick<Entity,'label'|'kind'>,quote:string,others:Pick<Entity,'label'>[]=[]):Array<{value:'hot'|'cold';offset:number}>{
  if(!['cylinder','condenser','boiler'].includes(entity.kind))return [];
  const text=fold(quote),label=fold(entity.label),index=text.indexOf(label);if(index<0)return [];
  const stop=Math.min(text.length,...others.map(e=>text.indexOf(fold(e.label),index+label.length)).filter(i=>i>=0));
  const scope=text.slice(index,stop),out:Array<{value:'hot'|'cold';offset:number}>=[];
  for(const match of scope.matchAll(/\b(?:nong|lam nguoi|lam lanh|cool(?:ing)?|hot)\b/g)){
    const before=scope.slice(Math.max(0,match.index!-28),match.index);
    if(/\b(?:khong|chua|not|never)\b/.test(before))continue;
    const value=/nong|hot/.test(match[0])?'hot':'cold';
    if(out.at(-1)?.value!==value)out.push({value,offset:index+match.index!});
  }
  if(entity.kind==='condenser'&&!out.length&&/\b(?:lam lanh|lam nguoi)\b[^.!?;]{0,55}\bsang\b[^.!?;]{0,25}$/.test(text.slice(0,index)))out.push({value:'cold',offset:index});
  return out;
}
export function narratedStates(entity:Pick<Entity,'label'|'kind'|'sourceRefs'>,others:Pick<Entity,'label'>[]):NonNullable<Entity['states']>{
  return entity.sourceRefs.flatMap(ref=>thermalEvidence(entity,ref.quote,others).map(e=>({value:e.value,sourceRefs:[ref]}))).filter((e,i,all)=>i===0||all[i-1]!.value!==e.value);
}
