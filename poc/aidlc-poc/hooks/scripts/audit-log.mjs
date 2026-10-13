// POC hook: Stop — capture stdin contract; append an audit line.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readStdin();
const captureDir = join(tmpdir(), 'aidlc-poc-hooks');
try { mkdirSync(captureDir, { recursive: true }); } catch {}
writeFileSync(join(captureDir, 'Stop.stdin.json'), raw || '(empty)');

try {
  appendFileSync(join(captureDir, 'audit.log'),
    new Date().toISOString() + ' stop hook fired; stdinBytes=' + raw.length + '\n');
} catch {}

process.exit(0);
