import {StoryboardSchema,type Storyboard,type Narration,type Shot} from '../core/schemas.js';
import {validateNarration} from '../story/timeline.js';
import {hash} from '../core/utils.js';

export const hasOriginalSource=(shot:Shot)=>!!shot.cinematic?.sourceWorld||!!shot.cinematic?.sourceOwnership?.length||[shot.cinematic?.performance,...(shot.cinematic?.actorScene?.supporting.map(a=>a.performance)??[])].some(p=>p?.sourceManipulation||p?.sourceSpear);

/** Membership alone is insufficient: a fragment cannot declare its own
 * truncated history authoritative. This structural gate covers the actual
 * complete narration clock; later validators establish original runs/cast/art. */
export function assertOriginalAuditContext(board:Storyboard,narration:Narration,fragments:readonly Shot[]):void{
  StoryboardSchema.parse(board);validateNarration(narration);
  if(new Set(board.shots.map(s=>s.id)).size!==board.shots.length||!board.shots.some(hasOriginalSource))
    throw new Error('needs-source-prop-binding: candidate audit requires a unique complete original storyboard');
  let cursor=0;
  for(const shot of board.shots){
    if(shot.startMs!==cursor||shot.endMs<=shot.startMs||shot.endMs>narration.durationMs)
      throw new Error('needs-source-prop-binding: candidate audit storyboard does not cover the complete narration clock');
    cursor=shot.endMs;
  }
  if(cursor!==narration.durationMs||!fragments.length||new Set(fragments.map(s=>s.id)).size!==fragments.length||fragments.some(shot=>board.shots.filter(s=>s.id===shot.id&&hash(s)===hash(shot)).length!==1))
    throw new Error('needs-source-prop-binding: candidate audit fragments must be exact unique members of the complete original storyboard');
}
