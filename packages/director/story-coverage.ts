import type {Beat, Narration, Shot, Storyboard} from '../core/schemas.js';
import type {PerformancePlan} from '../animation/schemas.js';
import {hash} from '../core/utils.js';
import type {SceneIntent} from '../explainer/schemas.js';
import type {ActorDefinition} from '../actors/schemas.js';
import {isWholeSourceStatement} from '../explainer/plan.js';
import {ApprovalRequired} from '../orchestrator/state-machine.js';

type Acting=NonNullable<SceneIntent['acting']>[number];
export function actingSourceWindows(expected:Acting,beat:Beat,narration:Narration,interval:Pick<Shot,'startMs'|'endMs'>=beat){
  return expected.sourceRefs.flatMap(ref=>{
    if(ref.kind!=='narration'||!isWholeSourceStatement(expected.statement,ref.quote))return [];
    const cue=narration.segments.find(cue=>cue.id===ref.segmentId&&cue.text.normalize('NFC').includes(ref.quote.normalize('NFC')));
    if(!cue||!isWholeSourceStatement(expected.statement,cue.text))return [];
    const startMs=Math.max(cue.startMs,beat.startMs,interval.startMs),endMs=Math.min(cue.endMs,beat.endMs,interval.endMs);
    return endMs>startMs?[{id:cue.id,startMs,endMs}]:[];
  });
}

function hasPerformance(expected:Acting,p:PerformancePlan,actions:NonNullable<Shot['host']>['actions'],speakingSegmentIds:string[],shot:Shot,beat:Beat,narration:Narration):boolean{
  const kind=expected.kind;
  if(shot.cinematic?.spriteStage){
    const windows=actingSourceWindows(expected,beat,narration,shot);
    const clips=shot.cinematic.spriteStage.actors.find(actor=>actor.actorId===expected.participantId)?.clips??[];
    return clips.some(clip=>{
      const declared=clip.sourcedAction;
      if(!declared || declared.kind!==kind || declared.statement!==expected.statement || declared.movement!==expected.movement || declared.operation!==expected.operation || hash(declared.targetIds??[])!==hash(expected.targetIds??[]))return false;
      return windows.some(window=>shot.startMs+clip.startMs<window.endMs&&shot.startMs+clip.endMs>window.startMs && clip.sourceRefs.some(ref=>ref.kind==='narration'&&ref.segmentId===window.id&&isWholeSourceStatement(expected.statement,ref.quote)));
    });
  }
  if(kind==='hold')return true; // Presence is the intended performance; no artificial activity quota.
  const windows=actingSourceWindows(expected,beat,narration,shot);
  const overlaps=(clip:{startMs:number;endMs:number})=>windows.some(window=>shot.startMs+clip.startMs<window.endMs&&shot.startMs+clip.endMs>window.startMs);
  if(kind==='locomotion'&&expected.movement==='jump')return (p.jumps??[]).some(clip=>windows.some(window=>shot.startMs+clip.takeoffMs>=window.startMs&&shot.startMs+clip.landingMs<=window.endMs));
  if(kind==='locomotion')return p.walks.some(clip=>overlaps(clip)&&Math.abs(clip.toX-clip.fromX)>.01&&
    (expected.movement==='run'?clip.gait==='run':expected.movement==='walk'?clip.gait!=='run':true));
  if(kind==='manipulation'&&expected.operation==='drop')return p.gestures.some(clip=>clip.action==='drop'&&clip.releaseMs!==undefined&&clip.landingMs!==undefined&&clip.propId&&p.props.some(prop=>prop.id===clip.propId)&&actions.some(action=>action.type==='operate-model'&&expected.targetIds?.includes(action.target?.partId??'')&&action.contactMs===shot.startMs+clip.contactMs!&&action.startMs===shot.startMs+clip.startMs&&action.endMs===shot.startMs+clip.endMs&&windows.some(window=>window.id===action.narrationAnchor&&shot.startMs+clip.releaseMs!>=window.startMs&&shot.startMs+clip.landingMs!<=window.endMs)));
  if(kind==='manipulation')return p.gestures.some(clip=>overlaps(clip)&&['operate','pick-place','carry'].includes(clip.action)&&clip.contactMs!==undefined&&
    shot.startMs+clip.contactMs>=beat.startMs&&shot.startMs+clip.contactMs<beat.endMs&&actions.some(action=>action.type==='operate-model'&&
      action.contactMs===shot.startMs+clip.contactMs!&&action.startMs===shot.startMs+clip.startMs&&action.endMs===shot.startMs+clip.endMs&&
      (!expected.targetIds?.length||expected.targetIds.includes(action.target?.partId??''))&&windows.some(window=>window.id===action.narrationAnchor&&action.contactMs!>=window.startMs&&action.contactMs!<window.endMs)));
  if(kind==='observation')return p.gazes.some(overlaps)||p.gestures.some(clip=>overlaps(clip)&&clip.action==='inspect');
  if(kind==='indication')return !!expected.targetIds?.length&&p.gestures.some(clip=>overlaps(clip)&&clip.action==='point'&&actions.some(action=>
    action.type==='point'&&expected.targetIds!.includes(action.target?.partId??'')&&
    action.startMs===shot.startMs+clip.startMs&&action.endMs===shot.startMs+clip.endMs&&
    windows.some(window=>window.id===action.narrationAnchor)));
  if(kind==='speech')return speakingSegmentIds.some(id=>windows.some(window=>window.id===id));
  if(kind==='reaction')return p.gestures.some(clip=>overlaps(clip)&&clip.action==='react')||p.expressions.some(clip=>overlaps(clip)&&clip.mood!=='neutral');
  if(kind==='posture'){
    let previous=p.entryPosture??{pose:'stand' as const};
    for(const clip of [...(p.postures??[])].sort((a,b)=>a.startMs-b.startMs)){
      const {startMs,endMs,...target}=clip;
      const canonical=(pose:typeof previous)=>({pose:pose.pose,intensity:pose.intensity??1,leanDeg:pose.leanDeg??0,supportId:pose.supportId??null});
      if(overlaps({startMs,endMs})&&hash(canonical(previous))!==hash(canonical(target)))return true;
      previous=target;
    }
  }
  return false;
}

/** Beat-level coverage permits cutaways and regrouping without dropping the accepted story actors. */
export function validateStoryActingCoverage(board:Storyboard,beats:Beat[],narration:Narration):void{
  const failures:string[]=[];
  for(const beat of beats){
    const intent=beat.sceneIntent;if(!intent?.participants.length)continue;
    const scenes=board.shots.filter(shot=>shot.beatIds.includes(beat.id)&&shot.startMs<beat.endMs&&shot.endMs>beat.startMs);
    for(const participant of intent.participants){
      const performances:Array<{shot:Shot;performance:PerformancePlan;actions:NonNullable<Shot['host']>['actions'];speakingSegmentIds:string[]}>=[];
      const same=(actor:ActorDefinition)=>actor.id===participant.id&&actor.name===participant.name&&actor.role===participant.role&&actor.identity===participant.identity;
      for(const shot of scenes){
        const c=shot.cinematic,cast=c?.actorScene;if(!c||!cast)continue;
        if(cast.primary&&same(cast.primary)&&shot.host?.presence!=='absent')performances.push({shot,performance:c.performance,actions:shot.host?.actions??[],speakingSegmentIds:cast.speakingSegmentIds});
        for(const actor of cast.supporting)if(same(actor.character))performances.push({shot,performance:actor.performance,actions:actor.actions,speakingSegmentIds:actor.speakingSegmentIds});
      }
      if(!performances.length){failures.push(`${beat.id}: needs-layout: missing story actor ${participant.name}; cutaways cannot replace the entire accepted actor situation`);continue;}
      for(const expected of intent.acting?.filter(acting=>acting.participantId===participant.id)??[])
        if(!performances.some(({shot,performance,actions,speakingSegmentIds})=>hasPerformance(expected,performance,actions,speakingSegmentIds,shot,beat,narration)))
          failures.push(`${beat.id}: needs-motion: ${participant.name} has no ${expected.kind} performance for its sourced statement; preserve narration and repair the actual acting. Required evidence: ${JSON.stringify({participantId:participant.id,statement:expected.statement,movement:expected.movement,operation:expected.operation,targetIds:expected.targetIds??[],sourceWindows:actingSourceWindows(expected,beat,narration),clock:"sourceWindows and actor actions are narration-global; performance clips are shot-local"})}`);
    }
  }
  if(failures.length)throw new Error(failures.join("\n"));
}

/** Drafts may use an editable seed; final actors require accepted semantic planning and artwork. */
export function requireFinalStoryDirection(board:Storyboard,beats:Beat[]):void{
  if(beats.some(beat=>!beat.sceneIntent||beat.sceneIntent.participants.some(participant=>!beat.sceneIntent!.acting?.some(acting=>acting.participantId===participant.id))))
    throw new ApprovalRequired('art-direction','needs-art-direction: configure a semantic planning or scene-design model to classify the sourced actor actions before final production. The offline draft is retained.');
  if(beats.some(beat=>beat.sceneIntent?.acting?.some(acting=>acting.kind==='unsupported'||['manipulation','indication'].includes(acting.kind)&&!acting.targetIds?.length)))
    throw new ApprovalRequired('art-direction','needs-motion: repair the canonical supported action and intended target before final production.');
  for(const shot of board.shots){
    const cast=shot.cinematic?.actorScene;
    for(const actor of [...(cast?.primary?[cast.primary]:[]),...(cast?.supporting.map(support=>support.character)??[])]){
      const accepted=beats.some(beat=>shot.beatIds.includes(beat.id)&&shot.startMs<beat.endMs&&shot.endMs>beat.startMs&&
        beat.sceneIntent?.participants.some(participant=>participant.id===actor.id&&participant.name===actor.name&&participant.role===actor.role&&participant.identity===actor.identity)&&
        beat.sceneIntent.acting?.some(acting=>acting.participantId===actor.id&&acting.kind!=='unsupported'));
      if(!accepted)throw new ApprovalRequired('art-direction',`needs-source-plan: actor ${actor.name} requires accepted canonical acting before final production; repair the semantic plan or the designed cast. The draft is retained.`);
    }
  }
  if(board.shots.some(shot=>!shot.cinematic?.artDirection||shot.cinematic.artDirection.origin==='offline'))
    throw new ApprovalRequired('art-direction','needs-art-direction: this is an offline scene sketch. Configure the scene-design model or supply valid authored direction before final production.');
}
