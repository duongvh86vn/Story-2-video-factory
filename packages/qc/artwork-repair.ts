import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ProjectState, ReviewIssue, Shot, Storyboard } from '../core/schemas.js';
import { exists, hash, readJson, safeRealPath, writeJson } from '../core/utils.js';
import { outputPath } from '../render/process.js';

const FindingSchema=z.object({type:z.string(),severity:z.enum(['high','medium','low']),description:z.string(),
  startMs:z.number().finite().optional(),endMs:z.number().finite().optional()});
interface QCResult {pass:boolean;issues:unknown[];video:unknown;}

/** Only complete, actionable freeze findings can enter the artwork-only repair path. */
export function frozenArtworkIssues(qc:QCResult,board:Storyboard,durationMs:number,isLocked:(shot:Shot)=>boolean):ReviewIssue[]|undefined {
  if(qc.pass||!Number.isFinite(durationMs)||durationMs<=0)return undefined;
  const parsed=z.array(FindingSchema).safeParse(qc.issues);
  if(!parsed.success)return undefined;
  const high=parsed.data.filter(issue=>issue.severity==='high');
  if(!high.length)return undefined;
  const shots=board.shots.slice().sort((a,b)=>a.startMs-b.startMs),issues:ReviewIssue[]=[];
  for(const finding of high){
    const {startMs,endMs}=finding;
    if(finding.type!=='frozen-frames'||startMs===undefined||endMs===undefined||startMs<0||endMs<=startMs||endMs>durationMs)return undefined;
    let cursor=startMs;
    for(const shot of shots.filter(shot=>shot.endMs>startMs&&shot.startMs<endMs)){
      const start=Math.max(startMs,shot.startMs),end=Math.min(endMs,shot.endMs);
      // No gaps, overlapping shots, missing artwork or locked revisions are repaired automatically.
      if(start!==cursor||end<=start||!shot.cinematic?.artDirection||isLocked(shot))return undefined;
      issues.push({shotId:shot.id,type:'qc-frozen-frames',severity:'high',
        description:`Final video is frozen at ${start}–${end}ms (shot-local ${start-shot.startMs}–${end-shot.startMs}ms). ${finding.description}`,
        repair:shot.cinematic.actorScene&&(shot.cinematic.actorScene.primary||shot.cinematic.actorScene.supporting.length)?'Repair the sourced actor reaction during this measured interval through motivated expression, gaze, posture and non-contact reaction with preparation and recovery. Preserve narration, scene sources, actors and appearance, camera, clocks, assets, contact, locomotion and manipulated objects. Do not add new dialogue, facts or actions from a different story. No jitter, decorative blink, whole-image drift, QC threshold change or declaring the interval intentionally static. Render and inspect again.':'Animate the existing sourced explanation through meaningful local reveals, component emphasis or a visible process during this interval. Keep every narration word, cue/shot clock, character identity, action target, contact dependency, camera and asset reference. Keep the historical comparisons and caveats accurate. Do not add a presenter, invent facts, hide a freeze with arbitrary jitter, decorative blinking or whole-image motion, change QC thresholds, or declare the interval intentionally static. The final video must be rendered and checked again.'});
      cursor=end;
    }
    if(cursor!==endMs)return undefined;
  }
  return issues;
}

const AttemptSchema=z.object({id:z.string().uuid(),inputHash:z.string(),assetInputHash:z.string(),iteration:z.number().int().positive(),
  status:z.enum(['reserved','repaired','failed']),createdAt:z.string(),snapshot:z.string(),shotIds:z.array(z.string()),
  files:z.record(z.string()),issues:z.array(FindingSchema),storyboardHash:z.string(),afterStoryboardHash:z.string().optional(),
  finishedAt:z.string().optional(),error:z.string().optional()}).strict();
const LedgerSchema=z.object({version:z.literal(1),attempts:z.array(AttemptSchema)}).strict();
type Ledger=z.infer<typeof LedgerSchema>;
const ledgerPath='work/qc-artwork-repairs.json';
async function readLedger(root:string):Promise<Ledger>{
  const file=path.join(root,ledgerPath);
  try{await fs.access(file);}catch(error){
    if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    // A dangling symlink or an existing entry with a missing target is not empty history.
    try{await fs.lstat(file);}catch(missing){
      if((missing as NodeJS.ErrnoException).code==='ENOENT')return {version:1,attempts:[]};
      throw missing;
    }
    throw error;
  }
  return readJson(await safeRealPath(root,ledgerPath),LedgerSchema);
}
function matchingIteration(ledger:Ledger,state:ProjectState):number{
  return ledger.attempts.filter(a=>a.inputHash===state.inputHash&&a.assetInputHash===state.assetInputHash)
    .reduce((maximum,a)=>Math.max(maximum,a.iteration),0);
}

/** An interrupted repair or artifact reconciliation cannot reset the same-input QC budget. */
export async function qcArtworkRepairIteration(root:string,state:ProjectState):Promise<number>{
  return matchingIteration(await readLedger(root),state);
}

/** Preserve the actual failed film and reserve the bounded iteration before any artist call. */
export async function reserveQCArtworkRepair(root:string,state:ProjectState,board:Storyboard,qc:QCResult,issues:ReviewIssue[],maximum:number):Promise<{id:string;iteration:number}>{
  const ledger=await readLedger(root),used=Math.max(state.reviewIteration,matchingIteration(ledger,state));
  if(used>=maximum)throw new Error('QC artwork repair iteration budget exhausted; the final remains unaccepted');
  const id=randomUUID(),snapshot=`work/qc-artwork-repair-history/${id}`,files:Record<string,string>={};
  for(const relative of ['output/final.mp4','output/qc-report.json','work/storyboard.json','output/production-report.md','work/creative-direction-report.json']){
    if(!await exists(path.join(root,relative))){
      if(['output/final.mp4','output/qc-report.json','work/storyboard.json'].includes(relative))throw new Error(`QC repair snapshot is missing ${relative}`);
      continue;
    }
    const source=await safeRealPath(root,relative),target=await outputPath(root,`${snapshot}/${relative}`);
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(source,target,fs.constants.COPYFILE_EXCL);
    const copied=hash(await fs.readFile(target));
    if(copied!==hash(await fs.readFile(source)))throw new Error(`QC repair snapshot changed while copying ${relative}`);
    files[relative]=copied;
  }
  const attempt=AttemptSchema.parse({id,inputHash:state.inputHash,assetInputHash:state.assetInputHash,iteration:used+1,status:'reserved',
    createdAt:new Date().toISOString(),snapshot,shotIds:[...new Set(issues.map(issue=>issue.shotId))],files,issues:qc.issues,storyboardHash:hash(board)});
  ledger.attempts.push(attempt);
  await writeJson(await outputPath(root,ledgerPath),ledger);
  return {id,iteration:attempt.iteration};
}

export async function finishQCArtworkRepair(root:string,id:string,result:{status:'repaired';board:Storyboard}|{status:'failed';error:string}):Promise<void>{
  const ledger=await readLedger(root),attempt=ledger.attempts.find(a=>a.id===id);
  if(!attempt||attempt.status!=='reserved')throw new Error('QC artwork repair reservation is missing or already finished');
  attempt.status=result.status;attempt.finishedAt=new Date().toISOString();
  if(result.status==='repaired')attempt.afterStoryboardHash=hash(result.board);else attempt.error=result.error;
  await writeJson(await outputPath(root,ledgerPath),LedgerSchema.parse(ledger));
}
