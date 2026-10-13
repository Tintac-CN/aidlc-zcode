// AIDLC PostToolUse guard (Edit|Write): react when a test file is edited while
// the TDD lock is on. Tests are contracts — the right move is to stop and
// report, not to reshape the contract. Warning (additionalContext), not a deny.
// Two distinct messages: a raw lock hit is a violation warning; an override hit
// is a legitimate unlock window — remind to re-lock, don't cry wolf.
import { readStdin, parseInput, projectDir, toolFile, findActiveIntent, isTestFile, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const active = findActiveIntent(projectDir(input));
const fp = String(toolFile(input));

if (active && active.state && active.state.tddLock && isTestFile(fp)) {
  const ov = active.state.tddLockOverride;
  const msg = ov
    ? `AIDLC TDD-lock override 生效中（${ov.at ?? '?'} 人类批准，理由：${String(ov.reason ?? '?').slice(0, 200)}）：测试 "${fp}" 刚被修改。这是解锁窗口内的合规修改；契约修完后请运行 /aidlc:lock-tests 重新上锁（会清除 override）——长期不重锁等于测试契约裸奔。`
    : `AIDLC TDD-lock warning: test file "${fp}" was just edited while tddLock is on for intent "${active.slug}". Tests are contracts: if the contract itself is wrong, stop, report to the human, and record the decision in decisions.md — do not silently reshape tests to match implementation.`;
  emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg
    }
  });
}

emit(null);
