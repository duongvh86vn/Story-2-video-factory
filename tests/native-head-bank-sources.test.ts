// DECLARED ONLY; NOT RUN. Synthetic metadata is not registered/accepted art.
// No image bytes, renderer, compiler, sampler, resources or media are invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  NativeHeadSourceFileSchema,NativeHeadBankDefinitionSchema,NativeHeadBankSchema,
  nativeHeadBank,nativeHeadSources,nativeHeadSourceForCell,nativeHeadPixelScale,
  nativeHeadBankDescription,type NativeHeadBank,type NativeHeadSource,
} from '../packages/animation/native-head-bank.js';
import {bodyViewRegistrations} from '../packages/animation/body-view-registration.js';

type Definition=Parameters<typeof nativeHeadBank>[0];
const root='library/topics/prehistoric-life/';
const heldHashes=[
  'fe9181633b8bdbb28c334d62a9c81d33c35cf9624ae35849c11850445b1d0b87',
  '1893e4c02fa8f3cd089436536d33e85d6ad3656643b7674f844f3a8e707220e0',
  '965d9fb0f4e800144612bb4e3cd6ec6b482dad483c894980aea6fc61bbb4aaaf',
  '035b9d42e3825b311b25b155ddfd646416f806b2ab9f28086aa706eb16295a4f',
  '9946191d25bdb10c9729ba77e7112d66f4171a1dcec6b6ab55fdf05a794fdb21',
];
function cell(id:string,x=0,scale=1,sourceId?:string):Definition['cells'][number]{
  return {id,...(sourceId===undefined?{}:{sourceId}),
    crop:{x,y:0,width:200*scale,height:200*scale},
    neck:{x:x+100*scale,y:180*scale},neckTop:{x:x+100*scale,y:150*scale},
    chin:{x:x+105*scale,y:145*scale},eyeTarget:{x:x+110*scale,y:100*scale},
    skull:{x:x+40*scale,y:30*scale,width:120*scale,height:110*scale},yawDeg:id==='cell-0'?10:5,
    seam:[{x:x+90*scale,y:150*scale},{x:x+110*scale,y:150*scale},{x:x+100*scale,y:180*scale}],restMood:'happy'};
}
/** All fields are explicitly in the original version 1 schema's key order.
 * Native crypto hashes these legacy JSON bytes independently of the new schema. */
function legacyDefinition():Definition{
  return {version:'native-head-bank-1',id:'synthetic-head-bank',actor:'lila',
    source:{file:root+'head-turn-studies/lila-head-turn-v4.png',sha256:'b'.repeat(64),width:400,height:200},
    primary:{file:'docs/topics/assets/reference-lila-full.png',sha256:'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce'},
    bodyViews:[{view:'three-quarter-right',sourceHash:bodyViewRegistrations.lila['three-quarter-right'].sha256}],unitScale:.3,
    cells:[cell('cell-0'),cell('cell-1',200)],routes:[['cell-0','cell-1'],['cell-1','cell-0']],
    capabilities:{speech:false,directionalEyes:false,expressions:false,secondary:false},
    status:'engineering-source-registration',approved:false,productionReady:false,motionVerified:false};
}
function singleSourceV2():Definition{
  const old=legacyDefinition();
  return {...old,version:'native-head-bank-2',source:{...old.source,pixelScale:1},cells:old.cells.map(c=>({...c,sourceId:'primary'}))};
}
function multiDefinition():Definition{
  const old=legacyDefinition();
  return {...old,version:'native-head-bank-2',
    source:{file:root+'head-cells/lila-head-synthetic-front-v1.png',sha256:'b'.repeat(64),width:200,height:200,pixelScale:1},
    additionalSources:[{id:'side',file:root+'head-cells/lila-head-synthetic-side-v1.png',sha256:'c'.repeat(64),width:400,height:400,pixelScale:.5}],
    cells:[cell('cell-0',0,1,'primary'),cell('cell-1',0,2,'side')]};
}
function reverseKeys(value:unknown):unknown{
  if(Array.isArray(value))return value.map(reverseKeys);
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)]));
  return value;
}
function rejects(value:unknown,reason?:RegExp):void{
  const parsed=NativeHeadBankDefinitionSchema.safeParse(value);
  assert.equal(parsed.success,false);
  if(!parsed.success&&reason)assert.match(parsed.error.message,reason);
}

test('version 1 preserves exact legacy JSON bytes, independent SHA-256 and absent new fields',()=>{
  const legacy=legacyDefinition(),legacyJson=JSON.stringify(legacy);
  const expected=createHash('sha256').update(legacyJson).digest('hex');
  const parsed=NativeHeadBankDefinitionSchema.parse(reverseKeys(legacy));
  assert.equal(JSON.stringify(parsed),legacyJson);
  const bank=nativeHeadBank(parsed),{fingerprint,...definition}=bank;
  assert.equal(fingerprint,expected);
  assert.equal(JSON.stringify(definition),legacyJson);
  assert.deepEqual(NativeHeadBankSchema.parse(reverseKeys(bank)),bank);
  assert.equal(Object.hasOwn(bank,'additionalSources'),false);
  assert.equal(Object.hasOwn(bank.source,'pixelScale'),false);
  for(const c of bank.cells)assert.equal(Object.hasOwn(c,'sourceId'),false);
  assert.deepEqual(nativeHeadSources(bank),[{id:'primary',...bank.source}]);
  assert.deepEqual(nativeHeadSourceForCell(bank,bank.cells[1]!),{id:'primary',...bank.source});
  assert.equal(nativeHeadPixelScale(bank,bank.cells[1]!),bank.unitScale);
});

test('version 1 forbids new fields even explicitly undefined and still requires its atlas path',()=>{
  const b=legacyDefinition();
  for(const pixelScale of [1,undefined])rejects({...b,source:{...b.source,pixelScale}},/Version 1.*forbid/);
  for(const additionalSources of [[],undefined])rejects({...b,additionalSources},/Version 1.*forbid/);
  for(const sourceId of ['primary',undefined])rejects({...b,cells:b.cells.map(c=>({...c,sourceId}))},/Version 1.*forbid/);
  rejects({...b,source:{...b.source,file:root+'head-cells/lila-head-front-v1.png'}},/original head-turn atlas/);
});

test('source filename whitelist is exact and bounds the cell slug to forty lowercase characters',()=>{
  for(const file of [
    root+'head-turn-studies/lila-head-turn-v4.png',root+'head-turn-studies/karo-head-turn-v3.png',
    root+'head-cells/lila-head-front-v1.png',root+'head-cells/karo-head-left-30-v12.png',
    root+'head-cells/lila-head-'+('a'.repeat(40))+'-v1.png',
  ])assert.equal(NativeHeadSourceFileSchema.safeParse(file).success,true);
  for(const file of [
    root+'head-cells/lila-head--v1.png',root+'head-cells/lila-head-'+('a'.repeat(41))+'-v1.png',
    root+'head-cells/lila-head-Front-v1.png',root+'head-cells/lila-head-front_left-v1.png',
    root+'head-cells/lila-head-front-v0.png',root+'head-cells/lila-head-front-v01.png',
    root+'head-cells/lila-head-front-v1.svg',root+'head-cells/lila-head-front-v1.png\n',
    root+'head-cells/other-head-front-v1.png',root+'head-cells/../lila-head-front-v1.png',
    root+'head-cells/lila-head-front/side-v1.png',root+'head-turn-studies/lila-head-turn-v04.png',
    'C:/'+root+'head-cells/lila-head-front-v1.png',(''+root+'head-cells/lila-head-front-v1.png').replaceAll('/','\\'),
  ])assert.equal(NativeHeadSourceFileSchema.safeParse(file).success,false,file);
});

test('version 2 binds overlapping local coordinates to distinct images and fixed source pixel density',()=>{
  const input=multiDefinition(),before=structuredClone(input),bank=nativeHeadBank(input);
  const sources=nativeHeadSources(bank);
  assert.deepEqual(sources,[{id:'primary',...bank.source},...bank.additionalSources!]);
  assert.equal(nativeHeadSourceForCell(bank,bank.cells[0]!).id,'primary');
  assert.deepEqual(nativeHeadSourceForCell(bank,bank.cells[1]!),bank.additionalSources![0]);
  assert.equal(nativeHeadPixelScale(bank,bank.cells[0]!),.3);
  assert.equal(nativeHeadPixelScale(bank,bank.cells[1]!),.15);
  assert.deepEqual(input,before);
  sources[1]!.file='detached-list';assert.notEqual(bank.additionalSources![0]!.file,'detached-list');
  assert.deepEqual(nativeHeadBank(NativeHeadBankDefinitionSchema.parse(reverseKeys(input))),bank);
  assert.doesNotThrow(()=>nativeHeadBank(singleSourceV2()));
});

test('version 2 requires every source scale and cell binding; helpers never fall back for unknown IDs',()=>{
  const b=multiDefinition(),bank=nativeHeadBank(b);
  rejects({...b,source:{...b.source,pixelScale:undefined}},/explicit pixelScale/);
  rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,pixelScale:undefined}))},/explicit pixelScale/);
  rejects({...b,cells:b.cells.map(c=>({...c,sourceId:undefined}))},/explicit sourceId/);
  rejects({...b,cells:b.cells.map(c=>({...c,sourceId:'unknown'}))},/unknown source/);
  rejects({...b,additionalSources:[]},/unknown source/);
  const unknown={...bank.cells[0]!,sourceId:'unknown'};
  assert.throws(()=>nativeHeadSourceForCell(bank,unknown),/unknown source/);
  assert.throws(()=>nativeHeadPixelScale(bank,unknown),/unknown source/);
  assert.throws(()=>nativeHeadSourceForCell(bank,{...bank.cells[0]!,sourceId:undefined}),/missing.*source ID/);
  assert.throws(()=>nativeHeadPixelScale(bank,{...bank.cells[0]!,sourceId:undefined}),/missing.*source ID/);
  const legacy=nativeHeadBank(legacyDefinition());
  assert.throws(()=>nativeHeadSourceForCell(legacy,{...legacy.cells[0]!,sourceId:'unknown'}),/unknown source/);
  assert.throws(()=>nativeHeadSources({...bank,source:undefined as unknown as NativeHeadSource}),/missing.*primary source/);
});

test('duplicate, reserved, unused and aliased sources cannot enter a version 2 bank',()=>{
  const b=multiDefinition(),extra=b.additionalSources![0]!;
  rejects({...b,additionalSources:[{...extra,id:'primary'}]},/reserved head source/);
  rejects({...b,additionalSources:[extra,{...extra,file:root+'head-cells/lila-head-other-v1.png',sha256:'d'.repeat(64)}]},/head source identity/);
  rejects({...b,additionalSources:[{...extra,file:b.source.file}]},/Duplicate head source filename/);
  rejects({...b,additionalSources:[{...extra,sha256:b.source.sha256}]},/SHA aliases/);
  rejects({...b,additionalSources:[extra,{...extra,id:'unused',file:root+'head-cells/lila-head-unused-v1.png',sha256:'d'.repeat(64)}]},/unused source/);
  rejects({...b,cells:b.cells.map(c=>({...c,sourceId:'side'}))},/unused source/);
  rejects({...b,additionalSources:[{...extra,id:'constructor'}]});
});

test('every source belongs to the exact actor and every held SHA stays blocked under renamed cell paths',()=>{
  const b=multiDefinition(),extra=b.additionalSources![0]!;
  rejects({...b,source:{...b.source,file:b.source.file.replace('lila','karo')}},/same actor/);
  rejects({...b,additionalSources:[{...extra,file:extra.file.replace('lila','karo')}]},/same actor/);
  rejects({...b,primary:{...b.primary,file:'docs/topics/assets/reference-karo-full.png'}},/same actor/);
  rejects({...b,primary:{...b.primary,sha256:'a'.repeat(64)}},/primary source changed/);
  for(const sha256 of heldHashes){
    rejects({...b,source:{...b.source,sha256}},/Held head art/);
    rejects({...b,additionalSources:[{...extra,sha256}]},/Held head art/);
  }
});

test('held atlas paths are blocked in primary and additional images for both actors',()=>{
  for(const actor of ['lila','karo'] as const){
    const b=multiDefinition();b.actor=actor;
    b.source.file=b.source.file.replace('lila',actor);
    b.additionalSources=b.additionalSources!.map(s=>({...s,file:s.file.replace('lila',actor)}));
    b.primary={file:`docs/topics/assets/reference-${actor}-full.png`,sha256:actor==='lila'?'85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce':'7106afd9697f5b4be341c46a357fe45981f29bb4b0e58dd136528e6c1e600aa2'};
    b.bodyViews=[{view:'three-quarter-right',sourceHash:bodyViewRegistrations[actor]['three-quarter-right'].sha256}];
    assert.doesNotThrow(()=>nativeHeadBank(b));
    for(const version of actor==='lila'?[1,2,3]:[1,2]){
      const file=root+`head-turn-studies/${actor}-head-turn-v${version}.png`;
      rejects({...b,source:{...b.source,file}},/Held head art/);
      rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,file}))},/Held head art/);
    }
  }
});

test('source counts, dimensions, per-image pixels and forty-million aggregate pixels remain bounded',()=>{
  const b=multiDefinition();
  const maximum:Definition={...b,additionalSources:Array.from({length:23},(_,i)=>({id:'source-'+i,
    file:root+`head-cells/lila-head-synthetic-${i}-v1.png`,sha256:(i+1).toString(16).padStart(64,'0'),width:200,height:200,pixelScale:1})),
    cells:[cell('cell-0',0,1,'primary'),...Array.from({length:23},(_,i)=>cell('source-cell-'+i,0,1,'source-'+i))],routes:[['cell-0','source-cell-0']]};
  assert.equal(nativeHeadSources(nativeHeadBank(maximum)).length,24);
  const overflow=NativeHeadBankDefinitionSchema.safeParse({...maximum,
    additionalSources:[...maximum.additionalSources!,{id:'overflow',file:root+'head-cells/lila-head-overflow-v1.png',sha256:'e'.repeat(64),width:200,height:200,pixelScale:1}],
    cells:[...maximum.cells,cell('overflow-cell',0,1,'overflow')]});
  assert.equal(overflow.success,false);
  if(!overflow.success){
    assert.ok(overflow.error.issues.some(issue=>issue.code==='too_big'&&issue.path.join('.')==='additionalSources'&&issue.maximum===23));
    assert.ok(!overflow.error.issues.some(issue=>/unused source|unknown source/.test(issue.message)));
  }
  for(const dimensions of [{width:8193},{height:8193},{width:0},{height:1.5},{width:5000,height:4001}]){
    rejects({...b,source:{...b.source,...dimensions}});
    rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,...dimensions}))});
  }
  const fortyMillion:Definition={...b,source:{...b.source,width:5000,height:4000},additionalSources:b.additionalSources!.map(s=>({...s,width:5000,height:4000}))};
  assert.doesNotThrow(()=>nativeHeadBank(fortyMillion));
  rejects({...fortyMillion,
    additionalSources:[...fortyMillion.additionalSources!,{id:'overflow',file:root+'head-cells/lila-head-overflow-v1.png',sha256:'e'.repeat(64),width:200,height:200,pixelScale:1}],
    cells:[...fortyMillion.cells,cell('overflow-cell',0,1,'overflow')]},/aggregate pixel limit/);
});

test('pixel scale is finite and bounded while source and cell objects stay strict',()=>{
  const b=multiDefinition(),single=singleSourceV2();
  for(const pixelScale of [.05,2])assert.doesNotThrow(()=>nativeHeadBank({...single,source:{...single.source,pixelScale}}));
  for(const pixelScale of [.049,2.001,Number.NaN,Number.POSITIVE_INFINITY]){
    rejects({...b,source:{...b.source,pixelScale}});
    rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,pixelScale}))});
  }
  for(const sha256 of ['a'.repeat(63),'A'.repeat(64),'g'.repeat(64),'a'.repeat(64)+'\n'])
    rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,sha256}))});
  rejects({...b,source:{...b.source,id:'primary'}});
  rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,mirror:true}))});
  rejects({...b,cells:b.cells.map(c=>({...c,pixelScale:1}))});
  rejects({...b,cells:b.cells.map(c=>({...c,unitScale:1}))});
  rejects({...b,crossfadeMs:0});
  rejects({...b,version:'native-head-bank-3'});
});

test('crops, landmarks and skulls are local to their selected image; only same-image crops overlap',()=>{
  const b=multiDefinition();assert.doesNotThrow(()=>nativeHeadBank(b));
  rejects({...b,source:{...b.source,width:199}},/crop leaves source PNG/);
  rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,width:399}))},/crop leaves source PNG/);
  rejects({...b,cells:b.cells.map((c,i)=>i===0?{...c,neckTop:{x:200,y:150}}:c)},/landmark.*source crop/);
  rejects({...b,cells:b.cells.map((c,i)=>i===1?{...c,skull:{...c.skull,width:321}}:c)},/skull\/eye anchor/);
  rejects({...b,cells:b.cells.map((c,i)=>i===1?{...c,eyeTarget:{x:0,y:0}}:c)},/skull\/eye anchor/);
  rejects({...b,cells:[...b.cells,{...b.cells[0]!,id:'overlap'}]},/overlap in source image/);
  const single=singleSourceV2();
  rejects({...single,cells:[single.cells[0]!,{...single.cells[0]!,id:'cell-1',yawDeg:5}]},/overlap in source image/);
});

test('adjacent routes compare physical skull area after fixed source pixelScale squared',()=>{
  const b=multiDefinition();
  // Twice the pixel dimensions at half the density has the same physical area.
  assert.doesNotThrow(()=>nativeHeadBank(b));
  rejects({...b,additionalSources:b.additionalSources!.map(s=>({...s,pixelScale:1}))},/skull scale changes/);
  rejects({...b,cells:[b.cells[0]!,cell('cell-1',0,1,'side')]},/skull scale changes/);
  for(const width of [192,300])assert.doesNotThrow(()=>nativeHeadBank({...b,cells:b.cells.map((c,i)=>i===1?{...c,skull:{...c.skull,width}}:c)}));
  for(const width of [191,301])rejects({...b,cells:b.cells.map((c,i)=>i===1?{...c,skull:{...c.skull,width}}:c)},/skull scale changes/);
  for(const unitScale of [.05,2])assert.doesNotThrow(()=>nativeHeadBank({...b,unitScale}));
  rejects({...b,cells:b.cells.map((c,i)=>i===1?{...c,yawDeg:0}:c)},/small-angle/);
  rejects({...b,routes:[['cell-0','missing']]},/unknown source cell/);
  rejects({...b,routes:[['cell-0','cell-0']]},/repeats a cell/);
});

test('version 2 fingerprint binds every image, fixed scale, cell binding, geometry and route',()=>{
  const b=multiDefinition(),bank=nativeHeadBank(b);
  const variants:Definition[]=[
    {...b,source:{...b.source,file:root+'head-cells/lila-head-other-front-v1.png'}},
    {...b,source:{...b.source,sha256:'d'.repeat(64)}},
    {...b,source:{...b.source,width:201}},
    {...b,source:{...b.source,height:201}},
    {...b,source:{...b.source,pixelScale:1.05}},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,file:root+'head-cells/lila-head-other-side-v1.png'}))},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,sha256:'d'.repeat(64)}))},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,width:401}))},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,height:401}))},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,pixelScale:.51}))},
    {...b,additionalSources:b.additionalSources!.map(s=>({...s,id:'other-side'})),cells:b.cells.map(c=>({...c,sourceId:c.sourceId==='side'?'other-side':c.sourceId}))},
    {...b,cells:b.cells.map(c=>({...c,crop:{...c.crop,height:c.crop.height-1}}))},
    {...b,cells:b.cells.map(c=>({...c,neck:{...c.neck,y:c.neck.y+1}}))},
    {...b,cells:b.cells.map(c=>({...c,neckTop:{...c.neckTop,x:c.neckTop.x+1}}))},
    {...b,cells:b.cells.map(c=>({...c,chin:{...c.chin,x:c.chin.x+1}}))},
    {...b,cells:b.cells.map(c=>({...c,eyeTarget:{...c.eyeTarget,x:c.eyeTarget.x+1}}))},
    {...b,cells:b.cells.map(c=>({...c,seam:c.seam.map(p=>({...p,x:p.x+1}))}))},
    {...b,cells:b.cells.map(c=>({...c,skull:{...c.skull,width:c.skull.width+1}}))},
    {...b,cells:b.cells.map(c=>({...c,yawDeg:c.yawDeg+1}))},
    {...b,unitScale:.31},
    {...b,routes:[['cell-1','cell-0'],['cell-0','cell-1']]},
  ];
  for(const definition of variants){
    const changed=nativeHeadBank(definition);
    assert.notEqual(changed.fingerprint,bank.fingerprint);
    assert.throws(()=>NativeHeadBankSchema.parse({...definition,fingerprint:bank.fingerprint}),/fingerprint changed/);
  }
  // Isolate cell-to-image binding: the same geometry fits either distinct
  // image, and exchanging bindings preserves all other metadata and checks.
  const sameSize:Definition={...b,additionalSources:b.additionalSources!.map(s=>({...s,width:200,height:200,pixelScale:1})),
    cells:[cell('cell-0',0,1,'primary'),cell('cell-1',0,1,'side')]};
  const sameSizeBank=nativeHeadBank(sameSize);
  const swapped={...sameSize,cells:sameSize.cells.map(c=>({...c,sourceId:c.sourceId==='primary'?'side':'primary'}))};
  assert.notEqual(nativeHeadBank(swapped).fingerprint,sameSizeBank.fingerprint);
  assert.throws(()=>NativeHeadBankSchema.parse({...swapped,fingerprint:sameSizeBank.fingerprint}),/fingerprint changed/);
  assert.throws(()=>NativeHeadBankSchema.parse({...bank,additionalSources:bank.additionalSources!.map(s=>({...s,sha256:heldHashes[0]!}))}),/Held head art/);
});

test('invalid additional-source metadata fails atomically without returning or mutating a registration',()=>{
  const valid=nativeHeadBank(multiDefinition()),input=multiDefinition();
  input.additionalSources![0]!.width=399;
  input.additionalSources![0]!.pixelScale=undefined;
  const before=structuredClone(input);
  let result:NativeHeadBank|undefined;
  assert.throws(()=>{result=nativeHeadBank(input);},/explicit pixelScale|crop leaves source PNG/);
  assert.equal(result,undefined);
  assert.deepEqual(input,before);
  const parsed=NativeHeadBankDefinitionSchema.safeParse(input);
  assert.equal(parsed.success,false);
  if(!parsed.success){
    assert.ok(parsed.error.issues.some(issue=>/explicit pixelScale/.test(issue.message)));
    assert.ok(parsed.error.issues.some(issue=>/crop leaves source PNG/.test(issue.message)));
  }
  assert.equal(NativeHeadBankSchema.safeParse({...input,fingerprint:valid.fingerprint}).success,false);
  assert.equal(valid.additionalSources![0]!.width,400);
  assert.equal(valid.additionalSources![0]!.pixelScale,.5);
});

test('multi-source metadata grants no capability, selection, art approval or production acceptance',()=>{
  const b=multiDefinition(),bank=nativeHeadBank(b);
  assert.deepEqual(bank.capabilities,{speech:false,directionalEyes:false,expressions:false,secondary:false});
  for(const capability of ['speech','directionalEyes','expressions','secondary'])rejects({...b,capabilities:{...b.capabilities,[capability]:true}});
  for(const flag of ['approved','productionReady','motionVerified'])rejects({...b,[flag]:true});
  assert.equal(nativeHeadBankDescription.availableBanks.length,0);
  assert.equal(nativeHeadBankDescription.approved,false);
  assert.equal(nativeHeadBankDescription.productionReady,false);
  assert.equal(nativeHeadBankDescription.motionVerified,false);
  assert.deepEqual(nativeHeadBankDescription.sourceVersions,['native-head-bank-1','native-head-bank-2']);
});
