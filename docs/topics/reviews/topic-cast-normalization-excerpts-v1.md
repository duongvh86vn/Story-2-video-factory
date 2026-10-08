# Source excerpts for topic-cast review

Static source text only; do not execute or infer geometry/art/production acceptance.

packages/topics/prehistoric-life.ts SHA 5fa4d856c09239aa04eb8f5115597bb98b85b5d14fdf4ad7848309f2a823fb9d

~~~typescript
export const forestPalette={ink:'#2B1710',skin:'#F2C58D',skinShadow:'#C88A53',hair:'#4B2917',hairLight:'#8A4A24',fur:'#AE6E31',furShadow:'#6B3D20',furLight:'#D89B4A',forest:'#1E542D',leaf:'#3F8D35',sunLeaf:'#95C54C',earth:'#A56832',earthLight:'#DB9B4D',pot:'#C85E2B',sky:'#71CFF0',fire:'#F97316',flame:'#FDBB38',core:'#FFE08B'};
export function topicAppearance(id:'lila'|'karo'):ActorDefinition['appearance'] {
  return {outline:'#080604',shell:forestPalette.skin,screen:forestPalette.skin,accent:forestPalette.fur,badge:forestPalette.hair,
    headScale:id==='lila'?1:1.04,bodyScale:id==='lila'?1:1.08,strokeWidth:16*318/(id==='lila'?766:716),characterVariant:id,artworkVersion:'forest-body-1'};
}
export function supportingTopicAppearance(model:PrehistoricSupportingModel):ActorDefinition['appearance']{
  return {...topicAppearance(prehistoricSupportingModel(model).bodyTemplate),supportingModel:model};
}
/** Preserve an explicitly selected supporting head rather than silently
 * resetting it to a legacy face. No bank, view or motion is inferred here. */
export function supportingNativeTopicAppearance(input:ActorDefinition['appearance']):ActorDefinition['appearance']{
  const a=HostProfileSchema.shape.appearance.parse(input);
  if(!a.supportingModel||a.artworkVersion!=='forest-body-view-1'||!a.bodyView||a.bodyHeadBank?.version!==NATIVE_SUPPORTING_HEAD_BANK_VERSION||a.bodyHeadBank.actor!==a.supportingModel)
    throw new Error('needs-supporting-head-registration: explicit own-model bank4 and compatible body view required');
  return normalizeTopicActorAppearance(a.supportingModel,supportingTopicAppearance(a.supportingModel),a);
}

/** Identity is provided by the topic; narration remains the authority for roles and actions. */
export function applyTopicCast(board:Storyboard,config:FactoryConfig):void {
  if(!config.topic.id)return;
  const updates:Array<{character:ActorDefinition;appearance:ActorDefinition['appearance']}>=[];
  for(const shot of board.shots){
    const scene=shot.cinematic?.actorScene;if(!scene)continue;
    for(const character of [...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)]){
      const principal=character.id==='lila'||character.id==='karo';
      if(principal&&character.appearance.supportingModel)throw new Error(`${shot.id}: principal lila/karo IDs cannot select a supporting model`);
      if(!principal&&!character.appearance.supportingModel)throw new Error(`${shot.id}: additional sourced cast requires its own actor ID and explicit supportingModel`);
      const requested=character.appearance;
      const model=principal?character.id as 'lila'|'karo':requested.supportingModel!;
      const canonical=principal?topicAppearance(model as 'lila'|'karo'):supportingTopicAppearance(requested.supportingModel!);
      updates.push({character,appearance:normalizeTopicActorAppearance(model,canonical,requested)});
    }
  }
  // All source selections must validate before mutating even the first actor.
  // Costume and head artwork are versioned rig assets, not per-shot drawings.
  for(const {character,appearance} of updates){character.kind='stick-man';character.appearance=appearance;delete character.costume;}
}

~~~

packages/director/creative.ts SHA ac07455e1f697cd78bc90f7a1f631eab5f4d862432df6804dcd000d687eb1a46 · caller keeps locked shots out of normalization

~~~typescript
/** The source clock is authoritative; the seed's visual style and choreography are editable. */
export async function createCreativeStoryboard(root:string,config:FactoryConfig,router:ModelRouter,context:CreativeContext,seed:Storyboard,locks:Shot[]):Promise<Storyboard>{
  requireTopicProductionReady(config);
  const catalog=await loadSpriteMotionCatalog(root),renderer=config.presentation.actor_renderer;
  if(renderer==='sprite'&&!catalog.entries.length)throw new Error('needs-motion-library: import and register actor movements before image motion production');
  const lockIds=new Set(locks.map(shot=>shot.id)),system=await loadPrompt('creative-director');
  const identity=creativeInputIdentity(context.narration,context.beats,context.profile,context.rig);
  const reportFile=path.join(root,'work/creative-direction-report.json');
  const normalize=async(value:Storyboard,origin:'model'|'authored'):Promise<Storyboard>=>{
    const unlocked=normalizeCreativeSourceRefs({shots:value.shots.filter(s=>!lockIds.has(s.id))},context.narration);
    const board=StoryboardSchema.parse({shots:[...unlocked.shots,...locks].sort((a,b)=>a.startMs-b.startMs)});
    applyTopicCast({shots:board.shots.filter(s=>!lockIds.has(s.id))},config);
    if(board.shots.length>config.rendering.max_shots)throw new Error('Creative storyboard exceeds configured shot limit');
    const failures=new Set<string>();
    const check=(operation:()=>unknown)=>{try{operation();}catch(error){failures.add(error instanceof Error?error.message:String(error));}};
    check(()=>validateSpriteCatalogSelection(board,catalog,renderer));
    if(context.lockedActors?.length)check(()=>assertActorLocks({shots:context.lockedActors!.map(primary=>({cinematic:{actorScene:{primary,supporting:[]}}}))},board,Object.fromEntries(context.lockedActors!.map(a=>[actorLockKey(a.id),true]))));
    for(const [i,shot] of board.shots.entries()){
      const c=shot.cinematic;
~~~
