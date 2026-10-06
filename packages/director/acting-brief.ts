import type {Beat,Narration} from '../core/schemas.js';
import type {HostProfile} from '../host/schemas.js';
import type {ActorDefinition} from '../actors/schemas.js';
import {rigMetrics} from '../animation/rig.js';
import {CAMERA_VIEWPORT} from './camera.js';
import {actingSourceWindows} from './story-coverage.js';

/** Generation assistance only: no authored choreography, approval or cache identity. */
export function creativeActingBrief(beats:Beat[],narration:Narration,profile:HostProfile,lockedActors:ActorDefinition[]=[]){
  const unitProfile={...profile,appearance:{...profile.appearance,headScale:1,bodyScale:1}};
  return {
    completeFilm:'Return a complete production design covering every canonical beat through the ending. A capability-conflict placeholder, unsupported reclassification or idle cast is not a repair of a sourced action. Cutaways and regrouped shots remain available when the accepted actors and actions are covered elsewhere in the same source window.',
    obligations:beats.filter(beat=>beat.sceneIntent?.participants.length).map(beat=>({beatId:beat.id,startMs:beat.startMs,endMs:beat.endMs,
      participants:beat.sceneIntent!.participants.map(actor=>({id:actor.id,name:actor.name,role:actor.role,identity:actor.identity})),
      acting:(beat.sceneIntent!.acting??[]).map(acting=>({...acting,sourceWindows:actingSourceWindows(acting,beat,narration)}))})),
    clock:'Narration, beat, host.actions, supporting.actions and visualization.events use global milliseconds. Every performance walk, jump, gesture, gaze, posture and expression uses shot-local milliseconds: local = global - shot.startMs. The decisive contact/release/flight must fall in its verified source window, not merely somewhere in the film. A matching operate-model action uses the same hand and exact gesture start/end/contact after adding shot.startMs, plus that cue id as narrationAnchor.',
    geometry:{units:'Unscaled rig pixels; root and stage coordinates are world pixels. Multiply rig offsets and bone lengths by performance.scale. bodyScale already affects rigMetrics; do not apply it twice.',
      selectedProfile:rigMetrics(profile),unitProportions:rigMetrics(unitProfile),
      lockedActors:lockedActors.map(actor=>({id:actor.id,metrics:rigMetrics({...profile,kind:actor.kind,appearance:actor.appearance})})),
      proportions:'For a newly designed cast, bodyScale scales all unitProportions except headRadius; headScale scales headRadius. Shoulders start at root plus shoulderY/shoulderOffset before posture/facing. Arm maximum reach is upperArm + lowerArm; allow bend and approach rather than stretching bones. Posture, turn and walk change the hand position. These measurements are layout references, not sampled poses or rendered proof.',
      viewport:CAMERA_VIEWPORT,
      camera:'Project actor head (including robot antenna), hands, feet, object bounds and landing/flight envelopes through BOTH camera endpoints. Safe viewport values are fractions of frame dimensions. World ground follows the world camera. Medium/wide ensemble keeps visible actors inside the action viewport; intentional detail crops use their supported face/contact/object focus contract. Reposition the world/camera or use purposeful cuts; do not claim a rendered inspection.'},
    ownership:'A moving bound model is owned by the PRIMARY actor performance and propBindings of that shot. Supporting actors may have their own gestures and fixed-object contacts, but cannot own a primary moving prop. Make the manipulating actor primary in an appropriate shot when needed. Each bound prop supports one completed pickup/carry/drop with exactly one hand owner. Co-present actors and simultaneous independent actions remain possible; sequential pickups/handoffs of the same binding and joint ownership are unsupported. Preserve the original sourced entity and full canonical obligations when changing cuts.',
    coordinates:'visualization.parts and continuity.models use normalized stage fractions, including the exit object center. prop.origin/prop.destination, gesture targets and rig/root positions use stage pixels. artDirection SVG/layers follow their declared projection/coordinateSpace. Model exit continuity is derived from the actual bound destination; supporting actors share that same world exit. Grip destination differs from object center by gripOffset times performer scale.',
    source:'The canonical beat sceneIntent remains authoritative. Preserve each participant and every acting kind/operation/movement/targetIds; do not relabel manipulation as unsupported or replace a sourced event with commentary. Use the original cue statement and clock. Visual design, casting appearance, pacing within those windows, cuts, setting, expression and composition are freely designed subject to explicit approvals and renderer capabilities.'
  };
}
