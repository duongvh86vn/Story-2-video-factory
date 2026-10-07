import type {Shot,Storyboard} from '../core/schemas.js';
import {partAnchor} from '../host/controller.js';
import {spriteSeconds} from './clock.js';
import {validateSpriteStoryBinding} from './story-stage.js';
import type {MotionPoint} from './schemas.js';

export const SPRITE_SCENE_VERSION='sprite-story-scene-1' as const;

/** Preserve unsupported declarations as blockers, never render another choreography. */
export function validateSpriteScenePlan(shot:Shot){
  const c=shot.cinematic,plan=c?.spriteStage;
  if(!c || !plan)throw new Error(`${shot.id}: missing sprite story stage`);
  validateSpriteStoryBinding(shot,plan);
  if(c.propBindings.length || c.performance.props.length || c.actorScene?.supporting.some(actor=>actor.performance.props.length))
    throw new Error(`${shot.id}: needs-sprite-props: skeletal prop bindings cannot drive sprite artwork`);
  if(c.actorScene?.continuity==='continuous')throw new Error(`${shot.id}: needs-sprite-continuity: cross-shot sprite handoff is not yet accepted`);
  for(const event of shot.visualization?.events??[]){
    if(!event.contactRequired)continue;
    const partId=event.contactPartId??event.targetId,timeMs=event.startMs-shot.startMs;
    const contacts=plan.contacts.filter(contact=>contact.targetId===partId && (!event.contactActorId || contact.actorId===event.contactActorId)
      && spriteSeconds(contact.timeMs)<spriteSeconds(timeMs) && (contact.effectMs===undefined || spriteSeconds(contact.effectMs)===spriteSeconds(timeMs)));
    // The sprite landmark names are anatomical registration, not mirrored rig sides.
    const hands=event.contactHands??[];
    const sameActor=plan.actors.some(actor=>{
      const owned=contacts.filter(contact=>contact.actorId===actor.actorId);
      return owned.length>0 && hands.every(hand=>owned.some(contact=>contact.landmark===`hand_${hand}`));
    });
    if(!sameActor)
      throw new Error(`${shot.id}: sprite effect has no registered contact before response: ${event.targetId}`);
  }
  return plan;
}

/** Static world handles; moving props need their own accepted timeline first. */
export function spriteSceneTargets(shot:Shot):ReadonlyMap<string,MotionPoint>{
  const plan=validateSpriteScenePlan(shot),targets=new Map<string,MotionPoint>();
  for(const contact of plan.contacts)targets.set(contact.targetId,partAnchor(shot,contact.targetId,'handle',plan.stage.width,plan.stage.height));
  return targets;
}

export function assertNoCandidateSpriteActors(board:Storyboard):void {
  const shot=board.shots.find(shot=>shot.cinematic?.spriteStage);
  if(shot)throw new Error(`${shot.id}: needs-sprite-acceptance: candidate sprite actors may be inspected in draft; final requires accepted art, motion, camera, contact and speech`);
}
