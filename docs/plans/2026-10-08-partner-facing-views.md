# Partner-facing fixed-view candidate registration

Base `2a7bd5ead00d66dff78789745506257a4ee96991`. Previous goal turn published actual source-colour layer integration, a source-review PASS and static matte figures; that is progress, not complete video acceptance. The full goal remains script/WAV/story→faithful acting video, EN/VI/JA/KO and external/local TTS, with Lila/Karo inside stories.

## Evidence and work

- Current rig registers only `three-quarter-right`, although hash-bound Lila leftv2 and Karo leftv1 PNGs exist. Static four-view authoring figure shows true directional faces, but proportions/ponytail/costume/neck vary; no artwork approval.
- Measure and author candidate left-view neck/belt/shoulder/hip/chin/head and garment masks in actual output pixel coordinates. Keep native PNGs unchanged and retain canonical physical limb lengths. Do not mirror right-facing garment/hair or infer anatomy from model coordinates.
- Add explicit left/right fixed-view profile registration without breaking existing `bodyViewRegistration` right entries. Scene assets/head/body/near-far slots/cache must select the exact actor+view. Lunge remains right-only until separately authored; do not silently substitute right for left.
- Correct fixed-view facing validation and knee branch direction using the selected registration. Preserve existing right behavior, source colour source-only, generic/legacy behavior, narration and original plan clocks.
- Expose both registered views in body inspection and static registration workbench. Paired still authoring demonstrates the source layer/view layout only; it is not continuous animation, speech/gaze tracking, episode rendering or production approval.
- Add delegated declarations for left registration/assets/facing/layers, source lengths, right compatibility, unsupported lunge/motion/speech/view-turn rejection and canonical resources. Controller runs build/typecheck/schema export plus bounded read-only source review; runtime/body evaluator/GSAP/browser/API/audio/MP4 remain delegated.
- Publish exact source/figure/measurement evidence, remaining art/pose/view/acting/voice/receipts/three-input acceptance, and startup/test commands. Keep `productionReady=false`, `productionRig=null` and all final gates.

## Full product remains incomplete

Fixed happy silent direction solves only view availability for candidate blocking. It does not solve dialogue mouth art, expression, continuous turns, hair/cloth follow, locomotion/contact/handoff or actual video quality. Subsequent work must address these and the full three-input experience, not declare success from two still faces or build output.
