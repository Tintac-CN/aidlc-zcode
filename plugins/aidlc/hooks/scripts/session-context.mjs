// AIDLC SessionStart hook: inject the active intent's status summary (resume warm-up),
// plus the tail of decisions.md so prior human feedback is actually seen, not just referenced.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readStdin, parseInput, projectDir, findActiveIntent, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const active = findActiveIntent(projectDir(input));

if (!active) emit(null); // no AIDLC intent in this project: silent pass

const s = active.state || {};
const gates = s.gates || {};
const lines = [
  `AIDLC active intent: ${active.slug} (phase: ${s.phase ?? 'unknown'})`,
  `Gates: gate1=${gates.gate1 ?? 'pending'}, gate2=${gates.gate2 ?? 'pending'}${s.tddLock ? ', TDD-LOCK=on' : ''}${s.tddLockOverride ? ', TDD-OVERRIDE=on' : ''}`
];

// Construction progress: unitStatus is the per-unit checkpoint map.
const us = s.unitStatus;
if (us && typeof us === 'object' && Object.keys(us).length) {
  const ids = Object.keys(us);
  const done = ids.filter(k => us[k] === 'done');
  const pending = ids.filter(k => us[k] !== 'done');
  lines.push(`Units: ${done.length}/${ids.length} done${pending.length ? `；pending: ${pending.join(', ')}` : ''}`);
}

// Inject the last chunk of decisions.md — prior human verdicts must be seen before acting.
const decPath = join(dirname(active.statePath), 'decisions.md');
if (existsSync(decPath)) {
  try {
    const tail = readFileSync(decPath, 'utf8').split('\n').slice(-15).join('\n').trim();
    if (tail) lines.push(`decisions.md 最近内容（人类裁决，必须遵守）：\n${tail}`);
  } catch { /* unreadable: skip injection */ }
} else {
  lines.push('Continue with /aidlc:resume or inspect with /aidlc:status.');
}

emit({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: lines.join('\n')
  }
});

