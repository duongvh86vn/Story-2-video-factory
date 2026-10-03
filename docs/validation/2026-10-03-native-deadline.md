# Native production preparation — 2026-10-03

Source `6c1de03b0b1e7d293735478b9d8d4421c48a0b36`. This checkpoint prepares four existing, owned production projects; it does not certify native design, runtime tests or film quality. Their earlier failures, charged attempts and artifacts remain intact.

## Reason for the project setting

Read-only historical `model-calls.jsonl` metadata contains nine completed Codex CLI responses taking more than 600 seconds, with response hashes. The longest router success took 834,604 ms; a structured-output rejection took 730,725 ms; another router success took 693,007 ms. Router success does not imply a semantically accepted storyboard or final film. These observations support allowing longer generation, but do not establish the cause of the six source22 timeouts.

Only the storyboard timeout in these four projects changed from 600,000 to 1,200,000 ms through the normal Studio settings API. Provider remains `codex-cli`, model remains `default`; existing call/cost/retry limits apply. Global defaults, account/auth configuration and other projects were not changed. Each original project YAML, state and journal was backed up before mutation. Replacing the one timeout value in the new YAML recovers the exact original YAML.

## Preparation result

The setting update invalidated analysis to `TIMED`. Ordinary CLI `resume --until ANALYZED` then completed with real exit0 for each project:

| Existing project | State | Native starts before → after | All starts before → after |
|---|---|---|---|
| `native-steam-stick-man-source22-1791014656215` | ANALYZED | 3 → 3 | 10 → 17 |
| `native-car-stick-man-source22-1791014685339` | ANALYZED | 3 → 3 | 11 → 19 |
| `native-steam-mini-robot-source22-1791014711053` | ANALYZED | 0 → 0 | 7 → 14 |
| `native-car-mini-robot-source22-1791014715714` | ANALYZED | 0 → 0 | 8 → 16 |

All newly added planner calls used `mock`; no new native creative call or TTS call ran. Observed narration/script/timeline/audio/cache bytes remained identical. The old journal prefix remained byte-identical, with new mock records appended; the whole journal is therefore intentionally different. Standard rig approval remained true, no project lock remained, and no final MP4 exists in these four projects. Evidence is production preparation, not a cache/resume acceptance test.

## Evidence and next action

Local evidence root: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/native-deadline-preparation-6c1de03-20261003/`. It contains `before.json`, per-project original YAML/state/journals, `preparation.json`, `warm-production.json` and `historical-slow-responses.json`. CLI logs are under `temp/art-direction-v22/<project>-deadline-warm-20261003.log`. The initial preparation guard stopped before any mutation after reading the wrong settings property; `first-preparation-guard.txt` is retained. Preparation used the actual `settings.creativeModel` contract afterward.

At 11:16 UTC the same independent readiness worker still reported usage limit, with availability at 18:30 Asia/Saigon (=11:30 UTC). Readiness remains **NOT RUN**. Reuse the same worker after actual availability for at most one restricted small call. Stop on continued account/access rejection; do not switch accounts/models to bypass limits. A successful small call is only readiness evidence.

Only after readiness should genuine native productions continue in these existing projects. Stickman projects retain exhausted request histories and require the existing explicit `--retry-model-errors` recovery cycle; ordinary resume must not reset their budgets. Robot projects have no prior native call. Retain all new errors and apply existing semantic, identity, contact, source, voice and final gates. Independent diagnostics/default30/browser/input/edit/lock checks and whole-film viewing/listening remain required by [the completion audit](2026-10-03-completion-audit.md).
