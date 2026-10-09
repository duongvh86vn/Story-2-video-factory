// DECLARED ONLY, NOT RUN. Human's model owns all runtime/geometry/film checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../packages/core/utils.js';
import {sourceActor} from '../packages/director/source-actor.js';
import {validateSourcePropBindings} from '../packages/director/source-prop-binding.js';
import {validateSourceGripWorld} from '../packages/director/source-grip-world.js';
import {sourceInteractionDescriptor,sourceInteractionGeometry} from '../packages/director/source-interactions.js';
import {projectSourceWorldEvents} from '../packages/director/source-world-projection.js';
import {SourceWorldSchema,type SourceWorldEvent} from '../packages/director/source-world-schemas.js';
import {SOURCE_WORLD_VERSION} from '../packages/director/source-world-reference.js';
import {actorViewActingClock} from '../packages/actors/view-acting-clock.js';
import {actorProfile} from '../packages/actors/model.js';
import {cameraHostBounds,validateCamera} from '../packages/director/camera.js';
import {validatePropBindings} from '../packages/director/props.js';
import {rigSpeechPublicationBinding,assertRigSpeechPublicationBinding} from '../packages/actors/speech-clock.js';
import {sourceInteractionFixture} from './fixtures/source-interaction-fixture.js';

const ids=['lila-person','karo-person'];
function fixture(drop=false){return sourceInteractionFixture(drop,[1000,2300,4100,5000],undefined,'handle');}
function owner(f:ReturnType<typeof fixture>,index=0,id=ids[0]!){return sourceActor(f.board.shots[index]!,id);}
function world(f:ReturnType<typeof fixture>,events:SourceWorldEvent[]){
  const w=SourceWorldSchema.parse({version:SOURCE_WORLD_VERSION,id:'original-grip-world',startMs:1000,endMs:5000,events});
  for(const shot of f.board.shots){shot.cinematic!.sourceWorld=structuredClone(w);shot.visualization!.events=projectSourceWorldEvents(w,shot.startMs,shot.endMs);}
}
function event(f:ReturnType<typeof fixture>,type:SourceWorldEvent['type'],startMs:number,endMs:number,motion:SourceWorldEvent['motion']='none'):SourceWorldEvent{
  return {id:'original-event',type,targetId:'basket',startMs,endMs,motion,contactRequired:false,narrationAnchor:'cue',sourceRefs:[f.ref]};
}

test('transport uses explicit authored handle and physical grip offset through both owners and all lead swaps',()=>{
  for(const drop of [false,true]){const f=fixture(drop),before=hash(f);
    for(let i=0;i<3;i++){const shot=f.board.shots[i]!;validateSourcePropBindings(shot,f.board,f.narration);
      for(const id of ids){const o=owner(f,i,id),action=o.actions[0]!,d=sourceInteractionDescriptor(shot,id,action,f.board,f.narration),g=sourceInteractionGeometry(shot,id,action,f.board,f.narration);
        assert.equal(action.target!.anchor,'handle');assert.equal(d.targetKind,'bound-prop');assert.equal(d.actorId,id);
        assert.ok(g.sourceManipulation!.originalContact.errorPx<=1);assert.ok(g.sourceManipulation!.originalContact.constraintErrorPx<=1);
        assert.ok(Math.abs(g.sourceManipulation!.originalContact.target.x-g.sourceManipulation!.originalContact.modelCenter.x-8*o.performance.scale)<=1);
        assert.equal(g.sourceManipulation!.contactVerified,false);assert.equal(g.sourceManipulation!.motionVerified,false);
      }
    }assert.equal(hash(f),before);
  }
});

test('missing or inconsistent handle, center substitution and foreign grip cannot pass original transport binding',()=>{
  const mutations:Array<(f:ReturnType<typeof fixture>)=>void>=[
    f=>{delete f.board.shots[0]!.cinematic!.artDirection!.models[0]!.handleAnchor;},
    f=>{f.board.shots[1]!.cinematic!.artDirection!.models[0]!.handleAnchor!.x-=.1;},
    f=>{owner(f).actions[0]!.target!.anchor='center';},
    f=>{owner(f).performance.sourceManipulation!.props[0]!.gripOffset!.x+=4;},
    f=>{f.board.shots[0]!.cinematic!.actorScene!.supporting[0]!.performance.stage.groundY-=4;},
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>validateSourcePropBindings(f.board.shots[0]!,f.board,f.narration));}
});

test('owned transport retains source visibility and rejects a second geometry owner even after hand release',()=>{
  const reveal=fixture();world(reveal,[event(reveal,'reveal',1500,1700)]);assert.doesNotThrow(()=>validateSourcePropBindings(reveal.board.shots[1]!,reveal.board,reveal.narration));
  for(const [type,start,end,motion] of [
    ['reveal',2100,2200,'none'],['part-motion',1400,1800,'rotate'],['part-motion',4000,4400,'translate'],
  ] as const){const f=fixture();world(f,[event(f,type,start,end,motion)]);assert.throws(()=>validateSourcePropBindings(f.board.shots[1]!,f.board,f.narration),/not visible|independent world geometry/);}
  const pulse=fixture();world(pulse,[event(pulse,'part-motion',2000,4500,'pulse')]);assert.doesNotThrow(()=>validateSourcePropBindings(pulse.board.shots[1]!,pulse.board,pulse.narration));
});

test('prior implicit flow rotation, local reset and stale event projection cannot change an owned model grip',()=>{
  const f=fixture();for(const s of f.board.shots)s.visualization!.parts[0]!.kind='gear';
  world(f,[{...event(f,'flow',1400,1800),targetId:'bowl',relationTo:'basket'}]);
  assert.throws(()=>validateSourcePropBindings(f.board.shots[1]!,f.board,f.narration),/implicit flow rotation/);
  const reset=fixture();reset.board.shots[1]!.visualization!.events=[event(reset,'reveal',2400,2500)];
  assert.throws(()=>validateSourcePropBindings(reset.board.shots[1]!,reset.board,reset.narration),/complete original world history/);
  const stale=fixture();world(stale,[event(stale,'reveal',1500,1700)]);stale.board.shots[0]!.visualization!.events[0]!.startMs+=1;
  assert.throws(()=>validateSourcePropBindings(stale.board.shots[0]!,stale.board,stale.narration),/exact original world projections/);
});

test('world grip policy rejects forged source span and missing fixed incoming flow history',()=>{
  const f=fixture(),shot=f.board.shots[0]!,part=shot.visualization!.parts[0]!;
  assert.throws(()=>validateSourceGripWorld(shot,part,2000,3800,{startMs:2100,endMs:5000}),/invalid complete physical source span/);
  assert.throws(()=>validateSourceGripWorld(shot,part,2000,3800,{startMs:1000,endMs:3500}),/invalid complete physical source span/);
  shot.visualization!.events=[{...event(f,'flow',1400,1800),targetId:'bowl',relationTo:'basket'}];
  assert.throws(()=>validateSourceGripWorld(shot,part,2000,3800),/complete original world history/);
});

test('camera receives full original world/board for supporting owner envelopes across camera lead swaps',()=>{
  const f=fixture();
  for(let i=0;i<3;i++){const shot=f.board.shots[i]!,c=shot.cinematic!,primary=c.actorScene!.primary!;
    const envelopes=ids.map(id=>{const o=owner(f,i,id);return {o,b:cameraHostBounds(o.performance,actorProfile(o.character),actorViewActingClock(f.board,shot,id))};});
    const boxes=envelopes.map(e=>e.b.body);
    for(const part of shot.visualization!.parts){const binding=c.propBindings.find(b=>b.partId===part.id)!,b=envelopes.find(e=>e.o.character.id===binding.ownerId)!.b.props[binding.propId]!;
      boxes.push({left:b.left-part.width*1000*.56,right:b.right+part.width*1000*.56,top:b.top-part.height*440*.6,bottom:b.bottom+part.height*440*.6});}
    const left=Math.min(...boxes.map(b=>b.left)),right=Math.max(...boxes.map(b=>b.right)),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.bottom));
    const scale=Math.min(1,800/(right-left),264/(bottom-top));
    c.camera={...c.camera,anchor:{x:(left+right)/2,y:(top+bottom)/2},startScale:scale,endScale:scale,designIntent:'Engineering full-envelope camera: real own actor/prop geometry, not a film acceptance.'};
    const profile=actorProfile(primary),clock=actorViewActingClock(f.board,shot,primary.id);
    assert.throws(()=>validateCamera(shot,profile,clock),/complete storyboard\/run context/);
    assert.doesNotThrow(()=>validateCamera(shot,profile,clock,{worldShot:shot,board:f.board}));
  }
});

test('sibling handle/world edits invalidate source publication while audio/narration stay unchanged and production gates remain',()=>{
  const f=fixture(),shot=f.board.shots[1]!,voice=hash(f.narration),binding=rigSpeechPublicationBinding(shot,f.narration,f.board);
  assert.throws(()=>validatePropBindings(shot,f.board,f.narration),/needs-source-prop-binding/);
  const changed=structuredClone(f.board);changed.shots[2]!.cinematic!.artDirection!.models[0]!.handleAnchor!.x-=.1;
  assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,changed,binding));
  world(f,[event(f,'reveal',1500,1700)]);assert.throws(()=>assertRigSpeechPublicationBinding(shot,f.narration,f.board,binding));assert.equal(hash(f.narration),voice);
});
