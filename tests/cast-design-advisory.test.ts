import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import {castDesignAdvisories,actorVisualFingerprint} from '../packages/actors/design.js';
import {actorLockKey,assertActorLocks} from '../packages/actors/locks.js';
import {actorProfile} from '../packages/actors/model.js';
import {ruleReview} from '../packages/review/index.js';
import {createCreativeStoryboard,creativeInputIdentity} from '../packages/director/creative.js';
import {ModelRouter} from '../packages/models/registry.js';
import {writeJson,readJson,hash} from '../packages/core/utils.js';
import type {Storyboard,Shot} from '../packages/core/schemas.js';
import {foregroundFixture} from './foreground-fixture.js';

test('independent cast design advisories: co-presence and no identity mutation',async t=>{
  const f=await foregroundFixture(t),s=f.shot,cast=s.cinematic!.actorScene!,a=cast.primary!,b=cast.supporting[0]!.character;
  const before=structuredClone(f.board),profileBefore=actorProfile(a),locks={[actorLockKey(a.id)]:true,[actorLockKey(b.id)]:true};
  await t.test('primary/supporting identical inputs warn medium but remain legal and locked',()=>{
    const issues=castDesignAdvisories(f.board);assert.equal(issues.length,1);assert.equal(issues[0]!.severity,'medium');assert.equal(issues[0]!.type,'cast-design-similarity');assert.deepEqual(new Set(issues[0]!.actorIds),new Set([a.id,b.id]));
    assert.match(issues[0]!.repair,/Deliberate resemblance/);assert.doesNotThrow(()=>assertActorLocks(before,f.board,locks));assert.deepEqual(f.board,before);assert.deepEqual(actorProfile(a),profileBefore);
  });
  await t.test('case-normalized appearance, passive costume namespace and cross-joint order are deterministic',()=>{
    const left=structuredClone(a),right=structuredClone(b);
    for(const key of ['outline','shell','screen','accent','badge'] as const)right.appearance[key]=left.appearance[key].toUpperCase();
    left.costume=[{joint:'head',svg:'<defs><linearGradient id="hat"><stop offset="0" stop-color="#ABCDEF"/></linearGradient></defs><rect id="crown" width="30" height="20" fill="url(#hat)"/>'},{joint:'chest',svg:'<circle r="5" fill="#112233"/>'}];
    right.costume=[structuredClone(left.costume[1]!),structuredClone(left.costume[0]!)];
    assert.equal(actorVisualFingerprint(left),actorVisualFingerprint(right));
    const values=structuredClone({left,right});actorVisualFingerprint(left);assert.deepEqual({left,right},values);
    right.costume[0]!.svg='<circle r="6" fill="#112233"/>';assert.notEqual(actorVisualFingerprint(left),actorVisualFingerprint(right));
  });
  await t.test('kind/proportions/stroke/colors differ; role/name/evidence alone do not change rendered input identity',()=>{
    const same=structuredClone(b);same.name='Deliberate twin';same.role='another sourced role';assert.equal(actorVisualFingerprint(a),actorVisualFingerprint(same));
    for(const key of ['kind','headScale','bodyScale','strokeWidth','accent'] as const){const other=structuredClone(b);if(key==='kind')other.kind=a.kind==='stick-man'?'mini-robot':'stick-man';else if(key==='accent')other.appearance.accent='#123456';else other.appearance[key]+=.1;assert.notEqual(actorVisualFingerprint(a),actorVisualFingerprint(other),key);}
  });
  await t.test('null primary, supporting pairs, no cast and separated shots warn only when co-present',()=>{
    const x=structuredClone(s);x.cinematic!.actorScene!.primary=null;assert.deepEqual(castDesignAdvisories({shots:[x]}),[]);
    const third=structuredClone(x.cinematic!.actorScene!.supporting[0]!);third.character.id='third';third.character.name='Third';x.cinematic!.actorScene!.supporting.push(third);assert.equal(castDesignAdvisories({shots:[x]}).length,1);
    const y=structuredClone(s);y.id='second';y.cinematic!.actorScene!.primary=b;y.cinematic!.actorScene!.supporting=[];const first=structuredClone(s);first.cinematic!.actorScene!.supporting=[];
    assert.deepEqual(castDesignAdvisories({shots:[first,y]}),[]);delete y.cinematic!.actorScene;assert.deepEqual(castDesignAdvisories({shots:[y]}),[]);
  });
  await t.test('shot/cast ordering gives sorted pairs and aggregated copresence once per distinct identity',()=>{
    const x=structuredClone(s),y=structuredClone(s);x.id='z';y.id='a';const extra=structuredClone(cast.supporting[0]!);extra.character.id='third';extra.character.name='Third';for(const shot of [x,y])shot.cinematic!.actorScene!.supporting.push(structuredClone(extra));
    const board={shots:[x,y]},first=castDesignAdvisories(board),reversed=structuredClone(board);reversed.shots.reverse();for(const shot of reversed.shots)shot.cinematic!.actorScene!.supporting.reverse();
    assert.equal(first.length,3);assert.deepEqual(castDesignAdvisories(reversed),first);for(const warning of first){assert.deepEqual(warning.shotIds,['a','z']);assert.equal(warning.shotId,'a');}
    const duplicate=structuredClone(s);duplicate.cinematic!.actorScene!.supporting.push(structuredClone(cast.supporting[0]!));assert.equal(castDesignAdvisories({shots:[duplicate]}).length,1);
  });
  await t.test('unsafe costume fails closed without mutation rather than emitting an advisory',()=>{
    for(const svg of ['<script>alert(1)</script>','<circle onload="x" r="2"/>','<image href="https://example.invalid/a"/>','<rect width="2" height="2" fill="url(https://example.invalid/a)"/>']){
      const board=structuredClone(f.board);board.shots[0]!.cinematic!.actorScene!.supporting[0]!.character.costume=[{joint:'chest',svg}];const snapshot=structuredClone(board);assert.throws(()=>castDesignAdvisories(board),/SVG|forbidden|executable|unsupported|foreign/i);assert.deepEqual(board,snapshot);
    }
  });
  await t.test('ruleReview includes precise nonblocking medium feedback and preserves locks/source',async()=>{
    const warnings=await ruleReview(f.root,f.config,f.board,f.story,f.characters,f.manifest);
    const selected=warnings.filter(i=>i.type==='cast-design-similarity');assert.equal(selected.length,1);assert.equal(selected[0]!.severity,'medium');assert.equal(selected[0]!.shotId,s.id);assert.deepEqual(f.board,before);assert.doesNotThrow(()=>assertActorLocks(before,f.board,locks));
  });
  await t.test('public creative report and configured storyboard request seed advisories preserve intentional resemblance/locks',async()=>{
    const context={story:f.story,narration:f.narration,beats:[f.beat],characters:f.characters,profile:f.profile,rig:f.rig};
    const offline=await createCreativeStoryboard(f.root,f.config,f.router,context,f.board,[]);
    assert.deepEqual((await readJson<any>(path.join(f.root,'work/creative-direction-report.json'))).visualAdvisories,castDesignAdvisories(offline));
    f.config.models.storyboard.provider='gateway';const router=new ModelRouter(f.config,f.root);let calls=0;
    router.structured=async(role,request,schema)=>{calls++;assert.equal(role,'storyboard');const data=request.context as any;assert.deepEqual(data.seedVisualAdvisories,castDesignAdvisories(f.board));assert.deepEqual(data.lockedActors,[a,b]);return schema.parse(f.board);};
    const board=await createCreativeStoryboard(f.root,f.config,router,{...context,lockedActors:[a,b]},f.board,[s]);
    assert.equal(calls,1);assert.deepEqual(board.shots[0],s);assert.doesNotThrow(()=>assertActorLocks(before,board,locks));
    const report=await readJson<any>(path.join(f.root,'work/creative-direction-report.json'));assert.equal(report.origin,'model');assert.equal(report.visualAdvisories.length,1);assert.equal(hash(f.board),hash(before));
    await writeJson(path.join(f.root,'input/art-direction.json'),{identity:creativeInputIdentity(f.narration,[f.beat],f.profile,f.rig),storyboard:f.board});
    const authored=await createCreativeStoryboard(f.root,f.config,router,context,f.board,[s]);assert.deepEqual(authored.shots[0],s);assert.equal(calls,1);
  });
});