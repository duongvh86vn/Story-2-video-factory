import assert from 'node:assert/strict';
import test from 'node:test';
import { temporary } from './support.js';
import { ShotSchema } from '../packages/core/schemas.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { validateCinematicShot } from '../packages/director/index.js';
import { validateSceneFiles, secureSceneFiles } from '../packages/scenes/security.js';
import { creativeFixture } from './creative-fixture.js';
import { artworkSvg, customModelMotionOrigin } from '../packages/director/art-direction.js';
import { ArtDirectionSchema, rendersModelLabel } from '../packages/director/art-direction-schemas.js';
import { cinematicModel } from '../library/shots/cinematic-models.js';

test('authored geometry, palette and seekable layers survive the production scene contract',async t=>{
  const f=await creativeFixture(await temporary(t));
  const shot=ShotSchema.parse({...f.shot,cinematic:{...f.shot.cinematic,artDirection:f.artDirection}});
  assert.deepEqual(shot.cinematic!.artDirection,f.artDirection,'the schema must preserve authored design');
  const files=renderCinematic(shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config).files;
  const html=files.files.find(f=>f.path==='index.html')!.content,js=files.files.find(f=>f.path==='scene.js')!.content;
  assert.match(html,/#142D40/);assert.match(html,/data-art-layer="light"/);assert.match(html,/data-custom-model=/);
  assert.match(html,/ch1.s001.art.light.glow/,'artwork IDs and references must be namespaced');
  assert.doesNotMatch(html,/Bối cảnh và mô hình minh họa|Cùng tìm hiểu/,'authored design can omit the canned title card');
  assert.match(js,/art-layer-light.*duration:5/);
  assert.deepEqual(validateSceneFiles(secureSceneFiles(files),shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
});

test('accepted dotted artwork IDs have literal matching selectors',async t=>{
  const f=await creativeFixture(await temporary(t));f.artDirection.layers[0]!.id='light.glow';
  const shot=ShotSchema.parse({...f.shot,cinematic:{...f.shot.cinematic,artDirection:f.artDirection}});
  const js=renderCinematic(shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config).files.files.find(f=>f.path==='scene.js')!.content;
  assert.ok(js.includes('[id=\\\"art-layer-light.glow\\\"]'),'a dotted identifier must not become a CSS class selector');
});

test('SVG namespaces decoded attributes and reserves decoded factory classes',()=>{
  assert.throws(()=>artworkSvg('<g class="camera&#45;rig"/>','safe'),/reserved/i);
  const svg=artworkSvg('<defs><linearGradient ID="g"/></defs><circle ID="ground-shadow" fill="URL(#g)"/>','safe');
  assert.match(svg,/id="safe.ground-shadow"/);assert.match(svg,/url\(#safe.g\)/);
});

test('custom glyphs must contain the geometry consumed by their semantic motion events',async t=>{
  const f=await creativeFixture(await temporary(t)),part=f.shot.visualization!.parts.find(part=>part.kind==='piston')!;
  f.artDirection.models=[{partId:part.id,sourceRefs:part.sourceRefs,svg:'<rect width="20" height="20"/>'}];
  f.shot.visualization!.events.push({type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:0,endMs:1000,motion:'translate',contactRequired:false,sourceRefs:part.sourceRefs});
  f.shot.cinematic!.artDirection=f.artDirection;
  assert.throws(()=>validateCinematicShot(f.shot,f.profile,f.config),/motion.*geometry/i);
});

test('custom motion rejects empty, definition-only, zero-size and ancestor-hidden geometry',async t=>{
  const f=await creativeFixture(await temporary(t)),part=f.shot.visualization!.parts.find(part=>part.kind==='piston')!;
  f.shot.visualization!.events.push({type:'part-motion',targetId:part.id,narrationAnchor:'cue',startMs:0,endMs:1000,motion:'translate',contactRequired:false,sourceRefs:part.sourceRefs});
  const drawable='<g class="motion"><rect width="20" height="20"/></g>';
  for(const svg of ['<rect width="20" height="20"/><g class="motion"/>',`<defs>${drawable}</defs>`,`<mask>${drawable}</mask>`,`<clipPath>${drawable}</clipPath>`,
    `<g display="none">${drawable}</g>`,`<g visibility="hidden">${drawable}</g>`,`<g opacity="0">${drawable}</g>`,'<g class="motion"><rect width="0" height="20"/></g>']){
    f.shot.cinematic!.artDirection={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,svg}]};
    assert.throws(()=>validateCinematicShot(f.shot,f.profile,f.config),/rendered motion geometry/i,svg);
  }
  for(const svg of [drawable,'<g class="motion"><path d="M0 0L20 20" stroke="#142D40"/></g>','<g class="motion"><circle r="10"/></g>']){
    f.shot.cinematic!.artDirection={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,svg}]};
    assert.doesNotThrow(()=>validateCinematicShot(f.shot,f.profile,f.config),svg);
  }
});

test('creative freedom rejects executable SVG, foreign resources and changed source identities',async t=>{
  const f=await creativeFixture(await temporary(t));
  for(const svg of ['<script>alert(1)</script>','<image href="https://evil.example/a.png"/>','<circle onload="alert(1)"/>','<g data-composition-id="escape"/>','<defs><linearGradient id="x"/><linearGradient id="x"/></defs>']){
    const shot={...f.shot,cinematic:{...f.shot.cinematic!,artDirection:{...f.artDirection,layers:[{...f.artDirection.layers[0]!,svg}]}}};
    assert.throws(()=>validateCinematicShot(shot as typeof f.shot,f.profile,f.config),/art|SVG|source/i,svg);
  }
  const shot={...f.shot,cinematic:{...f.shot.cinematic!,artDirection:{...f.artDirection,models:[{...f.artDirection.models[0]!,sourceRefs:[{kind:'narration',segmentId:'cue',quote:'invented'}]}]}}};
  assert.throws(()=>validateCinematicShot(shot as typeof f.shot,f.profile,f.config),/source/i);
});

test('model label ownership reaches emitted HTML while preserving authored geometry and security',async t=>{
  const f=await creativeFixture(await temporary(t)),part=f.shot.visualization!.parts[0]!;
  let rendererLabels=0;
  for(const labelMode of [undefined,'renderer','artwork','none'] as const){
    const art={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,svg:'<g class="motion"><rect width="20" height="20"/></g><text>Artwork-owned caption</text>',...(labelMode?{labelMode}:{})}]};
    const shot=ShotSchema.parse({...f.shot,cinematic:{...f.shot.cinematic,artDirection:art}});
    const files=renderCinematic(shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config).files;
    const html=files.files.find(file=>file.path==='index.html')!.content;
    const count=(html.match(/class="model-label"/g)??[]).length;
    if(labelMode===undefined)rendererLabels=count;
    assert.equal(rendersModelLabel(shot,part.id),labelMode===undefined||labelMode==='renderer');
    assert.equal(count,rendererLabels-(labelMode==='artwork'||labelMode==='none'?1:0));
    assert.equal((html.match(/Artwork-owned caption/g)??[]).length,1,'ownership does not discard the authored SVG');
    assert.deepEqual(validateSceneFiles(secureSceneFiles(files),shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  }
  const unsafe={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,labelMode:'none' as const,svg:'<rect onclick="alert(1)" width="20" height="20"/>'}]};
  assert.throws(()=>validateCinematicShot({...f.shot,cinematic:{...f.shot.cinematic!,artDirection:unsafe}},f.profile,f.config),/executable|forbidden/i,'label ownership never relaxes SVG security');
});

test('emitted motion pivots stay local for default glyphs, full SVG viewBox and explicit motionOrigin',async t=>{
  const f=await creativeFixture(await temporary(t)),part=f.shot.visualization!.parts[0]!,index=0;
  const cases=[
    {svg:undefined,origin:{x:0,y:0}},
    {svg:'<g class="motion"><circle r="12"/></g>',origin:{x:0,y:0}},
    {svg:'<svg viewBox="-20 10 240 120"><g class="motion"><circle cx="100" cy="70" r="12"/></g></svg>',origin:{x:100,y:70}},
    {svg:'<svg viewBox="0 0 200 100"><g class="motion"><circle cx="25" cy="30" r="12"/></g></svg>',origin:{x:25,y:30},motionOrigin:{x:25,y:30}},
  ];
  for(const c of cases){
    const art={...f.artDirection,models:c.svg?[{partId:part.id,sourceRefs:part.sourceRefs,svg:c.svg,...(c.motionOrigin?{motionOrigin:c.motionOrigin}:{})}]:[]};
    const shot=ShotSchema.parse({...f.shot,cinematic:{...f.shot.cinematic,artDirection:art}});
    assert.deepEqual(customModelMotionOrigin(shot,part.id),c.origin);
    const files=renderCinematic(shot,f.profile,f.rig,{method:'segment-draft',windowMs:20,intervals:[]},f.config).files;
    const js=files.files.find(file=>file.path==='scene.js')!.content;
    const target=JSON.stringify(`[data-composition-id="${shot.id}"] #object-${index} .motion`);
    assert.ok(js.includes(`tl.set(${target},{svgOrigin:${JSON.stringify(`${c.origin.x} ${c.origin.y}`)}},0);`),'the production emitter must initialize the local pivot at clock zero');
    assert.ok(c.origin.x!==part.x*1280||c.origin.y!==part.y*720,'the fixture separates model-local and stage coordinates');
    assert.deepEqual(validateSceneFiles(secureSceneFiles(files),shot,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  }
  const explicit={...f.artDirection,models:[{partId:part.id,sourceRefs:part.sourceRefs,svg:'<circle class="motion" r="10"/>',motionOrigin:{x:NaN,y:0}}]};
  assert.equal(ArtDirectionSchema.safeParse(explicit).success,false,'motion origins require finite coordinates');
});

test('three-wheel native illustrations use distinct translated wheel groups with zero local anchors',async t=>{
  const f=await creativeFixture(await temporary(t)),original=f.shot.visualization!.parts[0]!;
  const sourceRefs=[{kind:'narration' as const,segmentId:'cue',quote:'Xe có ba bánh, động cơ phía sau.'}];
  for(const variant of ['historical-note','vehicle-feature-schematic','three-wheel-group'] as const){
    const illustration=cinematicModel({...original,kind:variant==='three-wheel-group'?'wheel':'car',sourceRefs},{partId:original.id,variant,sourceRefs},200,100);
    assert.deepEqual(illustration.motionAnchors,[0,1,2].map(i=>({selector:`.wheel-${i}`,x:0,y:0})));
    assert.equal((illustration.svg.match(/class="motion wheel-\d"/g)??[]).length,3);
    const translations=[...illustration.svg.matchAll(/transform="translate\(([-\d.]+) ([-\d.]+)\)"/g)].map(m=>`${m[1]} ${m[2]}`);
    assert.equal(new Set(translations).size,3,'each wheel lives under its own translated parent');
  }
});
