# Source language and renderer migration

The steam comparison's built-in component labels now follow the language of its sourced comparison. English uses `cylinder` / `condenser`; Vietnamese uses `xi-lanh` / `bình ngưng`. The comparison takes precedence over inherited state citations in another language. Narration and source quotations are unchanged. This is support for these specific sourced diagrams, not certification of general Japanese/Korean content analysis.

`CINEMATIC_MODEL_VERSION=cinematic-models-2.2.1` belongs to both the project visual fingerprint and cinematic scene identity. It is excluded from the narration fingerprint. An unlocked scene is regenerated when this renderer changes. Approved locks still require validation; the application does not silently unlock them.

Gesture diagnostics include the action, expected/received shot clock, object anchor and world target, allowed clip and contact clock. Existing validation rules and pixel tolerance are unchanged. Walking endpoints belong to `performance.walks`; an object target, when required by the action contract, refers to a sourced visualization part.

## Independent evidence

Before the scene-identity correction, another model ran **275/275** scoped tests and test typechecking (exit 0): 122 acting/explanation/citation/pipeline cases and 153 narration/voice/settings/cache/actor contracts. Six new portable tests cover actual English/Vietnamese SVG output and grounding through complete cinematic HTML. A separate two-test held-point investigation passed using public solver/compiler and real GSAP AttrPlugin; it withdrew an incorrect film-review finding rather than changing animation code.

A genuine compiled baseline from commit `7b5155939b5e8220fd418f942872413706ffa890` reached `SCENES_READY`. The same dedicated project resumed through the current exported API with identical effective settings and inputs. TTS used a local HTTP stub returning real PCM containing a tone: **mock speech**, not a pronunciation test. Dependencies were reused through junctions; this was not a clean installation.

The corrected isolation fixture demonstrated:

- Narration fingerprint, original cues, all audio/cache/request bytes and approved character bible unchanged; HTTP request count stayed **3 → 3**.
- Visual invalidation to `TIMED`, storyboard reapproval, preserved character lock and unchanged locked scene.
- **FAIL:** full visual rebuild stopped at `ASSETS_READY`. The unlocked comparison retained the old Vietnamese SVG because the per-scene identity omitted the new model renderer version. Both the stale scene and the direct current English render were inspected.

The missing per-scene field was then added and production build/typechecks passed. **The post-fix independent migration rerun is NOT RUN:** the assigned model hit its usage limit before starting it. Do not report complete migration as passed based on the earlier 275 tests. Original failed attempts remain retained. A first fixture with unequal inherited settings is explicitly excluded from the audio-preservation conclusion.

## Remaining acceptance

Resume the same corrected migration project using the newly built API. Confirm `SCENES_READY`, fresh English comparison HTML, unchanged audio/cache/cues, no TTS requests, and retained approvals/locks. Include real script, SRT, WAV and aligned WAV+SRT edit/resume coverage before declaring the complete product accepted. Actual voice quality, autonomous story direction and full-film aesthetics remain separate gates.

Portable checks for the model responsible for testing:

```powershell
npm.cmd run build
node --import tsx --test --test-concurrency=1 tests/cinematic-model-language.test.ts tests/acting-held-point.test.ts tests/cinematic-acting.test.ts tests/creative-citations.test.ts tests/pipeline.test.ts
npm.cmd run test:typecheck
```
