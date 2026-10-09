// DECLARATION ONLY / NOT RUN. No fixture or compiler runs at module scope.
import {projectedContactFixture} from './projected-contact-fixture.js';
import {projectSourceWorldEvents} from '../../packages/director/source-world-projection.js';
import {sourceActor} from '../../packages/director/source-actor.js';
import {actorProfile} from '../../packages/actors/model.js';
import {actorViewActingClock} from '../../packages/actors/view-acting-clock.js';
import {compilePerformance} from '../../packages/animation/compiler.js';
import type {ActorCompilations} from '../../packages/director/source-spear-emitted.js';
import type {Shot} from '../../packages/core/schemas.js';
export function projectedRelationsFixture(){
  const f=projectedContactFixture(),ref=f.board.shots[0]!.sourceRefs![0]!;
  for(const s of f.board.shots){
    s.visualization!.parts.push({id:'emitter',label:'emitter',kind:'object',x:.12,y:.22,width:.08,height:.1,sourceRefs:[ref]});
    s.cinematic!.models.push({partId:'emitter',variant:'conceptual',sourceRefs:[ref]});
    const art=s.cinematic!.artDirection!.models[0]!;art.contactFrame!.anchors.center={x:.6,y:.55};
    s.cinematic!.artDirection!.models.push({...structuredClone(art),partId:'emitter'});
    s.visualization!.relations=[{from:'emitter',to:'target',kind:'transfer',sourceRefs:[ref]}];
    s.cinematic!.sourceWorld!.events.push({id:'original-flow',type:'flow',targetId:'emitter',relationTo:'target',startMs:1200,endMs:3800,narrationAnchor:'cue',contactRequired:false,motion:'none',sourceRefs:[ref]},
      {id:'target-pulse',type:'part-motion',targetId:'target',startMs:500,endMs:3000,narrationAnchor:'cue',contactRequired:false,motion:'pulse',sourceRefs:[ref]});
    s.visualization!.events=projectSourceWorldEvents(s.cinematic!.sourceWorld!,s.startMs,s.endMs);
  }
  return f;
}
export function suppliedProjectedActors(f:ReturnType<typeof projectedRelationsFixture>,s:Shot):ActorCompilations{
  const c=s.cinematic!,ids=[c.actorScene!.primary!.id,...c.actorScene!.supporting.map(a=>a.character.id)];
  return new Map(ids.map(id=>{const o=sourceActor(s,id);return [id,compilePerformance(o.performance,actorProfile(o.character),{method:'segment-draft',windowMs:20,intervals:[]},c.actorScene!.primary!.id===id?'':`actor-${id}-`,undefined,actorViewActingClock(f.board,s,id))];}));
}
