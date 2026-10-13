// AIDLC Stop hook: append a turn summary to the active intent's audit log.
// The artifact chain (one artifact, one commit) is the primary audit; this file
// is the turn-level complement.
import { readFileSync } from 'node:fs';
import { appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readStdin, parseInput, projectDir, findActiveIntent } from './lib/state.mjs';

const input = parseInput(readStdin());
const active = findActiveIntent(projectDir(input));
if (!active) process.exit(0);

const text = String(input.responseText || input.responsePreview || input.last_assistant_message || '');
const line = [
  new Date().toISOString(),
  `turn=${input.turnId ?? '-'}`,
  `tools=${input.toolCallCount ?? '?'}`,
  (text || '(no response text)').replace(/\s+/g, ' ').slice(0, 400)
].join(' | ');

try {
  appendFileSync(join(dirname(active.statePath), 'audit.log'), line + '\n');
} catch { /* best-effort audit */ }
process.exit(0);
