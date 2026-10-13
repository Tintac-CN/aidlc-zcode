// AIDLC PostToolUse guard (Edit|Write): warn when a test file is edited while the
// TDD lock is on. Tests are contracts — the right move is to stop and report, not
// to reshape the contract. Warning (additionalContext), not a deny.
import { readStdin, parseInput, projectDir, toolFile, findActiveIntent, isTestFile, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const active = findActiveIntent(projectDir(input));
const fp = String(toolFile(input));

if (active && active.state && active.state.tddLock && isTestFile(fp)) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `AIDLC TDD-lock warning: test file "${fp}" was just edited while tddLock is on for intent "${active.slug}". Tests are contracts: if the contract itself is wrong, stop, report to the human, and record the decision in decisions.md — do not silently reshape tests to match implementation.`
    }
  });
}

emit(null);
