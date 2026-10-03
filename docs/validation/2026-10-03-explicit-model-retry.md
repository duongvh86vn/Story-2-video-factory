# Explicit retry of failed model requests

An actual native steam production stopped at ASSETS_READY after its creative provider failed. Ordinary resume subsequently returned `The persisted provider error cannot be retried`. Preserving a failure budget is necessary, but the product also needs a deliberate recovery action after service availability or configuration has changed.

## Implemented behavior

Studio shows **Retry failed model requests** beside model/provider errors. CLI production commands accept `--retry-model-errors`; the run API accepts optional `retryModelErrors: true`. Normal Create video/resume retains the existing persistent attempt budget.

```powershell
npm.cmd run cli -- resume projects/my-story --retry-model-errors
```

The explicit action starts a new bounded cycle only for a request whose latest journal record is a completed failure. Its first started record contains `retryOf`, referencing that failed call. Both original attempts and new attempts remain in the append-only journal, redacted attempt artifacts and usage/cost totals. The marker is validated when reading the journal; it must reference a prior completed failure of the same request, and its completion must match the started marker.

Only one explicit restart is allowed per request hash in a router/production invocation. Subsequent ordinary resume continues that cycle and keeps its attempt budget. Pending requests cannot be restarted as failures. Successful requests do not receive a failure-reset marker. Global model-call/cost limits, routing, fallback, locked artifacts, storyboard approval, narration cache and final validation gates remain in force. The action neither changes account limits nor automatically loops until a provider responds. Use it after the service is available; it may make new provider calls that count toward configured limits.

This is recovery for analysis/design/review model calls, not a new TTS protocol. TTS uses its existing narration resume/cache rules and blocks final when voice generation fails. Runtime/scene repair and review iteration budgets remain separate; this action does not reset them.

## Validation scope

Build/core and Studio typechecks passed. Runtime tests are delegated to another model and are **NOT RUN** for this change. No live provider call or quota retry was performed by the parent to validate the feature. The original native project, failure journal and failed artwork attempts were preserved.

Independent checks must cover fatal provider failure → ordinary resume blocked → explicit retry → successful result; retryOf integrity and retained costs/counts; another fatal or exhausted cycle; a later ordinary resume not resetting it; multiple calls with identical hash in one invocation; pending/success cases; global call/cost limits; fallback exhaustion; legacy journals and redaction. Verify CLI/API/Studio wiring, strict boolean input, project reservation/busy handling, selected-shot locks and unchanged narration/audio. Use a fake provider for failure transitions and a separate actual configured provider for production recovery; do not call the real service while account limits are still active. Preserve original failed evidence and report source fingerprint, commands, exits and exact scope.

Implementation: `packages/models/{journal,registry}.ts`, orchestrator pipeline options, CLI, server run contract and Studio API/control. This source change does not certify native full-film quality, current animation runtime, migration or the full input matrix.
