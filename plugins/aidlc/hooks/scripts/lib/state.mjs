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

// Active intent = newest docs/aidlc/*/state.json under the project root.
export function findActiveIntent(root) {
  const base = join(root, 'docs', 'aidlc');
  if (!existsSync(base)) return null;
  let best = null;
  try {
    for (const name of readdirSync(base)) {
      const statePath = join(base, name, 'state.json');
      if (!existsSync(statePath)) continue;
      const mtimeMs = statSync(statePath).mtimeMs;
      if (!best || mtimeMs > best.mtimeMs) {
        try {
          best = { slug: name, statePath, mtimeMs, state: JSON.parse(readFileSync(statePath, 'utf8')) };
        } catch { /* corrupt state.json: skip */ }
      }
    }
  } catch { /* unreadable dir: no-op */ }
  return best;
}

export function isTestFile(fp) {
  return /(^|[\\/])(tests?|__tests__)([\\/]|$)/i.test(fp) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(fp);
}

// Emit strict JSON and exit 0. Extra keys fail validation — never add any.
export function emit(obj) {
  if (obj) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}
