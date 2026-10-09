import { z } from 'zod';
import { Id, RigHandSchema } from '../core/identifiers.js';
import {NativeHeadTrackSchema} from './native-head-track.js';

export const ANIMATION_VERSION = 'performance-2.2.13';
// Optional airborne clips use their own version; accepted grounded plans stay exact.
export const AIRBORNE_ANIMATION_VERSION = 'performance-2.2.14';
export const HUNT_ANIMATION_VERSION='performance-2.2.15';
export const isCurrentAnimation=(version:string)=>version===ANIMATION_VERSION||version===AIRBORNE_ANIMATION_VERSION||version===HUNT_ANIMATION_VERSION;
export const CONTINUOUS_ANIMATION_VERSION = 'performance-2.2.12';
export const STORY_ANIMATION_VERSION = 'performance-2.2.11';
export const SEATED_ANIMATION_VERSION = 'performance-2.2.10';
export const PREVIOUS_ANIMATION_VERSION = 'performance-2.2.9';
export const BODY_ANIMATION_VERSION = 'performance-2.2.8';
export const LEGACY_ANIMATION_VERSION = 'performance-2.2.7';
export const LEGACY_MOODS = ['neutral', 'curious', 'thinking', 'concerned', 'effort', 'surprised', 'understanding', 'confident'] as const;
export const STORY_MOODS = ['happy', 'sad', 'angry', 'afraid', 'excited', 'disappointed', 'relieved', 'tired'] as const;
export const Moods = [...LEGACY_MOODS, ...STORY_MOODS] as const;
const Time = z.number().int().nonnegative();
export const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const Interval = { startMs: Time, endMs: Time };
export const GazeSchema=z.union([
  z.object({...Interval,target:PointSchema}).strict(),
  z.object({...Interval,actorTarget:z.object({id:Id,anchor:z.literal('eyes')}).strict()}).strict(),
]);
export type Gaze=z.infer<typeof GazeSchema>;
export const WalkSchema = z.object({ ...Interval, fromX: z.number().finite(), toX: z.number().finite(),gait:z.enum(['walk','run']).optional() }).strict();
export const JumpSchema=z.object({...Interval,takeoffMs:Time,landingMs:Time,height:z.number().finite().positive(),tuck:z.number().finite().min(0).max(.5).optional()}).strict();
export const FacingSchema=z.enum(['front','left','right']);
export const TurnSchema=z.object({...Interval,direction:FacingSchema}).strict();
export const HeadViewSchema=z.enum(['front','three-quarter-left','three-quarter-right','left','right','back-left','back-right','back']);
export type HeadView=z.infer<typeof HeadViewSchema>;
export const HeadTurnSchema=z.object({...Interval,direction:HeadViewSchema}).strict();
const PostureTarget = {
  pose:z.enum(['stand','crouch','lean','seated']),
  intensity:z.number().finite().min(0).max(1).optional(),
  leanDeg:z.number().finite().min(-25).max(25).optional(),
  supportId:Id.optional(),
};
export const PostureTargetSchema=z.object(PostureTarget).strict();
export const PostureSchema=z.object({...Interval,...PostureTarget}).strict();
export const SeatSupportSchema=z.object({id:Id,kind:z.literal('seat'),center:PointSchema,width:z.number().finite().positive(),
  facing:z.enum(['left','right']),backHeight:z.number().finite().nonnegative().optional()}).strict();
/** Complete physical motion in its original run-relative clock. Every camera
 * slice declares this same source; local motion tracks must not approximate it. */
export const BODY_SOURCE_VERSION='native-source-body-1' as const;
export const BODY_SOURCE_SEAT_CLOCK_VERSION='native-source-seat-1' as const;
export const BodySourceSchema=z.object({version:z.literal(BODY_SOURCE_VERSION),id:Id,startMs:Time,endMs:Time,
  walks:z.array(WalkSchema),jumps:z.array(JumpSchema).max(16).optional(),postures:z.array(PostureSchema).optional(),entryPosture:PostureTargetSchema.optional(),
  supports:z.array(SeatSupportSchema).max(12).optional(),
}).strict().superRefine((source,ctx)=>{
  const duration=source.endMs-source.startMs;
  if(duration<=0)ctx.addIssue({code:'custom',message:'Invalid original body source span'});
  const ids=new Set((source.supports??[]).map(s=>s.id));
  if(ids.size!==(source.supports?.length??0))ctx.addIssue({code:'custom',path:['supports'],message:'Duplicate original seat support identity'});
  for(const pose of [...(source.entryPosture?[source.entryPosture]:[]),...(source.postures??[])]){
    if(pose.pose==='seated'&&(!pose.supportId||!ids.has(pose.supportId)))ctx.addIssue({code:'custom',path:['supports'],message:'Original seated posture requires a known seat support'});
    if(pose.pose!=='seated'&&pose.supportId)ctx.addIssue({code:'custom',path:['postures'],message:'Only an original seated posture can own a seat support'});
  }
  for(const [name,clips] of [['walks',source.walks],['jumps',source.jumps??[]],['postures',source.postures??[]]] as const){
    let previousEnd=0;
    for(const clip of [...clips].sort((a,b)=>a.startMs-b.startMs)){
      if(clip.endMs<=clip.startMs||clip.startMs<previousEnd||clip.endMs>duration)ctx.addIssue({code:'custom',path:[name],message:'Original body tracks must fit their complete relative span without overlap'});
      previousEnd=clip.endMs;
    }
  }
});
export type BodySource=z.infer<typeof BodySourceSchema>;
/** Original absolute motion window. It is not a narration or contact clock. */
export const GestureSourceSpanSchema=z.object({...Interval,id:Id,reachMs:Time.optional(),recoverMs:Time.optional()}).strict().superRefine((span,ctx)=>{
  const reach=span.reachMs??span.startMs+Math.min(600,(span.endMs-span.startMs)*.35),recover=span.recoverMs??Math.max(reach,span.endMs-Math.min(400,(span.endMs-span.startMs)*.25));
  if(span.endMs<=span.startMs||reach<=span.startMs||recover<reach||recover>=span.endMs)ctx.addIssue({code:'custom',message:'Invalid source gesture approach/hold/recovery window'});
});
export type GestureSourceSpan=z.infer<typeof GestureSourceSpanSchema>;
export const GestureSchema = z.object({ ...Interval, id: Id,
  action: z.enum(['address-viewer', 'point', 'inspect', 'think', 'operate', 'pick-place', 'carry', 'drop', 'react', 'lead-next']),
  target: PointSchema.optional(), destination: PointSchema.optional(),
  elbowPole:z.enum(['rest','reach']).optional(),
  hand:RigHandSchema.optional(),
  sourceSpan:GestureSourceSpanSchema.optional(),
  propId: Id.optional(), contactMs: Time.optional(), releaseMs: Time.optional(), landingMs:Time.optional(), carryOffset: PointSchema.optional(),
}).strict();
export const PropSchema=z.object({id:Id,origin:PointSchema,destination:PointSchema.optional(),gripOffset:PointSchema.optional(),attachedTo:z.enum(['left-hand','right-hand']).optional(),kind:z.enum(['generic','spear']).optional(),length:z.number().finite().min(50).max(600).optional()}).strict().superRefine((prop,ctx)=>{
  if(prop.kind!=='spear'&&(prop.length??0)>200)ctx.addIssue({code:'custom',path:['length'],message:'Only a spear has the extended 600-unit shaft range.'});
});
export const MANIPULATION_SOURCE_VERSION='native-source-manipulation-1' as const;
/** Complete actor-owned hand/object history; times are relative to startMs,
 * never clipped/restarted by a shot. This is separate from point/think spans. */
export const ManipulationSourceSchema=z.object({version:z.literal(MANIPULATION_SOURCE_VERSION),id:Id,startMs:Time,endMs:Time,
  props:z.array(PropSchema).max(16),gestures:z.array(GestureSchema).min(1).max(32),
}).strict().superRefine((source,ctx)=>{
  const duration=source.endMs-source.startMs,props=new Set(source.props.map(p=>p.id));
  if(duration<=0||props.size!==source.props.length||new Set(source.gestures.map(g=>g.id)).size!==source.gestures.length)ctx.addIssue({code:'custom',message:'Invalid original manipulation span or duplicate identity'});
  if(source.props.some(p=>p.kind==='spear'))ctx.addIssue({code:'custom',path:['props'],message:'Original manipulation does not register a spear grip track'});
  for(const g of source.gestures){
    if(!['operate','pick-place','carry','drop'].includes(g.action)||!g.hand||g.elbowPole!=='rest'||g.sourceSpan||!g.target||g.contactMs===undefined||g.startMs<0||g.endMs>duration||g.endMs<=g.startMs)ctx.addIssue({code:'custom',path:['gestures'],message:'Original contact needs its own explicit action/hand/rest pole/target/clock'});
    if(g.propId&&!props.has(g.propId)||g.action!=='operate'&&!g.propId)ctx.addIssue({code:'custom',path:['gestures'],message:'Original attachment needs a known own prop'});
  }
  for(const hand of ['left','right'] as const){let end=0;for(const g of source.gestures.filter(g=>g.hand===hand).sort((a,b)=>a.startMs-b.startMs)){if(g.startMs<end)ctx.addIssue({code:'custom',path:['gestures'],message:'Original hand ownership overlaps'});end=g.endMs;}}
  for(const p of source.props)if(source.gestures.filter(g=>g.propId===p.id&&g.action!=='operate').length!==1)ctx.addIssue({code:'custom',path:['props'],message:'One complete own attachment per prop; handoff is not registered'});
});
export type ManipulationSource=z.infer<typeof ManipulationSourceSchema>;
export const SpearTrackSchema=z.object({...Interval,id:Id,propId:Id,hand:RigHandSchema,
  action:z.enum(['hold','thrust']),grip:PointSchema,aim:PointSchema,
  twoHands:z.boolean().default(true),secondaryOffset:z.number().finite().min(-200).max(-10),
  elbowPoles:z.object({primary:z.union([z.literal(-1),z.literal(1)]),secondary:z.union([z.literal(-1),z.literal(1)])}).strict().optional(),
  readyMs:Time.optional(),contactMs:Time.optional(),recoverMs:Time.optional()}).strict();
export const LungeSchema=z.object({version:z.literal('forest-planted-lunge-1'),spearId:Id,
  soles:z.object({left:PointSchema,right:PointSchema}).strict(),
  kneePoles:z.object({left:z.union([z.literal(-1),z.literal(1)]),right:z.union([z.literal(-1),z.literal(1)])}).strict(),
  advanceX:z.number().finite().min(-20).max(20),dropY:z.number().finite().min(0).max(12),
  entryLeanDeg:z.number().finite().min(-20).max(20),contactLeanDeg:z.number().finite().min(-25).max(25)}).strict();
// Insert immediately after LungeSchema. Existing local SpearTrackSchema and generic manipulation schemas remain unchanged.
export const SPEAR_SOURCE_VERSION='native-source-spear-1' as const;
const SpearSourceTime=Time.refine(Number.isSafeInteger,{message:'Original spear clocks require exact safe integers'});
const SpearSourcePole=z.union([z.literal(-1),z.literal(1)]);
/** Complete actor-owned, entry-attached spear history. The source-only twoHand
 * and left/right poles are explicitly adapted to the existing physical track
 * representation by view-source-spear.ts; no authored values are defaulted. */
export const SpearSourceSchema=z.object({
  version:z.literal(SPEAR_SOURCE_VERSION),id:Id,ownerId:Id,
  startMs:SpearSourceTime,endMs:SpearSourceTime,
  props:z.array(z.object({
    id:Id,kind:z.literal('spear'),origin:PointSchema,
    attachedTo:z.enum(['left-hand','right-hand']),
    length:z.number().finite().min(50).max(600),
    gripOffset:z.object({x:z.number().finite(),y:z.literal(0)}).strict(),
  }).strict()).min(1).max(2),
  spears:z.array(z.object({
    id:Id,propId:Id,startMs:z.literal(0),endMs:SpearSourceTime,
    hand:RigHandSchema,twoHand:z.boolean(),
    action:z.enum(['hold','thrust']),grip:PointSchema,aim:PointSchema,
    secondaryOffset:z.number().finite().min(-200).max(-10),
    elbowPoles:z.object({left:SpearSourcePole,right:SpearSourcePole}).strict(),
    readyMs:SpearSourceTime.optional(),contactMs:SpearSourceTime.optional(),recoverMs:SpearSourceTime.optional(),
  }).strict()).min(1).max(2),
  lunge:LungeSchema.optional(),
}).strict().superRefine((source,ctx)=>{
  const issue=(path:(string|number)[],message:string)=>ctx.addIssue({code:'custom',path,message});
  const duration=source.endMs-source.startMs;
  if(duration<=0)issue([],'Original spear source must have a positive complete span');
  const props=new Map(source.props.map(prop=>[prop.id,prop]));
  if(props.size!==source.props.length)issue(['props'],'Duplicate original spear prop identity');
  if(new Set(source.spears.map(track=>track.id)).size!==source.spears.length)
    issue(['spears'],'Duplicate original spear track identity');
  if(new Set(source.spears.map(track=>track.propId)).size!==source.spears.length)
    issue(['spears'],'Each original spear prop must have exactly one complete owning track');
  const owners=new Set<string>();
  for(const [index,track] of source.spears.entries()){
    const path=['spears',index];
    if(track.endMs!==duration)issue(path,'Every original spear track must cover exactly 0 through the full original duration');
    const hands=track.twoHand?['left','right'] as const:[track.hand];
    for(const hand of hands){
      if(owners.has(hand))issue(path,'Duplicated original spear hand owner');
      owners.add(hand);
    }
    const prop=props.get(track.propId);
    if(!prop)issue([...path,'propId'],'Original spear track references an unknown own prop');
    else {
      if(prop.attachedTo!==(track.hand==='left'?'left-hand':'right-hand'))
        issue([...path,'hand'],'Entry attachment must match the declared primary hand');
      const half=prop.length/2,primary=prop.gripOffset.x,secondary=primary+track.secondaryOffset;
      if(primary < -half+5||primary > half-22)
        issue(['props',source.props.indexOf(prop),'gripOffset'],'Primary grip must remain on its own wooden shaft, clear of the butt and tip');
      if(track.twoHand&&(secondary < -half+5||secondary > half-22))
        issue([...path,'secondaryOffset'],'Secondary grip must remain on its own wooden shaft, clear of the butt and tip');
    }
    if(track.action==='hold'){
      if(track.readyMs!==undefined||track.contactMs!==undefined||track.recoverMs!==undefined)
        issue(path,'An original hold cannot declare thrust phases');
    } else {
      const ready=track.readyMs,contact=track.contactMs,recover=track.recoverMs;
      if(ready===undefined||contact===undefined||recover===undefined||
        !(track.startMs<ready&&ready<contact&&contact<recover&&recover<track.endMs))
        issue(path,'A complete original thrust requires start < ready < contact < recover < end');
    }
  }
  for(const [index,prop] of source.props.entries())
    if(source.spears.filter(track=>track.propId===prop.id).length!==1)
      issue(['props',index],'Every original spear prop requires exactly one complete owning track');
  const lunge=source.lunge;
  if(lunge){
    const track=source.spears.find(candidate=>candidate.id===lunge.spearId);
    if(!track||track.action!=='thrust'||!track.twoHand||source.spears.length!==1)
      issue(['lunge','spearId'],'Original planted lunge requires exactly one owned two-hand thrust track ID, not a prop ID');
  }
});
export type SpearSource=z.infer<typeof SpearSourceSchema>;


export const PerformancePlanSchema = z.object({
  version: z.literal(22), compilerVersion: z.enum([HUNT_ANIMATION_VERSION,AIRBORNE_ANIMATION_VERSION,ANIMATION_VERSION,CONTINUOUS_ANIMATION_VERSION,STORY_ANIMATION_VERSION,SEATED_ANIMATION_VERSION,PREVIOUS_ANIMATION_VERSION,BODY_ANIMATION_VERSION,LEGACY_ANIMATION_VERSION]), id: Id,
  leadCharacterId: Id, profileHash: z.string().min(1), kind: z.enum(['stick-man', 'mini-robot']),
  durationMs: Time.refine(n => n > 0), fps: z.number().int().min(24).max(60),
  stage: z.object({ width: z.number().finite().positive(), height: z.number().finite().positive(), groundY: z.number().finite() }).strict(),
  root: PointSchema, scale: z.number().min(.25).max(4),
  facing:FacingSchema.optional(),turns:z.array(TurnSchema).optional(),
  headView:HeadViewSchema.optional(),headTurns:z.array(HeadTurnSchema).max(40).optional(),
  entryPosture:PostureTargetSchema.optional(),postures:z.array(PostureSchema).optional(),
  supports:z.array(SeatSupportSchema).max(12).optional(),
  walks: z.array(WalkSchema), jumps:z.array(JumpSchema).max(16).optional(), gestures: z.array(GestureSchema),spears:z.array(SpearTrackSchema).max(8).optional(),
  sourceBody:BodySourceSchema.optional(),
  sourceManipulation:ManipulationSourceSchema.optional(),
  sourceSpear:SpearSourceSchema.optional(),
  sourceHead:NativeHeadTrackSchema.optional(),
  lunge:LungeSchema.optional(),
  expressions: z.array(z.object({ ...Interval, mood: z.enum(Moods) }).strict()),
  gazes: z.array(GazeSchema),
  props: z.array(PropSchema),
}).strict();
export type PerformancePlan = z.infer<typeof PerformancePlanSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Mood = typeof Moods[number];
export type PostureTarget = z.infer<typeof PostureTargetSchema>;
export type SeatSupport = z.infer<typeof SeatSupportSchema>;
