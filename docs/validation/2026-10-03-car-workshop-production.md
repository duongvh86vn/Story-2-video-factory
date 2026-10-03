# Car workshop artwork production — 2026-10-03

This is an authored seven-shot Vietnamese car film using director2.2.22 / animation2.2.10 through the normal narration, storyboard, assets, scenes, draft, review, final and QC pipeline. It is not output from a successful native creative-model call, an independent runtime test or whole-film aesthetic acceptance. HyperFrames renders the canonical SVG actors with deterministic GSAP animation. Production code for the last artwork resume matches `37401196d027da35013bb2e8d2140964e2be5b6e`; the recovery-gate follow-up was still uncommitted when those processes imported it. Their offline creative configuration does not exercise the new CLI diagnostics.

The model-explanation shot now has a distinct illustrative workshop mechanic, rather than assigning every action to a fixed presenter or a historical inventor. The mechanic approaches, leans, touches the engine with the right hand, holds contact while the model responds, stands and reacts. Expressions progress through curious, effort, thinking and understanding. Historic cutaways and the observer scenes remain in the other shots. The engine-to-wheel visualization retains the narration's qualifier that this is a conceptual relationship, not an exact historical car blueprint.

The robot variant uses the same story and speech with robot actor profiles, shorter strides and a readable face screen. There is no fixed presenter visibility quota. The art direction uses a warm workshop, restrained navy/cream/wood/teal colors and independent stage-sized text for the relation label, so custom SVG aspect ratios do not flatten the label.

## Provenance and retained iterations

All paths below are relative to the worktree under `temp/art-direction-v22/`:

- `story-actor-clarity-car-stick-man-1790998227142`: unchanged source story, script and narration cache.
- `car-workshop-acting-source22-1791018337993`: terminal exit1, authored camera metadata mismatch. Retained unchanged.
- `car-workshop-acting-source22-1791018389092`: terminal exit1, walk gesture missing its world target. Retained unchanged. The target was fixed in a fresh candidate; no production guard was weakened.
- `car-workshop-acting-source22-1791018437596`: third candidate, terminal exit0/DONE, technical QC pass. Final SHA256 `a570b9e5a4d03c869857a8d4407e9d560779c872e5b12572eb2187461ab3611f`. A selected frame revealed a compressed relation label and a window behind the heading; these remain findings on this version.
- `car-workshop-acting-stick-man-source22-1791018963723` and `car-workshop-acting-mini-robot-source22-1791019025459`: distinct complete-film variants. Before window revisions both were terminal exit0/DONE/QC, with unsquashed stage text. Their exact MP4s are retained as `output/final.before-window-placement.mp4` and the earlier authored input as `input/art-direction.before-window-placement.json`.

Changing global `input/art-direction.json` invalidates the visual pipeline while keeping narration valid. Both attempted `resume --shot motion.relationship` calls correctly rejected with “Build all scenes before rebuilding selected shots”; the scenes had to be rebuilt from the changed input. The errors are retained in `car-workshop-source22-window-human-producer-20261003.log` and `car-workshop-source22-window-robot-producer-20261003.log`. No final from an older input is relabeled as current.

Ordinary full resumes then completed exit0/DONE/QC. At18.4s the heading and relation text were clear, but the top of the window remained clipped by the action viewport. Those MP4s and exact input bytes are retained as `output/final.window-placement-v1.mp4` and `input/art-direction.window-placement-v1.json`. A second artwork revision moves the full window lower and reduces its height. Its real producer sessions human38459 and robot64954 both ended exit0/DONE, technical QC pass, voice present, caption mode `both`, duration42,657ms and no remaining project lock. Logs are `car-workshop-source22-window-v2-human-producer-20261003.log` and `car-workshop-source22-window-v2-robot-producer-20261003.log`.

| Variant | Latest final MP4 SHA256 |
|---|---|
| Stick-man | `f2d415b70f5c042283be9b72076d6e363673329e528d8a0b86a2ac2530ba6085` |
| Mini robot | `b65e6e484acbf5d2d6dcc22d541cedb52b70b83ae5a2b434f54a420a24b7dd29` |

The actual latest18.4s producer frames show the full window, clear relation label, legible expression and hand on the engine. This is a selected-frame artwork observation, not a claim about all motion or the complete film. Local durable evidence is `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/producer-car-workshop-20261003/`: `producer-evidence.json`, exact final authored inputs, the helper, design notes and both latest18.4s PNGs. Films and large local artifacts are not committed to Git.

## Narration and technical scope

Both variants retain the same42,657ms /12-segment narration. Read-only SHA256 comparisons against the source show identical `input/script.txt` (`6e5e19f71581315108709f0b0ef0b71bb9928602272ddec5c03f9357c56fb82a`), `work/narration.json` and `work/voiced-narration.json` (`e4a9413d0560fb811b178e28cae47aa11958cdd8d109ff1e00fc7bcc86238160`). The actual speech WAV and voice report agree on `a6d6032ee62a8b1ccc9f67bffd52d255739191819b91c2c78d3b8336758d795b`. Provider is the preconfigured Vietnamese command voice `vi_VN-vais1000-medium`; this is not live HTTP/OmniVoice validation.

The normal scene compiler reports378 sampled frames for the human mechanic and402 for the robot, contact error0 and maximum interpolation gap0.190610px /0.196973px against its0.2px limit. These are producer measurements, not independent browser or visual-quality certification. Mouth activity uses audio RMS, explicitly not phoneme lip-sync.

The parent inspected actual producer frames only to revise its artwork; runtime tests remain delegated to the independent model. Full playback/listening, both topics with both casts, script/WAV/SRT and WAV+SRT, editing/resume/locks, native creative authoring and live local TTS still need their stated acceptance. [Current independent runtime scope](2026-10-03-current-runtime.md), [CLI diagnostics still NOT RUN](2026-10-03-cli-diagnostics.md), [external TTS contract](../EXTERNAL-TTS.md).
