import type { Narration } from '../core/schemas.js';
import type { ExplanationBeat } from './schemas.js';
import { thermalEvidence } from './thermal.js';

type Entity=ExplanationBeat['entities'][number];
type Ref=ExplanationBeat['sourceRefs'][number];
const comparisons=[
  /\b(?<before>cách làm lạnh (?:ngay )?trong xi[ -]lanh)\s*,\s*(?<after>bình ngưng(?: tụ)? riêng)/iu,
  /\b(?<before>cooling (?:directly )?(?:inside|in) (?:the )?cylinder)\s*,\s*(?:a |the )?(?<after>separate condenser)\b/iu,
];
const components=[{cylinder:'xi-lanh',condenser:'bình ngưng'},{cylinder:'cylinder',condenser:'condenser'}];
export function configurationLabels(quote:string):{before:string;after:string}|undefined{
  for(const comparison of comparisons){
    const match=comparison.exec(quote);if(match?.groups)return {before:match.groups.before!,after:match.groups.after!};
  }
  return undefined;
}
/** A schematic grouping can carry only the component states established in earlier narration. */
export function splitSteamEvidence(refs:Ref[]):boolean{
  return components.some(({cylinder,condenser})=>refs.some(ref=>{const states=thermalEvidence({kind:'cylinder',label:cylinder},ref.quote,[{label:condenser}]);return states.length>0&&states.every(state=>state.value==='hot');})
    &&refs.some(ref=>thermalEvidence({kind:'condenser',label:condenser},ref.quote,[{label:cylinder}]).some(state=>state.value==='cold')));
}
export function steamConfigurations(beatId:string,startMs:number,refs:Ref[],narration:Narration):Entity[]|undefined{
  const comparisonRef=refs.find(ref=>configurationLabels(ref.quote)),labels=comparisonRef&&configurationLabels(comparisonRef.quote);
  if(!comparisonRef||!labels)return;
  const prior=narration.segments.filter(s=>s.endMs<=startMs).reverse();
  const stateRef=(kind:'cylinder'|'condenser',label:string,value:'hot'|'cold',other:string)=>{
    const cue=prior.find(s=>{const states=thermalEvidence({kind,label},s.text.slice(0,2000),[{label:other}]);return states.some(state=>state.value===value)&&(value!=='hot'||states.every(state=>state.value==='hot'));});
    return cue?{kind:'narration' as const,segmentId:cue.id,quote:cue.text.slice(0,2000)}:undefined;
  };
  const component=components[/\bcylinder\b/iu.test(labels.before)?1:0]!;
  const hot=stateRef('cylinder',component.cylinder,'hot',component.condenser),cold=stateRef('condenser',component.condenser,'cold',component.cylinder);
  if(!hot||!cold)return;
  // Keep comparison cue first so the action anchors remain on the current speech clock.
  return [{id:`${beatId}.before`,kind:'object',label:labels.before,configuration:'old-cylinder',sourceRefs:[comparisonRef]},
    {id:`${beatId}.after`,kind:'object',label:labels.after,configuration:'separate-condenser',sourceRefs:[comparisonRef,...[cold,hot].filter((r,i,all)=>all.findIndex(v=>v.segmentId===r.segmentId)===i)]}];
}
export function validateConfiguration(entity:Entity,method:ExplanationBeat['visualMethod']):void{
  if(!entity.configuration)return;
  const labels=entity.sourceRefs.map(ref=>configurationLabels(ref.quote)).find(Boolean);
  const problems:string[]=[];
  if(method!=='comparison')problems.push(`visualization.type must be comparison, received ${method}`);
  if(entity.kind!=='object')problems.push(`kind must be object for a grouped design, received ${entity.kind}; omit configuration on an individual component`);
  if(!labels)problems.push('sourceRefs must include the literal narrated comparison of cooling inside the cylinder with a separate condenser');
  else {
    const expected=entity.configuration==='old-cylinder'?labels.before:labels.after;
    if(entity.label!==expected)problems.push(`preserve the exact sourced label ${JSON.stringify(expected)}, received ${JSON.stringify(entity.label)}; display wording belongs in artDirection artwork`);
  }
  if(entity.configuration==='separate-condenser'&&!splitSteamEvidence(entity.sourceRefs))problems.push('sourceRefs must establish the improved cylinder staying hot and the separate condenser cooling; the old cylinder alternating hot/cold is insufficient');
  if(problems.length)throw new Error(`Entity ${entity.id}: configuration lacks its narrated comparison and component states: ${problems.join('; ')}`);
}
