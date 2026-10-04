# Resume and approved scene locks

A scene lock preserves an approved scene. It does not approve a different renderer, artwork projection, scene plan, asset, style, dimensions or speech-activity input.

Before resume resets state or host approval, the pipeline compares every existing locked scene's recorded input identity with the current production identity. `buildScenes` also checks its complete selected batch before publishing assets or rebuilding an earlier unlocked shot. An incompatible or unvalidated locked bundle stops with `locked scene input/renderer conflict`; incomplete bundles and unreadable records also stop. Scene files, narration/cache and approvals are retained. A lock placed before the first scene build may proceed when no approved bundle/record exists.

Choose one explicit resolution:

- Restore the exact approved inputs and renderer, then resume.
- Review the proposed change, explicitly unlock the affected shot or global scene/storyboard lock in Studio/API/CLI, and rebuild. A remaining global or per-shot lock still applies.

The factory does not automatically unlock, rewrite the recorded identity, relabel an old renderer as current, or regenerate TTS to resolve a visual conflict. A compatible lock continues to work. Actor identity locks are checked separately; keeping an actor identity fixed does not require freezing every visual composition.

The earlier `9b94593` migration audit recorded7PASS/3FAIL, including a missing lock conflict. The follow-up preflight is implemented in `packages/scenes/index.ts` and `packages/orchestrator/pipeline.ts`; its independent runtime result belongs in [migration evidence](validation/2026-10-04-renderer-migration.md). Full films, Studio editing and the complete input matrix require their own acceptance evidence.
