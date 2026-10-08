# Source0.52 supporting actors — integration review packet

Bound source files at preparation:

```json
[
  {
    "file": "packages/host/schemas.ts",
    "sha256": "3f194a8b532c60b2bf00afa5b3a7753b11a2c180c2c3ad101e8b136ee2d9455c"
  },
  {
    "file": "packages/topics/prehistoric-life.ts",
    "sha256": "4d35599e341e56cf70f7b0d95e8bb85e10319509c6498a5e7b891a9922aac310"
  },
  {
    "file": "packages/animation/forest-cutout-head.ts",
    "sha256": "ece159d21349aa7fd37014b5e8497d6216d2e8d990b766d664689bc10373158a"
  },
  {
    "file": "packages/animation/forest-head-art.ts",
    "sha256": "f0118f3761ef602cf2f323a049cbb0cd435b0f467d941e9ccee3e7cfd00bdf26"
  },
  {
    "file": "packages/animation/compiler.ts",
    "sha256": "374554a5e8d47307ef439c5c5767e3c38c1697c9046349389806dcf7b56d6d32"
  },
  {
    "file": "apps/server/index.ts",
    "sha256": "3179143c47f3825dc258c3c75e581293b45876d82212c70ea91ef0c770795e88"
  }
]
```

Diff excerpts only; not whole source. Existing original-source body and cutout facial activity clock remain unchanged. Supporting models must not use the primary or bank3 facial registrations. Source PNG/masks, pose/video, API server and runtime tests are NOT RUN and are not part of this text-only review.

```diff
diff --git a/apps/server/index.ts b/apps/server/index.ts
index 4ed3198..ee76e8f 100644
--- a/apps/server/index.ts
+++ b/apps/server/index.ts
@@ -45,6 +45,7 @@ import {headTurnInventory,headTurnMaterial} from '../../packages/topics/head-tur
 import {headCellArtDescription,headCellInventory,headCellMaterial,HeadCellFileSchema} from '../../packages/topics/head-cell-art.js';
 import {HeadCellCheckRequestSchema,checkBoundHeadCellDraft} from '../../packages/topics/head-cell-landmarks.js';
 import {headCellWorkbench,headCellEditorScript} from '../../packages/topics/head-cell-workbench.js';
+import {supportingActorWorkbench,supportingActorManifest,supportingActorImage} from '../../packages/topics/supporting-workbench.js';
 import {HeadTurnCheckRequestSchema,HeadTurnFileSchema} from '../../packages/topics/head-turn-schemas.js';
 import {checkBoundHeadTurnDraft} from '../../packages/topics/head-turn-landmarks.js';
 import {Moods} from '../../packages/animation/schemas.js';
@@ -288,7 +289,10 @@ export async function buildServer(options: ServerOptions = {}) {
     return { projects: projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
   });
   app.get('/api/9router',async()=>{await loadConfig(projectsRoot);try{return await discoverNineRouter();}catch{throw new ApiError(503,'9router unavailable or authentication failed. Configure MODEL_GATEWAY_KEY and start the local service.','ROUTER_UNAVAILABLE');}});
-  app.get('/api/topics',async()=>({topics:[{id:'prehistoric-life',name:'Cuộc sống thời tiền sử',cast:['Lila','Karo'],visualAcceptance:'pending',readiness:prehistoricReadiness,inputModes:['script','wav','story'],preview:'/api/topics/prehistoric-life/preview',compare:'/api/topics/prehistoric-life/compare'}]}));
+  app.get('/api/topics',async()=>({topics:[{id:'prehistoric-life',name:'Cuộc sống thời tiền sử',cast:['Lila','Karo'],supportingCast:supportingActorManifest(),visualAcceptance:'pending',readiness:prehistoricReadiness,inputModes:['script','wav','story'],preview:'/api/topics/prehistoric-life/preview',compare:'/api/topics/prehistoric-life/compare'}]}));
+  app.get('/api/topics/prehistoric-life/supporting-actors',async(_request,reply)=>reply.type('text/html').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').header('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'").send(supportingActorWorkbench()));
+  app.get('/api/topics/prehistoric-life/supporting-actors/manifest',async()=>supportingActorManifest());
+  app.get<{Params:{file:string}}>('/api/topics/prehistoric-life/supporting-actors/:file',async(request,reply)=>reply.type('image/png').header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').send(await supportingActorImage(repo,request.params.file)));
   app.get<{Params:{topic:string};Querystring:{light?:string}}>('/api/topics/:topic/preview',async(request,reply)=>{
     z.literal('prehistoric-life').parse(request.params.topic);const light=z.enum(['day','sunset','night']).default('day').parse(request.query.light);
     const images=await Promise.all(['lila','karo'].map(async id=>{const bytes=await fs.readFile(await boundPath(repo,`library/topics/prehistoric-life/${id}-cutout-v1.png`));return bytes.toString('base64');}));
diff --git a/packages/animation/compiler.ts b/packages/animation/compiler.ts
index 1b5f966..76d750b 100644
--- a/packages/animation/compiler.ts
+++ b/packages/animation/compiler.ts
@@ -97,6 +97,7 @@ function overlaps(items: Array<{startMs:number;endMs:number}>, label:string, dur
 }
 /** Applies equally to compiled plans and direct random-access inspection. */
 function validateFixedBodyView(plan:PerformancePlan,profile:HostProfile):void {
+  if(profile.appearance.supportingModel&&(plan.gazes.length||plan.turns?.length||plan.headTurns?.length))throw new Error('needs-supporting-views: supporting head currently has one source orientation; target gaze and turns require its own registrations');
   validateNativeHeadBankTrack(plan,profile);
   if(plan.sourceBody){
     if(!usesBodyView(profile)||!hasBodyViewLocomotion(profile)||!isCurrentAnimation(plan.compilerVersion))throw new Error('needs-view-body-phase: original body span needs the selected current native locomotion candidate');
diff --git a/packages/animation/forest-cutout-head.ts b/packages/animation/forest-cutout-head.ts
index 5a757e6..500430e 100644
--- a/packages/animation/forest-cutout-head.ts
+++ b/packages/animation/forest-cutout-head.ts
@@ -4,6 +4,7 @@ import {hash} from '../core/utils.js';
 import {usesBodyView,bodyViewHeadCalibration,bodyViewHeadSvg,bodyViewDescription} from './body-view-art.js';
 import {hasNativeHeadBank} from './body-head-bank.js';
 import {usesSourceColour,sourceColourSvg,sourceColourDescription} from './source-colour-art.js';
+import {supportingHeadRegistration,supportingHeadSvg,supportingHeadDescription} from './prehistoric-supporting-head.js';
 
 type Actor='lila'|'karo';
 type Point={x:number;y:number};
@@ -22,13 +23,14 @@ export const cutoutHeadCalibration={
 } as const;
 export const CUTOUT_HEAD_VERSION='forest-cutout-head-2';
 export function usesCutoutHead(profile:HostProfile){return profile.appearance.artworkVersion==='forest-body-1'||usesBodyView(profile);}
-export function cutoutHeadRegistration(profile:HostProfile){return usesBodyView(profile)?bodyViewHeadCalibration(profile):cutoutHeadCalibration[profile.appearance.characterVariant!];}
+export function cutoutHeadRegistration(profile:HostProfile){return profile.appearance.supportingModel?supportingHeadRegistration(profile):usesBodyView(profile)?bodyViewHeadCalibration(profile):cutoutHeadCalibration[profile.appearance.characterVariant!];}
 export function cutoutHeadChin(profile:HostProfile,side:'left'|'right'):Point {
   if(hasNativeHeadBank(profile))throw new Error('needs-head-source-phase: changing head chin requires its selected original cell/time');
   const c=cutoutHeadRegistration(profile);
   return {x:(c.chin[side].x-c.neck.x)*c.scale,y:(c.chin[side].y-c.neck.y)*c.scale};
 }
 export function cutoutHeadSvg(profile:HostProfile,imageUrl:(file:string,sha:string)=>string):string {
+  if(profile.appearance.supportingModel)return supportingHeadSvg(profile,imageUrl);
   const originalColour=usesSourceColour(profile.appearance);
   if(usesBodyView(profile))return bodyViewHeadSvg(profile,imageUrl);
   const actor=profile.appearance.characterVariant!,c=cutoutHeadCalibration[actor];
@@ -55,7 +57,7 @@ export function cutoutHeadFaceState(input:{blink:number;round:number;frown:numbe
     'mouth-talk-round-front':{opacity:roundedSpeaking?1:0,scaleY:roundedSpeaking?.6+input.speechLevel!*.55:1},
     'mouth-round-front':{opacity:round*(1-frown)},'mouth-frown-front':{opacity:frown}};
 }
-export function cutoutHeadDescription(){return {version:CUTOUT_HEAD_VERSION,calibration:cutoutHeadCalibration,sourceColour:sourceColourDescription,authoredViews:bodyViewDescription,fingerprint:hash({version:CUTOUT_HEAD_VERSION,cutoutHeadCalibration,views:bodyViewDescription.fingerprint,colour:sourceColourDescription.fingerprint}),
+export function cutoutHeadDescription(){return {version:CUTOUT_HEAD_VERSION,calibration:cutoutHeadCalibration,supporting:supportingHeadDescription,sourceColour:sourceColourDescription,authoredViews:bodyViewDescription,fingerprint:hash({version:CUTOUT_HEAD_VERSION,cutoutHeadCalibration,supporting:supportingHeadDescription,views:bodyViewDescription.fingerprint,colour:sourceColourDescription.fingerprint}),
   happy:'One unwarped cutout image, retaining its complete face, nose, eyes and smile; no relocated or enlarged glyphs.',
   orientation:'fixed source orientation with whole-head tilt/nod; no yaw reconstruction; partner-facing authored views pending',
   expression:'source happy retained; provisional blink and speech/frown/round overlays only, not accepted expression art or phoneme lip-sync',
diff --git a/packages/animation/forest-head-art.ts b/packages/animation/forest-head-art.ts
index fc608f7..7c2a596 100644
--- a/packages/animation/forest-head-art.ts
+++ b/packages/animation/forest-head-art.ts
@@ -9,6 +9,7 @@ import {cutoutHeadSvg,cutoutHeadFaceState,cutoutHeadDescription,usesCutoutHead}
 import {usesBodyView,registeredBodyView,bodyViewAsset} from './body-view-art.js';
 import {usesSourceColour,sourceColourAssets} from './source-colour-art.js';
 import {bodyViewRestMouthAssets} from './body-view-rest-mouth.js';
+import {supportingHeadAssets} from './prehistoric-supporting-head.js';
 import {hasNativeHeadBank,registeredNativeHeadBank} from './body-head-bank.js';
 import {nativeHeadResources,readNativeHeadSource,readNativeHeadPrimary,type NativeHeadResource} from './native-head-resources.js';
 import {nativeHeadSources} from './native-head-bank.js';
@@ -17,7 +18,7 @@ import {projectedHeadSvg,projectedSkinPolygon,headProjectionCalibration,headProj
 export const FOREST_HEAD_VERSION='forest-head-1' as const;
 // Bump these when render/evaluation logic changes after a pack is released.
 export const FOREST_FACE_COMPILER_VERSION='forest-face-motion-10';
-export const FOREST_HEAD_RENDER_VERSION='forest-head-svg-19';
+export const FOREST_HEAD_RENDER_VERSION='forest-head-svg-20';
 export const FOREST_HEAD_VIEWS=['three-quarter-left','front','three-quarter-right'] as const;
 export type ReferenceHeadView=typeof FOREST_HEAD_VIEWS[number];
 type View=ReferenceHeadView;
@@ -203,6 +204,7 @@ export function referenceFaceState(input:ReferenceFaceInput):FrameState['face']
 }
 /** Fixed pack resources only. Stage original bytes and retain their hashes. */
 export function referenceHeadAssets(appearance:HostProfile['appearance']):NativeHeadResource[] {
+  if(appearance.supportingModel)return supportingHeadAssets(appearance);
   if(usesSourceColour(appearance))return sourceColourAssets(appearance);
   if(usesBodyView({appearance}))return [bodyViewAsset(appearance),...(hasNativeHeadBank({appearance})?nativeHeadResources(registeredNativeHeadBank({appearance})):bodyViewRestMouthAssets(appearance))];
   if(appearance.artworkVersion!==FOREST_HEAD_VERSION&&appearance.artworkVersion!=='forest-body-1')return [];
diff --git a/packages/host/schemas.ts b/packages/host/schemas.ts
index 0808b7c..b1fd01d 100644
--- a/packages/host/schemas.ts
+++ b/packages/host/schemas.ts
@@ -1,6 +1,7 @@
 import { z } from 'zod';
 import { Id, RigHandSchema } from '../core/identifiers.js';
 import {NativeHeadBankSchema} from '../animation/native-head-bank.js';
+import {PREHISTORIC_SUPPORTING_MODELS,prehistoricSupportingModel} from '../topics/supporting-models.js';
 
 export const HostKinds = ['mini-robot', 'stick-man'] as const;
 export const HostActions = ['idle', 'greet', 'explain', 'point', 'operate-model', 'compare', 'think', 'react', 'summarize', 'walk-to-marker'] as const;
@@ -12,10 +13,12 @@ export const HostProfileSchema = z.object({
     headScale: z.number().min(0.75).max(1.25), bodyScale: z.number().min(0.75).max(1.25),
     strokeWidth: z.number().min(2).max(10),
     characterVariant: z.enum(['lila','karo']).optional(),
+    supportingModel:z.enum(PREHISTORIC_SUPPORTING_MODELS).optional(),
     artworkVersion: z.enum(['forest-head-1','forest-body-1','forest-body-view-1']).optional(),
     bodyView:z.enum(['three-quarter-right','three-quarter-left']).optional(),
     bodyHeadBank:NativeHeadBankSchema.optional(),
     bodySpeech:z.enum(['registered-mouth-v1','registered-rest-mouth-v1']).optional(),bodyEyes:z.literal('registered-eyes-v1').optional(),bodyExpressions:z.literal('registered-expressions-v1').optional(),bodyMotion:z.literal('registered-locomotion-v1').optional(),bodySeat:z.literal('registered-seated-v1').optional(),bodySecondary:z.literal('registered-secondary-v1').optional(),sourceColour:z.literal('original-rgb-v2').optional() }).strict().superRefine((a,ctx)=>{
+      if(a.supportingModel&&(a.artworkVersion!=='forest-body-1'||a.characterVariant!==prehistoricSupportingModel(a.supportingModel).bodyTemplate||a.bodyView||a.bodyHeadBank||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodyMotion||a.bodySeat||a.bodySecondary||a.sourceColour))ctx.addIssue({code:'custom',message:'Supporting model requires its matching source costume; primary/native-view face and motion registrations cannot be reused'});
       if(a.artworkVersion==='forest-body-view-1'&&(!a.bodyView||!a.characterVariant))ctx.addIssue({code:'custom',message:'Authored body candidate requires its actor and registered view'});
       if(a.bodyView&&a.artworkVersion!=='forest-body-view-1')ctx.addIssue({code:'custom',message:'bodyView requires the authored body candidate artwork version'});
       if(a.bodyHeadBank&&(a.artworkVersion!=='forest-body-view-1'||a.characterVariant!==a.bodyHeadBank.actor||!a.bodyHeadBank.bodyViews.some(v=>v.view===a.bodyView)||a.bodySpeech||a.bodyEyes||a.bodyExpressions||a.bodySecondary))ctx.addIssue({code:'custom',message:'Head bank requires its actor/body source and independent cell capabilities; fixed-view face/hair overlays cannot be reused'});
diff --git a/packages/topics/prehistoric-life.ts b/packages/topics/prehistoric-life.ts
index b82922f..2ce31c0 100644
--- a/packages/topics/prehistoric-life.ts
+++ b/packages/topics/prehistoric-life.ts
@@ -12,8 +12,9 @@ import {nativeActorGazeDescription} from '../animation/view-gaze-target.js';
 import {headTurnArtDescription} from './head-turn-art.js';
 import {nativeHeadBankDescription} from '../animation/native-head-bank.js';
 import {headCellArtDescription} from './head-cell-art.js';
+import {prehistoricSupportingModel,prehistoricSupportingDescription,type PrehistoricSupportingModel} from './supporting-models.js';
 
-export const PREHISTORIC_TOPIC_VERSION='forest-tribe-0.51-source-face';
+export const PREHISTORIC_TOPIC_VERSION='forest-tribe-0.52-supporting-cast';
 export const prehistoricReadiness={productionReady:false,artwork:'source-body-head-candidates',rejected:'vector-v0.3',layers:'source-body-and-head-integrated-secondary-pending',motionAcceptance:'pending'} as const;
 export const prehistoricReferences=[
   {file:'reference-lila-full.png',role:'primary-lila-design'},
@@ -37,6 +38,9 @@ export function topicAppearance(id:'lila'|'karo'):ActorDefinition['appearance']
   return {outline:'#080604',shell:forestPalette.skin,screen:forestPalette.skin,accent:forestPalette.fur,badge:forestPalette.hair,
     headScale:id==='lila'?1:1.04,bodyScale:id==='lila'?1:1.08,strokeWidth:16*318/(id==='lila'?766:716),characterVariant:id,artworkVersion:'forest-body-1'};
 }
+export function supportingTopicAppearance(model:PrehistoricSupportingModel):ActorDefinition['appearance']{
+  return {...topicAppearance(prehistoricSupportingModel(model).bodyTemplate),supportingModel:model};
+}
 export function topicContext(config:FactoryConfig) {
   if(!config.topic.id)return null;
   return {id:'prehistoric-life',version:PREHISTORIC_TOPIC_VERSION,name:'Cuộc sống thời tiền sử',
@@ -65,7 +69,8 @@ export function topicContext(config:FactoryConfig) {
       })},
     cast:[{id:'lila',name:'Lila',description:'Female prehistoric stick actor: long dark brown hair with side-swept fringe, warm face, asymmetric ragged fur dress.',appearance:topicAppearance('lila')},
       {id:'karo',name:'Karo',description:'Male prehistoric stick actor: tousled short dark brown hair, full beard around expressive mouth, asymmetric fur tunic and ragged shorts with two separate legs.',appearance:topicAppearance('karo')}],
-    acting:'These are reusable visual actors inside the events. Assign the two principal sourced roles to IDs lila (female model) and karo (male model). Keep each participant name, role, identity and evidence from narration unchanged: Lila/Karo are the model names, not permission to rename story people. Do not invent a presenter, dialogue, historical identity or extra events. Only source-supported dialogue gets speakingSegmentIds. A recorded narrator stays off screen.',
+    supportingCast:prehistoricSupportingDescription,
+    acting:'These are reusable visual actors inside the events. Assign the two principal sourced roles to IDs lila (female model) and karo (male model). Additional source-supported participants use their own stable actor IDs with appearance.supportingModel=prehistoric-male-bald or prehistoric-female-haired and the matching Karo/Lila source costume. Multiple participants may share a visual model, never an actor ID. A supporting person may be the camera primary in a shot while keeping their supportingModel and identity. Keep each participant name, role, identity and evidence from narration unchanged: visual model names are not permission to rename story people. Do not invent a presenter, crowds, dialogue, historical identity or extra events. Only source-supported dialogue gets speakingSegmentIds. A recorded narrator stays off screen.',
     design:'Thin continuous dark curved limbs, grounded feet, anatomically stable elbows, coordinated body action, head turns and partner/object gaze. Rich forest greens, warm ochre fur and skin, vivid fire. Layered forest depth with textured artwork. Never replace the cast with portraits or slides.',
     freedoms:'Staging, narrative action, environments, props, lighting and camera vary with the input story. Do not force machinery or a fixed food scene. Use the palette as the reusable art direction, not an unlit flat background.'};
 }
@@ -77,9 +82,11 @@ export function applyTopicCast(board:Storyboard,config:FactoryConfig):void {
   for(const shot of board.shots){
     const scene=shot.cinematic?.actorScene;if(!scene)continue;
     for(const character of [...(scene.primary?[scene.primary]:[]),...scene.supporting.map(a=>a.character)]){
-      if(character.id!=='lila'&&character.id!=='karo')throw new Error(`${shot.id}: topic cast must use lila/karo IDs; preserve source roles without inventing new cast`);
+      const principal=character.id==='lila'||character.id==='karo';
+      if(principal&&character.appearance.supportingModel)throw new Error(`${shot.id}: principal lila/karo IDs cannot select a supporting model`);
+      if(!principal&&!character.appearance.supportingModel)throw new Error(`${shot.id}: additional sourced cast requires its own actor ID and explicit supportingModel`);
       character.kind='stick-man';
-      character.appearance=topicAppearance(character.id);
+      character.appearance=principal?topicAppearance(character.id as 'lila'|'karo'):supportingTopicAppearance(character.appearance.supportingModel!);
       // Costume and head artwork are versioned rig assets, not per-shot model drawings.
       delete character.costume;
     }

```
