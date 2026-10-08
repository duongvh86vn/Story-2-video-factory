/** Reusable visual templates, never story-person IDs or factual evidence. */
export const PREHISTORIC_SUPPORTING_VERSION='prehistoric-supporting-2';
export const PREHISTORIC_SUPPORTING_MODELS=['prehistoric-male-bald','prehistoric-female-haired'] as const;
export type PrehistoricSupportingModel=typeof PREHISTORIC_SUPPORTING_MODELS[number];
export const prehistoricSupportingModels={
  'prehistoric-male-bald':{id:'prehistoric-male-bald',label:'Quần chúng nam không tóc, không râu',bodyTemplate:'karo',hair:'bald',beard:'none',
    file:'library/topics/prehistoric-life/supporting-actors/male-bald-v2.png',sha256:'32dc223fbf865c3797b0251b6cd683d1585bab56252cd7bc7f5a833ce36a39a2',width:910,height:1728,
    costume:'Reuse Karo source tunic, rope belt and two separate shorts cuffs; do not redraw a new costume.'},
  'prehistoric-female-haired':{id:'prehistoric-female-haired',label:'Quần chúng nữ có tóc',bodyTemplate:'lila',hair:'brown-shoulder-length',beard:'none',
    file:'library/topics/prehistoric-life/supporting-actors/female-haired-v1.png',sha256:'4604e94be7e2857b8dd5e2ef575196f8f623d5138da114f3b17ab06e925bfae7',width:939,height:1675,
    costume:'Reuse Lila source one-shoulder fur dress, rope belt and single continuous skirt; do not substitute shorts.'},
} as const;
export function prehistoricSupportingModel(value:string){
  if(!Object.hasOwn(prehistoricSupportingModels,value))throw new Error('Unknown prehistoric supporting model');
  return prehistoricSupportingModels[value as PrehistoricSupportingModel];
}
export const prehistoricSupportingDescription={version:PREHISTORIC_SUPPORTING_VERSION,templates:prehistoricSupportingModels,
  identity:'Each sourced participant has a distinct stable actor ID/name/role/sourceRefs. Many actors may share a visual template. Do not rename a person to a model ID or invent dialogue/crowds absent from the input.',
  costume:'Source body assets, garment mesh, cuffs, hands, feet and limb proportions are reused from the corresponding main actor. Generated full-body images are model previews and head sources, not replacement garment textures.',
  views:['source-orientation'],approved:false,productionReady:false,motionVerified:false,
  pending:['native face and gaze acceptance','partner-facing/profile/rear views','continuous turns','crowd staging and normal-speed multi-actor video acceptance']} as const;
