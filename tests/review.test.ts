import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { hash, writeJson } from '../packages/core/utils.js';
import { StorySchema } from '../packages/core/schemas.js';
import { renderRecipe, recipes } from '../library/shots/index.js';
import { getStyle } from '../library/styles/index.js';
import { validateSceneFiles } from '../packages/scenes/security.js';
import { reviewProject, ruleReview } from '../packages/review/index.js';
import {captureReviewSource} from '../packages/review/evidence.js';
import { ModelRouter } from '../packages/models/registry.js';
import { config, shot, temporary } from './support.js';

async function reviewFixture(t: TestContext) {
  const root = await temporary(t), settings = config(), planned = shot({ recipeId: 'patent-reveal' });
  const files = renderRecipe(recipes.find(recipe => recipe.id === 'patent-reveal')!, planned, getStyle(settings), 1920, 1080, []);
  const directory = path.join(root, 'scenes/shot001'); await fs.mkdir(directory, { recursive: true });
  for (const file of files.files) await fs.writeFile(path.join(directory, file.path), file.content);
  await fs.writeFile(path.join(directory, 'scene.json'), '{}');
  const masterFiles = ['scenes/index.html', 'scenes/master.js', 'work/master.json'];
  for (const file of masterFiles) { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), 'fixture'); }
  await fs.mkdir(path.join(root, 'previews/shot001'), { recursive: true });
  const fractions = [0, .25, .5, .75, 1];
  const frames = [];
  for (const fraction of fractions) {
    const file = `previews/shot001/f${Math.round(fraction * 100)}.png`; await fs.writeFile(path.join(root, file), 'frame');
    frames.push({ shotId: 'shot001', fraction, timeMs: Math.min(Math.round(4000 * fraction), 3999), path: file, hash: hash(Buffer.from('frame')) });
  }
  const sheetHashes: Record<string, string> = {};
  for (const file of ['previews/contact-sheet-global.jpg', 'previews/shot001/contact-sheet.jpg']) {
    await fs.writeFile(path.join(root, file), 'sheet'); sheetHashes[file] = hash(Buffer.from('sheet'));
  }
  const sources = await Promise.all(['index.html', 'style.css', 'scene.js', 'scene.json'].map(file => fs.readFile(path.join(directory, file))));
  const story = StorySchema.parse({ title: 'The mechanism', story: 'The mechanism moves.', style: { visual: 'Technical' } });
  const storyboard={shots:[planned]},characters={characters:[]},assets={assets:[]};
  for(const [name,value]of Object.entries({'story':story,'storyboard':storyboard,'character-bible':characters,'asset-manifest':assets,'narration':{mode:'srt',durationMs:4000,segments:[{id:'cue',startMs:0,endMs:4000,text:story.story}],words:[]}}))await writeJson(path.join(root,'work',name+'.json'),value);
  const manifest = { sourceInputHash:hash(await captureReviewSource(root,settings,storyboard)),frames, sceneHashes: { shot001: hash(Buffer.concat(sources)) }, masterHash: hash(Buffer.concat(await Promise.all(masterFiles.map(file => fs.readFile(path.join(root, file)))))), global: 'previews/contact-sheet-global.jpg', sheetHashes };
  await writeJson(path.join(root, 'previews/manifest.json'), manifest);
  return { root, settings, files, planned, manifest, story, storyboard: { shots: [planned] }, characters: { characters: [] }, assets: { assets: [] } };
}

test('scene validator rejects runtime, remote resources, unscoped CSS and oversize code', async t => {
  const { files, planned } = await reviewFixture(t);
  assert.deepEqual(validateSceneFiles(files, planned), []);
  for (const payload of [
    { path: 'scene.js', text: '\nfetch("https://example.com");' },
    { path: 'scene.js', text: '\nsetInterval(()=>{},100);' },
    { path: 'scene.js', text: '\ntl.to("body", {opacity:0},0);' },
    { path: 'style.css', text: '\nbody{color:red;}' },
    { path: 'style.css', text: '\n@import "https://example.com/style.css";' },
    { path: 'index.html', text: '<img src="https://example.com/remote.png" onload="alert(1)">' }
  ]) {
    const unsafe = structuredClone(files); unsafe.files.find(file => file.path === payload.path)!.content += payload.text;
    assert.ok(validateSceneFiles(unsafe, planned).length > 0, payload.text);
  }
  assert.ok(validateSceneFiles(files, planned, 100).some(error => /max_scene_bytes/.test(error)));
});

test('rule review detects unknown identity and numeric claim outside source', async t => {
  const fixture = await reviewFixture(t); fixture.planned.characters = ['unknown']; fixture.planned.textOnScreen = '99 percent';
  const issues = await ruleReview(fixture.root, fixture.settings, fixture.storyboard, fixture.story, fixture.characters, fixture.assets);
  assert.ok(issues.some(issue => issue.type === 'character-continuity' && issue.severity === 'high'));
  assert.ok(issues.some(issue => issue.type === 'story-accuracy' && issue.severity === 'high'));
});

test('review reports rule-only limitations and rejects mutated contact sheets', async t => {
  const f = await reviewFixture(t), router = new ModelRouter(f.settings, f.root);
  const review = await reviewProject(f.root, f.settings, router, f.storyboard, f.story, f.characters, f.assets);
  assert.equal(review.mode, 'rule-based'); assert.match(review.warnings.join(' '), /not been inspected/);
  await fs.writeFile(path.join(f.root, 'previews/shot001/contact-sheet.jpg'), 'changed');
  await assert.rejects(reviewProject(f.root, f.settings, router, f.storyboard, f.story, f.characters, f.assets), /contact sheet changed/i);
});

test('review requires distinct fractions and correct timestamps for each shot', async t => {
  const f = await reviewFixture(t); f.manifest.frames[4] = f.manifest.frames[0]!;
  await writeJson(path.join(f.root, 'previews/manifest.json'), f.manifest);
  await assert.rejects(reviewProject(f.root, f.settings, new ModelRouter(f.settings, f.root), f.storyboard, f.story, f.characters, f.assets), /snapshot.*(?:coverage|timing)|duplicate snapshot/i);
});

test('vision review rejects out-of-batch issues and bare failure', async t => {
  const f = await reviewFixture(t);
  for (const result of [ { pass: false, issues: [{ shotId: 'other', type: 'crop', severity: 'high', description: 'Cropped', repair: 'Adjust' }], warnings: [] }, { pass: false, issues: [], warnings: [] } ]) {
    const router = { supportsVision: () => true, review: async () => ({ text: JSON.stringify(result) }) } as unknown as ModelRouter;
    await assert.rejects(reviewProject(f.root, f.settings, router, f.storyboard, f.story, f.characters, f.assets), /unknown\/out-of-batch|without an actionable/);
  }
});
