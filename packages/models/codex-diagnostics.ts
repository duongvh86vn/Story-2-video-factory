import { object } from './adapter.js';
import type { ProcessResult } from '../render/process.js';

export type CodexFailureCategory = 'usage-limit' | 'authentication' | 'context-limit' | 'model-access' | 'network' | 'unknown';
/** Persist only counters and a fixed category; provider messages and generated text stay private. */
export interface CodexDiagnostics {
  version: 1; exitCode: number; timedOut: boolean; truncated: boolean;
  threadStarted: boolean; turnStarted: boolean; turnCompleted: boolean; turnFailed: boolean;
  reasoningItems: number; agentMessages: number; errorEvents: number; malformedLines: number;
  category: CodexFailureCategory;
}
function category(value: string): CodexFailureCategory {
  if (/\b(?:usage_limit_reached|insufficient_quota|quota_exceeded|credit_balance_exhausted)\b|you(?:'|’)?ve hit your usage limit|usage limit reached|usage limit exceeded|usage limit has been reached|exhausted (?:your )?credits/i.test(value)) return 'usage-limit';
  if (/\b(?:invalid_api_key|authentication_error|token_expired|unauthorized)\b|not (?:signed|logged) in|authentication (?:failed|expired)|please (?:sign|log) in/i.test(value)) return 'authentication';
  if (/\b(?:context_length_exceeded|context_window_exceeded)\b|context (?:window|length).*(?:exceeded|too (?:long|large))/i.test(value)) return 'context-limit';
  if (/\b(?:model_not_found|model_not_available|model_access_denied)\b|model.*(?:not available|not supported|does not exist|do not have access)/i.test(value)) return 'model-access';
  if (/\b(?:network_error|connection_refused|connection_reset|dns_error)\b|connection (?:refused|reset)|error sending request|failed to connect|stream disconnected before completion/i.test(value)) return 'network';
  return 'unknown';
}
export function codexDiagnostics(result: ProcessResult): CodexDiagnostics {
  const summary: CodexDiagnostics = { version: 1, exitCode: result.code, timedOut: result.timedOut,
    truncated: !!result.truncated, threadStarted: false, turnStarted: false, turnCompleted: false, turnFailed: false,
    reasoningItems: 0, agentMessages: 0, errorEvents: 0, malformedLines: 0, category: 'unknown' };
  const categories = new Set<CodexFailureCategory>();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event: Record<string, unknown>;
    try { event = object(JSON.parse(line)); } catch { summary.malformedLines++; continue; }
    if (event.type === 'thread.started') summary.threadStarted = true;
    if (event.type === 'turn.started') summary.turnStarted = true;
    if (event.type === 'turn.completed') summary.turnCompleted = true;
    if (event.type === 'turn.failed') summary.turnFailed = true;
    const item = object(event.item);
    if (event.type === 'item.completed' && item.type === 'reasoning') summary.reasoningItems++;
    if (event.type === 'item.completed' && item.type === 'agent_message') summary.agentMessages++;
    if (event.type === 'error' || event.type === 'turn.failed'
      || (event.type === 'item.completed' && item.type === 'error')) {
      summary.errorEvents++;
      const error = object(event.error), itemError = object(item.error);
      const diagnostic = [event.code, event.message, error.code, error.message, item.code, item.message, itemError.code, itemError.message]
        .filter((value): value is string => typeof value === 'string').map(value => value.slice(0, 4096)).join('\n');
      categories.add(category(diagnostic));
    }
  }
  // stderr is used for classification only. It is never copied into this summary.
  if (result.code !== 0 || result.timedOut) categories.add(category(result.stderr));
  summary.category = (['usage-limit', 'authentication', 'context-limit', 'model-access', 'network'] as const)
    .find(value => categories.has(value)) ?? 'unknown';
  return summary;
}
export function codexFailureMessage(summary: CodexDiagnostics): string {
  const messages: Record<CodexFailureCategory, string> = {
    'usage-limit': 'Codex CLI reported an account usage limit. Wait for availability before explicitly retrying.',
    authentication: 'Codex CLI reported an authentication failure. Restore CLI sign-in before explicitly retrying.',
    'context-limit': 'Codex CLI reported a context limit. Reduce the design request before retrying.',
    'model-access': 'Codex CLI reported unavailable model access. Check the configured model before retrying.',
    network: 'Codex CLI reported a connection failure. Check connectivity before retrying.',
    unknown: summary.timedOut ? `Codex CLI exceeded the configured timeout (${summary.turnStarted ? 'turn started' : summary.threadStarted ? 'thread started, turn not confirmed' : 'no thread start confirmed'}; ${summary.reasoningItems} reasoning items; ${summary.agentMessages} response messages).`
      : 'Codex CLI did not complete generation. Check sign-in, model access, account limits and the local diagnostics journal.',
  };
  return messages[summary.category];
}
