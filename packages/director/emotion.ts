import type { Shot } from '../core/schemas.js';
import type { Mood, PerformancePlan } from '../animation/schemas.js';
import { fold } from '../explainer/plan.js';

/** Cue-level interpretation, never an invented word/phoneme clock or a fixed emotional percentage. */
export function cueExpressions(shot:Shot,fallback:Mood):PerformancePlan['expressions']{
  const duration=shot.endMs-shot.startMs,actions=shot.host?.actions??[];
  const boundaries=[...new Set([0,duration,...actions.flatMap(a=>[a.startMs-shot.startMs,a.endMs-shot.startMs])])].sort((a,b)=>a-b);
  const expressions:PerformancePlan['expressions']=[];
  for(let i=0;i<boundaries.length-1;i++){
    const startMs=boundaries[i]!,endMs=boundaries[i+1]!,middle=(startMs+endMs)/2+shot.startMs;
    const anchor=actions.find(a=>a.startMs<=middle&&a.endMs>middle)?.narrationAnchor??actions[0]?.narrationAnchor;
    const text=fold((shot.sourceRefs??[]).filter(ref=>ref.segmentId===anchor).map(ref=>ref.quote).join(' '));
    const mood:Mood=/nhan ra|phat hien|bat ngo|hoa ra/.test(text)?'surprised'
      :/hieu qua|cai tien|tach|rieng|duoc giu nong|su dung.*hon/.test(text)?'understanding'
      :/lang phi|van de|phai.*nhung|can.*nhung|kho khan/.test(text)?'concerned'
      :/\?|tai sao|nhu the nao/.test(text)?'curious':fallback;
    const previous=expressions.at(-1);
    if(previous?.mood===mood)previous.endMs=endMs;else expressions.push({startMs,endMs,mood});
  }
  return expressions;
}
