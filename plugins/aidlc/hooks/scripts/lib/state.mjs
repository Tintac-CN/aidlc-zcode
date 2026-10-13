// Shared helpers for AIDLC hook scripts. Contract verified by POC (2026-10-13):
// - stdin JSON carries both camelCase and snake_case keys
// - stdout must be strict-schema JSON or empty; exit 0 pass / 2 block
// - hook process env has CLAUDE_PROJECT_DIR / ZCODE_PLUGIN_ROOT
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

export function parseInput(raw) {
  try { return JSON.parse(raw); } catch { return {}; }
}

export function projectDir(input) {
  return input.cwd
    || process.env.CLAUDE_PROJECT_DIR
    || process.env.ZCODE_PROJECT_DIR
    || process.cwd();
}

export function toolFile(input) {
  const ti = input.tool_input || input.toolInput || {};
  return ti.file_path || ti.path || ti.filePath || '';
}

// Active intent: parse every docs/aidlc/*/state.json and rank by the state's own
// updatedAt (audit fix P0-2: file mtime diverges from the declared semantics).
// Intents with phase "done" are never active. mtime is only a fallback when
// updatedAt is missing/unparseable. Per-intent failures are skipped, not fatal.
export function findActiveIntent(root) {
  const base = join(root, 'docs', 'aidlc');
  if (!existsSync(base)) return null;
  let names = [];
  try { names = readdirSync(base); } catch { return null; }
  let best = null;
  for (const name of names) {
    const statePath = join(base, name, 'state.json');
    try {
      if (!existsSync(statePath)) continue;
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      if (state && state.phase === 'done') continue;
      const ts = Date.parse(String(state?.updatedAt || ''));
      const key = Number.isFinite(ts) ? ts : statSync(statePath).mtimeMs;
      if (!best || key > best.key) best = { slug: name, statePath, key, state };
    } catch { /* unreadable/corrupt intent: skip */ }
  }
  return best;
}

// Load a specific intent's state by slug (null when absent/corrupt).
export function loadIntent(root, slug) {
  if (!slug || /[\\/]/.test(slug)) return null;
  const statePath = join(root, 'docs', 'aidlc', slug, 'state.json');
  try {
    if (!existsSync(statePath)) return null;
    return { slug, statePath, state: JSON.parse(readFileSync(statePath, 'utf8')) };
  } catch { return null; }
}

// Which intent does a docs/aidlc/<slug>/... path belong to?
export function slugOfPath(fp) {
  const m = String(fp).replace(/\\/g, '/').match(/docs\/aidlc\/([^/]+)(?:\/|$)/);
  return m ? m[1] : null;
}

export function isTestFile(fp) {
  const p = String(fp).replace(/\\/g, '/');
  return /(^|\/)(tests?|__tests__|spec)(\/|$)/i.test(p)
    || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(p)
    || /(^|\/)test_[^/]*\.py$/i.test(p)
    || /_test\.py$/i.test(p)
    || /_test\.go$/i.test(p)
    || /tests?\.(java|kt|cs)$/i.test(p);
}

// Emit strict JSON and exit 0. Extra keys fail validation — never add any.
export function emit(obj) {
  if (obj) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

export function deny(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: String(reason).replace(/[\x00-\x1f]/g, ' ')
    }
  });
}
