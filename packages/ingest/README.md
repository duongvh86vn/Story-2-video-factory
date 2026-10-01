# Ingest implementation (V2.1)

`prepareInput` selects script/wav/srt and writes an untimed input document. `parseScript` normalizes UTF-8 TXT/MD as data, preserves original/source lines and words, and creates <=120-character chunks without splitting words. This step creates no speculative timestamps. `packages/voice` synthesizes script chunks, measures actual durations and creates canonical narration/timeline; SRT fitting is a separate branch.

Selected narration is authoritative. `source.md` is optional supplemental data in narrated-explainer mode; legacy mode keeps the former source-driven contract. `narratedStory` refreshes supplements without regenerating voice. See BUILD-SPEC.md for selected-file precedence, voice blockers and runtime acceptance status.


Public imports from `packages/ingest/index.ts`:

```ts
parseMarkdown(source: string, config?: FactoryConfig): Story
parseMarkdownDocument(source: string, config?: FactoryConfig): MarkdownDocument
ingestProject(projectRoot: string, config: FactoryConfig, router: ModelRouter): Promise<{ story: Story; narration: Narration }>
parseSrt(source: string): Narration
parseSrtDocument(source: string): SrtDocument
parseSrtTimestamp(value: string, line?: number): number
serializeSrt(segments: Narration['segments']): string
formatSrtTimestamp(ms: number): string
characterId(name: string): string
probeAudio(audioPath: string, options?: IngestCommandOptions): Promise<AudioProbe>
reconcileAudioDuration(cueEndMs: number, audioDurationMs: number, toleranceMs: number): number
validateNarration(value: unknown, config?: FactoryConfig): Narration
```

Markdown parsing is synchronous and deterministic, with ATX/setext headings,
fenced-code awareness, optional YAML front matter, template and English/Vietnamese
section aliases, nested character descriptions and explicit immutable/mutable
traits. Unknown narrative/chapter headings and their prose are retained. Character
IDs use ASCII slugs or Unicode code points to satisfy the shared ID schema. Explicit
ASCII IDs (`id:` or `{#id}`) win. Duplicate IDs gain numeric suffixes. Raw source and
UTF-16 section offsets are returned by `parseMarkdownDocument` and persisted in
`work/ingest/source.json`. The source is not rewritten by a model.

Series aliases: `SERIES` is title, `VISUAL IDENTITY` / `CAMERA LANGUAGE` are visual
style, `RECURRING HOST CHARACTER` is characters, and `FORBIDDEN` is rules. Unnamed
prose is never used as a character name. An explicit asset instruction such as
“Use the approved An SVG poses” grounds name `An` and ID `an`; the complete source
description and “Keep … fixed” instruction are preserved. Ambiguous unnamed
characters are omitted for the analyst to resolve.

SRT accepts UTF-8 BOM, CRLF/LF/CR, comma/dot fractions (1–3 digits), multiline text,
surrounding timestamp whitespace, optional positive indexes, and timing records
split over up to three lines. Source cue indexes and missing-separator / duplicate
index diagnostics live in `work/ingest/subtitles.json`. Invalid timestamps, empty
cues, reversed intervals, out-of-order cues and overlaps throw `SrtParseError`
with source line and cue information. Adjacent cues are allowed. Text line
whitespace is preserved; line endings are canonicalized to LF. Generated SRT uses
millisecond comma timestamps.

Runtime artifacts:

- `work/story.json`, `work/narration.json`, `work/timeline.json` on success.
- `work/narration.srt` for WAV-only input; supplied subtitles are never rewritten.
- `work/narration.aligned.json` for SRT+audio and precision WAV transcription.
- `work/ingest/source.json`, `subtitles.json`, `audio-probe.json` as applicable.
- `work/ingest/attempts.jsonl` contains stage attempts, argv, exit codes, stderr,
  launch errors and timeouts. Each ASR run also retains UUID-named cue/result/
  alignment JSON; `work/ingest/alignment.json` is the latest successful evidence.

`timeline.json` includes canonical segments/cues, words, duration, gaps, leading
and trailing uncued duration, and audio duration. “Silence” fields mean uncued
timeline intervals, not a signal-level silence detector. The full probed audio
duration is retained, even when the last cue ends early. Cues may extend past audio
only by `audio.duration_tolerance_ms`; the total duration is the maximum of the
audio duration and the original cue end. No cue is shifted, stretched or clamped.
The configured maximum rendering duration is enforced.

## Python interface

Provision the dependencies and model assets separately. This implementation does
not install packages or download weights. Runtime defaults to offline/cached-only.
Requirements: `scripts/requirements.txt` for faster-whisper;
`scripts/requirements-whisperx.txt` adds WhisperX 3.7.4. WhisperX also needs a cached
language-specific Wav2Vec2 model and NLTK `punkt_tab` data. CUDA device selection
requires the matching installed PyTorch/CTranslate2 GPU libraries.

WAV transcription (command examples are documentation, not executed checks):

```powershell
python scripts/asr.py --audio narration.wav --output narration.json --engine faster-whisper --model small --device cpu --compute-type int8 --language vi
python scripts/asr.py --audio narration.wav --output narration.json --engine whisperx --model small --device cpu --compute-type int8 --language vi
```

Forced alignment only, using the cue JSON emitted by the TypeScript SRT parser:

```powershell
python scripts/asr.py --audio narration.wav --cues-json cues.json --output narration.aligned.json --diagnostics alignment.json --language vi --align-model D:/models/wav2vec2-vi
```

`cues.json` is `{ "segments": [{ "id": "seg001", "startMs": 1000,
"endMs": 3000, "text": "Authoritative subtitle text" }] }`. `--cues-json` forces
WhisperX regardless of `--engine` and never loads or invokes transcription.
TypeScript automatically selects this path whenever both audio and SRT exist.
`asr.align: true` chooses WhisperX transcription+alignment for WAV-only input.
WhisperX transcription uses a custom public VAD subclass backed by the packaged
faster-whisper ONNX model, avoiding the built-in torch.hub repository loader.

Additional flags: `--duration-ms` (already probed by TS; absent means Python calls
ffprobe), `--tolerance-ms` (default 500), `--batch-size` (default 8),
`--allow-downloads` (explicit standalone runtime opt-in only). Python emits a JSON
summary on stdout; third-party progress goes to stderr. Diagnostics are written
on success and failure except invalid argument/output collisions.

Exit codes: `0` success, `2` arguments/input/cue validation, `3` missing dependency
or required offline resource, `4` transcription/alignment/model/inference failure,
`5` media probe/decode failure, `6` diagnostic persistence failure. Argparse also
uses `2` for syntax errors.

Environment settings (first nonempty value wins):

| Setting | Priority |
| --- | --- |
| Python executable | `VIDEO_FACTORY_PYTHON`, `PYTHON_PATH`, `python` |
| ffprobe executable | `VIDEO_FACTORY_FFPROBE`, `FFPROBE_PATH`, `ffprobe` |
| FFmpeg executable (WhisperX decode) | `VIDEO_FACTORY_FFMPEG`, `FFMPEG_PATH`, `ffmpeg` |
| ASR script | `VIDEO_FACTORY_ASR_SCRIPT`, repository `scripts/asr.py` |
| Alignment model | `VIDEO_FACTORY_ALIGN_MODEL`, WhisperX language default |
| ASR timeout | `VIDEO_FACTORY_ASR_TIMEOUT_MS`, 1800000 ms |

Executable settings contain one executable path, not a shell command. Paths with
spaces work through argv spawning. Python runs with UTF-8 and no bytecode caches.

Alignment words must have a positive backend confidence, real dictionary
letter/number CTC character evidence, scored endpoints, no overlaps, and remain
within their original cue. Interpolated or unsupported words are skipped with
diagnostics. A cue with no backed words fails alignment. Original segment text,
IDs and timings are checked again in TypeScript. Faster-whisper WAV-only words
come from its real attention-based timestamps; no interpolation is added.

## Boundaries and verification

Shared core schemas are unchanged and no schema addition is required. Full raw
Markdown, source cue indexes, confidence/method/character evidence and per-cue
coverage remain sidecars because the current Story/Narration schemas omit these
fields. Consumers needing them can use the document API or sidecars.

This parser does structural extraction; arbitrary prose entity discovery is left
to story analysis. Alignment may be partial for out-of-vocabulary words/numbers,
bad audio or incorrect cue text; diagnostics expose this instead of inventing
word timing. Existing canonical artifacts can remain from an older successful run
if a later ingest fails; consumers must check the latest ingest attempt/state.

Only compilation/typechecking is permitted for this work. No tests, runtime
smoke checks, ASR inference, ffprobe execution, dependency installation or model
downloads were performed during implementation.

Primary integration references: [faster-whisper API](https://github.com/SYSTRAN/faster-whisper),
[WhisperX 3.7.4 alignment API](https://github.com/m-bain/whisperX/blob/v3.7.4/whisperx/alignment.py),
[WhisperX custom VAD contract](https://github.com/m-bain/whisperX/blob/v3.7.4/whisperx/asr.py),
and [ffprobe documentation](https://ffmpeg.org/ffprobe.html).

Implementation files: `packages/ingest/index.ts`, `markdown.ts`, `srt.ts`,
`audio.ts`, `process.ts`, this README, `scripts/asr.py`,
`scripts/requirements.txt`, `scripts/requirements-whisperx.txt`.

Compilation record (2026-09-30; shared workspace is changing concurrently):

```powershell
# Exit 0: standalone ingest modules and their shared core dependencies.
node node_modules/typescript/bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --noUncheckedIndexedAccess packages/ingest/markdown.ts packages/ingest/srt.ts packages/ingest/audio.ts packages/ingest/process.ts

# Exit 1: index import graph; only registry.ts:84 TS2345 and :124 TS2554.
node node_modules/typescript/bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --noUncheckedIndexedAccess packages/ingest/index.ts

# Exit 0: source compilation only; no script execution or cache files.
python -c "from pathlib import Path; p=Path('scripts/asr.py'); compile(p.read_text(encoding='utf-8'), str(p), 'exec'); print('Python source compilation passed; no code executed and no cache written')"

# Exit 1 at last whole-project snapshot: server unknown-error typing, remote
# asset RequestOptions.autoSelectFamily, and unfinished audio/QC imports.
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```

No ingest TypeScript error was reported by either full-project or index-graph
checks. Dependencies outside the assigned paths were not changed to repair their
concurrent compile errors. Runtime behavior is implemented but unverified under
the user's explicit prohibition on tests and smoke checks.
