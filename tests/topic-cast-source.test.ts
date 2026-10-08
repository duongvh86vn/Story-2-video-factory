// DECLARED ONLY, NOT RUN. Geometry/rig/runtime execution is delegated to the user's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../packages/core/utils.js';
import {ConfigSchema} from '../packages/core/config.js';
import type {Storyboard,Shot} from '../packages/core/schemas.js';
import type {ActorDefinition} from '../packages/actors/schemas.js';
import {actorProfile,bindActorShot} from '../packages/actors/model.js';
import {actorLockKey,assertActorLocks} from '../packages/actors/locks.js';
import {buildRig} from '../packages/host/rig.js';
import {topicPreviewProfile} from '../packages/topics/preview.js';
import {applyTopicCast,topicAppearance,supportingTopicAppearance,supportingNativeTopicAppearance,topicNarrativeContext,requireTopicProductionReady} from '../packages/topics/prehistoric-life.js';
import {normalizeTopicActorAppearance} from '../packages/topics/cast-appearance.js';
import {headFaceCandidate} from '../packages/topics/head-face-source.js';
import {creativeActingBrief} from '../packages/director/acting-brief.js';
import {nativeHeadBank} from '../packages/animation/native-head-bank.js';
import {nativeHeadIdentities} from '../packages/animation/native-head-identity.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-registration.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=()=>ConfigSchema.parse({topic:{id:'prehistoric-life'}});
function person(id:string,appearance:ActorDefinition['appearance']):ActorDefinition{return {id,name:'Tên người trong input '+id,role:'người trong truyện',identity:'illustrative',kind:'stick-man',
  sourceRefs:[{kind:'narration',segmentId:'cue-'+id,quote:'người trong truyện'}],appearance};}
function board(primary:ActorDefinition,supporting:ActorDefinition[]=[]):Storyboard{return {shots:[{id:'source-shot',cinematic:{actorScene:{primary,speakingSegmentIds:['cue-'+primary.id],
  supporting:supporting.map(character=>({character,speakingSegmentIds:['cue-'+character.id],performance:{sourceHead:{ownerId:character.id}}}))},performance:{sourceHead:{ownerId:primary.id}}}}]} as unknown as Storyboard;}

test('principal native speech/eyes/expression/locomotion/seat/secondary source selections survive factory normalization unchanged',()=>{
  for(const id of ['lila','karo'] as const)for(const bodyView of ['three-quarter-left','three-quarter-right'] as const){
    const appearance={...topicAppearance(id),artworkVersion:'forest-body-view-1' as const,bodyView,bodySpeech:'registered-rest-mouth-v1' as const,bodyEyes:'registered-eyes-v1' as const,
      bodyExpressions:'registered-expressions-v1' as const,bodyMotion:'registered-locomotion-v1' as const,bodySeat:'registered-seated-v1' as const,bodySecondary:'registered-secondary-v1' as const};
    const a=person(id,appearance),b=board(a),before=hash(b);applyTopicCast(b,config());
    assert.equal(hash(b),before);assert.deepEqual(a.appearance,appearance);
    assert.deepEqual(actorProfile(a).appearance,appearance);
  }
});

test('explicit principal bank3 remains the actual performer instead of being reset to the seed rig; clocks and speaker assignments survive',async()=>{
  for(const view of ['three-quarter-left','three-quarter-right'] as const){
    const l=await headFaceCandidate(repo,'lila',view),k=await headFaceCandidate(repo,'karo',view);
    const a=person('lila',{...topicAppearance('lila'),artworkVersion:'forest-body-view-1',bodyView:view,bodyHeadBank:l.bank,bodyMotion:'registered-locomotion-v1',bodySeat:'registered-seated-v1'});
    const b=person('karo',{...topicAppearance('karo'),artworkVersion:'forest-body-view-1',bodyView:view,bodyHeadBank:k.bank,bodyMotion:'registered-locomotion-v1',bodySeat:'registered-seated-v1'});
    const value=board(a,[b]),shot=value.shots[0]!,scene=shot.cinematic!.actorScene!,before=hash(scene);
    applyTopicCast(value,config());assert.equal(hash(scene),before);
    const principalClock=hash(shot.cinematic!.performance.sourceHead),supportClock=hash(scene.supporting[0]!.performance.sourceHead);
    const base=topicPreviewProfile('lila');bindActorShot(shot,base,buildRig(base));
    const performer=actorProfile(scene.primary!);assert.equal(performer.appearance.bodyHeadBank!.fingerprint,l.bank.fingerprint);
    assert.equal(shot.cinematic!.performance.profileHash,performer.profileHash);assert.equal(shot.cinematic!.performance.leadCharacterId,'lila');
    assert.equal(hash(shot.cinematic!.performance.sourceHead),principalClock);assert.equal(hash(scene.supporting[0]!.performance.sourceHead),supportClock);
    assert.equal(scene.supporting[0]!.character.appearance.bodyHeadBank!.fingerprint,k.bank.fingerprint);
    assert.equal(scene.supporting[0]!.performance.profileHash,actorProfile(b).profileHash);
    assert.deepEqual(scene.speakingSegmentIds,['cue-lila']);assert.deepEqual(scene.supporting[0]!.speakingSegmentIds,['cue-karo']);
    assert.notEqual(performer.profileHash,base.profileHash);
  }
});

test('the complete unlocked cast is validated before any actor/costume/kind is changed',()=>{
  const a={...person('lila',topicAppearance('lila')),kind:'mini-robot' as const,costume:[{joint:'chest' as const,svg:'<path d="M0 0L1 1"/>'}]};
  const bad=person('karo',{...topicAppearance('karo'),characterVariant:'lila'}),value=board(a,[bad]),before=hash(value);
  assert.throws(()=>applyTopicCast(value,config()),/another actor\/model/);assert.equal(hash(value),before);
  const crossShot={shots:[...board(a).shots,...board(bad).shots.map(s=>({...s,id:'bad-second-shot'}))]};
  const beforeShots=hash(crossShot);assert.throws(()=>applyTopicCast(crossShot,config()),/another actor\/model/);assert.equal(hash(crossShot),beforeShots);
});

test('foreign or incomplete native source requests fail rather than being stripped or changed to a legacy face',async()=>{
  const {bank}=await headFaceCandidate(repo,'karo','three-quarter-left');
  const {bank:lilaBank}=await headFaceCandidate(repo,'lila','three-quarter-left');
  for(const patch of [{bodyView:'three-quarter-left' as const},{artworkVersion:'forest-head-1' as const},
    {artworkVersion:'forest-body-view-1' as const,bodyView:'three-quarter-left' as const,bodyHeadBank:bank},
    {artworkVersion:'forest-body-view-1' as const,bodyView:'three-quarter-left' as const,bodyHeadBank:lilaBank,bodyEyes:'registered-eyes-v1' as const},
    {artworkVersion:'forest-body-view-1' as const,bodyView:'three-quarter-left' as const,bodySeat:'registered-seated-v1' as const},
    {bodySpeech:'registered-rest-mouth-v1' as const},{supportingModel:'prehistoric-female-haired' as const}]){
    const value=board(person('lila',{...topicAppearance('lila'),...patch})),before=hash(value);
    assert.throws(()=>applyTopicCast(value,config()));assert.equal(hash(value),before);
  }
});

test('principal version1–2 registrations keep the original canonical bank/fingerprint without automatic face controls',()=>{
  for(const version of ['native-head-bank-1','native-head-bank-2'] as const){
    const bank=nativeHeadBank({version,id:'synthetic-source-roundtrip',actor:'lila',
      source:{file:version==='native-head-bank-1'?'library/topics/prehistoric-life/head-turn-studies/lila-head-turn-v4.png':'library/topics/prehistoric-life/head-cells/lila-head-synthetic-front-v1.png',sha256:'b'.repeat(64),width:400,height:200,...(version==='native-head-bank-2'?{pixelScale:1}:{})},
      primary:nativeHeadIdentities.lila.primary,bodyViews:[{view:'three-quarter-right',sourceHash:bodyViewRegistrations.lila['three-quarter-right'].sha256}],unitScale:.3,
      cells:[0,200].map((x,i)=>({id:'cell-'+i,...(version==='native-head-bank-2'?{sourceId:'primary'}:{}),crop:{x,y:0,width:200,height:200},neck:{x:x+100,y:180},neckTop:{x:x+100,y:150},
        chin:{x:x+105,y:145},eyeTarget:{x:x+110,y:100},skull:{x:x+40,y:30,width:120,height:110},yawDeg:10-i*5,seam:[{x:x+90,y:150},{x:x+110,y:150},{x:x+100,y:180}],restMood:'happy' as const})),
      routes:[['cell-0','cell-1'],['cell-1','cell-0']],capabilities:{speech:false,directionalEyes:false,expressions:false,secondary:false},status:'engineering-source-registration',approved:false,productionReady:false,motionVerified:false});
    const appearance={...topicAppearance('lila'),artworkVersion:'forest-body-view-1' as const,bodyView:'three-quarter-right' as const,bodyHeadBank:bank};
    const a=person('lila',appearance),value=board(a),before=hash(value);applyTopicCast(value,config());
    assert.equal(hash(value),before);assert.equal(a.appearance.bodyHeadBank!.fingerprint,bank.fingerprint);assert.deepEqual(a.appearance.bodyHeadBank,bank);
    assert.equal(a.appearance.bodyEyes,undefined);assert.equal(a.appearance.bodySpeech,undefined);
  }
});

test('own supporting bank4 is preserved for distinct people and remains distinct from the principal costume donor',async()=>{
  const {bank}=await headFaceCandidate(repo,'prehistoric-male-bald','three-quarter-left');
  const appearance=supportingNativeTopicAppearance({...supportingTopicAppearance('prehistoric-male-bald'),artworkVersion:'forest-body-view-1',bodyView:'three-quarter-left',bodyHeadBank:bank,bodyMotion:'registered-locomotion-v1'});
  const a=person('villager-a',appearance),b=person('villager-b',structuredClone(appearance)),value=board(a,[b]),before=hash(value);
  applyTopicCast(value,config());assert.equal(hash(value),before);
  assert.notEqual(a.id,b.id);assert.equal(a.appearance.bodyHeadBank!.actor,'prehistoric-male-bald');assert.equal(a.appearance.characterVariant,'karo');
  assert.equal(actorProfile(a).appearance.bodyHeadBank!.fingerprint,bank.fingerprint);
  assert.throws(()=>normalizeTopicActorAppearance('karo',topicAppearance('karo'),a.appearance));
});

test('legacy defaults and original RGB remain available without auto-selecting a native bank or changing narration identity',()=>{
  const generic={...topicAppearance('lila'),characterVariant:undefined,artworkVersion:undefined},a=person('lila',generic),value=board(a);
  applyTopicCast(value,config());assert.deepEqual(a.appearance,topicAppearance('lila'));assert.equal(a.appearance.bodyHeadBank,undefined);
  const rgb={...topicAppearance('karo'),sourceColour:'original-rgb-v2' as const},k=person('karo',rgb);applyTopicCast(board(k),config());assert.deepEqual(k.appearance,rgb);
  const untouched=board(person('lila',{...topicAppearance('lila'),characterVariant:'karo'})),before=hash(untouched);
  applyTopicCast(untouched,ConfigSchema.parse({}));assert.equal(hash(untouched),before);
  assert.equal(topicNarrativeContext(config())!.version,'prehistoric-story-contract-1');assert.deepEqual(topicNarrativeContext(config())!.principalVisualRoles,['female','male']);
  assert.throws(()=>requireTopicProductionReady(config()),/needs-art-direction/);
});

test('approved actor locks do not change when canonical native appearance passes normalization',async()=>{
  const {bank}=await headFaceCandidate(repo,'lila','three-quarter-right'),a=person('lila',{...topicAppearance('lila'),artworkVersion:'forest-body-view-1',bodyView:'three-quarter-right',bodyHeadBank:bank});
  const original=board(a),next=structuredClone(original);applyTopicCast(next,config());
  assert.doesNotThrow(()=>assertActorLocks(original,next,{[actorLockKey('lila')]:true}));
  const changed=structuredClone(next),{fingerprint,...definition}=bank;
  changed.shots[0]!.cinematic!.actorScene!.primary!.appearance.bodyHeadBank=nativeHeadBank({...definition,id:'changed-bank'});
  assert.throws(()=>assertActorLocks(original,changed,{[actorLockKey('lila')]:true}),/Unlock actor/);
});

test('creative brief reports explicitly supplied person/model/capabilities without falsely declaring every source-face bank silent',async()=>{
  const {bank}=await headFaceCandidate(repo,'lila','three-quarter-right'),p=actorProfile(person('lila',{...topicAppearance('lila'),artworkVersion:'forest-body-view-1',bodyView:'three-quarter-right',bodyHeadBank:bank}));
  const {bank:extraBank}=await headFaceCandidate(repo,'prehistoric-male-bald','three-quarter-left');
  const extra=person('villager-a',{...supportingTopicAppearance('prehistoric-male-bald'),artworkVersion:'forest-body-view-1',bodyView:'three-quarter-left',bodyHeadBank:extraBank});
  const brief=creativeActingBrief([], {mode:'script',durationMs:4000,segments:[],words:[]},p,[extra]);
  assert.deepEqual(brief.nativeHeadSource.explicitSelections.map(s=>[s.actorId,s.modelId,s.sourceFace,s.capabilities.speech,s.productionReady]),
    [['lila','lila',true,true,false],['villager-a','prehistoric-male-bald',true,true,false]]);
  assert.deepEqual(brief.nativeHeadSource.candidate.availableBanks,[]);assert.match(brief.nativeHeadSource.rule,/original speaker\/acting clocks/);
  assert.match(brief.nativeHeadSource.rule,/do not provide phoneme sync/);
});
