// AIDLC SessionStart hook: inject the active intent's status summary (resume warm-up),
// plus the tail of decisions.md so prior human feedback is actually seen, not just referenced.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readStdin, parseInput, projectDir, findActiveIntent, readAutoConfig, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const root = projectDir(input);
const cfg = readAutoConfig(root);
const active = findActiveIntent(root);

if (!active) {
  // No intent: historically fully silent. With auto-route ON, one line keeps
  // new sessions aware the feature exists before the first intent is created.
  if (cfg.on) {
    emit({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: 'AIDLC auto-route: ON，当前无活跃 intent。用户用自然语言提开发需求时，先按 aidlc skill §3.0-A1 展示意图与拆分预览并确认，再建 intent；关闭用 /aidlc:off。'
      }
    });
  }
  emit(null);
}

const s = active.state || {};
const gates = s.gates || {};
const lines = [
  `AIDLC active intent: ${active.slug} (phase: ${s.phase ?? 'unknown'})`,
  `Gates: gate1=${gates.gate1 ?? 'pending'}, gate2=${gates.gate2 ?? 'pending'}${s.tddLock ? ', TDD-LOCK=on' : ''}${s.tddLockOverride ? ', TDD-OVERRIDE=on' : ''}`
];

// Auto-route mode line: only when the project has ever toggled it (no config
// file = feature never touched = zero extra noise, same as v1.0). The switch
// only controls routing injection, never the guards.
if (cfg.exists) {
  lines.push(cfg.on
    ? 'Auto-route: ON（自然语言可自动进流程；显式 /aidlc: 命令优先；安全守卫不受开关影响）'
    : 'Auto-route: OFF（/aidlc:on 可开启自然语言自动路由；安全守卫不受开关影响）');
}

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

