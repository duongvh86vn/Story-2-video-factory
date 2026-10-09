// DECLARATION ONLY / NOT RUN. No factory or compiler is invoked at module scope.
import {originalSpearFixture} from './original-spear-fixture.js';
import {projectSourceWorldEvents} from '../../packages/director/source-world-projection.js';
import type {SourceWorld} from '../../packages/director/source-world-schemas.js';
import type {Shot} from '../../packages/core/schemas.js';
export function projectedContactFixture(){
  const f=originalSpearFixture('thrust'),ref=f.board.shots[0]!.sourceRefs![0]!;
  const world:SourceWorld={version:'source-world-timeline-1',id:'projected-target-world',startMs:0,endMs:4000,events:[
    {id:'target-turn',type:'part-motion',targetId:'target',startMs:300,endMs:2300,narrationAnchor:'cue',contactRequired:false,motion:'rotate',sourceRefs:[ref]},
  ]};
  for(const s of f.board.shots){s.cinematic!.sourceWorld=structuredClone(world);s.visualization!.events=projectSourceWorldEvents(world,s.startMs,s.endMs);
    s.cinematic!.artDirection!.models=[{partId:'target',projection:'model-viewport',svg:'<svg viewBox="20 40 200 100" preserveAspectRatio="xMidYMid meet"><rect x="20" y="40" width="200" height="100" fill="#E87819"/></svg>',foregroundSvg:'<svg viewBox="20 40 200 100" preserveAspectRatio="xMidYMid meet"><circle cx="120" cy="90" r="4" fill="#532815"/></svg>',sourceRefs:[ref],controlMode:'none',labelMode:'none',
      contactFrame:{version:'model-contact-frame-1',pivot:{x:.5,y:.5},anchors:{center:{x:.5,y:.5},handle:{x:.75,y:.5}},bounds:{left:0,right:1,top:0,bottom:1}}}];
  }
  return {...f,world};
}
export function contactCamera(f:ReturnType<typeof projectedContactFixture>,startMs:number,endMs:number):Shot{
  const shot=structuredClone(f.board.shots[0]!);shot.startMs=startMs;shot.endMs=endMs;shot.cinematic!.performance.durationMs=endMs-startMs;
  shot.visualization!.events=projectSourceWorldEvents(shot.cinematic!.sourceWorld!,startMs,endMs);return shot;
}
