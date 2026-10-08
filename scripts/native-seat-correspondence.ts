/** Static artwork authoring only: read alpha and write geometry JSON.
 * Does not call pose, motion, compiler, SVG renderer, tests or media pipeline. */
import {readFile,writeFile} from 'node:fs/promises';
import {hash} from '../packages/core/utils.js';
import {bodyViewRegistrations,REGISTERED_BODY_VIEWS} from '../packages/animation/body-view-registration.js';
import {nativeClothBindings} from '../packages/animation/body-view-cloth-binding.js';
import {contour,resample,linearPath,inside,edgeDistance,commonTriangles,compatibleMesh,type P} from './cloth-contour-geometry.js';
import lila from '../library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.json' with {type:'json'};
import karo from '../library/topics/prehistoric-life/native-seat-v1/karo-seated-folds-v1.json' with {type:'json'};

// Clockwise semantic order: waist left/right, outer right hem, inner right
// hem, central notch, inner left hem, outer left hem. Atlas UVs are independently
// authored for each direction. These landmarks are provisional, not acceptance.
const anchors={
  lila:{
    'three-quarter-right':{rest:[[523,782],[720,782],[751,980],[662,1005],[628,902],[571,1005],[480,988]],seat:[[230,150],[483,150],[923,594],[708,642],[626,498],[399,578],[166,547]]},
    'three-quarter-left':{rest:[[434,826],[631,826],[679,1067],[579,1096],[542,979],[464,1109],[396,1090]],seat:[[1650,150],[1960,150],[1934,549],[1659,582],[1550,491],[1480,646],[1280,597]]}},
  karo:{
    'three-quarter-right':{rest:[[345,1023],[608,1023],[630,1250],[538,1279],[514,1120],[443,1280],[326,1235]],seat:[[190,300],[465,300],[812,478],[721,563],[702,541],[616,699],[144,572]]},
    'three-quarter-left':{rest:[[371,1052],[630,1052],[649,1267],[564,1308],[534,1138],[437,1320],[333,1278]],seat:[[1350,300],[1630,300],[1656,572],[1166,699],[1103,541],[1081,563],[990,477]]}},
} as const;
const points=(values:readonly (readonly [number,number])[])=>values.map(([x,y])=>({x,y}));
const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const minimumArea=(from:P[],to:P[])=>{
  const value=(t:number)=>{const p=from.map((a,i)=>({x:a.x+(to[i]!.x-a.x)*t,y:a.y+(to[i]!.y-a.y)*t}));return cross(p[0]!,p[1]!,p[2]!);};
  const start=value(0),end=value(1),mid=value(.5),quadratic=2*(end+start-2*mid),linear=end-start-quadratic,at=quadratic>0?-linear/(2*quadratic):-1;
  return Math.min(start,end,...(at>0&&at<1?[value(at)]:[]))/2;
};
const actors:Record<string,unknown>={};
for(const actor of ['lila','karo'] as const){
  const material=actor==='lila'?lila:karo,views:Record<string,unknown>={};
  if(hash(await readFile(material.file))!==material.sha256)throw new Error('Native seat atlas differs: '+actor);
  for(const view of REGISTERED_BODY_VIEWS){
    const source=bodyViewRegistrations[actor][view],binding=nativeClothBindings[actor][view],tile=material.tiles.find(t=>t.view===view)!;
    if(hash(await readFile(source.file))!==source.sha256)throw new Error('Native standing image differs: '+actor+'/'+view);
    const polygon=linearPath(source.clothing),region={x:binding.left-15,y:binding.waist,width:binding.right-binding.left+30,height:binding.bottom-binding.waist+15};
    const seatWaist=actor==='lila'?150:300;
    const restRing=await contour(source.file,region,p=>inside(p,polygon)||edgeDistance(p,polygon)<=source.inkPad),seatRing=await contour(material.file,{...tile.region,y:seatWaist,height:tile.region.height-seatWaist});
    const waistEnds=(ring:P[])=>{const y=Math.min(...ring.map(p=>p.y)),row=ring.filter(p=>p.y===y);return [{x:Math.min(...row.map(p=>p.x)),y},{x:Math.max(...row.map(p=>p.x)),y}] as const;};
    const a=points(anchors[actor][view].rest),b=points(anchors[actor][view].seat);
    [a[0],a[1]]=waistEnds(restRing);[b[0],b[1]]=waistEnds(seatRing);
    const rest=resample(restRing,a,actor+'/'+view+'/rest'),seat=resample(seatRing,b,actor+'/'+view+'/seat');
    const restOutline=resample(restRing,a,actor+'/'+view+'/rest-outline',[8,8,6,6,6,8,8]),seatOutline=resample(seatRing,b,actor+'/'+view+'/seat-outline',[8,8,6,6,6,8,8]);
    // The original belt and torso remain native. Fit this candidate fold atlas
    // below the measured waist. Do not infer anatomical scale from the bitmap.
    const waistLeft=rest[0]!,waistRight=rest[2]!,seatLeft=seat[0]!,seatRight=seat[2]!,scale=(actor==='lila'?.105:.1)/source.bodyScale,waistY=binding.waist;
    if(!Number.isFinite(scale)||scale<=0)throw new Error('Native seat waist scale invalid: '+actor+'/'+view);
    const target=(p:P)=>{
      const row=Math.max(0,Math.min(1,(p.y-seatWaist)/400)),pin=1-row*row*(3-2*row),fraction=(p.x-seatLeft.x)/(seatRight.x-seatLeft.x);
      const x=source.pelvis.x+(p.x-(seatLeft.x+seatRight.x)/2)*scale,waistX=waistLeft.x+(waistRight.x-waistLeft.x)*fraction;
      return {x:x+(waistX-x)*pin,y:waistY+(p.y-seatWaist)*scale};
    };
    const seatTarget=seat.map(target),seatOutlineTarget=seatOutline.map(target);
    // Only the waist edge is pinned/straightened in SVG geometry. Preserve all
    // atlas pixels and independently measured UVs, including both Karo cuffs.
    for(let i=0;i<=2;i++)seatTarget[i]={x:rest[i]!.x,y:waistY};
    for(let i=0;i<=8;i++)seatOutlineTarget[i]={x:restOutline[i]!.x,y:waistY};
    // Common triangulation is chosen using destination geometry rather than
    // atlas scale/shape. A fallback subdivision preserves separate UV domains.
    let pieces:Array<{rest:P[];seat:P[];target:P[]}>;
    try{pieces=commonTriangles(restOutline,seatOutlineTarget,seatOutline).map(ids=>({rest:ids.map(i=>restOutline[i]!),seat:ids.map(i=>seatOutline[i]!),target:ids.map(i=>seatOutlineTarget[i]!)}));}
    catch{
      // A compatible triangulation is built in each original UV domain. Map
      // its seat UVs with the same affine placement; pinned top intersections
      // use corresponding rest x/y and remain on the waist row.
      pieces=compatibleMesh(restOutline,seatOutlineTarget,seatOutline).map(piece=>({rest:piece.rest,seat:piece.texture,target:piece.seat}));
    }
    const min=Math.min(...pieces.map(piece=>minimumArea(piece.rest,piece.target)));
    const invalid=pieces.find(piece=>cross(piece.rest[0]!,piece.rest[1]!,piece.rest[2]!)<=0||cross(piece.seat[0]!,piece.seat[1]!,piece.seat[2]!)<=0);
    if(invalid)throw new Error('Native garment UV orientation invalid: '+actor+'/'+view+' '+JSON.stringify(invalid));
    if(min<=1e-7)throw new Error('Native garment correspondence inverts: '+actor+'/'+view+' minimum='+min);
    views[view]={standing:{file:source.file,sha256:source.sha256,width:source.width,height:source.height,pelvis:source.pelvis,bodyScale:source.bodyScale,waist:waistY},
      tileId:tile.id,region:tile.region,seatWaist,waist:{left:waistLeft,right:waistRight},uv:{rest,seat},outline:{rest:restOutline,seat:seatOutline,target:seatOutlineTarget},pieces,minimumTriangleArea:min,seatScale:scale};
    process.stdout.write(actor+'/'+view+' pieces='+pieces.length+' minimumArea='+min.toFixed(6)+'\n');
  }
  actors[actor]={material:{file:material.file,sha256:material.sha256,width:material.width,height:material.height},primary:material.references[0],views};
}
await writeFile('library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json',JSON.stringify({version:'native-seat-correspondence-1',status:'candidate-geometry',approved:false,productionReady:false,motionVerified:false,
  method:'Static immutable PNG alpha contours and independently authored semantic waist/cuff/notch UVs; common positive-area triangles; pinned waist with one opaque contour. No runtime/pose/media evaluation.',actors},null,2)+'\n');
