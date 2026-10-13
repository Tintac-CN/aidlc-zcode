// AIDLC gate guard (PreToolUse, Edit|Write). Enforces what SKILL.md promises:
//   Rule 1  Construction artifacts (plan.md / units/) require gate1 approved.
//   Rule 2  While tddLock is on, test files are contracts — edits denied until a
//           human-approved override exists (/aidlc:unlock-tests).
//   Rule 3  Writing gates.* = "approved" into state.json requires a prior human
//           approval receipt (GATE-APPROVED <gate>) in decisions.md.
// This is process enforcement, not a security boundary (Bash writes still bypass).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  readStdin, parseInput, projectDir, toolFile,
  findActiveIntent, loadIntent, slugOfPath, isTestFile, emit, deny
} from './lib/state.mjs';

const input = parseInput(readStdin());
const root = projectDir(input);
const fp = String(toolFile(input)).replace(/\\/g, '/');

// Resolve the intent this path belongs to; fall back to the active intent.
const slug = slugOfPath(fp);
const intent = (slug && loadIntent(root, slug)) || findActiveIntent(root);
if (!intent) emit(null);

const s = intent.state || {};
const gates = s.gates || {};

// Rule 1 — no Construction artifacts before Gate#1 approval.
if (/docs\/aidlc\/[^/]+\/(plan\.md|units\/)/.test(fp) && gates.gate1 !== 'approved') {
  deny(`AIDLC 门控：Gate#1 未通过（当前状态 ${gates.gate1 ?? 'pending'}），禁止写 Construction 工件 "${fp}"。请先运行 /aidlc:gate 完成设计门审批。`);
}

// Rule 2 — TDD lock: test files are contracts; human unlock required.
if (s.tddLock && isTestFile(fp) && !s.tddLockOverride) {
  deny(`AIDLC TDD 锁生效（intent ${intent.slug}）：测试是契约，禁止修改 "${fp}"。若契约本身有错，运行 /aidlc:unlock-tests <理由> 经人类批准解锁；不要为了让实现通过而改测试。`);
}

// Rule 3 — gate approval must be recorded by a human before state.json says so.
if (/docs\/aidlc\/[^/]+\/state\.json$/.test(fp)) {
  const ti = input.tool_input || input.toolInput || {};
  const text = String(ti.content ?? ti.new_string ?? ti.newString ?? '');
  const hits = text.match(/"(gate1|gate2)"\s*:\s*"approved"/g) || [];
  for (const hit of hits) {
    const g = hit.match(/gate1|gate2/)[0];
    const decPath = join(dirname(intent.statePath), 'decisions.md');
    let receipt = '';
    try { receipt = existsSync(decPath) ? readFileSync(decPath, 'utf8') : ''; } catch { /* unreadable: treat as absent */ }
    if (!new RegExp(`GATE-APPROVED\\s+${g}\\b`, 'i').test(receipt)) {
      deny(`AIDLC 门控：检测到把 ${g} 置为 approved，但 decisions.md 没有人类审批回执（GATE-APPROVED ${g}）。门控批准必须先经人类审批：运行 /aidlc:gate，把审批结论与反馈逐字写入 decisions.md（末行加 GATE-APPROVED ${g} 日期）之后，再更新 state.json。`);
    }
  }
}

emit(null);
