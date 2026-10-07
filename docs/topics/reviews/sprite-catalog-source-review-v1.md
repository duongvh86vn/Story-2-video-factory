# Sprite catalog — source review accumulator

Base `3561c5cb7afb412094e169ac1a12e9d9290c77eb`; implementation `d974dbd44e4cae43bfb68d21041ab9eb02b3bff6`; controller fixes `d8954d7`, `8401278ddfe4064c28b924ca53916b7fb8a21943`. [Plan](../../plans/2026-10-07-sprite-motion-catalog.md), [runtime handoff](../SPRITE-CATALOG-TEST-HANDOFF.md).

Independent reviewer dispatched with exact range, read-only source scope and no assertions/fixtures/browser/API/CLI/model/render/audio/video calls. Controller fresh build/test:typecheck/schema export exit 0, diff check clean. 18 new declarations NOT RUN. Product acceptance remains unproven.

Native reviewer `01a1165d-6dc9-7bb0-9b12-31a096913fc2` returned quota error without a verdict; subsequent close reported handle not found. This is not PASS and no finding is inferred. User-authorized 9router source-only review was dispatched to advertised `ag/gemini-3.8-flash-high`, with bounded diff/plan/context; no image/video generation, runtime test or project production call. Discovery alone proves neither reviewer completion nor generation capability.

The full `ag/gemini-3.8-flash-high` request terminated after fetch timeout at 180 s, with no result. Two distinct bounded source slices (contract/integration and Studio/API/CLI) sent to `ag/gemini-3.8-flash` also terminated at 120 s; neither returned a result. No live handle remains for these requests. No provider error body or credentials were printed. **Independent verdict missing; source gate not passed.** Do not keep retrying the same unavailable review service or relabel timeout as a clean review.

## Controller source findings and corrections

These findings come from controller source inspection, not an independent reviewer or executed test. Preserve them if a later independent verdict is clean.

1. **Important — incomplete Studio listing could remove unseen annotations.** `motionLibraryDialog` fetched catalog/list independently and `motionLibraryDocument` rebuilt entries only from the list. If import+catalog update occurred between GET snapshots, the form could have a current catalog revision but omit an annotated version; saving would remove it. `d8954d7` makes markup require every annotated exact version to be listed and assigns form snapshot only after that check. One regression declaration checks missing version and same ID/wrong fingerprint, NOT RUN. Focused independent re-review still pending.
2. **Minor — creative cache identity used template rather than effective prompt.** `createCreativeStoryboard` included `system` in its hash while sending `generationSystem` with actor family/sprite/movement additions. `d8954d7` hashes the exact sent system. This aligns the local cache with attempt/receipt binding; source inspection only, not proof of runtime cache behavior.
3. **Important — API catalog edit delayed visible invalidation until resume.** The PUT wrote only input JSON. Sprite scenes could become stale via consumed catalog identity, but Studio state and unused/rig visual deliveries could still advertise an old result until production resumed. `8401278` invalidates to TIMED after a successful changed write, retaining narration hash/files and lock data through the existing coordinator. Identical canonical save, rejected stale/busy/corrupt edits do not invalidate. A sixth API declaration uses real state invalidation within its callback to check DONE→TIMED, original audio bytes, locks and unchanged-save behavior, NOT RUN.

Source fixes also replace outdated readiness copy that referred only to a rig; production still requires accepted character art and motion. No gate or art approval is changed.

Runtime declarations now total 13 catalog + 6 API + 1 added canonical case = **20 new cases, NOT RUN**. Independent review and all runtime/art/video acceptance remain pending; working-branch publication, if performed, is candidate handoff only and does not mean merge/production readiness.

## Fresh source verification on `8401278`

- `npm run build`: exit 0, TypeScript core + Studio checking + Vite 7.3.6, 32 modules.
- `npm run test:typecheck`: exit 0; no assertions or callbacks executed.
- `npm run schemas`: exit 0, schema export unchanged after source fixes.
- `git diff --check`: clean before source commit. No runtime/browser/API/CLI/model acceptance/TTS/ASR/MP4 tests executed.

Bounded native/9router review failures remain recorded above. Publishing a candidate branch is not an independent source verdict; next reviewer must inspect `3561c5c..8401278` and these corrections, then report any Critical/Important finding before production acceptance.
