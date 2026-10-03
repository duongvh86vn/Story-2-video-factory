# Independent current runtime follow-up — 2026-10-03

These scoped checks cover source `76ac9e33acd4e3317c7a0c190c5589435c2704c0`, followed by two production fixes. They do not certify whole-film quality, every input/edit path or live external TTS. Runtime work was delegated to independent testing models; the implementation parent ran build/typechecks only.

## Acting and supported seating

Final new cases passed **64/64**; unchanged animation/acting/props/staging/story-actor regressions passed **135/135**. Initial 38/64 and intermediate 60/64 runs remain retained. Corrections supplied valid current-schema fixtures, exact normalized prop origins and equivalent focus selectors in the attribute harness; production guards and assertions were not relaxed.

Public compiler/render APIs covered both rigs, selected hands, bilateral contact, crouch/lean, carried model overlays, supported sit/hold/stand, shared stage, seat ownership and continuous cuts. Secured generated Scene JS used actual pinned GSAP with random/reverse seeks. Numeric attribute targets are a controlled harness, not browser DOM/CSS or movie quality certification.

The audit's whole test typecheck failed because `renderCinematic`'s return annotation omitted `seatSupportVersion`. The parent added optional `seatSupportVersion` and `seatSupports` without changing runtime output. Subsequent parent build and whole test typecheck passed, followed by an independent whole test typecheck pass. All 226 original audit files retained identical hashes; every owned runtime process was terminal before freeze release.

Local evidence: `acting-runtime-76ac9e3-20261003/report.md`, source inventories, raw runs, typecheck failure, generated Scene files and process receipts under `task-state/story-video-v22`. Executable audits are `tests/acting-transport.test.ts`, `tests/seated-acting.test.ts`, `tests/host-rig-migration.test.ts` and `tests/model-explicit-retry.test.ts`. The earlier pending draft remains untouched as history.

## Genuine baseline migration

The second worker archived and compiled actual baseline commit `7b5155939b5e8220fd418f942872413706ffa890`, then generated a pristine project through `SCENES_READY`. Dependencies were reused through junctions; this was not a clean installation. Authenticated byte-identical copies supplied locked/unlocked branches, with unchanged input/config/voice settings.

All **17 migration checks passed** on `76ac9e3`. The unlocked branch retained host approval, required storyboard reapproval and rebuilt through `SCENES_READY`, with actual English cylinder/condenser SVG labels and current scene identities. The locked incompatible plan stopped with an explicit version conflict; locked artifacts remained unchanged. Neither branch changed narration fingerprints, original audio/cache/cue bytes, canonical approved custom-host files or characterBible lock. HTTP TTS count stayed **3→3**. Its service supplied PCM tone WAV, not speech. The pristine baseline remained immutable.

The historical stale-scene and d882 host-approval failures remain retained. The fresh probe verifies specific scene-identity/stable-rig fixes; full legacy-project migration and final media remain outside scope. Local evidence: `recovery-migration-76ac9e3-20261003/REPORT.md`, archive/build, all-file hashes, public-pipeline progress, rebuilt SVG and terminal process receipts.

## Retry integrity failure and repair

Original broad run: **88/89 pass, exit 1**. Original targeted run: **35/36 pass, exit 1**. Their only failure was `retryOf journal integrity rejects missing-completion-marker`; a compiled-public-API proof reproduced it. Removing a completed retry's marker bypassed validation. Raw failures and valid/malformed journals remain retained.

The parent repaired parsing to compare a retry completion with its started record even when completion omits `retryOf`; changed markers and request hashes also reject. Legacy records without retry boundaries remain supported. No history, budget, assertion or failure artifact changed. Build and whole test typecheck passed.

Independent follow-up on HEAD76ac9e3 plus exactly the journal fix and report annotation passed **36/36 targeted, 92/92 broad**, whole test typecheck and the byte-identical compiled-public-API proof, all exit0. The broad command is unchanged; three cases already added at the earlier handoff explain92 versus the historical89. Targeted cases are included in92, not additional coverage. The unchanged malformed-journal proof now reports `readerRejected=true`; this specific failure is closed. The requestHash guard was read in source/dist, without a new requestHash-only assertion. All26 observed process identities were terminal; source/dist/test fingerprints and old FAIL evidence remained immutable during the audit.

Evidence: `journal-fix-audit-76ac9e3-20261003T083554Z/REPORT.md`. SHA256 journal source `F8BF3E425627DD1F9E5EBF6722330F9F3D6896013E48A1556FA03FBD87ECA547`, compiled journal `9DF55753B1BB17747E9CCDD1D608ECF9903C14F88FA441E7420A5DCE27A185D5`, cinematic source `6787A71F1B5063ABE279591BFFFB9EFB97728C28DCA4F69127BDD109FD13F175`. No migration/TTS/artwork rerun was performed after this repair.

## Remaining product acceptance

Browser SVG fidelity, whole-film anatomy/expressions/pacing/readability, native steam/car with both rigs, current three-flow/edit/resume/locks matrix, Vietnamese ASR and live OmniVoice/custom API/JA/KO pronunciation remain open. Native source22 steam/car stickman productions each exhausted three real600s attempts with timeout, ending exit1/ANALYZED; both CLI sessions are terminal. No accepted storyboard/final exists from these runs; prepared robot projects have not called the provider. Offline, authored and native provenance remain distinct.
