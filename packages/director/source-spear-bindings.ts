import type {Shot,Storyboard,Narration} from '../core/schemas.js';
import type {CinematicPlan} from './schemas.js';
import {hash} from '../core/utils.js';
import {boundProp,assertPropAliasCoverage,propAliasIdentity} from './prop-owner.js';
import {SourceSpearBindingSchema,SOURCE_SPEAR_BINDING_VERSION} from './source-spear-binding-schemas.js';
import {actorProfile} from '../actors/model.js';
import {actorViewActingClock} from '../actors/view-acting-clock.js';
import {validatePerformance,samplePhysicalPerformance} from '../animation/compiler.js';
import {validateSpearSourcePlan} from '../animation/view-source-spear.js';
import {validateSourceGripWorld} from './source-grip-world.js';
import {assertOriginalAuditContext} from './source-audit-context.js';

type Binding=CinematicPlan['propBindings'][number];
const fail=(shot:Shot,message:string):never=>{throw new Error(`${shot.id}: needs-source-prop-binding: original spear model ${message}`);};
const same=(a:number,b:number)=>Math.abs(a-b)<=Number.EPSILON*4*Math.max(1,Math.abs(a),Math.abs(b));

/** Structural descriptor only. Full run/cue/world/physical checks follow in
 * validateSourceSpearBindings; this does not grant a binding exemption. */
export function sourceSpearBinding(shot:Shot,binding:Binding){
  const owner=boundProp(shot,binding),source=owner.performance.sourceSpear;
  const track=source?.spears.find(s=>s.propId===binding.propId);
  if(!track)return undefined; // A disjoint generic companion keeps its own contract.
  if(binding.ownerId!==owner.id||!owner.character)return fail(shot,'requires its explicit visible story person');
  const metadata=shot.cinematic?.sourceSpearBindings?.filter(b=>b.ownerId===owner.id&&b.propId===binding.propId)??[];
  if(metadata.length!==1)return fail(shot,'needs exactly one explicit actor/prop/entity registration');
  const declared=SourceSpearBindingSchema.parse(metadata[0]);
  if(declared.ownerId!==source!.ownerId||declared.sourceId!==source!.id||declared.trackId!==track.id||declared.partId!==binding.partId||hash(declared.sourceRefs)!==hash(binding.sourceRefs))
    return fail(shot,'registration differs from the actual actor/source/track/entity/evidence');
  const part=shot.visualization?.parts.find(p=>p.id===binding.partId),model=shot.cinematic?.models.find(m=>m.partId===binding.partId);
  if(!part||!model||part.kind!=='object'||model.variant!=='conceptual')return fail(shot,'requires one sourced object descriptor without a substituted schematic variant');
  if(shot.cinematic?.sourceOwnership?.some(s=>s.partId===part.id)||shot.cinematic?.artDirection?.models.some(m=>m.partId===part.id))
    return fail(shot,'cannot substitute canonical ownership or another authored glyph/foreground for the physical shaft');
  if(part.states?.length)return fail(shot,'physical shaft thermal artwork is not registered');
  const prop=source!.props.find(p=>p.id===track.propId);
  if(!prop)return fail(shot,'track lost its declared physical shaft');
  const p=owner.performance,expected={x:prop.origin.x/p.stage.width,y:prop.origin.y/p.stage.height,width:prop.length*p.scale/p.stage.width,height:14*p.scale/p.stage.height};
  if(!Object.entries(expected).every(([key,value])=>same(part[key as keyof typeof expected],value)))
    return fail(shot,`origin/logical shaft dimensions differ from the physical source; expected ${JSON.stringify(expected)}`);
  if(!binding.sourceRefs.length||binding.sourceRefs.some(r=>!part.sourceRefs.some(ref=>hash(ref)===hash(r)))||hash(model.sourceRefs)!==hash(part.sourceRefs))
    return fail(shot,'entity/model/binding evidence differs');
  return {owner,source:source!,track,prop,declared,part,model};
}

/** Complete visible actor histories, not just this camera's incoming pose.
 * Raw physical geometry is queried without any narration/audio evaluation. */
export function validateSourceSpearBindings(shot:Shot,board:Storyboard|undefined,narration:Narration|undefined):void{
  const c=shot.cinematic;if(!c)return;
  const owners=[...(c.actorScene?.primary&&c.performance.sourceSpear?[{id:c.actorScene.primary.id,performance:c.performance}]:[]),
    ...(c.actorScene?.supporting.filter(a=>a.performance.sourceSpear).map(a=>({id:a.character.id,performance:a.performance}))??[])];
  if(!owners.length){if(c.performance.sourceSpear||c.sourceSpearBindings?.length)return fail(shot,'has an invisible source owner or dangling registration');return;}
  if(!board||!narration)return fail(shot,'requires complete storyboard and original narration');
  assertOriginalAuditContext(board,narration,[shot]);
  const aliases=new Set<string>(),parts=new Set<string>(),registrations=new Set<string>();
  for(const actual of owners){
    const source=actual.performance.sourceSpear!;
    validateSpearSourcePlan(actual.performance);
    const currentClock=actorViewActingClock(board,shot,actual.id);
    if(!currentClock?.spearMotion)return fail(shot,'lost its complete owned original actor/body/tool clock');
    const slices=board.shots.filter(s=>s.startMs<source.endMs&&s.endMs>source.startMs);
    let end=source.startMs;
    for(const slice of slices){if(slice.startMs!==end||slice.endMs>source.endMs)return fail(slice,'has truncated, duplicated or missing camera coverage');end=slice.endMs;}
    if(end!==source.endMs)return fail(shot,'camera coverage is incomplete');
    for(const prop of source.props){
      const bindings=c.propBindings.filter(b=>b.ownerId===actual.id&&b.propId===prop.id);
      if(bindings.length!==1)return fail(shot,'needs exactly one real actor/prop/model binding');
      const canonical=sourceSpearBinding(shot,bindings[0]!);if(!canonical)return fail(shot,'registration names a different source kind');
      const alias=propAliasIdentity(actual.id,prop.id);
      if(aliases.has(alias)||parts.has(canonical.part.id)||registrations.has(canonical.declared.id))return fail(shot,'registration, entity or physical alias is duplicated');
      aliases.add(alias);parts.add(canonical.part.id);registrations.add(canonical.declared.id);
      const identity=hash({binding:bindings[0],declared:canonical.declared,part:canonical.part,model:canonical.model});
      for(const slice of slices){
        assertPropAliasCoverage(slice);
        const allMetadata=slice.cinematic?.sourceSpearBindings??[],seenMetadata=new Set<string>();
        for(const declared of allMetadata){
          if(seenMetadata.has(declared.id))return fail(slice,'duplicates an original tool registration');seenMetadata.add(declared.id);
          const matches=slice.cinematic!.propBindings.filter(b=>b.ownerId===declared.ownerId&&b.propId===declared.propId&&b.partId===declared.partId);
          if(matches.length!==1||!sourceSpearBinding(slice,matches[0]!))return fail(slice,'contains a dangling or unsourced original tool registration');
        }
        const nextBindings=slice.cinematic?.propBindings.filter(b=>b.ownerId===actual.id&&b.propId===prop.id)??[];
        if(nextBindings.length!==1)return fail(slice,'lost its explicit original person/entity binding at a cut');
        const next=sourceSpearBinding(slice,nextBindings[0]!);if(!next)return fail(slice,'changed to a local/generic attachment at a cut');
        if(hash({binding:nextBindings[0],declared:next.declared,part:next.part,model:next.model})!==identity||hash(next.source)!==hash(source))
          return fail(slice,'actor/model/artwork/size/origin/source/phase identity changed at a camera cut');
        if(hash(next.owner.performance.stage)!==hash(slice.cinematic!.performance.stage)||next.owner.performance.durationMs!==slice.endMs-slice.startMs)
          return fail(slice,'actor and entity have different world stages or shot clocks');
        for(const ref of next.declared.sourceRefs)if(ref.kind==='narration'&&!narration.segments.some(s=>s.id===ref.segmentId&&s.text.normalize('NFC').includes(ref.quote.normalize('NFC'))))
          return fail(slice,'evidence quote is absent from the original narration');
        const profile=actorProfile(next.owner.character!),clock=actorViewActingClock(board,slice,actual.id);
        if(!clock?.spearMotion)return fail(slice,'has no complete physical original clock');
        validatePerformance(next.owner.performance,profile);
        validateSourceGripWorld(slice,next.part,source.startMs,source.endMs,{startMs:source.startMs,endMs:source.endMs});
        if(slice.visualization?.events.some(e=>e.targetId===next.part.id&&e.type!=='highlight')||slice.cinematic?.sourceWorld?.events.some(e=>e.targetId===next.part.id&&e.type!=='highlight'))
          return fail(slice,'has an unregistered second whole-tool/effect geometry clock');
        // Entry/exit are real source frames. Neither declared model origin nor
        // a destination can substitute for the shaft's actual sampled center.
        for(const at of [0,next.owner.performance.durationMs]){
          const state=samplePhysicalPerformance(next.owner.performance,profile,at,clock).props[prop.id];
          if(!state?.attached||state.angle===undefined||!state.tip)return fail(slice,'shaft has no attached center/angle/tip at its actual camera boundary');
          if(slice.startMs===source.startMs&&at===0&&Math.hypot(state.point.x-prop.origin.x,state.point.y-prop.origin.y)>1e-4)
            return fail(slice,'entry shaft center differs from its actual source origin');
        }
      }
    }
  }
  if(c.sourceSpearBindings?.length!==registrations.size)return fail(shot,'contains missing or dangling tool registrations');
}

export const sourceSpearBindingDescription={version:SOURCE_SPEAR_BINDING_VERSION,
  field:'cinematic.sourceSpearBindings',glyph:'exact existing forest-spear-grips-4 physical wood/stone/ties; one actor-owned glyph, same emitted compiler transform; no scaled conceptual replacement',
  identity:'complete actor/body/tool and entity/model/evidence/origin/logical shaft dimensions repeated through every camera/lead-support swap',
  pending:['original action/tip-contact/cue/world-reaction integration','native tool pose/art/motion and actual SVG/GSAP/runtime/film acceptance','integrated source production acceptance'],
  productionBinding:'needs-source-prop-binding',approved:false,productionReady:false,motionVerified:false,productionApproval:false};
