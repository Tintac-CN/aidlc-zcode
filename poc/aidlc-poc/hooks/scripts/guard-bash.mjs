// POC hook: PreToolUse guard for Bash — closes the shell-redirect bypass.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function readStdin() { try { return readFileSync(0, 'utf8'); } catch { return ''; } }

const raw = readStdin();
const captureDir = join(tmpdir(), 'aidlc-poc-hooks');
try { mkdirSync(captureDir, { recursive: true }); } catch {}
writeFileSync(join(captureDir, 'PreToolUseBash.stdin.json'), raw || '(empty)');

let input = {};
try { input = JSON.parse(raw); } catch {}

const toolName = input.tool_name || input.toolName || '';
const cmd = (input.tool_input && input.tool_input.command) || (input.toolInput && input.toolInput.command) || '';
const PROTECTED = /poc-protected|\.env(\.|$)|secrets\//i;

if (toolName === 'Bash' && PROTECTED.test(cmd)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `AIDLC-POC guard: shell command touches a protected path: ${cmd.slice(0, 120)}`
    }
  }));
  process.exit(0);
}
process.exit(0);
