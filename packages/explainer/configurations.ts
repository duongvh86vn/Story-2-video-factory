import type { Narration } from '../core/schemas.js';
import type { ExplanationBeat } from './schemas.js';
import { thermalEvidence } from './thermal.js';

type Entity=ExplanationBeat['entities'][number];
type Ref=ExplanationBeat['sourceRefs'][number];
const comparison=/\b(?<before>cách làm lạnh (?:ngay )?trong xi[ -]lanh)\s*,\s*(?<after>bình ngưng(?: tụ)? riêng)/iu;
export function configurationLabels(quote:string):{before:string;after:string}|undefined{
  const match=comparison.exec(quote);return match?.groups?{before:match.groups.before!,after:match.groups.after!}:undefined;
}
/** A schematic grouping can carry only the component states established in earlier narration. */
export function splitSteamEvidence(refs:Ref[]):boolean{
  return refs.some(ref=>{const states=thermalEvidence({kind:'cylinder',label:'xi-lanh'},ref.quote,[{label:'bình ngưng'}]);return states.length>0&&states.every(state=>state.value==='hot');})
    &&refs.some(ref=>thermalEvidence({kind:'condenser',label:'bình ngưng'},ref.quote,[{label:'xi-lanh'}]).some(state=>state.value==='cold'));
}
export function steamConfigurations(beatId:string,startMs:number,refs:Ref[],narration:Narration):Entity[]|undefined{
  const comparisonRef=refs.find(ref=>configurationLabels(ref.quote)),labels=comparisonRef&&configurationLabels(comparisonRef.quote);
  if(!comparisonRef||!labels)return;
  const prior=narration.segments.filter(s=>s.endMs<=startMs).reverse();
  const stateRef=(kind:'cylinder'|'condenser',label:string,value:'hot'|'cold',other:string)=>{
    const cue=prior.find(s=>{const states=thermalEvidence({kind,label},s.text.slice(0,2000),[{label:other}]);return states.some(state=>state.value===value)&&(value!=='hot'||states.every(state=>state.value==='hot'));});
    return cue?{kind:'narration' as const,segmentId:cue.id,quote:cue.text.slice(0,2000)}:undefined;
  };
  const hot=stateRef('cylinder','xi-lanh','hot','bình ngưng'),cold=stateRef('condenser','bình ngưng','cold','xi-lanh');
  if(!hot||!cold)return;
  // Keep comparison cue first so the action anchors remain on the current speech clock.
  return [{id:`${beatId}.before`,kind:'object',label:labels.before,configuration:'old-cylinder',sourceRefs:[comparisonRef]},
    {id:`${beatId}.after`,kind:'object',label:labels.after,configuration:'separate-condenser',sourceRefs:[comparisonRef,...[cold,hot].filter((r,i,all)=>all.findIndex(v=>v.segmentId===r.segmentId)===i)]}];
}
export function validateConfiguration(entity:Entity,method:ExplanationBeat['visualMethod']):void{
  if(!entity.configuration)return;
  const labels=entity.sourceRefs.map(ref=>configurationLabels(ref.quote)).find(Boolean);
  if(method!=='comparison'||entity.kind!=='object'||!labels||entity.label!==(entity.configuration==='old-cylinder'?labels.before:labels.after)
    ||entity.configuration==='separate-condenser'&&!splitSteamEvidence(entity.sourceRefs))throw new Error(`Entity ${entity.id}: configuration lacks its narrated comparison and component states`);
}
