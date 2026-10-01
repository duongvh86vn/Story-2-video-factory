These JSON Schema files are generated from the shared Zod contracts in `packages/core/schemas.ts` and the semantic planning contracts in `packages/story/schemas.ts`.

Regenerate with `node --import tsx library/schemas/export.ts` after a contract changes. This command writes schema artifacts; it does not run tests or model calls.

JSON Schema describes field shape. Runtime Zod parsing and the planning/storyboard validators also enforce timing, narration membership, full interval coverage, references, and locks. Chapter/beat planning schemas intentionally omit timestamps: code derives canonical timing from referenced narration segments.

V2.1 also exports config, script, host-profile/rig/timeline, explanation-plan, voice-report and speech-activity schemas from their shared packages. Narration mode=script has measured audio timing; untimed input and script documents remain distinct. Source-reference/target/contact/identity checks are runtime validators, not merely JSON Schema shape constraints.
