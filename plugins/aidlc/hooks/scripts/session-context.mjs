// AIDLC SessionStart hook: inject the active intent's status summary (resume warm-up).
import { readStdin, parseInput, projectDir, findActiveIntent, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const active = findActiveIntent(projectDir(input));

if (!active) emit(null); // no AIDLC intent in this project: silent pass

const s = active.state || {};
const gates = s.gates || {};
const lines = [
  `AIDLC active intent: ${active.slug} (phase: ${s.phase ?? 'unknown'})`,
  `Gates: gate1=${gates.gate1 ?? 'pending'}, gate2=${gates.gate2 ?? 'pending'}${s.tddLock ? ', TDD-LOCK=on' : ''}`,
  `Continue with /aidlc:resume or inspect with /aidlc:status. Read docs/aidlc/${active.slug}/decisions.md before acting on prior feedback.`
];

emit({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: lines.join('\n')
  }
});
