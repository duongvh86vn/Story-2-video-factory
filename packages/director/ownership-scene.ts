import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import {hash} from '../core/utils.js';
import {compileSourceOwnership,OWNERSHIP_RENDER_VERSION,type CompiledOwnership} from './ownership-compile.js';

export const OWNERSHIP_OBSERVATION_VERSION='canonical-ownership-observation-1';
export type OwnershipScene=ReadonlyMap<string,CompiledOwnership>;
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: ownership observation ${message}`);};

/** Candidate observations require the original board and narration, including
 * when a camera inspects a supporting-actor projection of this world. A caller
 * may supply the renderer's exact bake; it is bound to the whole revision.
 * No mutable-object cache or accepted/production state is manufactured. */
export function ownershipScene(shot:Shot,board:Storyboard|undefined,narration:Narration|undefined,compiled?:OwnershipScene):OwnershipScene{
  if(!board||!narration||board.shots.filter(s=>s.id===shot.id).length!==1||hash(board.shots.find(s=>s.id===shot.id))!==hash(shot))return fail(shot,'requires the exact complete original storyboard and narration');
  const sources=shot.cinematic?.sourceOwnership;
  if(!sources?.length)return fail(shot,'requires explicit original ownership timelines');
  const result=compiled??compileSourceOwnership(shot,board,narration);
  if(result.size!==sources.length)return fail(shot,'canonical entities are missing or duplicated');
  for(const source of sources){
    const item=result.get(source.partId);
    if(!item||item.version!==OWNERSHIP_RENDER_VERSION||item.shotHash!==hash(shot)||hash(item.source)!==hash(source)||item.sourceHash!==hash({source,original:board,voice:narration})||item.paintHash!==hash(item.paint)||shot.cinematic!.ownershipPaint?.filter(p=>p.sourceId===source.id&&hash(p)===item.paintHash).length!==1||item.bake.startMs!==shot.startMs||item.bake.endMs!==shot.endMs||item.motionVerified!==false||item.productionApproval!==false)return fail(shot,'bake belongs to another original source, narration, paint, camera revision or clock');
  }
  return result;
}

export const ownershipObservationDescription={version:OWNERSHIP_OBSERVATION_VERSION,status:'candidate',
  clock:'canonical piecewise-linear entity centers and discrete original ownership; complete board/narration revision required, supporting camera projections retain the original world',
  scope:'camera, model entry/exit and interaction source candidates; renderer may pass its exact compiled bake; preflight independently compiles a physical candidate without speech evaluation',
  pending:['physical vs emitted SVG/GSAP, preflight vs renderer breakpoint envelope and runtime profiling','complete production semantic audit and art/motion/film/full-factory acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
