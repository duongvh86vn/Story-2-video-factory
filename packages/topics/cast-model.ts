import type {ActorDefinition} from '../actors/schemas.js';
import type {Storyboard} from '../core/schemas.js';
import type {NativeHeadActor} from '../animation/native-head-identity.js';

/** A source participant owns its ID/name/role/cues. A reusable visual model
 * supplies artwork only; it is never a replacement person or speaker ID.
 * Legacy lila/karo IDs retain their original visual meaning for old projects. */
export function topicActorModel(character:Pick<ActorDefinition,'id'|'appearance'>):NativeHeadActor{
  const {id,appearance:a}=character;
  if(id==='lila'||id==='karo'){
    if(a.supportingModel)throw new Error('needs-topic-source-appearance: principal lila/karo IDs cannot select a supporting model');
    if(a.characterVariant!==undefined&&a.characterVariant!==id)throw new Error('needs-topic-source-appearance: another actor/model cannot supply this costume or head');
    return id;
  }
  if(a.supportingModel){
    if(a.supportingModel==='prehistoric-male-bald'||a.supportingModel==='prehistoric-female-haired')return a.supportingModel;
    throw new Error('needs-topic-source-appearance: unknown supporting visual model');
  }
  if(a.characterVariant==='lila'||a.characterVariant==='karo')return a.characterVariant;
  throw new Error(`needs-topic-source-appearance: participant ${id} requires an explicit visual characterVariant or supportingModel; its source identity cannot be guessed from its name, gender or camera role`);
}

/** Resolve the entire cast without mutation, before appearance updates or
 * ledger certification. A person's visual model is stable across camera roles
 * and shots; different people may share a model without sharing a person ID. */
export function topicCastModels(board:Storyboard){
  const assignments=new Map<string,NativeHeadActor>();
  const rows:Array<{shotId:string;character:ActorDefinition;model:NativeHeadActor}>=[];
  for(const shot of board.shots){
    const scene=shot.cinematic?.actorScene;if(!scene)continue;
    const local=new Set<string>();
    for(const character of [...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)]){
      if(local.has(character.id))throw new Error(`${shot.id}: needs-topic-source-appearance: one source participant cannot occupy two visible cast slots`);
      local.add(character.id);
      const model=topicActorModel(character),previous=assignments.get(character.id);
      if(previous!==undefined&&previous!==model)throw new Error(`${shot.id}: needs-topic-source-appearance: participant ${character.id} changed its own visual model across scenes`);
      assignments.set(character.id,model);rows.push({shotId:shot.id,character,model});
    }
  }
  return rows;
}

export const topicCastModelDescription={version:'topic-person-visual-model-1',
  identity:'sourced person ID/name/role/identity/evidence/speaker ownership and clocks remain authoritative; model lila/karo is artwork only',
  selection:'custom principal person IDs select explicit appearance.characterVariant=lila|karo; supportingModel selects its own bald male or haired female artwork regardless of camera primary/supporting role',
  legacy:'existing lila/karo IDs retain their canonical principal visual assignment; no migration or renaming',
  validation:'whole cast resolves before any mutation; reject ambiguous custom model, duplicate person slots or the same person changing model across scenes',
  scope:'identity/model mapping only, no anatomy, head/body turn, voice, motion or production acceptance',runtimeVerified:false,productionReady:false,productionApproval:false};
