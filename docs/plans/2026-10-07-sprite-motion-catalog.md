# Sprite Motion Catalog Implementation Plan

> **For agentic workers:** Execute inline with source review after the coupled change. Runtime test steps are delegated to the user's test model; do not run their callbacks here.

**Goal:** Give Director and Studio a reusable, explicit motion library for story actors, instead of requiring motion IDs to be hand-coded into every storyboard.

**Architecture:** `input/motion-catalog.json` annotates exact immutable motion versions with action capabilities. A verified snapshot exposes native timing, view, reference identity and measured frame/landmark bounds to Director. Catalog declarations remain candidate metadata; selection neither approves art nor unlocks final/speech/props gates.

**Tech Stack:** TypeScript/Zod, existing immutable motion loader, Fastify Studio, existing settings/revision and pipeline/cache mechanisms.

## Global Constraints

- Three main inputs remain script verbatim, WAV original audio/clock, story to faithful script; EN/VI/JA/KO and external TTS remain in scope.
- Lila/Karo are actors in story events; preserve source names/roles and original visual references. No hard-coded hunting episode or presenter.
- Do not edit protected checkout D:/github/Story-2-video-factory2.1 or unrelated art/scratch.
- Runtime/assertions/fixtures/browser/render/MP4/model/TTS/ASR tests are delegated. Prepare meaningful test declarations; run build/test:typecheck/schema export/diff checks only.
- Imported motion bytes/fingerprints are immutable. Catalog capabilities and reference hashes do not prove anatomy, acting or acceptance. Candidate final/speech/rig-prop/continuous-handoff blockers remain.
- Engineering choice: optional `presentation.actor_renderer` selects `rig` or `sprite`. Absent field keeps existing authored/legacy behavior. Explicit sprite mode requires catalog-backed sprite plans for actor shots; no silent fallback. Object-only cutaways remain allowed.
- Fixed input catalog path, bounded 2 MiB JSON and <=256 entries. Optimistic revision prevents overwriting edits. Missing catalog is empty; malformed, unknown, corrupt or conflicting declarations fail explicitly.
- No dependency install or image/video generation/acceptance calls for this source implementation. An independent source-only agent through the user's authorized 9router is allowed if the native reviewer is unavailable; record its actual result separately from runtime/model acceptance.

---

### Task 1: Verified catalog and selection contract

**Files:** Create `packages/motion/catalog.ts`, `packages/motion/catalog-schemas.ts`; test `tests/sprite-motion-catalog.test.ts`.

**Interfaces:** `loadSpriteMotionCatalog(root): Promise<SpriteMotionCatalogSnapshot>`; `saveSpriteMotionCatalog(root,document,revision:string|null): Promise<SpriteMotionCatalogSnapshot>`; `validateSpriteCatalogSelection(board,snapshot,renderer?:'rig'|'sprite'):void`.

- [x] Define versioned entries `{motionId,fingerprint,label,capabilities}`; capabilities use supported acting kind/movement/operation. Reject duplicates/inconsistent movement or operation; no speech/unsupported claim.
- [x] Load exact immutable descriptors, produce compact entries with actorId/state/view/referenceHash/native duration/playback/frame bounds/common landmark names. Preserve original document ordering/data; use fingerprint keys, no guessed semantics from state names.
- [x] Save only after exact revision and descriptor validation, with bounded atomic write. Reject stale revision; don't modify motion manifests, narration, locks or acceptance.
- [x] Bind every selected sprite clip to the exact entry/actor/state/capability. Explicit rig rejects sprite; explicit sprite rejects rig actor shots, missing catalog or missing sourcedAction. Absent mode/no catalog retains earlier authored opt-in.
- [x] Declare cases for empty/malformed catalog, limits, duplicate versions, corruption, revision conflicts, exact capability/actor/state binding and no automatic acceptance. Commands are delegated: `node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-catalog.test.ts`.

### Task 2: Director, cache and resume identity

**Files:** Modify `packages/core/config.ts`, `packages/director/creative.ts`, `packages/orchestrator/pipeline.ts`, `packages/orchestrator/settings.ts`, `library/schemas/index.ts`, `packages/motion/scene-source.ts`, `packages/scenes/index.ts`, `library/shots/cinematic.ts`. Existing `library/prompts/creative-director.md` remains unchanged; explicit image-motion instructions compose into the request only when selected.

- [x] Add optional renderer setting and public patch field. Sprite mode requires narrated story-cinematic actors; absent field does not add a default key to old configs.
- [x] Director request includes verified compact library and explicit native playback/source rules. Normalization checks selections for model, authored, cache, reused and locked shots; no state-name guessing, action rewrite or synthetic rig choreography under sprite.
- [x] Include catalog snapshot identity in planning/pipeline visual fingerprint only when catalog is present or sprite explicitly selected. Keep narration fingerprint separate; changing catalog must retain valid audio and existing locks.
- [x] Export catalog schema and prepare async cache/selection/config compatibility cases. Source commands: `npm run build`, `npm run test:typecheck`, `npm run schemas`.

### Task 3: Studio/API/CLI library access

**Files:** Modify `apps/server/index.ts`, `apps/studio/src/api.ts`, `apps/studio/src/main.ts`, `apps/cli/index.ts`; create UI helper if it keeps the form out of main.ts; test API declarations in `tests/sprite-motion-catalog-api.test.ts`.

- [x] API GET/PUT `/api/projects/:name/motions/catalog` returns verified document/revision/compact entries; PUT strict body `{catalog,revision}`, uses existing mutation/idle guard and returns revision conflict clearly. No path/provider/account input. Changed writes invalidate visuals immediately to TIMED; identical/rejected edits do not.
- [x] CLI `motion-catalog <project>` reads verified JSON; configure exposes renderer selection using the same settings contract.
- [x] Studio offers movement-from-images selection and a library editor: list imported versions, preview link, label and supported action selectors; save only deliberate annotations with their catalog revision. Mark candidate and production pending; keep technical IDs/hashes in optional details.
- [x] Prepare API busy/stale/missing/corrupt/strict-body/invalidation and incomplete-listing tests; no live production API calls. UI capture remains delegated because browser runtime test is not authorized in implementation turn.

### Task 4: Source review, handoff and product continuation

- [x] Fresh build/typecheck/schema export/diff checks on `8401278`; no runtime callbacks.
- [ ] Independent bounded source review: dispatched but no verdict (native quota, 9router timeouts). Controller fixed its three source findings; focused independent re-review still pending.
- [ ] Record exact commits, findings, test declarations NOT RUN and commands/environment; push authorized working branch only, no PR required. If independent review is unavailable, candidate handoff may still be published after controller source inspection and fresh build/typecheck/schema checks; label review pending, do not merge or call it a passed gate. This is an engineering handoff within the user's authorized GitHub update, not an exception to product acceptance.
- [ ] Continue actual Lila/Karo motion art/views, art and motion acceptance receipts, mouth/speech, prop/contact/handoff and full three-input runtime video acceptance. Catalog alone does not satisfy the active goal.

**Unresolved product decisions:** Which video-generation provider can supply the first full-body clips remains pending actual account/capability evidence. The catalog accepts imported assets independently, so this does not block source implementation. No motion quality approval is inferred from the user's acceptance of original character images.

## Source checkpoint before review

Tasks 1–3 source is written: bounded revisioned catalog, exact actor/version/state/capability selection, consumed scene catalog identity, visual pipeline/planning fingerprint, explicit renderer guard, API/CLI and Studio library form. Missing explicit image library fails before model/TTS; no artifact quality is approved. Absent renderer and absent catalog preserve previous request/fingerprint shape.

Prepared 12 catalog cases, 5 API cases, and one extra canonical renderer case: 18 new declarations, **NOT RUN**. Fresh build/test:typecheck/schema export exit 0, diff check clean. Runtime/browser/CLI/API/model/video tests remain delegated, source review and authorized push still pending at this checkpoint.

## Source follow-up

`d8954d7` checks complete UI snapshots before editing and hashes the actual Director system prompt. `8401278` marks previous visuals stale on a changed catalog save, preserving narration/locks; identical/rejected saves do not invalidate. Two additional declarations bring the total to 20, NOT RUN. Native review quota and three 9router review timeouts yielded no independent verdict; [accumulator](../topics/reviews/sprite-catalog-source-review-v1.md) retains controller findings and pending review status. Candidate working-branch handoff does not satisfy art/runtime/video acceptance or the active product goal. Checked boxes above mean source written/verified to their stated scope; none means runtime acceptance.
