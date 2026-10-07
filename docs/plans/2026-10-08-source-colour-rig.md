# Original-RGB candidate rig

Base `fca55fdb57d9aa5d08506156e200c75a905e78db`. Previous goal turn made source/asset progress and published reviewed arm fixes; full goal remains incomplete. User has no image-to-video API. Continue SVG/HTML5/GSAP authoring and the general script/WAV/story product, with Lila/Karo acting within stories.

## Work

- Keep original PNG bytes for RGB, and existing cutout only for matte. Author a versioned SVG matte refinement to reduce paper halos while preserving known face/mouth interiors; inspect actual static figures before connecting it. This is native SVG authoring, not a new AI repaint or a body evaluator run.
- Share the same candidate source-colour definitions between original-colour static masters and head/body layers. Keep native-source coordinates and physical rig metrics distinct from high-resolution matte pixels. No inferred anatomy approval from colour work.
- Add optional explicit profile selection restricted to the source body/actor. Default/legacy and authored quarter-view remain unchanged; unsupported combinations must fail rather than borrow a frontal matte.
- Connect original-colour head/neck/clothes/hand/foot layers and stage both hash-bound RGB and matte resources. Maintain all local SVG references and per-actor namespaces. Original happy stays unwarped; provisional mouth/blink and secondary motion remain unapproved.
- Include new renderer/colour description in body/head cache identity without touching narration. Expose the candidate for Studio body inspection, keeping selection explicit in links/forms; no API/browser runtime called by controller.
- Prepare narrow meaningful delegated tests for selection validation, resources/namespaces/staging/cache and preserved geometry/clocks. Run only build/typecheck/schema export and scoped read-only source review.
- Preserve all production/topic/candidate final gates. Record matte/layer/registration/pose/view/mouth/props/acting/voice and three-input acceptance still missing; update working branch on GitHub after review and source checks.

## Acceptance boundary

Source `31070cc` implements the optional candidate source-colour selection, shared SVG, head/body resources/render/cache and body inspection API. Core/full build/test:typecheck/schema export exit0; scoped read-only review PASS with no actionable findings. Six runtime declarations remain NOT RUN. Original RGB static authoring v3 retains the refined bounded filter plus protected face regions; visible edge fringes remain unaccepted. [Source review and evidence](../topics/reviews/source-colour-rig-review-v1.md), [commands and remaining work](../topics/SOURCE-COLOUR-RIG-HANDOFF.md). This is a completed source checkpoint within the still-incomplete full product, not an episode/rig acceptance.

Static authoring can reveal colour, contours and matte defects. It cannot establish smooth acting, speech synchrony, interaction or episode quality. The user's other model owns runtime tests. This checkpoint must not mark the complete tool usable or DONE from static pictures and source checks.
