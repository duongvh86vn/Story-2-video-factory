import type { ExplanationBeat } from './schemas.js';

const fold=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
type Entity=ExplanationBeat['entities'][number];
/** Keep a predicate's subject. Cooling assigned to the condenser must not cool the cylinder. */
export function thermalEvidence(entity:Pick<Entity,'label'|'kind'>,quote:string,others:Pick<Entity,'label'>[]=[]):Array<{value:'hot'|'cold';offset:number}>{
  if(!['cylinder','condenser','boiler'].includes(entity.kind))return [];
  const text=fold(quote),label=fold(entity.label),index=text.indexOf(label);if(index<0)return [];
  const prefix=text.slice(0,index).split(/[.!?;]/u).at(-1)!;
  if(/\b(?:khong phai|not(?: the)?|no)\s*$/.test(prefix))return [];
  const stop=Math.min(text.length,...others.map(e=>text.indexOf(fold(e.label),index+label.length)).filter(i=>i>=0));
  // A later sentence about an unrelated subject cannot establish this component's state.
  const scope=text.slice(index,stop).split(/[.!?;]|\b(?:while|whereas|but)\s+(?:the|a|an)\b/u)[0]!,out:Array<{value:'hot'|'cold';offset:number}>=[];
  for(const match of scope.matchAll(/\b(?:nong|lam nguoi|lam lanh|cool(?:s|ed|ing)?|cold|hot)\b/g)){
    const before=scope.slice(Math.max(0,match.index!-28),match.index);
    if(/\b(?:khong|chua|not|never)\b/.test(before))continue;
    // English adjectives require a component predicate, rather than a nearby noun's
    // attribute. Qualifiers before the predicate stay valid: "by the tank is cold".
    if(/^(?:hot|cold)$/.test(match[0])&&!/\b(?:is|are|was|were|be|been|being|stay(?:s|ed)?|remain(?:s|ed)?|keeps?|kept|gets?|got|becomes?|became)(?:\s+(?:very|still|always|usually|now|quite|too|so|extremely|relatively|sufficiently|consistently))*\s*$/.test(before)
      &&!/^\s*:\s*$/.test(scope.slice(label.length,match.index)))continue;
    // A relative clause about a neighboring object cannot supply this subject's
    // temperature or cooling duty. Direct cooling verbs retain their cycle order.
    if(/^(?:hot|cold|cool(?:s|ed|ing)?)$/.test(match[0])&&/\b(?:beside|near(?:by)?|next to|in|on|under|above|by|with|contains?|holds?)\b.*\b(?:which|that|whose)\b/.test(scope.slice(label.length,match.index)))continue;
    const value=/nong|hot/.test(match[0])?'hot':'cold';
    if(out.at(-1)?.value!==value)out.push({value,offset:index+match.index!});
  }
  const transferredCooling=/\b(?:lam lanh|lam nguoi)\b[^.!?;]{0,55}\bsang\b[^.!?;]{0,25}$/.test(prefix)
    ||/\bcooling\b[^.!?;]{0,55}\bto\s+(?:(?:a|the)\s+)?(?:separate\s+)?$/.test(prefix);
  if(entity.kind==='condenser'&&!out.length&&transferredCooling&&!/\b(?:khong|chua|not|never|no)\b/.test(prefix))out.push({value:'cold',offset:index});
  return out;
}
export function narratedStates(entity:Pick<Entity,'label'|'kind'|'sourceRefs'>,others:Pick<Entity,'label'>[]):NonNullable<Entity['states']>{
  return entity.sourceRefs.flatMap(ref=>thermalEvidence(entity,ref.quote,others).map(e=>({value:e.value,sourceRefs:[ref]}))).filter((e,i,all)=>i===0||all[i-1]!.value!==e.value);
}
