/** Opt-in short tracer through the installed HyperFrames renderer, retaining local evidence. */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProject, runPipeline } from '../packages/orchestrator/index.js';

const destination = path.resolve('temp/acceptance-render');
const root = await createProject(`tracer-${Date.now()}`, { root: destination });
await fs.writeFile(path.join(root, 'input/source.md'), '# TITLE\nThe moving mechanism\n\n# PURPOSE\nShow one clear mechanical movement.\n\n# STORY\nA wheel turns and moves a lever. The lever pushes a sliding block.\n\n# VISUAL STYLE\nTechnical schematic diagram with a clear movement.\n\n# RULES\n- Use the canonical narration clock.\n- Show only the source mechanism.\n');
await fs.writeFile(path.join(root, 'input/narration.srt'), '1\n00:00:00,000 --> 00:00:04,000\nA wheel turns and moves a lever.\n');
await fs.writeFile(path.join(root, 'project.yaml'), 'project:\n  name: short-tracer\n  language: en\nstyle:\n  preset: technical-clean\ncaptions:\n  mode: both\n');
const state = await runPipeline(root);
assert.equal(state.state, 'DONE'); assert.equal(state.error, undefined);
const qc = JSON.parse(await fs.readFile(path.join(root, 'output/qc-report.json'), 'utf8'));
assert.equal(qc.pass, true);
const previews = JSON.parse(await fs.readFile(path.join(root, 'previews/manifest.json'), 'utf8'));
assert.ok(Object.keys(previews.sheetHashes).length > 1);
console.log(JSON.stringify({ root, state: state.state, qc: qc.pass, snapshots: previews.frames.length, sheets: Object.keys(previews.sheetHashes).length, video: qc.video }, null, 2));
