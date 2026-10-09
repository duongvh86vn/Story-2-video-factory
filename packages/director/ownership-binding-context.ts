import type {Shot,Storyboard} from '../core/schemas.js';
import {hash} from '../core/utils.js';

const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: mixed ownership context ${message}`);};

/** Finite closure of actual original source spans, including owners first
 * visible in later cameras. Structural discovery only: no poses, geometry,
 * approvals or caller-controlled exemptions. Full validators consume it next. */
export function ownershipBindingContext(shot:Shot,board:Storyboard):Shot[]{
  if(new Set(board.shots.map(s=>s.id)).size!==board.shots.length||board.shots.filter(s=>s.id===shot.id&&hash(s)===hash(shot)).length!==1)return fail(shot,'requires the exact complete storyboard with unique camera IDs');
  const queue=[shot],included=new Set([shot.id]);
  for(let index=0;index<queue.length;index++){
    const slice=queue[index]!,c=slice.cinematic;
    if(!c)return fail(slice,'an original source crosses a camera without cinematic data');
    if(c.performance.sourceManipulation&&!c.actorScene?.primary)return fail(slice,'original primary source has no visible person');
    const spans=[...(c.sourceOwnership??[]),...(c.actorScene?.primary&&c.performance.sourceManipulation?[c.performance.sourceManipulation]:[]),
      ...(c.actorScene?.supporting.flatMap(a=>a.performance.sourceManipulation?[a.performance.sourceManipulation]:[])??[])];
    for(const span of spans){
      if(!Number.isSafeInteger(span.startMs)||!Number.isSafeInteger(span.endMs)||span.startMs<0||span.endMs<=span.startMs)return fail(slice,'has an invalid complete original span');
      for(const candidate of board.shots)if(candidate.startMs<span.endMs&&candidate.endMs>span.startMs&&!included.has(candidate.id)){
        included.add(candidate.id);queue.push(candidate);
      }
    }
  }
  return queue.sort((a,b)=>a.startMs-b.startMs||a.id.localeCompare(b.id));
}
