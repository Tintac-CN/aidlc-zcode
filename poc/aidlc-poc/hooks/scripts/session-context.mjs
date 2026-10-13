// POC hook: SessionStart — capture stdin contract and inject context.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readStdin();
const captureDir = join(tmpdir(), 'aidlc-poc-hooks');
try { mkdirSync(captureDir, { recursive: true }); } catch {}
writeFileSync(join(captureDir, 'SessionStart.stdin.json'), raw || '(empty)');

// Strict schema: only recognized keys, correct hookEventName.
const out = {
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: 'AIDLC-POC: session context injected via SessionStart hook.'
  }
};
process.stdout.write(JSON.stringify(out));
process.exit(0);
