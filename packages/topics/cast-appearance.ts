import {HostProfileSchema,type HostProfile} from '../host/schemas.js';
import {nativeHeadIdentities,type NativeHeadActor} from '../animation/native-head-identity.js';

type Appearance=HostProfile['appearance'];
export const TOPIC_CAST_NORMALIZATION_VERSION='topic-cast-source-3';
export const TOPIC_RENDER_SELECTION_KEYS=['bodyView','bodyHeadBank','bodySpeech','bodyEyes','bodyExpressions','bodyMotion','bodySeat','bodySecondary','bodyManipulation','sourceColour'] as const;
export const topicCastNormalizationDescription={version:TOPIC_CAST_NORMALIZATION_VERSION,sourceFields:TOPIC_RENDER_SELECTION_KEYS,
  facePaths:{fixedBodyView:'bodySpeech/bodyEyes/bodyExpressions/bodySecondary use that fixed drawing only',independentHead:'bodyHeadBank uses its own registered source-face capabilities; fixed-view facial/hair flags cannot be mixed',sharedBody:'bodyMotion/bodySeat/bodyManipulation may accompany either valid head path'},
  rule:'Preserve explicitly selected valid own-model artwork, source faces, body views and motion controls. Canonical topic palette/proportions/costume remain fixed. Reject foreign or incomplete selections; never silently replace them with a legacy face. Validate the complete unlocked cast before committing any actor changes.',
  approval:'No automatic bank/view/motion selection or production approval; narration IDs/names/roles/source evidence/speaker assignments and clocks remain authoritative.'};

/** Canonical visual defaults plus an explicit, validated source selection.
 * This validates registrations at runtime. Implementation agents must not
 * invoke it while geometry/runtime is delegated to the user's test model. */
export function normalizeTopicActorAppearance(model:NativeHeadActor,canonical:Appearance,input:Appearance):Appearance{
  const identity=nativeHeadIdentities[model];
  if(canonical.artworkVersion!=='forest-body-1'||canonical.characterVariant!==identity.bodyTemplate||
    canonical.supportingModel!==(identity.supporting?model:undefined)||TOPIC_RENDER_SELECTION_KEYS.some(key=>canonical[key]!==undefined))
    throw new Error('Invalid canonical topic appearance');
  const a=HostProfileSchema.shape.appearance.parse(input);
  if(a.supportingModel!==(identity.supporting?model:undefined)||a.characterVariant!==undefined&&a.characterVariant!==identity.bodyTemplate)
    throw new Error('needs-topic-source-appearance: another actor/model cannot supply this costume or head');
  if(a.artworkVersion==='forest-head-1')throw new Error('needs-topic-source-appearance: head-only artwork cannot replace the topic body');
  if(a.artworkVersion==='forest-body-view-1'&&a.characterVariant!==identity.bodyTemplate)
    throw new Error('needs-topic-source-appearance: native source body/view must be explicit');
  const selections=Object.fromEntries(TOPIC_RENDER_SELECTION_KEYS.flatMap(key=>a[key]===undefined?[]:[[key,a[key]]])) as Partial<Appearance>;
  return {...canonical,...(a.artworkVersion?{artworkVersion:a.artworkVersion}:{}),...selections};
}
