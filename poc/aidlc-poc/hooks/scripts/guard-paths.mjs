// POC hook: PreToolUse guard — capture stdin contract; deny edits to protected paths.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readStdin();
const captureDir = join(tmpdir(), 'aidlc-poc-hooks');
try { mkdirSync(captureDir, { recursive: true }); } catch {}
writeFileSync(join(captureDir, 'PreToolUse.stdin.json'), raw || '(empty)');
try {
  writeFileSync(join(captureDir, 'PreToolUse.env.json'), JSON.stringify({
    AIDLC_GUARD_MODE: process.env.AIDLC_GUARD_MODE ?? null,
    CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT ?? null,
    ZCODE_PLUGIN_ROOT: process.env.ZCODE_PLUGIN_ROOT ?? null,
    CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR ?? null,
    ZCODE_PROJECT_DIR: process.env.ZCODE_PROJECT_DIR ?? null,
    PWD: process.env.PWD ?? null
  }, null, 2));
} catch {}

let input = {};
try { input = JSON.parse(raw); } catch {}

// Input contract observed in ZCode bundle: tool_name / tool_input / hook_event_name / ...
const toolName = input.tool_name || input.toolName || '';
const filePath =
  (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) ||
  (input.toolInput && (input.toolInput.file_path || input.toolInput.path)) || '';

const PROTECTED = /poc-protected|\.env(\.|$)|secrets\//i;
const MODE = process.env.AIDLC_GUARD_MODE || 'deny'; // deny | ask | exit2 | allow

if (PROTECTED.test(filePath)) {
  const reason = `AIDLC-POC guard: "${filePath}" is a protected path (${toolName}).`;
  if (MODE === 'exit2') {
    process.stderr.write(reason);
    process.exit(2); // hard block
  }
  if (MODE === 'ask') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason
      }
    }));
    process.exit(0);
  }
  // default: deny
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
}

// Not protected: allow (empty output = no opinion).
process.exit(0);
