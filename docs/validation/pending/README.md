# Independent acting draft — NOT RUN

`acting-transport.test.ts.txt` preserves the testing model's original unexecuted draft, authored against d882b54. Its SHA-256 is recorded in the local audit's `draft-preservation.json`; no assertions or embedded shot fixtures were changed during archival. It is excluded from `npm test` while awaiting review.

The draft covers body posture, both hand channels, carry/grip offsets, moving model overlays, ownership/clock rejection, legacy plans and scene security. Its GSAP harness uses fake DOM targets rather than a real SVG browser. Review layout/reachability for left-hand fixtures and the cold-layer visibility expectation: production opacity is 0.62, so visibility cannot be inferred from the draft's >0.9 assertion. Preserve the original and explain any reviewed changes before admitting a runnable test file. Add independent canonical-rig/approval migration coverage for the subsequent source fix, including tampered metadata/files and approved legacy hashes.

These files are a handoff artifact, not evidence that runtime tests or complete films passed. See [TEST-HANDOFF](../../../TEST-HANDOFF.md) and [migration history](../2026-10-03-renderer-language.md).
