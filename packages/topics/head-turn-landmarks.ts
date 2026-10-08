import {hash} from '../core/utils.js';
import {HEAD_TURN_DRAFT_VERSION,HeadTurnDraftSchema,HeadTurnCheckRequestSchema,type HeadTurnDraft,type HeadTurnMaterial} from './head-turn-schemas.js';

export function headTurnSourceBinding(material:HeadTurnMaterial){return {actor:material.actor,file:material.file,sha256:material.sha256,materialFingerprint:hash(material),width:material.width,height:material.height};}
export function checkBoundHeadTurnDraft(value:unknown,material:HeadTurnMaterial){
  const request=HeadTurnCheckRequestSchema.parse(value);
  if(hash(request.source)!==hash(headTurnSourceBinding(material)))throw new Error('needs-head-turn-registration: displayed source is stale or belongs to another image/actor');
  return checkHeadTurnDraft(request.draft,material);
}

export function headTurnDraft(material:HeadTurnMaterial):HeadTurnDraft{
  return HeadTurnDraftSchema.parse({version:HEAD_TURN_DRAFT_VERSION,actor:material.actor,file:material.file,sha256:material.sha256,materialFingerprint:hash(material),
    width:material.width,height:material.height,coordinates:'absolute-source-pixels',cells:material.cells.map(c=>({index:c.index,review:'unreviewed',notes:''})),
    approved:false,registered:false,productionReady:false,motionVerified:false});
}
/** Draft checking cannot authorize artwork, register a runtime rig or change
 * the topic production gate. Findings retain exact cell/source ownership. */
export function checkHeadTurnDraft(value:unknown,material:HeadTurnMaterial){
  const draft=HeadTurnDraftSchema.parse(value);
  if(draft.actor!==material.actor||draft.file!==material.file||draft.sha256!==material.sha256||draft.materialFingerprint!==hash(material)||draft.width!==material.width||draft.height!==material.height)throw new Error('needs-head-turn-registration: draft is stale or belongs to another image/actor');
  const pending:{cell:number;reason:string}[]=[];
  for(const [i,cell] of draft.cells.entries()){
    const miss=(reason:string)=>pending.push({cell:cell.index,reason});
    if(cell.review!=='candidate')miss('identity/perspective review not complete');
    if(material.cells[i]!.edgePixels)miss('source ink touches cell edge; repair the source');
    for(const key of ['yawDeg','neck','neckTop','chin','nose','mouth','faceContour','ponytailSide'] as const)if(cell[key]===undefined)miss('missing measured '+key);
    for(const slot of ['screen-left','screen-right'] as const)if(!cell.eyes?.[slot])miss('missing eye position or explicit occlusion: '+slot);
    const previous=draft.cells[i-1];
    if(previous?.yawDeg!==undefined&&cell.yawDeg!==undefined&&(previous.yawDeg<=cell.yawDeg||previous.yawDeg-cell.yawDeg>9))miss('actual yaw must decrease with a gap no greater than9 degrees; redraw repeated/jumping views');
    const b=material.cells[i]!.visibleBounds;
    for(const key of ['neck','neckTop','chin','nose','mouth'] as const){const p=cell[key];if(p&&(p.x<b.x||p.y<b.y||p.x>=b.x+b.width||p.y>=b.y+b.height))miss(key+' is outside measured source ink bounds');}
    if(cell.faceContour){
      const polygon=cell.faceContour,contains=(p:{x:number;y:number})=>{
        let inside=false;
        for(let a=0,b=polygon.length-1;a<polygon.length;b=a++){const u=polygon[a]!,v=polygon[b]!;
          if((u.y>p.y)!==(v.y>p.y)&&p.x<(v.x-u.x)*(p.y-u.y)/(v.y-u.y)+u.x)inside=!inside;
        }return inside;
      };
      for(const [slot,eye] of Object.entries(cell.eyes??{}))if(eye.visible&&!contains(eye.center))miss(slot+' eye lies outside the manually drawn face contour');
      for(const key of ['nose','mouth'] as const)if(cell[key]&&!contains(cell[key]!))miss(key+' lies outside the manually drawn face contour');
    }
  }
  return {draft,pending,landmarksComplete:pending.length===0,registered:false,approved:false,productionReady:false,motionVerified:false,
    blockers:['artwork continuity/identity and source masks are not approved','native body/head attachment, source clock, speech/eye/expression per-cell layers and scene integration are not registered','motion/normal-speed video review delegated to the user model']};
}
