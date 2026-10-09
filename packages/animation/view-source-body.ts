import {hash} from '../core/utils.js';
import {BodySourceSchema,type BodySource,type PerformancePlan,type Point} from './schemas.js';

/** A source owns all physical tracks; shot-local attention keeps its own clock. */
export function validateBodySourcePlan(plan:PerformancePlan):void{
  if(plan.sourceBody===undefined)return;
  const parsed=BodySourceSchema.safeParse(plan.sourceBody);
  if(!parsed.success)throw new Error('needs-view-body-phase: invalid original body source: '+parsed.error.message);
  const source=parsed.data;
  if(!Number.isInteger(plan.durationMs)||plan.durationMs<=0||source.endMs-source.startMs<plan.durationMs)throw new Error('needs-view-body-phase: original body source is shorter than the local plan duration');
  for(const name of ['walks','jumps','postures','supports','props','spears','turns','headTurns'] as const){
    if((plan[name]?.length??0)>0)throw new Error('needs-view-body-phase: source body conflicts with local '+name);
  }
  if(plan.entryPosture!==undefined||plan.lunge!==undefined)throw new Error('needs-view-body-phase: source body conflicts with local entryPosture/lunge');
}

/** Retain the complete original relative tracks for physical validation/sampling. */
export function sourceBodyPlan(plan:PerformancePlan):PerformancePlan{
  if(plan.sourceBody===undefined)return plan;
  validateBodySourcePlan(plan);
  const source=plan.sourceBody;
  return {...plan,sourceBody:undefined,sourceManipulation:undefined,sourceSpear:undefined,durationMs:source.endMs-source.startMs,
    walks:source.walks,jumps:source.jumps,postures:source.postures,entryPosture:source.entryPosture,supports:source.supports,
    gestures:[],gazes:[],expressions:[]};
}

/** Original physical track start expressed in the participating shot's clock. */
export function bodyTrackOffsetMs(plan:PerformancePlan,shotStartMs:number):number{
  if(!Number.isInteger(shotStartMs)||shotStartMs<0||!Number.isInteger(plan.durationMs)||plan.durationMs<=0||!Number.isInteger(shotStartMs+plan.durationMs))throw new Error('needs-view-body-phase: invalid participating shot span');
  if(plan.sourceBody===undefined)return 0;
  validateBodySourcePlan(plan);
  const source=plan.sourceBody;
  if(shotStartMs<source.startMs||shotStartMs+plan.durationMs>source.endMs)throw new Error('needs-view-body-phase: participating shot is outside its original body source coverage');
  return source.startMs-shotStartMs;
}

/** The existing root cubic, evaluated on the complete original physical path. */
export function bodyRootAt(plan:PerformancePlan,shotStartMs:number,localTimeMs:number):Point{
  const offsetMs=bodyTrackOffsetMs(plan,shotStartMs);
  if(!Number.isFinite(localTimeMs)||localTimeMs<0||localTimeMs>plan.durationMs)throw new Error('needs-view-body-phase: root time is outside the local shot');
  const timeMs=localTimeMs-offsetMs,source=plan.sourceBody;
  if(source&&(timeMs<0||timeMs>source.endMs-source.startMs))throw new Error('needs-view-body-phase: root time is outside the original body source');
  let x=plan.root.x;
  for(const walk of [...(source?.walks??plan.walks)].sort((a,b)=>a.startMs-b.startMs)){
    if(timeMs<walk.startMs)break;
    const t=Math.max(0,Math.min(1,(timeMs-walk.startMs)/(walk.endMs-walk.startMs)));
    x=walk.fromX+(walk.toX-walk.fromX)*(t*t*(3-2*t));
  }
  return {x,y:plan.root.y};
}

/** Every shot in an explicit continuous run must repeat the same full definition. */
export function collectViewSourceBody(entries:readonly {startMs:number;endMs:number;sourceBody?:BodySource}[],runStartMs:number,runEndMs:number):BodySource|undefined{
  if(!entries.some(entry=>entry.sourceBody!==undefined))return undefined;
  if(!Number.isInteger(runStartMs)||!Number.isInteger(runEndMs)||runStartMs<0||runEndMs<=runStartMs)throw new Error('needs-view-body-phase: invalid continuous run span');
  let source:BodySource|undefined,sourceHash:string|undefined,end=runStartMs;
  for(const entry of [...entries].sort((a,b)=>a.startMs-b.startMs)){
    if(!Number.isInteger(entry.startMs)||!Number.isInteger(entry.endMs)||entry.startMs<0||entry.endMs<=entry.startMs)throw new Error('needs-view-body-phase: invalid participating shot span');
    if(entry.sourceBody===undefined)throw new Error('needs-view-body-phase: participating shot is missing its original body source declaration');
    const parsed=BodySourceSchema.safeParse(entry.sourceBody);
    if(!parsed.success)throw new Error('needs-view-body-phase: invalid original body source: '+parsed.error.message);
    if(parsed.data.startMs!==runStartMs||parsed.data.endMs!==runEndMs)throw new Error('needs-view-body-phase: original body source must exactly span its continuous run; cuts cannot splice it');
    const definitionHash=hash(parsed.data);
    if(sourceHash!==undefined&&sourceHash!==definitionHash)throw new Error('needs-view-body-phase: original body source definition changed between participating shots');
    if(entry.startMs!==end||entry.endMs>runEndMs)throw new Error('needs-view-body-phase: original body source coverage has missing/duplicated or overlapping shots');
    source=source??parsed.data;sourceHash=definitionHash;end=entry.endMs;
  }
  if(end!==runEndMs)throw new Error('needs-view-body-phase: original body source coverage is incomplete');
  return source;
}

/** Bind a shot to the full source in its explicit run context, never by inference. */
export function validateViewSourceBody(plan:PerformancePlan,source:BodySource|undefined,startMs:number,endMs:number,runStartMs:number,runEndMs:number):void{
  if(plan.sourceBody===undefined&&source===undefined)return;
  validateBodySourcePlan(plan);
  if(plan.sourceBody===undefined||source===undefined)throw new Error('needs-view-body-phase: missing original body source declaration/context');
  const parsed=BodySourceSchema.safeParse(source);
  if(!parsed.success)throw new Error('needs-view-body-phase: invalid original body source context: '+parsed.error.message);
  if(!Number.isInteger(runStartMs)||!Number.isInteger(runEndMs)||runStartMs<0||runEndMs<=runStartMs||parsed.data.startMs!==runStartMs||parsed.data.endMs!==runEndMs)throw new Error('needs-view-body-phase: original body source must exactly span its continuous run; cuts cannot splice it');
  if(!Number.isInteger(startMs)||!Number.isInteger(endMs)||startMs<runStartMs||endMs>runEndMs||endMs<=startMs||plan.durationMs!==endMs-startMs)throw new Error('needs-view-body-phase: local plan differs from the exact source span projection');
  if(hash(BodySourceSchema.parse(plan.sourceBody))!==hash(parsed.data))throw new Error('needs-view-body-phase: local original body source differs from its run context');
}
