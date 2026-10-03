# Restricted CLI failure diagnostics — 2026-10-03

Both native source22 stickman productions ended exit1/ANALYZED after three600s timeouts. Their raw attempt histories remain retained; neither returned an accepted storyboard or final film. The older adapter suppressed process output in its journal and discarded partial capture on timeout, so those histories do not distinguish provider readiness from slow generation.

A bounded independent one-call readiness diagnostic was assigned to the same testing-model handle. It did **not run**: the worker returned a usage-limit error with availability at18:30 Asia/Saigon03/10. No replacement account/model, provider retry or parent runtime probe was used. The six earlier production timeouts are still classified as timeouts, not retrospectively as quota failures.

## Implemented diagnostics

`ProcessTimeoutError` retains partial stdout/stderr only in a non-enumerable process-result property. Its public message remains generic. The Codex adapter converts completed error/failed-turn captures or timeout partial captures into fixed counters and a fixed failure category, then writes `logs/model-cli-diagnostics.jsonl` with timestamp, request hash, model and configured timeout. It does not persist provider message text, reasoning text, response text, prompt, stderr, credentials or thread IDs in this diagnostic journal. Existing separately redacted response/attempt artifacts keep their original contract.

Counters distinguish thread/turn start, completed/failed turn, completed reasoning items, response messages, error events and malformed lines. Known structured error codes or recognized error-message phrases classify usage limit, authentication, context size, model access or connection failure; unmatched messages stay unknown. This classification is a bounded heuristic, not an official exhaustive error-code catalog. Unknown timeout reports observed progress and stays retryable within existing limits. Known account/configuration failures stop automatic retry/fallback, remain in history, and require explicit recovery after the underlying condition is resolved. Network failures remain bounded retries. A diagnostics journal write failure stops with a local-storage error.

The JSONL event families were checked against [official non-interactive CLI documentation](https://learn.chatgpt.com/docs/non-interactive-mode). Reading diagnostics or build/typecheck cannot prove provider availability or complete video quality. No account limits, auth configuration, model defaults, creative schema, narration cache, TTS contract or original project was changed.

## Verification still required

Parent build/core/Studio and whole test typecheck passed; **runtime acceptance is NOT RUN** for this later diagnostics change. Prior92/92/36/36 results cover the earlier retry-boundary repair, not this source. The independent model should run existing Codex/Claude/model/explicit-retry tests and add meaningful fake-executable/error-capture cases:

- Typed timeout with/without capture, malformed trailing JSONL, thread versus turn versus reasoning progress and unknown failure.
- Known quota/auth/context/model-access failures in terminal events and partial timeout capture; no automatic next call or configured fallback, ordinary resume still blocked, explicit recovery retains charged history/budgets.
- Startup diagnostics that accompany a successful turn stay nonfatal; generated agent/reasoning text mentioning an error does not become an error category.
- Secrets/provider prose never appear in the diagnostic JSONL or serialized timeout error; journal-write failure stops safely.
- A persisted `cli_diagnostics` storage failure also blocks ordinary resume and configured fallback. Source now uses the same recovery-required set for the initial failure and later resume; fix storage before an explicit recovery cycle. This follow-up has build/typecheck evidence only, with runtime still NOT RUN.
- Network retry, forbidden tools, truncation, usage retention and scratch-directory cleanup keep their previous assertions.

After actual service availability, run at most one restricted small native readiness call before another large production attempt. Preserve its process handle, real exit, redacted diagnostics and source fingerprint. A small successful call is not full native-film acceptance. If limits/access still reject, stop and retain the failure; do not substitute model/account/auth to bypass it.
