/** Optional real, cached faster-whisper acceptance check. No provider API or downloads. */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { ConfigSchema } from '../packages/core/config.js';
import { ingestProject } from '../packages/ingest/index.js';
import { ModelRouter } from '../packages/models/registry.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'story-factory-asr-'));
const sourceText = 'The inventor built a new machine. The machine helped workers in the factory. Each part moved in a clear sequence. The story ends with a useful invention.';
try {
  await fs.mkdir(path.join(root, 'input'));
  await fs.writeFile(path.join(root, 'input/source.md'), `# TITLE\nASR acceptance\n\n# STORY\n${sourceText}\n`);
  const audio = path.join(root, 'input/narration.wav');
  if (process.argv[2]) await fs.copyFile(path.resolve(process.argv[2]), audio);
  else {
    if (process.platform !== 'win32') throw new Error('Supply a WAV path on non-Windows hosts.');
    const script = path.join(root, 'speech.ps1');
    await fs.writeFile(script, `Add-Type -AssemblyName System.Speech\n$voice = [System.Speech.Synthesis.SpeechSynthesizer]::new()\ntry {\n $voice.SelectVoice('Microsoft David Desktop')\n $voice.Rate = -1\n $voice.SetOutputToWaveFile('${audio.replaceAll("'", "''")}')\n $voice.Speak('${sourceText}')\n} finally { $voice.Dispose() }\n`);
    execFileSync('powershell.exe', ['-NoProfile', '-File', script], { windowsHide: true, stdio: 'pipe' });
  }
  const settings = ConfigSchema.parse({ project: { language: 'en' }, asr: { model: process.env.VIDEO_FACTORY_TEST_ASR_MODEL || 'tiny', language: 'en', allow_downloads: false } });
  const { narration } = await ingestProject(root, settings, new ModelRouter(settings, root));
  assert.equal(narration.mode, 'wav'); assert.ok(narration.words.length > 0); assert.ok(narration.durationMs > 0);
  assert.equal(narration.audioPath, 'input/narration.wav');
  const alignment = JSON.parse(await fs.readFile(path.join(root, 'work/ingest/alignment.json'), 'utf8'));
  assert.equal(alignment.downloadsAllowed, false);
  const transcript = narration.segments.map(segment => segment.text).join(' ').trim();
  if (!process.argv[2]) assert.match(transcript, /machine|factory|invention/i);
  console.log(JSON.stringify({ engine: 'faster-whisper', model: settings.asr.model, language: 'en', fixture: process.argv[2] ? 'user WAV' : 'Microsoft David synthetic speech', durationMs: narration.durationMs, segmentCount: narration.segments.length, wordCount: narration.words.length, transcript, wordMethod: 'faster-whisper-attention', downloadsAllowed: false }, null, 2));
} finally { await fs.rm(root, { recursive: true, force: true }); }
