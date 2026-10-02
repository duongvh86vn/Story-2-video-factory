import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { creativeFixture } from './creative-fixture.js';
import { temporary } from './support.js';
import { createProject } from '../packages/orchestrator/index.js';
import { loadConfig } from '../packages/core/config.js';
import { StoryboardSchema, NarrationSchema, type Storyboard, type AssetManifest } from '../packages/core/schemas.js';
import { hash, readJson } from '../packages/core/utils.js';
import { ActorDefinitionSchema, ActorSceneSchema } from '../packages/actors/schemas.js';
import { actorProfile, actorSpeech, bindActorShot, validateActorCast } from '../packages/actors/model.js';
import { buildRig } from '../packages/host/rig.js';
import { validateCinematicShot, writeCinematicPlans } from '../packages/director/index.js';
import { validateExplainerStoryboard } from '../packages/explainer/storyboard.js';
import { buildScenes } from '../packages/scenes/index.js';
import { HyperFramesEngine } from '../packages/render/hyperframes.js';
import { renderCinematic } from '../library/shots/cinematic.js';
import { secureSceneFiles, validateSceneFiles } from '../packages/scenes/security.js';
import type { SpeechActivity } from '../packages/voice/schemas.js';
import { artworkSvg, hasRenderedMotionGeometry, customModelArt, customModelMotionOrigin } from '../packages/director/art-direction.js';

const speech:SpeechActivity={method:'audio-rms',windowMs:20,intervals:[{startMs:100,endMs:4900,level:.8}]};
async function owned(t:TestContext):Promise<string>{
  const evidence=process.env.STORY_ACTORS_TEST_EVIDENCE;
  if(!evidence)return temporary(t);
  await fs.mkdir(evidence,{recursive:true});
  return fs.mkdtemp(path.join(evidence,'fixture-'));
}
async function fixture(t:TestContext){
  const root=await owned(t),f=await creativeFixture(root);
  f.config.presentation.character_mode='actors';
  const old=f.narration.segments[0]!.text;
  const text='James Watt và Joseph Black quan sát. '+old;
  // Keep the existing causal facts and cue clock; add literal cast names to every
  // canonical copy of the same original cue, rather than forge cast-only evidence.
  const replace=(value:unknown):unknown=>{
    if(value===old)return text;
    if(Array.isArray(value))return value.map(replace);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replace(v)]));
    return value;
  };
  f.narration=replace(f.narration) as typeof f.narration;
  f.beat=replace(f.beat) as typeof f.beat;
  f.shot=replace(f.shot) as typeof f.shot;
  const character=(id:string,name:string,color:string)=>ActorDefinitionSchema.parse({id,name,role:'quan sát',identity:'historical',kind:'stick-man',
    sourceRefs:[{kind:'narration',segmentId:'cue',quote:text}],appearance:f.profile.appearance,
    costume:[{joint:'chest',svg:`<defs><linearGradient id="coat"><stop stop-color="${color}"/></linearGradient></defs><rect id="jacket" x="-22" y="-40" width="44" height="65" fill="url(#coat)"/>`}]});
  const primary=character('watt','James Watt','#a82030'),support=character('black','Joseph Black','#2040a8');
  const supportingPlan=structuredClone(f.shot.cinematic!.performance);
  supportingPlan.root={x:250,y:supportingPlan.stage.groundY};
  supportingPlan.walks=[];supportingPlan.props=[];supportingPlan.gazes=[];
  supportingPlan.gestures=[{id:'support-react',action:'react',startMs:0,endMs:5000}];
  f.shot.cinematic!.actorScene=ActorSceneSchema.parse({primary,speakingSegmentIds:[],continuity:'cut',supporting:[{character:support,performance:supportingPlan,
    actions:[{type:'react',startMs:0,endMs:5000,narrationAnchor:'cue'}],speakingSegmentIds:[]}]});
  bindActorShot(f.shot,f.profile,f.rig);
  const board=StoryboardSchema.parse({version:1,shots:[f.shot]});
  const validate=(b:Storyboard=board)=>validateExplainerStoryboard(b,f.narration,[f.beat],f.profile,f.rig,f.config);
  return {...f,root,primary,support,board,validate};
}

test('new projects default to story actors, stick-man and cinematic without presenter opt-in',async t=>{
  const root=await createProject('actor-default',{root:await owned(t)}),raw=YAML.parse(await fs.readFile(path.join(root,'project.yaml'),'utf8'));
  const config=await loadConfig(root);
  assert.equal(raw.host.profile,'library/characters/STICK-MAN.md');
  assert.equal(config.presentation.mode,'story-cinematic');assert.equal(config.presentation.character_mode,'actors');
});

test('two sourced historical actors form a valid complete production storyboard',async t=>{const f=await fixture(t);assert.doesNotThrow(()=>f.validate());});
for(const [label,mutate] of [
  ['forged quote',(a:ReturnType<typeof ActorDefinitionSchema.parse>)=>{a.sourceRefs[0]!.quote='Napoleon Bonaparte';}],
  ['unknown cue',(a:ReturnType<typeof ActorDefinitionSchema.parse>)=>{a.sourceRefs[0]={kind:'narration',segmentId:'missing',quote:'James Watt'};}],
  ['unsupported historical name',(a:ReturnType<typeof ActorDefinitionSchema.parse>)=>{a.name='Napoleon Bonaparte';}],
] as const)test(`cast rejects ${label}`,async t=>{const f=await fixture(t);mutate(f.board.shots[0]!.cinematic!.actorScene!.primary!);assert.throws(()=>validateActorCast(f.board,f.narration),/source|identity/);});

test('historical role cannot claim an unsourced emperor identity using a valid name quote',async t=>{
  const f=await fixture(t);f.board.shots[0]!.cinematic!.actorScene!.primary!.role='Hoàng đế Pháp trị vì châu Âu';
  assert.throws(()=>validateActorCast(f.board,f.narration),/source|role|identity/);
});
for(const who of ['primary','supporting'] as const)test(`${who} historical role rejects sourced text mixed with an invented title`,async t=>{
  const f=await fixture(t),scene=f.board.shots[0]!.cinematic!.actorScene!;
  const actor=who==='primary'?scene.primary!:scene.supporting[0]!.character;
  actor.role='quan sát và Hoàng đế Pháp trị vì châu Âu';
  assert.throws(()=>validateActorCast(f.board,f.narration),/role.*literal|source.*evidence/);
});
test('historical role accepts the complete literal fact label with case and NFC equivalence',async t=>{
  const f=await fixture(t),scene=f.board.shots[0]!.cinematic!.actorScene!;
  scene.primary!.role='QUAN SA\u0301T';scene.supporting[0]!.character.role='James Watt và Joseph Black quan sát.';
  assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));
});
test('historical role cannot be an empty fact label disguised as whitespace',async t=>{
  const f=await fixture(t);f.board.shots[0]!.cinematic!.actorScene!.primary!.role='   ';
  assert.throws(()=>validateActorCast(f.board,f.narration),/role|source|literal/);
});
test('cast identity is stable even across explicit cuts',async t=>{const f=await fixture(t),next=structuredClone(f.board.shots[0]!);next.id='second';next.cinematic!.actorScene!.primary!.costume![0]!.svg='<rect width="10" height="10" fill="#ffffff"/>';f.board.shots.push(next);assert.throws(()=>validateActorCast(f.board,f.narration),/identity|changed/);});
test('duplicate actor IDs cannot merge distinct performers',async t=>{const f=await fixture(t);f.board.shots[0]!.cinematic!.actorScene!.supporting[0]!.character.id='watt';assert.throws(()=>validateActorCast(f.board,f.narration),/duplicate/);});

for(const who of ['primary','supporting'] as const){
  test(`${who} actions reject unknown narration anchors`,async t=>{const f=await fixture(t),s=f.board.shots[0]!;const actions=who==='primary'?s.host!.actions:s.cinematic!.actorScene!.supporting[0]!.actions;actions[0]!.narrationAnchor='forged-cue';assert.throws(()=>f.validate(),/narration anchor/);});
  test(`${who} actions reject clocks beyond their own shot`,async t=>{const f=await fixture(t),s=f.board.shots[0]!;const actions=who==='primary'?s.host!.actions:s.cinematic!.actorScene!.supporting[0]!.actions;actions[0]!.endMs=5001;assert.throws(()=>f.validate(),/clock|action|bounds/);});
  test(`${who} actions reject a known but temporally unrelated narration cue`,async t=>{
    const f=await fixture(t),s=f.board.shots[0]!;f.narration.durationMs=7000;f.narration.segments.push({id:'later',startMs:5000,endMs:7000,text:'Sau đó họ nghỉ.'});
    const actions=who==='primary'?s.host!.actions:s.cinematic!.actorScene!.supporting[0]!.actions;actions[0]!.narrationAnchor='later';
    assert.throws(()=>f.validate(),/anchor|cue|clock|source/);
  });
  test(`${who} action rejects a shot-owned cue without action-clock overlap`,async t=>{
    const f=await fixture(t),s=f.board.shots[0]!,actions=who==='primary'?s.host!.actions:s.cinematic!.actorScene!.supporting[0]!.actions;
    const a=actions[0]!;
    // Keep cast evidence and the canonical explanation cue untouched. The new
    // known cue is owned by this shot, but touches rather than overlaps the action.
    a.narrationAnchor='boundary';s.narrationSegmentIds!.push('boundary');
    f.narration.segments.push({id:'boundary',startMs:a.endMs,endMs:a.endMs+1,text:'Rồi.'});
    f.narration.durationMs=Math.max(f.narration.durationMs,a.endMs+1);
    assert.throws(()=>f.validate(),/anchor.*cue clock/);
  });
  for(const edge of ['before-start','at-end','inside'] as const)test(`${who} contact ${edge} is ${edge==='inside'?'accepted':'rejected'} relative to its assigned cue`,async t=>{
    const f=await fixture(t),s=f.board.shots[0]!;
    if(who==='supporting'){
      const support=s.cinematic!.actorScene!.supporting[0]!;
      support.actions=structuredClone(s.host!.actions);support.performance=structuredClone(s.cinematic!.performance);bindActorShot(s,f.profile,f.rig);
    }
    const actions=who==='primary'?s.host!.actions:s.cinematic!.actorScene!.supporting[0]!.actions;
    const action=actions.find(a=>a.type==='operate-model');assert.ok(action?.contactMs!==undefined,'fixture has a real validated contact');
    const contact=action.contactMs!;
    const startMs=edge==='before-start'?contact+1:contact-1;
    const endMs=edge==='at-end'?contact:edge==='before-start'?contact+2:contact+1;
    action.narrationAnchor='contact-cue';s.narrationSegmentIds!.push('contact-cue');
    f.narration.segments.push({id:'contact-cue',startMs,endMs,text:'Thao tác.'});
    // The performance/action contact stays identical: only evidence assignment
    // changes, so a rejection cannot be explained by a gesture/contact mismatch.
    if(edge==='inside')assert.doesNotThrow(()=>f.validate());else assert.throws(()=>f.validate(),/contact.*cue clock/);
  });
}
test('primary operation rejects a mismatched contact timestamp',async t=>{const f=await fixture(t),s=f.board.shots[0]!,a=s.host!.actions.find(a=>a.type==='operate-model');assert.ok(a,'fixture exercises real contact');a.contactMs!+=1;assert.throws(()=>f.validate(),/contact/);});
test('supporting operation requires matching actual contact and target',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,support=s.cinematic!.actorScene!.supporting[0]!;
  support.actions=structuredClone(s.host!.actions);support.performance=structuredClone(s.cinematic!.performance);bindActorShot(s,f.profile,f.rig);
  assert.doesNotThrow(()=>f.validate());support.actions.find(a=>a.type==='operate-model')!.contactMs!+=1;assert.throws(()=>f.validate(),/contact/);
});

test('voiceover emits silent mouth timelines for every actor, assigned speech opens only that actor',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,scene=s.cinematic!.actorScene!;
  const silent=renderCinematic(s,f.profile,f.rig,speech,f.config,undefined,f.narration);
  const js=silent.files.files.find(f=>f.path==='scene.js')!.content;
  assert.match(js,/#mouth-talk.*"scaleY":0\.2/);assert.match(js,/#actor-black-mouth-talk.*"scaleY":0\.2/);
  assert.doesNotMatch(js,/#(?:actor-black-)?mouth-talk[^\n]*"scaleY":2\.84/);
  scene.supporting[0]!.speakingSegmentIds=['cue'];
  const spoken=renderCinematic(s,f.profile,f.rig,speech,f.config,undefined,f.narration).files.files.find(f=>f.path==='scene.js')!.content;
  assert.match(spoken,/#actor-black-mouth-talk[^\n]*"scaleY":2\.84/);
  assert.doesNotMatch(spoken,/#mouth-talk[^\n]*"scaleY":2\.84/);
  scene.speakingSegmentIds=['cue'];
  const primary=renderCinematic(s,f.profile,f.rig,speech,f.config,undefined,f.narration).files.files.find(f=>f.path==='scene.js')!.content;
  assert.match(primary,/#mouth-talk[^\n]*"scaleY":2\.84/);
});
test('speech assignment clips audio activity to assigned cue and shot, never expands voiceover',async t=>{
  const f=await fixture(t);assert.deepEqual(actorSpeech(speech,f.narration,[],0,5000).intervals,[]);
  f.narration.segments[0]!.startMs=1000;f.narration.segments[0]!.endMs=2000;
  assert.deepEqual(actorSpeech(speech,f.narration,['cue'],1500,2500).intervals,[{startMs:1500,endMs:2000,level:.8}]);
  f.board.shots[0]!.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['unknown'];assert.throws(()=>validateActorCast(f.board,f.narration),/speech|speaking|cue/);
});

test('two costumes render with distinct SVG IDs and actual actor report hashes',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,rendered=renderCinematic(s,f.profile,f.rig,speech,f.config,undefined,f.narration);
  const html=rendered.files.files.find(f=>f.path==='index.html')!.content,ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]!);
  assert.equal(new Set(ids).size,ids.length,'all document IDs must be unique');assert.match(html,/#a82030/);assert.match(html,/#2040a8/);
  assert.deepEqual(rendered.report.actors.map(a=>a.actorId),['watt','black']);
  for(const a of rendered.report.actors){const profile=actorProfile(a.actorId==='watt'?f.primary:f.support);assert.equal(a.profileHash,profile.profileHash);assert.equal(a.rigHash,buildRig(profile).rigHash);assert.equal(a.report.profileHash,profile.profileHash);assert.notEqual(a.profileHash,f.profile.profileHash);}
  assert.deepEqual(validateSceneFiles(secureSceneFiles(rendered.files),s,f.config.workflow.max_scene_bytes,[],f.config.rendering.final),[]);
  await fs.writeFile(path.join(f.root,'rendered-scene.json'),JSON.stringify(rendered,null,2));
});

test('mechanism-only object focus passes without presence or meaningful presenter quota',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,c=s.cinematic!;c.actorScene!.primary=null;c.actorScene!.supporting=[];
  s.host!.actions=[{type:'idle',startMs:0,endMs:5000}];c.performance.gestures=[];c.performance.props=[];c.performance.walks=[];
  c.continuity.entry={...c.performance.root};c.continuity.exit={...c.performance.root};c.propBindings=[];
  s.visualization!.events=s.visualization!.events.map(e=>({...e,contactRequired:false,contactPartId:undefined}));
  c.artDirection=structuredClone(f.artDirection);c.artDirection.models=c.artDirection.models.map(m=>({...m,sourceRefs:s.visualization!.parts.find(p=>p.id===m.partId)!.sourceRefs}));
  c.camera={...c.camera,framing:'close',focus:'object',movement:'locked',startScale:1,endScale:1,anchor:{x:640,y:360},designIntent:'Object focus on the complete causal mechanism, no actor in this frame.'};s.camera.shotSize='close';s.camera.movement='locked';
  bindActorShot(s,f.profile,f.rig);f.config.presentation.maximum_host_absence_seconds=0;f.config.presentation.minimum_host_speech_visibility=1;
  assert.doesNotThrow(()=>f.validate());const result=renderCinematic(s,f.profile,f.rig,speech,f.config,undefined,f.narration);assert.deepEqual(result.report.actors,[]);assert.match(result.files.files[0]!.content,/<g opacity="0" id="performer"/);
});
test('an actor may be small in a wide shot without a fixed presenter size quota',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,c=s.cinematic!;c.actorScene!.supporting=[];
  s.host!.actions=[{type:'react',startMs:0,endMs:5000,narrationAnchor:'cue'}];c.performance.scale=.25;c.performance.walks=[];c.performance.props=[];c.performance.gestures=[{id:'small-react',action:'react',startMs:0,endMs:5000}];c.performance.gazes=[];
  c.continuity.entry={...c.performance.root};c.continuity.exit={...c.performance.root};c.propBindings=[];c.camera={...c.camera,framing:'wide',focus:'ensemble',movement:'locked',anchor:{x:640,y:360},startScale:1,endScale:1};s.camera.shotSize='wide';s.camera.movement='locked';
  assert.doesNotThrow(()=>validateCinematicShot(s,f.profile,f.config));
});

for(const mode of ['continuous','cut'] as const)test(`supporting actor position changes ${mode==='cut'?'are allowed by explicit cuts':'reject during continuity'}`,async t=>{
  const f=await fixture(t),next=structuredClone(f.board.shots[0]!);next.id='next';next.cinematic!.actorScene!.continuity=mode;
  const previous=f.board.shots[0]!.cinematic!.performance;next.cinematic!.performance.root={x:previous.walks.at(-1)?.toX??previous.root.x,y:previous.stage.groundY};
  next.cinematic!.actorScene!.supporting[0]!.performance.root.x+=25;f.board.shots.push(next);
  if(mode==='cut')assert.doesNotThrow(()=>validateActorCast(f.board,f.narration));else assert.throws(()=>validateActorCast(f.board,f.narration),/position|teleport|continuous/);
});
test('continuous cuts preserve supporting cast membership and exact stable identity',async t=>{const f=await fixture(t),next=structuredClone(f.board.shots[0]!);next.cinematic!.actorScene!.continuity='continuous';next.cinematic!.actorScene!.supporting=[];f.board.shots.push(next);assert.throws(()=>validateActorCast(f.board,f.narration),/cast|continuous/);});
test('cast export creates real costume SVGs and raster previews bound to exact profiles and rigs',async t=>{
  const f=await fixture(t);await writeCinematicPlans(f.root,f.board);
  const cast=await readJson<{actors:{character:typeof f.primary;profile:{profileHash:string};rig:{rigHash:string};assetPath:string;previewPath:string;assetHash:string;previewHash:string}[]}>(path.join(f.root,'work/actor-cast.json'));
  assert.equal(cast.actors.length,2);
  for(const a of cast.actors){const profile=actorProfile(a.character),svg=await fs.readFile(path.join(f.root,a.assetPath)),png=await fs.readFile(path.join(f.root,a.previewPath));assert.equal(a.assetHash,hash(svg));assert.equal(a.previewHash,hash(png));assert.equal(a.profile.profileHash,profile.profileHash);assert.equal(a.rig.rigHash,buildRig(profile).rigHash);const size=await sharp(png).metadata();assert.ok(size.width!>100&&size.height!>100);assert.match(svg.toString(),/data-costume-joint="chest"/);}
  assert.notEqual(cast.actors[0]!.assetHash,cast.actors[1]!.assetHash);assert.notEqual(cast.actors[0]!.previewHash,cast.actors[1]!.previewHash);
  const timeline=await readJson<{shots:{scene:{supporting:unknown[]}}[]}>(path.join(f.root,'work/actor-timeline.json'));assert.equal(timeline.shots[0]!.scene.supporting.length,1);
});

test('production scene publication reports actual cast rigs and retains assigned speech and silent voiceover',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!;
  s.cinematic!.actorScene!.supporting[0]!.speakingSegmentIds=['cue'];
  f.narration=NarrationSchema.parse(f.narration);
  for(const [name,data] of Object.entries({narration:f.narration,beats:[f.beat],storyboard:f.board,'speech-activity':speech}))await fs.writeFile(path.join(f.root,'work',name+'.json'),JSON.stringify(data));
  const need=s.assetNeeds.find(a=>a.required&&a.localPath===f.rig.assetPath);assert.ok(need);
  const manifest:AssetManifest={assets:[{id:need.id,type:'image',path:f.rig.assetPath,hash:hash(await fs.readFile(path.join(f.root,f.rig.assetPath))),source:'code',status:'approved',shotIds:[s.id]}]};
  t.mock.method(HyperFramesEngine.prototype,'validate',async()=>({pass:true,errors:[],diagnostics:[{boundary:'browser mocked; scene security and source validation remain real'}]}));
  await buildScenes(f.root,f.config,f.router,f.board,f.characters,manifest);
  const report=await readJson<{shots:{actors:{actorId:string;profileHash:string;rigHash:string}[]}[]}>(path.join(f.root,'work/performance-report.json'));
  assert.deepEqual(report.shots[0]!.actors.map(a=>a.actorId),['watt','black']);
  for(const a of report.shots[0]!.actors){const p=actorProfile(a.actorId==='watt'?f.primary:f.support);assert.equal(a.profileHash,p.profileHash);assert.equal(a.rigHash,buildRig(p).rigHash);}
  const js=await fs.readFile(path.join(f.root,'scenes',s.id,'scene.js'),'utf8');assert.match(js,/#actor-black-mouth-talk[^\n]*"scaleY":2\.84/);assert.doesNotMatch(js,/#mouth-talk[^\n]*"scaleY":2\.84/);
  await fs.writeFile(path.join(f.root,'production-probe.json'),JSON.stringify({root:f.root,scene:'scenes/'+s.id,config:f.config}));
});

test('canonical SVG XML preserves gradient attributes, namespaced clip paths and actual Sharp pixels',async t=>{
  const root=await owned(t);
  const raw='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="paint" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)" spreadMethod="pad" x1="0" y1="0" x2="40" y2="0"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient><clipPath id="window" clipPathUnits="userSpaceOnUse"><rect width="20" height="20"/></clipPath></defs><rect width="40" height="20" fill="url(#paint)" clip-path="url(#window)"/></svg>';
  const canonical=artworkSvg(raw,'pixel');
  for(const name of ['linearGradient','viewBox','preserveAspectRatio','gradientUnits','gradientTransform','spreadMethod','clipPath','clipPathUnits'])assert.ok(canonical.includes(name),`canonical XML keeps ${name}`);
  assert.match(canonical,/fill="url\(#pixel\.paint\)"/);assert.match(canonical,/clip-path="url\(#pixel\.window\)"/);
  const {data,info}=await sharp(Buffer.from(canonical)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,40);assert.equal(info.height,20);
  const pixel=(x:number,y:number)=>[...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+4)];
  const left=pixel(2,10),middle=pixel(17,10),clipped=pixel(30,10);
  assert.equal(left[3],255);assert.ok(left[0]!>200&&left[2]!<30,'gradient paints red at its left endpoint');
  assert.ok(middle[2]!>left[2]!+70&&middle[0]!<left[0]!-70,'gradient visibly varies across the authored coordinates');
  assert.equal(clipped[3],0,'clipPath actually excludes the right half, not just serializes');
  await fs.writeFile(path.join(root,'canonical-gradient-clip.svg'),canonical);await sharp(Buffer.from(canonical)).png().toFile(path.join(root,'canonical-gradient-clip.png'));
});
test('radial gradients survive canonical XML and paint a distinct center and edge',async t=>{
  const root=await owned(t),raw='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><defs><radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="20" cy="20" r="20"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></radialGradient></defs><rect width="40" height="40" fill="url(#glow)"/></svg>';
  const canonical=artworkSvg(raw,'radial');assert.match(canonical,/<radialGradient\b/);
  const {data,info}=await sharp(Buffer.from(canonical)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const center=(20*info.width+20)*info.channels,edge=(20*info.width+1)*info.channels;
  assert.ok(data[center]!>220&&data[center+2]!<35);assert.ok(data[edge+2]!>220&&data[edge]!<35);
  await sharp(Buffer.from(canonical)).png().toFile(path.join(root,'canonical-radial.png'));
});
test('SVG canonicalization does not admit mixed-case executable attributes or external references',()=>{
  assert.throws(()=>artworkSvg('<svg viewBox="0 0 10 10" viewbox="0 0 10 10"/>','duplicate'),/duplicate attribute/);
  assert.throws(()=>artworkSvg('<rect width="10" height="10" onLoad="alert(1)"/>','script'),/executable/);
  assert.throws(()=>artworkSvg('<rect width="10" height="10" fill="url(https://example.invalid/paint)"/>','foreign'),/own local|foreign/);
});
test('canonical clipPath geometry cannot masquerade as visible motion artwork',()=>{
  const canonical=artworkSvg('<clipPath id="hidden" class="motion"><rect width="30" height="30"/></clipPath>','clip');
  assert.equal(hasRenderedMotionGeometry(canonical),false,'geometry in a clip definition is not rendered motion');
  assert.equal(hasRenderedMotionGeometry(artworkSvg('<g class="motion"><rect width="30" height="30"/></g>','visible')),true,'control has real visible geometry');
});
test('custom complete-SVG glyph preserves exactly one authored viewBox and its motion center',async t=>{
  const f=await fixture(t),s=f.board.shots[0]!,part=s.visualization!.parts[0]!;
  s.cinematic!.artDirection=structuredClone(f.artDirection);s.cinematic!.artDirection.models=[{partId:part.id,sourceRefs:part.sourceRefs,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="10 20 80 40"><rect class="motion" x="10" y="20" width="80" height="40" fill="#a82030"/></svg>'}];
  const art=customModelArt(s,part.id,120,80);assert.ok(art);
  assert.equal([...art.matchAll(/\bviewbox=/gi)].length,1);assert.match(art,/viewBox="10 20 80 40"/);
  assert.deepEqual(customModelMotionOrigin(s,part.id),{x:50,y:40});
  const wrapped='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="-100 -100 200 200">'+art+'</svg>';
  const image=await sharp(Buffer.from(wrapped)).png().toBuffer();assert.ok(image.length>100);
  await fs.writeFile(path.join(f.root,'custom-glyph.png'),image);
  s.cinematic!.artDirection.models[0]!.svg='<svg xmlns="http://www.w3.org/2000/svg"><rect class="motion" width="30" height="30"/></svg>';
  const fallback=customModelArt(s,part.id,120,80)!;assert.equal([...fallback.matchAll(/\bviewbox=/gi)].length,1);assert.match(fallback,/viewBox="-50 -50 100 100"/);
});
