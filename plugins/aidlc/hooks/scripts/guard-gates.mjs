// AIDLC gate guard (PreToolUse, Edit|Write). Enforces what SKILL.md promises:
//   Rule 1  Construction artifacts (plan.md / units/) require gate1 approved.
//   Rule 2  While tddLock is on, test files are contracts — edits denied until a
//           human-approved override exists (/aidlc:unlock-tests).
//   Rule 3  Writing gates.* = "approved" into state.json requires a prior human
//           approval receipt (GATE-APPROVED <gate>) in decisions.md.
//   Rule 4  state.json full overwrites must preserve every existing history entry
//           (append-only history = optimistic lock against concurrent writers).
//   Rule 5  decisions.md is append-only: full overwrite allowed only on creation
//           or as a pure append (existing content preserved verbatim as prefix).
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
const ti = input.tool_input || input.toolInput || {};
const isEdit = /edit/i.test(String(input.tool_name || input.toolName || ''));

// Resolve the intent this path belongs to; fall back to the active intent.
const slug = slugOfPath(fp);
const intent = (slug && loadIntent(root, slug)) || findActiveIntent(root);
if (!intent) emit(null);

const s = intent.state || {};
const gates = s.gates || {};
const dir = dirname(intent.statePath);

// Rule 1 — no Construction artifacts before Gate#1 approval.
if (/docs\/aidlc\/[^/]+\/(plan\.md|units\/)/.test(fp) && gates.gate1 !== 'approved') {
  deny(`AIDLC 门控：Gate#1 未通过（当前状态 ${gates.gate1 ?? 'pending'}），禁止写 Construction 工件 "${fp}"。请先运行 /aidlc:gate 完成设计门审批。`);
}

// Rule 2 — TDD lock: test files are contracts; human unlock required.
if (s.tddLock && isTestFile(fp) && !s.tddLockOverride) {
  deny(`AIDLC TDD 锁生效（intent ${intent.slug}）：测试是契约，禁止修改 "${fp}"。若契约本身有错，运行 /aidlc:unlock-tests <理由> 经人类批准解锁；不要为了让实现通过而改测试。`);
}

if (/docs\/aidlc\/[^/]+\/state\.json$/.test(fp)) {
  const text = String(ti.content ?? ti.new_string ?? ti.newString ?? '');

  // Rule 3 — gate approval must be recorded by a human before state.json says so.
  // Receipt is strict: a line that is exactly "GATE-APPROVED <gate> <real date>".
  // Protocol prose that merely mentions the receipt (e.g. scaffold help text) must
  // never satisfy this — hence ^…$ anchors and a concrete date.
  const hits = text.match(/"(gate1|gate2)"\s*:\s*"approved"/g) || [];
  for (const hit of hits) {
    const g = hit.match(/gate1|gate2/)[0];
    const decPath = join(dir, 'decisions.md');
    let receipt = '';
    try { receipt = existsSync(decPath) ? readFileSync(decPath, 'utf8') : ''; } catch { /* treat as absent */ }
    const receiptRe = new RegExp(`^GATE-APPROVED\\s+${g}\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`, 'mi');
    if (!receiptRe.test(receipt)) {
      deny(`AIDLC 门控：检测到把 ${g} 置为 approved，但 decisions.md 没有人类审批回执（需要独立一行、格式严格为 "GATE-APPROVED ${g} YYYY-MM-DD"）。门控批准必须先经人类审批：运行 /aidlc:gate，把审批结论与反馈逐字写入 decisions.md 之后，再更新 state.json。`);
    }
  }

  // Rule 4 — optimistic lock: a full overwrite (Write) of state.json must carry
  // forward every history entry already on disk. Edits are inherently safe
  // (old_string must match current content).
  if (!isEdit && existsSync(intent.statePath)) {
    let cur = null;
    try { cur = JSON.parse(readFileSync(intent.statePath, 'utf8')); } catch { cur = null; }
    const curAts = Array.isArray(cur?.history) ? cur.history.map(h => String(h?.at ?? '')) : [];
    if (curAts.length) {
      let next = [];
      try { next = JSON.parse(text).history ?? []; } catch { next = null; }
      const nextAts = Array.isArray(next) ? new Set(next.map(h => String(h?.at ?? ''))) : new Set();
      const lost = curAts.filter(a => a && !nextAts.has(a));
      if (lost.length) {
        deny(`AIDLC 乐观锁：这次对 state.json 的整体覆写丢失了 ${lost.length} 条已有 history 记录（并发修改或基于过期状态）。请重新读取磁盘上的 state.json，把 history 完整保留后再写。`);
      }
    }
  }
}

// Rule 5 — decisions.md is append-only. Edits are safe (old_string match);
// a Write overwrite must be a creation or a pure append.
if (/docs\/aidlc\/[^/]+\/decisions\.md$/.test(fp) && !isEdit && existsSync(fp)) {
  const oldText = readFileSync(fp, 'utf8');
  const newText = String(ti.content ?? '');
  if (!newText.startsWith(oldText)) {
    deny('AIDLC 审计保护：decisions.md 是只追加的人类决策记录，禁止整体覆写或删改既有内容。请用 Edit 在文件末尾追加（old_string 匹配文件当前结尾）。');
  }
}

emit(null);
